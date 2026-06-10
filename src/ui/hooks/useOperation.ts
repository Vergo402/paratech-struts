import { useStore } from 'zustand';
import type { Operation } from '@core/schema';
import { operationStore } from '@data/store';

/** The active operation, or null before one is started. Synchronous read of
 *  committed in-memory state (L-4 hot path — never a fresh Dexie read). */
export function useOperation(): Operation | null {
  return useStore(operationStore.store, (s) => s.operation);
}
