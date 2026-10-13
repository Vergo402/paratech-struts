import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createDB, type FieldShoreDB } from './db';
import { createInventoryStore, type InventoryStoreApi, type ImportResult } from './inventoryStore';
import { createApparatusStore, type ApparatusStoreApi } from './apparatusStore';
import type { CloudRow } from '../sync/stateSync';
import type { InventoryItem } from '@core/schema';
import type { HeldCounts } from '@core/operation';
import type { ParsedImportRow } from '../inventory/excel';
import { newId } from '@core/id';

// ADR-041 — the persisted row carries `quantity` only; `held` (units out on scene) is
// pushed in from the folded event log via setHeld, and the view `items` derives the
// signed `available = quantity − held`. Tests seed held with setHeld directly — the
// operationStore tests cover how deploy events produce it.

const strut = (over: Partial<InventoryItem> & Pick<InventoryItem, 'id' | 'quantity'>): InventoryItem => ({
  type: 'strut',
  model: 'LS 203',
  system: 'LongShore',
  apparatus: 'Rescue 2',
  apparatusId: 'app-rescue-2',
  ...over,
});

/** The import result with no cloud hook wired (#514): nothing pushed → 'local'. */
const counts = (imported: number, skipped: Partial<ImportResult['skipped']> = {}): ImportResult => ({
  imported,
  skipped: { strand: 0, retype: 0, ...skipped },
  cloud: { status: 'local', failed: 0, reverted: 0 },
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

  async function seed(items: InventoryItem[], held: HeldCounts = {}) {
    await db.inventory.bulkAdd(items);
    await inv.boot();
    inv.setHeld(held);
  }
  const get = (id: string) => inv.store.getState().items.find((i) => i.id === id);

  it('increment raises quantity durably; the view derives available', async () => {
    await seed([strut({ id: 'a', quantity: 2 })], { a: 1 });
    await inv.incrementItem('a');
    expect((await db.inventory.get('a'))!.quantity).toBe(3);
    expect(get('a')).toMatchObject({ quantity: 3, held: 1, available: 2 });
  });

  it('a stock write never persists a derived field', async () => {
    await seed([strut({ id: 'a', quantity: 2 })], { a: 1 });
    await inv.incrementItem('a');
    const row = (await db.inventory.get('a'))! as Record<string, unknown>;
    expect('available' in row).toBe(false);
    expect('held' in row).toBe(false);
  });

  it('decrement lowers quantity; no-ops when every unit is held', async () => {
    await seed([strut({ id: 'a', quantity: 3 })], { a: 2 });
    await inv.decrementItem('a');
    expect(get('a')).toMatchObject({ quantity: 2, available: 0 });
    await inv.decrementItem('a'); // available 0 → no-op
    expect(get('a')).toMatchObject({ quantity: 2, available: 0 });
  });

  it('decrement also no-ops on an over-allocated row (available < 0)', async () => {
    await seed([strut({ id: 'a', quantity: 1 })], { a: 2 });
    await inv.decrementItem('a');
    expect(get('a')).toMatchObject({ quantity: 1, available: -1 });
  });

  it('decrement removes the row when the last unit is dropped and nothing is held', async () => {
    await seed([strut({ id: 'a', type: 'plate', model: undefined, system: undefined, plateId: 'rigid6', quantity: 1 })]);
    await inv.decrementItem('a');
    expect(get('a')).toBeUndefined();
    expect(await db.inventory.get('a')).toBeUndefined();
  });

  it('setQuantity floors at held', async () => {
    await seed([strut({ id: 'a', quantity: 4 })], { a: 3 });
    await inv.setQuantity('a', 1); // below held → floors to 3
    expect(get('a')).toMatchObject({ quantity: 3, available: 0 });
  });

  it('setQuantity 0 removes a row that holds nothing', async () => {
    await seed([strut({ id: 'a', quantity: 4 })]);
    await inv.setQuantity('a', 0);
    expect(get('a')).toBeUndefined();
  });

  it('removeItem refuses while units are held', async () => {
    await seed([strut({ id: 'a', quantity: 2 })], { a: 2 });
    await expect(inv.removeItem('a')).rejects.toThrow();
    expect(get('a')).toBeDefined();
  });

  it('addOne increments a matching row, else creates a new one', async () => {
    await seed([strut({ id: 'a', quantity: 1 })]);
    await inv.addOne({ apparatus: 'Rescue 2', apparatusId: 'app-rescue-2', type: 'strut', model: 'LS 203', system: 'LongShore' });
    expect(get('a')).toMatchObject({ quantity: 2, available: 2 });
    await inv.addOne({ apparatus: 'Rescue 2', apparatusId: 'app-rescue-2', type: 'plate', plateId: 'rigid6' });
    const plate = inv.store.getState().items.find((i) => i.type === 'plate');
    expect(plate).toMatchObject({ quantity: 1, available: 1, plateId: 'rigid6' });
  });

  it('upsertImport merges by id, skips held-orphan rows, and creates rigs for blank Apparatus IDs', async () => {
    await seed([strut({ id: 'a', quantity: 4 })], { a: 3 });
    await app.boot();
    const rows: ParsedImportRow[] = [
      // would drop below the 3 held → skip, untouched
      { id: 'a', apparatus: 'Rescue 2', apparatusId: 'app-rescue-2', type: 'strut', model: 'LS 203', system: 'LongShore', quantity: 2 },
      // blank apparatusId → new rig, created atomically with the row
      { id: '', apparatus: 'Engine 1', apparatusId: '', type: 'plate', plateId: 'rigid6', quantity: 5 },
    ];
    const res = await inv.upsertImport(rows, app);
    expect(res).toEqual(counts(1, { strand: 1 }));
    expect(get('a')).toMatchObject({ quantity: 4, available: 1 }); // untouched
    expect(app.store.getState().roster.some((r) => r.name === 'Engine 1')).toBe(true);
    expect(inv.store.getState().items.find((i) => i.type === 'plate')).toMatchObject({ quantity: 5, available: 5 });
  });

  it('upsertImport keeps the held count on an id match (it lives in the log, not the row)', async () => {
    await seed([strut({ id: 'a', quantity: 4 })], { a: 3 });
    await app.boot();
    await inv.upsertImport(
      [{ id: 'a', apparatus: 'Rescue 2', apparatusId: 'app-rescue-2', type: 'strut', model: 'LS 203', system: 'LongShore', quantity: 4 }],
      app,
    );
    expect(get('a')).toMatchObject({ quantity: 4, held: 3, available: 1 });
    expect('available' in ((await db.inventory.get('a'))! as Record<string, unknown>)).toBe(false);
  });

  it('upsertImport refuses to re-type an existing id (skips, leaves the row intact)', async () => {
    await seed([strut({ id: 'a', quantity: 2 })]); // a strut
    await app.boot();
    const res = await inv.upsertImport(
      [{ id: 'a', apparatus: 'Rescue 2', apparatusId: 'app-rescue-2', type: 'plate', plateId: 'rigid6', quantity: 5 }],
      app,
    );
    expect(res).toEqual(counts(0, { retype: 1 }));
    expect(get('a')).toMatchObject({ type: 'strut', model: 'LS 203', quantity: 2 });
  });

  it('upsertImport reuses an existing rig by name for a blank Apparatus ID (no duplicate)', async () => {
    await seed([strut({ id: 'a', quantity: 1 })]); // on app-rescue-2 / "Rescue 2"
    await app.boot();
    await app.addApparatus({ id: 'app-rescue-2', name: 'Rescue 2', type: 'Rescue' });
    await inv.upsertImport(
      [{ id: '', apparatus: 'Rescue 2', apparatusId: '', type: 'plate', plateId: 'rigid6', quantity: 3 }],
      app,
    );
    expect(app.store.getState().roster).toHaveLength(1); // no new "Rescue 2" minted
    expect(inv.store.getState().items.find((i) => i.type === 'plate')).toMatchObject({ apparatusId: 'app-rescue-2', quantity: 3 });
  });

  // ---- #469: blank-ID rows merge with identical existing stock -----------------
  describe('upsertImport — blank-ID rows (#469)', () => {
    const R2 = { apparatus: 'Rescue 2', apparatusId: 'app-rescue-2' };
    const blankStrut = (quantity: number, over: Partial<ParsedImportRow> = {}): ParsedImportRow => ({
      id: '', ...R2, type: 'strut', model: 'LS 203', system: 'LongShore', quantity, ...over,
    });

    it('a blank-ID strut matching stock on the same rig sets its quantity (no new row)', async () => {
      await seed([strut({ id: 'a', quantity: 2 })]);
      await app.boot();
      const res = await inv.upsertImport([blankStrut(5)], app);
      expect(res).toEqual(counts(1));
      expect(await db.inventory.count()).toBe(1);
      expect((await db.inventory.get('a'))!.quantity).toBe(5);
    });

    it('a blank-ID extension matches on length + system', async () => {
      await seed([strut({ id: 'x', type: 'extension', model: undefined, system: 'LongShore', length: 24, quantity: 1 })]);
      await app.boot();
      const res = await inv.upsertImport(
        [{ id: '', ...R2, type: 'extension', system: 'LongShore', length: 24, quantity: 3 }],
        app,
      );
      expect(res).toEqual(counts(1));
      expect(await db.inventory.count()).toBe(1);
      expect((await db.inventory.get('x'))!.quantity).toBe(3);
    });

    it('a blank-ID plate matches on plateId', async () => {
      await seed([strut({ id: 'p', type: 'plate', model: undefined, system: undefined, plateId: 'rigid6', quantity: 2 })]);
      await app.boot();
      const res = await inv.upsertImport([{ id: '', ...R2, type: 'plate', plateId: 'rigid6', quantity: 4 }], app);
      expect(res).toEqual(counts(1));
      expect(await db.inventory.count()).toBe(1);
      expect((await db.inventory.get('p'))!.quantity).toBe(4);
    });

    it('the same model on a different rig is a separate row', async () => {
      await seed([strut({ id: 'a', quantity: 2 })]);
      await app.boot();
      const res = await inv.upsertImport([blankStrut(1, { apparatus: 'Engine 1', apparatusId: 'app-engine-1' })], app);
      expect(res).toEqual(counts(1));
      expect(await db.inventory.count()).toBe(2);
      expect((await db.inventory.get('a'))!.quantity).toBe(2); // untouched
    });

    it('the held guard applies on the merge path: skipped, quantity untouched', async () => {
      await seed([strut({ id: 'a', quantity: 4 })], { a: 3 });
      await app.boot();
      const res = await inv.upsertImport([blankStrut(2)], app);
      expect(res).toEqual(counts(0, { strand: 1 }));
      expect(await db.inventory.count()).toBe(1);
      expect((await db.inventory.get('a'))!.quantity).toBe(4);
    });

    it('identical blank rows within one file SUM into one row', async () => {
      await app.boot();
      await inv.boot();
      const res = await inv.upsertImport([blankStrut(2), blankStrut(3)], app);
      expect(res).toEqual(counts(1));
      const all = await db.inventory.toArray();
      expect(all).toHaveLength(1);
      expect(all[0]!.quantity).toBe(5);
    });

    it('an id row and a blank row of one identity SUM into one file total (id first)', async () => {
      await seed([strut({ id: 'a', quantity: 9 })]);
      await app.boot();
      const idRow: ParsedImportRow = { ...blankStrut(2), id: 'a' };
      const res = await inv.upsertImport([idRow, blankStrut(3)], app);
      expect(res).toEqual(counts(1));
      expect(await db.inventory.count()).toBe(1);
      expect((await db.inventory.get('a'))!.quantity).toBe(5);
    });

    it('an id row and a blank row of one identity SUM into one file total (blank first)', async () => {
      await seed([strut({ id: 'a', quantity: 9 })]);
      await app.boot();
      const idRow: ParsedImportRow = { ...blankStrut(2), id: 'a' };
      const res = await inv.upsertImport([blankStrut(3), idRow], app);
      expect(res).toEqual(counts(1));
      expect(await db.inventory.count()).toBe(1);
      expect((await db.inventory.get('a'))!.quantity).toBe(5);
    });

    it('re-importing an id + blank mixed file keeps the same total and row count', async () => {
      await seed([strut({ id: 'a', quantity: 9 })]);
      await app.boot();
      const file: ParsedImportRow[] = [{ ...blankStrut(2), id: 'a' }, blankStrut(3)];
      await inv.upsertImport(file, app);
      await inv.upsertImport(file, app);
      expect(await db.inventory.count()).toBe(1);
      expect((await db.inventory.get('a'))!.quantity).toBe(5);
    });

    it('an id row with no blank sibling keeps plain SET semantics', async () => {
      await seed([strut({ id: 'a', quantity: 4 })]);
      await app.boot();
      const res = await inv.upsertImport([{ ...blankStrut(2), id: 'a' }], app);
      expect(res).toEqual(counts(1));
      expect((await db.inventory.get('a'))!.quantity).toBe(2);
    });

    it('in-file aggregation uses the same per-type identity as stock matching (a stray field does not split rows)', async () => {
      await app.boot();
      const res = await inv.upsertImport([blankStrut(2), blankStrut(3, { length: 12 })], app);
      expect(res).toEqual(counts(1));
      const all = await db.inventory.toArray();
      expect(all).toHaveLength(1);
      expect(all[0]!.quantity).toBe(5);
    });

    it('a blank-Apparatus-ID rig that does not exist yet: one rig minted, identical rows summed into one line', async () => {
      await app.boot();
      const rows: ParsedImportRow[] = [
        { id: '', apparatus: 'Rescue 9', apparatusId: '', type: 'strut', model: 'LS 203', system: 'LongShore', quantity: 2 },
        { id: '', apparatus: 'Rescue 9', apparatusId: '', type: 'strut', model: 'LS 203', system: 'LongShore', quantity: 3 },
      ];
      const res = await inv.upsertImport(rows, app);
      expect(res).toEqual(counts(1));
      expect(app.store.getState().roster.filter((r) => r.name === 'Rescue 9')).toHaveLength(1);
      const all = await db.inventory.toArray();
      expect(all).toHaveLength(1);
      expect(all[0]).toMatchObject({ apparatus: 'Rescue 9', quantity: 5 });
    });

    it('a held-guard skip on the merge path never pushes to the cloud', async () => {
      const pushed: InventoryItem[] = [];
      const hooked = createInventoryStore(db, { onRow: (i) => { pushed.push(i); } });
      await db.inventory.add(strut({ id: 'a', quantity: 4 }));
      await hooked.boot();
      hooked.setHeld({ a: 3 });
      await app.boot();
      const res = await hooked.upsertImport([blankStrut(2)], app);
      expect(res).toEqual(counts(0, { strand: 1 }));
      expect(pushed).toEqual([]);
    });

    it('re-importing the same blank-ID file is idempotent (full table unchanged)', async () => {
      await seed([strut({ id: 'a', quantity: 2 })]);
      await app.boot();
      const file: ParsedImportRow[] = [
        blankStrut(4), // matches stock 'a'
        blankStrut(1, { model: 'LS 305' }),
        blankStrut(1, { model: 'LS 305' }), // identical pair → sums to 2
        { id: '', ...R2, type: 'plate', plateId: 'rigid6', quantity: 3 },
      ];
      await inv.upsertImport(file, app);
      const strip = async () =>
        (await db.inventory.toArray())
          .map((r) => ({ ...r, lastWriteAt: undefined }))
          .sort((x, y) => x.id.localeCompare(y.id));
      const first = await strip();
      expect(first).toHaveLength(3);
      const res = await inv.upsertImport(file, app);
      expect(res).toEqual(counts(3));
      expect(await strip()).toEqual(first);
    });
  });

  it('decrement double-tap at the removal boundary: one removes, the other no-ops (no throw)', async () => {
    await seed([strut({ id: 'a', type: 'plate', model: undefined, system: undefined, plateId: 'rigid6', quantity: 1 })]);
    const results = await Promise.allSettled([inv.decrementItem('a'), inv.decrementItem('a')]);
    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    expect(get('a')).toBeUndefined();
  });
});

// ---- ADR-041 derived view ---------------------------------------------------
describe('inventory store — derived view (held → available)', () => {
  let db: FieldShoreDB;
  let inv: InventoryStoreApi;

  beforeEach(async () => {
    db = createDB(`test-inv-view-${newId()}`);
    inv = createInventoryStore(db);
    await db.inventory.bulkAdd([strut({ id: 'a', quantity: 2 }), strut({ id: 'b', quantity: 1 })]);
    await inv.boot();
  });
  afterEach(async () => {
    await db.delete();
  });
  const get = (id: string) => inv.store.getState().items.find((i) => i.id === id)!;

  it('setHeld drives items.available, and a negative value is allowed (over-allocated)', () => {
    inv.setHeld({ a: 1, b: 2 });
    expect(get('a')).toMatchObject({ quantity: 2, held: 1, available: 1 });
    expect(get('b')).toMatchObject({ quantity: 1, held: 2, available: -1 });
    expect(inv.heldOf('b')).toBe(2);
    expect(inv.heldOf('nope')).toBe(0);
  });

  it('setHeld with an equal map is skipped — no state change, no re-render', () => {
    inv.setHeld({ a: 1 });
    const before = inv.store.getState();
    let fires = 0;
    const unsub = inv.store.subscribe(() => {
      fires += 1;
    });
    inv.setHeld({ a: 1 }); // a fresh object with the same counts
    unsub();
    expect(fires).toBe(0);
    expect(inv.store.getState()).toBe(before);
  });

  it('boot strips a legacy row\'s persisted available and drops a corrupt row', async () => {
    await db.inventory.put({ ...strut({ id: 'legacy', quantity: 3 }), available: 0 } as InventoryItem);
    await db.inventory.put({ id: 'bad', type: 'strut' } as unknown as InventoryItem);
    const warn = console.warn;
    console.warn = () => {};
    try {
      await inv.boot();
    } finally {
      console.warn = warn;
    }
    // The vestigial 0 is gone: available is quantity − held (nothing held) = 3.
    expect(get('legacy')).toMatchObject({ quantity: 3, held: 0, available: 3 });
    expect(inv.store.getState().rows.find((r) => r.id === 'legacy')).not.toHaveProperty('available');
    expect(inv.store.getState().items.find((i) => i.id === 'bad')).toBeUndefined();
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
      onRow: (item) => { rows.push(item); },
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

  it('the cloud-row hook never carries a derived field', async () => {
    await db.inventory.add(strut({ id: 'a', quantity: 2 }));
    await inv.boot();
    inv.setHeld({ a: 1 });
    await inv.incrementItem('a');
    expect(rows.at(-1)).not.toHaveProperty('available');
    expect(rows.at(-1)).not.toHaveProperty('held');
  });

  it('a blank-ID import row that merges into existing stock pushes to the cloud like an id row (#469)', async () => {
    await db.inventory.add(strut({ id: 'a', quantity: 2 }));
    await inv.boot();
    const ap = createApparatusStore(db);
    await ap.boot();
    rows.length = 0;
    await inv.upsertImport(
      [{ id: '', apparatus: 'Rescue 2', apparatusId: 'app-rescue-2', type: 'strut', model: 'LS 203', system: 'LongShore', quantity: 6 }],
      ap,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'a', quantity: 6 });
    expect(rows[0]!.lastWriteAt).toBeGreaterThan(0);
  });

  it('removeItem fires the delete hook with a stamp', async () => {
    await db.inventory.add(strut({ id: 'a', quantity: 1 }));
    await inv.boot();
    await inv.removeItem('a');
    expect(deletes.at(-1)).toMatchObject({ id: 'a' });
    expect(deletes.at(-1)!.lastWriteAt).toBeGreaterThan(0);
  });

  it('a held change never stamps lastWriteAt or fires a hook (stock out is event-owned, not synced)', async () => {
    await db.inventory.add(strut({ id: 'a', quantity: 2 })); // no lastWriteAt
    await inv.boot();
    inv.setHeld({ a: 2 });
    expect(get('a')!.lastWriteAt).toBeUndefined();
    expect((await db.inventory.get('a'))!.lastWriteAt).toBeUndefined();
    expect(rows).toHaveLength(0);
  });

  it('applyRemoteRow persists the peer quantity verbatim; available derives from local held', async () => {
    await db.inventory.add(strut({ id: 'a', quantity: 4 }));
    await inv.boot();
    inv.setHeld({ a: 3 });
    const row: CloudRow = { id: 'a', type: 'strut', model: 'LS 203', system: 'LongShore', apparatus: 'Rescue 2', apparatusId: 'app-r2', quantity: 6, lastWriteAt: 100 };
    await inv.applyRemoteRow(row);
    expect(get('a')).toMatchObject({ quantity: 6, held: 3, available: 3, lastWriteAt: 100 });
  });

  it('applyRemoteRow below held is NOT clamped — quantity untouched, available goes negative (ADR-041)', async () => {
    await db.inventory.add(strut({ id: 'a', quantity: 4 }));
    await inv.boot();
    inv.setHeld({ a: 3 });
    const row: CloudRow = { id: 'a', type: 'strut', model: 'LS 203', system: 'LongShore', apparatus: 'Rescue 2', apparatusId: 'app-r2', quantity: 1, lastWriteAt: 100 };
    await inv.applyRemoteRow(row);
    expect((await db.inventory.get('a'))!.quantity).toBe(1); // every device persists the same quantity
    expect(get('a')).toMatchObject({ quantity: 1, held: 3, available: -2 }); // the over-allocated tell
  });

  it('applyRemoteRow for a brand-new id sets available = quantity', async () => {
    const row: CloudRow = { id: 'b', type: 'plate', plateId: 'rigid6', apparatus: 'Engine 1', apparatusId: 'app-e1', quantity: 5, lastWriteAt: 100 };
    await inv.applyRemoteRow(row);
    expect(get('b')).toMatchObject({ quantity: 5, available: 5 });
  });

  it('applyRemoteDelete removes a row that holds nothing, but refuses while units are held', async () => {
    await db.inventory.bulkAdd([strut({ id: 'a', quantity: 1 }), strut({ id: 'b', quantity: 2 })]);
    await inv.boot();
    inv.setHeld({ b: 2 });
    await inv.applyRemoteDelete('a'); // nothing held → removed
    expect(get('a')).toBeUndefined();
    await inv.applyRemoteDelete('b'); // held → kept (never strand)
    expect(get('b')).toBeDefined();
    expect(await db.inventory.get('b')).toBeDefined();
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

// #514 — the import result says what really happened: each store-side skip labelled by
// the guard that caused it, and whether the imported rows reached the cloud.
describe('upsertImport — skip accounting + cloud outcome (#514)', () => {
  let db: FieldShoreDB;
  let app: ApparatusStoreApi;
  type Push = 'ok' | 'failed' | 'skipped';

  beforeEach(async () => {
    db = createDB(`test-inv-514-${newId()}`);
    app = createApparatusStore(db);
    await app.boot();
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await db.delete();
  });

  const row = (id: string, quantity: number, over: Partial<ParsedImportRow> = {}): ParsedImportRow => ({
    id, apparatus: 'Rescue 2', apparatusId: 'app-rescue-2', type: 'strut', model: 'LS 203', system: 'LongShore', quantity, ...over,
  });
  const three = [row('a', 2), row('b', 3), row('c', 4)];
  const never = () => new Promise<Push>(() => {}); // an RTDB write buffered offline / no ack

  it('labels each store-side skip by its guard: strand vs re-type', async () => {
    const inv = createInventoryStore(db);
    await db.inventory.bulkAdd([strut({ id: 'a', quantity: 4 }), strut({ id: 'b', quantity: 1 })]);
    await inv.boot();
    inv.setHeld({ a: 3 });
    const res = await inv.upsertImport(
      [
        row('a', 2), // below the 3 held → would strand deployed stock
        row('b', 2, { type: 'plate', model: undefined, system: undefined, plateId: 'rigid6' }), // re-type
        row('c', 1),
      ],
      app,
    );
    expect(res.imported).toBe(1);
    expect(res.skipped).toEqual({ strand: 1, retype: 1 });
  });

  it("every push lands → cloud 'synced'", async () => {
    const inv = createInventoryStore(db, { onRow: async (): Promise<Push> => 'ok' });
    const res = await inv.upsertImport(three, app);
    expect(res.cloud).toEqual({ status: 'synced', failed: 0, reverted: 0 });
  });

  it("refused pushes → cloud 'failed' with the count of rows that didn't reach the cloud", async () => {
    const inv = createInventoryStore(db, { onRow: async (i): Promise<Push> => (i.id === 'a' ? 'ok' : 'failed') });
    const res = await inv.upsertImport(three, app);
    expect(res.imported).toBe(3);
    expect(res.cloud).toEqual({ status: 'failed', failed: 2, reverted: 0 });
  });

  // Fix round 2 — a push the cloud refuses because it holds a NEWER row (the stale-clock
  // rule) is rolled back by the RTDB client, which re-raises the cloud row BEFORE it
  // rejects the write; the state listener's LWW pull-down then overwrites Dexie. That row
  // is no longer "saved on this device" — the device shows the cloud's value.
  it("a refused push whose row the cloud's newer value overwrote → 'reverted', not 'failed'", async () => {
    const inv: InventoryStoreApi = createInventoryStore(db, {
      onRow: (i) => {
        if (i.id !== 'b') return Promise.resolve<Push>('ok');
        // As the SDK does: the reverted snapshot is raised (the listener's pull-down write
        // is ISSUED, not awaited) before the write promise rejects.
        void inv.applyRemoteRow({ ...i, quantity: 9, lastWriteAt: 9_999_999_999_999 });
        return Promise.resolve<Push>('failed');
      },
    });
    const res = await inv.upsertImport(three, app);
    expect(res.cloud).toEqual({ status: 'failed', failed: 0, reverted: 1 });
    expect((await db.inventory.get('b'))!.quantity).toBe(9); // the cloud's value, by design (LWW)
  });

  it("a refused push whose row nothing overwrote stays 'failed' (still saved on this device)", async () => {
    const inv = createInventoryStore(db, { onRow: async (i): Promise<Push> => (i.id === 'b' ? 'failed' : 'ok') });
    const res = await inv.upsertImport(three, app);
    expect(res.cloud).toEqual({ status: 'failed', failed: 1, reverted: 0 });
    expect((await db.inventory.get('b'))!.quantity).toBe(3);
  });

  it('a removed row counts as reverted too (a newer cloud tombstone)', async () => {
    const inv: InventoryStoreApi = createInventoryStore(db, {
      onRow: (i) => {
        if (i.id === 'c') void inv.applyRemoteDelete('c');
        return Promise.resolve<Push>(i.id === 'c' ? 'failed' : 'ok');
      },
    });
    const res = await inv.upsertImport(three, app);
    expect(res.cloud).toEqual({ status: 'failed', failed: 0, reverted: 1 });
  });

  it('a skipped carrier counts the blank siblings it carried in the same skip (no phantom "merged")', async () => {
    const inv = createInventoryStore(db);
    await db.inventory.add(strut({ id: 'p', type: 'plate', model: undefined, system: undefined, plateId: 'rigid6', quantity: 1 }));
    await inv.boot();
    // the id row re-types the plate 'p' as a strut; the blank row has the same identity, so
    // it folds into that carrier — and is dropped with it
    const res = await inv.upsertImport([row('p', 2), row('', 3)], app);
    expect(res).toEqual({ imported: 0, skipped: { strand: 0, retype: 2 }, cloud: { status: 'local', failed: 0, reverted: 0 } });
  });

  it('a held-guard skip of a blank-only aggregate counts every row of that aggregate', async () => {
    const inv = createInventoryStore(db);
    await db.inventory.add(strut({ id: 'a', quantity: 4 }));
    await inv.boot();
    inv.setHeld({ a: 3 });
    const res = await inv.upsertImport([row('', 1), row('', 1)], app); // sums to 2 < 3 held
    expect(res.skipped).toEqual({ strand: 2, retype: 0 });
  });

  it("a push still unsettled at the settle bound → cloud 'pending'", async () => {
    const inv = createInventoryStore(
      db,
      { onRow: async (i): Promise<Push> => (i.id === 'a' ? 'ok' : never()) },
      { isOnline: () => true, cloudSettleMs: 20 },
    );
    const res = await inv.upsertImport(three, app);
    expect(res.cloud).toEqual({ status: 'pending', failed: 0, reverted: 0 });
  });

  it("offline → cloud 'pending' without waiting out the settle bound", async () => {
    const inv = createInventoryStore(db, { onRow: never }, { isOnline: () => false, cloudSettleMs: 60_000 });
    const t0 = Date.now();
    const res = await inv.upsertImport(three, app);
    expect(Date.now() - t0).toBeLessThan(1_000);
    expect(res.cloud).toEqual({ status: 'pending', failed: 0, reverted: 0 });
    expect(res.imported).toBe(3);
  });

  it("no cloud for this bucket (every push 'skipped') → 'local', even offline", async () => {
    const inv = createInventoryStore(db, { onRow: async (): Promise<Push> => 'skipped' }, { isOnline: () => false });
    const res = await inv.upsertImport(three, app);
    expect(res.cloud).toEqual({ status: 'local', failed: 0, reverted: 0 });
  });

  it("nothing imported, so nothing pushed → 'local' (never claims the cloud got nothing)", async () => {
    const inv = createInventoryStore(db, { onRow: async (): Promise<Push> => 'ok' });
    await db.inventory.add(strut({ id: 'a', quantity: 4 }));
    await inv.boot();
    inv.setHeld({ a: 3 });
    const res = await inv.upsertImport([row('a', 1)], app);
    expect(res).toEqual({ imported: 0, skipped: { strand: 1, retype: 0 }, cloud: { status: 'local', failed: 0, reverted: 0 } });
  });

  it('a push that throws synchronously counts as failed; the import still resolves with the rows saved', async () => {
    const inv = createInventoryStore(db, {
      onRow: (i) => {
        if (i.id === 'b') throw new Error('boom');
        return Promise.resolve<Push>('ok');
      },
    });
    const res = await inv.upsertImport(three, app);
    expect(res.cloud).toEqual({ status: 'failed', failed: 1, reverted: 0 });
    expect(await db.inventory.count()).toBe(3);
  });

  it('a failing post-commit step never rejects the import: the committed rows are reported, not "Nothing was saved"', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(app, 'boot').mockRejectedValue(new Error('roster read failed'));
    const inv = createInventoryStore(db, { onRow: async (): Promise<Push> => 'ok' });
    const res = await inv.upsertImport([row('', 2, { apparatus: 'Engine 9', apparatusId: '' })], app); // mints a rig → apparatus.boot()
    expect(res.imported).toBe(1);
    expect(res.cloud).toEqual({ status: 'synced', failed: 0, reverted: 0 });
    expect(await db.inventory.count()).toBe(1);
    expect(warn).toHaveBeenCalled();
  });

  it('a failed mirror reload pushes NOTHING (the mirror is stale) and counts every imported row as failed', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const pushed: InventoryItem[] = [];
    const inv = createInventoryStore(db, {
      onRow: async (i): Promise<Push> => {
        pushed.push(i);
        return 'ok';
      },
    });
    await db.inventory.add(strut({ id: 'a', quantity: 2 })); // in the mirror at quantity 2
    await inv.boot();
    vi.spyOn(db.inventory, 'toArray').mockRejectedValue(new Error('read failed'));
    const res = await inv.upsertImport([row('a', 5), row('n', 1)], app);
    expect(res.imported).toBe(2);
    expect(pushed).toEqual([]); // never the stale quantity-2 row
    expect(res.cloud).toEqual({ status: 'failed', failed: 2, reverted: 0 });
    expect((await db.inventory.get('a'))!.quantity).toBe(5); // durable all the same
    expect(warn).toHaveBeenCalled();
  });

  it('a failed apparatus reload never pushes the stale roster (it would drop the new rig in the cloud)', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(app, 'boot').mockRejectedValue(new Error('roster read failed'));
    const pushRoster = vi.spyOn(app, 'pushRoster');
    const inv = createInventoryStore(db);
    await inv.upsertImport([row('', 2, { apparatus: 'Engine 9', apparatusId: '' })], app);
    expect(pushRoster).not.toHaveBeenCalled();
  });

  it('a mirror reload that fails after commit counts the unpushable rows as not reaching the cloud', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const inv = createInventoryStore(db, { onRow: async (): Promise<Push> => 'ok' });
    vi.spyOn(db.inventory, 'toArray').mockRejectedValue(new Error('read failed')); // boot() reads the table
    const res = await inv.upsertImport(three, app);
    expect(res.imported).toBe(3);
    expect(res.cloud).toEqual({ status: 'failed', failed: 3, reverted: 0 });
    expect(warn).toHaveBeenCalled();
  });
});
