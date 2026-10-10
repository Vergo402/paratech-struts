import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createDB, type FieldShoreDB, type EventRow } from './db';
import { createInventoryStore, type InventoryStoreApi } from './inventoryStore';
import { createOperationStore, type OperationStoreApi } from './operationStore';
import { projectOperation, sortCanonical } from '@core/operation';
import { createMonotonicClock } from '@core/clock';
import { deployedCapacityFlag, deployedStrutOf } from '@core/shorepoint';
import { newId } from '@core/id';
import {
  NO_DEDUCTIONS,
  type DeployedComponent,
  type FieldShoreEvent,
  type InventoryItem,
  type ShorePoint,
  type ShorePointStatus,
} from '@core/schema';

// The data/store contract (ADR-041):
// - A LOCAL commit = validate → clock-stamped `at` → read-only pre-flight against the
//   DERIVED stock view → durable Dexie append (no inventory write, ever) → in-memory
//   canonical log → sync enqueue. A local event stays PROVISIONAL (no receivedAt) until
//   the sync layer stamps the cloud receipt (markReceived).
// - A PEER event (ingestRemote) is appended unconditionally; the fold decides its effect.
// - Canonical order is `(receivedAt ?? +∞, at, id)`: every received event sorts BEFORE
//   every provisional one (cloud-first). Tests that mix local setup with peer events
//   therefore first `ack()` the setup (simulating the sync layer's receipt stamp) and give
//   peer events a LATER receivedAt — otherwise a peer event folds before the setup exists
//   and every "no-effect" would pass for the wrong reason.
// - Stock out on scene is `held`, a projection of the log; `available = quantity − held`.

const OP = 'op-1';
const base = () => ({ id: newId(), opId: OP, at: 1, by: 'device-test' });

const opCreated = (): FieldShoreEvent => ({ type: 'OperationCreated', ...base(), name: 'Test Op', multiBuilding: false });
const spAdded = (sp: ShorePoint): FieldShoreEvent => ({ type: 'ShorePointAdded', ...base(), shorePoint: sp });
const statusChanged = (spId: string, from: ShorePointStatus, to: ShorePointStatus): FieldShoreEvent => ({
  type: 'ShorePointStatusChanged', ...base(), spId, from, to,
});
const deploy = (spId: string, inventoryId: string): FieldShoreEvent => ({
  type: 'EquipmentDeployed', ...base(), spId,
  deployedBom: [{ role: 'strut', model: 'LS 203', source: 'Rescue 2', inventoryId }],
});
const returned = (spId: string): FieldShoreEvent => ({ type: 'EquipmentReturned', ...base(), spId });
const reclaimed = (spId: string): FieldShoreEvent => ({ type: 'EquipmentReclaimed', ...base(), spId });
const deleteEvt = (spId: string, hard = false): FieldShoreEvent => ({
  type: 'ShorePointDeleted', ...base(), spId, ...(hard ? { hard: true } : {}),
});
/** A peer event as it arrives from the cloud: another device, a receipt stamp. */
const peer = (e: FieldShoreEvent, receivedAt: number, by = 'device-peer'): FieldShoreEvent => ({ ...e, by, receivedAt });

const makeSp = (id: string, over: Partial<ShorePoint> = {}): ShorePoint => ({
  id, opId: OP, division: '1', shoreType: 't-shore',
  measurementEighths: 240, deductions: NO_DEDUCTIONS, status: 'pending', ...over,
});

const invItem = (id: string, quantity = 2): InventoryItem => ({
  id, type: 'strut', model: 'LS 203', system: 'LongShore', apparatus: 'Rescue 2', apparatusId: 'app-r2', quantity,
});

const WALK_TO_SECURED: [ShorePointStatus, ShorePointStatus][] = [
  ['process', 'strutset'], ['strutset', 'cutting'], ['cutting', 'runner'], ['runner', 'secured'],
];

/** Dexie rows as plain events (the local `seq` key dropped). */
const asEvents = (rows: EventRow[]): FieldShoreEvent[] =>
  rows.map((r) => {
    const e = { ...r };
    delete e.seq;
    return e;
  });

describe('operationStore', () => {
  let db: FieldShoreDB;
  let inventory: InventoryStoreApi;
  let ops: OperationStoreApi;
  let enqueued: FieldShoreEvent[];
  let stamp: number;

  const getSp = (id: string) => ops.store.getState().shorePoints.find((s) => s.id === id);
  const view = (id: string) => inventory.store.getState().items.find((i) => i.id === id)!;
  const held = (id: string) => ops.held()[id] ?? 0;
  const invSnapshot = async () => JSON.stringify(await db.inventory.toArray());
  /** Simulate the sync layer's acknowledgment: stamp every provisional event, in order. */
  const ack = async () => {
    for (const e of ops.sortedEvents()) if (e.receivedAt === undefined) await ops.markReceived(e.id, stamp++);
  };
  const walkToSecured = async (spId: string) => {
    for (const [from, to] of WALK_TO_SECURED) expect((await ops.commit(statusChanged(spId, from, to))).ok).toBe(true);
  };

  beforeEach(async () => {
    db = createDB(`test-ops-${newId()}`);
    enqueued = [];
    stamp = 100;
    inventory = createInventoryStore(db);
    ops = createOperationStore({ db, inventory, enqueue: (e) => enqueued.push(e) });
    await db.inventory.bulkAdd([invItem('inv-1', 2), invItem('inv-0', 0)]);
    await inventory.boot();
    await ops.commit(opCreated());
    await ops.commit(spAdded(makeSp('sp-1')));
    await ops.commit(spAdded(makeSp('sp-2')));
  });

  afterEach(async () => {
    await db.delete();
  });

  describe('local commit basics', () => {
    it('in-memory state ≡ projection of the durable log in CANONICAL order, and a reboot refolds identically', async () => {
      expect((await ops.commit(deploy('sp-1', 'inv-1'))).ok).toBe(true);
      expect((await ops.commit(statusChanged('sp-1', 'process', 'strutset'))).ok).toBe(true);
      await ack(); // half the log received…
      expect((await ops.commit(statusChanged('sp-1', 'strutset', 'cutting'))).ok).toBe(true); // …one provisional

      const rows = asEvents(await db.events.toArray());
      expect(rows).toHaveLength(6);
      expect(projectOperation(sortCanonical(rows))).toEqual(ops.store.getState());

      const inv2 = createInventoryStore(db);
      await inv2.boot();
      const rebooted = createOperationStore({ db, inventory: inv2, enqueue: () => {} });
      await rebooted.boot();
      expect(rebooted.store.getState()).toEqual(ops.store.getState());
      expect(rebooted.held()).toEqual(ops.held());
      expect(rebooted.sortedEvents()).toEqual(ops.sortedEvents());
      expect(inv2.store.getState().items).toEqual(inventory.store.getState().items);
    });

    it('stamps `at` from the device clock: strictly increasing, one object in Dexie, memory and the queue', async () => {
      const db2 = createDB(`test-ops-clock-${newId()}`);
      const q: FieldShoreEvent[] = [];
      const o2 = createOperationStore({ db: db2, enqueue: (e) => q.push(e), clock: createMonotonicClock(() => 5000) });
      // Caller-supplied `at` / receivedAt / batchId are all replaced or dropped.
      await o2.commit({ ...opCreated(), at: 1, receivedAt: 77, batchId: 'nope' } as FieldShoreEvent);
      await o2.commit(spAdded(makeSp('sp-1')));
      await o2.commitMany([spAdded(makeSp('sp-2')), spAdded(makeSp('sp-3'))]);
      expect(q.map((e) => e.at)).toEqual([5000, 5001, 5002, 5003]);
      expect(q.every((e) => e.receivedAt === undefined)).toBe(true);
      expect(q[0]!.batchId).toBeUndefined();
      const mem = o2.sortedEvents();
      for (const e of q) expect(mem.find((m) => m.id === e.id)).toBe(e); // the identical object
      expect(asEvents(await db2.events.toArray())).toEqual(q);
      await db2.delete();
    });

    it('enqueues every local commit, in order', async () => {
      await ops.commit(deploy('sp-1', 'inv-1'));
      expect(enqueued.map((e) => e.type)).toEqual([
        'OperationCreated', 'ShorePointAdded', 'ShorePointAdded', 'EquipmentDeployed',
      ]);
    });

    it('rejects an invalid event before it reaches the log', async () => {
      const res = await ops.commit({ type: 'Nope' } as unknown as FieldShoreEvent);
      expect(res.ok).toBe(false);
      expect(await db.events.count()).toBe(3);
    });

    it('rejects an id already in the log', async () => {
      const dup = { ...statusChanged('sp-1', 'pending', 'process'), id: ops.sortedEvents()[0]!.id };
      expect(await ops.commit(dup)).toMatchObject({ ok: false, reason: 'duplicate event id' });
      expect(await db.events.count()).toBe(3);
    });

    it('rejects an id another tab already stored (Dexie unique index) — no state, no stock change', async () => {
      const e = statusChanged('sp-1', 'pending', 'process');
      await db.events.add({ ...e }); // durable, but not in THIS tab's memory
      const dup = { ...deploy('sp-1', 'inv-1'), id: e.id };
      const before = await invSnapshot();
      expect((await ops.commit(dup)).ok).toBe(false);
      expect(getSp('sp-1')!.status).toBe('pending');
      expect(held('inv-1')).toBe(0);
      expect(await invSnapshot()).toBe(before);
    });
  });

  describe('EquipmentDeployed — appended, stock derived', () => {
    it('appends with NO inventory write: the rows are byte-identical, held +1, view available 1', async () => {
      const before = await invSnapshot();
      expect((await ops.commit(deploy('sp-1', 'inv-1'))).ok).toBe(true);
      expect(await invSnapshot()).toBe(before);
      expect(held('inv-1')).toBe(1);
      expect(view('inv-1')).toMatchObject({ quantity: 2, held: 1, available: 1 });
      expect(getSp('sp-1')!.status).toBe('process');
      expect(deployedStrutOf(getSp('sp-1')!)?.inventoryId).toBe('inv-1');
    });

    it('rejects a phantom row (tracked inventoryId with no local row) — nothing logged', async () => {
      const res = await ops.commit(deploy('sp-1', 'inv-ghost'));
      expect(res).toMatchObject({ ok: false, reason: expect.stringContaining('not found') });
      expect(await db.events.count()).toBe(3);
      expect(getSp('sp-1')!.status).toBe('pending');
    });

    it('rejects when none are available', async () => {
      const res = await ops.commit(deploy('sp-1', 'inv-0'));
      expect(res).toMatchObject({ ok: false, reason: expect.stringContaining('none available') });
      expect(getSp('sp-1')!.status).toBe('pending');
    });

    it('rejects when the derived view is exhausted by earlier deploys', async () => {
      expect((await ops.commit(deploy('sp-1', 'inv-1'))).ok).toBe(true);
      expect((await ops.commit(deploy('sp-2', 'inv-1'))).ok).toBe(true);
      await ops.commit(spAdded(makeSp('sp-3')));
      expect((await ops.commit(deploy('sp-3', 'inv-1'))).ok).toBe(false); // 2 of 2 held
      expect(held('inv-1')).toBe(2);
    });

    it('rejects a deploy on a non-Pending shore point', async () => {
      await ops.commit(deploy('sp-1', 'inv-1'));
      const res = await ops.commit(deploy('sp-1', 'inv-1'));
      expect(res.ok).toBe(false);
      expect(held('inv-1')).toBe(1); // not double-held
    });

    it('rejects a same-row double claim beyond what the row has (one unit, two claims)', async () => {
      await db.inventory.add({ ...invItem('inv-one', 1), type: 'extension', model: undefined, length: 12 });
      await inventory.boot();
      const bom: DeployedComponent[] = [
        { role: 'strut', model: 'LS 203', system: 'LongShore', source: 'Rescue 2', inventoryId: 'inv-1' },
        { role: 'extension', length: 12, system: 'LongShore', source: 'Rescue 2', inventoryId: 'inv-one' },
        { role: 'extension', length: 12, system: 'LongShore', source: 'Rescue 2', inventoryId: 'inv-one' },
      ];
      const res = await ops.commit({ type: 'EquipmentDeployed', ...base(), spId: 'sp-1', deployedBom: bom });
      expect(res).toMatchObject({ ok: false, reason: expect.stringContaining('none available') });
      expect(held('inv-one')).toBe(0);
      expect(held('inv-1')).toBe(0);
    });
  });

  // The engine's safety verdict lives in the deploy UI ABOVE the seam. A LOCAL off-UI
  // commit is re-checked here. A PEER deploy is not refused (ADR-041 D4): it folds as
  // deployed and the red capacity flag shows at read time.
  describe('deploy safety verdict', () => {
    // 200″ LongShore is past the published 16-ft chart → engine flags `unrated`.
    const unratedBom = (inventoryId?: string): DeployedComponent[] => [
      { role: 'strut', model: 'LS 1016', system: 'LongShore', source: inventoryId ? 'Rescue 2' : 'untracked', ...(inventoryId ? { inventoryId } : {}) },
      { role: 'extension', length: 12, system: 'LongShore', source: 'untracked' },
    ];
    const deployEvt = (spId: string, bom: DeployedComponent[], extra = {}): FieldShoreEvent => ({
      type: 'EquipmentDeployed', ...base(), spId, deployedBom: bom, ...extra,
    });

    it('rejects an over-capacity local deploy outright — no event, point stays Pending', async () => {
      await ops.commit(spAdded(makeSp('sp-oc', { estimatedLoad: 1_000_000 })));
      const before = await db.events.count();
      const res = await ops.commit(deployEvt('sp-oc', [{ role: 'strut', model: 'LS 1016', source: 'untracked' }]));
      expect(res.ok).toBe(false);
      expect(res).toMatchObject({ reason: expect.stringContaining('capacity') });
      expect(await db.events.count()).toBe(before);
      expect(getSp('sp-oc')!.status).toBe('pending');
    });

    it('rejects an unrated-zone local deploy that lacks the team acknowledgment', async () => {
      await ops.commit(spAdded(makeSp('sp-ur', { measurementEighths: 1600 }))); // 200″
      const res = await ops.commit(deployEvt('sp-ur', unratedBom()));
      expect(res.ok).toBe(false);
      expect(res).toMatchObject({ reason: expect.stringContaining('acknowledgment') });
      expect(getSp('sp-ur')!.status).toBe('pending');
    });

    it('allows the SAME unrated deploy once the acknowledgment is recorded', async () => {
      await ops.commit(spAdded(makeSp('sp-ur', { measurementEighths: 1600 })));
      const res = await ops.commit(deployEvt('sp-ur', unratedBom(), { unratedAcknowledged: true }));
      expect(res.ok).toBe(true);
      expect(getSp('sp-ur')!.status).toBe('process');
    });

    it('a PEER unacknowledged deploy on a point present at its canonical position APPLIES (D4): held +1, flag at read time', async () => {
      await ops.commit(spAdded(makeSp('sp-ur', { measurementEighths: 1600 })));
      await ack();
      const e = peer(deployEvt('sp-ur', unratedBom('inv-1')), 1000);
      const res = await ops.ingestRemote([e]);
      expect(res.inserted.map((x) => x.id)).toEqual([e.id]);
      expect(res.outcomes.get(e.id)).toBe('applied');
      expect(getSp('sp-ur')!.status).toBe('process');
      expect(held('inv-1')).toBe(1);
      expect(deployedCapacityFlag(getSp('sp-ur')!)).toBe('unrated'); // the read-time tell
    });

    it('a PEER deploy received BEFORE its point exists folds as no-effect — held unchanged', async () => {
      await ops.commit(spAdded(makeSp('sp-ur', { measurementEighths: 1600 })));
      await ack(); // sp-ur received at 103
      const e = peer(deployEvt('sp-ur', unratedBom('inv-1')), 50); // canonically before the add
      const res = await ops.ingestRemote([e]);
      expect(res.outcomes.get(e.id)).toBe('no-effect');
      expect(getSp('sp-ur')!.status).toBe('pending');
      expect(held('inv-1')).toBe(0);
      expect(await db.events.where('id').equals(e.id).count()).toBe(1); // still appended
    });

    it('leaves a clean in-range deploy untouched', async () => {
      expect((await ops.commit(deploy('sp-1', 'inv-1'))).ok).toBe(true);
      expect(getSp('sp-1')!.status).toBe('process');
    });

    // Per-strut over-capacity (the 2026-07-01 family): 58.5″ + 34,000 lbs on ONE LS 406.
    const ls406Bom = (): DeployedComponent[] => [
      { role: 'strut', model: 'LS 406', system: 'LongShore', source: 'untracked' },
    ];

    it('rejects a single-strut deploy whose load share exceeds the rating (no ack)', async () => {
      await ops.commit(spAdded(makeSp('sp-short', { measurementEighths: 468, estimatedLoad: 34000 })));
      const res = await ops.commit(deployEvt('sp-short', ls406Bom()));
      expect(res.ok).toBe(false);
      expect(res).toMatchObject({ reason: expect.stringContaining('acknowledgment') });
      expect(getSp('sp-short')!.status).toBe('pending');
    });

    it('allows the SAME short deploy once the over-capacity acknowledgment is recorded', async () => {
      await ops.commit(spAdded(makeSp('sp-short', { measurementEighths: 468, estimatedLoad: 34000 })));
      const res = await ops.commit(deployEvt('sp-short', ls406Bom(), { overCapacityAcknowledged: true }));
      expect(res.ok).toBe(true);
      expect(getSp('sp-short')!.status).toBe('process');
    });

    it('rejects a geometrically-impossible deploy — no strut spans the opening (audit #1)', async () => {
      await ops.commit(spAdded(makeSp('sp-nofit', { measurementEighths: 24000 })));
      const res = await ops.commit(deployEvt('sp-nofit', ls406Bom()));
      expect(res.ok).toBe(false);
      expect(res).toMatchObject({ reason: expect.stringContaining('no strut fits') });
      expect(getSp('sp-nofit')!.status).toBe('pending');
    });

    it('needs NO ack once the load is shared across a linked group (Double-T member)', async () => {
      await ops.commit(
        spAdded(makeSp('sp-dt1', { measurementEighths: 468, estimatedLoad: 34000, groupId: 'g1', groupIndex: 1, groupTotal: 2 })),
      );
      const res = await ops.commit(deployEvt('sp-dt1', ls406Bom()));
      expect(res.ok).toBe(true);
      expect(getSp('sp-dt1')!.status).toBe('process');
    });
  });

  // ADR-033 — a deployed shore is a SOURCED bill of materials: each tracked component is
  // held against its OWN rig. ADR-041: no stock row is written; held derives from the BOM.
  describe('ADR-033 BOM deploy/return (derived stock)', () => {
    const bom3 = () => [
      { role: 'strut' as const, model: 'LS 203', system: 'LongShore' as const, source: 'Rescue 2', inventoryId: 'inv-1' },
      { role: 'top-plate' as const, plateId: 'plate-x', source: 'Engine 4', inventoryId: 'inv-plate' },
      { role: 'extension' as const, length: 12, system: 'LongShore' as const, source: 'Ladder 1', inventoryId: 'inv-ext' },
    ];
    const deployBom = (spId: string, bom: DeployedComponent[]): FieldShoreEvent => ({
      type: 'EquipmentDeployed', ...base(), spId, deployedBom: bom,
    });

    beforeEach(async () => {
      await db.inventory.bulkAdd([
        { id: 'inv-plate', type: 'plate', plateId: 'plate-x', apparatus: 'Engine 4', apparatusId: 'app-e4', quantity: 1 },
        { id: 'inv-ext', type: 'extension', length: 12, system: 'LongShore', apparatus: 'Ladder 1', apparatusId: 'app-l1', quantity: 1 },
      ]);
      await inventory.boot();
    });

    it('holds one unit on EACH of the three rigs and writes no stock row', async () => {
      const before = await invSnapshot();
      expect((await ops.commit(deployBom('sp-1', bom3()))).ok).toBe(true);
      expect(await invSnapshot()).toBe(before);
      expect(view('inv-1').available).toBe(1);
      expect(view('inv-plate').available).toBe(0);
      expect(view('inv-ext').available).toBe(0);
      expect(getSp('sp-1')!.deployedBom).toHaveLength(3);
      expect(getSp('sp-1')!.status).toBe('process');
    });

    it('is all-or-nothing: one dry component rejects the whole deploy — no event, nothing held', async () => {
      const bom = bom3();
      bom[2]!.inventoryId = 'inv-0'; // quantity 0
      const events = await db.events.count();
      expect((await ops.commit(deployBom('sp-1', bom))).ok).toBe(false);
      expect(await db.events.count()).toBe(events);
      expect(ops.held()).toEqual({});
      expect(getSp('sp-1')!.deployedBom).toBeUndefined();
    });

    it('rejects a component pointing at a missing row — no event, nothing held, no row created', async () => {
      const bom = bom3();
      bom[1]!.inventoryId = 'inv-ghost';
      const events = await db.events.count();
      expect((await ops.commit(deployBom('sp-1', bom))).ok).toBe(false);
      expect(await db.events.count()).toBe(events);
      expect(await db.inventory.get('inv-ghost')).toBeUndefined();
      expect(ops.held()).toEqual({});
    });

    it('records an untracked component on the point but holds zero stock for it', async () => {
      const bom = [
        { role: 'strut' as const, model: 'LS 203', system: 'LongShore' as const, source: 'Rescue 2', inventoryId: 'inv-1' },
        { role: 'bottom-plate' as const, plateId: 'plate-y', source: 'untracked' },
      ];
      expect((await ops.commit(deployBom('sp-1', bom))).ok).toBe(true);
      expect(getSp('sp-1')!.deployedBom).toHaveLength(2);
      expect(ops.held()).toEqual({ 'inv-1': 1 });
    });

    it('EquipmentReturned releases every tracked component and clears the BOM', async () => {
      await ops.commit(deployBom('sp-1', bom3()));
      expect((await ops.commit(returned('sp-1'))).ok).toBe(true);
      expect(ops.held()).toEqual({});
      expect(view('inv-1').available).toBe(2);
      expect(getSp('sp-1')!.status).toBe('pending');
      expect(getSp('sp-1')!.deployedBom).toBeUndefined();
    });

    it('EquipmentReclaimed (from secured) releases every tracked component but KEEPS the BOM', async () => {
      await ops.commit(deployBom('sp-1', bom3()));
      await walkToSecured('sp-1');
      const before = getSp('sp-1')!.deployedBom;
      expect((await ops.commit(reclaimed('sp-1'))).ok).toBe(true);
      expect(ops.held()).toEqual({});
      expect(getSp('sp-1')!.status).toBe('returned');
      expect(getSp('sp-1')!.deployedBom).toEqual(before);
    });

    it('ComponentResourced re-points one tracked component: old rig released, new rig held', async () => {
      await ops.commit(deployBom('sp-1', bom3()));
      await db.inventory.add({ id: 'inv-spare', type: 'strut', model: 'LS 203', system: 'LongShore', apparatus: 'Squad 9', apparatusId: 'app-s9', quantity: 1 });
      await inventory.boot();
      const res = await ops.commit({
        type: 'ComponentResourced', ...base(), spId: 'sp-1', componentIndex: 0, source: 'Squad 9', inventoryId: 'inv-spare',
      });
      expect(res.ok).toBe(true);
      expect(held('inv-1')).toBe(0);
      expect(held('inv-spare')).toBe(1);
      expect(deployedStrutOf(getSp('sp-1')!)?.inventoryId).toBe('inv-spare');
    });

    it('ComponentResourced is net-zero when the source is unchanged', async () => {
      await ops.commit(deployBom('sp-1', bom3()));
      const res = await ops.commit({
        type: 'ComponentResourced', ...base(), spId: 'sp-1', componentIndex: 0, source: 'Rescue 2', inventoryId: 'inv-1',
      });
      expect(res.ok).toBe(true);
      expect(held('inv-1')).toBe(1);
    });
  });

  describe('commitMany — atomic grouped batch (#220)', () => {
    const group = () => {
      const groupId = newId();
      return [1, 2, 3].map((n) =>
        spAdded(makeSp(`sp-g${n}`, { shoreType: '3-post', groupId, groupIndex: n, groupTotal: 3 })),
      );
    };

    it('appends all events durably, projection ≡ state, and a reboot refolds', async () => {
      expect((await ops.commitMany(group())).ok).toBe(true);
      const rows = asEvents(await db.events.toArray());
      expect(rows).toHaveLength(6);
      expect(projectOperation(sortCanonical(rows))).toEqual(ops.store.getState());
      expect(ops.store.getState().shorePoints.map((s) => s.id)).toContain('sp-g2');

      const rebooted = createOperationStore({ db, inventory, enqueue: () => {} });
      await rebooted.boot();
      expect(rebooted.store.getState()).toEqual(ops.store.getState());
    });

    it('re-renders ONCE for the whole batch', async () => {
      let fires = 0;
      const unsub = ops.store.subscribe(() => {
        fires += 1;
      });
      await ops.commitMany(group());
      unsub();
      expect(fires).toBe(1);
    });

    it('rejects a batch reusing an id already in the log — zero rows persisted', async () => {
      const batch = group();
      batch[1]!.id = ops.sortedEvents()[0]!.id;
      expect((await ops.commitMany(batch)).ok).toBe(false);
      expect(await db.events.count()).toBe(3);
      expect(ops.store.getState().shorePoints.map((s) => s.id)).toEqual(['sp-1', 'sp-2']);
      expect(enqueued.filter((e) => e.type === 'ShorePointAdded')).toHaveLength(2);
    });

    it('is all-or-nothing in Dexie: an id another tab stored aborts the WHOLE transaction', async () => {
      const batch = group();
      await db.events.add({ ...batch[2]! }); // durable, not in this tab's memory
      expect((await ops.commitMany(batch)).ok).toBe(false);
      expect(await db.events.count()).toBe(4); // the other tab's row only — no batch member landed
      expect(ops.store.getState().shorePoints.map((s) => s.id)).toEqual(['sp-1', 'sp-2']);
    });

    it('rejects the batch before any write when one member is schema-invalid', async () => {
      const batch = [...group(), { type: 'Nope' } as unknown as FieldShoreEvent];
      expect((await ops.commitMany(batch)).ok).toBe(false);
      expect(await db.events.count()).toBe(3);
    });

    it('rejects inventory-consequential events — those commit one at a time', async () => {
      expect((await ops.commitMany([deploy('sp-1', 'inv-1')])).ok).toBe(false);
      expect(held('inv-1')).toBe(0);
    });

    it('rejects an empty batch', async () => {
      expect((await ops.commitMany([])).ok).toBe(false);
    });

    it('enqueues every member in order with strictly increasing `at` and ONE shared batchId', async () => {
      const batch = group();
      await ops.commitMany(batch);
      const tail = enqueued.slice(-3);
      expect(tail.map((e) => e.id)).toEqual(batch.map((e) => e.id));
      expect(tail[0]!.at).toBeLessThan(tail[1]!.at);
      expect(tail[1]!.at).toBeLessThan(tail[2]!.at);
      expect(tail[0]!.batchId).toBeTruthy();
      expect(new Set(tail.map((e) => e.batchId)).size).toBe(1);
    });

    it('Zod rejects DivisionAdded with division 0', async () => {
      const res = await ops.commitMany([{ type: 'DivisionAdded', ...base(), division: 0 } as FieldShoreEvent]);
      expect(res.ok).toBe(false);
    });

    it('a DivisionAdded batch member folds into the operation', async () => {
      expect((await ops.commitMany([{ type: 'DivisionAdded', ...base(), division: 2 }])).ok).toBe(true);
      expect(ops.store.getState().operation?.divisions).toEqual([1, 2]);
    });
  });

  describe('EquipmentReturned', () => {
    beforeEach(async () => {
      await ops.commit(deploy('sp-1', 'inv-1'));
    });

    it('releases the hold and clears the strut identity', async () => {
      expect((await ops.commit(returned('sp-1'))).ok).toBe(true);
      expect(held('inv-1')).toBe(0);
      expect(view('inv-1').available).toBe(2);
      expect(getSp('sp-1')!.status).toBe('pending');
      expect(getSp('sp-1')!.deployedBom).toBeUndefined();
    });

    // Rewritten for ADR-041: the old "missing node aborts" pinned the stored-counter
    // transaction. A return writes no row now — the hold simply ends in the fold — so a
    // row deleted meanwhile cannot strand the return, and no phantom row is created.
    it('applies even when the stock row is gone, and creates no phantom row', async () => {
      await db.inventory.delete('inv-1');
      await inventory.boot();
      expect((await ops.commit(returned('sp-1'))).ok).toBe(true);
      expect(held('inv-1')).toBe(0);
      expect(await db.inventory.get('inv-1')).toBeUndefined();
    });

    it('rejects a return on a shore point with nothing deployed', async () => {
      await ops.commit(returned('sp-1'));
      expect((await ops.commit(returned('sp-1'))).ok).toBe(false);
      expect(held('inv-1')).toBe(0);
    });
  });

  describe('EquipmentReclaimed — terminal Remove & Return (#224)', () => {
    beforeEach(async () => {
      await ops.commit(deploy('sp-1', 'inv-1'));
      await walkToSecured('sp-1');
    });

    it('releases the hold, lands returned, and KEEPS the strut as history', async () => {
      const before = getSp('sp-1')!.deployedBom;
      expect((await ops.commit(reclaimed('sp-1'))).ok).toBe(true);
      expect(held('inv-1')).toBe(0);
      expect(getSp('sp-1')!.status).toBe('returned');
      expect(getSp('sp-1')!.deployedBom).toEqual(before);
    });

    it('in-memory state ≡ projection of the durable log after the terminal return', async () => {
      await ops.commit(reclaimed('sp-1'));
      expect(projectOperation(sortCanonical(asEvents(await db.events.toArray())))).toEqual(ops.store.getState());
    });

    it('rejects a terminal return on a non-Shore-Secured shore point', async () => {
      await ops.commit(reclaimed('sp-1'));
      expect((await ops.commit(reclaimed('sp-1'))).ok).toBe(false);
      expect(held('inv-1')).toBe(0);
    });

    it('commitMany rejects it — inventory-consequential, one at a time', async () => {
      expect((await ops.commitMany([reclaimed('sp-1')])).ok).toBe(false);
      expect(getSp('sp-1')!.status).toBe('secured');
    });
  });

  describe('end / re-open lifecycle (ADR-036) and held across ops (ADR-041 D5)', () => {
    const ended = (opId: string, stockReleased?: boolean): FieldShoreEvent => ({
      type: 'OperationEnded', id: newId(), opId, at: 1, by: 'device-test', ...(stockReleased ? { stockReleased } : {}),
    });
    const reopened = (opId: string): FieldShoreEvent => ({ type: 'OperationReopened', id: newId(), opId, at: 1, by: 'device-test' });

    it('ending the active op clears it, and in-memory state still equals the log projection', async () => {
      expect((await ops.commit(ended(OP))).ok).toBe(true);
      expect(ops.store.getState().operation).toBeNull();
      expect(projectOperation(sortCanonical(asEvents(await db.events.toArray())))).toEqual(ops.store.getState());
    });

    it('a fresh op after ending does NOT inherit the prior op’s shore points', async () => {
      await ops.commit(ended(OP));
      await ops.commit({ type: 'OperationCreated', id: newId(), opId: 'op-2', at: 1, by: 'device-test', name: 'Second', multiBuilding: false });
      expect(ops.store.getState().operation!.id).toBe('op-2');
      expect(ops.store.getState().shorePoints).toHaveLength(0);
    });

    it('re-open rebuilds the ended op with its points intact', async () => {
      await ops.commit(ended(OP));
      expect((await ops.commit(reopened(OP))).ok).toBe(true);
      expect(ops.store.getState().operation!.id).toBe(OP);
      expect(ops.store.getState().operation!.status).toBe('active');
      expect(ops.store.getState().shorePoints.map((s) => s.id).sort()).toEqual(['sp-1', 'sp-2']);
    });

    it('rejects re-open while an operation is already active (one active op at a time)', async () => {
      const res = await ops.commit(reopened(OP));
      expect(res).toMatchObject({ ok: false, reason: 'an operation is already active' });
    });

    it('an ended op keeps holding its equipment: deploy 1 of 2, end, new op → available 1', async () => {
      await ops.commit(deploy('sp-1', 'inv-1'));
      await ops.commit(ended(OP));
      await ops.commit({ type: 'OperationCreated', id: newId(), opId: 'op-2', at: 1, by: 'device-test', name: 'Second', multiBuilding: false });
      expect(view('inv-1')).toMatchObject({ held: 1, available: 1 });
    });

    it('End with stockReleased releases it (→ 2); re-open holds it again (→ 1)', async () => {
      await ops.commit(deploy('sp-1', 'inv-1'));
      await ops.commit(ended(OP, true));
      expect(view('inv-1')).toMatchObject({ held: 0, available: 2 });
      await ops.commit(reopened(OP));
      expect(view('inv-1')).toMatchObject({ held: 1, available: 1 });
    });
  });

  describe('ADR-033 hardening (review fixes)', () => {
    it('rejects legacy StrutDeployed / StrutReturned at commit (replay-only)', async () => {
      const legacy = {
        type: 'StrutDeployed', ...base(), spId: 'sp-1',
        deployedStrut: { model: 'LS 203', source: 'Rescue 2', inventoryId: 'inv-1' },
      } as unknown as FieldShoreEvent;
      expect((await ops.commit(legacy)).ok).toBe(false);
      expect(held('inv-1')).toBe(0);
      expect(getSp('sp-1')!.status).toBe('pending');
    });

    it('a BOM sourcing one row twice holds two units of it, and the return releases both', async () => {
      await db.inventory.add({
        id: 'inv-ext', type: 'extension', length: 12, system: 'LongShore', apparatus: 'Rescue 2', apparatusId: 'app-r2', quantity: 2,
      });
      await inventory.boot();
      const bom: DeployedComponent[] = [
        { role: 'strut', model: 'LS 203', system: 'LongShore', source: 'Rescue 2', inventoryId: 'inv-1' },
        { role: 'extension', length: 12, system: 'LongShore', source: 'Rescue 2', inventoryId: 'inv-ext' },
        { role: 'extension', length: 12, system: 'LongShore', source: 'Rescue 2', inventoryId: 'inv-ext' },
      ];
      expect((await ops.commit({ type: 'EquipmentDeployed', ...base(), spId: 'sp-1', deployedBom: bom })).ok).toBe(true);
      expect(view('inv-ext')).toMatchObject({ held: 2, available: 0 });
      expect((await ops.commit(returned('sp-1'))).ok).toBe(true);
      expect(view('inv-ext')).toMatchObject({ held: 0, available: 2 });
    });

    it('serializes concurrent deploys for one Pending point — exactly one event, one unit held', async () => {
      const before = await db.events.count();
      const [a, b] = await Promise.all([ops.commit(deploy('sp-1', 'inv-1')), ops.commit(deploy('sp-1', 'inv-1'))]);
      expect([a, b].filter((r) => r.ok)).toHaveLength(1);
      expect(held('inv-1')).toBe(1);
      expect(await db.events.count()).toBe(before + 1);
    });

    it('ComponentResourced re-points to another rig: old released, new held', async () => {
      await db.inventory.add({
        id: 'inv-2', type: 'strut', model: 'LS 203', system: 'LongShore', apparatus: 'Engine 4', apparatusId: 'app-e4', quantity: 1,
      });
      await inventory.boot();
      await ops.commit(deploy('sp-1', 'inv-1'));
      const e: FieldShoreEvent = {
        type: 'ComponentResourced', ...base(), spId: 'sp-1', componentIndex: 0, source: 'Engine 4', inventoryId: 'inv-2',
      };
      expect((await ops.commit(e)).ok).toBe(true);
      expect(held('inv-1')).toBe(0);
      expect(held('inv-2')).toBe(1);
      expect(deployedStrutOf(getSp('sp-1')!)!.source).toBe('Engine 4');
    });

    it('ComponentResourced rejects a KIND mismatch (strut slot → plate row) and moves nothing', async () => {
      await db.inventory.add({ id: 'inv-plate', type: 'plate', plateId: 'plate-x', apparatus: 'Engine 4', apparatusId: 'app-e4', quantity: 1 });
      await inventory.boot();
      await ops.commit(deploy('sp-1', 'inv-1'));
      const e: FieldShoreEvent = {
        type: 'ComponentResourced', ...base(), spId: 'sp-1', componentIndex: 0, source: 'Engine 4', inventoryId: 'inv-plate',
      };
      expect((await ops.commit(e)).ok).toBe(false);
      expect(ops.held()).toEqual({ 'inv-1': 1 });
    });

    it('ComponentResourced rejects a target row with none available, and a missing row', async () => {
      await ops.commit(deploy('sp-1', 'inv-1'));
      const to = (inventoryId: string): FieldShoreEvent => ({
        type: 'ComponentResourced', ...base(), spId: 'sp-1', componentIndex: 0, source: 'X', inventoryId,
      });
      expect(await ops.commit(to('inv-0'))).toMatchObject({ ok: false, reason: expect.stringContaining('none available') });
      expect(await ops.commit(to('inv-ghost'))).toMatchObject({ ok: false, reason: expect.stringContaining('not found') });
      expect(ops.held()).toEqual({ 'inv-1': 1 });
    });

    it('ComponentResourced is rejected on a returned shore point', async () => {
      await ops.commit(deploy('sp-1', 'inv-1'));
      await walkToSecured('sp-1');
      expect((await ops.commit(reclaimed('sp-1'))).ok).toBe(true);
      const e: FieldShoreEvent = {
        type: 'ComponentResourced', ...base(), spId: 'sp-1', componentIndex: 0, source: 'Engine 4', inventoryId: 'inv-1',
      };
      expect((await ops.commit(e)).ok).toBe(false);
    });
  });

  // 2026-07-02 audit #6 / ADR-041: deleting a point that still holds equipment would
  // strand it. Locally the store refuses with a clear reason; a PEER delete is appended
  // and the fold no-ops it (identically on every device).
  describe('ShorePointDeleted on a holder', () => {
    it('allows deleting a Pending point (no BOM, no stock consequence)', async () => {
      const before = await db.events.count();
      expect((await ops.commit(deleteEvt('sp-1'))).ok).toBe(true);
      expect(await db.events.count()).toBe(before + 1);
      expect(getSp('sp-1')!.deletedAt).toBeTruthy();
    });

    it('rejects a LOCAL delete of a DEPLOYED point — nothing logged, still held, still on the board', async () => {
      expect((await ops.commit(deploy('sp-1', 'inv-1'))).ok).toBe(true);
      const before = await db.events.count();
      const res = await ops.commit(deleteEvt('sp-1', true));
      expect(res).toMatchObject({ ok: false, reason: expect.stringContaining('deployed equipment') });
      expect(await db.events.count()).toBe(before);
      expect(held('inv-1')).toBe(1);
      expect(getSp('sp-1')!.status).toBe('process');
    });

    it('a PEER delete of a holder is appended, folds no-effect, and held is unchanged', async () => {
      await ops.commit(deploy('sp-1', 'inv-1'));
      await ack();
      const del = peer(deleteEvt('sp-1', true), 1000);
      const res = await ops.ingestRemote([del]);
      expect(res.inserted).toHaveLength(1);
      expect(res.outcomes.get(del.id)).toBe('no-effect');
      expect(await db.events.where('id').equals(del.id).count()).toBe(1);
      expect(held('inv-1')).toBe(1);
      expect(getSp('sp-1')).toBeDefined();
      expect(getSp('sp-1')!.deletedAt).toBeFalsy();
    });

    it('allows deleting a RETURNED point — nothing is held by it', async () => {
      await ops.commit(deploy('sp-1', 'inv-1'));
      await walkToSecured('sp-1');
      expect((await ops.commit(reclaimed('sp-1'))).ok).toBe(true);
      expect((await ops.commit(deleteEvt('sp-1', true))).ok).toBe(true);
      expect(held('inv-1')).toBe(0);
    });

    // #421 — the grouped-delete path (DeleteShorePointModal batches ALL live members).
    describe('grouped delete', () => {
      it('a LOCAL batch with a deployed member is rejected WHOLE — zero events, still held', async () => {
        await ops.commit(deploy('sp-1', 'inv-1'));
        const before = await db.events.count();
        const res = await ops.commitMany([deleteEvt('sp-1'), deleteEvt('sp-2')]);
        expect(res).toMatchObject({ ok: false, reason: expect.stringContaining('deployed equipment') });
        expect(await db.events.count()).toBe(before);
        expect(held('inv-1')).toBe(1);
        expect(getSp('sp-1')!.deletedAt).toBeFalsy();
        expect(getSp('sp-2')!.deletedAt).toBeFalsy();
      });

      it('PEER deletes WITHOUT a batchId: the holder no-ops, the pending mate applies', async () => {
        await ops.commit(deploy('sp-1', 'inv-1'));
        await ack();
        const d1 = peer(deleteEvt('sp-1'), 1000);
        const d2 = peer(deleteEvt('sp-2'), 1001);
        const res = await ops.ingestRemote([d1, d2]);
        expect(res.outcomes.get(d1.id)).toBe('no-effect');
        expect(res.outcomes.get(d2.id)).toBe('applied');
        expect(getSp('sp-1')!.deletedAt).toBeFalsy();
        expect(getSp('sp-2')!.deletedAt).toBeTruthy();
        expect(held('inv-1')).toBe(1);
      });

      it('a PEER grouped delete WITH a shared batchId is all-or-nothing: both no-effect', async () => {
        await ops.commit(deploy('sp-1', 'inv-1'));
        await ack();
        const batchId = newId();
        const d1 = { ...peer(deleteEvt('sp-1'), 1000), batchId };
        const d2 = { ...peer(deleteEvt('sp-2'), 1000), batchId };
        const res = await ops.ingestRemote([d1, d2]);
        expect(res.outcomes.get(d1.id)).toBe('no-effect');
        expect(res.outcomes.get(d2.id)).toBe('no-effect');
        expect(getSp('sp-1')!.deletedAt).toBeFalsy();
        expect(getSp('sp-2')!.deletedAt).toBeFalsy();
        expect(held('inv-1')).toBe(1);
      });

      it('an all-pending grouped delete still commits every member', async () => {
        const before = await db.events.count();
        expect((await ops.commitMany([deleteEvt('sp-1'), deleteEvt('sp-2')])).ok).toBe(true);
        expect(await db.events.count()).toBe(before + 2);
        expect(getSp('sp-1')!.deletedAt).toBeTruthy();
        expect(getSp('sp-2')!.deletedAt).toBeTruthy();
      });

      it('allows a grouped delete once the deployed member is returned', async () => {
        await ops.commit(deploy('sp-1', 'inv-1'));
        await walkToSecured('sp-1');
        expect((await ops.commit(reclaimed('sp-1'))).ok).toBe(true);
        expect((await ops.commitMany([deleteEvt('sp-1'), deleteEvt('sp-2')])).ok).toBe(true);
        expect(held('inv-1')).toBe(0);
      });
    });
  });

  describe('ingestRemote / markReceived (ADR-041)', () => {
    it('appends a valid peer event unconditionally, never enqueues it, and dedupes a re-delivery', async () => {
      await ack();
      const before = enqueued.length;
      const e = peer(statusChanged('sp-1', 'pending', 'process'), 1000); // a premise that doesn't hold here
      const first = await ops.ingestRemote([e]);
      expect(first.inserted).toHaveLength(1);
      expect(first.outcomes.get(e.id)).toBe('no-effect');
      expect(enqueued).toHaveLength(before);
      const again = await ops.ingestRemote([e]);
      expect(again.inserted).toHaveLength(0);
      expect(await db.events.where('id').equals(e.id).count()).toBe(1);
    });

    it('drops invalid events with one warning, and normalizes a legacy missing receivedAt to `at` (persisted)', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const legacy = { ...statusChanged('sp-1', 'pending', 'process'), by: 'device-peer', at: 4242 };
      const res = await ops.ingestRemote([{ type: 'Nope' }, { junk: true }, legacy]);
      expect(warn).toHaveBeenCalledTimes(1);
      warn.mockRestore();
      expect(res.inserted).toHaveLength(1);
      expect(res.inserted[0]!.receivedAt).toBe(4242);
      expect((await db.events.where('id').equals(legacy.id).first())!.receivedAt).toBe(4242);
    });

    it('a remote deploy for an inventoryId with no local row is appended and held carries the id', async () => {
      await ack();
      const e = peer(deploy('sp-1', 'inv-elsewhere'), 1000);
      const res = await ops.ingestRemote([e]);
      expect(res.outcomes.get(e.id)).toBe('applied');
      expect(held('inv-elsewhere')).toBe(1);
      expect(inventory.heldOf('inv-elsewhere')).toBe(1);
      expect(inventory.store.getState().items.some((i) => i.id === 'inv-elsewhere')).toBe(false); // no phantom row
    });

    it('two tabs: an event already in Dexie but not in memory is folded (ConstraintError ignored) and stamped', async () => {
      await ack();
      const fromOtherTab = peer(statusChanged('sp-2', 'pending', 'pending'), 2000);
      const stored = { ...fromOtherTab };
      delete stored.receivedAt; // the other tab stored it before the receipt stamp landed
      await db.events.add(stored);
      const fresh = peer(deploy('sp-1', 'inv-1'), 2001);
      const res = await ops.ingestRemote([fromOtherTab, fresh]);
      expect(res.inserted.map((e) => e.id).sort()).toEqual([fromOtherTab.id, fresh.id].sort());
      expect(ops.sortedEvents().some((e) => e.id === fromOtherTab.id)).toBe(true);
      expect(await db.events.where('id').equals(fromOtherTab.id).count()).toBe(1);
      expect((await db.events.where('id').equals(fromOtherTab.id).first())!.receivedAt).toBe(2000);
      expect(await db.events.where('id').equals(fresh.id).count()).toBe(1); // the rest still landed
      expect(held('inv-1')).toBe(1);
    });

    it('markReceived moves a provisional event ahead of a folded received event and flips both outcomes', async () => {
      const store2 = createOperationStore({ db, inventory, deviceUid: () => 'device-test' });
      // Re-use this db: rebuild a store that knows the setup, then act as this device.
      await store2.boot();
      for (const e of store2.sortedEvents()) await store2.markReceived(e.id, stamp++);
      expect((await store2.commit(deploy('sp-1', 'inv-1'))).ok).toBe(true);
      for (const e of store2.sortedEvents()) if (e.receivedAt === undefined) await store2.markReceived(e.id, stamp++);
      // This device, offline: Strut Set (provisional). A peer returns the strut (received 300).
      const mine = statusChanged('sp-1', 'process', 'strutset');
      expect((await store2.commit(mine)).ok).toBe(true);
      const ret = peer(returned('sp-1'), 300);
      await store2.ingestRemote([ret]);
      expect(store2.outcomes().get(mine.id)).toBe('no-effect');
      expect(store2.overridden.getState().events.map((e) => e.id)).toEqual([mine.id]);
      // The upload is acknowledged with a receipt EARLIER than the peer's return.
      const refolded = await store2.markReceived(mine.id, 250);
      expect(refolded).toBe(true);
      expect(store2.outcomes().get(mine.id)).toBe('applied');
      expect(store2.outcomes().get(ret.id)).toBe('no-effect');
      expect(store2.store.getState().shorePoints.find((s) => s.id === 'sp-1')!.status).toBe('strutset');
      expect(store2.held()).toEqual({ 'inv-1': 1 });
      expect(store2.overridden.getState().events).toEqual([]); // no longer a lost change
      expect((await db.events.where('id').equals(mine.id).first())!.receivedAt).toBe(250);
    });

    it('boot: the clock observes only THIS device\'s events, never a peer\'s', async () => {
      const db2 = createDB(`test-ops-boot-clock-${newId()}`);
      await db2.events.bulkAdd([
        { ...opCreated(), by: 'me', at: 5000, receivedAt: 5000 },
        { ...spAdded(makeSp('sp-1')), by: 'peer', at: 9000, receivedAt: 9000 },
      ]);
      const q: FieldShoreEvent[] = [];
      const o2 = createOperationStore({ db: db2, enqueue: (e) => q.push(e), clock: createMonotonicClock(() => 0), deviceUid: () => 'me' });
      await o2.boot();
      await o2.commit(spAdded(makeSp('sp-2')));
      expect(q[0]!.at).toBe(5001);
      await db2.delete();
    });
  });

  // TTX probe 4 (#499): A (offline) slides Alpha Equipment Assigned → Strut Set; B (online)
  // returns Alpha's strut. Every device must end with Alpha Pending, one unit less held, and
  // A's Strut Set as no-effect — whatever order the events arrive in.
  describe('probe-4 convergence', () => {
    const recv = (e: FieldShoreEvent, receivedAt: number, by: string): FieldShoreEvent => ({ ...e, by, receivedAt });
    const sharedBase = () => {
      const created = recv(opCreated(), 10, 'device-B');
      const added = recv(spAdded(makeSp('alpha')), 11, 'device-B');
      const deployed = recv(deploy('alpha', 'inv-1'), 12, 'device-B');
      return [created, added, deployed];
    };

    async function freshStore(deviceUid: string) {
      const d = createDB(`test-ops-probe4-${newId()}`);
      await d.inventory.add(invItem('inv-1', 2));
      const inv = createInventoryStore(d);
      await inv.boot();
      const o = createOperationStore({ db: d, inventory: inv, deviceUid: () => deviceUid });
      await o.boot();
      return { d, inv, o };
    }

    it('converges in both arrival orders on an observer device', async () => {
      const baseEvents = sharedBase();
      // A's Strut Set carries the EARLIER `at` (the offline actor) but reached the cloud later.
      const strutSet = recv({ ...statusChanged('alpha', 'process', 'strutset'), at: 5 }, 21, 'device-A');
      const ret = recv({ ...returned('alpha'), at: 9 }, 20, 'device-B');

      const x = await freshStore('device-C');
      await x.o.ingestRemote(baseEvents);
      await x.o.ingestRemote([strutSet]);
      await x.o.ingestRemote([ret]);

      const y = await freshStore('device-C');
      await y.o.ingestRemote(baseEvents);
      await y.o.ingestRemote([ret]);
      await y.o.ingestRemote([strutSet]);

      for (const s of [x, y]) {
        expect(s.o.store.getState().shorePoints.find((p) => p.id === 'alpha')!.status).toBe('pending');
        expect(s.o.held()).toEqual({});
        expect(s.inv.store.getState().items.find((i) => i.id === 'inv-1')!.available).toBe(2);
        expect(s.o.outcomes().get(strutSet.id)).toBe('no-effect');
        expect(s.o.outcomes().get(ret.id)).toBe('applied');
        expect(s.o.overridden.getState().events).toEqual([]); // not this device's change
      }
      expect(x.o.store.getState()).toEqual(y.o.store.getState());
      expect(x.o.outcomes()).toEqual(y.o.outcomes());
      await x.d.delete();
      await y.d.delete();
    });

    it('on the device that lost: its own Strut Set lands in `overridden`; Got it clears it', async () => {
      const a = await freshStore('device-A');
      await a.o.ingestRemote(sharedBase());
      expect(a.o.held()).toEqual({ 'inv-1': 1 });
      const mine = statusChanged('alpha', 'process', 'strutset');
      mine.by = 'device-A';
      expect((await a.o.commit(mine)).ok).toBe(true); // offline: provisional, applied for now
      expect(a.o.store.getState().shorePoints.find((p) => p.id === 'alpha')!.status).toBe('strutset');

      await a.o.ingestRemote([recv(returned('alpha'), 20, 'device-B')]);
      expect(a.o.store.getState().shorePoints.find((p) => p.id === 'alpha')!.status).toBe('pending');
      expect(a.o.held()).toEqual({});
      expect(a.o.outcomes().get(mine.id)).toBe('no-effect');
      expect(a.o.overridden.getState().events.map((e) => e.id)).toEqual([mine.id]);

      await a.o.markReceived(mine.id, 21); // the ack confirms it reached the cloud second
      expect(a.o.overridden.getState().events.map((e) => e.id)).toEqual([mine.id]);
      a.o.acknowledgeOverridden();
      expect(a.o.overridden.getState().events).toEqual([]);
      await a.d.delete();
    });

    it('the overridden list survives a reload until acknowledged (persistent quiet state)', async () => {
      const a = await freshStore('device-A');
      await a.o.ingestRemote(sharedBase());
      const mine = statusChanged('alpha', 'process', 'strutset');
      mine.by = 'device-A';
      await a.o.commit(mine);
      await a.o.ingestRemote([recv(returned('alpha'), 20, 'device-B')]);
      expect(a.o.overridden.getState().events.map((e) => e.id)).toEqual([mine.id]);

      // "Reload": a fresh store over the same bucket, before Got it.
      const inv2 = createInventoryStore(a.d);
      await inv2.boot();
      const rebooted = createOperationStore({ db: a.d, inventory: inv2, deviceUid: () => 'device-A' });
      await rebooted.boot();
      expect(rebooted.overridden.getState().events.map((e) => e.id)).toEqual([mine.id]);

      rebooted.acknowledgeOverridden();
      const again = createOperationStore({ db: a.d, inventory: inv2, deviceUid: () => 'device-A' });
      await again.boot();
      expect(again.overridden.getState().events).toEqual([]);
      await a.d.delete();
    });

    it('trackOverridden: false keeps the list untouched', async () => {
      const a = await freshStore('device-A');
      await a.o.ingestRemote(sharedBase());
      const mine = statusChanged('alpha', 'process', 'strutset');
      mine.by = 'device-A';
      await a.o.commit(mine);
      await a.o.ingestRemote([recv(returned('alpha'), 20, 'device-B')], { trackOverridden: false });
      expect(a.o.outcomes().get(mine.id)).toBe('no-effect');
      expect(a.o.overridden.getState().events).toEqual([]);
      await a.d.delete();
    });
  });
});
