import { useEffect, useState } from 'react';

/**
 * Any start time before this is a degenerate/legacy `startedAt` (e.g. epoch 0
 * from an old OperationCreated event) — render '—' instead of a 56-year clock.
 */
export const MIN_PLAUSIBLE_START_MS = Date.UTC(2020, 0, 1);

/**
 * Format an elapsed span (ms), tabular. Pure — testable without time.
 * Under 24h: HH:MM:SS. Past 24h: rolls to days, seconds drop — "2d 03:12".
 */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hh = Math.floor((total % 86400) / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return days > 0 ? `${days}d ${p(hh)}:${p(mm)}` : `${p(hh)}:${p(mm)}:${p(ss)}`;
}

/** The label for a clock started at `since`, seen at `now`. '—' when absent or implausible. */
export function elapsedLabel(since: number | undefined, now: number): string {
  return since == null || since < MIN_PLAUSIBLE_START_MS ? '—' : formatElapsed(now - since);
}

/**
 * The running elapsed clock since `since` (epoch ms). Ticks once a second and
 * re-renders ONLY the component that calls it — keep it in a small leaf so the
 * tick never re-renders the rest of SitStat (v3's clock discipline). `—` until a
 * start time exists.
 */
export function useElapsed(since: number | undefined): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (since == null || since < MIN_PLAUSIBLE_START_MS) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [since]);
  return elapsedLabel(since, now);
}
