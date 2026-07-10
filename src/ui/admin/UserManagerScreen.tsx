import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { InlineSegmented } from '@ui/picker';
import { Button, EmptyState, Modal } from '@ui/primitives';
import { useDepartment, usePermissions, useRoles, useSession, useUserManager } from '@ui/hooks';
import {
  ADMIN_ROLE_ID,
  DEFAULT_ROLE_ID,
  ADMIN_PERMISSIONS,
  DEFAULT_PERMISSIONS,
  type Permissions,
  type Role,
} from '@core/schema';
import { permissionSummary } from './permissionSummary';
import { AssignRoleSheet } from './AssignRoleSheet';
import { BackIcon, LockIcon } from './icons';
import { RoleEditorSheet } from './RoleEditorSheet';
import './admin.css';

type Face = 'members' | 'roles';
const FACE_OPTIONS = [
  { value: 'members' as const, label: 'Members' },
  { value: 'roles' as const, label: 'Roles' },
];

function ChevronIcon() {
  return (
    <svg className="fs-um-chevron" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M7 4l5 5-5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function roleTone(roleId: string): 'admin' | 'default' | 'custom' {
  if (roleId === ADMIN_ROLE_ID) return 'admin';
  if (roleId === DEFAULT_ROLE_ID) return 'default';
  return 'custom';
}

export function UserManagerScreen() {
  const perms = usePermissions();
  const navigate = useNavigate();
  const roles = useRoles();
  const { identity } = useSession();
  const um = useUserManager();

  const { inviteCode } = useDepartment();

  const [face, setFace] = useState<Face>('members');
  const [assignTo, setAssignTo] = useState<{ uid: string; name: string; role: string; rank: string } | null>(null);
  const [roleEditor, setRoleEditor] = useState<{ role: Role | null } | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<{ uid: string; name: string } | null>(null);
  const [deleteRoleTarget, setDeleteRoleTarget] = useState<Role | null>(null);
  // #426 — a failed governance action must say so, inline, in the surface that
  // asked (no toast — Principle 9). Each error clears when its surface closes.
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [deleteRoleError, setDeleteRoleError] = useState<string | null>(null);
  const [reactivateError, setReactivateError] = useState<{ uid: string; reason: string } | null>(null);
  // #423 — the regenerate confirm.
  const [regenOpen, setRegenOpen] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);

  const ownUid = identity.kind === 'member' ? identity.accountId : null;

  // The role list (Admin, Default, then customs alpha). Built-ins fall back to constants
  // when the roles table hasn't synced yet, so the picker is never empty.
  const roleList = useMemo<Role[]>(() => {
    const map: Record<string, Role> = { ...roles };
    if (!map[ADMIN_ROLE_ID]) map[ADMIN_ROLE_ID] = { id: ADMIN_ROLE_ID, name: 'Admin', builtIn: true, permissions: ADMIN_PERMISSIONS };
    if (!map[DEFAULT_ROLE_ID]) map[DEFAULT_ROLE_ID] = { id: DEFAULT_ROLE_ID, name: 'Default', builtIn: true, permissions: DEFAULT_PERMISSIONS };
    const customs = Object.values(map).filter((r) => r.id !== ADMIN_ROLE_ID && r.id !== DEFAULT_ROLE_ID);
    customs.sort((a, b) => a.name.localeCompare(b.name));
    return [map[ADMIN_ROLE_ID], map[DEFAULT_ROLE_ID], ...customs];
  }, [roles]);
  const roleById = useMemo(() => new Map(roleList.map((r) => [r.id, r])), [roleList]);

  const members = um.members;
  // Active admins drive the anti-lockout: the only active admin can't be demoted/revoked.
  const activeAdminUids = useMemo(
    () =>
      members
        ? Object.entries(members)
            .filter(([, m]) => m.role === ADMIN_ROLE_ID && m.active !== false)
            .map(([uid]) => uid)
        : [],
    [members],
  );
  const isLastAdmin = (uid: string) => activeAdminUids.length === 1 && activeAdminUids[0] === uid;
  const editingRole = roleEditor?.role ?? null; // the role open in the editor (null = create)

  const sortedMembers = useMemo(() => {
    if (!members) return [];
    return Object.entries(members).sort(([ua, ma], [ub, mb]) => {
      if (ua === ownUid) return -1;
      if (ub === ownUid) return 1;
      const ra = ma.active === false;
      const rb = mb.active === false;
      if (ra !== rb) return ra ? 1 : -1;
      return ma.displayName.localeCompare(mb.displayName);
    });
  }, [members, ownUid]);

  // Direct-URL backstop: the Settings gateway hides this from non-admins, but guard the
  // route too (someone typing /users, or a role downgraded mid-session).
  if (!perms.manageUsers) {
    return (
      <div className="fs-um">
        <EmptyState
          variant="upstream-blocked"
          headline="Admin access only"
          reason="Managing users and roles needs the “Manage users & roles” permission."
          action={{ label: 'Back to Settings', onPress: () => navigate({ to: '/settings/account' }) }}
        />
      </div>
    );
  }

  // #426 — capture the result (pre-#426 it was discarded: a denied revoke/
  // reactivate/delete looked like success); refresh the list only when the
  // write actually landed. Callers surface `reason` inline on failure.
  const actThenRefresh = async (fn: () => Promise<{ ok: boolean; reason?: string }>) => {
    const res = await fn();
    if (res.ok) await um.refresh();
    return res;
  };

  return (
    <div className="fs-um">
      <div className="fs-um-head">
        <button type="button" className="fs-um-back" aria-label="Back to Settings" onClick={() => navigate({ to: '/settings/account' })}>
          <BackIcon />
        </button>
        <h1 className="fs-um-title">User manager</h1>
      </div>

      <InlineSegmented label="View" options={FACE_OPTIONS} value={face} onChange={setFace} />

      {face === 'members' ? (
        <div>
          {members === null && um.membersError ? (
            <EmptyState
              variant="upstream-blocked"
              headline="Couldn’t load members"
              reason="Check your connection and try again."
              action={{ label: 'Retry', onPress: () => void um.refresh() }}
            />
          ) : members === null ? (
            <p className="fs-um-row-sub" style={{ padding: 'var(--space-3) 0' }}>Loading members…</p>
          ) : (
            <>
              <div className="fs-um-list">
                {sortedMembers.map(([uid, m]) => {
                  const revoked = m.active === false;
                  const isOwn = uid === ownUid;
                  const tone = roleTone(m.role);
                  const roleName = roleById.get(m.role)?.name ?? m.role;
                  const badge = (
                    <span className={`fs-um-rolebadge fs-um-rolebadge--${tone}`}>{roleName}</span>
                  );
                  if (revoked) {
                    return (
                      <div key={uid}>
                        <div className="fs-um-row is-revoked">
                          <span className="fs-um-row-main">
                            <span className="fs-um-row-name">{m.displayName}</span>
                          </span>
                          <span className="fs-um-row-right">
                            <span className="fs-um-revoked-mark">Revoked</span>
                            <button
                              type="button"
                              className="fs-um-reactivate"
                              onClick={async () => {
                                setReactivateError(null);
                                const res = await actThenRefresh(() => um.reactivateMember(uid));
                                if (!res.ok) {
                                  setReactivateError({ uid, reason: res.reason ?? 'That change could not be saved. Try again.' });
                                }
                              }}
                            >
                              Reactivate
                            </button>
                          </span>
                        </div>
                        {reactivateError?.uid === uid && (
                          <p role="alert" className="fs-um-row-error">{reactivateError.reason}</p>
                        )}
                      </div>
                    );
                  }
                  if (isOwn) {
                    return (
                      <div key={uid} className="fs-um-row">
                        <span className="fs-um-row-main">
                          <span className="fs-um-row-name">
                            {m.displayName} <span className="fs-um-you">· you</span>
                          </span>
                        </span>
                        <span className="fs-um-row-right">{badge}</span>
                      </div>
                    );
                  }
                  return (
                    <button
                      key={uid}
                      type="button"
                      className="fs-um-row"
                      onClick={() => setAssignTo({ uid, name: m.displayName, role: m.role, rank: m.rank ?? '' })}
                    >
                      <span className="fs-um-row-main">
                        <span className="fs-um-row-name">{m.displayName}</span>
                      </span>
                      <span className="fs-um-row-right">
                        {badge}
                        <ChevronIcon />
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="fs-um-foot">
                <LockIcon /> The last Admin can&rsquo;t be revoked or demoted
              </p>
              {/* #423 — invite-code lifecycle. Regenerate kills the old code (a
                  leaked code is revocable on scene) and issues a new one. */}
              {inviteCode && (
                <div className="fs-um-invite">
                  <h2 className="fs-um-invite-label">Invite code</h2>
                  <div className="fs-um-invite-row">
                    <span className="fs-um-invite-code">{inviteCode}</span>
                    <Button variant="secondary" size="standard" onPress={() => setRegenOpen(true)}>
                      Regenerate
                    </Button>
                  </div>
                  <p className="fs-um-invite-sub">
                    Regenerating kills this code immediately — anyone holding the old code can no longer join.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div>
          <div className="fs-um-list">
            {roleList.map((r) => {
              const locked = r.id === ADMIN_ROLE_ID; // Admin is fixed
              const tag = r.id === ADMIN_ROLE_ID ? 'built-in' : r.id === DEFAULT_ROLE_ID ? 'built-in · editable' : null;
              const inner = (
                <>
                  <span className="fs-um-row-main">
                    <span className="fs-um-row-name">{r.name}</span>
                    <span className="fs-um-row-sub">{permissionSummary(r.permissions)}</span>
                  </span>
                  <span className="fs-um-row-right">
                    {tag && <span className="fs-um-tag">{tag}</span>}
                    {!locked && <ChevronIcon />}
                  </span>
                </>
              );
              return locked ? (
                <div key={r.id} className="fs-um-row">{inner}</div>
              ) : (
                <button key={r.id} type="button" className="fs-um-row" onClick={() => setRoleEditor({ role: r })}>
                  {inner}
                </button>
              );
            })}
          </div>
          <div className="fs-um-create">
            <Button variant="primary" size="standard" onPress={() => setRoleEditor({ role: null })}>
              + Create role
            </Button>
          </div>
        </div>
      )}

      <AssignRoleSheet
        open={assignTo !== null}
        onClose={() => setAssignTo(null)}
        member={assignTo}
        roleList={roleList}
        isLastAdmin={assignTo ? isLastAdmin(assignTo.uid) : false}
        isSelf={assignTo !== null && assignTo.uid === ownUid}
        onAssign={async (roleId) => {
          const res = await um.assignRole(assignTo!.uid, roleId);
          if (res.ok) await um.refresh();
          return res;
        }}
        onSetRank={async (rank) => {
          const res = await um.setMemberRank(assignTo!.uid, rank);
          if (res.ok) await um.refresh();
          return res;
        }}
        onRequestRevoke={() => {
          if (assignTo) setRevokeTarget({ uid: assignTo.uid, name: assignTo.name });
          setAssignTo(null);
        }}
      />

      <RoleEditorSheet
        open={roleEditor !== null}
        onClose={() => setRoleEditor(null)}
        role={editingRole}
        onSubmit={(name, permissions: Permissions) =>
          editingRole ? um.editRole(editingRole.id, { name, permissions }) : um.createRole(name, permissions)
        }
        onRequestDelete={
          editingRole && !editingRole.builtIn
            ? () => {
                setDeleteRoleTarget(editingRole);
                setRoleEditor(null);
              }
            : undefined
        }
      />

      <Modal
        open={revokeTarget !== null}
        onClose={() => {
          setRevokeTarget(null);
          setRevokeError(null);
        }}
        title="Revoke access?"
        variant="destructive"
        footer={
          <>
            <Button
              variant="secondary"
              onPress={() => {
                setRevokeTarget(null);
                setRevokeError(null);
              }}
            >
              <span data-modal-cancel>Cancel</span>
            </Button>
            <Button
              variant="primary"
              destructive
              onPress={async () => {
                if (!revokeTarget) return;
                setRevokeError(null);
                const res = await actThenRefresh(() => um.revokeMember(revokeTarget.uid));
                // #426 — a failed revoke stays open and says so; closing on failure
                // read as "revoked" while the member could still sign in.
                if (res.ok) setRevokeTarget(null);
                else setRevokeError(res.reason ?? 'That change could not be saved. Try again.');
              }}
            >
              Revoke access
            </Button>
          </>
        }
      >
        <p>
          <strong>{revokeTarget?.name}</strong> loses access immediately. Their record stays in the department
          (marked revoked) so the activity log stays readable — you can reactivate them later.
        </p>
        {revokeError && <p role="alert" className="fs-modal-error">{revokeError}</p>}
      </Modal>

      <Modal
        open={deleteRoleTarget !== null}
        onClose={() => {
          setDeleteRoleTarget(null);
          setDeleteRoleError(null);
        }}
        title="Delete role?"
        variant="destructive"
        footer={
          <>
            <Button
              variant="secondary"
              onPress={() => {
                setDeleteRoleTarget(null);
                setDeleteRoleError(null);
              }}
            >
              <span data-modal-cancel>Cancel</span>
            </Button>
            <Button
              variant="primary"
              destructive
              onPress={async () => {
                if (!deleteRoleTarget) return;
                setDeleteRoleError(null);
                const res = await actThenRefresh(() => um.deleteRole(deleteRoleTarget.id));
                if (res.ok) setDeleteRoleTarget(null);
                else setDeleteRoleError(res.reason ?? 'That change could not be saved. Try again.');
              }}
            >
              Delete role
            </Button>
          </>
        }
      >
        <p>
          Anyone holding <strong>{deleteRoleTarget?.name}</strong> moves to the Default role. This can&rsquo;t be undone.
        </p>
        {deleteRoleError && <p role="alert" className="fs-modal-error">{deleteRoleError}</p>}
      </Modal>

      <Modal
        open={regenOpen}
        onClose={() => {
          setRegenOpen(false);
          setRegenError(null);
        }}
        title="Regenerate invite code?"
        variant="destructive"
        footer={
          <>
            <Button
              variant="secondary"
              onPress={() => {
                setRegenOpen(false);
                setRegenError(null);
              }}
            >
              <span data-modal-cancel>Cancel</span>
            </Button>
            <Button
              variant="primary"
              destructive
              onPress={async () => {
                setRegenError(null);
                const res = await um.regenerateInviteCode();
                // The new code shows in the section below (reactive via useDepartment).
                if (res.ok) setRegenOpen(false);
                else setRegenError(res.reason ?? 'That change could not be saved. Try again.');
              }}
            >
              Regenerate
            </Button>
          </>
        }
      >
        <p>
          The current code <strong>{inviteCode}</strong> stops working immediately — anyone holding it can no
          longer join. A new code is issued in its place.
        </p>
        {regenError && <p role="alert" className="fs-modal-error">{regenError}</p>}
      </Modal>
    </div>
  );
}
