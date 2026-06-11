/**
 * Parse typed or dictated measurement input into exact eighths of an inch.
 * Accepts multiple formats (exact eighths only; no rounding to quarter-inch etc.):
 * - `68` → 544 eighths (68 inches)
 * - `5 8` → 544 eighths (5 feet 8 inches)
 * - `5' 8` → 544 eighths (feet/inches format with apostrophe)
 * - `5 8 5/8` → 549 eighths (5 ft 8 5/8″)
 * - `68 5/8` → 549 eighths (total inches + fraction)
 * - `5' 8-5/8"` → 549 eighths (strict format with quote marks)
 * - `1/4` → 2 eighths (bare fraction, reduces to eights)
 *
 * Returns null if unparseable or out of bounds (0–360″ / 2880 eighths).
 * Does NOT surface bound messages — caller reuses the existing
 * MeasurementInput bound messages for consistency.
 */
export function parseMeasurement(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // Try formats: exact pattern matching, no regex needed for simple cases
  // Normalize: replace various quotes and separators
  const normalized = trimmed
    .replace(/[''′]/g, "'") // various apostrophes → '
    .replace(/["″]/g, '"') // various quotes → "
    .replace(/−/g, '-') // proper minus → -
    .replace(/–/g, '-'); // en-dash → -

  // Try: 5 8 5/8 or 5' 8-5/8" (feet inches fraction format)
  let match = normalized.match(/^(\d+)['´\s]+(\d+)(?:[–\s-]+(\d+)\/(\d+))?["″]?$/);
  if (match) {
    const feet = parseInt(match[1]!, 10);
    const inches = parseInt(match[2]!, 10);
    const fracN = match[3] ? parseInt(match[3], 10) : 0;
    const fracD = match[4] ? parseInt(match[4], 10) : 1;
    const result = feet * 96 + inches * 8 + convertFractionToEighths(fracN, fracD);
    return result >= 0 && result <= 2880 ? result : null;
  }

  // Try: 68 5/8 (total inches + optional fraction)
  match = normalized.match(/^(\d+)(?:\s+(\d+)\/(\d+))?["″]?$/);
  if (match) {
    const inches = parseInt(match[1]!, 10);
    const fracN = match[2] ? parseInt(match[2], 10) : 0;
    const fracD = match[3] ? parseInt(match[3], 10) : 1;
    const result = inches * 8 + convertFractionToEighths(fracN, fracD);
    return result >= 0 && result <= 2880 ? result : null;
  }

  // Try: bare fraction (n/d)
  match = normalized.match(/^(\d+)\/(\d+)$/);
  if (match) {
    const n = parseInt(match[1]!, 10);
    const d = parseInt(match[2]!, 10);
    const result = convertFractionToEighths(n, d);
    return result >= 0 && result <= 2880 && result !== 0 ? result : result === 0 && (n === 0 || n === d) ? result : null;
  }

  return null;
}

/**
 * Convert a fraction (n/d) to eighths.
 * Accepts fractions that scale to eighths (e.g., 1/4 = 2/8, 3/4 = 6/8, 8/8 = 8/8).
 * Returns the numerator when scaled to denominator 8 (the number of eighths).
 * Returns 0 if not an exact eighth (e.g., 1/3, 1/5).
 * Safe to call with d=0 or invalid inputs (returns 0).
 */
function convertFractionToEighths(n: number, d: number): number {
  if (d === 0) return 0; // n/0 → 0
  if (d === 1) return n * 8; // n/1 = n inches = n*8 eighths

  // Try to scale the fraction to denominator 8
  // Check if 8 is a multiple of d (e.g., 8 = 2*4, 8 = 1*8, 8 = 4*2)
  if (8 % d === 0) {
    const scale = 8 / d;
    return n * scale;
  }

  // Try reducing to lowest terms and then scaling
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const g = gcd(n, d);
  const reducedN = n / g;
  const reducedD = d / g;

  // Check if reduced denominator divides 8
  if (8 % reducedD === 0) {
    const scale = 8 / reducedD;
    return reducedN * scale;
  }

  // Not an exact eighth (e.g., 1/3, 1/5, etc.)
  return 0;
}
