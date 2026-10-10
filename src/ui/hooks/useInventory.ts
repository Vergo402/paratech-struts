import { useStore } from 'zustand';
import type { StockRow } from '@core/schema';
import { inventoryStore } from '@data/store';

/** The full inventory (all apparatus) as the DERIVED stock view: each persisted row with
 *  `held` (units out on scene, from the folded event log) and the signed
 *  `available = quantity − held` (ADR-041; negative = over-allocated). */
export function useInventory(): StockRow[] {
  return useStore(inventoryStore.store, (s) => s.items);
}
