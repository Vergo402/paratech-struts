import { useQuery } from '@tanstack/react-query';
import type { FieldShoreEvent } from '@core/schema';
import { operationStore } from '@data/store';
import { useDeviceUid } from './useDeviceUid';
import { NO_OUTCOMES, type EventOutcome } from './outcomes';

// Org/command role history read (#323) — the cold path over the retained event log,
// the readShorePointHistory/useShorePointHistory pattern. Refetched on open
// (staleTime 0). Also resolves the device uid so the caller can render "who" as this
// device vs another (auth deferred; `by` is a per-device uid, never shown raw).

export interface RoleHistory {
  events: FieldShoreEvent[];
  /** Per-event verdict (#499): 'no-effect' = the change lost a race and never took effect. */
  outcomes: ReadonlyMap<string, EventOutcome>;
  /** The current device's uid, for the "who" degrade; undefined until resolved. */
  deviceUid: string | undefined;
}

/** Org/command history for an op (omit positionId) or one node (pass it), append-
 *  ordered, + the device uid. Disabled until opId is set. */
export function useRoleHistory(opId: string | null, positionId?: string): RoleHistory {
  const getUid = useDeviceUid();
  const events = useQuery<{ events: FieldShoreEvent[]; outcomes: ReadonlyMap<string, EventOutcome> }>({
    queryKey: ['role-history', opId, positionId ?? null],
    queryFn: async () => {
      const events = await operationStore.readRoleHistory(opId!, positionId);
      // Read the outcomes AFTER the events, so every returned event has a verdict (#499).
      return { events, outcomes: operationStore.outcomes() };
    },
    enabled: opId != null,
    staleTime: 0,
  });
  const uid = useQuery<string>({
    queryKey: ['device-uid'],
    queryFn: () => getUid(),
    staleTime: Infinity,
  });
  return { events: events.data?.events ?? [], outcomes: events.data?.outcomes ?? NO_OUTCOMES, deviceUid: uid.data };
}
