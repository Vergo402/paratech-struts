import { useState } from 'react';
import type { FieldShoreEvent, OrgResourceRef } from '@core/schema';
import {
  childrenOf,
  orderForUp,
  orderForDown,
  validParentsFor,
  sameResource,
  positionForResource,
  shorePointsForResource,
  spanOfControl,
  spanLevel,
  kindLabel,
  leaderOf,
} from '@core/org';
import { Sheet, SideDrawer, Modal, Button, TextField, useMediaQuery } from '@ui/primitives';
import { useOrg, useOperation, useRoleHistory, useApparatus, useShorePoints } from '@ui/hooks';
import { clock } from '@ui/util/time';
import { useOrgCommit } from './useOrgCommit';
import { AddPositionForm } from './AddPositionForm';
import { BackChevronIcon, ChevronRightIcon, ClearIcon } from './icons';

// One-line role-history description (events naming this node, append order). A
// reparent surfaces in BOTH the moved node's history AND its new parent's, so the
// copy branches on which node this history belongs to (forId) — the destination
// sees an arrival, not its own move.
function describe(e: FieldShoreEvent, forId: string): string {
  switch (e.type) {
    case 'PositionAdded':
      return `Added — ${e.position.title}`;
    case 'PositionRenamed':
      return `Renamed to ${e.title}`;
    case 'PositionReparented':
      return e.positionId === forId ? 'Moved to a new position' : 'A position moved in beneath this';
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
      // Human copy, never a raw event type in IC-facing history (#434).
      return 'Updated';
  }
}

type Mode = 'menu' | 'move' | 'add' | 'assign';

/**
 * The org-node panel (#295 / #374). Tap a node → one SINGLE scrolling flow: the ICS-class
 * eyebrow, the assigned resources (with an INLINE assign — roster toggles + a named
 * individual, no separate modal), the direct reports, the manage actions, and the role
 * history. Add / Move open as inline sub-views WITHIN the same panel (the "zero flow
 * between actions" fix — no more stacked sheets). Reads for everyone; the IC edits.
 *
 * Surface-adaptive (ADR-019 / ADR-032): on the desktop Command Deck (≥1024px) it is the
 * SideDrawer's docked, non-modal companion column — the board stays live beside it; below
 * that it is a bottom Sheet (the phone floor, matching the org-in-a-Sheet layout). We key
 * off the DECK breakpoint (1024), not the SideDrawer's own 768, so the 768–1024 band
 * (org still in a Sheet) gets a bottom sheet, never an orphaned dock.
 *
 * Removing a POPULATED position stays a Modal confirm (ADR-016) — the one destructive
 * step that is NOT inlined.
 */
export function NodeSheet({
  positionId,
  isIC,
  onClose,
}: {
  positionId: string;
  isIC: boolean;
  onClose: () => void;
}) {
  const positions = useOrg();
  const op = useOperation();
  const emit = useOrgCommit();
  const history = useRoleHistory(op?.id ?? null, positionId);
  const { roster } = useApparatus();
  const shorePoints = useShorePoints();
  const isDeck = useMediaQuery('(min-width: 1024px)');
  const [mode, setMode] = useState<Mode>('menu');
  const [removeOpen, setRemoveOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState('');
  const [individual, setIndividual] = useState('');

  const pos = positions[positionId];
  if (!pos) return null;

  const subs = childrenOf(positions, positionId).filter((c) => c.kind !== 'command-staff');
  const upOrder = orderForUp(positions, positionId);
  const downOrder = orderForDown(positions, positionId);
  const span = spanOfControl(positions, positionId);
  const level = spanLevel(span);
  const assigned = pos.assignedResources;

  const has = (r: OrgResourceRef) => assigned.some((a) => sameResource(a, r));
  const clear = (r: OrgResourceRef) => emit({ type: 'ResourceCleared', positionId, resource: r });
  const toggle = (r: OrgResourceRef) =>
    emit(has(r) ? { type: 'ResourceCleared', positionId, resource: r } : { type: 'ResourceAssigned', positionId, resource: r });
  const addIndividual = () => {
    const n = individual.trim();
    if (!n) return;
    emit({ type: 'ResourceAssigned', positionId, resource: { ref: 'individual', value: n, label: n } });
    setIndividual('');
  };
  const reparent = (newParentId: string) => {
    emit({ type: 'PositionReparented', positionId, newParentId });
    setMode('menu');
  };
  const saveRename = () => {
    const t = title.trim();
    if (t && t !== pos.title) emit({ type: 'PositionRenamed', positionId, title: t });
    setRenaming(false);
  };

  const Shell = isDeck ? SideDrawer : Sheet;
  const eyebrow = `${kindLabel(pos.kind)}${level !== 'ok' ? ` · span ${span} ${level}` : ''}`;

  return (
    <Shell open onClose={onClose} title={pos.title}>
      <p className="fs-node-subtitle">{eyebrow}</p>

      {mode === 'menu' && (
        <>
          {/* ASSIGNED — the position's own resources, each apparatus with its live
              shore-point total. The full roster no longer inlines here (#434: a 20-rig
              department pushed Manage/history ~1000px down); it lives behind the
              "Change or add apparatus" row as an inline sub-view. */}
          <div className="fs-node-section">Assigned{assigned.length ? ` · ${assigned.length}` : ''}</div>
          {assigned.length === 0 ? (
            <p className="fs-node-empty">Unassigned</p>
          ) : (
            <ul className="fs-node-resources">
              {assigned.map((r, i) => {
                const spTotal = r.ref === 'apparatus' ? shorePointsForResource(shorePoints, r).length : 0;
                return (
                  <li key={`${r.ref}:${r.value}`} className="fs-node-resource">
                    <span className="fs-assign-name">
                      {r.label}
                      {i === 0 && <span className="fs-node-leader-tag"> · leader</span>}
                    </span>
                    {spTotal > 0 && (
                      <span className="fs-node-sp-total">
                        {spTotal} total shore {spTotal === 1 ? 'point' : 'points'}
                      </span>
                    )}
                    {isIC && (
                      <button type="button" className="fs-node-clear" aria-label={`Clear ${r.label}`} onClick={() => clear(r)}>
                        <ClearIcon />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {isIC && (
            <div className="fs-node-group">
              <button type="button" className="fs-node-grow" onClick={() => setMode('assign')}>
                <span>Change or add apparatus</span>
                <span aria-hidden="true">
                  <ChevronRightIcon />
                </span>
              </button>
            </div>
          )}

          {/* DIRECT REPORTS */}
          {subs.length > 0 && (
            <>
              <div className="fs-node-section">Direct reports · {subs.length}</div>
              <ul className="fs-node-resources">
                {subs.map((s) => (
                  <li key={s.id} className="fs-node-resource">
                    <span className="fs-assign-name">{s.title}</span>
                    <span className="fs-assign-meta">{leaderOf(s)?.label ?? 'Unassigned'}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* MANAGE (IC) — rename inline; add / move as inline sub-views */}
          {isIC && (
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
                  <button type="button" className="fs-node-grow" onClick={() => setMode('add')}>
                    <span>Add position under this</span>
                    <span aria-hidden="true">
                      <ChevronRightIcon />
                    </span>
                  </button>
                  <button type="button" className="fs-node-grow" onClick={() => setMode('move')}>
                    <span>Move…</span>
                    <span aria-hidden="true">
                      <ChevronRightIcon />
                    </span>
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
          )}

          {/* ROLE HISTORY — an always-visible section (read for everyone) */}
          <div className="fs-node-section">Role history</div>
          {history.events.length === 0 ? (
            <p className="fs-node-empty">No history yet.</p>
          ) : (
            <ul className="fs-node-history">
              {history.events.map((e) => (
                <li key={e.id}>
                  <span className="fs-node-hist-line">{describe(e, positionId)}</span>
                  <span className="fs-node-hist-time">{clock(e.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {mode === 'assign' && (
        <>
          <button type="button" className="fs-node-back" onClick={() => setMode('menu')}>
            <BackChevronIcon /> Back
          </button>
          {roster.length > 0 && (
            <>
              <div className="fs-node-section">Apparatus on roster</div>
              <ul className="fs-assign-list">
                {roster.map((app) => {
                  const r: OrgResourceRef = { ref: 'apparatus', value: app.id, label: app.name };
                  const home = positionForResource(positions, r);
                  const onHere = has(r);
                  return (
                    <li key={app.id}>
                      <button type="button" className={`fs-assign-row${onHere ? ' is-on' : ''}`} onClick={() => toggle(r)}>
                        <span className="fs-assign-name">{app.name}</span>
                        <span className="fs-assign-meta">{onHere ? 'assigned here' : home ? `at ${home.title}` : 'unassigned'}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          {/* #401 — steer the IC away from the clear/assign toggle for command
              handoff: ResourceCleared/ResourceAssigned leaves no transfer record.
              Only on the command root (no parent), where command actually transfers. */}
          {pos.parentId === null && (
            <p className="fs-node-note">To hand off command with a record, use Transfer Command.</p>
          )}
          <div className="fs-assign-individual">
            <TextField label="Add individual" value={individual} onChange={setIndividual} placeholder="e.g. FF Lopez" size="standard" />
            <Button variant="secondary" size="standard" disabled={!individual.trim()} onPress={addIndividual}>
              Add
            </Button>
          </div>
        </>
      )}

      {mode === 'move' && (
        <>
          <button type="button" className="fs-node-back" onClick={() => setMode('menu')}>
            <BackChevronIcon /> Back
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
              ← Move left
            </Button>
            <Button
              variant="secondary"
              size="standard"
              disabled={downOrder === null}
              onPress={() => {
                if (downOrder !== null) emit({ type: 'PositionReordered', positionId, order: downOrder });
              }}
            >
              Move right →
            </Button>
          </div>
          <div className="fs-node-section">Move under a different position</div>
          <ul className="fs-assign-list">
            {validParentsFor(positions, positionId).map((p) => (
              <li key={p.id}>
                <button type="button" className="fs-assign-row" onClick={() => reparent(p.id)}>
                  <span className="fs-assign-name">{p.title}</span>
                  <span className="fs-assign-meta">
                    move <ChevronRightIcon />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {mode === 'add' && (
        <>
          <button type="button" className="fs-node-back" onClick={() => setMode('menu')}>
            <BackChevronIcon /> Back
          </button>
          <div className="fs-node-section">Add position under {pos.title}</div>
          <AddPositionForm parentId={positionId} parentKind={pos.kind} onDone={() => setMode('menu')} />
        </>
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
    </Shell>
  );
}
