import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDB, type FieldShoreDB } from './db';
import { createInventoryStore, type InventoryStoreApi } from './inventoryStore';
import { createOperationStore, type OperationStoreApi } from './operationStore';
import { projectOperation } from '@core/operation';
import { deployedStrutOf } from '@core/shorepoint';
import { newId } from '@core/id';
import {
  NO_DEDUCTIONS,
  type DeployedComponent,
  type FieldShoreEvent,
  type InventoryItem,
  type ShorePoint,
  type ShorePointStatus,
} from '@core/schema';

// The data/store contract: commit = durable Dexie append (+ the L-8 inventory
// transaction) BEFORE the in-memory update (L-4); the log is the source of
// truth and projection over it always equals the incremental in-memory state.

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

const makeSp = (id: string, over: Partial<ShorePoint> = {}): ShorePoint => ({
  id, opId: OP, division: '1', shoreType: 't-shore',
  measurementEighths: 240, deductions: NO_DEDUCTIONS, status: 'pending', ...over,
});

const invItem = (id: string, available: number, quantity = 2): InventoryItem => ({
  id, type: 'strut', model: 'LS 203', system: 'LongShore',
  apparatus: 'Rescue 2', apparatusId: 'app-r2', quantity, available,
});

describe('operationStore.commit', () => {
  let db: FieldShoreDB;
  let inventory: InventoryStoreApi;
  let ops: OperationStoreApi;
  let enqueued: FieldShoreEvent[];

  const getSp = (id: string) => ops.store.getState().shorePoints.find((s) => s.id === id);

  beforeEach(async () => {
    db = createDB(`test-ops-${newId()}`);
    enqueued = [];
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

  it('in-memory state ≡ projection of the durable log, and a reboot refolds to it', async () => {
    expect((await ops.commit(deploy('sp-1', 'inv-1'))).ok).toBe(true);
    expect((await ops.commit(statusChanged('sp-1', 'process', 'strutset'))).ok).toBe(true);

    const rows = await db.events.toArray(); // primary-key (seq) order = append order
    expect(rows).toHaveLength(5);
    expect(projectOperation(rows)).toEqual(ops.store.getState());

    const rebooted = createOperationStore({ db, inventory, enqueue: () => {} });
    await rebooted.boot();
    expect(rebooted.store.getState()).toEqual(ops.store.getState());
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

  it('rejects a duplicate event id via the unique index', async () => {
    const e = statusChanged('sp-1', 'pending', 'process'); // content irrelevant — id is
    const dup = deploy('sp-1', 'inv-1');
    dup.id = e.id;
    await db.events.add({ ...e });
    const res = await ops.commit(dup as FieldShoreEvent);
    expect(res.ok).toBe(false);
    expect((await db.inventory.get('inv-1'))!.available).toBe(2); // txn rolled back
  });

  describe('EquipmentDeployed (L-8)', () => {
    it('decrements available durably and in memory', async () => {
      expect((await ops.commit(deploy('sp-1', 'inv-1'))).ok).toBe(true);
      expect((await db.inventory.get('inv-1'))!.available).toBe(1);
      expect(inventory.store.getState().items.find((i) => i.id === 'inv-1')!.available).toBe(1);
      expect(getSp('sp-1')!.status).toBe('process');
      expect(deployedStrutOf(getSp('sp-1')!)?.inventoryId).toBe('inv-1');
    });

    it('aborts on a missing inventory node — no event, no state change', async () => {
      const res = await ops.commit(deploy('sp-1', 'inv-ghost'));
      expect(res.ok).toBe(false);
      expect(await db.events.count()).toBe(3);
      expect(getSp('sp-1')!.status).toBe('pending');
    });

    it('aborts when none are available', async () => {
      const res = await ops.commit(deploy('sp-1', 'inv-0'));
      expect(res.ok).toBe(false);
      expect((await db.inventory.get('inv-0'))!.available).toBe(0);
      expect(getSp('sp-1')!.status).toBe('pending');
    });

    it('rejects a deploy on a non-Pending shore point', async () => {
      await ops.commit(deploy('sp-1', 'inv-1'));
      const res = await ops.commit(deploy('sp-1', 'inv-1'));
      expect(res.ok).toBe(false);
      expect((await db.inventory.get('inv-1'))!.available).toBe(1); // not double-decremented
    });
  });

  // Defense-in-depth (lands with the Firebase sync session): the engine's safety
  // verdict (over-capacity / unrated zone) is gated only in the deploy UI, which
  // lives ABOVE the data/sync seam. The store re-derives it from the point's own
  // inputs so a peer/replayed/off-UI EquipmentDeployed the engine flagged can't
  // slip into the log.
  describe('deploy safety verdict', () => {
    // 200″ LongShore is past the published 16-ft chart → engine flags `unrated`.
    // Untracked pieces (no inventoryId) carry no stock consequence, so no seeding.
    const unratedBom = (): DeployedComponent[] => [
      { role: 'strut', model: 'LS 1016', system: 'LongShore', source: 'untracked' },
      { role: 'extension', length: 12, system: 'LongShore', source: 'untracked' },
    ];
    const deployEvt = (spId: string, bom: DeployedComponent[], extra = {}): FieldShoreEvent => ({
      type: 'EquipmentDeployed', ...base(), spId, deployedBom: bom, ...extra,
    });

    it('rejects an over-capacity deploy outright — no event, point stays Pending', async () => {
      await ops.commit(spAdded(makeSp('sp-oc', { estimatedLoad: 1_000_000 })));
      const before = await db.events.count();
      const res = await ops.commit(deployEvt('sp-oc', [{ role: 'strut', model: 'LS 1016', source: 'untracked' }]));
      expect(res.ok).toBe(false);
      expect(res).toMatchObject({ reason: expect.stringContaining('capacity') });
      expect(await db.events.count()).toBe(before); // nothing logged
      expect(getSp('sp-oc')!.status).toBe('pending');
    });

    it('rejects an unrated-zone deploy that lacks the team acknowledgment', async () => {
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

    it('still guards a peer (fromRemote) deploy — the actual threat once sync lands', async () => {
      await ops.commit(spAdded(makeSp('sp-ur', { measurementEighths: 1600 })));
      const res = await ops.commit(deployEvt('sp-ur', unratedBom()), { fromRemote: true });
      expect(res.ok).toBe(false);
      expect(getSp('sp-ur')!.status).toBe('pending');
    });

    it('leaves a clean in-range deploy untouched', async () => {
      // sp-1 is 30″, no load → neither over-capacity nor unrated.
      expect((await ops.commit(deploy('sp-1', 'inv-1'))).ok).toBe(true);
      expect(getSp('sp-1')!.status).toBe('process');
    });

    // Per-strut over-capacity (the 2026-07-01 family): 58.5″ + 34,000 lbs on ONE
    // LS 406 (rated 22,000 lb at that length, 4:1). The engine returns the combo
    // unflagged (recommendedQty 2 is advisory) — the store must gate it itself.
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
      // 3000″ is beyond every strut's max extended reach → findForShorePoint returns
      // ZERO combos → deployVerdict.noFit. In-app the card shows "nothing fits", so
      // this only arrives off-UI; the store must reject, not all-clear on no flag.
      await ops.commit(spAdded(makeSp('sp-nofit', { measurementEighths: 24000 })));
      const res = await ops.commit(deployEvt('sp-nofit', ls406Bom()));
      expect(res.ok).toBe(false);
      expect(res).toMatchObject({ reason: expect.stringContaining('no strut fits') });
      expect(getSp('sp-nofit')!.status).toBe('pending');
    });

    it('needs NO ack once the load is shared across a linked group (Double-T member)', async () => {
      // Same 34,000 lbs, but groupTotal 2 → 17,000 per strut ≤ 22,000 rating.
      await ops.commit(
        spAdded(makeSp('sp-dt1', { measurementEighths: 468, estimatedLoad: 34000, groupId: 'g1', groupIndex: 1, groupTotal: 2 })),
      );
      const res = await ops.commit(deployEvt('sp-dt1', ls406Bom()));
      expect(res.ok).toBe(true);
      expect(getSp('sp-dt1')!.status).toBe('process');
    });
  });

  // ADR-033 — a deployed shore is a SOURCED bill of materials: strut + plates +
  // extensions, each consumed from (and restored to) its OWN rig inside the one
  // transaction that appends the event. These pin the safety-critical core: every
  // tracked component moves, the whole thing is atomic, untracked pieces never
  // touch stock, and a re-source re-points exactly one piece between two rigs.
  describe('ADR-033 BOM deploy/return (L-8)', () => {
    // A 3-component BOM whose strut, plate and extension live on THREE different
    // inventory rows (one row per rig). availables seeded in this block's beforeEach.
    const bom3 = () => [
      { role: 'strut' as const, model: 'LS 203', system: 'LongShore' as const, source: 'Rescue 2', inventoryId: 'inv-1' },
      { role: 'top-plate' as const, plateId: 'plate-x', source: 'Engine 4', inventoryId: 'inv-plate' },
      { role: 'extension' as const, length: 12, system: 'LongShore' as const, source: 'Ladder 1', inventoryId: 'inv-ext' },
    ];
    const deployBom = (spId: string, bom: DeployedComponent[]): FieldShoreEvent => ({
      type: 'EquipmentDeployed', ...base(), spId, deployedBom: bom,
    });

    beforeEach(async () => {
      // A plate row and an extension row, each on its own rig, both with one available.
      await db.inventory.bulkAdd([
        { id: 'inv-plate', type: 'plate', plateId: 'plate-x', apparatus: 'Engine 4', apparatusId: 'app-e4', quantity: 1, available: 1 },
        { id: 'inv-ext', type: 'extension', length: 12, system: 'LongShore', apparatus: 'Ladder 1', apparatusId: 'app-l1', quantity: 1, available: 1 },
      ]);
      await inventory.boot();
    });

    it('decrements available by 1 on EACH of the three rigs', async () => {
      expect((await ops.commit(deployBom('sp-1', bom3()))).ok).toBe(true);
      expect((await db.inventory.get('inv-1'))!.available).toBe(1); // strut: 2 → 1
      expect((await db.inventory.get('inv-plate'))!.available).toBe(0); // plate: 1 → 0
      expect((await db.inventory.get('inv-ext'))!.available).toBe(0); // extension: 1 → 0
      // mirror agrees with Dexie
      const items = inventory.store.getState().items;
      expect(items.find((i) => i.id === 'inv-1')!.available).toBe(1);
      expect(items.find((i) => i.id === 'inv-plate')!.available).toBe(0);
      expect(items.find((i) => i.id === 'inv-ext')!.available).toBe(0);
      expect(getSp('sp-1')!.deployedBom).toHaveLength(3);
      expect(getSp('sp-1')!.status).toBe('process');
    });

    it('is all-or-nothing: one dry component aborts the whole deploy — no event, no stock moved', async () => {
      // Point the extension at the dry strut row (inv-0, available 0). The strut and
      // plate decrements succeed first; the extension then aborts → full rollback.
      const bom = bom3();
      bom[2]!.inventoryId = 'inv-0';
      const events = await db.events.count();
      const res = await ops.commit(deployBom('sp-1', bom));
      expect(res.ok).toBe(false);
      expect(await db.events.count()).toBe(events); // no event appended
      expect((await db.inventory.get('inv-1'))!.available).toBe(2); // strut not moved
      expect((await db.inventory.get('inv-plate'))!.available).toBe(1); // plate not moved
      expect((await db.inventory.get('inv-0'))!.available).toBe(0); // still dry
      expect(getSp('sp-1')!.status).toBe('pending'); // not deployed
      expect(getSp('sp-1')!.deployedBom).toBeUndefined();
    });

    it('aborts when a component points at a missing inventory node — no event, no stock moved', async () => {
      const bom = bom3();
      bom[1]!.inventoryId = 'inv-ghost';
      const events = await db.events.count();
      const res = await ops.commit(deployBom('sp-1', bom));
      expect(res.ok).toBe(false);
      expect(await db.events.count()).toBe(events);
      expect((await db.inventory.get('inv-1'))!.available).toBe(2); // strut rolled back
      expect(await db.inventory.get('inv-ghost')).toBeUndefined(); // L-8: not created
      expect(getSp('sp-1')!.status).toBe('pending');
    });

    it('records an untracked component on the point but moves zero stock', async () => {
      const bom = [
        { role: 'strut' as const, model: 'LS 203', system: 'LongShore' as const, source: 'Rescue 2', inventoryId: 'inv-1' },
        { role: 'bottom-plate' as const, plateId: 'plate-y', source: 'untracked' }, // no inventoryId
      ];
      expect((await ops.commit(deployBom('sp-1', bom))).ok).toBe(true);
      expect((await db.inventory.get('inv-1'))!.available).toBe(1); // strut decremented
      // the untracked piece is recorded on the point...
      const deployed = getSp('sp-1')!.deployedBom!;
      expect(deployed).toHaveLength(2);
      expect(deployed[1]!.inventoryId).toBeUndefined();
      // ...but moved no stock — total available across all rows fell by exactly 1.
      const total = (await db.inventory.toArray()).reduce((n, i) => n + i.available, 0);
      expect(total).toBe(2 + 0 + 1 + 1 - 1); // inv-1 2→1, inv-0 0, inv-plate 1, inv-ext 1
    });

    it('EquipmentReturned restores every tracked component (+1 each, clamped) and clears the BOM', async () => {
      await ops.commit(deployBom('sp-1', bom3())); // 2/1/1 → 1/0/0
      expect((await ops.commit(returned('sp-1'))).ok).toBe(true);
      expect((await db.inventory.get('inv-1'))!.available).toBe(2); // restored, clamped at quantity 2
      expect((await db.inventory.get('inv-plate'))!.available).toBe(1);
      expect((await db.inventory.get('inv-ext'))!.available).toBe(1);
      expect(getSp('sp-1')!.status).toBe('pending');
      expect(getSp('sp-1')!.deployedBom).toBeUndefined(); // cleared
    });

    it('EquipmentReclaimed (from secured) restores every tracked component but KEEPS the BOM', async () => {
      await ops.commit(deployBom('sp-1', bom3())); // 2/1/1 → 1/0/0
      for (const [from, to] of [
        ['process', 'strutset'],
        ['strutset', 'cutting'],
        ['cutting', 'runner'],
        ['runner', 'secured'],
      ] as [ShorePointStatus, ShorePointStatus][]) {
        await ops.commit(statusChanged('sp-1', from, to));
      }
      const before = getSp('sp-1')!.deployedBom;
      expect((await ops.commit(reclaimed('sp-1'))).ok).toBe(true);
      expect((await db.inventory.get('inv-1'))!.available).toBe(2); // all three restored
      expect((await db.inventory.get('inv-plate'))!.available).toBe(1);
      expect((await db.inventory.get('inv-ext'))!.available).toBe(1);
      expect(getSp('sp-1')!.status).toBe('returned');
      expect(getSp('sp-1')!.deployedBom).toEqual(before); // retained as history
    });

    it('ComponentResourced re-points one tracked component: +1 old rig, −1 new rig, atomically', async () => {
      await ops.commit(deployBom('sp-1', bom3())); // strut on inv-1 (now 1), plate inv-plate 0, ext inv-ext 0
      // A spare strut row on a different rig with one available.
      await db.inventory.add({ id: 'inv-spare', type: 'strut', model: 'LS 203', system: 'LongShore', apparatus: 'Squad 9', apparatusId: 'app-s9', quantity: 1, available: 1 });
      await inventory.boot();
      const res = await ops.commit({
        type: 'ComponentResourced', ...base(), spId: 'sp-1', componentIndex: 0, source: 'Squad 9', inventoryId: 'inv-spare',
      });
      expect(res.ok).toBe(true);
      expect((await db.inventory.get('inv-1'))!.available).toBe(2); // old rig restored 1 → 2
      expect((await db.inventory.get('inv-spare'))!.available).toBe(0); // new rig consumed 1 → 0
      expect(deployedStrutOf(getSp('sp-1')!)?.inventoryId).toBe('inv-spare');
    });

    it('ComponentResourced is net-zero when the source is unchanged — no stock moves', async () => {
      await ops.commit(deployBom('sp-1', bom3())); // strut on inv-1, now available 1
      const res = await ops.commit({
        type: 'ComponentResourced', ...base(), spId: 'sp-1', componentIndex: 0, source: 'Rescue 2', inventoryId: 'inv-1',
      });
      expect(res.ok).toBe(true);
      expect((await db.inventory.get('inv-1'))!.available).toBe(1); // unchanged — no double move
    });
  });

  describe('commitMany — atomic grouped batch (#220)', () => {
    const group = () => {
      // One physical 3-Post shore = 3 linked points (KB-7 per-shore grouping).
      const groupId = newId();
      return [1, 2, 3].map((n) =>
        spAdded(makeSp(`sp-g${n}`, { shoreType: '3-post', groupId, groupIndex: n, groupTotal: 3 })),
      );
    };

    it('appends all events durably, projection ≡ state, and a reboot refolds', async () => {
      expect((await ops.commitMany(group())).ok).toBe(true);
      const rows = await db.events.toArray();
      expect(rows).toHaveLength(6); // 3 from beforeEach + 3 batch
      expect(projectOperation(rows)).toEqual(ops.store.getState());
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

    it('is all-or-nothing: a duplicate id anywhere rolls back the entire batch', async () => {
      const batch = group();
      const dup = await db.events.toArray();
      batch[1]!.id = dup[0]!.id; // collides with an already-logged event (&id unique)
      const res = await ops.commitMany(batch);
      expect(res.ok).toBe(false);
      expect(await db.events.count()).toBe(3); // ZERO batch rows persisted
      expect(ops.store.getState().shorePoints.map((s) => s.id)).toEqual(['sp-1', 'sp-2']);
      expect(enqueued.filter((e) => e.type === 'ShorePointAdded')).toHaveLength(2); // beforeEach only
    });

    it('rejects the batch before any write when one member is schema-invalid', async () => {
      const batch = [...group(), { type: 'Nope' } as unknown as FieldShoreEvent];
      const res = await ops.commitMany(batch);
      expect(res.ok).toBe(false);
      expect(await db.events.count()).toBe(3);
    });

    it('rejects inventory-consequential events — those commit one at a time', async () => {
      const res = await ops.commitMany([deploy('sp-1', 'inv-1')]);
      expect(res.ok).toBe(false);
      expect((await db.inventory.get('inv-1'))!.available).toBe(2);
    });

    it('rejects an empty batch', async () => {
      expect((await ops.commitMany([])).ok).toBe(false);
    });

    it('enqueues every batch member in order; fromRemote skips the enqueue', async () => {
      const batch = group();
      await ops.commitMany(batch);
      expect(enqueued.slice(-3).map((e) => e.id)).toEqual(batch.map((e) => e.id));

      const before = enqueued.length;
      const remote = [spAdded(makeSp('sp-remote'))];
      await ops.commitMany(remote, { fromRemote: true });
      expect(enqueued).toHaveLength(before);
    });

    it('Zod rejects DivisionAdded with division 0', async () => {
      const res = await ops.commitMany([
        { type: 'DivisionAdded', ...base(), division: 0 } as FieldShoreEvent,
      ]);
      expect(res.ok).toBe(false);
    });

    it('a DivisionAdded batch member folds into the operation', async () => {
      expect((await ops.commitMany([{ type: 'DivisionAdded', ...base(), division: 2 }])).ok).toBe(true);
      expect(ops.store.getState().operation?.divisions).toEqual([1, 2]);
    });
  });

  describe('EquipmentReturned (L-8)', () => {
    beforeEach(async () => {
      await ops.commit(deploy('sp-1', 'inv-1')); // available 2 → 1
    });

    it('restores stock and clears the strut identity', async () => {
      expect((await ops.commit(returned('sp-1'))).ok).toBe(true);
      expect((await db.inventory.get('inv-1'))!.available).toBe(2);
      expect(getSp('sp-1')!.status).toBe('pending');
      expect(getSp('sp-1')!.deployedBom).toBeUndefined();
    });

    it('clamps available to quantity — never over-increments', async () => {
      // Simulate drifted stock (e.g. a concurrent peer correction): already full.
      await db.inventory.put(invItem('inv-1', 2));
      await inventory.boot();
      expect((await ops.commit(returned('sp-1'))).ok).toBe(true);
      expect((await db.inventory.get('inv-1'))!.available).toBe(2); // min(2+1, quantity 2)
    });

    it('aborts on a missing inventory node — no phantom item, no event', async () => {
      await db.inventory.delete('inv-1');
      const before = await db.events.count();
      const res = await ops.commit(returned('sp-1'));
      expect(res.ok).toBe(false);
      expect(await db.events.count()).toBe(before);
      expect(await db.inventory.get('inv-1')).toBeUndefined(); // L-8: not recreated
      expect(getSp('sp-1')!.status).toBe('process'); // still deployed
    });

    it('rejects a return on a shore point with nothing deployed', async () => {
      await ops.commit(returned('sp-1'));
      const res = await ops.commit(returned('sp-1'));
      expect(res.ok).toBe(false);
      expect((await db.inventory.get('inv-1'))!.available).toBe(2); // clamped state intact
    });
  });

  describe('EquipmentReclaimed (L-8) — terminal Remove & Return (#224)', () => {
    // Deploy, then walk to Wood Shore Secured (the terminal return's precondition).
    beforeEach(async () => {
      await ops.commit(deploy('sp-1', 'inv-1')); // pending → process, available 2 → 1
      for (const [from, to] of [
        ['process', 'strutset'],
        ['strutset', 'cutting'],
        ['cutting', 'runner'],
        ['runner', 'secured'],
      ] as [ShorePointStatus, ShorePointStatus][]) {
        await ops.commit(statusChanged('sp-1', from, to));
      }
    });

    it('restores stock, lands returned, and KEEPS the strut as history', async () => {
      const before = getSp('sp-1')!.deployedBom;
      expect((await ops.commit(reclaimed('sp-1'))).ok).toBe(true);
      expect((await db.inventory.get('inv-1'))!.available).toBe(2); // restored
      expect(getSp('sp-1')!.status).toBe('returned');
      expect(getSp('sp-1')!.deployedBom).toEqual(before); // retained as history (NOT cleared)
    });

    it('in-memory state ≡ projection of the durable log after the terminal return', async () => {
      await ops.commit(reclaimed('sp-1'));
      const rows = await db.events.toArray();
      expect(projectOperation(rows)).toEqual(ops.store.getState());
    });

    it('clamps available to quantity — never over-increments', async () => {
      await db.inventory.put(invItem('inv-1', 2)); // drifted full (concurrent peer correction)
      await inventory.boot();
      expect((await ops.commit(reclaimed('sp-1'))).ok).toBe(true);
      expect((await db.inventory.get('inv-1'))!.available).toBe(2); // min(2+1, quantity 2)
    });

    it('aborts on a missing inventory node — no phantom item, no event, no state change', async () => {
      await db.inventory.delete('inv-1');
      const before = await db.events.count();
      const res = await ops.commit(reclaimed('sp-1'));
      expect(res.ok).toBe(false);
      expect(await db.events.count()).toBe(before);
      expect(await db.inventory.get('inv-1')).toBeUndefined(); // L-8: not recreated
      expect(getSp('sp-1')!.status).toBe('secured'); // unchanged
      expect(getSp('sp-1')!.deployedBom).toBeDefined();
    });

    it('rejects a terminal return on a non-Shore-Secured shore point', async () => {
      await ops.commit(reclaimed('sp-1')); // secured → returned
      const res = await ops.commit(reclaimed('sp-1')); // now returned, not secured
      expect(res.ok).toBe(false);
      expect((await db.inventory.get('inv-1'))!.available).toBe(2); // not re-incremented
    });

    it('commitMany rejects it — inventory-consequential, one at a time', async () => {
      const res = await ops.commitMany([reclaimed('sp-1')]);
      expect(res.ok).toBe(false);
      expect(getSp('sp-1')!.status).toBe('secured'); // unchanged
    });
  });

  describe('end / re-open lifecycle (ADR-036)', () => {
    const ended = (opId: string): FieldShoreEvent => ({ type: 'OperationEnded', id: newId(), opId, at: 1, by: 'device-test' });
    const reopened = (opId: string): FieldShoreEvent => ({ type: 'OperationReopened', id: newId(), opId, at: 1, by: 'device-test' });

    it('ending the active op clears it, and in-memory state still equals the log projection', async () => {
      expect((await ops.commit(ended(OP))).ok).toBe(true);
      expect(ops.store.getState().operation).toBeNull(); // active-op scoping → empty state
      expect(projectOperation(await db.events.toArray())).toEqual(ops.store.getState());
    });

    it('a fresh op after ending does NOT inherit the prior op’s shore points (the re-projection fix)', async () => {
      await ops.commit(ended(OP));
      const OP2 = 'op-2';
      await ops.commit({ type: 'OperationCreated', id: newId(), opId: OP2, at: 1, by: 'device-test', name: 'Second', multiBuilding: false });
      expect(ops.store.getState().operation!.id).toBe(OP2);
      expect(ops.store.getState().shorePoints).toHaveLength(0); // not sp-1, sp-2
    });

    it('re-open rebuilds the ended op with its points intact', async () => {
      await ops.commit(ended(OP));
      expect((await ops.commit(reopened(OP))).ok).toBe(true);
      expect(ops.store.getState().operation!.id).toBe(OP);
      expect(ops.store.getState().operation!.status).toBe('active');
      expect(ops.store.getState().shorePoints.map((s) => s.id).sort()).toEqual(['sp-1', 'sp-2']);
    });

    it('rejects re-open while an operation is already active (one active op at a time)', async () => {
      const res = await ops.commit(reopened(OP)); // OP is still active
      expect(res.ok).toBe(false);
      expect(res).toMatchObject({ reason: 'an operation is already active' });
    });
  });

  // Regression coverage for the ADR-033 adversarial-review fixes (HIGH #1/#5, MED #2,
  // decision-7 guards). Uses the base setup: inv-1 strut qty2/av2, sp-1/sp-2 Pending.
  describe('ADR-033 hardening (review fixes)', () => {
    const durable = async (id: string) => (await db.inventory.get(id))!.available;
    const mirror = (id: string) => inventory.store.getState().items.find((i) => i.id === id)!.available;

    it('rejects legacy StrutDeployed / StrutReturned at commit (replay-only)', async () => {
      const legacy = {
        type: 'StrutDeployed', ...base(), spId: 'sp-1',
        deployedStrut: { model: 'LS 203', source: 'Rescue 2', inventoryId: 'inv-1' },
      } as unknown as FieldShoreEvent;
      const res = await ops.commit(legacy);
      expect(res.ok).toBe(false);
      expect(await durable('inv-1')).toBe(2); // no decrement
      expect(getSp('sp-1')!.status).toBe('pending');
    });

    it('a BOM sourcing one row twice decrements durable + mirror to the final value, and restores both', async () => {
      await db.inventory.add({
        id: 'inv-ext', type: 'extension', length: 12, system: 'LongShore',
        apparatus: 'Rescue 2', apparatusId: 'app-r2', quantity: 2, available: 2,
      });
      await inventory.boot();
      const bom: DeployedComponent[] = [
        { role: 'strut', model: 'LS 203', system: 'LongShore', source: 'Rescue 2', inventoryId: 'inv-1' },
        { role: 'extension', length: 12, system: 'LongShore', source: 'Rescue 2', inventoryId: 'inv-ext' },
        { role: 'extension', length: 12, system: 'LongShore', source: 'Rescue 2', inventoryId: 'inv-ext' },
      ];
      const e: FieldShoreEvent = { type: 'EquipmentDeployed', ...base(), spId: 'sp-1', deployedBom: bom };
      expect((await ops.commit(e)).ok).toBe(true);
      expect(await durable('inv-ext')).toBe(0); // 2→1→0
      expect(mirror('inv-ext')).toBe(0); // mirror reflects the FINAL value, not an intermediate snapshot
      expect((await ops.commit(returned('sp-1'))).ok).toBe(true);
      expect(await durable('inv-ext')).toBe(2); // both units restored
      expect(mirror('inv-ext')).toBe(2);
    });

    it('serializes concurrent deploys for one Pending point — exactly one decrement + one event', async () => {
      const before = await db.events.count();
      const [a, b] = await Promise.all([ops.commit(deploy('sp-1', 'inv-1')), ops.commit(deploy('sp-1', 'inv-1'))]);
      expect([a, b].filter((r) => r.ok)).toHaveLength(1); // the second sees sp-1 already Equipment Assigned
      expect(await durable('inv-1')).toBe(1); // decremented exactly once
      expect(await db.events.count()).toBe(before + 1);
    });

    it('ComponentResourced re-points to another rig: restore old +1, consume new −1', async () => {
      await db.inventory.add({
        id: 'inv-2', type: 'strut', model: 'LS 203', system: 'LongShore',
        apparatus: 'Engine 4', apparatusId: 'app-e4', quantity: 1, available: 1,
      });
      await inventory.boot();
      await ops.commit(deploy('sp-1', 'inv-1')); // strut from inv-1 (2→1)
      const e: FieldShoreEvent = {
        type: 'ComponentResourced', ...base(), spId: 'sp-1', componentIndex: 0, source: 'Engine 4', inventoryId: 'inv-2',
      };
      expect((await ops.commit(e)).ok).toBe(true);
      expect(await durable('inv-1')).toBe(2); // restored
      expect(await durable('inv-2')).toBe(0); // consumed
      expect(deployedStrutOf(getSp('sp-1')!)!.inventoryId).toBe('inv-2');
      expect(deployedStrutOf(getSp('sp-1')!)!.source).toBe('Engine 4');
    });

    it('ComponentResourced rejects a KIND mismatch (strut slot → plate row) and moves no stock', async () => {
      await db.inventory.add({
        id: 'inv-plate', type: 'plate', plateId: 'plate-x',
        apparatus: 'Engine 4', apparatusId: 'app-e4', quantity: 1, available: 1,
      });
      await inventory.boot();
      await ops.commit(deploy('sp-1', 'inv-1'));
      const e: FieldShoreEvent = {
        type: 'ComponentResourced', ...base(), spId: 'sp-1', componentIndex: 0, source: 'Engine 4', inventoryId: 'inv-plate',
      };
      expect((await ops.commit(e)).ok).toBe(false);
      expect(await durable('inv-1')).toBe(1); // strut NOT restored
      expect(await durable('inv-plate')).toBe(1); // plate NOT consumed
    });

    it('ComponentResourced is rejected on a returned shore point', async () => {
      await ops.commit(deploy('sp-1', 'inv-1'));
      for (const [from, to] of [
        ['process', 'strutset'], ['strutset', 'cutting'], ['cutting', 'runner'], ['runner', 'secured'],
      ] as [ShorePointStatus, ShorePointStatus][]) {
        await ops.commit(statusChanged('sp-1', from, to));
      }
      expect((await ops.commit(reclaimed('sp-1'))).ok).toBe(true); // → returned, keeps BOM
      expect(getSp('sp-1')!.status).toBe('returned');
      const e: FieldShoreEvent = {
        type: 'ComponentResourced', ...base(), spId: 'sp-1', componentIndex: 0, source: 'Engine 4', inventoryId: 'inv-1',
      };
      expect((await ops.commit(e)).ok).toBe(false);
    });
  });

  // 2026-07-02 audit #6: ShorePointDeleted must not strand deployed stock. In-app
  // the delete affordance is Pending-only, so this guards the off-UI / peer / replay
  // path the store owns.
  describe('ShorePointDeleted stock guard', () => {
    const durable = async (id: string) => (await db.inventory.get(id))!.available;
    const deleteEvt = (spId: string, hard = false): FieldShoreEvent => ({
      type: 'ShorePointDeleted', ...base(), spId, ...(hard ? { hard: true } : {}),
    });

    it('allows deleting a Pending point (no BOM, no stock consequence)', async () => {
      const before = await db.events.count();
      expect((await ops.commit(deleteEvt('sp-1'))).ok).toBe(true);
      expect(await db.events.count()).toBe(before + 1); // logged
      expect(getSp('sp-1')!.deletedAt).toBeTruthy(); // soft-deleted
    });

    it('rejects deleting a DEPLOYED point — stock stays decremented, point stays on the board', async () => {
      expect((await ops.commit(deploy('sp-1', 'inv-1'))).ok).toBe(true);
      expect(await durable('inv-1')).toBe(1); // one unit held by sp-1
      const before = await db.events.count();
      const res = await ops.commit(deleteEvt('sp-1', true));
      expect(res.ok).toBe(false);
      expect(res).toMatchObject({ reason: expect.stringContaining('deployed equipment') });
      expect(await db.events.count()).toBe(before); // nothing logged
      expect(await durable('inv-1')).toBe(1); // NOT stranded, NOT restored
      expect(getSp('sp-1')!.status).toBe('process'); // still on the board
    });

    it('still rejects a peer (fromRemote) delete of a deployed point — the real threat', async () => {
      await ops.commit(deploy('sp-1', 'inv-1'));
      const res = await ops.commit(deleteEvt('sp-1', true), { fromRemote: true });
      expect(res.ok).toBe(false);
      expect(await durable('inv-1')).toBe(1);
    });

    it('allows deleting a RETURNED point — its stock is already restored, nothing to strand', async () => {
      await ops.commit(deploy('sp-1', 'inv-1'));
      for (const [from, to] of [
        ['process', 'strutset'], ['strutset', 'cutting'], ['cutting', 'runner'], ['runner', 'secured'],
      ] as [ShorePointStatus, ShorePointStatus][]) {
        await ops.commit(statusChanged('sp-1', from, to));
      }
      expect((await ops.commit(reclaimed('sp-1'))).ok).toBe(true); // → returned, stock back to 2
      expect(await durable('inv-1')).toBe(2);
      expect((await ops.commit(deleteEvt('sp-1', true))).ok).toBe(true); // no stranding → allowed
      expect(await durable('inv-1')).toBe(2); // unchanged
    });

    // #421 — the grouped-delete path. DeleteShorePointModal batches ALL live group
    // members with no status filter through commitMany, which had no guard: a
    // mixed pending/deployed group stranded the deployed members' stock.
    describe('via commitMany (grouped delete)', () => {
      it('rejects the WHOLE batch when any member is deployed — zero events, stock untouched', async () => {
        await ops.commit(deploy('sp-1', 'inv-1'));
        expect(await durable('inv-1')).toBe(1);
        const before = await db.events.count();
        const res = await ops.commitMany([deleteEvt('sp-1'), deleteEvt('sp-2')]);
        expect(res.ok).toBe(false);
        expect(res).toMatchObject({ reason: expect.stringContaining('deployed equipment') });
        expect(await db.events.count()).toBe(before); // all-or-nothing: nothing logged
        expect(await durable('inv-1')).toBe(1); // NOT stranded, NOT restored
        expect(getSp('sp-1')!.deletedAt).toBeFalsy();
        expect(getSp('sp-2')!.deletedAt).toBeFalsy(); // the pending mate survives too
      });

      it('still rejects a peer (fromRemote) grouped delete of a deployed member', async () => {
        await ops.commit(deploy('sp-1', 'inv-1'));
        const res = await ops.commitMany([deleteEvt('sp-1'), deleteEvt('sp-2')], { fromRemote: true });
        expect(res.ok).toBe(false);
        expect(await durable('inv-1')).toBe(1);
      });

      it('an all-pending grouped delete still commits every member', async () => {
        const before = await db.events.count();
        const res = await ops.commitMany([deleteEvt('sp-1'), deleteEvt('sp-2')]);
        expect(res.ok).toBe(true);
        expect(await db.events.count()).toBe(before + 2);
        expect(getSp('sp-1')!.deletedAt).toBeTruthy();
        expect(getSp('sp-2')!.deletedAt).toBeTruthy();
      });

      it('allows a grouped delete once the deployed member is returned', async () => {
        await ops.commit(deploy('sp-1', 'inv-1'));
        for (const [from, to] of [
          ['process', 'strutset'], ['strutset', 'cutting'], ['cutting', 'runner'], ['runner', 'secured'],
        ] as [ShorePointStatus, ShorePointStatus][]) {
          await ops.commit(statusChanged('sp-1', from, to));
        }
        expect((await ops.commit(reclaimed('sp-1'))).ok).toBe(true); // → returned
        expect((await ops.commitMany([deleteEvt('sp-1'), deleteEvt('sp-2')])).ok).toBe(true);
        expect(await durable('inv-1')).toBe(2); // restored stock unchanged
      });
    });
  });
});
