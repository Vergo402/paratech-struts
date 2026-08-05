import { rtdb, ref, set } from './firebase';
import { newId } from '@core/id';

// data/sync — L-8 ledger. Surface cloud-write failures to /diagnostics/sync
// instead of swallowing them (lesson 5: a silent failure cost v3 months of data
// loss). Matches the v3 ledger shape (validate: hasChild('ts') && hasChild
// ('event')). Best-effort + never throws — a diagnostics write must never break
// its caller (and when the cloud is the thing that failed, this will too; that's
// fine, it's caught).
//
// J257-S5 — the node was `auth != null` with NO shape and NO size cap, so any
// signed-in account could push unbounded payloads under arbitrary keys onto a
// metered (Blaze) project. The rule now names every allowed child, caps each
// string, and rejects unknown children ($other: false). Two consequences this
// file OWNS:
//   1. The detail bag is a CLOSED type (SyncDiagnosticDetail). A new key added
//      at a call site is now a TypeScript error here rather than a silently
//      rejected write in production — rule and writer can't drift (the v3.8.2
//      lesson: a validate rule that didn't match the payload shape).
//   2. Values are TRUNCATED to the rule's caps before the write. A cap with no
//      writer-side clamp converts "logged a long error" into "logged nothing",
//      losing the diagnostic exactly when it fires.

/** The closed detail bag — every key has a matching validated child in the rule. */
export interface SyncDiagnosticDetail {
  deptId?: string;
  error?: string;
  reason?: string;
  path?: string;
  id?: string;
}

/** Per-field caps — MUST match database.rules.json `/diagnostics/sync/$logId`. */
const EVENT_CAP = 80;
const DETAIL_CAPS: Record<keyof SyncDiagnosticDetail, number> = {
  deptId: 64,
  error: 500,
  reason: 500,
  path: 200,
  id: 128,
};

function clamp(value: string, cap: number): string {
  return value.length <= cap ? value : value.slice(0, cap);
}

export async function logSyncEvent(
  event: string,
  detail: SyncDiagnosticDetail = {},
): Promise<void> {
  const payload: Record<string, string | number> = {
    ts: Date.now(),
    event: clamp(event, EVENT_CAP),
  };
  for (const key of Object.keys(DETAIL_CAPS) as (keyof SyncDiagnosticDetail)[]) {
    const v = detail[key];
    // Empty string is omitted, not written: the rule's optional form is
    // "absent OR valid", and an empty value carries no diagnostic signal.
    if (typeof v === 'string' && v !== '') payload[key] = clamp(v, DETAIL_CAPS[key]);
  }
  try {
    await set(ref(rtdb, `diagnostics/sync/${newId()}`), payload);
  } catch {
    // best-effort
  }
}
