import { parseDivisionNumber } from '../operation/division';

// Division tokens. A dash glued straight to "div" is a separator ("Div-1" -> 1);
// a dash after whitespace/punctuation is a sign ("Div -1" -> -1), so a basement
// is never read as the floor above it.
const DIVISION_WORD = /\b(?:division|div)(?:-|[\s.:#]*)(-?\d{1,3})\b/gi;
const DIVISION_COMPACT = /\bd(-?\d{1,3})\b/gi; // "D1", "d-1" — no separator allowed
const BASEMENT_COMPACT = /\bb(\d{1,3})\b/gi; // "B1", "b2" — no separator allowed
const BASEMENT_WORD = /\b(?:basement|bsmt)[\s.:#-]*(\d{1,3})\b/gi;

/**
 * Resolve a hazard's free-text `location` to the ONE shore-point Division it
 * clearly names, or null (the hazard then shows in the Hazard Log + header only,
 * never on a card). Pure.
 *
 * The rule (Alex 2026-10-11, #511; hazard-log workflow §Step 4 matching rule): a
 * location that CLEARLY names exactly ONE Division links to that Division's cards;
 * one that names two Divisions, or none, stays log-only — better to under-badge
 * than to badge the wrong card. Case-insensitive, trimmed.
 *   - The whole string is a bare integer ("2", "-1") -> `parseDivisionNumber`
 *     (rejects 0). A bare number that is NOT the whole string never counts
 *     ("12 inch gap" -> null).
 *   - "Div N" / "Division N" (separator `. : # -` or space optional) and the
 *     compact "DN" -> N.
 *   - "BN" and "Basement N" / "Bsmt N" -> -N (sub-grade; B1 = Division -1).
 *   - Every token's number is collected; exactly one DISTINCT number resolves
 *     ("Div 1, Div 1 rear" -> 1), zero or two-plus -> null.
 *
 * Side-letter hazard: building sides are lettered A-D (ADR-008), so a spaced
 * "D 2" / "B 2" ("Side D 2") is a side, NOT a Division — only the compact "D2" /
 * "B2" forms (no space) count. Shore-point divisions themselves are structured
 * strings and still resolve with `parseDivisionNumber` alone.
 */
export function resolveHazardDivision(location: string | undefined | null): number | null {
  if (!location) return null;
  const text = location.trim();
  if (!text) return null;
  if (/^-?\d{1,3}$/.test(text)) return parseDivisionNumber(text);

  const found = new Set<number>();
  const collect = (re: RegExp, sign: 1 | -1) => {
    for (const m of text.matchAll(re)) {
      const n = parseInt(m[1]!, 10) * sign;
      if (n !== 0) found.add(n);
    }
  };
  collect(DIVISION_WORD, 1);
  collect(DIVISION_COMPACT, 1);
  collect(BASEMENT_COMPACT, -1);
  collect(BASEMENT_WORD, -1);

  return found.size === 1 ? [...found][0]! : null;
}
