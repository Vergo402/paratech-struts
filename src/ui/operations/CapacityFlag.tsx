/**
 * CapacityFlag — the persistent over-capacity / unrated badge for a DEPLOYED shore,
 * rendered IDENTICALLY on the Board card, List row, and Division tile so a point
 * flags the same wherever it shows (2026-07-04 audit H2/#416; upholds shoreSafety.ts's
 * "a point flags identically wherever it shows" contract, which the List and Division
 * tri-views silently broke). Presentational only: the flag VALUE is computed once
 * upstream where the full group is known — deployedCapacityFlag + deployedStrutCount,
 * so a short-of-plan group reads over-capacity (H1/#415) — and passed in. Null → nothing.
 */

export type CapacityFlagValue = 'unrated' | 'over-capacity' | null;

export function CapacityFlag({ flag }: { flag: CapacityFlagValue }) {
  if (!flag) return null;
  // span wrapper (not div): the List row + Division tile render this INSIDE a <button>,
  // where flow content like <div> is invalid. The row CSS makes the span a block flex row.
  return (
    <span className="fs-spc-flag-row">
      <span className={`fs-spc-flag fs-spc-flag--${flag}`} role="status">
        ⚠ {flag === 'unrated' ? 'Unrated' : 'Over capacity'}
      </span>
    </span>
  );
}
