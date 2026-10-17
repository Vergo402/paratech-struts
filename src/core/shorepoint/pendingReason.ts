import type { StockRow, PendingReason, ShorePoint } from '../schema';
import { findForShorePoint } from './reducer';

/**
 * Why a Pending shore point has no equipment assigned — computed LIVE from
 * current stock (S6, #221), never persisted. The board shows it on Pending
 * cards and the Assign Equipment sheet uses it for its empty-state variant,
 * so the reason appears/clears on its own as inventory changes.
 *
 *   undefined        — deployable recommendations exist (unrated counts: it
 *                      is deployable-with-acknowledgment)
 *   'no-inventory'   — a strut that fits exists in the Paratech catalog, but
 *                      none is available on scene (stock problem)
 *   'no-match'       — nothing fits this opening geometrically at all
 *
 * The load never changes the answer (#531): a heavy load just needs more struts
 * of a model that fits, so there is no load-driven reason.
 *
 * Deliberate broadening of the v3 semantics: v3 (app.js deployPendingShorePoint)
 * stamped 'no-inventory' only when the operation inventory was literally empty
 * at save time, and never displayed the reason. The catalog re-run is v3's own
 * "informational" search (findForShorePoint with no inventory) repurposed to
 * tell a stock problem from a geometry problem. Copy nuance is reserved for
 * the Phase H copy pass (workflow #221 OQ1).
 */
export function pendingReasonFor(sp: ShorePoint, inventory: StockRow[]): PendingReason | undefined {
  const stocked = findForShorePoint(sp, inventory);
  if (stocked.length > 0) return undefined;
  // Only an empty catalog is a true no-match (audit W3).
  return findForShorePoint(sp, null).length > 0 ? 'no-inventory' : 'no-match';
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
    if (!c.strut.model) continue;
    if (!seen.has(c.strut.model)) {
      seen.add(c.strut.model);
      out.push(c.strut.model);
    }
  }
  return out;
}
