// Division (floor) helpers — the v3 grow-the-building model carried verbatim
// (app.js formatDivision ~838, addFloorAbove/Below ~1502, getOpDivisions).
// Positive = floors above ground (1 = Ground level); negative = Sub Divisions
// (−1 = Basement); 0 does not exist. ADR-008: divisions are numbered by floor.

/** Full display label: `Div 1 (Ground level)`, `Div 3 (+2 floors up)`, `Sub Div 2 (+1 below)`. */
export function formatDivision(n: number): string {
  if (!Number.isInteger(n) || n === 0) return '';
  if (n > 0) {
    const paren = n === 1 ? 'Ground level' : n === 2 ? '+1 floor up' : `+${n - 1} floors up`;
    return `Div ${n} (${paren})`;
  }
  const sub = -n;
  const paren = sub === 1 ? 'Basement' : `+${sub - 1} below`;
  return `Sub Div ${sub} (${paren})`;
}

/** Short label for card identity lines: `Div 2` / `Sub Div 1`. */
export function formatDivisionShort(n: number): string {
  if (!Number.isInteger(n) || n === 0) return '';
  return n > 0 ? `Div ${n}` : `Sub Div ${-n}`;
}

/**
 * Display label for a ShorePoint.division string. An integer string renders the
 * short form; anything else (legacy free text, e.g. "Roof") passes through raw.
 */
export function divisionLabel(division: string): string {
  const trimmed = division.trim();
  if (/^-?\d{1,3}$/.test(trimmed)) {
    const n = parseInt(trimmed, 10);
    if (n !== 0) return formatDivisionShort(n);
  }
  return division;
}

/** The next floor above: max positive (or 0 when none) + 1. */
export function nextFloorAbove(divisions: readonly number[]): number {
  return divisions.filter((n) => n > 0).reduce((a, b) => Math.max(a, b), 0) + 1;
}

/** The next floor below: min negative (or 0 when none) − 1. */
export function nextFloorBelow(divisions: readonly number[]): number {
  return divisions.filter((n) => n < 0).reduce((a, b) => Math.min(a, b), 0) - 1;
}

/**
 * Divisions in building-cross-section order, top floor first, basements last —
 * the v3 picker order. Dedupes and drops a stray 0.
 */
export function sortDivisionsForDisplay(divisions: readonly number[]): number[] {
  return [...new Set(divisions)].filter((n) => n !== 0).sort((a, b) => b - a);
}
