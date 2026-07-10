// core/load — the estimated-load PLANNING input: its upper bound + a shared
// validator. The load is an optional planning aid (blank = 0 = no-load); it must
// be a finite, non-negative number within MAX_LOAD_LBS. Quick Find and Add Shore
// Point both gate their form on this — one source so the rule can't drift.

/** v3 MAX_LOAD_LBS — estimated load upper bound (planning input only). */
export const MAX_LOAD_LBS = 500_000;

/** Parse an estimated-load text input. Blank → 0 (no-load). `loadValid` is true
 *  when blank, or a finite non-negative number within MAX_LOAD_LBS. */
export function parseLoad(estimatedLoad: string): { loadNum: number; loadValid: boolean } {
  const loadTrim = estimatedLoad.trim();
  const loadNum = loadTrim === '' ? 0 : Number(loadTrim);
  const loadValid = loadTrim === '' || (Number.isFinite(loadNum) && loadNum >= 0 && loadNum <= MAX_LOAD_LBS);
  return { loadNum, loadValid };
}
