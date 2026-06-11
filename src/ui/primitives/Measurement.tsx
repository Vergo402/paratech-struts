/**
 * Measurement display (input.md §The measurement-display component +
 * typography.md). Eighths are built from REAL digits in the locked stacked
 * tape-measure form — numerator over a ruled bar over denominator — never
 * super/subscript codepoints (the v3 45¹¹⁄₁₆ hack rendered illegibly tiny).
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

/** The stacked digit-pair fraction — numerator over ruled bar over denominator. */
export function Fraction({ n, d }: { n: number; d: number }) {
  return (
    <span className="fr">
      <span className="n">{n}</span>
      <span className="d">{d}</span>
    </span>
  );
}

export interface MeasurementValueProps {
  /** Exact eighths-of-an-inch (may be negative, e.g. an impossible effective length). */
  eighths: number;
  /** 'inches' = cut-sheet form (93 5/8″); 'feet-inches' = field read-back (7′ 9 5/8″). */
  form?: 'inches' | 'feet-inches';
  className?: string;
}

/** Read-only measurement — Geist Mono, tabular figures, stacked ⅛″ fraction. */
export function MeasurementValue({ eighths, form = 'inches', className }: MeasurementValueProps) {
  const p = eighthsToParts(eighths);
  const frac = p.n > 0 ? <Fraction n={p.n} d={p.d} /> : null;
  return (
    <span className={`fs-meas${className ? ` ${className}` : ''}`}>
      {p.negative && '−'}
      {form === 'feet-inches' && p.feet > 0 ? (
        <>
          {p.feet}′ {p.inches}
          {frac}″
        </>
      ) : (
        <>
          {p.totalInches}
          {frac}″
        </>
      )}
    </span>
  );
}
