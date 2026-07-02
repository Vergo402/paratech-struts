import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createDB, type FieldShoreDB } from '../store/db';
import { createInventoryStore, type InventoryStoreApi } from '../store/inventoryStore';
import { createOperationStore, type OperationStoreApi } from '../store/operationStore';
import { createSyncService, type SyncServiceApi } from './syncService';
import { newId } from '@core/id';
import {
  NO_DEDUCTIONS,
  type FieldShoreEvent,
  type InventoryItem,
  type ShorePoint,
  type ShorePointStatus,
} from '@core/schema';

// The sync seam stub: a real L-7 merge guard over a no-op transport. Local
// state below is advanced to 'cutting' so stale-peer regressions have teeth.

const OP = 'op-1';
const base = () => ({ id: newId(), opId: OP, at: 1, by: 'device-peer' });

const opCreated = (): FieldShoreEvent => ({ type: 'OperationCreated', ...base(), name: 'Test Op', multiBuilding: false });
const spAdded = (sp: ShorePoint): FieldShoreEvent => ({ type: 'ShorePointAdded', ...base(), shorePoint: sp });
const statusChanged = (spId: string, from: ShorePointStatus, to: ShorePointStatus): FieldShoreEvent => ({
  type: 'ShorePointStatusChanged', ...base(), spId, from, to,
});
const deploy = (spId: string, inventoryId: string): FieldShoreEvent => ({
  type: 'EquipmentDeployed', ...base(), spId, deployedBom: [{ role: 'strut', model: 'LS 203', source: 'Rescue 2', inventoryId }],
});

const makeSp = (id: string): ShorePoint => ({
  id, opId: OP, division: '1', shoreType: 't-shore',
  measurementEighths: 240, deductions: NO_DEDUCTIONS, status: 'pending',
});

const invItem: InventoryItem = {
  id: 'inv-1', type: 'strut', model: 'LS 203', system: 'LongShore',
  apparatus: 'Rescue 2', apparatusId: 'app-r2', quantity: 2, available: 2,
};

describe('syncService (event cloud sync + L-7 merge guard)', () => {
  let db: FieldShoreDB;
  let inventory: InventoryStoreApi;
  let ops: OperationStoreApi;
  let sync: SyncServiceApi;

  // Injected cloud transport — no real Firebase. `writes` records every upload;
  // `dept` drives the deptId accessor; `failId` makes one upload throw (partial
  // failure); `logSpy` captures the L-8 failure ledger.
  let writes: Record<string, unknown>;
  let dept: string | null;
  let failId: string | null;
  let logSpy: ReturnType<typeof vi.fn>;

  const localStatus = () => ops.store.getState().shorePoints.find((s) => s.id === 'sp-1')!.status;

  beforeEach(async () => {
    db = createDB(`test-sync-${newId()}`);
    inventory = createInventoryStore(db);
    writes = {};
    dept = 'dept-1';
    failId = null;
    logSpy = vi.fn();
    // Two-step wiring mirrors the singletons' lazy cycle: sync sees ops through an
    // accessor; ops enqueues into sync. The test's enqueue does NOT auto-flush (the
    // registry does that in prod); flush() is driven explicitly here.
    sync = createSyncService({
      ops: () => ops,
      deptId: () => dept,
      set: async (path, value) => {
        if (failId && path.endsWith(`/${failId}`)) throw new Error('upload boom');
        writes[path] = value;
      },
      log: logSpy,
    });
    ops = createOperationStore({ db, inventory, enqueue: (e) => sync.enqueue(e) });

    await db.inventory.add(invItem);
    await inventory.boot();
    await ops.commit(opCreated());
    await ops.commit(spAdded(makeSp('sp-1')));
    await ops.commit(deploy('sp-1', 'inv-1')); // pending → process
    await ops.commit(statusChanged('sp-1', 'process', 'strutset'));
    await ops.commit(statusChanged('sp-1', 'strutset', 'cutting'));
  });

  afterEach(async () => {
    await db.delete();
  });

  it('drops a stale peer event premised on state older than ours (L-7) — it never enters the log', async () => {
    const before = await db.events.count();
    const stale = statusChanged('sp-1', 'strutset', 'process'); // peer never saw our advance to cutting
    const { applied, dropped } = await sync.reconcile([stale]);
    expect(applied).toHaveLength(0);
    expect(dropped).toEqual([stale]);
    expect(await db.events.count()).toBe(before);
    expect(localStatus()).toBe('cutting');
  });

  it('applies a deliberate peer step-back premised on our exact current status (ADR-010)', async () => {
    const stepBack = statusChanged('sp-1', 'cutting', 'strutset');
    const { applied, dropped } = await sync.reconcile([stepBack]);
    expect(applied).toEqual([stepBack]);
    expect(dropped).toHaveLength(0);
    expect(localStatus()).toBe('strutset');
  });

  it('applies a forward peer event through the one commit path without re-enqueueing it', async () => {
    const queueBefore = sync.pendingCount(); // the 5 local commits
    const forward = statusChanged('sp-1', 'cutting', 'runner');
    const { applied } = await sync.reconcile([forward]);
    expect(applied).toEqual([forward]);
    expect(localStatus()).toBe('runner');
    expect(sync.pendingCount()).toBe(queueBefore); // fromRemote — no echo
  });

  it('counts remote arrivals INTO cutting for the #404 badge, not other peer changes', async () => {
    const cuts: number[] = [];
    const w: Record<string, unknown> = {};
    // A second point advanced locally to strutset (ready to enter the cut queue).
    await ops.commit(spAdded(makeSp('sp-2')));
    await ops.commit(deploy('sp-2', 'inv-1'));
    await ops.commit(statusChanged('sp-2', 'process', 'strutset'));

    const s = createSyncService({
      ops: () => ops,
      deptId: () => 'dept-1',
      set: async (p, v) => void (w[p] = v),
      notifyRemoteCuts: (n) => cuts.push(n),
    });

    // A peer sends sp-2 into cutting → one arrival counted.
    await s.reconcile([statusChanged('sp-2', 'strutset', 'cutting')]);
    expect(cuts).toEqual([1]);

    // A peer forward that ISN'T into cutting → no bump.
    await s.reconcile([statusChanged('sp-2', 'cutting', 'runner')]);
    expect(cuts).toEqual([1]);
  });

  it('drops a peer event already merged once (duplicate id fails the unique index)', async () => {
    const forward = statusChanged('sp-1', 'cutting', 'runner');
    await sync.reconcile([forward]);
    const again = await sync.reconcile([forward]);
    expect(again.applied).toHaveLength(0);
    expect(again.dropped).toEqual([forward]);
    expect(localStatus()).toBe('runner');
  });

  it('reports per-row sync state: local commits are queued, merged peer events are not', async () => {
    const local = statusChanged('sp-1', 'cutting', 'runner');
    await ops.commit(local);
    expect(sync.getRowSyncState(local.id)).toBe('queued');

    const peer = statusChanged('sp-1', 'runner', 'secured');
    await sync.reconcile([peer]);
    expect(sync.getRowSyncState(peer.id)).toBe('synced');
  });

  it('flush uploads every queued event to /orgs/{dept}/events/{opId}/{id} and clears the queue', async () => {
    expect(sync.pendingCount()).toBe(5); // the 5 setup commits
    await sync.flush();
    const rows = await db.events.toArray();
    expect(rows).toHaveLength(5);
    for (const row of rows) {
      expect(writes[`orgs/dept-1/events/${row.opId}/${row.id}`]).toBeTruthy();
      expect(sync.getRowSyncState(row.id)).toBe('synced');
    }
    expect(sync.pendingCount()).toBe(0);
  });

  it('an event flushed up then echoed back by the listener is a no-op (fromRemote + &id dedup)', async () => {
    const local = statusChanged('sp-1', 'cutting', 'runner');
    await ops.commit(local);
    await sync.flush();
    expect(sync.getRowSyncState(local.id)).toBe('synced');

    const before = await db.events.count();
    const { applied, dropped } = await sync.reconcile([local]); // the listener echoing our own upload
    expect(applied).toHaveLength(0);
    expect(dropped).toEqual([local]);
    expect(await db.events.count()).toBe(before); // no second append
  });

  it('a failed upload stays queued for retry (best-effort) and logs; the rest clear', async () => {
    const a = statusChanged('sp-1', 'cutting', 'runner');
    await ops.commit(a);
    expect(sync.pendingCount()).toBe(6); // 5 setup + a
    failId = a.id; // make only a's upload throw

    await sync.flush();

    expect(sync.getRowSyncState(a.id)).toBe('queued'); // kept for the next flush
    expect(sync.pendingCount()).toBe(1); // only the failed one remains
    expect(logSpy).toHaveBeenCalledWith('flush-failed', expect.objectContaining({ id: a.id }));
  });

  it('flush is a no-op for a guest (no department) — nothing uploads, the queue is intact', async () => {
    dept = null;
    const before = sync.pendingCount();
    await sync.flush();
    expect(sync.pendingCount()).toBe(before);
    expect(Object.keys(writes)).toHaveLength(0);
  });

  it('strips undefined optional fields before upload (Firebase RTDB rejects undefined)', async () => {
    const evt = { type: 'OperationCreated', ...base(), name: 'Op', multiBuilding: false, location: undefined } as FieldShoreEvent;
    sync.enqueue(evt);
    await sync.flush();
    const uploaded = writes[`orgs/dept-1/events/${evt.opId}/${evt.id}`] as Record<string, unknown>;
    expect(uploaded).toBeTruthy();
    expect('location' in uploaded).toBe(false); // the undefined key is dropped, not sent as undefined
    expect(uploaded.name).toBe('Op'); // the rest of the event is preserved
  });

  it('reconciles an out-of-order peer status chain to the correct final status (causal `at` sort)', async () => {
    await sync.reconcile([spAdded(makeSp('sp-2'))]); // sp-2 at pending
    await ops.commit(deploy('sp-2', 'inv-1')); // pending → process (deploy is the inventory edge)
    const e1 = { ...statusChanged('sp-2', 'process', 'strutset'), at: 10 };
    const e2 = { ...statusChanged('sp-2', 'strutset', 'cutting'), at: 20 };
    const { applied } = await sync.reconcile([e2, e1]); // delivered reversed; reconcile sorts by `at`
    expect(applied).toHaveLength(2);
    expect(ops.store.getState().shorePoints.find((s) => s.id === 'sp-2')!.status).toBe('cutting');
  });

  it('drops a peer status event premised on a status ahead of ours, then applies it once we catch up', async () => {
    await sync.reconcile([spAdded(makeSp('sp-3'))]); // pending
    await ops.commit(deploy('sp-3', 'inv-1')); // process
    const ahead = { ...statusChanged('sp-3', 'cutting', 'runner'), at: 30 }; // we're a laggard at 'process'
    const r1 = await sync.reconcile([ahead]);
    expect(r1.applied).toHaveLength(0);
    expect(r1.dropped).toEqual([ahead]); // dropped WITHOUT committing — the &id is not consumed
    // the missing intermediate edges arrive; whole-dept snapshot re-delivers `ahead` too
    const mid1 = { ...statusChanged('sp-3', 'process', 'strutset'), at: 10 };
    const mid2 = { ...statusChanged('sp-3', 'strutset', 'cutting'), at: 20 };
    await sync.reconcile([ahead, mid2, mid1]); // shuffled; sorted mid1(10) → mid2(20) → ahead(30)
    expect(ops.store.getState().shorePoints.find((s) => s.id === 'sp-3')!.status).toBe('runner'); // converged
  });

  it('pushes pendingCount on enqueue and resets it as the queue flushes (Increment 4 banner)', async () => {
    const counts: number[] = [];
    const w: Record<string, unknown> = {};
    const s = createSyncService({
      ops: () => ops,
      deptId: () => 'dept-1',
      set: async (p, v) => void (w[p] = v),
      notifyPending: (c) => counts.push(c),
    });
    s.enqueue({ ...opCreated(), id: 'p1' });
    s.enqueue({ ...opCreated(), id: 'p2' });
    expect(counts.at(-1)).toBe(2); // grew with the queue
    await s.flush();
    expect(counts.at(-1)).toBe(0); // drained to empty
  });

  it('flags syncError when a flush leaves changes stuck, clears it once drained (Increment 4)', async () => {
    const errors: boolean[] = [];
    const w: Record<string, unknown> = {};
    let failing = true;
    const s = createSyncService({
      ops: () => ops,
      deptId: () => 'dept-1',
      set: async (p, v) => {
        if (failing) throw new Error('boom');
        w[p] = v;
      },
      notifyError: (e) => errors.push(e),
    });
    s.enqueue({ ...opCreated(), id: 'e1' });
    await s.flush();
    expect(errors.at(-1)).toBe(true); // upload failed → stuck
    failing = false;
    await s.flush();
    expect(errors.at(-1)).toBe(false); // drained → cleared
  });

  it('setState pushes a non-event state record to orgs/{dept}/{relPath} (LWW overwrite)', async () => {
    await sync.setState('apparatus', { value: [{ id: 'app-1' }], lastWriteAt: 5 });
    expect(writes['orgs/dept-1/apparatus']).toEqual({ value: [{ id: 'app-1' }], lastWriteAt: 5 });
    await sync.setState('inventory/inv-9', { id: 'inv-9', deleted: true, lastWriteAt: 7 }); // tombstone shape
    expect(writes['orgs/dept-1/inventory/inv-9']).toEqual({ id: 'inv-9', deleted: true, lastWriteAt: 7 });
  });

  it('setState is a no-op for a guest and strips undefined fields', async () => {
    dept = null;
    await sync.setState('apparatus', { value: [], lastWriteAt: 1 });
    expect(Object.keys(writes)).toHaveLength(0);

    dept = 'dept-1';
    await sync.setState('inventory/inv-1', { id: 'inv-1', model: undefined, quantity: 2, lastWriteAt: 1 });
    const w = writes['orgs/dept-1/inventory/inv-1'] as Record<string, unknown>;
    expect('model' in w).toBe(false); // RTDB rejects undefined → stripped
    expect(w).toMatchObject({ id: 'inv-1', quantity: 2, lastWriteAt: 1 });
  });

  it('re-drains events enqueued during an in-flight upload (no second trigger needed)', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const seen: string[] = [];
    let held = false;
    const s = createSyncService({
      ops: () => ops,
      deptId: () => 'dept-1',
      set: async (path) => {
        seen.push(path);
        if (!held) {
          held = true;
          await gate; // suspend the FIRST upload mid-drain
        }
      },
    });
    s.enqueue({ ...opCreated(), id: 'x1' });
    const draining = s.flush(); // drains x1, suspends at the gate (snapshot was [x1])
    await Promise.resolve();
    s.enqueue({ ...opCreated(), id: 'x2' }); // arrives AFTER x1's snapshot
    release();
    await draining; // the re-drain loop must pick up x2 without another flush trigger
    expect(s.pendingCount()).toBe(0);
    expect(seen.some((p) => p.endsWith('/x1'))).toBe(true);
    expect(seen.some((p) => p.endsWith('/x2'))).toBe(true);
  });
});
