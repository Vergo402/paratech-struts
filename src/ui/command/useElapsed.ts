import { useEffect, useState } from 'react';

/** Format an elapsed span (ms) as HH:MM:SS, tabular. Pure — testable without time. */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(hh)}:${p(mm)}:${p(ss)}`;
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
    if (since == null) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [since]);
  return since == null ? '—' : formatElapsed(now - since);
}
