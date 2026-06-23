import { useCallback, useEffect, useState } from 'react';
import { departmentService } from '@data/dept';
import type { Member } from '@core/schema';

// The User Manager seam (#381) — the members cold-read (admin screen only, not an
// app-wide store) plus the governance actions, all behind @ui/hooks. Roles come from
// the live useRoles() (a separate sub). After any action the screen calls refresh() to
// re-read the members list. members === null means loading OR error (membersError tells
// them apart). The actions are the departmentService methods verbatim (each returns
// { ok, reason } and writes its own audit entry).

export interface UserManagerApi {
  members: Record<string, Member> | null;
  membersError: boolean;
  refresh: () => Promise<void>;
  assignRole: typeof departmentService.assignRole;
  revokeMember: typeof departmentService.revokeMember;
  reactivateMember: typeof departmentService.reactivateMember;
  createRole: typeof departmentService.createRole;
  editRole: typeof departmentService.editRole;
  deleteRole: typeof departmentService.deleteRole;
}

export function useUserManager(): UserManagerApi {
  const [members, setMembers] = useState<Record<string, Member> | null>(null);
  const [membersError, setMembersError] = useState(false);

  const refresh = useCallback(async () => {
    setMembersError(false);
    const m = await departmentService.readMembers();
    if (m === null) {
      setMembersError(true);
      setMembers(null);
    } else {
      setMembers(m);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    members,
    membersError,
    refresh,
    assignRole: departmentService.assignRole,
    revokeMember: departmentService.revokeMember,
    reactivateMember: departmentService.reactivateMember,
    createRole: departmentService.createRole,
    editRole: departmentService.editRole,
    deleteRole: departmentService.deleteRole,
  };
}
