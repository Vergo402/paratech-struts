// L-1 — Safety-critical load tables. Ported VERBATIM from v3 app.js (lines 41-90).
// The numbers are PDF-sourced and must never change without re-sourcing the
// manual; a snapshot test (tables.test.ts) fails CI on any drift. Frozen so they
// cannot be mutated at runtime. Conservative-floor lookup lives in engine.ts —
// between rows it returns the LONGER (lower-capacity) row, never an interpolation
// (linear interpolation over-reported buckling-governed capacity; removed v3.7.2).

/** A load-table row: [lengthInches, load2to1, load3to1, load4to1]. */
export type LoadRow = readonly [number, number, number, number];

// Load tables: [lengthInches, load2to1, load3to1, load4to1]
// 4:1 column = Paratech O&M Manual Table 2-7 (PN 22-796198, 02 JAN 2018) "Working Load lb (kg)"
//   The manual defines this as the safe working load for collapse/rescue stabilization.
// 3:1 column = derived as 4:1 × 4/3, rounded DOWN (floor) for conservative behavior.
// 2:1 column = derived as 4:1 × 2 (exact).
// Conservative floor in getLoadCapacity(): for lengths between rows, returns the
// capacity of the next longer row (lower capacity). Linear interpolation was removed
// in v3.7.2 — it overestimates buckling-governed capacity (Euler 1/L² concavity).
// PRE-v3.5.2 table was missing rows for 3, 5, 7, 9, and 11 ft. Linear interpolation between
// 120" and 144" over-reported capacity by ~17% at 132" (11 ft) vs the manual — corrected in v3.5.2.
export const ACME_LOAD_TABLE: readonly LoadRow[] = Object.freeze([
  [24, 40000, 26666, 20000], // 2 ft  — manual; was 21750 (4:1) = +8.75% over manual
  [36, 40000, 26666, 20000], // 3 ft  — NEW ROW from manual (interp was wrong)
  [48, 40000, 26666, 20000], // 4 ft  — manual
  [60, 33102, 22068, 16551], // 5 ft  — NEW ROW from manual
  [72, 28250, 18833, 14125], // 6 ft  — manual
  [84, 26162, 17441, 13081], // 7 ft  — NEW ROW from manual
  [96, 24050, 16033, 12025], // 8 ft  — manual
  [108, 18276, 12184, 9138], // 9 ft  — NEW ROW from manual
  [120, 10720, 7146, 5360], // 10 ft — manual
  [132, 7864, 5242, 3932], // 11 ft — NEW ROW from manual — was 4595 by interp (+17% over)
  [144, 7660, 5106, 3830], // 12 ft — manual
]);

// Paratech LongShore Load Table — all three columns (2:1, 3:1, 4:1) are published directly
// in the manufacturer's chart, so no derivation is needed.
// Source: Paratech Rescue Struts datasheet (Dec 2019)
//   https://www.teamequipment.com/wp-content/uploads/2019/12/Paratech-Rescue-Struts.pdf
// Per datasheet: "The data in this table has been confirmed by physical testing, witnessed
// and certified by an independent, licensed structural engineering company."
// Chart defines working loads for 6–16 ft only; LongShore is not rated below 6 ft. Lengths
// below the first row will return the 72" row values via the floor branch in getLoadCapacity.
// PRE-v3.5.2 table was missing rows for 9, 11, 13, 14, 15 ft. Linear interpolation between
// 144" and 192" over-reported by ~18% at 13 ft (8,250 lb by interp vs 7,000 lb manual) —
// same risk class as the ACME 11 ft cliff (S2). Also: the pre-v3.5.2 row at 24" was not
// in the manual at all (LongShore isn't operational at 2 ft); removed in v3.5.2.
export const LONGSHORE_LOAD_TABLE: readonly LoadRow[] = Object.freeze([
  // [length_in, 2:1, 3:1, 4:1]
  [72, 44000, 29333, 22000], // 6 ft  — manual
  [84, 44000, 29333, 22000], // 7 ft  — manual
  [96, 40000, 26666, 20000], // 8 ft  — manual
  [108, 32000, 21333, 16000], // 9 ft  — NEW ROW from manual
  [120, 24000, 16000, 12000], // 10 ft — manual
  [132, 22000, 14667, 11000], // 11 ft — NEW ROW from manual
  [144, 20000, 13333, 10000], // 12 ft — manual
  [156, 14000, 9332, 7000], // 13 ft — NEW ROW — was 8250 by interp (+17.9% over)
  [168, 12000, 8000, 6000], // 14 ft — NEW ROW — was 6500 by interp (+8.3% over)
  [180, 9000, 6000, 4500], // 15 ft — NEW ROW — was 4750 by interp (+5.6% over)
  [192, 6000, 4000, 3000], // 16 ft — manual
]);
