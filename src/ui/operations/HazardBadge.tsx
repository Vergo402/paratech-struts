import { severityWord, type HazardSeverity } from '@core/hazard';

/**
 * HazardBadge — the ONE "⚠ HIGH hazard in area" badge, rendered IDENTICALLY wherever a
 * point shows: the Board card (full sentence), the List row + Division tile (`compact`,
 * the bare "⚠ HIGH hazard" word), and the Quick View drawer + archive cards. Presentational
 * only: the severity VALUE is computed once upstream by the board's `hazardFor` selector
 * (the highest open-hazard severity in the point's Division) and passed in; undefined →
 * nothing. Restored in #501 — #394 shipped it, the design-import merge (73e95a1) regressed
 * it to a bare boolean "⚠ Hazard" pill. It INFORMS, never gates (Principle 10): the
 * advance control stays live. One-tone red; the severity is carried by the WORD, not a
 * colour ramp (Alex 2026-06-29). No role="status" — a screen reader meets it as part of
 * the card and reads "High hazard in area".
 */
export function HazardBadge({
  severity,
  compact,
}: {
  severity: HazardSeverity | undefined;
  compact?: boolean;
}) {
  if (!severity) return null;
  // span wrapper (not div): the List row + Division tile render this INSIDE a <button>,
  // where flow content like <div> is invalid (same reason + row class as CapacityFlag).
  return (
    <span className="fs-spc-flag-row">
      <span className={`fs-spc-hazard${compact ? ' fs-spc-hazard--compact' : ''}`}>
        <span aria-hidden="true">⚠ </span>
        {severityWord(severity)} hazard{compact ? '' : ' in area'}
      </span>
    </span>
  );
}
