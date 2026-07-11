import { useQuery } from '@tanstack/react-query';
import { useStore } from 'zustand';
import { sessionStore } from '@data/store';
import { departmentService } from '@data/dept';

// The member-readable department roster ({ accountId, displayName }) for the command-
// transfer + position pickers — hand a role to a specific PERSON (account) so it follows
// them across devices. Cold-read + cached (roster changes rarely), keyed by dept. Empty
// for a guest / offline. Excludes the current account when `excludeSelf` (a transfer
// target is someone ELSE); the caller filters the current IC separately.
export function useRoster(excludeSelf = false): { id: string; displayName: string }[] {
  const deptId = useStore(sessionStore.store, (s) => s.departmentId);
  const identity = useStore(sessionStore.store, (s) => s.identity);
  const myId = identity.kind === 'member' ? identity.accountId : null;
  const { data } = useQuery<{ id: string; displayName: string }[]>({
    queryKey: ['dept-roster', deptId],
    queryFn: () => departmentService.readRoster(),
    enabled: deptId != null,
    staleTime: 60_000,
  });
  const roster = data ?? [];
  return excludeSelf && myId ? roster.filter((m) => m.id !== myId) : roster;
}
