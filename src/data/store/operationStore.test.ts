import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDB, type FieldShoreDB } from './db';
import { createInventoryStore, type InventoryStoreApi } from './inventoryStore';
import { createOperationStore, type OperationStoreApi } from './operationStore';
import { projectOperation } from '@core/operation';
import { newId } from '@core/id';
import {
  NO_DEDUCTIONS,
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
  type: 'StrutDeployed', ...base(), spId, deployedStrut: { model: 'LS 203', source: 'Rescue 2', inventoryId },
});
const returned = (spId: string): FieldShoreEvent => ({ type: 'StrutReturned', ...base(), spId });

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
      'OperationCreated', 'ShorePointAdded', 'ShorePointAdded', 'StrutDeployed',
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

  describe('StrutDeployed (L-8)', () => {
    it('decrements available durably and in memory', async () => {
      expect((await ops.commit(deploy('sp-1', 'inv-1'))).ok).toBe(true);
      expect((await db.inventory.get('inv-1'))!.available).toBe(1);
      expect(inventory.store.getState().items.find((i) => i.id === 'inv-1')!.available).toBe(1);
      expect(getSp('sp-1')!.status).toBe('process');
      expect(getSp('sp-1')!.deployedStrut?.inventoryId).toBe('inv-1');
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

  describe('StrutReturned (L-8)', () => {
    beforeEach(async () => {
      await ops.commit(deploy('sp-1', 'inv-1')); // available 2 → 1
    });

    it('restores stock and clears the strut identity', async () => {
      expect((await ops.commit(returned('sp-1'))).ok).toBe(true);
      expect((await db.inventory.get('inv-1'))!.available).toBe(2);
      expect(getSp('sp-1')!.status).toBe('pending');
      expect(getSp('sp-1')!.deployedStrut).toBeUndefined();
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
});
