import type { OrgPositions, OrgResourceRef } from '../schema/org';
import { rootPosition } from './tree';
import { leaderOf } from './resource';

// Command transfer (ADR-021) — the two-party handshake state. A DERIVED projection
// field (never on the wire): set by CommandTransferInitiated, cleared by Accept /
// Decline / Cancel. While pending, command does NOT move — the outgoing IC stays IC
// of record (and keeps End-Op authority) until the incoming accepts. This closes
// v3's biggest gap: transfer had no recorded handoff.
export interface PendingTransfer {
  initiatedBy: string; //        the outgoing IC's uid (event.by at initiate time)
  toResource: OrgResourceRef; //  the named incoming commander
  at: number; //                  epoch ms of the initiate
}

// The IC node = the single root command position (parentId null). undefined before seed.
export { rootPosition as icPosition };

// The current Incident Commander of record = the IC node's leader (assignedResources[0]).
// The gold accent follows this; after an accepted transfer it returns the new IC
// automatically (the reducer moved the leader). null when the IC node is unstaffed.
export function currentIC(positions: OrgPositions): OrgResourceRef | null {
  const ic = rootPosition(positions);
  return ic ? leaderOf(ic) : null;
}

/**
 * Can `by` accept this pending transfer? Pre-auth soft claim (ADR-021 Risk #3):
 * when the incoming commander is a DEVICE ref we can verify by uid (by === value);
 * for an individual/apparatus there is no uid to check pre-auth, so any device may
 * accept on the named commander's behalf (the UI shows Accept only to that device).
 * This is deterministic and replay-safe — it depends only on the event + projection.
 */
export function canAccept(pending: PendingTransfer | null, by: string): boolean {
  if (!pending) return false;
  if (pending.toResource.ref === 'device') return pending.toResource.value === by;
  return true;
}
