import { useQuery } from '@tanstack/react-query';
import type { FieldShoreEvent } from '@core/schema';
import { operationStore } from '@data/store';
import { useDeviceUid } from './useDeviceUid';
import { NO_OUTCOMES, type EventOutcome } from './outcomes';

// Quick View timeline read (ADR-019 / ADR-033). Cold path over the retained event
// log — refetched on drawer open (staleTime 0). Also resolves the current device
// uid so the caller can render "who" as this device / another device (auth is
// deferred; `by` is a per-device uid, never shown raw).

export interface ShorePointHistory {
  events: FieldShoreEvent[];
  /** Per-event verdict (#499): 'no-effect' = the change lost a race and never took effect. */
  outcomes: ReadonlyMap<string, EventOutcome>;
  /** The current device's uid, for the "who" degrade; undefined until resolved. */
  deviceUid: string | undefined;
}

/** Every event touching one shore point, append-ordered, + the device uid.
 *  Disabled until an id is set. */
export function useShorePointHistory(spId: string | null): ShorePointHistory {
  const getUid = useDeviceUid();
  const events = useQuery<{ events: FieldShoreEvent[]; outcomes: ReadonlyMap<string, EventOutcome> }>({
    queryKey: ['sp-history', spId],
    queryFn: async () => {
      const events = await operationStore.readShorePointHistory(spId!);
      // Read the outcomes AFTER the events, so every returned event has a verdict (#499).
      return { events, outcomes: operationStore.outcomes() };
    },
    enabled: spId != null,
    staleTime: 0,
  });
  const uid = useQuery<string>({
    queryKey: ['device-uid'],
    queryFn: () => getUid(),
    staleTime: Infinity,
  });
  return { events: events.data?.events ?? [], outcomes: events.data?.outcomes ?? NO_OUTCOMES, deviceUid: uid.data };
}
