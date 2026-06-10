import type { System } from '../schema';

// Strut models + extension compatibility. Ported VERBATIM from v3 app.js (lines 4-39).

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
  { id: 'ls-812', model: 'LS 812', system: 'LongShore', color: 'gold', collapsed: 92, extended: 147 },
  { id: 'ls-1016', model: 'LS 1016', system: 'LongShore', color: 'gold', collapsed: 114, extended: 198 },
  // LockStroke (Grey — same load table as AcmeThread)
  { id: 'lk-19-25', model: 'LK 19-25', system: 'LockStroke', color: 'grey', collapsed: 19, extended: 25 },
  { id: 'lk-25-36', model: 'LK 25-36', system: 'LockStroke', color: 'grey', collapsed: 25, extended: 36 },
  { id: 'lk-37-58', model: 'LK 37-58', system: 'LockStroke', color: 'grey', collapsed: 37, extended: 58 },
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
  'lk-37-58': [6, 12, 24, 36],
  'lk-55-89': [6, 12, 24, 36],
};
