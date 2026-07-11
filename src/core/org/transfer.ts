import type { OrgPositions, OrgResourceRef } from '../schema/org';
import { rootPosition } from './tree';
import { leaderOf } from './resource';
import { defaultPositionId } from './defaultTree';
import { isSelf, type SelfIdentity, type ResolveDeviceOwner } from './self';

// Command transfer (ADR-021) — the two-party handshake state. A DERIVED projection
// field (never on the wire): set by CommandTransferInitiated, cleared by Accept /
// Decline / Cancel. While pending, command does NOT move — the outgoing IC stays IC
// of record (and keeps End-Op authority) until the incoming accepts. This closes
// v3's biggest gap: transfer had no recorded handoff.
export interface PendingTransfer {
  initiatedBy: string; //        the outgoing IC's uid (event.by at initiate time)
  toResource: OrgResourceRef; //  the named incoming commander
  at: number; //                  epoch ms of the initiate
  /** #425 — the 4-digit accept code for individual/apparatus targets. UI-only
   *  gate (canAccept's soft claim unchanged); absent = pre-#425 event or a
   *  device target (uid-verified, no code needed). */
  claimCode?: string;
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
 * Can this actor accept the pending transfer? An ACCOUNT target is uid-verified — the
 * accepting member's account must equal the target (so they accept from any of their
 * devices). A DEVICE target verifies by uid (by === value). An individual/apparatus
 * target carries no uid, so any device may accept on the named commander's behalf (the
 * UI shows Accept only to that person). Deterministic + replay-safe (event + projection).
 */
export function canAccept(
  pending: PendingTransfer | null,
  by: string,
  accountId?: string | null,
): boolean {
  if (!pending) return false;
  const t = pending.toResource;
  if (t.ref === 'account') return accountId != null && t.value === accountId;
  if (t.ref === 'device') return t.value === by;
  return true;
}

/**
 * Is this person the Incident Commander or Operations Section Chief of operation `opId`?
 * The Audit Log Incident-view read gate (#211/#217) — a CLIENT gate (the RTDB rules
 * can't see an ICS position). True when they self-declared My Role at the IC/Ops node,
 * OR lead it — matched by isSelf (their account, their own device, or a legacy device
 * ref the binding resolves to their account). Individual/apparatus leaders carry no
 * identity. Works for an active OR an archived (projected) op.
 */
export function isCommanderOf(
  positions: OrgPositions,
  myRole: string | null,
  opId: string,
  self: SelfIdentity,
  resolve?: ResolveDeviceOwner,
): boolean {
  const icId = defaultPositionId(opId, 'ic');
  const opsId = defaultPositionId(opId, 'ops');
  if (myRole === icId || myRole === opsId) return true;
  const ledByMe = (id: string): boolean => {
    const p = positions[id];
    const l = p ? leaderOf(p) : null;
    return !!l && isSelf(l, self, resolve);
  };
  return ledByMe(icId) || ledByMe(opsId);
}
