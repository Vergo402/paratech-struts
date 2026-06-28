import type { OperationPeriod } from '../schema';

// core/operation — operational-period derivation (#395, ADR-039). The single source
// for "which OP did this happen in." Periods are boundary markers in the event log
// (period 1 = OperationCreated.at, the rest = OperationPeriodStarted events); any
// other event's period is DERIVED from its `at`, never stamped on the event itself.

/**
 * The period number an `at` (epoch ms) falls in: the last period whose `startedAt`
 * is ≤ `at`. An `at` before the first period (shouldn't happen — nothing predates
 * the op) degrades to the earliest period's number. Empty list → null. Pure; tolerant
 * of an unsorted list (sorts a copy by startedAt).
 */
export function periodOf(at: number, periods: readonly OperationPeriod[]): number | null {
  if (periods.length === 0) return null;
  const sorted = periods.slice().sort((a, b) => a.startedAt - b.startedAt);
  let current = sorted[0]!.number;
  for (const p of sorted) {
    if (p.startedAt <= at) current = p.number;
    else break;
  }
  return current;
}

/** The header goes amber this long before the planned end (the IAP-cycle nudge). */
export const OP_AMBER_LEAD_MS = 30 * 60_000;

export interface PeriodStatus {
  elapsedMs: number; //          time since the period started (≥ 0)
  remainingMs: number | null; // time to the planned end; null when no planned length
  fraction: number | null; //    elapsed ÷ planned, clamped 0..1; null when no planned length
  nearEnd: boolean; //           within OP_AMBER_LEAD_MS of the planned end (the amber accent)
  pastEnd: boolean; //           at/after the planned end (the rollover prompt fires)
}

/**
 * The live state of one operational period at `now` (epoch ms). With no planned
 * length there's no progress bar, no amber, no rollover prompt — just an elapsed
 * count. Pure (time injected) so the header math is testable without a clock.
 */
export function periodStatus(period: OperationPeriod, now: number): PeriodStatus {
  const elapsedMs = Math.max(0, now - period.startedAt);
  if (period.plannedDurationMs == null) {
    return { elapsedMs, remainingMs: null, fraction: null, nearEnd: false, pastEnd: false };
  }
  const remainingMs = period.plannedDurationMs - elapsedMs;
  const fraction = Math.min(1, Math.max(0, elapsedMs / period.plannedDurationMs));
  const pastEnd = remainingMs <= 0;
  const nearEnd = !pastEnd && remainingMs <= OP_AMBER_LEAD_MS;
  return { elapsedMs, remainingMs, fraction, nearEnd, pastEnd };
}
