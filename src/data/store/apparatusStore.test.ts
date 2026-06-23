import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDB, type FieldShoreDB } from './db';
import { createApparatusStore, APPARATUS_ROSTER_KEY, type ApparatusStoreApi } from './apparatusStore';
import { createInventoryStore, type InventoryStoreApi } from './inventoryStore';
import type { InventoryItem } from '@core/schema';
import { newId } from '@core/id';

const stock = (over: Partial<InventoryItem> & Pick<InventoryItem, 'id' | 'apparatusId' | 'quantity' | 'available'>): InventoryItem => ({
  type: 'strut',
  model: 'LS 203',
  system: 'LongShore',
  apparatus: 'Engine 1',
  ...over,
});

describe('apparatus store (meta-JSON roster)', () => {
  let db: FieldShoreDB;
  let app: ApparatusStoreApi;
  let inv: InventoryStoreApi;

  beforeEach(() => {
    db = createDB(`test-app-${newId()}`);
    app = createApparatusStore(db);
    inv = createInventoryStore(db);
  });
  afterEach(async () => {
    await db.delete();
  });

  it('adds a rig and persists it across a hydrate round-trip', async () => {
    await app.boot();
    await app.addApparatus({ id: 'app-1', name: 'Engine 1', type: 'Engine' });
    const next = createApparatusStore(db);
    await next.boot();
    expect(next.store.getState().roster).toEqual([{ id: 'app-1', name: 'Engine 1', type: 'Engine' }]);
  });

  it('removeApparatus cascade-clears an empty rig (roster + its stock, one txn)', async () => {
    await app.boot();
    await app.addApparatus({ id: 'app-1', name: 'Engine 1', type: 'Engine' });
    await db.inventory.bulkAdd([stock({ id: 'i1', apparatusId: 'app-1', quantity: 2, available: 2 })]);
    await inv.boot();
    await app.removeApparatus('app-1', inv);
    expect(app.store.getState().roster).toEqual([]);
    expect(await db.inventory.get('i1')).toBeUndefined();
    expect(inv.store.getState().items).toEqual([]);
  });

  it('removeApparatus refuses (and rolls back) when a rig holds deployed stock', async () => {
    await app.boot();
    await app.addApparatus({ id: 'app-1', name: 'Engine 1', type: 'Engine' });
    await db.inventory.bulkAdd([stock({ id: 'i1', apparatusId: 'app-1', quantity: 2, available: 0 })]);
    await inv.boot();
    await expect(app.removeApparatus('app-1', inv)).rejects.toThrow();
    expect(app.store.getState().roster).toHaveLength(1);
    expect(await db.inventory.get('i1')).toBeDefined();
  });

  it('boot degrades to an empty roster on an unreadable/wrong-shape row (never throws)', async () => {
    for (const value of ['not json {', 'null', '42', '{"x":1}']) {
      await db.meta.put({ key: APPARATUS_ROSTER_KEY, value });
      await expect(app.boot()).resolves.toBeUndefined();
      expect(app.store.getState().roster).toEqual([]);
    }
  });
});

// ---- cloud-sync Increment 3 (whole-blob LWW) -------------------------------
describe('apparatus store — LWW blob sync', () => {
  let db: FieldShoreDB;
  let blobs: { value: { id: string }[]; lastWriteAt: number }[];
  let app: ApparatusStoreApi;

  beforeEach(async () => {
    db = createDB(`test-app-lww-${newId()}`);
    blobs = [];
    app = createApparatusStore(db, { onBlob: (env) => blobs.push(env as never) });
    await app.boot();
  });
  afterEach(async () => {
    await db.delete();
  });

  it('addApparatus wraps the blob, fires the hook, and tracks localStamp', async () => {
    await app.addApparatus({ id: 'app-1', name: 'Engine 1', type: 'Engine' });
    const raw = JSON.parse((await db.meta.get(APPARATUS_ROSTER_KEY))!.value);
    expect(raw).toMatchObject({ value: [{ id: 'app-1' }], lastWriteAt: expect.any(Number) });
    expect(app.localStamp()).toBe(raw.lastWriteAt);
    expect(blobs.at(-1)!.value.map((a) => a.id)).toEqual(['app-1']);
  });

  it('pushRoster re-emits the current roster at the current stamp (for inline imports)', async () => {
    await app.addApparatus({ id: 'app-1', name: 'Engine 1', type: 'Engine' });
    blobs.length = 0;
    app.pushRoster();
    expect(blobs).toHaveLength(1);
    expect(blobs[0]!.lastWriteAt).toBe(app.localStamp());
  });

  it('applyRemote replaces the roster, preserves the remote stamp, no echo', async () => {
    await app.applyRemote([{ id: 'r1', name: 'Remote Rig', type: 'Rescue' }], 777);
    expect(app.store.getState().roster.map((a) => a.id)).toEqual(['r1']);
    expect(app.localStamp()).toBe(777);
    expect(blobs).toHaveLength(0);
  });

  it('removeApparatus pushes cloud tombstones for the cascade-deleted stock rows (no peer ghost)', async () => {
    const deletes: string[] = [];
    const inv = createInventoryStore(db, { onDelete: (id) => deletes.push(id) });
    await app.addApparatus({ id: 'app-1', name: 'Engine 1', type: 'Engine' });
    await db.inventory.bulkAdd([
      stock({ id: 'i1', apparatusId: 'app-1', quantity: 1, available: 1 }),
      stock({ id: 'i2', apparatusId: 'app-1', quantity: 2, available: 2 }),
    ]);
    await inv.boot();
    await app.removeApparatus('app-1', inv);
    expect(deletes.sort()).toEqual(['i1', 'i2']); // both cascaded rows tombstoned
  });
});
