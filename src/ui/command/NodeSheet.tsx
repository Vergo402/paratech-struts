import { useState } from 'react';
import type { FieldShoreEvent, OrgResourceRef } from '@core/schema';
import {
  childrenOf,
  orderForUp,
  orderForDown,
  promoteTarget,
  demoteTarget,
  validParentsFor,
} from '@core/org';
import { Sheet, Modal, Button, TextField } from '@ui/primitives';
import { useOrg, useOperation, useRoleHistory } from '@ui/hooks';
import { useOrgCommit } from './useOrgCommit';
import { AssignResourceSheet } from './AssignResourceSheet';
import { AddPositionSheet } from './AddPositionSheet';

// One-line role-history description (the events naming this node, append order).
function describe(e: FieldShoreEvent): string {
  switch (e.type) {
    case 'PositionAdded':
      return `Added — ${e.position.title}`;
    case 'PositionRenamed':
      return `Renamed to ${e.title}`;
    case 'PositionReparented':
      return 'Moved under a new parent';
    case 'PositionReordered':
      return 'Reordered among siblings';
    case 'ResourceAssigned':
      return `Assigned ${e.resource.label}`;
    case 'ResourceCleared':
      return e.resource ? `Cleared ${e.resource.label}` : 'Cleared all resources';
    case 'MyRoleSet':
      return e.positionId ? 'A device set this as its role' : 'A device cleared its role';
    case 'CommandTransferInitiated':
      return `Command transfer initiated → ${e.toResource.label}`;
    case 'CommandTransferAccepted':
      return 'Command transfer accepted';
    case 'CommandTransferDeclined':
      return 'Command transfer declined';
    case 'CommandTransferCancelled':
      return 'Command transfer cancelled';
    default:
      return e.type;
  }
}

const fmtTime = (ms: number) => new Date(ms).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

type Mode = 'menu' | 'move' | 'history';

/**
 * The org-node sheet (#295/#225) — tap a node to open it. Reads for everyone (the
 * assigned resources, reports, role history); the IC may edit (assign/clear, rename,
 * add a sub-position, reparent via the move/up/down/promote/demote buttons — the AT
 * path, drag is a later nicety — and remove a custom position). Built-ins can't be
 * removed.
 */
export function NodeSheet({
  positionId,
  isIC,
  onClose,
  onDescend,
}: {
  positionId: string;
  isIC: boolean;
  onClose: () => void;
  onDescend: (id: string) => void;
}) {
  const positions = useOrg();
  const op = useOperation();
  const emit = useOrgCommit();
  const history = useRoleHistory(op?.id ?? null, positionId);
  const [mode, setMode] = useState<Mode>('menu');
  const [assignOpen, setAssignOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState('');

  const pos = positions[positionId];
  if (!pos) return null;

  const parent = pos.parentId ? positions[pos.parentId] : null;
  const reports = childrenOf(positions, positionId).filter((c) => c.kind !== 'command-staff');
  const upOrder = orderForUp(positions, positionId);
  const downOrder = orderForDown(positions, positionId);
  const promote = promoteTarget(positions, positionId);
  const demote = demoteTarget(positions, positionId);

  const clear = (resource: OrgResourceRef) => emit({ type: 'ResourceCleared', positionId, resource });
  const reparent = (newParentId: string) => {
    emit({ type: 'PositionReparented', positionId, newParentId });
    setMode('menu');
  };
  const saveRename = () => {
    const t = title.trim();
    if (t && t !== pos.title) emit({ type: 'PositionRenamed', positionId, title: t });
    setRenaming(false);
  };

  const headerTitle = pos.title;

  return (
    <Sheet open onClose={onClose} title={headerTitle}>
      <p className="fs-node-subtitle">{parent ? `Reports to ${parent.title}` : 'Top of command'}</p>

      {mode === 'menu' && (
        <>
          {/* assigned resources */}
          <div className="fs-cmd-eyebrow" style={{ marginBottom: 'var(--space-2)' }}>
            Assigned
          </div>
          {pos.assignedResources.length === 0 ? (
            <p className="fs-cmd-roster-empty" style={{ marginTop: 0 }}>
              Unassigned
            </p>
          ) : (
            <ul className="fs-assign-list">
              {pos.assignedResources.map((r, i) => (
                <li key={`${r.ref}:${r.value}`} className="fs-node-resource">
                  <span className="fs-assign-name">
                    {r.label}
                    {i === 0 && <span className="fs-node-leader-tag"> · leader</span>}
                  </span>
                  {isIC && (
                    <button type="button" className="fs-node-clear" aria-label={`Clear ${r.label}`} onClick={() => clear(r)}>
                      ×
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {isIC &&
            (renaming ? (
              <div className="fs-assign-individual" style={{ marginTop: 'var(--space-3)' }}>
                <TextField label="Position title" value={title} onChange={setTitle} size="standard" />
                <Button variant="secondary" size="standard" onPress={saveRename}>
                  Save
                </Button>
              </div>
            ) : (
              <Button
                variant="primary"
                size="standard"
                fullWidth
                onPress={() => setAssignOpen(true)}
              >
                Assign resource
              </Button>
            ))}

          <div className="fs-node-menu">
            {reports.length > 0 && (
              <button
                type="button"
                className="fs-node-row"
                onClick={() => {
                  onDescend(positionId);
                  onClose();
                }}
              >
                <span>View {reports.length} {reports.length === 1 ? 'report' : 'reports'}</span>
                <span aria-hidden="true">›</span>
              </button>
            )}
            <button type="button" className="fs-node-row" onClick={() => setMode('history')}>
              <span>Role history</span>
              <span aria-hidden="true">›</span>
            </button>

            {isIC && (
              <>
                <button
                  type="button"
                  className="fs-node-row"
                  onClick={() => {
                    setTitle(pos.title);
                    setRenaming(true);
                  }}
                >
                  <span>Rename</span>
                </button>
                <button type="button" className="fs-node-row" onClick={() => setAddOpen(true)}>
                  <span>Add position under this</span>
                  <span aria-hidden="true">›</span>
                </button>
                <button type="button" className="fs-node-row" onClick={() => setMode('move')}>
                  <span>Move under…</span>
                  <span aria-hidden="true">›</span>
                </button>
                <div className="fs-node-reparent">
                  <Button
                    variant="secondary"
                    size="standard"
                    disabled={upOrder === null}
                    disabledReason="Top"
                    onPress={() => {
                      if (upOrder !== null) emit({ type: 'PositionReordered', positionId, order: upOrder });
                    }}
                  >
                    ↑ Up
                  </Button>
                  <Button
                    variant="secondary"
                    size="standard"
                    disabled={downOrder === null}
                    disabledReason="Bottom"
                    onPress={() => {
                      if (downOrder !== null) emit({ type: 'PositionReordered', positionId, order: downOrder });
                    }}
                  >
                    ↓ Down
                  </Button>
                  <Button
                    variant="secondary"
                    size="standard"
                    disabled={!promote}
                    disabledReason="At top level"
                    onPress={() => {
                      if (promote) reparent(promote);
                    }}
                  >
                    Promote
                  </Button>
                  <Button
                    variant="secondary"
                    size="standard"
                    disabled={!demote}
                    disabledReason="No sibling above"
                    onPress={() => {
                      if (demote) reparent(demote);
                    }}
                  >
                    Demote
                  </Button>
                </div>
                {!pos.builtIn && (
                  <Button variant="secondary" size="standard" destructive fullWidth onPress={() => setRemoveOpen(true)}>
                    Remove position
                  </Button>
                )}
              </>
            )}
          </div>
          {!isIC && <p className="fs-node-readonly">Only the Incident Commander can restructure the chart.</p>}
        </>
      )}

      {mode === 'move' && (
        <>
          <button type="button" className="fs-node-back" onClick={() => setMode('menu')}>
            ‹ Back
          </button>
          <div className="fs-cmd-eyebrow" style={{ margin: 'var(--space-2) 0' }}>
            Move under
          </div>
          <ul className="fs-assign-list">
            {validParentsFor(positions, positionId).map((p) => (
              <li key={p.id}>
                <button type="button" className="fs-assign-row" onClick={() => reparent(p.id)}>
                  <span className="fs-assign-name">{p.title}</span>
                  <span className="fs-assign-meta">move ›</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {mode === 'history' && (
        <>
          <button type="button" className="fs-node-back" onClick={() => setMode('menu')}>
            ‹ Back
          </button>
          <div className="fs-cmd-eyebrow" style={{ margin: 'var(--space-2) 0' }}>
            Role history
          </div>
          {history.events.length === 0 ? (
            <p className="fs-cmd-roster-empty" style={{ marginTop: 0 }}>
              No history yet.
            </p>
          ) : (
            <ul className="fs-node-history">
              {history.events.map((e) => (
                <li key={e.id}>
                  <span className="fs-node-hist-line">{describe(e)}</span>
                  <span className="fs-node-hist-time">{fmtTime(e.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {assignOpen && (
        <AssignResourceSheet open onClose={() => setAssignOpen(false)} positionId={positionId} positionTitle={pos.title} />
      )}
      {addOpen && (
        <AddPositionSheet
          open
          onClose={() => setAddOpen(false)}
          parentId={positionId}
          parentKind={pos.kind}
          parentTitle={pos.title}
        />
      )}
      <Modal
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
        title={`Remove ${pos.title}?`}
        variant="destructive"
        footer={
          <>
            <Button variant="secondary" onPress={() => setRemoveOpen(false)}>
              <span data-modal-cancel>Cancel</span>
            </Button>
            <Button
              variant="primary"
              destructive
              onPress={() => {
                emit({ type: 'PositionRemoved', positionId });
                setRemoveOpen(false);
                onClose();
              }}
            >
              Remove
            </Button>
          </>
        }
      >
        <p>This removes the position{reports.length > 0 ? ' and everything under it' : ''}. Assignments here are cleared.</p>
      </Modal>
    </Sheet>
  );
}
