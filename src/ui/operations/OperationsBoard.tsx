import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ShorePoint, ShorePointStatus } from '@core/schema';
import { STATUS_ORDER, STATUS_LABELS } from '@core/shorepoint';
import { divisionLabel } from '@core/operation';
import { Badge, Button, EmptyState, Modal } from '@ui/primitives';
import { useOperation, useShorePoints } from '@ui/hooks';
import { StartOperationModal } from './StartOperationModal';
import { AddShorePointModal } from './AddShorePointModal';
import { DeleteShorePointModal } from './DeleteShorePointModal';
import { ShorePointCard } from './ShorePointCard';

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

// ---- Lane -------------------------------------------------------------------
interface LaneProps {
  status: ShorePointStatus;
  points: ShorePoint[];
  collapsed: boolean;
  onToggle: () => void;
  onEdit: (sp: ShorePoint) => void;
  onDelete: (sp: ShorePoint) => void;
  onAssignEquipment: (sp: ShorePoint) => void;
}

function Lane({ status, points, collapsed, onToggle, onEdit, onDelete, onAssignEquipment }: LaneProps) {
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
            points.map((sp) => (
              <div key={sp.id} role="listitem" data-sp-id={sp.id}>
                <ShorePointCard
                  shorePoint={sp}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onAssignEquipment={onAssignEquipment}
                />
              </div>
            ))
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

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [endOpOpen, setEndOpOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<ShorePointStatus>>(new Set());
  const [spModal, setSpModal] = useState<SpModalState>(null);
  const [deleteSp, setDeleteSp] = useState<ShorePoint | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [scrollToId, setScrollToId] = useState<string | null>(null);

  // After a commit lands, bring the first new Pending card into view. Optional-
  // call guarded — jsdom has no scrollIntoView (the Sheet pointer-capture rule).
  useEffect(() => {
    if (!scrollToId) return;
    document.querySelector(`[data-sp-id="${scrollToId}"]`)?.scrollIntoView?.({ block: 'nearest' });
    setScrollToId(null);
  }, [scrollToId]);

  const openEdit = useCallback((sp: ShorePoint) => setSpModal({ mode: 'edit', shorePoint: sp }), []);
  const openDelete = useCallback((sp: ShorePoint) => setDeleteSp(sp), []);
  // S5 stub — the Assign Equipment sheet is the deploy workflow (S6, #221).
  const assignEquipment = useCallback(() => {}, []);

  const handleAdded = useCallback((added: ShorePoint[]) => {
    // The spec's modal-close response: open the Pending lane, scroll the first
    // new card into view, announce assertively (workflow #220 §Accessibility).
    setCollapsed((prev) => {
      if (!prev.has('pending')) return prev;
      const next = new Set(prev);
      next.delete('pending');
      return next;
    });
    const first = added[0];
    if (!first) return;
    setScrollToId(first.id);
    const where = [divisionLabel(first.division), first.building, first.area].filter(Boolean).join(', ');
    setAnnouncement(
      added.length === 1
        ? `Shore point added — ${where}, Pending.`
        : `${added.length} shore points added — ${where}, Pending.`,
    );
  }, []);

  const byStatus = useMemo(() => {
    const map: Record<ShorePointStatus, ShorePoint[]> = {
      pending: [], process: [], strutset: [], cutting: [],
      runner: [], secured: [], returned: [],
    };
    for (let i = shorePoints.length - 1; i >= 0; i--) {
      const sp = shorePoints[i]!;
      map[sp.status].push(sp);
    }
    return map;
  }, [shorePoints]);

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
