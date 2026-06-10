import { EmptyState } from '@ui/primitives';

/**
 * Quick Find stub. Slice scope decision 4: Quick Find ships its shared INPUTS
 * only (MeasurementInput + DeductionPicker, live in /gallery and reused by
 * Add Shore Point in S5) — no results page until Phase I.
 */
export function QuickFindScreen() {
  return (
    <EmptyState
      variant="upstream-blocked"
      headline="Quick Find isn't built yet"
      reason="The measurement and deduction inputs are ready — the results screen lands in Phase I"
    />
  );
}
