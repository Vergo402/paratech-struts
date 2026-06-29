import type { ShorePoint } from '@core/schema';
import { deployedStrutOf, findForShorePoint } from '@core/shorepoint';
import { sameExtensions } from './pieceIdentity';

/**
 * The re-verified safety verdict for a DEPLOYED shore — a CONFIRMED re-run of the
 * fit engine against the point's own persisted inputs, matched to the deployed
 * assembly by strut model + extension multiset (decision F, never a false pass).
 * One source for the verdict: the Quick View hero (ShorePointDetail) AND the board
 * "verify" surface (the red edge / banner / Division rail) both read it, so a point
 * flags identically wherever it shows. `warn` = over-capacity OR unrated (the thing
 * to physically check); `unknown` = no strut on record / not re-verifiable (stock
 * changed, off-book) — reference, not an exception; `ok` = within rated capacity.
 */
export type ShoreSafety = { kind: 'ok' | 'warn' | 'unknown'; msg: string };

export function shoreSafety(sp: ShorePoint, inventory: Parameters<typeof findForShorePoint>[1]): ShoreSafety {
  const strut = deployedStrutOf(sp);
  if (!strut?.model) return { kind: 'unknown', msg: 'No strut on record for this shore.' };
  const exts = (sp.deployedBom ?? [])
    .filter((c) => c.role === 'extension' && c.length != null)
    .map((c) => c.length!);
  const match = findForShorePoint(sp, inventory).find(
    (c) => c.strut.model === strut.model && sameExtensions(c.extensions, exts),
  );
  if (!match) return { kind: 'unknown', msg: 'Capacity not re-verifiable for the deployed assembly.' };
  if (match.unrated) return { kind: 'warn', msg: match.unratedReason ?? 'Unrated zone — capacity is not published at this length.' };
  if (match.exceedsCapacity) return { kind: 'warn', msg: match.exceedsCapacityReason ?? 'Over capacity at the estimated load.' };
  return { kind: 'ok', msg: `Within rated capacity — ${Math.floor(match.capacity).toLocaleString()} lbs per strut.` };
}
