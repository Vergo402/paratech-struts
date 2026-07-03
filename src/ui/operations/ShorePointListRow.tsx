import type { ShorePoint } from '@core/schema';
import { divisionLabel } from '@core/operation';
import { MeasurementValue } from '@ui/primitives';
import { SHORE_TYPE_LABELS } from './ShorePointCard';

/**
 * ShorePointListRow — the compact List-view row (tri-view prototype look, Alex
 * 2026-07-02). Read-only overview: a status left-edge, the location bold, a muted
 * `SP-N · type · crew` subline, and the measurement big + mono on the right. Tap
 * opens the detail drawer — actions live there (and on the Board), not here.
 * Status color rides the `.is-<status>` tokens (primitives.css), never raw hex.
 */
export function ShorePointListRow({
  sp,
  count,
  onOpen,
}: {
  sp: ShorePoint;
  /** >1 when this row stands for a grouped shore (rolodex of N legs). */
  count: number;
  onOpen: (sp: ShorePoint) => void;
}) {
  const loc = [divisionLabel(sp.division), sp.side].filter(Boolean).join(' · ') || '—';
  const sub = [`SP-${sp.seq ?? '—'}`, SHORE_TYPE_LABELS[sp.shoreType], sp.assignedResource || 'Unassigned'].join(
    ' · ',
  );
  return (
    <button
      type="button"
      role="listitem"
      data-sp-id={sp.id}
      className={`fs-splist-row is-${sp.status}`}
      onClick={() => onOpen(sp)}
    >
      <span className="fs-splist-main">
        <span className="fs-splist-loc">
          {loc}
          {count > 1 ? <span className="fs-splist-grp"> ×{count}</span> : null}
        </span>
        <span className="fs-splist-sub">{sub}</span>
      </span>
      <span className="fs-splist-ms">
        <MeasurementValue eighths={sp.measurementEighths} />
      </span>
    </button>
  );
}
