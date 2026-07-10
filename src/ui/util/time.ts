/** One shared UI time formatter (#434) — Command previously carried three formats
 *  (NodeSheet "Jul 4, 01:22 PM", HazardLog rows "1:22 PM", hazard detail full
 *  toLocaleString). UI surfaces show the short local clock; an event from a
 *  previous day carries the date ("Jul 4 · 1:22 PM") so multi-day op history stays
 *  unambiguous. Data exports (CSV) keep full timestamps — that's data, not UI. */
export function clock(at: number, now: number = Date.now()): string {
  const d = new Date(at);
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const n = new Date(now);
  const sameDay =
    d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
  if (sameDay) return time;
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} · ${time}`;
}

/** 24-hour HH:MM (zero-padded) — the briefing / checklist attestation stamp. Distinct
 *  from clock() above (12-hour, date-aware for multi-day op history). */
export function clockTime(at: number): string {
  const d = new Date(at);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
