import type { ShorePoint } from '@core/schema';
import {
  deployedStrutOf,
  findForShorePoint,
  strutLoadShare,
  strutLoadShareDeployed,
  unknownPlateIds,
} from '@core/shorepoint';
import { sameExtensions } from './pieceIdentity';

/**
 * The re-verified safety verdict for a DEPLOYED shore — a CONFIRMED re-run of the
 * fit engine against the point's own persisted inputs, matched to the deployed
 * assembly by strut model + extension multiset (decision F, never a false pass).
 * One source for the verdict: the Quick View hero (ShorePointDetail) AND the board
 * "verify" surface (the red edge / banner / Division rail) both read it, so a point
 * flags identically wherever it shows. `warn` = over-capacity OR unrated (the thing
 * to physically check); `unknown` = no strut on record / not re-verifiable / no usable
 * load recorded (absent, or a schema-legal 0 — #455) / a connector outside this build's
 * catalog (#457) — reference, not an exception, and never asserted as a pass;
 * `ok` = within rated capacity.
 *
 * CATALOG MODE is deliberate (2026-07-02 audit; #408/#410): the fit runs against the
 * CATALOG, not live inventory. A strut's rating is physics — system + length — not a
 * function of what's left in stock, so deploying the LAST unit of a model must not
 * turn a real over-capacity / unrated warning into "not re-verifiable" by dropping the
 * model out of an available>0 filter. It also aligns this verdict with the store's
 * catalog-mode deploy guard.
 */
export type ShoreSafety = { kind: 'ok' | 'warn' | 'unknown'; msg: string };

export function shoreSafety(sp: ShorePoint, deployedCount?: number): ShoreSafety {
  const strut = deployedStrutOf(sp);
  if (!strut?.model) return { kind: 'unknown', msg: 'No strut on record for this shore.' };
  // #457 — a deduction naming a plate id this build's catalog doesn't know deducts 0″,
  // so the effective length this verdict is computed at is longer than the real one and
  // every capacity number below is derived from a wrong length. That is unverifiable,
  // never a pass. (Not a rejection: the id is legal on the wire and rides in from a peer
  // on a newer catalog — see unknownPlateIds.)
  if (unknownPlateIds(sp.deductions).length > 0) {
    return {
      kind: 'unknown',
      msg: 'Capacity not verifiable — a connector on this shore is not in this app’s catalog, so its deduction is missing from the length. Update the app, or re-check the connectors.',
    };
  }
  // #455 — a recorded load of 0 (or negative) is schema-legal and reachable by a peer
  // write, but it is not a load ESTIMATE: a 0 share never exceeds a rating, so leaving
  // it in would walk the point past every capacity check to "Within rated capacity".
  // Treat it exactly like an absent load — unverified, never asserted as safe.
  const load = sp.estimatedLoad != null && sp.estimatedLoad > 0 ? sp.estimatedLoad : null;
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
  if (load != null) {
    // Split across the struts actually standing when the caller knows the count
    // (H1/#415); planned groupTotal is the last-resort fallback only.
    const share = deployedCount != null ? strutLoadShareDeployed(sp, deployedCount) : strutLoadShare(sp);
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
  if (load == null) {
    return {
      kind: 'unknown',
      msg: `No load estimate recorded — capacity not verified. This strut is rated ${Math.floor(match.capacity).toLocaleString()} lbs at this length.`,
    };
  }
  return { kind: 'ok', msg: `Within rated capacity — ${Math.floor(match.capacity).toLocaleString()} lbs per strut.` };
}
