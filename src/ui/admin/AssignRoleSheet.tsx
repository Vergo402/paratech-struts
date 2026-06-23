import { useEffect, useState } from 'react';
import { Sheet, Button } from '@ui/primitives';
import { ADMIN_ROLE_ID, type Role } from '@core/schema';
import type { AdminMutationResult } from '@ui/hooks';

export interface AssignRoleSheetProps {
  open: boolean;
  onClose: () => void;
  member: { uid: string; name: string; role: string } | null;
  /** Ordered roles to pick from (Admin, Default, then customs). */
  roleList: Role[];
  /** This member is the department's only ACTIVE admin → can't be demoted or revoked. */
  isLastAdmin: boolean;
  onAssign: (roleId: string) => Promise<AdminMutationResult>;
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

export function AssignRoleSheet({
  open,
  onClose,
  member,
  roleList,
  isLastAdmin,
  onAssign,
  onRequestRevoke,
}: AssignRoleSheetProps) {
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  const pick = async (roleId: string) => {
    const res = await onAssign(roleId);
    if (res.ok) onClose();
    else setError(res.reason ?? 'That change could not be saved.');
  };

  return (
    <Sheet open={open} onClose={onClose} title="Assign role">
      <p className="fs-um-sheet-help">{member?.name}</p>

      <div className="fs-um-list" style={{ borderBottom: 'none' }}>
        {roleList.map((r) => {
          const isCurrent = member?.role === r.id;
          // The last active admin can't be moved off Admin (the rule enforces it too).
          const blocked = isLastAdmin && r.id !== ADMIN_ROLE_ID;
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
                {blocked && <span className="fs-um-pick-reason">{LAST_ADMIN_REASON}</span>}
              </span>
              {isCurrent && <CheckIcon />}
            </button>
          );
        })}
      </div>

      {error && <p className="fs-um-sheet-error" role="alert">{error}</p>}

      <div className="fs-um-revoke-row">
        <Button
          variant="tertiary"
          destructive
          size="standard"
          onPress={onRequestRevoke}
          disabled={isLastAdmin}
          disabledReason={isLastAdmin ? LAST_ADMIN_REASON : undefined}
        >
          Revoke access
        </Button>
      </div>
    </Sheet>
  );
}
