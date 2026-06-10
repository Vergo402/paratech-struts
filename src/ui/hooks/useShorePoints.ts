import { useStore } from 'zustand';
import type { ShorePoint } from '@core/schema';
import { operationStore } from '@data/store';

/** The active operation's shore points, in insertion order. */
export function useShorePoints(): ShorePoint[] {
  return useStore(operationStore.store, (s) => s.shorePoints);
}
