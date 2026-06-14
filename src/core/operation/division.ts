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
 * Compact trigger label for the Add-form Division picker, whose field is already
 * headed "Division" — so the bare floor number reads for ground-and-above ("1",
 * "2"), and basements get a "B" so a negative is never ambiguous ("B1"). Avoids
 * the "Division · Div 1" duplication and fits the narrow row-of-three column.
 */
export function formatDivisionCompact(n: number): string {
  if (!Number.isInteger(n) || n === 0) return '';
  return n > 0 ? String(n) : `B${-n}`;
}

/**
 * Display label for a ShorePoint.division string. An integer string renders the
 * short form; anything else (legacy free text, e.g. "Roof") passes through raw.
 */
/**
 * Parse a `division` string to its signed floor number, or null if it isn't a
 * valid nonzero integer division (blank or legacy free text like "Roof"). The
 * one place division-string parsing lives — callers reuse it (audit W10).
 */
export function parseDivisionNumber(division: string | undefined): number | null {
  if (!division) return null;
  const trimmed = division.trim();
  if (!/^-?\d{1,3}$/.test(trimmed)) return null;
  const n = parseInt(trimmed, 10);
  return n === 0 ? null : n;
}

export function divisionLabel(division: string): string {
  const n = parseDivisionNumber(division);
  return n !== null ? formatDivisionShort(n) : division;
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

// ---- Board sort order (#248) — v3 compareLevelValues (app.js:1575) carried over.

/**
 * Compare two `division` strings for board order: numeric DESCENDING so the
 * lanes read top floor → ground → basement, matching the building cross-section.
 * Numeric divisions sort before legacy free text ("Roof"); blank sorts last.
 */
export function compareDivisionValues(a: string, b: string): number {
  const ea = a.trim();
  const eb = b.trim();
  if (!ea) return eb ? 1 : 0;
  if (!eb) return -1;
  const aNum = /^-?\d{1,3}$/.test(ea) && parseInt(ea, 10) !== 0;
  const bNum = /^-?\d{1,3}$/.test(eb) && parseInt(eb, 10) !== 0;
  if (aNum && bNum) return parseInt(eb, 10) - parseInt(ea, 10);
  if (aNum) return -1;
  if (bNum) return 1;
  return ea.localeCompare(eb);
}

/**
 * Compare two `area` strings for board order: ASCENDING (numeric then locale).
 * Blank sorts last.
 */
export function compareAreaValues(a: string | undefined, b: string | undefined): number {
  const ea = (a ?? '').trim();
  const eb = (b ?? '').trim();
  if (!ea) return eb ? 1 : 0;
  if (!eb) return -1;
  const na = parseInt(ea, 10);
  const nb = parseInt(eb, 10);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  return ea.localeCompare(eb);
}

/**
 * Compare two `building` names for board order: ASCENDING with natural numeric
 * order ("Tower 2" before "Tower 10"). Blank sorts last. Single-building ops have
 * no buildings, so every point ties here and the sort falls through to division.
 */
export function compareBuildingValues(a: string | undefined, b: string | undefined): number {
  const ea = (a ?? '').trim();
  const eb = (b ?? '').trim();
  if (!ea) return eb ? 1 : 0;
  if (!eb) return -1;
  return ea.localeCompare(eb, undefined, { numeric: true });
}

/**
 * Board sort key (#248): building (grouped together) → division (floor,
 * descending) → area (ascending). Building leads so a multi-building op keeps
 * each building's points adjacent within a lane; single-building ops are
 * unaffected (all buildings blank → tie → falls through to division/area).
 */
export function compareShorePointsByLocation(
  a: { division: string; building?: string; area?: string },
  b: { division: string; building?: string; area?: string },
): number {
  const bldg = compareBuildingValues(a.building, b.building);
  if (bldg !== 0) return bldg;
  const d = compareDivisionValues(a.division, b.division);
  return d !== 0 ? d : compareAreaValues(a.area, b.area);
}
