/**
 * Measurement display (input.md §The measurement-display component +
 * typography.md; ADR-028). Eighths render as DIAGONAL fractions — plain
 * "48 1/2″" text that the value font (Inter, via --font-mono) composes into
 * a real diagonal glyph through `font-variant-numeric: diagonal-fractions`
 * (set on .fs-meas). The space before the fraction is required so the OpenType
 * frac feature composes "1/2" and not "481/2". This replaces the hand-stacked
 * digit form, which tested illegibly tiny at field distance (ADR-028).
 * One renderer for every measurement keeps the look consistent and big.
 * Values are EXACT eighths ints end-to-end (ADR-012); nothing here rounds.
 */

export interface MeasurementParts {
  /** Whole feet (only meaningful for the feet-inches form). */
  feet: number;
  /** Whole inches remaining after feet. */
  inches: number;
  /** Whole total inches (the cut-sheet form). */
  totalInches: number;
  /** Reduced fraction numerator (0 when the value is whole). */
  n: number;
  /** Reduced fraction denominator (1 when the value is whole). */
  d: number;
  /** True when the value was negative (callers render the sign). */
  negative: boolean;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** Split exact eighths into whole parts + a REDUCED ⅛″-family fraction (4/8 → 1/2). */
export function eighthsToParts(eighths: number): MeasurementParts {
  // Negative zero carries the sign: a deduction of −0″ reads as a deduction (KB-4).
  const negative = eighths < 0 || Object.is(eighths, -0);
  const abs = Math.abs(eighths);
  const totalInches = Math.floor(abs / 8);
  const rem = abs % 8;
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  if (rem === 0) return { feet, inches, totalInches, n: 0, d: 1, negative };
  const g = gcd(rem, 8);
  return { feet, inches, totalInches, n: rem / g, d: 8 / g, negative };
}

/** Plain "n/d" text — the font composes the diagonal glyph (ADR-028). The
 *  leading space keeps the fraction from fusing with a preceding integer. */
export function fractionText(n: number, d: number): string {
  return n > 0 ? ` ${n}/${d}` : '';
}

export interface MeasurementValueProps {
  /** Exact eighths-of-an-inch (may be negative, e.g. an impossible effective length). */
  eighths: number;
  /** 'inches' = cut-sheet form (93 5/8″); 'feet-inches' = field read-back (7′ 9 5/8″). */
  form?: 'inches' | 'feet-inches';
  className?: string;
}

/** Read-only measurement — Inter value font, tabular figures, diagonal ⅛″ fraction. */
export function MeasurementValue({ eighths, form = 'inches', className }: MeasurementValueProps) {
  const p = eighthsToParts(eighths);
  const sign = p.negative ? '−' : '';
  const frac = fractionText(p.n, p.d);
  const text =
    form === 'feet-inches' && p.feet > 0
      ? `${sign}${p.feet}′ ${p.inches}${frac}″`
      : `${sign}${p.totalInches}${frac}″`;
  return <span className={`fs-meas${className ? ` ${className}` : ''}`}>{text}</span>;
}
