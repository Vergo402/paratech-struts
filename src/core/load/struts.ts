import type { System } from '../schema';

// Strut models + extension compatibility. Ported VERBATIM from v3 app.js (lines 4-39).
// LS 812 (92-147") is DELIBERATELY ABSENT — do not re-add it from the brochure.
// Removed 2026-07-28 (Phase J gate #256 parity re-adjudication) to match v3.22.3
// (origin/main 1ca2933): Paratech's LIVE website and Product Catalog v.19 both list
// the LongShore line as exactly five sizes — LS 203 / 304 / 406 / 610 / 1016. v4 had
// kept an 812 on the strength of an older brochure part number (22-796370, 53 lb);
// that evidence is now judged OUTRANKED by the current catalog + live lineup, which
// v4's earlier decision (2026-06-14) never checked. Carrying a size nobody stocks let
// the strut finder recommend equipment that isn't on any rig. A department that does
// own an 812 tracks it as external equipment. Pinned absent by struts.test.ts.

export interface Strut {
  id: string;
  model: string;
  system: System;
  color: 'grey' | 'gold';
  collapsed: number; // inches, fully collapsed
  extended: number; // inches, fully extended
}

export const STRUTS: readonly Strut[] = [
  // AcmeThread (Grey)
  { id: 'at-12-15', model: 'AT 12-15', system: 'AcmeThread', color: 'grey', collapsed: 12, extended: 15 },
  { id: 'at-19-25', model: 'AT 19-25', system: 'AcmeThread', color: 'grey', collapsed: 19, extended: 25 },
  { id: 'at-25-36', model: 'AT 25-36', system: 'AcmeThread', color: 'grey', collapsed: 25, extended: 36 },
  { id: 'at-37-58', model: 'AT 37-58', system: 'AcmeThread', color: 'grey', collapsed: 37, extended: 58 },
  { id: 'at-56-88', model: 'AT 56-88', system: 'AcmeThread', color: 'grey', collapsed: 56, extended: 88 },
  // LongShore (Gold)
  { id: 'ls-203', model: 'LS 203', system: 'LongShore', color: 'gold', collapsed: 26, extended: 36 },
  { id: 'ls-304', model: 'LS 304', system: 'LongShore', color: 'gold', collapsed: 36, extended: 50 },
  { id: 'ls-406', model: 'LS 406', system: 'LongShore', color: 'gold', collapsed: 48, extended: 73 },
  { id: 'ls-610', model: 'LS 610', system: 'LongShore', color: 'gold', collapsed: 72, extended: 116 },
  { id: 'ls-1016', model: 'LS 1016', system: 'LongShore', color: 'gold', collapsed: 114, extended: 198 },
  // LockStroke (Grey — same load table as AcmeThread)
  { id: 'lk-19-25', model: 'LK 19-25', system: 'LockStroke', color: 'grey', collapsed: 19, extended: 25 },
  { id: 'lk-25-36', model: 'LK 25-36', system: 'LockStroke', color: 'grey', collapsed: 25, extended: 36 },
  { id: 'lk-36-57', model: 'LK 36-57', system: 'LockStroke', color: 'grey', collapsed: 36, extended: 57 },
  { id: 'lk-55-89', model: 'LK 55-89', system: 'LockStroke', color: 'grey', collapsed: 55, extended: 89 },
];

export const EXTENSIONS: Record<System, number[]> = {
  AcmeThread: [6, 12, 24, 36],
  LockStroke: [6, 12, 24, 36],
  LongShore: [12, 24, 48, 67],
};

// Per-strut extension compatibility (Paratech O&M Manual Section 2.3):
// LockStroke extensions are NOT interchangeable across all strut sizes.
// Smaller LK struts use smaller-diameter tubes incompatible with larger extensions.
export const LOCKSTROKE_EXTENSIONS: Record<string, number[]> = {
  'lk-19-25': [6, 12],
  'lk-25-36': [6, 12],
  'lk-36-57': [6, 12, 24, 36],
  'lk-55-89': [6, 12, 24, 36],
};

// Strut-SYSTEM identity key (field-color, not lifecycle): LockStroke struts are
// physically grey but earn their own cyan identity, so the key is the SYSTEM
// for LockStroke and the physical color otherwise. One source for the rec card's
// system word/stripe and the shore-point number tab (ShorePointCard).
export type StrutSysKey = 'gold' | 'grey' | 'lockstroke';

export function sysKeyOf(system: System, color: 'grey' | 'gold'): StrutSysKey {
  return system === 'LockStroke' ? 'lockstroke' : color;
}

/** Resolve a deployed strut's system key from its model; null if not in the catalog. */
export function strutSysKey(model: string): StrutSysKey | null {
  const s = STRUTS.find((x) => x.model === model);
  return s ? sysKeyOf(s.system, s.color) : null;
}
