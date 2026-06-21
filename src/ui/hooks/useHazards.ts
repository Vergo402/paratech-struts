import { useStore } from 'zustand';
import type { Hazards } from '@core/schema';
import { operationStore } from '@data/store';

/** The active operation's ICS-208 hazard register, keyed by id (#296). Components
 *  call openHazardsBySeverity / hazardsForDivision from @core/hazard over this.
 *  Synchronous read of committed in-memory state (L-4 hot path). */
export function useHazards(): Hazards {
  return useStore(operationStore.store, (s) => s.hazards);
}
