import { useStore } from 'zustand';
import type { OrgPositions } from '@core/schema';
import { operationStore } from '@data/store';

/** The active operation's ICS org chart — the keyed position tree (#323).
 *  Synchronous read of committed in-memory state (L-4 hot path). Components call the
 *  pure helpers (childrenOf, spanOfControl, currentIC) from @core/org over this. */
export function useOrg(): OrgPositions {
  return useStore(operationStore.store, (s) => s.positions);
}
