import { STATUS_IDS, type ShorePointStatus } from '../schema';

// L-7 — status is monotonic-by-guard. STATUS_ORDER is the lifecycle order (the
// canonical tuple from the schema enum); transitions are single-step and, under
// ADR-010, reversible. The reducer enforces deliberate-only moves so a grouped
// transition can never *accidentally* regress a group-mate that has advanced.

/** The 7 statuses in lifecycle order. STATUS_ORDER[0] === 'pending'. */
export const STATUS_ORDER = STATUS_IDS;

export const STATUS_LABELS: Record<ShorePointStatus, string> = {
  pending: 'Pending Equipment',
  process: 'Equipment Assigned',
  strutset: 'Strut Set',
  cutting: 'Cutting Station',
  runner: 'Runner',
  secured: 'Wood Shore Secured',
  returned: 'Strut Equipment Returned',
};

/** Position of a status in the lifecycle (0-based). */
export function statusIndex(status: ShorePointStatus): number {
  return STATUS_ORDER.indexOf(status);
}

/**
 * A legal single-step lifecycle move: adjacent in STATUS_ORDER, either direction
 * (ADR-010 reversibility). NOT same-status, NOT a skip. The pending↔process
 * boundary is adjacent here but is owned by deploy/return (StrutDeployed /
 * StrutReturned), not ShorePointStatusChanged — the reducer enforces that split.
 */
export function canTransition(from: ShorePointStatus, to: ShorePointStatus): boolean {
  return Math.abs(statusIndex(to) - statusIndex(from)) === 1;
}

/** True when `a` is strictly later in the lifecycle than `b` (L-7 regression guard). */
export function isAfter(a: ShorePointStatus, b: ShorePointStatus): boolean {
  return statusIndex(a) > statusIndex(b);
}

/** Live cutting-station queue depth — the org chart workstation numeral ("N in
 *  queue", #434) and the same live filter the board's Cutting tab counts. */
export function cuttingQueueCount(
  shorePoints: { status: ShorePointStatus; deletedAt?: number | null }[],
): number {
  return shorePoints.filter((sp) => sp.deletedAt == null && sp.status === 'cutting').length;
}
