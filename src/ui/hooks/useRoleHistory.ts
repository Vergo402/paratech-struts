import { useQuery } from '@tanstack/react-query';
import type { FieldShoreEvent } from '@core/schema';
import { operationStore } from '@data/store';
import { useDeviceUid } from './useDeviceUid';

// Org/command role history read (#323) — the cold path over the retained event log,
// the readShorePointHistory/useShorePointHistory pattern. Refetched on open
// (staleTime 0). Also resolves the device uid so the caller can render "who" as this
// device vs another (auth deferred; `by` is a per-device uid, never shown raw).

export interface RoleHistory {
  events: FieldShoreEvent[];
  /** The current device's uid, for the "who" degrade; undefined until resolved. */
  deviceUid: string | undefined;
}

/** Org/command history for an op (omit positionId) or one node (pass it), append-
 *  ordered, + the device uid. Disabled until opId is set. */
export function useRoleHistory(opId: string | null, positionId?: string): RoleHistory {
  const getUid = useDeviceUid();
  const events = useQuery<FieldShoreEvent[]>({
    queryKey: ['role-history', opId, positionId ?? null],
    queryFn: () => operationStore.readRoleHistory(opId!, positionId),
    enabled: opId != null,
    staleTime: 0,
  });
  const uid = useQuery<string>({
    queryKey: ['device-uid'],
    queryFn: () => getUid(),
    staleTime: Infinity,
  });
  return { events: events.data ?? [], deviceUid: uid.data };
}
