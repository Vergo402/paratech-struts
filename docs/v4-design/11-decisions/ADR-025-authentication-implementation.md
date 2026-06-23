# ADR-025: Authentication implementation (D7.1)

> Architecture Decision Record. The Phase H record of the D7.1 auth mechanism: Firebase Auth with email + password (default) and email magic-link (no-password path). Resolves open-question [#4b](../99-open-questions.md). Governs the **provisioned-member** identity; the **un-provisioned guest** path is [ADR-022](ADR-022-mutual-aid-v40-qr-guest.md)'s and is referenced, not redefined. Closes board [#245](https://github.com/Vergo402/paratech-struts/issues/245).

---

## Status

- [x] Accepted

**Date:** 2026-06-09
**Author:** Claude Opus 4.8 (architect agent, drafting)
**Reviewer(s):** Alex — Phase H foundation mini-gate PASSED 2026-06-10

---

## Context

v3 runs shared Firebase Anonymous Auth — every device shares one permission level. v4's auth direction (synthesis §4 Auth, "guest mode is the default first-run; app opens with no auth prompt; auth lives in Settings") is locked, and the per-device anon UID is set by [ADR-009](ADR-009-database-firebase-rtdb.md) and [ADR-024](ADR-024-d5-multi-device-build-a.md). What remained open is the **D7.1 mechanism** for a *provisioned member* who creates a real account: open-question [#4b](../99-open-questions.md), with the standing recommendation "email + password default, magic-link as the no-password path." The signing-in workflow ([`09-workflows/06-signing-in-and-out.md`](../09-workflows/06-signing-in-and-out.md)) and the login route ([`08-information-architecture/70-login-register.md`](../08-information-architecture/70-login-register.md)) were authored against that recommendation. The mechanism was **confirmed at the Phase D gate (PR #282)**. This ADR is the formal record, pending the Phase H foundation mini-gate. It closes board [#245](https://github.com/Vergo402/paratech-struts/issues/245).

---

## Decision

**Use Firebase Auth with email + password as the default sign-in method and email magic-link as the no-password path.** This resolves [#4b](../99-open-questions.md). Specifically:

- **Mandatory display name at account creation** (Resolved-OQ [#41](../99-open-questions.md)) — a required field that can never be empty, because the v4.0 audit log and signed attestations attribute to it.
- **Offline auth window:** signing in is never a blocking wall. When offline, the app **queues the sign-in intent locally and tells the user plainly** ("You're offline — you'll be signed in when you reconnect"); guest work continues uninterrupted and the intent completes on reconnect ([`09-workflows/06-signing-in-and-out.md`](../09-workflows/06-signing-in-and-out.md) §Step 3). Local-first ([ADR-009](ADR-009-database-firebase-rtdb.md)) means the login screen never strands a user.
- **Guest / un-provisioned identity is *not* redefined here.** A device with no account works on the per-device anonymous UID with a typed unit tag, joining by QR-everywhere — that is [ADR-022](ADR-022-mutual-aid-v40-qr-guest.md)'s decision, referenced here so the two paths do not contradict (see Reconciliation below).
- **SSO out of scope** at the local-department level. **No 2FA in v4.0** (open-question [#33](../99-open-questions.md), deferred to v4.1+).

### Reconciliation with [ADR-022](ADR-022-mutual-aid-v40-qr-guest.md) and [ADR-024](ADR-024-d5-multi-device-build-a.md)

One device = one **per-device Firebase anonymous UID** ([ADR-009](ADR-009-database-firebase-rtdb.md), [ADR-024](ADR-024-d5-multi-device-build-a.md)), persisted to IndexedDB, Firebase `LOCAL` persistence. That anon UID is the floor for *every* device. **A provisioned member** signs in (this ADR) and is attributed by their mandatory display name; **an un-provisioned guest** ([ADR-022](ADR-022-mutual-aid-v40-qr-guest.md)) stays on the anon UID and is attributed by their typed unit tag ("Guest · Engine 7, Westfield FD"), with a read-only record claimable later by creating an account. No contradiction on who gets a UID and when: the UID is always per-device and always present; authentication *upgrades the attribution* (anon + unit-tag → named member), it does not gate the device's ability to work.

---

## Rationale

- **Email + password is the universally understood floor** for a department member registering once; magic-link covers the no-password path for a member who would rather not manage one (synthesis §4 Auth; [#4b](../99-open-questions.md) recommendation).
- **Mandatory display name is an accountability requirement, not a UX nicety** ([#41](../99-open-questions.md)): the v4.0 audit log and signed attestations attribute to a name, so an empty name would break the defensible record. The verification re-review returned this a Block, promoting it from a Phase-H assumption to a locked v4.0 requirement.
- **The offline auth window is the local-first contract applied to login** (synthesis §1.7; [`06-signing-in-and-out.md`](../09-workflows/06-signing-in-and-out.md)): a firefighter on a dead WAN must never be stranded at a sign-in screen. Queue-the-intent keeps guest work flowing and completes auth on reconnect.
- **Keeping the guest path in [ADR-022](ADR-022-mutual-aid-v40-qr-guest.md)** avoids two ADRs defining guest identity. This ADR is the *provisioned-member* record and points at [ADR-022](ADR-022-mutual-aid-v40-qr-guest.md) for the un-provisioned case — one source of truth per path.
- **SSO and 2FA are deliberately deferred:** local departments don't run an IdP at the scale v4.0 targets ([ADR-003](ADR-003-scope-everyday-expandable.md)), and 2FA must be opt-in / Owner-scoped / never a field wall (Principle 11) — a v4.1+ D7 sub-decision ([#33](../99-open-questions.md)), not foundation work.

---

## Alternatives Considered

- **Magic-link only (passwordless).** Rejected: strands a member whose email is slow or offline at the moment of sign-in; email + password is the reliable default with magic-link as the *additional* no-password path, not the sole one.
- **Phone / SMS auth.** Rejected: adds a paid SMS dependency and a number-collection surface for no benefit over email at local-department scale.
- **SSO (Google / Microsoft / department IdP) at v4.0.** Rejected: out of scope at the local-department level ([ADR-003](ADR-003-scope-everyday-expandable.md)); revisit only if a federal/IST tier arrives in v5.
- **2FA in v4.0.** Deferred ([#33](../99-open-questions.md)): opt-in, Owner/Admin-scoped, never a field wall — a v4.1+ decision, not a v4.0 default.
- **Redefining guest identity here.** Rejected: [ADR-022](ADR-022-mutual-aid-v40-qr-guest.md) owns the guest path; duplicating it risks the two ADRs drifting.

---

## Consequences

**Positive:**
- A department member has a real, attributable identity (display name) that the audit log and signed attestations need.
- Sign-in never blocks the fireground — the offline queue keeps the local-first promise at the login surface.
- One clean split: provisioned members here, guests in [ADR-022](ADR-022-mutual-aid-v40-qr-guest.md), both on the same per-device UID.

**Negative:**
- Email deliverability becomes a dependency for both password reset and magic-link; the transport (transactional email service) is Phase-H plumbing, the same class as the after-action email transport ([#35](../99-open-questions.md)).
- No 2FA in v4.0 is a known posture; the placement is already mapped ([#33](../99-open-questions.md)) for when it lands.

**Neutral:**
- The role-based write rules (RBAC) gate *what a signed-in member can do* ([ADR-017](ADR-017-custom-department-roles.md)); this ADR governs *how they sign in*. The two axes are orthogonal.

---

## Related

- **Principles:** 11 (auth never walls the field — guest-first, deferred prompt), 10 (a join/sign-in is a permission grant surfaced visibly, not a message), 8 (local-first — the offline auth window).
- **Other ADRs:** [ADR-009](ADR-009-database-firebase-rtdb.md) (Firebase Anonymous UID, per-device, `LOCAL` persistence, local-first), [ADR-022](ADR-022-mutual-aid-v40-qr-guest.md) (**the guest / un-provisioned path — referenced, not redefined**; QR-everywhere join), [ADR-024](ADR-024-d5-multi-device-build-a.md) (the per-device anon UID this builds the member identity on), [ADR-015](ADR-015-navigation-pattern.md) (guest-first cold-open — never an auth wall), [ADR-017](ADR-017-custom-department-roles.md) (RBAC — the orthogonal what-can-you-do axis), [ADR-018](ADR-018-after-action-auto-email.md) (the audit/after-action record the display name attributes to).
- **Board issue closed:** [#245](https://github.com/Vergo402/paratech-struts/issues/245).
- **Open questions resolved:** [#4b](../99-open-questions.md) (D7.1 auth mechanism → email+password default + magic-link). **References (already resolved):** [#41](../99-open-questions.md) (mandatory display name). **Notes deferred:** [#33](../99-open-questions.md) (2FA → v4.1+).
- **Specs:** [`09-workflows/06-signing-in-and-out.md`](../09-workflows/06-signing-in-and-out.md), [`08-information-architecture/70-login-register.md`](../08-information-architecture/70-login-register.md).
- **Synthesis:** §1.3 (per-device UID, guest at first run), §4 Auth/identity.

---

## Addendum — magic-link sign-up guard & nameless-member display (Phase A build, 2026-06-22)

Two implementation policies the Phase A build (#379) locked in, recorded here so they don't silently regress:

1. **Magic-link is sign-in-only — enforced in CODE, not just the UI.** Firebase's `signInWithEmailLink` *auto-creates* a real account when the email has never registered, so a member typing an unknown email in Sign-In mode would otherwise be seated with a fabricated, email-prefix name — bypassing the mandatory display name. The UI button placement (link offered only in Sign-In mode) is a hint, not a guard. **Enforcement lives in `completeMagicLink()`** (`src/data/auth/accountService.ts`): it detects the just-minted account (`metadata.creationTime === metadata.lastSignInTime` *and* no `displayName`), **deletes it, and rejects** ("No account found — create one first"). Deleting (not merely rejecting) is load-bearing — an orphaned account would pass the freshness check on the next link-open. A Firebase-console toggle forbidding email-link sign-up (Identity Platform / a blocking function) is recommended **belt-and-suspenders** but is explicitly **not** what the accountability anchor depends on; the code guard is the source of truth so a console-side regression can't reopen the gap.

2. **Nameless-member display name = email local-part, then `"Member"`.** New accounts always have a typed name (createAccount requires it; guard #1 rejects nameless new accounts), so this only applies to legacy/edge accounts that somehow lack one. Deliberate choice: fall back to the email local-part (it still ties to a real person) before the generic `"Member"`. Centralized in one `resolveDisplayName()` shared by `signIn` / `completeMagicLink` / `authSessionSync` — one intentional default, not three copy-pasted chains.

Tracked as a sub-issue of epic [#379](https://github.com/Vergo402/paratech-struts/issues/379).

## Notes

The single open sub-item this ADR does not resolve is the offline-auth *token lifetime* (how long a "trust this device" refresh token stays valid offline) — that is plumbing flagged in [`06-signing-in-and-out.md`](../09-workflows/06-signing-in-and-out.md) §Open questions and rides the same Phase-H infrastructure pass as the email transport, not a design call. [ADR-009](ADR-009-database-firebase-rtdb.md) already establishes that Firebase's long-lived refresh token plus flush-time authorization covers multi-hour outages, so the offline window is safe; only the exact lifetime is a tuning question.
