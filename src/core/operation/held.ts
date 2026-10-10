import type { ShorePoint } from '../schema';
import type { OperationState } from './reducer';

// ADR-041 — stock HELD by deployed equipment is a projection of the event log, not a
// stored counter. `available` is never persisted again: it is `quantity − held`, and it
// may go negative on purpose (D2 — two offline deploys of the last unit both stay
// deployed; the rig reads over-allocated).

/** Units held per inventory row id. Rows with nothing held are absent (read as 0). */
export type HeldCounts = Readonly<Record<string, number>>;

/** True when this point's BOM is physically out on scene (deployed and not returned). */
function holds(sp: ShorePoint): boolean {
  return sp.deployedBom != null && sp.status !== 'returned';
}

function tally(points: readonly ShorePoint[], into: Map<string, number>): void {
  for (const sp of points) {
    // deletedAt is deliberately ignored: a soft-deleted point that still carries a BOM
    // has its equipment on scene until it is returned (the fold refuses to delete a
    // holder, so this only matters for legacy logs).
    if (!holds(sp)) continue;
    for (const c of sp.deployedBom!) {
      if (c.inventoryId === undefined) continue; // untracked — no stock consequence
      into.set(c.inventoryId, (into.get(c.inventoryId) ?? 0) + 1);
    }
  }
}

// Object.fromEntries defines OWN properties, so an id like "__proto__" can't touch the
// prototype; reads go through Object.hasOwn for the same reason.
const toRecord = (m: Map<string, number>): HeldCounts => Object.fromEntries(m);

/**
 * Units held by one op's shore points: every TRACKED component (one with an inventoryId)
 * of a point with a deployedBom whose status is not `returned` counts 1. Untracked
 * components never count; legacy StrutDeployed and ComponentResourced need no special
 * case (the reducer already projects them into deployedBom).
 */
export function heldInShorePoints(points: readonly ShorePoint[]): HeldCounts {
  const m = new Map<string, number>();
  tally(points, m);
  return toRecord(m);
}

/** Read the projected flag without depending on its declaration order (core/schema). */
function stockReleased(state: OperationState): boolean {
  const op = state.operation;
  return op != null && 'stockReleased' in op && op.stockReleased === true;
}

/**
 * Held units summed over EVERY op in the bucket — ended ops included (their equipment is
 * still out until returned) — EXCEPT an op whose projected `operation.stockReleased` is
 * true (End Operation with "All equipment is back on the rigs"; OperationReopened clears
 * it, so a re-opened op holds again).
 */
export function heldCounts(opStates: Iterable<OperationState>): HeldCounts {
  const m = new Map<string, number>();
  for (const s of opStates) if (!stockReleased(s)) tally(s.shorePoints, m);
  return toRecord(m);
}

/** Held units for one row id (0 when absent). */
export function heldOf(held: HeldCounts, id: string): number {
  return Object.hasOwn(held, id) ? held[id]! : 0;
}

/**
 * Attach the derived `available = quantity − held` to each stock row. Signed on purpose
 * (D2): a negative value is the over-allocated tell, never clamped here — consumers that
 * need a non-negative count (the selection engine) clamp at their own boundary.
 */
export function withAvailability<T extends { id: string; quantity: number }>(
  rows: readonly T[],
  held: HeldCounts,
): Array<T & { available: number }> {
  return rows.map((r) => ({ ...r, available: r.quantity - heldOf(held, r.id) }));
}
