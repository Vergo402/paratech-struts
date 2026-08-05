import { useEffect, useState } from 'react';
import { Sheet, Button, TextField } from '@ui/primitives';
import { BottomSheetPicker, type SheetPickerOption } from '@ui/picker';
import { ADMIN_ROLE_ID, type Apparatus, type Member, type Role } from '@core/schema';
import type { AdminMutationResult, MemberProfilePatch } from '@ui/hooks';
import { KeyIcon } from './icons';

/**
 * MemberEditSheet (#439, grown from the P4 AssignRoleSheet) — one sheet for
 * everything an admin does to a member: the role picker (with the last-admin /
 * self-demotion guards, verbatim from P4), the full profile (name, rank, rig,
 * badge, phone, certifications — one Save via setMemberProfile), the sign-in
 * email (a privileged server op, saved with the same button), and the two
 * account actions: Reset password to starter (confirmed in the screen's modal)
 * and Revoke access.
 */
export interface MemberEditSheetProps {
  open: boolean;
  onClose: () => void;
  member: { uid: string; row: Member } | null;
  /** Ordered roles to pick from (Admin, Default, then customs). */
  roleList: Role[];
  /** The department's apparatus roster (rig assignment picker). */
  roster: Apparatus[];
  /** This member is the department's only ACTIVE admin → can't be demoted or revoked. */
  isLastAdmin: boolean;
  /** The member IS the signed-in viewer. The ADMIN_MANAGE rule forbids an admin
   *  demoting/revoking THEMSELVES (actor must differ from target) — mirror it. */
  isSelf: boolean;
  /**
   * The VIEWER holds the Admin role (not merely `manageUsers`). Two backend
   * facts this mirrors, so the sheet never offers what the backend denies:
   *   · J257-S7 — credential custody (reset password / change sign-in email) is
   *     Admin-only on the server (requireAdminForCredentialChange). Assuming a
   *     member's login assumes their ICS position, so this is not a back-office-
   *     only power.
   *   · #463 — the ADMIN_MANAGE rule has ALWAYS denied a non-Admin actor
   *     demoting, promoting-to-Admin, or revoking an Admin (adminLosingAdmin /
   *     adminGainingAdmin need an Admin actor). The sheet used to offer those
   *     controls anyway, so the click failed with a permission error. Now they
   *     are disabled with the real reason.
   */
  viewerIsAdmin: boolean;
  onAssign: (roleId: string) => Promise<AdminMutationResult>;
  onSaveProfile: (patch: MemberProfilePatch) => Promise<AdminMutationResult>;
  onChangeEmail: (email: string) => Promise<AdminMutationResult>;
  onRequestReset: () => void;
  onRequestRevoke: () => void;
}

function CheckIcon() {
  return (
    <svg className="fs-um-pick-check" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M4 9.5l3.2 3.2L14 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const LAST_ADMIN_REASON = 'Promote another member to Admin first';
const SELF_ADMIN_REASON = 'Another Admin must make this change';
// #463 — the rule text, spoken plainly. Both cases were previously offered and
// then denied by ADMIN_MANAGE at write time.
const TOUCH_ADMIN_REASON = 'Only an Admin can change an Admin';
const GRANT_ADMIN_REASON = 'Only an Admin can grant Admin';
const UNASSIGNED = '__none__';

export function MemberEditSheet({
  open,
  onClose,
  member,
  roleList,
  roster,
  isLastAdmin,
  isSelf,
  viewerIsAdmin,
  onAssign,
  onSaveProfile,
  onChangeEmail,
  onRequestReset,
  onRequestRevoke,
}: MemberEditSheetProps) {
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [rank, setRank] = useState('');
  const [apparatusId, setApparatusId] = useState(UNASSIGNED);
  const [badge, setBadge] = useState('');
  const [phone, setPhone] = useState('');
  const [certifications, setCertifications] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const row = member?.row ?? null;
  const targetIsAdmin = row?.role === ADMIN_ROLE_ID;
  // J257-S7 — password reset and sign-in-email change are the two credential ops;
  // the server refuses both for a non-Admin caller, so don't render them at all.
  const canChangeCredentials = viewerIsAdmin;
  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaving(false);
    setName(row?.displayName ?? '');
    setRank(row?.rank ?? '');
    setApparatusId(row?.apparatusId ?? UNASSIGNED);
    setBadge(row?.badge ?? '');
    setPhone(row?.phone ?? '');
    setCertifications(row?.certifications ?? '');
    setEmail(row?.email ?? '');
  }, [open, row]);

  const rigOptions: SheetPickerOption<string>[] = [
    { value: UNASSIGNED, label: 'Unassigned' },
    ...roster.map((a) => ({ value: a.id, label: a.name, sub: a.type })),
  ];

  const pick = async (roleId: string) => {
    const res = await onAssign(roleId);
    if (res.ok) onClose();
    else setError(res.reason ?? 'That change could not be saved.');
  };

  // Dirty tracking: absent optionals compare as '' (the field's cleared form).
  const was = (v: string | undefined) => v ?? '';
  const profileDirty =
    row !== null &&
    (name.trim() !== row.displayName ||
      rank.trim() !== was(row.rank) ||
      (apparatusId === UNASSIGNED ? '' : apparatusId) !== was(row.apparatusId) ||
      badge.trim() !== was(row.badge) ||
      phone.trim() !== was(row.phone) ||
      certifications.trim() !== was(row.certifications));
  // Hidden for a non-Admin viewer (J257-S7) — pinned false so no stale draft can
  // ride along into save() and hit the server's credential guard.
  const emailDirty =
    canChangeCredentials && row !== null && email.trim() !== was(row.email) && email.trim() !== '';
  const dirty = profileDirty || emailDirty;

  const save = async () => {
    setError(null);
    setSaving(true);
    if (profileDirty) {
      const res = await onSaveProfile({
        displayName: name,
        rank,
        apparatusId: apparatusId === UNASSIGNED ? '' : apparatusId,
        badge,
        phone,
        certifications,
      });
      if (!res.ok) {
        setSaving(false);
        setError(res.reason ?? 'That change could not be saved.');
        return;
      }
    }
    if (emailDirty) {
      const res = await onChangeEmail(email);
      if (!res.ok) {
        setSaving(false);
        // Honest partial state: the profile half (if any) already saved.
        setError(
          (profileDirty ? 'Profile saved, but the email change failed: ' : '') +
            (res.reason ?? 'That change could not be saved.'),
        );
        return;
      }
    }
    setSaving(false);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Member">
      <p className="fs-um-sheet-help">{row?.displayName}</p>

      <div className="fs-um-list" style={{ borderBottom: 'none' }}>
        {roleList.map((r) => {
          const isCurrent = row?.role === r.id;
          // The last active admin can't be moved off Admin, and an admin can't
          // demote THEMSELVES (both enforced by the ADMIN_MANAGE rule too).
          const selfAdminBlocked = isSelf && row?.role === ADMIN_ROLE_ID && r.id !== ADMIN_ROLE_ID;
          // #463 — a non-Admin viewer can neither move an Admin off Admin
          // (adminLosingAdmin) nor promote anyone to Admin (adminGainingAdmin).
          const demoteAdminBlocked = !viewerIsAdmin && targetIsAdmin && r.id !== ADMIN_ROLE_ID;
          const grantAdminBlocked = !viewerIsAdmin && !targetIsAdmin && r.id === ADMIN_ROLE_ID;
          const blocked =
            (isLastAdmin && r.id !== ADMIN_ROLE_ID) ||
            selfAdminBlocked ||
            demoteAdminBlocked ||
            grantAdminBlocked;
          const reason = grantAdminBlocked
            ? GRANT_ADMIN_REASON
            : demoteAdminBlocked
              ? TOUCH_ADMIN_REASON
              : selfAdminBlocked && !isLastAdmin
                ? SELF_ADMIN_REASON
                : LAST_ADMIN_REASON;
          return (
            <button
              key={r.id}
              type="button"
              className={`fs-um-pick${isCurrent ? ' is-current' : ''}`}
              disabled={blocked || isCurrent}
              onClick={() => void pick(r.id)}
            >
              <span className="fs-um-row-main">
                <span className="fs-um-row-name">{r.name}</span>
                {blocked && <span className="fs-um-pick-reason">{reason}</span>}
              </span>
              {isCurrent && <CheckIcon />}
            </button>
          );
        })}
      </div>

      <div className="fs-um-form" style={{ marginTop: 'var(--space-4)' }}>
        <TextField label="Name" value={name} onChange={setName} maxLength={80} />
        <TextField label="Rank / title" value={rank} onChange={setRank} maxLength={80} placeholder="e.g. Captain, Rescue Specialist" />
        <BottomSheetPicker label="Apparatus" options={rigOptions} value={apparatusId} onSelect={setApparatusId} />
        {canChangeCredentials && (
          <TextField
            label="Email — their sign-in"
            value={email}
            onChange={setEmail}
            maxLength={120}
            inputMode="text"
            helper="Changing this signs them out everywhere; they sign back in with the new email."
          />
        )}
        <TextField label="Badge / ID" value={badge} onChange={setBadge} maxLength={40} />
        <TextField label="Phone" value={phone} onChange={setPhone} maxLength={40} inputMode="numeric" />
        <TextField label="Certifications" value={certifications} onChange={setCertifications} maxLength={500} />
      </div>

      {dirty && (
        <div style={{ marginTop: 'var(--space-3)' }}>
          <Button variant="primary" size="standard" disabled={saving} onPress={() => void save()}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      )}

      {error && <p className="fs-um-sheet-error" role="alert">{error}</p>}

      <div className="fs-um-account-actions">
        {canChangeCredentials && (
          <Button variant="tertiary" size="standard" onPress={onRequestReset}>
            <span className="fs-um-reset-label">
              <KeyIcon /> Reset password to starter
            </span>
          </Button>
        )}
        <Button
          variant="tertiary"
          destructive
          size="standard"
          onPress={onRequestRevoke}
          // #463 — revoking an Admin needs an Admin actor (adminLosingAdmin
          // treats a deactivation as losing admin), so a non-Admin viewer is
          // told why instead of hitting a permission error.
          disabled={isLastAdmin || (isSelf && targetIsAdmin) || (!viewerIsAdmin && targetIsAdmin)}
          disabledReason={
            isLastAdmin
              ? LAST_ADMIN_REASON
              : isSelf && targetIsAdmin
                ? SELF_ADMIN_REASON
                : !viewerIsAdmin && targetIsAdmin
                  ? TOUCH_ADMIN_REASON
                  : undefined
          }
        >
          Revoke access
        </Button>
      </div>
    </Sheet>
  );
}
