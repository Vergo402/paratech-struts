import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PendingReason, ShorePoint, ShorePointStatus } from '@core/schema';
import { STATUS_ORDER, STATUS_LABELS, pendingReasonFor } from '@core/shorepoint';
import { divisionLabel } from '@core/operation';
import { newId } from '@core/id';
import { Badge, Button, EmptyState, Modal } from '@ui/primitives';
import { useCommit, useDeviceUid, useInventory, useOperation, useShorePoints } from '@ui/hooks';
import { StartOperationModal } from './StartOperationModal';
import { AddShorePointModal } from './AddShorePointModal';
import { DeleteShorePointModal } from './DeleteShorePointModal';
import { ShorePointCard } from './ShorePointCard';
import { GroupedShorePoint } from './GroupedShorePoint';
import { AssignEquipmentSheet } from './AssignEquipmentSheet';
import { StepBackConfirmModal } from './StepBackConfirmModal';

type ModalMode = null | 'create' | 'edit';

/** The Add/Edit Shore Point modal state: closed, creating, or editing a point. */
type SpModalState = null | { mode: 'create' } | { mode: 'edit'; shorePoint: ShorePoint };

// ---- Chevron SVG (matches BottomNav inline-glyph pattern) -------------------
function Chevron() {
  return (
    <svg className="fs-lane-chevron" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M6 8L10 12L14 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---- Pencil edit icon -------------------------------------------------------
function PencilIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M14.5 3.5L16.5 5.5L6 16H4V14L14.5 3.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---- Status summary bar (rec G-15) -------------------------------------------
// Counts per lane, above the board. Tablet/laptop only — CSS hides it below
// 768pt (G-15: "phone does not show"). aria-hidden: it is a visual glance aid;
// the lane headers already carry the same counts for assistive tech.
function StatusSummaryBar({ byStatus }: { byStatus: Record<ShorePointStatus, ShorePoint[]> }) {
  return (
    <div className="fs-ops-summary" aria-hidden="true">
      {STATUS_ORDER.map((status) => (
        <span key={status} className={`fs-ops-summary-item is-${status}`}>
          {STATUS_LABELS[status]}
          <span className="fs-ops-summary-count">{byStatus[status].length}</span>
        </span>
      ))}
    </div>
  );
}

// ---- Lane render grouping (S12 §2) ------------------------------------------
// Within a lane, collapse 2+ same-groupId points (one PHYSICAL multi-strut
// shore — a 3-Post = 3 points, KB-7) into a single rolodex stack; everything
// else stays a plain card. A singleton (no groupId, OR the lone member of its
// group present in THIS lane) renders as today. First-appearance order is
// preserved: the group renders where its earliest member sits.
type LaneItem =
  | { kind: 'single'; sp: ShorePoint }
  | { kind: 'group'; groupId: string; members: ShorePoint[] };

function groupLanePoints(points: ShorePoint[]): LaneItem[] {
  const byGroup = new Map<string, ShorePoint[]>();
  for (const sp of points) {
    if (!sp.groupId) continue;
    const arr = byGroup.get(sp.groupId);
    if (arr) arr.push(sp);
    else byGroup.set(sp.groupId, [sp]);
  }
  const items: LaneItem[] = [];
  const emitted = new Set<string>();
  for (const sp of points) {
    const mates = sp.groupId ? byGroup.get(sp.groupId) : undefined;
    if (mates && mates.length >= 2) {
      if (emitted.has(sp.groupId!)) continue; // group already rendered at its first member
      emitted.add(sp.groupId!);
      // Sort members by groupIndex (fall back to lane order) for a stable pile.
      const members = [...mates].sort((a, b) => (a.groupIndex ?? 0) - (b.groupIndex ?? 0));
      items.push({ kind: 'group', groupId: sp.groupId!, members });
    } else {
      items.push({ kind: 'single', sp });
    }
  }
  return items;
}

// ---- Lane -------------------------------------------------------------------
interface LaneProps {
  status: ShorePointStatus;
  points: ShorePoint[];
  collapsed: boolean;
  onToggle: () => void;
  onEdit: (sp: ShorePoint) => void;
  onDelete: (sp: ShorePoint) => void;
  onAssignEquipment: (sp: ShorePoint) => void;
  onAdvance: (sp: ShorePoint) => void;
  onStepBack: (sp: ShorePoint) => void;
  /** Group gate (#221 OQ2): set while a grouped In Process point has mates still Pending. */
  advanceDisabledReasonFor: (sp: ShorePoint) => string | undefined;
  /** Board scroll target — fronts the stack on the member it lands inside (S12 §2). */
  activeStackId: string | null;
}

function Lane({
  status,
  points,
  collapsed,
  onToggle,
  onEdit,
  onDelete,
  onAssignEquipment,
  onAdvance,
  onStepBack,
  advanceDisabledReasonFor,
  activeStackId,
}: LaneProps) {
  const items = groupLanePoints(points);
  return (
    <section className={`fs-lane is-${status}`} aria-label={STATUS_LABELS[status]}>
      <button
        className="fs-lane-header"
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
      >
        <h2 className="fs-lane-title">{STATUS_LABELS[status]}</h2>
        <Badge variant="count" value={points.length} srLabel={`${points.length} shore points`} />
        <Chevron />
      </button>
      {!collapsed && (
        <div className="fs-lane-cards" role="list">
          {points.length === 0 ? (
            <p className="fs-lane-empty">No shore points</p>
          ) : (
            items.map((item) =>
              item.kind === 'group' ? (
                <div key={item.groupId} role="listitem">
                  <GroupedShorePoint
                    members={item.members}
                    initialActiveId={
                      // If the board's scroll target lands inside this stack, front it.
                      item.members.some((m) => m.id === activeStackId) ? activeStackId! : undefined
                    }
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onAssignEquipment={onAssignEquipment}
                    onAdvance={onAdvance}
                    onStepBack={onStepBack}
                    advanceDisabledReasonFor={advanceDisabledReasonFor}
                  />
                </div>
              ) : (
                <div key={item.sp.id} role="listitem" data-sp-id={item.sp.id}>
                  <ShorePointCard
                    shorePoint={item.sp}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onAssignEquipment={onAssignEquipment}
                    onAdvance={onAdvance}
                    onStepBack={onStepBack}
                    advanceDisabledReason={advanceDisabledReasonFor(item.sp)}
                  />
                </div>
              ),
            )
          )}
        </div>
      )}
    </section>
  );
}

// ---- OperationsBoard --------------------------------------------------------
export function OperationsBoard() {
  const operation = useOperation();
  const shorePoints = useShorePoints();
  const inventory = useInventory();
  const commit = useCommit();
  const getUid = useDeviceUid();

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [endOpOpen, setEndOpOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<ShorePointStatus>>(new Set());
  const [spModal, setSpModal] = useState<SpModalState>(null);
  const [deleteSp, setDeleteSp] = useState<ShorePoint | null>(null);
  const [assignSpId, setAssignSpId] = useState<string | null>(null);
  const [stepBackSpId, setStepBackSpId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [politeAnnouncement, setPoliteAnnouncement] = useState('');
  const [scrollToId, setScrollToId] = useState<string | null>(null);

  // After a commit lands, bring the first new card into view. Optional-call
  // guarded — jsdom has no scrollIntoView (the Sheet pointer-capture rule).
  // scrollToId doubles as the stack-front hint (passed to Lane as
  // activeStackId): a GroupedShorePoint reads it in its initial state, so when a
  // fan-out lands a group in a new lane the stack mounts fronting that member.
  // The data-sp-id target resolves whether the member is the stack's front
  // wrapper or one of its tabs — both carry it (GroupedShorePoint).
  useEffect(() => {
    if (!scrollToId) return;
    document.querySelector(`[data-sp-id="${scrollToId}"]`)?.scrollIntoView?.({ block: 'nearest' });
    setScrollToId(null);
  }, [scrollToId]);

  // The sheet/modal targets derive LIVE by id so they always see the current
  // point (a stale object would compute recommendations against old state) and
  // self-close when the point leaves the state they act on.
  const assignSp = assignSpId
    ? (shorePoints.find((s) => s.id === assignSpId && s.status === 'pending') ?? null)
    : null;
  const stepBackSp = stepBackSpId
    ? (shorePoints.find((s) => s.id === stepBackSpId && s.status === 'process') ?? null)
    : null;
  // Drop a stale id once its target derives null, so the overlay cannot
  // spontaneously reopen if the point later re-enters that state.
  useEffect(() => {
    if (assignSpId && !assignSp) setAssignSpId(null);
  }, [assignSpId, assignSp]);
  useEffect(() => {
    if (stepBackSpId && !stepBackSp) setStepBackSpId(null);
  }, [stepBackSpId, stepBackSp]);

  const openEdit = useCallback((sp: ShorePoint) => setSpModal({ mode: 'edit', shorePoint: sp }), []);
  const openDelete = useCallback((sp: ShorePoint) => setDeleteSp(sp), []);
  const assignEquipment = useCallback((sp: ShorePoint) => setAssignSpId(sp.id), []);

  const expandLane = useCallback((status: ShorePointStatus) => {
    setCollapsed((prev) => {
      if (!prev.has(status)) return prev;
      const next = new Set(prev);
      next.delete(status);
      return next;
    });
  }, []);

  const handleAdded = useCallback(
    (added: ShorePoint[]) => {
      // The spec's modal-close response: open the Pending lane, scroll the first
      // new card into view, announce assertively (workflow #220 §Accessibility).
      expandLane('pending');
      const first = added[0];
      if (!first) return;
      setScrollToId(first.id);
      const where = [divisionLabel(first.division), first.building, first.area].filter(Boolean).join(', ');
      setAnnouncement(
        added.length === 1
          ? `Shore point added — ${where}, Pending.`
          : `${added.length} shore points added — ${where}, Pending.`,
      );
    },
    [expandLane],
  );

  // ---- Deploy / advance / step-back (#221) ----------------------------------

  /** The reducer's pre-cutting fan-out set: same-status lockstep group mates. */
  const lockstepCount = useCallback(
    (sp: ShorePoint) =>
      sp.groupId ? shorePoints.filter((s) => s.groupId === sp.groupId && s.status === sp.status).length : 1,
    [shorePoints],
  );

  const handleDeployed = useCallback(
    (sp: ShorePoint, model: string) => {
      setAssignSpId(null);
      expandLane('process');
      setScrollToId(sp.id);
      const where = [divisionLabel(sp.division), sp.building, sp.area].filter(Boolean).join(', ');
      setPoliteAnnouncement(`${model} deployed — ${where}, In Process.`);
    },
    [expandLane],
  );

  const handleReturned = useCallback(
    (sp: ShorePoint) => {
      expandLane('pending');
      setScrollToId(sp.id);
      setPoliteAnnouncement(`${sp.deployedStrut?.model ?? 'Strut'} returned — back to Pending.`);
    },
    [expandLane],
  );

  const commitStatusChange = useCallback(
    async (sp: ShorePoint, to: ShorePointStatus, phrase: string) => {
      const n = lockstepCount(sp);
      const result = await commit({
        type: 'ShorePointStatusChanged',
        id: newId(),
        opId: sp.opId,
        at: Date.now(),
        by: await getUid(),
        spId: sp.id,
        from: sp.status,
        to,
      });
      if (!result.ok) return;
      expandLane(to);
      setScrollToId(sp.id);
      setPoliteAnnouncement(
        n > 1 ? `${n} shore points — ${phrase} ${STATUS_LABELS[to]}.` : `Shore point — ${phrase} ${STATUS_LABELS[to]}.`,
      );
    },
    [commit, getUid, expandLane, lockstepCount],
  );

  const handleAdvance = useCallback(
    async (sp: ShorePoint) => {
      const to = STATUS_ORDER[STATUS_ORDER.indexOf(sp.status) + 1];
      if (to) await commitStatusChange(sp, to, 'now');
    },
    [commitStatusChange],
  );

  const handleStepBack = useCallback(
    async (sp: ShorePoint) => {
      // process → pending is an un-deploy: inventory-consequential, so it is the
      // ONE reversal that confirms (ADR-016) — route to the modal, commit nothing here.
      if (sp.status === 'process') {
        setStepBackSpId(sp.id);
        return;
      }
      const to = STATUS_ORDER[STATUS_ORDER.indexOf(sp.status) - 1];
      if (to) await commitStatusChange(sp, to, 'back to');
    },
    [commitStatusChange],
  );

  /** Group gate (#221 OQ2): a grouped point's advance waits until every mate has left Pending. */
  const advanceDisabledReasonFor = useCallback(
    (sp: ShorePoint) => {
      if (sp.status !== 'process' || !sp.groupId) return undefined;
      const mates = shorePoints.filter((s) => s.groupId === sp.groupId);
      const stillPending = mates.filter((s) => s.status === 'pending').length;
      if (stillPending === 0) return undefined;
      return `Waiting on group — ${stillPending} of ${mates.length} still Pending`;
    },
    [shorePoints],
  );

  // Live pending reasons (#221, settled 2026-06-10): computed from current
  // stock, never persisted — the reason appears/clears as inventory changes.
  const pendingReasons = useMemo(() => {
    const m = new Map<string, PendingReason | undefined>();
    for (const sp of shorePoints) {
      if (sp.status === 'pending') m.set(sp.id, pendingReasonFor(sp, inventory));
    }
    return m;
  }, [shorePoints, inventory]);

  const byStatus = useMemo(() => {
    const map: Record<ShorePointStatus, ShorePoint[]> = {
      pending: [], process: [], strutset: [], cutting: [],
      runner: [], secured: [], returned: [],
    };
    for (let i = shorePoints.length - 1; i >= 0; i--) {
      const sp = shorePoints[i]!;
      // Display-only enrichment — the computed reason never re-serializes
      // (ShorePointPatch has no such field; events are built from live SPs).
      map[sp.status].push(sp.status === 'pending' ? { ...sp, pendingReason: pendingReasons.get(sp.id) } : sp);
    }
    return map;
  }, [shorePoints, pendingReasons]);

  const toggleLane = useCallback((status: ShorePointStatus) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }, []);

  // ---- No active operation --------------------------------------------------
  if (!operation || operation.status === 'ended') {
    return (
      <div className="fs-ops-board">
        <EmptyState
          variant="first-run"
          headline="No active operation"
          reason="Start a shoring operation to begin tracking shore points"
          action={{ label: 'Start Operation', onPress: () => setModalMode('create') }}
        />
        <StartOperationModal
          open={modalMode === 'create'}
          onClose={() => setModalMode(null)}
        />
      </div>
    );
  }

  // ---- Active operation -----------------------------------------------------
  return (
    <div className="fs-ops-board">
      <header className="fs-ops-header">
        <h1 className="fs-ops-name">{operation.name}</h1>
        <button
          className="fs-ops-edit"
          type="button"
          aria-label="Edit operation"
          onClick={() => setModalMode('edit')}
        >
          <PencilIcon />
        </button>
      </header>

      <div className="fs-ops-actions">
        <Button variant="primary" fullWidth onPress={() => setSpModal({ mode: 'create' })}>
          + Add Shore Point
        </Button>
      </div>

      <div className="fs-sr-only" role="status" aria-live="assertive">
        {announcement}
      </div>
      {/* Status changes announce politely (slider.md) — the assertive region is add-only. */}
      <div className="fs-sr-only" role="status" aria-live="polite">
        {politeAnnouncement}
      </div>

      <StatusSummaryBar byStatus={byStatus} />

      <div className="fs-ops-lanes">
        {STATUS_ORDER.map((status) => (
          <Lane
            key={status}
            status={status}
            points={byStatus[status]}
            collapsed={collapsed.has(status)}
            onToggle={() => toggleLane(status)}
            onEdit={openEdit}
            onDelete={openDelete}
            onAssignEquipment={assignEquipment}
            onAdvance={handleAdvance}
            onStepBack={handleStepBack}
            advanceDisabledReasonFor={advanceDisabledReasonFor}
            activeStackId={scrollToId}
          />
        ))}
      </div>

      <div className="fs-ops-end">
        <Button variant="secondary" destructive onPress={() => setEndOpOpen(true)}>
          End Operation
        </Button>
      </div>

      <StartOperationModal
        open={modalMode === 'create' || modalMode === 'edit'}
        onClose={() => setModalMode(null)}
        operation={modalMode === 'edit' ? operation : undefined}
      />

      <AddShorePointModal
        open={spModal !== null}
        onClose={() => setSpModal(null)}
        shorePoint={spModal?.mode === 'edit' ? spModal.shorePoint : undefined}
        onAdded={handleAdded}
      />

      <DeleteShorePointModal shorePoint={deleteSp} onClose={() => setDeleteSp(null)} />

      <AssignEquipmentSheet shorePoint={assignSp} onClose={() => setAssignSpId(null)} onDeployed={handleDeployed} />

      <StepBackConfirmModal
        shorePoint={stepBackSp}
        onClose={() => setStepBackSpId(null)}
        onReturned={handleReturned}
      />

      <Modal
        open={endOpOpen}
        onClose={() => setEndOpOpen(false)}
        title="End Operation?"
        variant="destructive"
        footer={
          <>
            <Button variant="secondary" onPress={() => setEndOpOpen(false)}>
              <span data-modal-cancel>Cancel</span>
            </Button>
            <Button variant="primary" destructive disabled disabledReason="Arrives in a later session" onPress={() => {}}>
              End Operation
            </Button>
          </>
        }
      >
        <p>This will archive every shore point and end the active operation. End Operation arrives in a later build session.</p>
      </Modal>
    </div>
  );
}
