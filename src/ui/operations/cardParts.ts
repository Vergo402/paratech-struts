import type { ShorePoint, ShoreTypeId } from '@core/schema';
import { divisionLabel, sideLabel } from '@core/operation';

/**
 * Shared shore-point card content (Alex 2026-07-03) — one anatomy across the
 * Division tile, Board card, and List row so they read the same: SP-# top-left,
 * assigned-apparatus pill top-right, the LOCATION as the primary/focus line,
 * then label·type, then a de-emphasized strut·length line. These helpers give
 * the two text lines; each view supplies its own SP-#, apparatus pill, and
 * length (the Board is cut-phase aware, the others show the opening).
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
