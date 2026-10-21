import { THREE_POST_WOOD, type StrutCombination } from '../load';
import type { Deductions, ShorePoint, ShoreTypeId, StockRow } from '../schema';
import { cutLengthInches, effectiveLengthFrom, findForShorePoint, strutLoadShare } from './reducer';

// The "Add N more struts — deploy as 3-Post" one-tap (Alex 2026-10-20). A 3-Post is
// built on THREE_POST_WOOD (6×6), and the cut length follows the picked wood, so the
// conversion must (1) BUILD at 6×6, and (2) re-check the strut at the 6×6 length
// before the card offers the tap — 6×6 deducts 4″ more than 4×4, which can drop the
// strut below its minimum. Pure: the engine (findForShorePoint, catalog mode — fit and
// rating are physics, never stock, the #410-4 contract DeployResolution follows) and
// the cut formula (cutLengthInches) stay the sole owners of the math.

/** The deductions a one-tap conversion builds at: a 3-Post takes THREE_POST_WOOD for
 *  header + footer (plates kept); every other target keeps the shore's own wood. */
export function conversionDeductions(target: ShoreTypeId, deductions: Deductions): Deductions {
  return target === '3-post' ? { ...deductions, ...THREE_POST_WOOD } : deductions;
}

export type ThreePostRecheck =
  | {
      fits: true;
      /** The combo to deploy: the card's own when the wood was already 6×6 or its
       *  extension set still fits; else the engine's 6×6 combo for the same strut
       *  model, carrying the card's stock-bound strut candidate. */
      combo: StrutCombination;
      /** The deductions the 3-Post is built at (6×6 header + footer, plates kept). */
      deductions: Deductions;
      /** Strut length at 6×6 (inches, floored to ⅛″). */
      strutLength: number;
      /** Wood cut length at 6×6 (inches, floored to ⅛″). */
      cutLength: number;
      /** False when the shore was already on 6×6/6×6 — nothing about the build changes. */
      woodChanged: boolean;
    }
  | {
      fits: false;
      reason: 'too-short' | 'too-long';
      strutLength: number;
      /** The minimum (too-short) or maximum (too-long) length it was measured against. */
      limit: number;
      /** True → the limit is the card's ASSEMBLY (strut + its extensions); false → the
       *  bare strut's own collapsed length. Lets the reason name what it measured. */
      ofAssembly: boolean;
    }
  | {
      fits: false;
      reason: 'capacity';
      strutLength: number;
      /** One strut's share of the load across the 3-Post (lbs). */
      perStrut: number;
      /** The strut's rated capacity at the 6×6 length (lb, 4:1). 0 = not rated there. */
      capacity: number;
    }
  | {
      fits: false;
      reason: 'extension-missing';
      strutLength: number;
      /** The extension set the 6×6 refit needs, which no rig on scene stocks. */
      extensions: number[];
    };

/** Multiset compare of two extension-length lists (order-independent). */
function sameExtensions(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false;
  const s = [...a].sort((x, y) => x - y);
  const t = [...b].sort((x, y) => x - y);
  return s.every((v, i) => v === t[i]);
}

/**
 * Re-check a recommendation for the one-tap conversion to a 3-Post of `struts`
 * members on THREE_POST_WOOD. `combo` is the card's recommendation at the shore's
 * CURRENT deductions (its openingLength is the raw opening); `deductions` are those
 * current selections.
 *
 * Fit is judged on the SAME strut model the card shows: the same extension set when
 * it still spans the 6×6 length, else the engine's best combo for that model there
 * (a shorter length can only need fewer / shorter extensions). Capacity uses the
 * store's own share rule (strutLoadShare over the 3-Post's members) against the
 * engine's rating at the exact 6×6 length.
 *
 * `inventory` (optional): when the 6×6 refit needs a DIFFERENT extension set, it is
 * re-checked against stock — a set no rig on scene can supply locks the tap instead of
 * leaving a Pending member (review fix 2026-10-21). Absent → catalog-only, as before.
 */
export function recheckThreePost(
  combo: StrutCombination,
  deductions: Deductions,
  estimatedLoad: number,
  struts: number,
  inventory?: StockRow[] | null,
): ThreePostRecheck {
  const six = conversionDeductions('3-post', deductions);
  const woodChanged = six.headerWood !== deductions.headerWood || six.footerWood !== deductions.footerWood;
  const measurementEighths = Math.round(combo.openingLength * 8);
  // A draft 3-Post member — the shape the rebuilt points will have — so the engine,
  // the cut formula and the load share all read exactly what the store will.
  const draft: ShorePoint = {
    id: 'three-post-recheck',
    opId: '',
    division: '',
    shoreType: '3-post',
    groupTotal: struts,
    measurementEighths,
    deductions: six,
    ...(estimatedLoad > 0 ? { estimatedLoad } : {}),
    status: 'pending',
  };
  const strutLength = effectiveLengthFrom(measurementEighths, six);
  const cutLength = cutLengthInches(draft);

  // Already 6×6/6×6: the card's combo was computed at this very geometry.
  if (!woodChanged) return { fits: true, combo, deductions: six, strutLength, cutLength, woodChanged };

  const forModel = findForShorePoint(draft, null).filter((c) => c.strut.model === combo.strut.model);
  const sameSet = forModel.find((c) => sameExtensions(c.extensions, combo.extensions));
  let match = sameSet ?? forModel[0];
  // A changed extension set must also be on scene (stock mode, same strut model).
  let onScene: StrutCombination | undefined;
  if (match && !sameSet && inventory) {
    onScene = findForShorePoint(draft, inventory).find((c) => c.strut.model === combo.strut.model);
    if (onScene) match = onScene;
    else if (match.extensions.length > 0) {
      return { fits: false, reason: 'extension-missing', strutLength, extensions: match.extensions };
    }
  }

  if (!match) {
    // Below the bare strut's collapsed length — no extension can help (they only add).
    if (strutLength < combo.strut.collapsed) {
      return { fits: false, reason: 'too-short', strutLength, limit: combo.strut.collapsed, ofAssembly: false };
    }
    // 6×6 is the thickest wood, so the length only shrinks: over-maximum is not
    // reachable from a combo that fit at the current wood. Kept so the verdict is total.
    if (strutLength > combo.adjExtended) {
      return { fits: false, reason: 'too-long', strutLength, limit: combo.adjExtended, ofAssembly: true };
    }
    // Inside the strut's span but in a gap between its extension reaches (e.g. a short
    // AT strut whose ranges don't overlap) — the card's assembly is too long for it.
    return { fits: false, reason: 'too-short', strutLength, limit: combo.adjCollapsed, ofAssembly: true };
  }

  const share = strutLoadShare(draft);
  if (match.unrated || (estimatedLoad > 0 && share > match.capacity)) {
    return {
      fits: false,
      reason: 'capacity',
      strutLength,
      perStrut: Math.ceil(share),
      capacity: match.unrated ? 0 : Math.floor(match.capacity),
    };
  }

  // The deploy paths source from `combo.strut.inventoryId` (a catalog-mode combo has
  // none), so the card's stock-bound candidate rides on. Extension sources stay only
  // when the set is unchanged (or the stock-mode combo resolved its own); a changed set re-resolves against live stock in
  // assembleBom (and a piece no rig stocks keeps that member Pending — never a
  // silently off-book extension).
  const refit: StrutCombination = {
    ...match,
    strut: combo.strut,
    extensionSources: onScene ? onScene.extensionSources : sameSet ? combo.extensionSources : undefined,
  };
  return { fits: true, combo: refit, deductions: six, strutLength, cutLength, woodChanged };
}
