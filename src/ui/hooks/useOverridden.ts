import { useMemo } from 'react';
import { useStore } from 'zustand';
import { describeOverridden, describeRejected, type OverriddenRow } from '@core/audit';
import { operationStore } from '@data/store';

export interface OverriddenApi {
  /** One row per of THIS device's changes the department server rejected (#471), newest
   *  first, then one per change that lost a race and had no effect (#499), newest first. */
  rows: OverriddenRow[];
  /** "Got it" — clears both lists. */
  acknowledge: () => void;
}

/** The losing-branch list behind the sync line. A live subscription over the store's
 *  `overridden` list; row copy is derived from the CURRENT projected state (shore points,
 *  org chart), so it re-derives when the board changes. The data layer owns the list. */
export function useOverridden(): OverriddenApi {
  const lost = useStore(operationStore.overridden, (s) => s.events);
  const rejected = useStore(operationStore.rejected, (s) => s.events);
  const state = useStore(operationStore.store, (s) => s);
  const rows = useMemo(() => {
    if (lost.length === 0 && rejected.length === 0) return [];
    const ctx = {
      shorePoints: state.shorePoints,
      positions: state.positions,
      events: operationStore.sortedEvents(),
      outcomes: operationStore.outcomes(),
    };
    return [...describeRejected(rejected, ctx), ...describeOverridden(lost, ctx)];
  }, [lost, rejected, state.shorePoints, state.positions]);
  return { rows, acknowledge: () => operationStore.acknowledgeOverridden() };
}
