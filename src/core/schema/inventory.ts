import { z } from 'zod';
import { System } from './common';

// A stock record: how many of one item one apparatus carries (quantity-based
// cache, not an asset serial — 40-inventory.md). This is the PERSISTED shape
// (Dexie row and, plus `lastWriteAt`, the cloud row). It carries no `available`:
// ADR-041 derives stock from the event log — `held` = tracked BOM components on
// points that still hold equipment, `available = quantity − held` (StockRow below).
// A stored counter two devices mutate independently diverges by construction, so
// it is never persisted again. z.object strips unknown keys, so parsing a legacy
// row that still carries `available` drops the vestigial field.
export const InventoryItem = z.object({
  id: z.string(),
  type: z.enum(['strut', 'extension', 'plate']),
  model: z.string().optional(), // struts — Paratech model, resolves against STRUTS
  system: System.optional(), // struts + extensions
  length: z.number().int().optional(), // extensions — length in inches
  plateId: z.string().optional(), // plates — BASE_PLATES id
  apparatus: z.string(), // human-readable rig name, e.g. "Rescue 2"
  apparatusId: z.string(),
  quantity: z.number().int().nonnegative(),
  // Cloud-sync Increment 3: last-write-wins stamp (epoch ms). Set only by MANUAL stock
  // edits (the inventoryStore choke point) — deploy/return are events and never touch
  // the row. Optional: seeded / migrated / pre-Increment-3 rows have none (treated as
  // oldest on sync).
  lastWriteAt: z.number().int().nonnegative().optional(),
});
export type InventoryItem = z.infer<typeof InventoryItem>;

export const Inventory = z.array(InventoryItem);
export type Inventory = z.infer<typeof Inventory>;

/**
 * The derived stock VIEW of one row (ADR-041): `held` units are out on scene per the
 * folded event log, `available = quantity − held`. Signed on purpose — a negative
 * value is the over-allocated tell (two offline deploys of the last unit both stand,
 * D2). Never persisted; consumers that need a non-negative count clamp at their own
 * boundary (the selection engine does).
 */
export type StockRow = InventoryItem & { held: number; available: number };
