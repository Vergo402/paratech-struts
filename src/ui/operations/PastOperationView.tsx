import { useMemo, useState } from 'react';
import type { ShorePoint } from '@core/schema';
import { STATUS_ORDER, STATUS_LABELS, deployedCapacityFlag, deployedStrutCount } from '@core/shorepoint';
import { newId } from '@core/id';
import { Badge, Button, EmptyState, Modal, SideDrawer } from '@ui/primitives';
import { useArchivedOperation, useCommit, useDeviceUid } from '@ui/hooks';
import { ShorePointCard, shorePointDrawerTitle } from './ShorePointCard';
import { ShorePointDetail } from './ShorePointDetail';

/** Back chevron for the archive header. */
function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M12 4L7 10L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Read-only drill-in for a finished incident (#238) — its board, rebuilt from the
 * retained log (useArchivedOperation), every card frozen via ShorePointCard
 * readOnly (no slides/edits/deploy). Hosts the only write here: Re-open this
 * incident (ADR-036), behind a Cancel-first confirm. On re-open the op flips to
 * active and the board reactively replaces this view.
 */
export function PastOperationView({ opId, onClose }: { opId: string; onClose: () => void }) {
  const { data } = useArchivedOperation(opId);
  const commit = useCommit();
  const getUid = useDeviceUid();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reopening, setReopening] = useState(false);
  // Quick View drawer (ADR-019) — read-only here, like the cards.
  const [detailSpId, setDetailSpId] = useState<string | null>(null);

  const operation = data?.operation ?? null;
  const points = (data?.shorePoints ?? []).filter((sp) => sp.deletedAt == null);
  const detailSp = detailSpId ? (points.find((sp) => sp.id === detailSpId) ?? null) : null;

  // The same over-capacity / unrated verdict the live board computes (OperationsBoard's
  // capacityFlagOf), against THIS archived op's own snapshot — the load share divides
  // by the struts that were actually standing when the incident closed, not the planned
  // groupTotal (H1/#415, SME-1). An incident archived mid-deploy (1 of a planned 3)
  // would otherwise be permanently recorded as clean.
  const capacityFlagOf = useMemo(() => {
    const flags = new Map<string, ReturnType<typeof deployedCapacityFlag>>();
    for (const sp of points) {
      if (sp.deployedBom == null) continue;
      flags.set(sp.id, deployedCapacityFlag(sp, deployedStrutCount(sp, points)));
    }
    return (sp: ShorePoint) => flags.get(sp.id) ?? null;
    // points is re-derived from `data` each render; key the memo on the source.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const reopen = async () => {
    setReopening(true);
    const result = await commit({ type: 'OperationReopened', id: newId(), opId, at: Date.now(), by: await getUid() });
    setReopening(false);
    // On success the op flips to active and the board reactively replaces this
    // view; the Past-operations list re-fetches on its next mount.
    if (result.ok) onClose();
    else setConfirmOpen(false);
  };

  return (
    <div className="fs-archive-view">
      <header className="fs-archive-view-head">
        <button type="button" className="fs-archive-back" aria-label="Back to past operations" onClick={onClose}>
          <BackIcon />
        </button>
        <h1 className="fs-archive-view-name">{operation?.name ?? 'Closed incident'}</h1>
      </header>

      <p className="fs-archive-banner" role="status">
        Viewing a closed incident — read-only
      </p>

      <div className="fs-ops-shell">
      <div className="fs-ops-main">
      {/* Per-status count strip — the SitStat glance for a frozen incident. */}
      <div className="fs-ops-summary" aria-hidden="true">
        {STATUS_ORDER.map((status) => (
          <span key={status} className={`fs-ops-summary-item is-${status}`}>
            {STATUS_LABELS[status]}
            <span className="fs-ops-summary-count">{points.filter((sp) => sp.status === status).length}</span>
          </span>
        ))}
      </div>

      {STATUS_ORDER.map((status) => {
        const laneItems = points.filter((sp) => sp.status === status);
        if (laneItems.length === 0) return null;
        return (
          <section key={status} className={`fs-lane is-${status}`} aria-label={STATUS_LABELS[status]}>
            <h2 className="fs-sr-only">{STATUS_LABELS[status]}</h2>
            <div className="fs-lane-header">
              <span className="fs-lane-title">{STATUS_LABELS[status]}</span>
              <Badge variant="count" value={laneItems.length} srLabel={`${laneItems.length} shore points`} />
            </div>
            <div className="fs-lane-cards" role="list">
              {laneItems.map((sp) => (
                <div key={sp.id} role="listitem">
                  <ShorePointCard
                    shorePoint={sp}
                    readOnly
                    capacityFlag={capacityFlagOf(sp)}
                    onOpenDetail={(s) => setDetailSpId(s.id)}
                  />
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {points.length === 0 && (
        <EmptyState
          variant="first-run"
          headline="No shore points recorded"
          reason="This incident was archived without any shore points."
        />
      )}

      <div className="fs-archive-actions">
        <Button variant="secondary" onPress={() => setConfirmOpen(true)}>
          Re-open this incident
        </Button>
      </div>
      </div>
      <SideDrawer
        open={!!detailSp}
        onClose={() => setDetailSpId(null)}
        title={detailSp ? shorePointDrawerTitle(detailSp) : ''}
      >
        {/* Same honest denominator in the Quick View verdict as on the cards — the
            board threads this at OperationsBoard:1555/1583 and the archive must too,
            or the drawer falls back to the planned groupTotal (SME-1). */}
        {detailSp && <ShorePointDetail sp={detailSp} deployedCount={deployedStrutCount(detailSp, points)} />}
      </SideDrawer>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Re-open this incident?"
        variant="confirm"
        footer={
          <>
            <Button variant="secondary" onPress={() => setConfirmOpen(false)}>
              <span data-modal-cancel>Cancel</span>
            </Button>
            <Button variant="primary" onPress={reopen} disabled={reopening}>
              Re-open
            </Button>
          </>
        }
      >
        <p>
          {operation?.name ?? 'This incident'} becomes the active operation again, with every shore point as it
          was left. You can only re-open when no other operation is active.
        </p>
      </Modal>
    </div>
  );
}
