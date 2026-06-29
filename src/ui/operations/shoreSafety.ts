import type { ShorePoint } from '@core/schema';
import { deployedStrutOf, findForShorePoint, strutLoadShare } from '@core/shorepoint';
import { sameExtensions } from './pieceIdentity';

/**
 * The re-verified safety verdict for a DEPLOYED shore — a CONFIRMED re-run of the
 * fit engine against the point's own persisted inputs, matched to the deployed
 * assembly by strut model + extension multiset (decision F, never a false pass).
 * One source for the verdict: the Quick View hero (ShorePointDetail) AND the board
 * "verify" surface (the red edge / banner / Division rail) both read it, so a point
 * flags identically wherever it shows. `warn` = over-capacity OR unrated (the thing
 * to physically check); `unknown` = no strut on record / not re-verifiable / no load
 * recorded — reference, not an exception, and never asserted as a pass; `ok` = within
 * rated capacity.
 *
 * CATALOG MODE is deliberate (2026-07-02 audit; #408/#410): the fit runs against the
 * CATALOG, not live inventory. A strut's rating is physics — system + length — not a
 * function of what's left in stock, so deploying the LAST unit of a model must not
 * turn a real over-capacity / unrated warning into "not re-verifiable" by dropping the
 * model out of an available>0 filter. It also aligns this verdict with the store's
 * catalog-mode deploy guard.
 */
export type ShoreSafety = { kind: 'ok' | 'warn' | 'unknown'; msg: string };

export function shoreSafety(sp: ShorePoint): ShoreSafety {
  const strut = deployedStrutOf(sp);
  if (!strut?.model) return { kind: 'unknown', msg: 'No strut on record for this shore.' };
  const exts = (sp.deployedBom ?? [])
    .filter((c) => c.role === 'extension' && c.length != null)
    .map((c) => c.length!);
  // Catalog mode — pass no live inventory (see header): rating is physics, not stock.
  const match = findForShorePoint(sp, null).find(
    (c) => c.strut.model === strut.model && sameExtensions(c.extensions, exts),
  );
  if (!match) return { kind: 'unknown', msg: 'Capacity not re-verifiable for the deployed assembly.' };
  if (match.unrated) return { kind: 'warn', msg: match.unratedReason ?? 'Unrated zone — capacity is not published at this length.' };
  if (match.exceedsCapacity) return { kind: 'warn', msg: match.exceedsCapacityReason ?? 'Over capacity at the estimated load.' };
  // Per-strut over-capacity: this point deploys exactly ONE strut, but the engine
  // returns combos needing 2–4 struts unflagged (recommendedQty is advisory). Compare
  // this strut's SHARE of the load to its rated capacity, or a multi-strut load reads
  // as a false SAFE (#408). Only checkable when a load was recorded.
  if (sp.estimatedLoad != null) {
    const share = strutLoadShare(sp);
    if (share > match.capacity) {
      const shareTxt = `${Math.ceil(share).toLocaleString()} lbs`;
      const capTxt = `${Math.floor(match.capacity).toLocaleString()} lbs`;
      return {
        kind: 'warn',
        msg:
          (sp.groupTotal ?? 1) > 1
            ? `Over capacity — this strut's share of the load (${shareTxt}) exceeds its ${capTxt} rating at this length.`
            : `Over capacity — estimated load ${shareTxt} exceeds this strut's ${capTxt} rating at this length.`,
      };
    }
  }
  // Fully-extended zero-margin (load-independent): the card shows this caution but the
  // deployed-shore verdict dropped it (2026-07-02 audit). Surface it — a strut at
  // maximum reach has no room to compensate if the opening grows.
  if (match.boundaryWarning === 'fully-extended') {
    return {
      kind: 'warn',
      msg: `Fully extended — zero margin. The strut is at its maximum reach (${match.adjExtended}″); no room to compensate if the opening grows.`,
    };
  }
  // No load recorded → the capacity can't be VERIFIED, so never assert a pass (the
  // absent-load false SAFE, 2026-07-02 audit). The load field is optional, so this is a
  // common case, not an edge one; it reads as unverified, not as safe.
  if (sp.estimatedLoad == null) {
    return {
      kind: 'unknown',
      msg: `No load estimate recorded — capacity not verified. This strut is rated ${Math.floor(match.capacity).toLocaleString()} lbs at this length.`,
    };
  }
  return { kind: 'ok', msg: `Within rated capacity — ${Math.floor(match.capacity).toLocaleString()} lbs per strut.` };
}
