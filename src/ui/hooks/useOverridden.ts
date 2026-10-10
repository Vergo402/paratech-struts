import { useMemo } from 'react';
import { useStore } from 'zustand';
import { describeOverridden, type OverriddenRow } from '@core/audit';
import { operationStore } from '@data/store';

export interface OverriddenApi {
  /** One row per of THIS device's changes that lost a race and had no effect (#499), newest first. */
  rows: OverriddenRow[];
  /** "Got it" — clears the list. */
  acknowledge: () => void;
}

/** The losing-branch list behind the sync line. A live subscription over the store's
 *  `overridden` list; row copy is derived from the CURRENT projected state (shore points,
 *  org chart), so it re-derives when the board changes. The data layer owns the list. */
export function useOverridden(): OverriddenApi {
  const lost = useStore(operationStore.overridden, (s) => s.events);
  const state = useStore(operationStore.store, (s) => s);
  const rows = useMemo(
    () =>
      lost.length === 0
        ? []
        : describeOverridden(lost, {
            shorePoints: state.shorePoints,
            positions: state.positions,
            events: operationStore.sortedEvents(),
            outcomes: operationStore.outcomes(),
          }),
    [lost, state.shorePoints, state.positions],
  );
  return { rows, acknowledge: () => operationStore.acknowledgeOverridden() };
}
