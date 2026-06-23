import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDB, type FieldShoreDB } from './db';
import { createInventoryStore, applyDeployTxn, applyReturnTxn, type InventoryStoreApi } from './inventoryStore';
import { createApparatusStore, type ApparatusStoreApi } from './apparatusStore';
import type { CloudRow } from '../sync/stateSync';
import type { InventoryItem } from '@core/schema';
import type { ParsedImportRow } from '../inventory/excel';
import { newId } from '@core/id';

const strut = (over: Partial<InventoryItem> & Pick<InventoryItem, 'id' | 'quantity' | 'available'>): InventoryItem => ({
  type: 'strut',
  model: 'LS 203',
  system: 'LongShore',
  apparatus: 'Rescue 2',
  apparatusId: 'app-rescue-2',
  ...over,
});

describe('inventory store (direct-Dexie stock mutators)', () => {
  let db: FieldShoreDB;
  let inv: InventoryStoreApi;
  let app: ApparatusStoreApi;

  beforeEach(() => {
    db = createDB(`test-inv-${newId()}`);
    inv = createInventoryStore(db);
    app = createApparatusStore(db);
  });
  afterEach(async () => {
    await db.delete();
  });

  async function seed(items: InventoryItem[]) {
    await db.inventory.bulkAdd(items);
    await inv.boot();
  }
  const get = (id: string) => inv.store.getState().items.find((i) => i.id === id);

  it('increment raises quantity + available, durably and in memory', async () => {
    await seed([strut({ id: 'a', quantity: 2, available: 2 })]);
    await inv.incrementItem('a');
    expect((await db.inventory.get('a'))!).toMatchObject({ quantity: 3, available: 3 });
    expect(get('a')).toMatchObject({ quantity: 3, available: 3 });
  });

  it('decrement lowers both; no-ops when every unit is deployed', async () => {
    await seed([strut({ id: 'a', quantity: 3, available: 1 })]);
    await inv.decrementItem('a');
    expect(get('a')).toMatchObject({ quantity: 2, available: 0 });
    await inv.decrementItem('a'); // available 0 → no-op
    expect(get('a')).toMatchObject({ quantity: 2, available: 0 });
  });

  it('decrement removes the row when the last undeployed unit is dropped', async () => {
    await seed([strut({ id: 'a', type: 'plate', model: undefined, system: undefined, plateId: 'rigid6', quantity: 1, available: 1 })]);
    await inv.decrementItem('a');
    expect(get('a')).toBeUndefined();
    expect(await db.inventory.get('a')).toBeUndefined();
  });

  it('setQuantity clamps at the deployed floor', async () => {
    await seed([strut({ id: 'a', quantity: 4, available: 1 })]); // 3 deployed
    await inv.setQuantity('a', 1); // below the floor → clamps to 3
    expect(get('a')).toMatchObject({ quantity: 3, available: 0 });
  });

  it('removeItem refuses when units are deployed', async () => {
    await seed([strut({ id: 'a', quantity: 2, available: 0 })]);
    await expect(inv.removeItem('a')).rejects.toThrow();
    expect(get('a')).toBeDefined();
  });

  it('addOne increments a matching row, else creates a new one', async () => {
    await seed([strut({ id: 'a', quantity: 1, available: 1 })]);
    await inv.addOne({ apparatus: 'Rescue 2', apparatusId: 'app-rescue-2', type: 'strut', model: 'LS 203', system: 'LongShore' });
    expect(get('a')).toMatchObject({ quantity: 2, available: 2 });
    await inv.addOne({ apparatus: 'Rescue 2', apparatusId: 'app-rescue-2', type: 'plate', plateId: 'rigid6' });
    const plate = inv.store.getState().items.find((i) => i.type === 'plate');
    expect(plate).toMatchObject({ quantity: 1, available: 1, plateId: 'rigid6' });
  });

  it('upsertImport merges by id, skips deployed-orphan rows, and creates rigs for blank Apparatus IDs', async () => {
    await seed([strut({ id: 'a', quantity: 4, available: 1 })]); // 3 deployed
    await app.boot();
    const rows: ParsedImportRow[] = [
      // would drop below the 3 deployed → skip, untouched
      { id: 'a', apparatus: 'Rescue 2', apparatusId: 'app-rescue-2', type: 'strut', model: 'LS 203', system: 'LongShore', quantity: 2 },
      // blank apparatusId → new rig, created atomically with the row
      { id: '', apparatus: 'Engine 1', apparatusId: '', type: 'plate', plateId: 'rigid6', quantity: 5 },
    ];
    const res = await inv.upsertImport(rows, app);
    expect(res).toEqual({ imported: 1, skipped: 1 });
    expect(get('a')).toMatchObject({ quantity: 4, available: 1 }); // untouched
    expect(app.store.getState().roster.some((r) => r.name === 'Engine 1')).toBe(true);
    expect(inv.store.getState().items.find((i) => i.type === 'plate')).toMatchObject({ quantity: 5, available: 5 });
  });

  it('upsertImport preserves available on an id match (deployed count survives re-import)', async () => {
    await seed([strut({ id: 'a', quantity: 4, available: 1 })]); // 3 deployed
    await app.boot();
    await inv.upsertImport(
      [{ id: 'a', apparatus: 'Rescue 2', apparatusId: 'app-rescue-2', type: 'strut', model: 'LS 203', system: 'LongShore', quantity: 4 }],
      app,
    );
    expect(get('a')).toMatchObject({ quantity: 4, available: 1 });
  });

  it('upsertImport refuses to re-type an existing id (skips, leaves the row intact)', async () => {
    await seed([strut({ id: 'a', quantity: 2, available: 2 })]); // a strut
    await app.boot();
    const res = await inv.upsertImport(
      [{ id: 'a', apparatus: 'Rescue 2', apparatusId: 'app-rescue-2', type: 'plate', plateId: 'rigid6', quantity: 5 }],
      app,
    );
    expect(res).toEqual({ imported: 0, skipped: 1 });
    expect(get('a')).toMatchObject({ type: 'strut', model: 'LS 203', quantity: 2 });
  });

  it('upsertImport reuses an existing rig by name for a blank Apparatus ID (no duplicate)', async () => {
    await seed([strut({ id: 'a', quantity: 1, available: 1 })]); // on app-rescue-2 / "Rescue 2"
    await app.boot();
    await app.addApparatus({ id: 'app-rescue-2', name: 'Rescue 2', type: 'Rescue' });
    await inv.upsertImport(
      [{ id: '', apparatus: 'Rescue 2', apparatusId: '', type: 'plate', plateId: 'rigid6', quantity: 3 }],
      app,
    );
    expect(app.store.getState().roster).toHaveLength(1); // no new "Rescue 2" minted
    expect(inv.store.getState().items.find((i) => i.type === 'plate')).toMatchObject({ apparatusId: 'app-rescue-2', quantity: 3 });
  });

  it('decrement double-tap at the removal boundary: one removes, the other no-ops (no throw)', async () => {
    await seed([strut({ id: 'a', type: 'plate', model: undefined, system: undefined, plateId: 'rigid6', quantity: 1, available: 1 })]);
    const results = await Promise.allSettled([inv.decrementItem('a'), inv.decrementItem('a')]);
    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    expect(get('a')).toBeUndefined();
  });
});

// ---- cloud-sync Increment 3 (LWW) ------------------------------------------
describe('inventory store — LWW stamp + remote apply', () => {
  let db: FieldShoreDB;
  let rows: InventoryItem[];
  let deletes: { id: string; lastWriteAt: number }[];
  let inv: InventoryStoreApi;

  beforeEach(async () => {
    db = createDB(`test-inv-lww-${newId()}`);
    rows = [];
    deletes = [];
    inv = createInventoryStore(db, {
      onRow: (item) => rows.push(item),
      onDelete: (id, lastWriteAt) => deletes.push({ id, lastWriteAt }),
    });
    await inv.boot();
  });
  afterEach(async () => {
    await db.delete();
  });
  const get = (id: string) => inv.store.getState().items.find((i) => i.id === id);

  it('manual mutators stamp lastWriteAt and fire the cloud-row hook', async () => {
    const id = await inv.addOne({ apparatus: 'Rescue 2', apparatusId: 'app-r2', type: 'strut', model: 'LS 203', system: 'LongShore' });
    expect(get(id)!.lastWriteAt).toBeGreaterThan(0);
    expect(rows.at(-1)!.id).toBe(id);
    await inv.incrementItem(id);
    expect(rows.at(-1)!.lastWriteAt).toBeGreaterThan(0);
  });

  it('removeItem fires the delete hook with a stamp', async () => {
    await db.inventory.add(strut({ id: 'a', quantity: 1, available: 1 }));
    await inv.boot();
    await inv.removeItem('a');
    expect(deletes.at(-1)).toMatchObject({ id: 'a' });
    expect(deletes.at(-1)!.lastWriteAt).toBeGreaterThan(0);
  });

  it('deploy/return do NOT stamp lastWriteAt (available is event-owned, not synced)', async () => {
    await db.inventory.add(strut({ id: 'a', quantity: 2, available: 2 })); // no lastWriteAt
    const deployed = await applyDeployTxn(db, 'a');
    expect(deployed.lastWriteAt).toBeUndefined();
    const returned = await applyReturnTxn(db, 'a');
    expect(returned.lastWriteAt).toBeUndefined();
  });

  it('applyRemoteRow recomputes available = quantity − deployed (never trusts the wire)', async () => {
    await db.inventory.add(strut({ id: 'a', quantity: 4, available: 1 })); // 3 deployed locally
    await inv.boot();
    const row: CloudRow = { id: 'a', type: 'strut', model: 'LS 203', system: 'LongShore', apparatus: 'Rescue 2', apparatusId: 'app-r2', quantity: 6, lastWriteAt: 100 };
    await inv.applyRemoteRow(row);
    expect(get('a')).toMatchObject({ quantity: 6, available: 3, lastWriteAt: 100 }); // deployed 3 preserved
  });

  it('applyRemoteRow clamps a remote quantity below the deployed floor (never strands a unit)', async () => {
    await db.inventory.add(strut({ id: 'a', quantity: 4, available: 1 })); // 3 deployed
    await inv.boot();
    const row: CloudRow = { id: 'a', type: 'strut', model: 'LS 203', system: 'LongShore', apparatus: 'Rescue 2', apparatusId: 'app-r2', quantity: 1, lastWriteAt: 100 };
    await inv.applyRemoteRow(row);
    expect(get('a')).toMatchObject({ quantity: 3, available: 0 }); // clamped up to the 3 deployed
  });

  it('applyRemoteRow for a brand-new id sets available = quantity', async () => {
    const row: CloudRow = { id: 'b', type: 'plate', plateId: 'rigid6', apparatus: 'Engine 1', apparatusId: 'app-e1', quantity: 5, lastWriteAt: 100 };
    await inv.applyRemoteRow(row);
    expect(get('b')).toMatchObject({ quantity: 5, available: 5 });
  });

  it('applyRemoteDelete removes an undeployed row, but keeps one with deployed units', async () => {
    await db.inventory.bulkAdd([strut({ id: 'a', quantity: 1, available: 1 }), strut({ id: 'b', quantity: 2, available: 0 })]);
    await inv.boot();
    await inv.applyRemoteDelete('a'); // none deployed → removed
    expect(get('a')).toBeUndefined();
    await inv.applyRemoteDelete('b'); // all deployed → kept (never strand)
    expect(get('b')).toBeDefined();
  });

  it('applyRemoteRow drops a malformed wire row (no quantity → would be NaN) instead of poisoning local state', async () => {
    const bad = { id: 'x', type: 'strut', apparatus: 'R2', apparatusId: 'app-r2', lastWriteAt: 100 } as unknown as CloudRow; // no quantity
    await inv.applyRemoteRow(bad);
    expect(get('x')).toBeUndefined();
    expect(await db.inventory.get('x')).toBeUndefined();
  });

  it('applyRemoteRow / applyRemoteDelete do NOT re-push (no echo)', async () => {
    const row: CloudRow = { id: 'c', type: 'plate', plateId: 'rigid6', apparatus: 'Engine 1', apparatusId: 'app-e1', quantity: 2, lastWriteAt: 100 };
    await inv.applyRemoteRow(row);
    await inv.applyRemoteDelete('c');
    expect(rows).toHaveLength(0);
    expect(deletes).toHaveLength(0);
  });
});
