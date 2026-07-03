import type { ShorePoint } from '@core/schema';
import { bomModelLabel } from '@core/shorepoint';
import { MeasurementValue } from '@ui/primitives';
import { cardLocation, cardLabelType } from './cardParts';

/**
 * ShorePointListRow — the List-view row, at the unified card anatomy (Alex
 * 2026-07-03, `unified_card_anatomy_three_views`): a top row of SP-# (left) and
 * the assigned-apparatus pill (right), the LOCATION bold as the focus,
 * `label · type` secondary, then a quiet mono `model · length` line. Medium
 * density — read-only, tap opens the detail drawer; actions live there (and the
 * Board). Status color rides the `.is-<status>` left edge (primitives.css), never
 * raw hex. List/Division show the OPENING measurement; the Board is cut-phase aware.
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
  const model = bomModelLabel(sp);
  return (
    <button
      type="button"
      role="listitem"
      data-sp-id={sp.id}
      className={`fs-splist-row is-${sp.status}`}
      onClick={() => onOpen(sp)}
    >
      <span className="fs-splist-top">
        <span className="fs-splist-seq">{sp.seq != null ? `#${sp.seq}` : ''}</span>
        {sp.assignedResource ? <span className="fs-splist-appar">{sp.assignedResource}</span> : null}
      </span>
      <span className="fs-splist-loc">
        {cardLocation(sp) || '—'}
        {count > 1 ? <span className="fs-splist-grp"> ×{count}</span> : null}
      </span>
      <span className="fs-splist-sub">{cardLabelType(sp)}</span>
      <span className="fs-splist-val">
        {model ? <span className="fs-splist-model">{model} · </span> : null}
        <MeasurementValue eighths={sp.measurementEighths} className="fs-splist-num" />
      </span>
    </button>
  );
}
