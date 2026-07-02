import { useEffect } from 'react';
import { useStore } from 'zustand';
import { peerCutStore } from '@data/sync';

/**
 * usePeerCuts — the count of cuts that arrived in the cutting queue from ANOTHER
 * device since the cutter last cleared it (#404). Drives the Cutting Station's
 * "N new" header badge. Clears on unmount so each visit reflects only arrivals since
 * the cutter last left the station (the ui/hooks layer owns the data-store reset,
 * keeping the presentational Cutting Station free of a @data import — invariant 3).
 */
export function usePeerCuts(): number {
  const count = useStore(peerCutStore.store, (s) => s.count);
  useEffect(() => () => peerCutStore.reset(), []);
  return count;
}
