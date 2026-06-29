import type { ShorePoint, ShorePointStatus } from '@core/schema';
import { divisionLabel } from '@core/operation';
import { STATUS_LABELS, STATUS_ORDER } from '@core/shorepoint';
import { MeasurementValue } from '@ui/primitives';
import { shorePointDrawerTitle } from './ShorePointCard';

// The "verify" surface (3 Views × 2 Devices). The standing safety check reuses the
// existing re-verified capacity verdict (Alex 2026-06-29): a deployed point whose
// recomputed verdict is `warn` is "flagged". There is no separate saved/ACK'd flag,
// so the mockup's ACK becomes a "Review" that opens the point — honest about what
// the surface represents (a live safety read, not an acknowledgeable to-do).

function whereOf(sp: ShorePoint): string {
  return [...(sp.building ? [sp.building] : []), divisionLabel(sp.division), ...(sp.area ? [sp.area] : [])].join(' · ');
}

/** Top banner on Board + List (and phone Division, which has no rail). */
export function VerifyBanner({
  flagged,
  onReview,
}: {
  flagged: ShorePoint[];
  onReview: (sp: ShorePoint) => void;
}) {
  if (flagged.length === 0) return null;
  const first = flagged[0]!;
  return (
    <div className="fs-ops-verify" role="alert">
      <span className="fs-ops-verify-ic" aria-hidden="true">
        !
      </span>
      <div className="fs-ops-verify-txt">
        <b>Safety check needed</b>
        <span>
          {flagged.length === 1
            ? `${shorePointDrawerTitle(first)} · ${whereOf(first)} — capacity flagged, confirm the shore.`
            : `${flagged.length} shore points flagged — confirm their capacity.`}
        </span>
      </div>
      <button type="button" className="fs-ops-verify-act" onClick={() => onReview(first)}>
        Review
      </button>
    </div>
  );
}

/** The desktop Division right rail: safety check · operation rollup · flagged point. */
export function DivisionRail({
  flagged,
  byStatus,
  total,
  onOpen,
}: {
  flagged: ShorePoint[];
  byStatus: Record<ShorePointStatus, ShorePoint[]>;
  total: number;
  onOpen: (sp: ShorePoint) => void;
}) {
  const secured = byStatus.secured.length;
  const first = flagged[0];
  return (
    <aside className="fs-ops-vrail" aria-label="Division summary">
      {first && (
        <section className="fs-vr-sec">
          <h4 className="fs-vr-h">Safety check</h4>
          <div className="fs-vr-card is-flagged">
            <div className="fs-vr-card-top">
              <span className="fs-vr-card-id">{shorePointDrawerTitle(first)}</span>
              <span className="fs-spchip-flag" aria-hidden="true" />
            </div>
            <div className="fs-vr-card-meas">
              <MeasurementValue eighths={first.measurementEighths} />
            </div>
            <div className="fs-vr-card-meta">
              {whereOf(first)}
              {first.assignedResource ? ` · ${first.assignedResource}` : ''}
            </div>
            <p className="fs-vr-card-note">Capacity flagged on the re-verified safety check — confirm the shore before it is secured.</p>
            <button type="button" className="fs-vr-card-act" onClick={() => onOpen(first)}>
              Open
            </button>
          </div>
        </section>
      )}
      <section className="fs-vr-sec">
        <h4 className="fs-vr-h">Operation rollup</h4>
        <div className="fs-vr-rollup">
          <div className="fs-vr-big">
            <b>{secured}</b>
            <small>of {total} shore points secured</small>
          </div>
          <div className="fs-vr-bar" aria-hidden="true">
            {STATUS_ORDER.map((s) => (
              <i key={s} className={`is-${s}`} style={{ flexGrow: byStatus[s].length || 0.0001 }} />
            ))}
          </div>
          <div className="fs-vr-counts">
            {STATUS_ORDER.filter((s) => byStatus[s].length > 0).map((s) => (
              <span key={s} className={`fs-vr-count is-${s}`}>
                <i aria-hidden="true" />
                {STATUS_LABELS[s]}
                <b>{byStatus[s].length}</b>
              </span>
            ))}
          </div>
        </div>
      </section>
    </aside>
  );
}
