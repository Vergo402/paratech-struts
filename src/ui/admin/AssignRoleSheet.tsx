import { useEffect, useState } from 'react';
import { Sheet, Button, TextField } from '@ui/primitives';
import { ADMIN_ROLE_ID, type Role } from '@core/schema';
import type { AdminMutationResult } from '@ui/hooks';

export interface AssignRoleSheetProps {
  open: boolean;
  onClose: () => void;
  member: { uid: string; name: string; role: string; rank: string } | null;
  /** Ordered roles to pick from (Admin, Default, then customs). */
  roleList: Role[];
  /** This member is the department's only ACTIVE admin → can't be demoted or revoked. */
  isLastAdmin: boolean;
  /** The member IS the signed-in viewer. The ADMIN_MANAGE rule forbids an admin
   *  demoting/revoking THEMSELVES (actor must differ from target) regardless of
   *  admin count — mirror it so the sheet never offers a write the rules deny.
   *  Defense-in-depth: the screen renders the own row non-clickable today. */
  isSelf: boolean;
  onAssign: (roleId: string) => Promise<AdminMutationResult>;
  /** Set this member's rank/title (manageUsers-gated; #321 inc3). */
  onSetRank: (rank: string) => Promise<AdminMutationResult>;
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

export function AssignRoleSheet({
  open,
  onClose,
  member,
  roleList,
  isLastAdmin,
  isSelf,
  onAssign,
  onSetRank,
  onRequestRevoke,
}: AssignRoleSheetProps) {
  const [error, setError] = useState<string | null>(null);
  const [rankDraft, setRankDraft] = useState('');
  const [savingRank, setSavingRank] = useState(false);
  useEffect(() => {
    if (open) {
      setError(null);
      setRankDraft(member?.rank ?? '');
    }
  }, [open, member]);

  const pick = async (roleId: string) => {
    const res = await onAssign(roleId);
    if (res.ok) onClose();
    else setError(res.reason ?? 'That change could not be saved.');
  };

  const rankDirty = rankDraft.trim() !== (member?.rank ?? '').trim();
  const saveRank = async () => {
    setError(null);
    setSavingRank(true);
    const res = await onSetRank(rankDraft);
    setSavingRank(false);
    if (res.ok) onClose();
    else setError(res.reason ?? 'That change could not be saved.');
  };

  return (
    <Sheet open={open} onClose={onClose} title="Assign role">
      <p className="fs-um-sheet-help">{member?.name}</p>

      <div className="fs-um-list" style={{ borderBottom: 'none' }}>
        {roleList.map((r) => {
          const isCurrent = member?.role === r.id;
          // The last active admin can't be moved off Admin, and an admin can't
          // demote THEMSELVES (both enforced by the ADMIN_MANAGE rule too).
          const selfAdminBlocked = isSelf && member?.role === ADMIN_ROLE_ID && r.id !== ADMIN_ROLE_ID;
          const blocked = (isLastAdmin && r.id !== ADMIN_ROLE_ID) || selfAdminBlocked;
          const reason = selfAdminBlocked && !isLastAdmin ? SELF_ADMIN_REASON : LAST_ADMIN_REASON;
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

      <div style={{ marginTop: 'var(--space-4)' }}>
        <TextField
          label="Rank / title"
          value={rankDraft}
          onChange={setRankDraft}
          maxLength={80}
          placeholder="e.g. Captain, Rescue Specialist"
          helper="Shown next to this member's name on the roster and audit log."
        />
        {rankDirty && (
          <div style={{ marginTop: 'var(--space-3)' }}>
            <Button variant="primary" size="standard" disabled={savingRank} onPress={() => void saveRank()}>
              {savingRank ? 'Saving…' : 'Save rank'}
            </Button>
          </div>
        )}
      </div>

      {error && <p className="fs-um-sheet-error" role="alert">{error}</p>}

      <div className="fs-um-revoke-row">
        <Button
          variant="tertiary"
          destructive
          size="standard"
          onPress={onRequestRevoke}
          disabled={isLastAdmin || (isSelf && member?.role === ADMIN_ROLE_ID)}
          disabledReason={
            isLastAdmin ? LAST_ADMIN_REASON : isSelf && member?.role === ADMIN_ROLE_ID ? SELF_ADMIN_REASON : undefined
          }
        >
          Revoke access
        </Button>
      </div>
    </Sheet>
  );
}
