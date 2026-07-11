import { useQuery } from '@tanstack/react-query';
import { useStore } from 'zustand';
import { sessionStore } from '@data/store';
import { departmentService } from '@data/dept';
import type { ResolveDeviceOwner } from '@core/org';

// The device→account resolver (ADR-024 follow-up). Cold-reads the department's member-
// readable deviceOwners map ({ deviceUid → accountId }) and hands back a pure lookup the
// command gate / self checks use to recognise a legacy device-ref position as its owner's
// account. Bindings are near-static (written once per device on authenticated boot), so a
// cached cold read — not a live subscription — is enough; keyed by dept so a dept switch
// refetches. Empty map (offline / no bindings yet) → device-only matching, never a crash.
export function useDeviceOwners(): ResolveDeviceOwner {
  const deptId = useStore(sessionStore.store, (s) => s.departmentId);
  const { data } = useQuery<Record<string, string>>({
    queryKey: ['device-owners', deptId],
    queryFn: () => departmentService.readDeviceOwners(),
    enabled: deptId != null,
    staleTime: 5 * 60_000,
  });
  return (deviceUid: string) => data?.[deviceUid] ?? null;
}
