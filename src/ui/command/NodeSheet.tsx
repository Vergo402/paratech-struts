import { useState } from 'react';
import type { FieldShoreEvent, OrgResourceRef } from '@core/schema';
import { childrenOf, orderForUp, orderForDown, validParentsFor } from '@core/org';
import { Sheet, Modal, Button, TextField } from '@ui/primitives';
import { useOrg, useOperation, useRoleHistory } from '@ui/hooks';
import { useOrgCommit } from './useOrgCommit';
import { AssignResourceSheet } from './AssignResourceSheet';
import { AddPositionSheet } from './AddPositionSheet';

// One-line role-history description (events naming this node, append order).
function describe(e: FieldShoreEvent): string {
  switch (e.type) {
    case 'PositionAdded':
      return `Added — ${e.position.title}`;
    case 'PositionRenamed':
      return `Renamed to ${e.title}`;
    case 'PositionReparented':
      return 'Moved to a new position';
    case 'PositionReordered':
      return 'Reordered';
    case 'ResourceAssigned':
      return `Assigned ${e.resource.label}`;
    case 'ResourceCleared':
      return e.resource ? `Cleared ${e.resource.label}` : 'Cleared all resources';
    case 'MyRoleSet':
      return e.positionId ? 'A device set this as its role' : 'A device cleared its role';
    case 'CommandTransferInitiated':
      return `Command transfer → ${e.toResource.label}`;
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

const fmtTime = (ms: number) =>
  new Date(ms).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

type Mode = 'menu' | 'move' | 'history';

/**
 * The org-node sheet (#295/#225) — tap a node. Grouped into Assigned · Subordinates ·
 * Manage so it scans at a glance (the flat menu was unreadable — Alex). Reads for
 * everyone; the IC edits. All reparenting lives behind one Move… sub-view (reorder
 * up/down + move under a different position); promote/demote are just move-under
 * targets, so there are no separate buttons and no reason-label clutter.
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
  const subs = childrenOf(positions, positionId).filter((c) => c.kind !== 'command-staff');
  const upOrder = orderForUp(positions, positionId);
  const downOrder = orderForDown(positions, positionId);

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
  const subsLabel = `${subs.length} ${subs.length === 1 ? 'subordinate' : 'subordinates'}`;

  return (
    <Sheet open onClose={onClose} title={pos.title}>
      <p className="fs-node-subtitle">{parent ? `Reports to ${parent.title}` : 'Top of command'}</p>

      {mode === 'menu' && (
        <>
          {/* ASSIGNED */}
          <div className="fs-node-section">Assigned</div>
          {pos.assignedResources.length === 0 ? (
            <p className="fs-node-empty">Unassigned</p>
          ) : (
            <ul className="fs-node-resources">
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
            (renaming ? null : (
              <Button variant="primary" size="standard" fullWidth onPress={() => setAssignOpen(true)}>
                Assign resource
              </Button>
            ))}

          {/* SUBORDINATES */}
          {subs.length > 0 && (
            <>
              <div className="fs-node-section">Subordinates</div>
              <div className="fs-node-group">
                <button
                  type="button"
                  className="fs-node-grow"
                  onClick={() => {
                    onDescend(positionId);
                    onClose();
                  }}
                >
                  <span>View {subsLabel}</span>
                  <span aria-hidden="true">›</span>
                </button>
              </div>
            </>
          )}

          {/* MANAGE (IC) / read row (others) */}
          {isIC ? (
            <>
              <div className="fs-node-section">Manage position</div>
              {renaming ? (
                <div className="fs-node-rename">
                  <TextField label="Position title" value={title} onChange={setTitle} size="standard" />
                  <Button variant="secondary" size="standard" onPress={saveRename}>
                    Save
                  </Button>
                </div>
              ) : (
                <div className="fs-node-group">
                  <button
                    type="button"
                    className="fs-node-grow"
                    onClick={() => {
                      setTitle(pos.title);
                      setRenaming(true);
                    }}
                  >
                    <span>Rename</span>
                  </button>
                  <button type="button" className="fs-node-grow" onClick={() => setAddOpen(true)}>
                    <span>Add position under this</span>
                    <span aria-hidden="true">›</span>
                  </button>
                  <button type="button" className="fs-node-grow" onClick={() => setMode('move')}>
                    <span>Move…</span>
                    <span aria-hidden="true">›</span>
                  </button>
                  <button type="button" className="fs-node-grow" onClick={() => setMode('history')}>
                    <span>Role history</span>
                    <span aria-hidden="true">›</span>
                  </button>
                </div>
              )}
              {!pos.builtIn ? (
                <Button variant="secondary" size="standard" destructive fullWidth onPress={() => setRemoveOpen(true)}>
                  Remove position
                </Button>
              ) : (
                <p className="fs-node-note">Built-in position · cannot be removed</p>
              )}
            </>
          ) : (
            <div className="fs-node-group">
              <button type="button" className="fs-node-grow" onClick={() => setMode('history')}>
                <span>Role history</span>
                <span aria-hidden="true">›</span>
              </button>
            </div>
          )}
        </>
      )}

      {mode === 'move' && (
        <>
          <button type="button" className="fs-node-back" onClick={() => setMode('menu')}>
            ‹ Back
          </button>
          <div className="fs-node-section">Reorder among siblings</div>
          <div className="fs-node-reorder">
            <Button
              variant="secondary"
              size="standard"
              disabled={upOrder === null}
              onPress={() => {
                if (upOrder !== null) emit({ type: 'PositionReordered', positionId, order: upOrder });
              }}
            >
              ↑ Move up
            </Button>
            <Button
              variant="secondary"
              size="standard"
              disabled={downOrder === null}
              onPress={() => {
                if (downOrder !== null) emit({ type: 'PositionReordered', positionId, order: downOrder });
              }}
            >
              ↓ Move down
            </Button>
          </div>
          <div className="fs-node-section">Move under a different position</div>
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
          <div className="fs-node-section">Role history</div>
          {history.events.length === 0 ? (
            <p className="fs-node-empty">No history yet.</p>
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
        <AddPositionSheet open onClose={() => setAddOpen(false)} parentId={positionId} parentKind={pos.kind} parentTitle={pos.title} />
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
        <p>This removes the position{subs.length > 0 ? ' and everything under it' : ''}. Assignments here are cleared.</p>
      </Modal>
    </Sheet>
  );
}
