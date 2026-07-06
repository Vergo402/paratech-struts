import type { ShorePoint, ShorePointStatus, ShoreTypeId } from '@core/schema';
import { divisionLabel, sideLabel } from '@core/operation';
import { cutLengthInches, effectiveLengthFrom } from '@core/shorepoint';

/**
 * Shared shore-point card content (Alex 2026-07-03) — one anatomy across the
 * Division tile, Board card, and List row so they read the same: SP-# top-left,
 * assigned-apparatus pill top-right, the LOCATION as the primary/focus line,
 * then label·type, then a de-emphasized strut·length line. These helpers give the
 * two text lines + the shared value length (cardValueEighths — cut-phase aware, the
 * SAME number on all three views now; audit #416 D3); each view supplies its own SP-#
 * and apparatus pill.
 *
 * SHORE_TYPE_LABELS lives here (not in ShorePointCard) so these helpers don't
 * import back into the card — ShorePointCard re-exports it for existing callers.
 */
export const SHORE_TYPE_LABELS: Record<ShoreTypeId, string> = {
  't-shore': 'T-Shore',
  'double-t': 'Double-T',
  '3-post': '3-Post',
};

/** PRIMARY line — the strut's location (the focus): Building · Division · Side · Unit. */
/** The SHORT status tier (#432, mess-map #11) — ONE map shared by the Board lane
 *  headers, the List dividers, and the Division tiles (which used opaque PEND /
 *  PROC / STRUT abbreviations). Full labels stay STATUS_LABELS (@core). */
export const STATUS_SHORT_LABEL: Record<ShorePointStatus, string> = {
  pending: 'Pending',
  process: 'Assigned',
  strutset: 'Strut Set',
  cutting: 'Cutting',
  runner: 'Runner',
  secured: 'Secured',
  returned: 'Returned',
};

export function cardLocation(sp: ShorePoint): string {
  return [
    ...(sp.building ? [sp.building] : []),
    divisionLabel(sp.division),
    ...(sp.side ? [sideLabel(sp.side)] : []),
    ...(sp.area ? [sp.area] : []),
  ].join(' · ');
}

/** SECONDARY line — the optional user label, then the shore type. */
export function cardLabelType(sp: ShorePoint): string {
  return [...(sp.label ? [sp.label] : []), SHORE_TYPE_LABELS[sp.shoreType]].join(' · ');
}

// From the cutting phase on, the value shelf shows the wood CUT length (shore-type
// lumber + wedge, no plates; #361); pre-cut it is the effective strut length.
const CUT_PHASES = new Set<ShorePointStatus>(['cutting', 'runner', 'secured', 'returned']);

/**
 * The value-shelf length in eighths — cut length once cutting, else the effective
 * (post-deduction) strut length. ONE helper so the Board card, List row, and Division
 * tile print the SAME number for a point (2026-07-04 audit #416 D3: the two tri-views
 * printed the RAW opening in the slot where the Board printed effective/cut). × 8 lands
 * on an exact eighth; round() only defends float noise — no double-floor.
 */
export function cardValueEighths(sp: ShorePoint): number {
  return Math.round(
    (CUT_PHASES.has(sp.status) ? cutLengthInches(sp) : effectiveLengthFrom(sp.measurementEighths, sp.deductions)) * 8,
  );
}
