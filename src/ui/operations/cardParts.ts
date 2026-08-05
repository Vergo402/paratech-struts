import type { ShorePoint, ShorePointStatus, ShoreTypeId } from '@core/schema';
import { divisionLabel, sideLabel } from '@core/operation';
import { cutLengthInches, effectiveLengthFrom, STATUS_ORDER } from '@core/shorepoint';

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

// Shared recommendation-surface EmptyState copy — the Add Shore Point modal and the
// Assign Equipment sheet show the SAME wording when nothing fits (#435 dedup). These
// are deliberately distinct from the shorter ShorePointCard PENDING_REASON_COPY
// framings, so they live here rather than folding into that map.
export const NO_MATCH_EMPTY = {
  headline: 'No matching struts',
  reason: 'Nothing fits this opening at this load — adjust deductions or re-measure',
} as const;
export const OVER_CAPACITY_EMPTY = {
  headline: 'Over capacity',
  reason: 'A strut fits, but the estimated load exceeds the 4-strut limit — escalate to engineering',
} as const;

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

/**
 * The status a MIXED group reads at on a read-only surface: its LEAST-ADVANCED live
 * leg (Alex's ruling 2026-07-28, #454). The Division tile rendered entirely from
 * members[0], so a set with one leg secured and two still cutting reported "SEC ×3" —
 * an at-a-glance overstatement of progress on legs still at the saw. Conservative by
 * design: a tile/row may never claim a group is further along than its slowest leg.
 * Identity (location, #, model) still comes from the front leg, which carries the
 * group's added identity. Ungrouped (one member) → that point's own status.
 *
 * Shared by the Division tile and the List row so the two tri-views agree — the same
 * rule OperationsBoard's laneItemRep/statusKey already use for the List's dividers and
 * status sort, which is what made the row's own front-leg edge inconsistent with the
 * divider it sat under.
 */
export function groupDisplayStatus(members: readonly ShorePoint[]): ShorePointStatus {
  const live = members.filter((m) => m.deletedAt == null);
  const pool = live.length > 0 ? live : members;
  return pool.reduce((a, b) => (STATUS_ORDER.indexOf(b.status) < STATUS_ORDER.indexOf(a.status) ? b : a)).status;
}

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

/** True where the value shelf prints a CUT length (so a cut-length warning belongs).
 *  Exported so the card gates its too-small chip on the SAME set that decides which
 *  number the shelf shows — the chip can never explain a number that isn't there. */
export function isCutPhase(sp: Pick<ShorePoint, 'status'>): boolean {
  return CUT_PHASES.has(sp.status);
}

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
