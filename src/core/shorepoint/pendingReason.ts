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
  return catalog.some((c) => !c.exceedsCapacity) ? 'no-inventory' : 'no-match';
}
