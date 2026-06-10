import { useStore } from 'zustand';
import type { InventoryItem } from '@core/schema';
import { inventoryStore } from '@data/store';

/** The full inventory (all apparatus), mirrored from the durable table. */
export function useInventory(): InventoryItem[] {
  return useStore(inventoryStore.store, (s) => s.items);
}
