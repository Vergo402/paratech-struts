import { rootPosition, pathToRoot } from '@core/org';
import { Sheet, Button } from '@ui/primitives';
import { useOrg, useMyRole, useCommandSelf } from '@ui/hooks';
import { useOrgCommit } from './useOrgCommit';

/** My Role — self-declare the ICS position you're filling (separate from the IC's
 *  authoritative assignment; the two may diverge by design). A member's role follows
 *  their account across devices; a guest's is per-device. Anyone may set it. */
export function MyRoleSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const positions = useOrg();
  const emit = useOrgCommit();
  const { selfKey } = useCommandSelf();
  const myRoleId = useMyRole(selfKey ?? undefined);
  const root = rootPosition(positions);

  // List positions in tree order (root first), each with its parent for context.
  const ordered = root
    ? Object.values(positions).sort((a, b) => pathToRoot(positions, a.id).length - pathToRoot(positions, b.id).length)
    : [];

  const set = (positionId: string | null) => {
    emit({ type: 'MyRoleSet', positionId });
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="My role">
      <p className="fs-myrole-note">Declare the ICS position you are filling.</p>
      <ul className="fs-assign-list">
        {ordered.map((p) => (
          <li key={p.id}>
            <button type="button" className={`fs-assign-row${p.id === myRoleId ? ' is-on' : ''}`} onClick={() => set(p.id)}>
              <span className="fs-assign-name">
                {p.title}
                {p.parentId != null && positions[p.parentId] != null && (
                  <span className="fs-assign-sub">under {positions[p.parentId]?.title}</span>
                )}
              </span>
              <span className="fs-assign-meta">{p.id === myRoleId ? 'My role' : ''}</span>
            </button>
          </li>
        ))}
      </ul>
      {myRoleId && (
        <Button variant="tertiary" size="standard" onPress={() => set(null)}>
          Clear my role
        </Button>
      )}
    </Sheet>
  );
}
