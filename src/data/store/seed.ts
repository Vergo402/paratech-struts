import type { InventoryItem, Apparatus } from '@core/schema';
import { globalDb as defaultDb, type FieldShoreDB } from './db';
import { APPARATUS_ROSTER_KEY } from './apparatusStore';

// Synthetic fixture inventory — NO real department data (the CSVs in the repo
// root are gitignored for a reason). Seeded once, on first boot with an empty
// inventory table. Shaped so every slice verification state (#247) is drivable:
//
//   30″ measurement  → real recommendations (LS 203 / AT 25-36 on Rescue 2)
//   16″ measurement  → NO MATCH (no AT 12-15 seeded; AT 19-25 collapses at 19″,
//                      LS 203 at 26″ — nothing reaches down to 16″)
//   200″ measurement → UNRATED-ZONE warning (#40 gate): LS 1016 + 12″ LongShore
//                      extension physically reaches, but >192″ is beyond
//                      Paratech's published chart → capacity 0 + warning combo
//   Squad 3          → zero-available rig (drives the no-inventory empty state)
//
// Ids are deterministic ('inv-…') — readable in tests, stable across boots.

const item = (
  id: string,
  apparatus: string,
  apparatusId: string,
  fields: Partial<InventoryItem> & Pick<InventoryItem, 'type' | 'quantity' | 'available'>,
): InventoryItem => ({ id, apparatus, apparatusId, ...fields });

export function buildSeedInventory(): InventoryItem[] {
  const r2 = (id: string, fields: Partial<InventoryItem> & Pick<InventoryItem, 'type' | 'quantity' | 'available'>) =>
    item(id, 'Rescue 2', 'app-rescue-2', fields);
  const e1 = (id: string, fields: Partial<InventoryItem> & Pick<InventoryItem, 'type' | 'quantity' | 'available'>) =>
    item(id, 'Engine 1', 'app-engine-1', fields);
  const s3 = (id: string, fields: Partial<InventoryItem> & Pick<InventoryItem, 'type' | 'quantity' | 'available'>) =>
    item(id, 'Squad 3', 'app-squad-3', fields);

  return [
    // ---- Rescue 2 — the rich rig (real recommendations) ----
    r2('inv-r2-ls203', { type: 'strut', model: 'LS 203', system: 'LongShore', quantity: 4, available: 4 }),
    r2('inv-r2-ls304', { type: 'strut', model: 'LS 304', system: 'LongShore', quantity: 4, available: 4 }),
    r2('inv-r2-ls406', { type: 'strut', model: 'LS 406', system: 'LongShore', quantity: 2, available: 2 }),
    r2('inv-r2-at2536', { type: 'strut', model: 'AT 25-36', system: 'AcmeThread', quantity: 4, available: 4 }),
    r2('inv-r2-at3758', { type: 'strut', model: 'AT 37-58', system: 'AcmeThread', quantity: 4, available: 4 }),
    r2('inv-r2-lsext12', { type: 'extension', system: 'LongShore', length: 12, quantity: 2, available: 2 }),
    r2('inv-r2-lsext24', { type: 'extension', system: 'LongShore', length: 24, quantity: 2, available: 2 }),
    r2('inv-r2-atext6', { type: 'extension', system: 'AcmeThread', length: 6, quantity: 2, available: 2 }),
    r2('inv-r2-atext12', { type: 'extension', system: 'AcmeThread', length: 12, quantity: 2, available: 2 }),
    r2('inv-r2-rigid6', { type: 'plate', plateId: 'rigid6', quantity: 8, available: 8 }),
    r2('inv-r2-swivel6', { type: 'plate', plateId: 'swivel6', quantity: 4, available: 4 }),

    // ---- Engine 1 — modest, carries the unrated-zone driver ----
    e1('inv-e1-at1925', { type: 'strut', model: 'AT 19-25', system: 'AcmeThread', quantity: 2, available: 2 }),
    e1('inv-e1-at2536', { type: 'strut', model: 'AT 25-36', system: 'AcmeThread', quantity: 2, available: 2 }),
    e1('inv-e1-ls1016', { type: 'strut', model: 'LS 1016', system: 'LongShore', quantity: 2, available: 2 }),
    e1('inv-e1-lsext48', { type: 'extension', system: 'LongShore', length: 48, quantity: 1, available: 1 }),

    // ---- Squad 3 — stock on paper, none available (no-inventory empty state) ----
    s3('inv-s3-ls304', { type: 'strut', model: 'LS 304', system: 'LongShore', quantity: 2, available: 0 }),
    s3('inv-s3-at3758', { type: 'strut', model: 'AT 37-58', system: 'AcmeThread', quantity: 1, available: 0 }),
  ];
}

// The roster rows for the seeded rigs — ids + names match the fixture inventory
// above (app-rescue-2 / 'Rescue 2', etc.) so the scope-tab union resolves cleanly.
// Seeded only on a fresh install (gated on seedIfEmpty in boot), so a device that
// imported its own custom inventory never gets these phantom rigs.
const SEED_ROSTER: Apparatus[] = [
  { id: 'app-rescue-2', name: 'Rescue 2', type: 'Rescue' },
  { id: 'app-engine-1', name: 'Engine 1', type: 'Engine' },
  { id: 'app-squad-3', name: 'Squad 3', type: 'Squad' },
];

/** Seed the apparatus roster meta row if absent. True when seeded. */
export async function seedApparatusRoster(db: FieldShoreDB = defaultDb): Promise<boolean> {
  const row = await db.meta.get(APPARATUS_ROSTER_KEY);
  if (row) return false;
  await db.meta.put({ key: APPARATUS_ROSTER_KEY, value: JSON.stringify(SEED_ROSTER) });
  return true;
}

/** Seed the inventory table if (and only if) it is empty. True when seeded. */
export async function seedIfEmpty(db: FieldShoreDB = defaultDb): Promise<boolean> {
  try {
    return await db.transaction('rw', db.inventory, async () => {
      const count = await db.inventory.count();
      if (count > 0) return false;
      await db.inventory.bulkAdd(buildSeedInventory());
      return true;
    });
  } catch (err) {
    // Seeding is a first-run convenience, not a hard requirement — an empty
    // inventory is a viable department. A storage/quota failure here must not
    // dead-end boot (audit W6); a DB that truly can't open still rejects upstream.
    console.error('seedIfEmpty failed — booting with empty inventory:', err);
    return false;
  }
}
