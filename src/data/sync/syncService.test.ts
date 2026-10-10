import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createDB, type FieldShoreDB } from '../store/db';
import { createInventoryStore, type InventoryStoreApi } from '../store/inventoryStore';
import { createOperationStore, type OperationStoreApi } from '../store/operationStore';
import { createSyncService, SERVER_TIMESTAMP, type ReconcileOptions, type SyncServiceApi } from './syncService';
import { createEventListenerSync } from './eventListener';
import { createCloudIndex, type CloudIndex, type CloudIndexEntry } from './cloudIndex';
import { newId } from '@core/id';
import { currentIC } from '@core/org';
import {
  NO_DEDUCTIONS,
  type FieldShoreEvent,
  type InventoryItem,
  type OrgResourceRef,
  type ShorePoint,
  type ShorePointStatus,
} from '@core/schema';

// The event sync seam (ADR-041, #499) over an in-memory fake RTDB. The fake reproduces the
// SDK facts the service depends on: a write's `receivedAt: {'.sv':'timestamp'}` sentinel is
// resolved by the "server" clock (`serverNow`), and the cloud snapshot index is refreshed
// (the listener's job) BEFORE the write promise resolves. Peer events "land" in the fake
// cloud with their own server stamp and reach the device through `deliver()` — a full
// department snapshot, exactly what the listener hands to reconcile.

const OP = 'op-1';
const ME = 'device-me';
const PEER = 'device-peer';
const base = (by = ME) => ({ id: newId(), opId: OP, at: 1, by });

const opCreated = (): FieldShoreEvent => ({ type: 'OperationCreated', ...base(), name: 'Test Op', multiBuilding: false });
const spAdded = (sp: ShorePoint, by = ME): FieldShoreEvent => ({ type: 'ShorePointAdded', ...base(by), shorePoint: sp });
const statusChanged = (spId: string, from: ShorePointStatus, to: ShorePointStatus, by = ME): FieldShoreEvent => ({
  type: 'ShorePointStatusChanged', ...base(by), spId, from, to,
});
const deploy = (spId: string, inventoryId: string): FieldShoreEvent => ({
  type: 'EquipmentDeployed', ...base(), spId, deployedBom: [{ role: 'strut', model: 'LS 203', source: 'Rescue 2', inventoryId }],
});
const rescue2: OrgResourceRef = { ref: 'apparatus', value: 'app-r2', label: 'Rescue 2' };
const resourceAssigned = (positionId: string, resource: OrgResourceRef = rescue2): FieldShoreEvent => ({
  type: 'ResourceAssigned', ...base(), positionId, resource,
});
const resourceCleared = (positionId: string, resource?: OrgResourceRef): FieldShoreEvent => ({
  type: 'ResourceCleared', ...base(), positionId, resource,
});

const makeSp = (id: string): ShorePoint => ({
  id, opId: OP, division: '1', shoreType: 't-shore',
  measurementEighths: 240, deductions: NO_DEDUCTIONS, status: 'pending',
});

const invItem: InventoryItem = {
  id: 'inv-1', type: 'strut', model: 'LS 203', system: 'LongShore',
  apparatus: 'Rescue 2', apparatusId: 'app-r2', quantity: 9,
};

type Write = { kind: 'set' | 'update'; path: string; value: unknown };
const lastSeg = (path: string) => path.split('/').pop()!;
const isSentinel = (v: unknown) => !!v && typeof v === 'object' && '.sv' in (v as object);

describe('syncService — ordered upload, receipt stamping, unconditional merge (ADR-041)', () => {
  let db: FieldShoreDB;
  let inventory: InventoryStoreApi;
  let ops: OperationStoreApi;
  let sync: SyncServiceApi;

  // ── the fake cloud ──────────────────────────────────────────────────────────────────
  let serverNow: number; //                          the server clock (next stamp)
  let server: Map<string, Record<string, unknown>>; // event id → stored cloud record
  let cloud: CloudIndex;
  let writes: Write[];
  let failId: string | null; //    this id's write is rejected and never lands
  let lostAckId: string | null; // this id's write LANDS, then the promise rejects
  let publishOnWrite: boolean; //  false = the listener is not attached (index stays stale)
  let beforeLand: ((id: string, value: Record<string, unknown>) => Promise<void>) | null;
  let getSpy: ReturnType<typeof vi.fn>;
  let logSpy: ReturnType<typeof vi.fn>;
  let errors: boolean[];
  let cuts: number[];
  // Injected timer seam for the backoff retry: scheduled callbacks are recorded, never run
  // unless a test fires them (fake-indexeddb needs the real timers, so no vi.useFakeTimers).
  let scheduled: { fn: () => void; ms: number; handle: number }[];
  let cleared: unknown[];
  const fakeTimers = {
    setTimeout: (fn: () => void, ms: number) => {
      const handle = scheduled.length + cleared.length + 1;
      scheduled.push({ fn, ms, handle });
      return handle;
    },
    clearTimeout: (h: unknown) => {
      cleared.push(h);
      scheduled = scheduled.filter((t) => t.handle !== h);
    },
  };
  /** Run the pending retry timer (as the clock would) and let its flush settle. */
  const fireRetry = async () => {
    const t = scheduled.shift()!;
    t.fn();
    for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
  };

  const publish = () => cloud.replace([...server.values()] as unknown as CloudIndexEntry[]);
  const resolveSv = (v: Record<string, unknown>, t: number) => (isSentinel(v.receivedAt) ? { ...v, receivedAt: t } : v);
  const landWrite = (id: string, value: Record<string, unknown>, t: number) => {
    server.set(id, resolveSv(value, t));
    if (publishOnWrite) publish();
  };

  const fakeSet = async (path: string, value: unknown) => {
    const id = lastSeg(path);
    if (!path.includes('/events/')) {
      writes.push({ kind: 'set', path, value }); // a state record (setState)
      return;
    }
    if (failId === id) throw new Error('upload boom');
    writes.push({ kind: 'set', path, value });
    if (beforeLand) await beforeLand(id, value as Record<string, unknown>);
    landWrite(id, value as Record<string, unknown>, serverNow++);
    if (lostAckId === id) throw new Error('ack lost');
  };
  // A multi-path update: keys are `${id}` (rooted at an op) or `${opId}/${id}` (a chunk
  // rooted at /events). Atomic: one rejected member rejects the whole write.
  let failUpdates = false; // reject every multi-path write (forces the head-group fallback)
  const fakeUpdate = async (path: string, values: Record<string, unknown>) => {
    const ids = Object.keys(values).map(lastSeg);
    if (failUpdates || (failId && ids.includes(failId))) throw new Error('upload boom');
    writes.push({ kind: 'update', path, value: values });
    const t = serverNow++; // one atomic write → one server stamp
    for (const [k, v] of Object.entries(values)) landWrite(lastSeg(k), v as Record<string, unknown>, t);
    if (lostAckId && ids.includes(lostAckId)) throw new Error('ack lost');
  };

  /** A peer event already stamped by the server (default: the next server tick). */
  const peer = (e: FieldShoreEvent, receivedAt = serverNow++): FieldShoreEvent => ({ ...e, by: e.by === ME ? PEER : e.by, receivedAt });
  /** Put events into the fake cloud (as the server would hold them). */
  const land = (...events: FieldShoreEvent[]) => {
    for (const e of events) server.set(e.id, { ...e });
  };
  /** The listener: refresh the index, hand reconcile the whole department snapshot. */
  const deliver = (opts?: ReconcileOptions) => {
    publish();
    return sync.reconcile([...server.values()], opts);
  };

  const status = (spId = 'sp-1') => ops.store.getState().shorePoints.find((s) => s.id === spId)!.status;
  const dexieRow = (id: string) => db.events.where('id').equals(id).first();
  const writtenIds = () =>
    writes
      .filter((w) => w.path.includes('/events'))
      .map((w) => (w.kind === 'set' ? lastSeg(w.path) : Object.keys(w.value as object).map(lastSeg).join('+')));

  const mk = (over: Partial<Parameters<typeof createSyncService>[0]> = {}) =>
    createSyncService({
      ops: () => ops,
      deptId: () => 'dept-1',
      deviceUid: () => ME,
      set: fakeSet,
      update: fakeUpdate,
      get: getSpy,
      cloud,
      log: logSpy,
      notifyError: (e) => errors.push(e),
      notifyRemoteCuts: (n) => cuts.push(n),
      timers: fakeTimers,
      ...over,
    });

  let dept: string | null;

  beforeEach(async () => {
    db = createDB(`test-sync-${newId()}`);
    inventory = createInventoryStore(db);
    serverNow = 1000;
    server = new Map();
    cloud = createCloudIndex();
    writes = [];
    failId = null;
    lostAckId = null;
    failUpdates = false;
    publishOnWrite = true;
    beforeLand = null;
    getSpy = vi.fn(async (path: string) => server.get(lastSeg(path)) ?? null);
    logSpy = vi.fn();
    errors = [];
    cuts = [];
    scheduled = [];
    cleared = [];
    dept = 'dept-1';
    // Two-step wiring mirrors the singletons' lazy cycle: sync sees ops through an
    // accessor; ops enqueues into sync. The test's enqueue does NOT auto-flush (the
    // registry does that in prod); flush() is driven explicitly here.
    sync = mk({ deptId: () => dept });
    ops = createOperationStore({ db, inventory, enqueue: (e) => sync.enqueue(e), deviceUid: () => ME });

    await db.inventory.add(invItem);
    await inventory.boot();
    await ops.commit(opCreated());
    await ops.commit(spAdded(makeSp('sp-1')));
    await ops.commit(deploy('sp-1', 'inv-1')); // pending → process
    await ops.commit(statusChanged('sp-1', 'process', 'strutset'));
    await ops.commit(statusChanged('sp-1', 'strutset', 'cutting'));
    await sync.flush(); // the setup reaches the cloud as ONE chunk: all received at 1000
    expect(sync.pendingCount()).toBe(0);
    serverNow = 1005; // the server clock moves on; later uploads are stamped from 1005
  });

  afterEach(async () => {
    await db.delete();
  });

  // ── upload ──────────────────────────────────────────────────────────────────────────

  it('flush uploads the queue as ONE multi-path chunk at /orgs/{dept}/events, keys in commit order, each with a server-stamp request', async () => {
    const rows = await db.events.toArray();
    expect(rows).toHaveLength(5);
    expect(writes).toHaveLength(1);
    const [w] = writes;
    expect(w!.kind).toBe('update');
    expect(w!.path).toBe('orgs/dept-1/events');
    const committed = ops.sortedEvents().map((e) => e.id);
    expect(Object.keys(w!.value as object)).toEqual(committed.map((id) => `op-1/${id}`)); // commit order
    for (const v of Object.values(w!.value as Record<string, { receivedAt: unknown }>)) {
      expect(v.receivedAt).toEqual({ '.sv': 'timestamp' });
    }
    expect(SERVER_TIMESTAMP).toEqual({ '.sv': 'timestamp' });
    // one atomic write → one server stamp; `(at, id)` keeps commit order inside it
    expect(ops.sortedEvents().map((e) => e.receivedAt)).toEqual([1000, 1000, 1000, 1000, 1000]);
    expect(ops.sortedEvents().map((e) => e.id)).toEqual(committed);
    for (const row of rows) {
      expect(row.receivedAt).toBe(server.get(row.id)!.receivedAt); // durable stamp = the server's
      expect(sync.getRowSyncState(row.id)).toBe('synced');
    }
    expect(getSpy).not.toHaveBeenCalled(); // the index answered every ack
    expect(errors.at(-1)).toBe(false);
  });

  it('a lone queued event goes up as a create-only set at /events/{opId}/{id}', async () => {
    const a = statusChanged('sp-1', 'cutting', 'runner');
    await ops.commit(a);
    writes = [];
    await sync.flush();
    expect(writes).toEqual([{ kind: 'set', path: `orgs/dept-1/events/op-1/${a.id}`, value: expect.objectContaining({ id: a.id, receivedAt: { '.sv': 'timestamp' } }) }]);
    expect(ops.get(a.id)!.receivedAt).toBe(1005);
  });

  it('a failure stops the pass: nothing uploads ahead of an earlier commit; the retry resumes from the head', async () => {
    const a = statusChanged('sp-1', 'cutting', 'runner');
    const b = statusChanged('sp-1', 'runner', 'secured');
    const c = resourceAssigned('pos-rescue');
    await ops.commit(a);
    await ops.commit(b);
    await ops.commit(c);
    writes = [];
    failId = b.id;

    await sync.flush();
    expect(writtenIds()).toEqual([a.id]); // c was NOT uploaded past the failed b
    expect(sync.pendingCount()).toBe(2);
    expect(sync.isPending(b.id)).toBe(true);
    expect(sync.isPending(c.id)).toBe(true);
    expect(sync.isPending(a.id)).toBe(false);
    expect(logSpy).toHaveBeenCalledWith('flush-failed', expect.objectContaining({ id: b.id }));
    expect(errors.at(-1)).toBe(true);

    failId = null;
    await sync.flush();
    expect(writtenIds()).toEqual([a.id, `${b.id}+${c.id}`]); // resumes at b; b and c as one chunk
    expect(ops.get(b.id)!.receivedAt).toBe(ops.get(c.id)!.receivedAt);
    const order = ops.sortedEvents().map((e) => e.id);
    expect(order.indexOf(a.id)).toBeLessThan(order.indexOf(b.id));
    expect(order.indexOf(b.id)).toBeLessThan(order.indexOf(c.id)); // commit order kept
    const chunk = writes.at(-1)!.value as Record<string, { receivedAt: unknown }>;
    for (const v of Object.values(chunk)) expect(v.receivedAt).toEqual({ '.sv': 'timestamp' });
    expect(sync.pendingCount()).toBe(0);
    expect(errors.at(-1)).toBe(false);
  });

  it('a commitMany batch uploads as ONE multi-path update under the op and shares one server stamp', async () => {
    const m1 = spAdded(makeSp('sp-2'));
    const m2 = spAdded(makeSp('sp-3'));
    expect(await ops.commitMany([m1, m2])).toEqual({ ok: true });
    writes = [];

    await sync.flush();
    expect(writes).toHaveLength(1);
    const [w] = writes;
    expect(w!.kind).toBe('update');
    expect(w!.path).toBe('orgs/dept-1/events/op-1');
    const values = w!.value as Record<string, Record<string, unknown>>;
    expect(Object.keys(values).sort()).toEqual([m1.id, m2.id].sort());
    const batchId = values[m1.id]!.batchId;
    expect(batchId).toBeTruthy();
    expect(values[m2.id]!.batchId).toBe(batchId);
    for (const v of Object.values(values)) expect(v.receivedAt).toEqual({ '.sv': 'timestamp' });
    expect(ops.get(m1.id)!.receivedAt).toBe(1005);
    expect(ops.get(m2.id)!.receivedAt).toBe(1005);
    expect(sync.pendingCount()).toBe(0);
  });

  it('ack stamping falls back to a one-shot get when the snapshot index has no stamp yet', async () => {
    publishOnWrite = false; // the listener has not delivered the acked snapshot
    const a = statusChanged('sp-1', 'cutting', 'runner');
    await ops.commit(a);
    await sync.flush();
    expect(getSpy).toHaveBeenCalledWith(`orgs/dept-1/events/op-1/${a.id}`);
    expect(ops.get(a.id)!.receivedAt).toBe(1005);
    expect((await dexieRow(a.id))!.receivedAt).toBe(1005);
    expect(sync.isPending(a.id)).toBe(false);
  });

  it('a landed write with no readable stamp is still synced (never re-uploaded); the next snapshot stamps it', async () => {
    publishOnWrite = false;
    getSpy.mockImplementation(async () => {
      throw new Error('offline');
    });
    const a = statusChanged('sp-1', 'cutting', 'runner');
    await ops.commit(a);
    await sync.flush();
    expect(sync.isPending(a.id)).toBe(false);
    expect(ops.get(a.id)!.receivedAt).toBeUndefined();

    const r = await deliver(); // known, un-queued, un-stamped → takes the server stamp
    expect(r.stamped).toEqual([a.id]);
    expect(ops.get(a.id)!.receivedAt).toBe(1005);
  });

  it('a rejected write whose id the snapshot already holds is a lost ack: synced, stamped, and the pass continues', async () => {
    const a = statusChanged('sp-1', 'cutting', 'runner');
    const b = statusChanged('sp-1', 'runner', 'secured');
    await ops.commit(a);
    await ops.commit(b);
    failUpdates = true; // the chunk is rejected → head groups, one at a time
    lostAckId = a.id;

    await sync.flush();
    expect(sync.isPending(a.id)).toBe(false);
    expect(ops.get(a.id)!.receivedAt).toBe(1005); // stamped from the index
    expect(sync.isPending(b.id)).toBe(false); //       the pass went on to b
    expect(logSpy).not.toHaveBeenCalledWith('flush-failed', expect.anything());
    expect(errors.at(-1)).toBe(false);
  });

  it('a rejected write the cloud does NOT hold stays queued, stops the pass, and flags syncError', async () => {
    const a = statusChanged('sp-1', 'cutting', 'runner');
    const b = statusChanged('sp-1', 'runner', 'secured');
    await ops.commit(a);
    await ops.commit(b);
    writes = [];
    failId = a.id;
    await sync.flush();
    expect(writtenIds()).toEqual([]);
    expect(sync.pendingCount()).toBe(2);
    expect(errors.at(-1)).toBe(true);
  });

  // ── throughput: chunked multi-path upload ─────────────────────────────────────────

  /** `n` raw queued events (not in the store's log — upload mechanics only), increasing `at`. */
  const rawEvents = (n: number, prefix: string, batchId?: string): FieldShoreEvent[] =>
    Array.from({ length: n }, (_, i) => ({
      ...resourceAssigned('pos-rescue'),
      id: `${prefix}-${String(i).padStart(3, '0')}`,
      at: 1_000_000 + i,
      ...(batchId ? { batchId } : {}),
    }));
  const chunkSizes = () => writes.filter((w) => w.kind === 'update').map((w) => Object.keys(w.value as object).length);

  it('a 250-event backlog uploads in 3 chunk updates (100/100/50), every event stamp-requested, dequeued in order', async () => {
    const counts: number[] = [];
    const s = mk({ notifyPending: (c) => counts.push(c) });
    const backlog = rawEvents(250, 'bk');
    for (const e of backlog) s.enqueue(e);
    writes = [];
    await s.flush();

    expect(writes.map((w) => [w.kind, w.path])).toEqual([
      ['update', 'orgs/dept-1/events'],
      ['update', 'orgs/dept-1/events'],
      ['update', 'orgs/dept-1/events'],
    ]);
    expect(chunkSizes()).toEqual([100, 100, 50]);
    const keys = writes.flatMap((w) => Object.keys(w.value as object));
    expect(keys).toEqual(backlog.map((e) => `op-1/${e.id}`)); // commit order, nothing skipped
    for (const w of writes) {
      for (const v of Object.values(w.value as Record<string, { receivedAt: unknown }>)) {
        expect(v.receivedAt).toEqual({ '.sv': 'timestamp' });
      }
    }
    expect(counts.slice(-3)).toEqual([150, 50, 0]); // dequeued chunk by chunk, from the head
    expect(s.pendingCount()).toBe(0);
    expect(errors.at(-1)).toBe(false);
  });

  it('a rejected chunk falls back to head-group uploads and stops at the first bad write', async () => {
    const s = mk();
    const evs = rawEvents(5, 'fb');
    for (const e of evs) s.enqueue(e);
    writes = [];
    failId = evs[2]!.id; // the third write is genuinely bad

    await s.flush();
    expect(writtenIds()).toEqual([evs[0]!.id, evs[1]!.id]); // isolated one at a time, stopped at #3
    expect(s.pendingCount()).toBe(3);
    expect(s.isPending(evs[2]!.id)).toBe(true);
    expect(s.isPending(evs[4]!.id)).toBe(true);
    expect(logSpy).toHaveBeenCalledWith('flush-failed', expect.objectContaining({ id: evs[2]!.id }));
    expect(errors.at(-1)).toBe(true);
  });

  it('a rejected chunk the cloud already holds whole is a lost ack: synced, no re-upload, no retry', async () => {
    const s = mk();
    const evs = rawEvents(3, 'la');
    for (const e of evs) s.enqueue(e);
    writes = [];
    lostAckId = evs[1]!.id; // the chunk lands, then the promise rejects
    await s.flush();
    expect(writes).toHaveLength(1); // one chunk, never re-sent one by one
    expect(s.pendingCount()).toBe(0);
    expect(errors.at(-1)).toBe(false);
    expect(scheduled).toEqual([]);
  });

  it('a batch group never straddles a chunk boundary (an oversized group goes up whole)', async () => {
    const s = mk();
    for (const e of [...rawEvents(98, 'a'), ...rawEvents(4, 'g', 'batch-1'), ...rawEvents(10, 'b')]) s.enqueue(e);
    writes = [];
    await s.flush();
    expect(chunkSizes()).toEqual([98, 14]); // cut before the group, not through it

    writes = [];
    const s2 = mk();
    for (const e of [...rawEvents(120, 'big', 'batch-2'), ...rawEvents(5, 'c')]) s2.enqueue(e);
    await s2.flush();
    expect(chunkSizes()).toEqual([120, 5]);
    expect(writes[0]!.path).toBe('orgs/dept-1/events/op-1'); // the group alone: the per-batch path
  });

  // ── failure backoff ─────────────────────────────────────────────────────────────────

  it('a failed pass schedules ONE retry and backs off 5 s → 15 s → 60 s → 60 s', async () => {
    const s = mk();
    const e1 = rawEvents(1, 'bo')[0]!;
    s.enqueue(e1);
    failId = e1.id;

    await s.flush();
    expect(scheduled.map((t) => t.ms)).toEqual([5_000]);
    await s.flush(); // a commit / 'online' trigger fails again — no second timer stacked
    expect(scheduled.map((t) => t.ms)).toEqual([5_000]);

    await fireRetry();
    expect(scheduled.map((t) => t.ms)).toEqual([15_000]);
    await fireRetry();
    expect(scheduled.map((t) => t.ms)).toEqual([60_000]);
    await fireRetry();
    expect(scheduled.map((t) => t.ms)).toEqual([60_000]); // capped
    expect(s.isPending(e1.id)).toBe(true); // the head is never skipped
  });

  it('a success resets the backoff to 5 s and a full drain clears the pending retry', async () => {
    const s = mk();
    const [e1, e2] = rawEvents(2, 'rs');
    s.enqueue(e1!);
    failId = e1!.id;
    await s.flush();
    await fireRetry(); // 5 s fired → 15 s scheduled
    expect(scheduled.map((t) => t.ms)).toEqual([15_000]);
    const pendingHandle = scheduled[0]!.handle;

    failId = null;
    await s.flush(); // a commit-triggered flush drains the queue
    expect(s.pendingCount()).toBe(0);
    expect(scheduled).toEqual([]);
    expect(cleared).toContain(pendingHandle);

    s.enqueue(e2!);
    failId = e2!.id;
    await s.flush();
    expect(scheduled.map((t) => t.ms)).toEqual([5_000]); // reset after the success
  });

  it('no retry is scheduled for a guest (nothing to upload to)', async () => {
    const s = mk({ deptId: () => null });
    s.enqueue(rawEvents(1, 'gu')[0]!);
    await s.flush();
    expect(scheduled).toEqual([]);
    expect(s.pendingCount()).toBe(1);
  });

  it('flush is a no-op for a guest (no department) — nothing uploads, the queue is intact', async () => {
    await ops.commit(statusChanged('sp-1', 'cutting', 'runner'));
    writes = [];
    dept = null;
    await sync.flush();
    expect(sync.pendingCount()).toBe(1);
    expect(writes).toHaveLength(0);
  });

  it('strips undefined optional fields before upload (Firebase RTDB rejects undefined)', async () => {
    const evt = { type: 'OperationCreated', ...base(), name: 'Op', multiBuilding: false, location: undefined } as FieldShoreEvent;
    sync.enqueue(evt);
    await sync.flush();
    const uploaded = writes.find((w) => w.path.endsWith(`/${evt.id}`))!.value as Record<string, unknown>;
    expect('location' in uploaded).toBe(false); // the undefined key is dropped, not sent as undefined
    expect(uploaded.name).toBe('Op'); // the rest of the event is preserved
    expect(uploaded.receivedAt).toEqual({ '.sv': 'timestamp' });
  });

  it('re-drains events enqueued during an in-flight upload, in order (no second trigger needed)', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    let held = false;
    beforeLand = async () => {
      if (!held) {
        held = true;
        await gate; // suspend the FIRST upload mid-drain
      }
    };
    const x1 = statusChanged('sp-1', 'cutting', 'runner');
    await ops.commit(x1);
    writes = [];
    const draining = sync.flush();
    await Promise.resolve();
    const x2 = statusChanged('sp-1', 'runner', 'secured');
    await ops.commit(x2); // arrives while x1 is in flight
    release();
    await draining;
    expect(sync.pendingCount()).toBe(0);
    expect(writtenIds()).toEqual([x1.id, x2.id]);
  });

  // ── merge ───────────────────────────────────────────────────────────────────────────

  it('appends a stale peer status change (no premise drop) — it folds as no effect and our status stands', async () => {
    const before = await db.events.count();
    const stale = peer(statusChanged('sp-1', 'strutset', 'process')); // peer never saw our advance to cutting
    land(stale);
    const r = await deliver();
    expect(r.inserted.map((e) => e.id)).toEqual([stale.id]);
    expect(r.applied).toEqual([]);
    expect(await db.events.count()).toBe(before + 1); // durably appended — every device holds it
    expect(ops.outcomes().get(stale.id)).toBe('no-effect');
    expect(status()).toBe('cutting');
    expect(ops.overridden.getState().events).toEqual([]); // a peer's loss is not ours
  });

  it('applies a deliberate peer step-back premised on our exact current status (ADR-010)', async () => {
    const stepBack = peer(statusChanged('sp-1', 'cutting', 'strutset'));
    land(stepBack);
    const r = await deliver();
    expect(r.applied.map((e) => e.id)).toEqual([stepBack.id]);
    expect(status()).toBe('strutset');
  });

  it('a peer event is appended and folded, never enqueued (no echo upload)', async () => {
    const forward = peer(statusChanged('sp-1', 'cutting', 'runner'));
    land(forward);
    await deliver();
    expect(status()).toBe('runner');
    expect(sync.pendingCount()).toBe(0);
    expect(sync.getRowSyncState(forward.id)).toBe('synced');
    expect(ops.get(forward.id)!.receivedAt).toBe(forward.receivedAt);
  });

  it('reports per-row sync state: a local commit is queued until acked; a merged peer event is synced', async () => {
    const local = statusChanged('sp-1', 'cutting', 'runner');
    await ops.commit(local);
    expect(sync.getRowSyncState(local.id)).toBe('queued');
    const p = peer(statusChanged('sp-1', 'runner', 'secured'));
    land(p);
    await deliver();
    expect(sync.getRowSyncState(p.id)).toBe('synced');
    await sync.flush();
    expect(sync.getRowSyncState(local.id)).toBe('synced');
  });

  it('a known id is deduped in memory — a re-delivered snapshot writes nothing to Dexie', async () => {
    const forward = peer(statusChanged('sp-1', 'cutting', 'runner'));
    land(forward);
    await deliver();
    const before = await db.events.count();
    const bulkAdd = vi.spyOn(db.events, 'bulkAdd');
    const modify = vi.spyOn(ops, 'markReceived');
    const again = await deliver(); // the whole department, every id known
    expect(again).toEqual({ inserted: [], applied: [], stamped: [] });
    expect(bulkAdd).not.toHaveBeenCalled();
    expect(modify).not.toHaveBeenCalled();
    expect(await db.events.count()).toBe(before);
    expect(status()).toBe('runner');
  });

  it('ECHO GATE: an own queued event\'s snapshot stamp (the SDK estimate) is ignored while it is pending', async () => {
    const local = statusChanged('sp-1', 'cutting', 'runner');
    await ops.commit(local);
    // The SDK's optimistic echo: our write appears in the snapshot with an ESTIMATED stamp.
    server.set(local.id, { ...ops.get(local.id)!, receivedAt: 5 });
    const r = await deliver();
    expect(r.stamped).toEqual([]);
    expect(ops.get(local.id)!.receivedAt).toBeUndefined(); // still provisional
    expect((await dexieRow(local.id))!.receivedAt).toBeUndefined();
    expect(sync.isPending(local.id)).toBe(true);

    await sync.flush(); // the server answers with the real stamp
    expect(ops.get(local.id)!.receivedAt).toBe(1005);
    expect((await dexieRow(local.id))!.receivedAt).toBe(1005);
  });

  it('receipt order decides, not delivery order or `at`: an event "ahead" of us is appended at once and converges when the earlier one arrives', async () => {
    const mid = peer(statusChanged('sp-1', 'cutting', 'runner'), 2000);
    const ahead = { ...peer(statusChanged('sp-1', 'runner', 'secured'), 2001), at: 0 }; // an earlier phone clock
    land(ahead); // the later-received event reaches us first
    const r1 = await deliver();
    expect(r1.inserted.map((e) => e.id)).toEqual([ahead.id]); // appended immediately — no drop
    expect(ops.outcomes().get(ahead.id)).toBe('no-effect');
    expect(status()).toBe('cutting');

    land(mid);
    const r2 = await deliver();
    expect(r2.inserted.map((e) => e.id)).toEqual([mid.id]);
    expect(ops.outcomes().get(ahead.id)).toBe('applied'); // re-projected in receipt order
    expect(status()).toBe('secured');
  });

  it('a known, un-queued, unstamped row takes the cloud stamp — a legacy (unstamped) cloud copy folds at its own `at`', async () => {
    // After the ADR-041 upgrade: the local log holds an own event the OLD client uploaded —
    // no stamp locally, none in the cloud, and nothing queued (a fresh session).
    const legacy = { ...statusChanged('sp-1', 'cutting', 'runner'), at: 4242 };
    const db2 = createDB(`test-sync-legacy-${newId()}`);
    await db2.events.bulkAdd([...ops.sortedEvents().map((e) => ({ ...e })), { ...legacy }]);
    const ops2 = createOperationStore({ db: db2, deviceUid: () => ME });
    await ops2.boot();
    expect(ops2.get(legacy.id)!.receivedAt).toBeUndefined(); // provisional after boot
    const s2 = mk({ ops: () => ops2, cloud: createCloudIndex() });

    const r = await s2.reconcile([...server.values(), { ...legacy }], { trackOverridden: true, onlyIds: new Set() });
    expect(r.stamped).toEqual([legacy.id]);
    expect(r.inserted).toEqual([]);
    expect(ops2.get(legacy.id)!.receivedAt).toBe(4242); // the same normalization ingestRemote applies
    expect((await db2.events.where('id').equals(legacy.id).first())!.receivedAt).toBe(4242);
    expect(ops2.store.getState().shorePoints.find((x) => x.id === 'sp-1')!.status).toBe('runner');
    await db2.delete();
  });

  // ── first merge after boot: what "had no effect" may list ──────────────────────────

  /** A fresh store over its own Dexie, booted from `rows` (a device's log at reload). */
  const bootStore = async (rows: FieldShoreEvent[]) => {
    const db2 = createDB(`test-sync-boot-${newId()}`);
    await db2.inventory.add(invItem);
    await db2.events.bulkAdd(rows.map((e) => ({ ...e })));
    const inv2 = createInventoryStore(db2);
    await inv2.boot();
    const ops2 = createOperationStore({ db: db2, inventory: inv2, deviceUid: () => ME });
    await ops2.boot();
    return { db2, ops2 };
  };
  const statusIn = (o: OperationStoreApi, spId: string) => o.store.getState().shorePoints.find((x) => x.id === spId)!.status;

  it('first merge tracks ONLY the un-uploaded backlog: a stamped historic own event that loses is not listed; a backlog event that loses is', async () => {
    const stamped = (e: FieldShoreEvent, receivedAt: number) => ({ ...e, receivedAt });
    const history = [
      stamped(opCreated(), 10),
      stamped(spAdded(makeSp('sp-1')), 20),
      stamped(spAdded(makeSp('sp-2')), 21),
      stamped(deploy('sp-1', 'inv-1'), 30),
      stamped(deploy('sp-2', 'inv-1'), 31),
      stamped(statusChanged('sp-1', 'process', 'strutset'), 40),
    ];
    const historic = stamped(statusChanged('sp-1', 'strutset', 'cutting'), 60); // ours, uploaded long ago
    const offline = statusChanged('sp-2', 'process', 'strutset'); //               ours, never uploaded
    const { db2, ops2 } = await bootStore([...history, historic, offline]);
    expect(statusIn(ops2, 'sp-1')).toBe('cutting');
    expect(statusIn(ops2, 'sp-2')).toBe('strutset');

    // The cloud holds our history plus two peer moves the server received earlier: the same
    // advances, so ours become the no-effect duplicates.
    const p1 = peer(statusChanged('sp-1', 'strutset', 'cutting'), 50);
    const p2 = peer(statusChanged('sp-2', 'process', 'strutset'), 55);
    server = new Map();
    serverNow = 1000;
    cloud = createCloudIndex();
    land(...history, historic, p1, p2);
    const s2 = mk({ ops: () => ops2 });

    s2.enqueue(offline); //                                   the listener's firstMerge…
    publish();
    await s2.reconcile([...server.values()], { trackOverridden: true, onlyIds: new Set([offline.id]) });
    await s2.flush();

    expect(ops2.outcomes().get(historic.id)).toBe('no-effect'); // lost — but history, not news
    expect(ops2.outcomes().get(offline.id)).toBe('no-effect');
    expect(ops2.get(offline.id)!.receivedAt).toBe(1000);
    expect(ops2.overridden.getState().events.map((e) => e.id)).toEqual([offline.id]);
    expect(cuts).toEqual([]); // the first merge never feeds the peer-cut badge
    await db2.delete();
  });

  it('first boot after the upgrade: a backlog event that reads no effect at an early ack and recovers during the merge is NOT listed', async () => {
    // A pre-ADR-041 log: every row unstamped locally, the uploaded ones unstamped in the cloud
    // too; one own event (into cutting) never reached the cloud.
    const legacyRows: FieldShoreEvent[] = [
      { ...opCreated(), at: 1 },
      { ...spAdded(makeSp('sp-1')), at: 2 },
      { ...deploy('sp-1', 'inv-1'), at: 3 },
      { ...statusChanged('sp-1', 'process', 'strutset'), at: 4 },
    ];
    const backlog = { ...statusChanged('sp-1', 'strutset', 'cutting'), at: 5 };
    const { db2, ops2 } = await bootStore([...legacyRows, backlog]);
    expect(statusIn(ops2, 'sp-1')).toBe('cutting');

    server = new Map();
    serverNow = 1000;
    cloud = createCloudIndex();
    const s2 = mk({ ops: () => ops2 });
    // The backlog upload is held until the first-merge stamping loop has started, so its ack
    // (stamp 1000) lands while most legacy rows are still provisional.
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    beforeLand = async (id) => {
      if (id === backlog.id) await gate;
    };
    const orig = ops2.markReceived;
    ops2.markReceived = (id, t, o) => {
      const p = orig(id, t, o);
      release();
      return p;
    };
    const listedAtSomePoint = new Set<string>();
    ops2.overridden.subscribe((st) => st.events.forEach((e) => listedAtSomePoint.add(e.id)));

    s2.enqueue(backlog);
    const flushing = s2.flush(); // the listener's firstMerge: push the backlog UP…
    await s2.reconcile(legacyRows.map((e) => ({ ...e })), { trackOverridden: true, onlyIds: new Set([backlog.id]) }); // …pull DOWN
    await flushing;

    expect(listedAtSomePoint.has(backlog.id)).toBe(true); // the race really happened (transient loss)
    expect(ops2.get(backlog.id)!.receivedAt).toBe(1000);
    expect(legacyRows.map((e) => ops2.get(e.id)!.receivedAt)).toEqual([1, 2, 3, 4]);
    expect(statusIn(ops2, 'sp-1')).toBe('cutting');
    expect(ops2.outcomes().get(backlog.id)).toBe('applied');
    expect(ops2.overridden.getState().events).toEqual([]); // recovered — nothing was lost
    await db2.delete();
  });

  it('PROBE 1c, reload variant: a Cancel committed offline, then a reload, loses to the peer Accept on the first snapshot — and is listed', async () => {
    const tablet: OrgResourceRef = { ref: 'device', value: PEER, label: 'Tablet B' };
    const init: FieldShoreEvent = { type: 'CommandTransferInitiated', ...base(), toResource: tablet };
    await ops.commit(init);
    await sync.flush(); // Init received (1005)
    const cancel: FieldShoreEvent = { type: 'CommandTransferCancelled', ...base(), transferId: init.id };
    await ops.commit(cancel); // offline — never uploaded
    const accept: FieldShoreEvent = { type: 'CommandTransferAccepted', ...base(PEER), transferId: init.id };
    land(peer(accept)); // the server receives B's accept (1006)

    // RELOAD: a fresh store over the same Dexie, a fresh (empty) upload queue and listener.
    const inv2 = createInventoryStore(db);
    await inv2.boot();
    const ops2 = createOperationStore({ db, inventory: inv2, deviceUid: () => ME });
    await ops2.boot();
    expect(ops2.get(cancel.id)!.receivedAt).toBeUndefined();
    expect(ops2.store.getState().commandTransfer).toBeNull(); // locally the cancel stands
    cloud = createCloudIndex();
    const s2 = mk({ ops: () => ops2 });
    let onSnap!: (snap: unknown) => void;
    const listener = createEventListenerSync({
      deptId: () => 'dept-1',
      localEvents: () => ops2.sortedEvents(),
      reconcile: (c, o) => s2.reconcile(c, o),
      enqueue: (e) => s2.enqueue(e),
      flush: () => s2.flush(),
      cloud,
      subscribe: (_path, cb) => {
        onSnap = cb;
        return () => {};
      },
    });
    listener.start();
    const tree: Record<string, Record<string, unknown>> = {};
    for (const e of server.values()) (tree[e.opId as string] ??= {})[e.id as string] = e;
    onSnap(tree); // the first snapshot holds B's accept

    for (let i = 0; i < 50 && (s2.pendingCount() > 0 || ops2.get(cancel.id)!.receivedAt === undefined); i++) {
      await new Promise((r) => setTimeout(r, 0));
    }
    await new Promise((r) => setTimeout(r, 0));

    expect(s2.pendingCount()).toBe(0);
    expect(ops2.get(cancel.id)!.receivedAt).toBe(1007); // uploaded after the accept
    expect(currentIC(ops2.store.getState().positions)).toEqual(tablet);
    expect(ops2.outcomes().get(cancel.id)).toBe('no-effect');
    expect(ops2.overridden.getState().events.map((e) => e.id)).toEqual([cancel.id]); // the tell
    listener.stop();
  });

  it('PROBE 1c at the service level: an own Cancel echoed with an early estimate loses to a peer Accept the server received first', async () => {
    // We are IC (OperationCreated by ME). We initiate a transfer to the peer's device.
    const tablet: OrgResourceRef = { ref: 'device', value: PEER, label: 'Tablet B' };
    const init: FieldShoreEvent = { type: 'CommandTransferInitiated', ...base(), toResource: tablet };
    await ops.commit(init);
    await sync.flush(); // Init received (1005)
    const icBefore = currentIC(ops.store.getState().positions);
    expect(icBefore).toMatchObject({ ref: 'device', value: ME });

    // We cancel (provisional, queued). The peer accepts concurrently.
    const cancel: FieldShoreEvent = { type: 'CommandTransferCancelled', ...base(), transferId: init.id };
    await ops.commit(cancel);
    expect(ops.store.getState().commandTransfer).toBeNull(); // locally the cancel applies

    const EST = 1006; // the SDK's estimate for our cancel — EARLIER than the accept's real receipt
    const accept: FieldShoreEvent = { type: 'CommandTransferAccepted', ...base(PEER), transferId: init.id, receivedAt: EST + 1 };
    let provisionalDuringEcho: number | undefined = -1;
    beforeLand = async (id, value) => {
      if (id !== cancel.id) return;
      server.set(id, { ...value, receivedAt: EST }); // optimistic echo with the estimate
      await deliver();
      provisionalDuringEcho = ops.get(cancel.id)!.receivedAt;
      land(accept); // the server receives the peer's accept first
      await deliver();
      serverNow = EST + 2; // our cancel reaches the server after it
    };
    await sync.flush();

    expect(provisionalDuringEcho).toBeUndefined(); // the estimate was never adopted
    expect(ops.get(cancel.id)!.receivedAt).toBe(EST + 2);
    expect(currentIC(ops.store.getState().positions)).toEqual(tablet); // command moved: IC = incoming
    expect(ops.outcomes().get(accept.id)).toBe('applied');
    expect(ops.outcomes().get(cancel.id)).toBe('no-effect'); // stays no effect after the real stamp
    expect(ops.overridden.getState().events.map((e) => e.id)).toEqual([cancel.id]);

    // A fresh device folding the cloud converges on the same IC.
    const db3 = createDB(`test-sync-fresh-${newId()}`);
    const ops3 = createOperationStore({ db: db3 });
    await ops3.ingestRemote([...server.values()]);
    expect(currentIC(ops3.store.getState().positions)).toEqual(tablet);
    expect(ops3.outcomes().get(cancel.id)).toBe('no-effect');
    await db3.delete();
  });

  // ── #404 peer-cut badge ─────────────────────────────────────────────────────────────

  it('counts newly arrived PEER moves into cutting — never a re-delivered snapshot, a non-cut move, or an own-device arrival', async () => {
    for (const id of ['sp-2', 'sp-4']) {
      await ops.commit(spAdded(makeSp(id)));
      await ops.commit(deploy(id, 'inv-1'));
      await ops.commit(statusChanged(id, 'process', 'strutset'));
    }
    await sync.flush();

    land(peer(statusChanged('sp-2', 'strutset', 'cutting')));
    await deliver();
    expect(cuts).toEqual([1]);

    await deliver(); // the same snapshot again
    expect(cuts).toEqual([1]);

    land(peer(statusChanged('sp-2', 'cutting', 'runner'))); // forward, not into cutting
    await deliver();
    expect(cuts).toEqual([1]);

    // This device's own move from another tab (same `by`) arriving through the cloud.
    land({ ...statusChanged('sp-4', 'strutset', 'cutting'), receivedAt: serverNow++ });
    const r = await deliver();
    expect(r.applied).toHaveLength(1);
    expect(cuts).toEqual([1]);
  });

  it('the badge ignores the first merge after boot and a later outcome flip of an old arrival (never retroactive)', async () => {
    await ops.commit(spAdded(makeSp('sp-2')));
    await ops.commit(deploy('sp-2', 'inv-1'));
    await ops.commit(statusChanged('sp-2', 'process', 'strutset'));
    await ops.commit(spAdded(makeSp('sp-3')));
    await ops.commit(deploy('sp-3', 'inv-1')); // sp-3 at process
    await sync.flush();

    land(peer(statusChanged('sp-2', 'strutset', 'cutting')));
    const first = await deliver({ trackOverridden: true, onlyIds: new Set() }); // the boot pass replays history
    expect(first.applied).toHaveLength(1);
    expect(cuts).toEqual([]);

    const x = peer(statusChanged('sp-3', 'strutset', 'cutting'), 3000); // ahead of sp-3
    land(x);
    await deliver();
    expect(ops.outcomes().get(x.id)).toBe('no-effect');
    expect(cuts).toEqual([]);

    land(peer(statusChanged('sp-3', 'process', 'strutset'), 2999)); // the missing edge, received earlier
    await deliver();
    expect(ops.outcomes().get(x.id)).toBe('applied'); // x flipped — but it is not a NEW arrival
    expect(status('sp-3')).toBe('cutting');
    expect(cuts).toEqual([]);
  });

  // ── queue bookkeeping (unchanged contracts) ─────────────────────────────────────────

  it('pushes pendingCount on enqueue and resets it as the queue flushes (Increment 4 banner)', async () => {
    const counts: number[] = [];
    const s = mk({ notifyPending: (c) => counts.push(c) });
    s.enqueue({ ...opCreated(), id: 'p1' });
    s.enqueue({ ...opCreated(), id: 'p2' });
    s.enqueue({ ...opCreated(), id: 'p2' }); // deduped by id
    expect(counts.at(-1)).toBe(2);
    await s.flush();
    expect(counts.at(-1)).toBe(0);
  });

  it('pendingResourceKeys tracks DISTINCT apparatus/individual keys, not raw event count (#352)', async () => {
    const s = mk();
    const lopez = { ref: 'individual' as const, value: 'FF Lopez', label: 'FF Lopez' };
    s.enqueue(resourceAssigned('pos-rescue')); // Rescue 2
    s.enqueue(resourceAssigned('pos-rescue', lopez)); // + FF Lopez
    s.enqueue(resourceCleared('pos-rescue')); // clears Rescue 2 — same key, still one distinct key
    expect(s.pendingResourceKeys()).toEqual(new Set(['apparatus:app-r2', 'individual:FF Lopez']));
    expect(s.pendingCount()).toBe(3);
    await s.flush();
    expect(s.pendingResourceKeys().size).toBe(0);
  });

  it('pendingResourceKeys skips a clear-ALL ResourceCleared (no resource) — unattributable, not counted', () => {
    const s = mk();
    s.enqueue(resourceCleared('pos-rescue'));
    expect(s.pendingResourceKeys().size).toBe(0);
  });

  it('pushes pendingResourceCount alongside pendingCount on enqueue and flush (#352 Command chrome)', async () => {
    const resourceCounts: number[] = [];
    const s = mk({ notifyPendingResources: (c) => resourceCounts.push(c) });
    s.enqueue(resourceAssigned('pos-rescue'));
    expect(resourceCounts.at(-1)).toBe(1);
    await s.flush();
    expect(resourceCounts.at(-1)).toBe(0);
  });

  it('flags syncError when a flush leaves changes stuck, clears it once drained (Increment 4)', async () => {
    const e1 = { ...opCreated(), id: 'e1' };
    const s = mk();
    s.enqueue(e1);
    failId = 'e1';
    await s.flush();
    expect(errors.at(-1)).toBe(true);
    failId = null;
    await s.flush();
    expect(errors.at(-1)).toBe(false);
  });

  it('setState pushes a non-event state record to orgs/{dept}/{relPath} (LWW overwrite)', async () => {
    await sync.setState('apparatus', { value: [{ id: 'app-1' }], lastWriteAt: 5 });
    expect(writes.find((w) => w.path === 'orgs/dept-1/apparatus')!.value).toEqual({ value: [{ id: 'app-1' }], lastWriteAt: 5 });
    await sync.setState('inventory/inv-9', { id: 'inv-9', deleted: true, lastWriteAt: 7 }); // tombstone shape
    expect(writes.find((w) => w.path === 'orgs/dept-1/inventory/inv-9')!.value).toEqual({ id: 'inv-9', deleted: true, lastWriteAt: 7 });
  });

  it('setState is a no-op for a guest and strips undefined fields', async () => {
    writes = [];
    dept = null;
    await sync.setState('apparatus', { value: [], lastWriteAt: 1 });
    expect(writes).toHaveLength(0);

    dept = 'dept-1';
    await sync.setState('inventory/inv-1', { id: 'inv-1', model: undefined, quantity: 2, lastWriteAt: 1 });
    const w = writes.find((x) => x.path === 'orgs/dept-1/inventory/inv-1')!.value as Record<string, unknown>;
    expect('model' in w).toBe(false);
    expect(w).toMatchObject({ id: 'inv-1', quantity: 2, lastWriteAt: 1 });
  });
});
