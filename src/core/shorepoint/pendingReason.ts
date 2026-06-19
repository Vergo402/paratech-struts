import type { InventoryItem, PendingReason, ShorePoint } from '../schema';
import { findForShorePoint } from './reducer';

/**
 * Why a Pending shore point has no equipment assigned — computed LIVE from
 * current stock (S6, #221), never persisted. The board shows it on Pending
 * cards and the Assign Equipment sheet uses it for its empty-state variant,
 * so the reason appears/clears on its own as inventory changes.
 *
 *   undefined        — deployable recommendations exist (unrated counts: it
 *                      is deployable-with-acknowledgment; the over-capacity
 *                      sentinel does NOT — its deploy path is closed)
 *   'no-inventory'   — a strut that fits exists in the Paratech catalog, but
 *                      none is available on scene (stock problem)
 *   'over-capacity'  — a strut fits geometrically, but every option exceeds the
 *                      4-strut capacity cap at this load (escalate, not a miss)
 *   'no-match'       — nothing fits this opening geometrically at all
 *
 * Deliberate broadening of the v3 semantics: v3 (app.js deployPendingShorePoint)
 * stamped 'no-inventory' only when the operation inventory was literally empty
 * at save time, and never displayed the reason. The catalog re-run is v3's own
 * "informational" search (findForShorePoint with no inventory) repurposed to
 * tell a stock problem from a geometry problem. Copy nuance is reserved for
 * the Phase H copy pass (workflow #221 OQ1).
 */
export function pendingReasonFor(sp: ShorePoint, inventory: InventoryItem[]): PendingReason | undefined {
  const stocked = findForShorePoint(sp, inventory);
  if (stocked.some((c) => !c.exceedsCapacity)) return undefined;
  const catalog = findForShorePoint(sp, null);
  if (catalog.some((c) => !c.exceedsCapacity)) return 'no-inventory';
  // A geometric fit exists but every option is over the 4-strut capacity cap →
  // the load is too high (needs more capacity / engineering), NOT a geometry
  // miss. Only an empty catalog is a true no-match (audit W3).
  return catalog.length > 0 ? 'over-capacity' : 'no-match';
}

/**
 * The strut model(s) that WOULD fit this opening per the Paratech catalog — i.e.
 * what to pull onto a truck when a no-inventory Pending point is waiting on stock.
 * Catalog-only (no inventory), capacity-deployable, deduped in recommendation
 * order. Empty when nothing fits at all (a 'no-match' point — nothing to name).
 */
export function pendingNeedModels(sp: ShorePoint): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of findForShorePoint(sp, null)) {
    if (c.exceedsCapacity || !c.strut.model) continue;
    if (!seen.has(c.strut.model)) {
      seen.add(c.strut.model);
      out.push(c.strut.model);
    }
  }
  return out;
}
