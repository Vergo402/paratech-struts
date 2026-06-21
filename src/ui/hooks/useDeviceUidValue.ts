import { useQuery } from '@tanstack/react-query';
import { useDeviceUid } from './useDeviceUid';

/** The resolved per-device uid (undefined until it resolves) — for synchronous
 *  gating (e.g. IC-only org editing). Shares the cached ['device-uid'] query with
 *  useRoleHistory / useShorePointHistory; resolves once (staleTime Infinity). */
export function useDeviceUidValue(): string | undefined {
  const getUid = useDeviceUid();
  return useQuery<string>({ queryKey: ['device-uid'], queryFn: () => getUid(), staleTime: Infinity }).data;
}
