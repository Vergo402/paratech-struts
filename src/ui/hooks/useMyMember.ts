import { useCallback, useEffect, useState } from 'react';
import { departmentService } from '@data/dept';
import type { Member } from '@core/schema';
import { useSession } from './useSession';

// The signed-in member's OWN row (#321 inc3) — a cold read of the members map (cascades
// from the dept .read, so any active member is allowed) selected to auth.uid. Powers the
// Account page profile (rank/title). member === null = loading/guest/not-in-a-dept.
export interface MyMemberApi {
  member: Member | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setRank: typeof departmentService.setRank;
}

export function useMyMember(): MyMemberApi {
  const { identity } = useSession();
  const uid = identity.kind === 'member' ? identity.accountId : null;
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!uid) {
      setMember(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const all = await departmentService.readMembers();
    setMember(all?.[uid] ?? null);
    setLoading(false);
  }, [uid]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { member, loading, refresh, setRank: departmentService.setRank };
}
