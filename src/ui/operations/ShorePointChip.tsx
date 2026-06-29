import type { ShorePoint } from '@core/schema';
import { divisionLabel } from '@core/operation';
import { cutLengthInches, effectiveLengthFrom } from '@core/shorepoint';
import { Badge, MeasurementValue } from '@ui/primitives';
import { SHORE_TYPE_LABELS, shorePointDrawerTitle, statusClasses } from './ShorePointCard';

// The compact scan chip (3 Views × 2 Devices). Division + List are the glance/scan
// views: a chip is READ-ONLY — tapping it opens the point's Quick View; advancing
// work stays on the Board's full card (Alex, 2026-06-29). The chip re-composes the
// card's atoms (statusClasses → the `--sp-solid` left edge, MeasurementValue, the
// status Badge, SHORE_TYPE_LABELS) so it reads identically and is theme-correct in
// all four themes — it never hard-codes a status hex.

// Post-cut phases read the wood CUT length; pre-cut reads the required strut length
// (#361 — mirrors ShorePointCard's shelf). Both helpers return inches floored to ⅛″.
const CUT_PHASES = new Set<ShorePoint['status']>(['cutting', 'runner', 'secured', 'returned']);
function valueEighths(sp: ShorePoint): number {
  const inches = CUT_PHASES.has(sp.status)
    ? cutLengthInches(sp)
    : effectiveLengthFrom(sp.measurementEighths, sp.deductions);
  return Math.round(inches * 8);
}

export interface ShorePointChipProps {
  sp: ShorePoint;
  /** division = measurement-led tile (floor bays); list = compact row (status groups). */
  variant: 'division' | 'list';
  /** Tap → Quick View (the scan views never mutate; the Board owns advancing). */
  onOpen?: (sp: ShorePoint) => void;
  /** Standing-verify / safety flag — red edge + dot (reuses the --danger overlay). */
  flagged?: boolean;
  /** A physical multi-strut shore (3-Post = 3 legs) shown as ONE chip — the leg
   *  count rides a badge (Alex 2026-06-29: one chip with a count badge). */
  groupCount?: number;
}

export function ShorePointChip({ sp, variant, onOpen, flagged = false, groupCount }: ShorePointChipProps) {
  const cls = `fs-spchip fs-spchip--${variant} ${statusClasses(sp)}${flagged ? ' is-flagged' : ''}`;
  const where = [
    ...(sp.building ? [sp.building] : []),
    divisionLabel(sp.division),
    ...(sp.area ? [sp.area] : []),
  ].join(' · ');
  const crew = sp.assignedResource || 'Unassigned';
  const idText = sp.seq != null ? `#${sp.seq}` : '';
  const grouped = groupCount != null && groupCount > 1;
  const meas = <MeasurementValue eighths={valueEighths(sp)} />;

  const inner =
    variant === 'division' ? (
      <>
        <span className="fs-spchip-top">
          {idText && <span className="fs-spchip-id">{idText}</span>}
          {flagged && <span className="fs-spchip-flag" aria-hidden="true" />}
          {grouped && <Badge variant="label">{`×${groupCount}`}</Badge>}
        </span>
        <span className="fs-spchip-meas">{meas}</span>
        <span className="fs-spchip-row">
          <Badge variant="status" status={sp.status} />
          <span className="fs-spchip-type">{SHORE_TYPE_LABELS[sp.shoreType]}</span>
        </span>
        <span className="fs-spchip-crew">{crew}</span>
      </>
    ) : (
      // list row — the status is carried by the group header + the left edge, so no
      // inline status pill (location leads; measurement pinned right).
      <>
        <span className="fs-spchip-main">
          <span className="fs-spchip-loc">
            {where || SHORE_TYPE_LABELS[sp.shoreType]}
            {flagged && <span className="fs-spchip-flag" aria-hidden="true" />}
          </span>
          <span className="fs-spchip-sub">
            {[idText, SHORE_TYPE_LABELS[sp.shoreType], crew].filter(Boolean).join(' · ')}
            {grouped && (
              <>
                {' '}
                <Badge variant="label">{`×${groupCount}`}</Badge>
              </>
            )}
          </span>
        </span>
        <span className="fs-spchip-meas">{meas}</span>
      </>
    );

  const label = `Open ${shorePointDrawerTitle(sp)}${where ? ` — ${where}` : ''}`;
  return onOpen ? (
    <button type="button" className={cls} data-sp-id={sp.id} onClick={() => onOpen(sp)} aria-label={label}>
      {inner}
    </button>
  ) : (
    <div className={cls} data-sp-id={sp.id}>
      {inner}
    </div>
  );
}
