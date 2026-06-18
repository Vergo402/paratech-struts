import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDB, type FieldShoreDB } from './db';
import { createInventoryStore, type InventoryStoreApi } from './inventoryStore';
import { createApparatusStore, type ApparatusStoreApi } from './apparatusStore';
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
