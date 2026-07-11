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
  setMemberRank: typeof departmentService.setMemberRank;
  revokeMember: typeof departmentService.revokeMember;
  reactivateMember: typeof departmentService.reactivateMember;
  createRole: typeof departmentService.createRole;
  editRole: typeof departmentService.editRole;
  deleteRole: typeof departmentService.deleteRole;
  revokeInviteCode: typeof departmentService.revokeInviteCode;
  regenerateInviteCode: typeof departmentService.regenerateInviteCode;
  // ---- #439 admin-provisioned personnel ----
  provisionMember: typeof departmentService.provisionMember;
  setMemberProfile: typeof departmentService.setMemberProfile;
  changeMemberEmail: typeof departmentService.changeMemberEmail;
  resetMemberPassword: typeof departmentService.resetMemberPassword;
}

export function useUserManager(enabled = true): UserManagerApi {
  const [members, setMembers] = useState<Record<string, Member> | null>(null);
  const [membersError, setMembersError] = useState(false);

  // `enabled` (default true — the User Manager screen passes nothing) lets the Audit Log
  // borrow the members read ONLY for an admin viewer, so a non-admin never fires a denied read.
  const refresh = useCallback(async () => {
    if (!enabled) {
      setMembersError(false);
      setMembers(null);
      return;
    }
    setMembersError(false);
    const m = await departmentService.readMembers();
    if (m === null) {
      setMembersError(true);
      setMembers(null);
    } else {
      setMembers(m);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    members,
    membersError,
    refresh,
    assignRole: departmentService.assignRole,
    setMemberRank: departmentService.setMemberRank,
    revokeMember: departmentService.revokeMember,
    reactivateMember: departmentService.reactivateMember,
    createRole: departmentService.createRole,
    editRole: departmentService.editRole,
    deleteRole: departmentService.deleteRole,
    revokeInviteCode: departmentService.revokeInviteCode,
    regenerateInviteCode: departmentService.regenerateInviteCode,
    provisionMember: departmentService.provisionMember,
    setMemberProfile: departmentService.setMemberProfile,
    changeMemberEmail: departmentService.changeMemberEmail,
    resetMemberPassword: departmentService.resetMemberPassword,
  };
}
