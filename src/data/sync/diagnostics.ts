import { rtdb, ref, set } from './firebase';
import { newId } from '@core/id';

// data/sync — L-8 ledger. Surface cloud-write failures to /diagnostics/sync
// instead of swallowing them (lesson 5: a silent failure cost v3 months of data
// loss). Matches the v3 ledger shape (validate: hasChild('ts') && hasChild
// ('event')). Best-effort + never throws — a diagnostics write must never break
// its caller (and when the cloud is the thing that failed, this will too; that's
// fine, it's caught).
export async function logSyncEvent(
  event: string,
  detail: Record<string, unknown> = {},
): Promise<void> {
  try {
    await set(ref(rtdb, `diagnostics/sync/${newId()}`), { ts: Date.now(), event, ...detail });
  } catch {
    // best-effort
  }
}
