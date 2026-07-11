import type { OrgResourceRef } from '../schema/org';

// Who "I" am for ICS-position purposes (ADR-024 follow-up). A signed-in member is their
// ACCOUNT (accountId, stable across every device they sign into); a guest is their per-
// device uid (the floor). Provenance (`event.by`) stays the device everywhere — this is
// a SEPARATE axis: identity of the person holding a position, not who wrote the event.
export interface SelfIdentity {
  accountId: string | null; // Firebase account uid when a member, else null (guest)
  deviceUid: string | null; // the per-device uid (always present once booted)
}

// Resolve a device uid → the account that owns it, or null if unknown. Backed by the
// synced device→account binding (a device records its owner on authenticated boot);
// lets a legacy device-ref position be recognised as its owner's WITHOUT rewriting the
// log. Pure core takes it as a param so it stays free of the data layer (and tests can
// stub it). Omitted ⟺ device-only matching (no binding available).
export type ResolveDeviceOwner = (deviceUid: string) => string | null;

// Does this position-holder ref refer to ME? Strict: an account ref matches my account;
// a device ref matches my own device OR a device the binding says I own; an individual /
// apparatus ref is never a verifiable "me" (a typed name carries no identity).
export function isSelf(ref: OrgResourceRef, self: SelfIdentity, resolve?: ResolveDeviceOwner): boolean {
  if (ref.ref === 'account') return self.accountId != null && ref.value === self.accountId;
  if (ref.ref === 'device') {
    if (self.deviceUid != null && ref.value === self.deviceUid) return true; // my own device
    if (self.accountId == null) return false;
    return resolve?.(ref.value) === self.accountId; // legacy device-ref → its owning account
  }
  return false; // individual / apparatus
}

// May I edit command (restructure the org, assign apparatus)? = am I the Incident
// Commander. Permissive where identity is unknowable (ADR-021 pre-auth doctrine):
// an UNSTAFFED IC bootstraps to anyone; an individual/apparatus IC carries no uid to
// verify, so it stays open (the UI still gates the button). Otherwise it is exactly
// isSelf against the IC leader — so a member commands from every device they sign into.
export function commandsIC(ic: OrgResourceRef | null, self: SelfIdentity, resolve?: ResolveDeviceOwner): boolean {
  if (!ic) return true;
  if (ic.ref === 'individual' || ic.ref === 'apparatus') return true;
  return isSelf(ic, self, resolve);
}

// The key a member's My-Role / self state is stored under: the account when signed in
// (follows devices), else the device. One source of truth for every My-Role read site.
export function selfKey(self: SelfIdentity): string | null {
  return self.accountId ?? self.deviceUid;
}
