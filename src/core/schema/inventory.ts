import { z } from 'zod';
import { System } from './common';

// A stock record: how many of one item one apparatus carries (quantity-based
// cache, not an asset serial — 40-inventory.md). `available` is what's not
// currently deployed; the L-8 invariant `available ≤ quantity` and abort-on-
// missing-node live in data/store's inventoryStore.commit.
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
  available: z.number().int().nonnegative(),
});
export type InventoryItem = z.infer<typeof InventoryItem>;

export const Inventory = z.array(InventoryItem);
export type Inventory = z.infer<typeof Inventory>;
