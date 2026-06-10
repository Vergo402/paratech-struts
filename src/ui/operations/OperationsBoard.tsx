import { useCallback, useMemo, useState } from 'react';
import type { ShorePoint, ShorePointStatus } from '@core/schema';
import { STATUS_ORDER, STATUS_LABELS } from '@core/shorepoint';
import { Badge, Button, Card, EmptyState, Modal } from '@ui/primitives';
import { useOperation, useShorePoints } from '@ui/hooks';
import { StartOperationModal } from './StartOperationModal';

type ModalMode = null | 'create' | 'edit';

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
}

function Lane({ status, points, collapsed, onToggle }: LaneProps) {
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
              <div key={sp.id} role="listitem">
                <Card>
                  <div className="fs-lane-card-row">
                    <span>{sp.label ?? `Div ${sp.division}`}</span>
                    <Badge variant="status" status={sp.status} />
                  </div>
                </Card>
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
        <Button variant="primary" fullWidth onPress={() => {}}>
          + Add Shore Point
        </Button>
      </div>

      <div className="fs-ops-lanes">
        {STATUS_ORDER.map((status) => (
          <Lane
            key={status}
            status={status}
            points={byStatus[status]}
            collapsed={collapsed.has(status)}
            onToggle={() => toggleLane(status)}
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
