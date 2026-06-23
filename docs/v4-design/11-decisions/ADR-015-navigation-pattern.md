# ADR-015: Navigation pattern — fixed bottom nav, push drilldown, progressive across surfaces, guest-first cold-open

> Architecture Decision Record. The reasoning and the routing diagram live in [`08-information-architecture/00-ia-foundation.md`](../08-information-architecture/00-ia-foundation.md) §Navigation pattern; this ADR records the decision.

---

## Status

- [x] Proposed
- [x] Accepted *(Phase F foundation mini-gate — Alex, 2026-06-07)*

**Date:** 2026-06-07
**Author:** Claude Opus 4.8 (Phase F foundation session)
**Reviewer(s):** Alex (Phase F foundation gate — approved 2026-06-07)

---

## Context

Given the five-tab spine ([ADR-014](ADR-014-tab-structure.md)), v4 needs one navigation model that works on the phone floor and scales up the three larger surfaces — and a cold-open routing answer now that v4.0 adds authentication (D7) without violating Principle 11 ("no onboarding flows that delay the IC reaching the shore-point list"). [`segmented.md`](../03-primitives/segmented.md) explicitly defers the bottom-nav definition to Phase F.

---

## Decision

**Phone: a fixed five-item bottom tab bar that never animates, with one-level-at-a-time push drilldown and a breadcrumb back-path. The model is progressive across surfaces** — tablet promotes the tab bar to a 320pt left rail with the drilldown tree expanded; laptop adds a Cmd/Ctrl+K command palette with full keyboard parity; broadcast renders no navigation. **Cold-open is guest-first**: the app boots into guest mode on Quick Find with no auth wall; authentication is reached *forward* from a dismissible "Sign in to sync" banner or Settings.

---

## Rationale

- **A fixed, non-animating bottom bar is the stable frame** the moving content needs ([`motion.md`](../07-design-system/motion.md) §What does not move); it keeps five destinations one thumb-tap away on the floor surface (Principle 2).
- **The bottom nav is navigation, not a [segmented](../03-primitives/segmented.md) control** — segmented is single-select *within* a screen; routing to top-level destinations is a different job, so the nav is an app-shell frame with `aria-current="page"`, not a `radiogroup`.
- **One-level push + breadcrumb** matches the [`list.md`](../03-primitives/list.md) tree model and v3's `drilldownBreadcrumb`; the tab bar staying mounted keeps the operator oriented.
- **Progressive density, not parallel designs** ([`06-synthesis.md`](../06-synthesis.md) §1.8): the same five destinations re-flow as a rail (tablet) and gain a command palette (laptop, rec C-9) without becoming different apps.
- **Guest-first honors Principle 11 and local-first** ([`06-synthesis.md`](../06-synthesis.md) §1.3): the firefighter reaches the work, not a login form; guest state persists locally, so dept creation/join and sync are deferrable.

---

## Alternatives Considered

- **A hamburger/drawer nav** instead of a persistent bottom bar. Rejected — hides destinations behind a tap, costs reach on the floor surface, and discards v3's always-visible model.
- **An auth gate at cold-open** (login before the shell). Rejected — violates Principle 11 and the local-first posture; a collapse is the wrong moment to demand a password.
- **Animated tab transitions / a sliding nav indicator.** Rejected — the nav is the one frame that must not move ([`motion.md`](../07-design-system/motion.md)); motion there reads as instability under stress (Principle 3).

---

## Consequences

- **Positive:** one mental model across four surfaces; the IC reaches the shore-point list instantly; auth adoption is opt-in and non-blocking.
- **Negative:** "guest-first then claim" requires the v3→v4 migration to run once silently and the Owner-claim to be a one-time banner, both of which the D7 auth work must implement; the offline-auth window (token persistence) is a D7/Phase-H concern.
- **Neutral:** the command palette (laptop) and drag affordances (tablet) are enhancements with phone-floor equivalents (tap nav; slide-to-advance), per the four-surface governing rule.

---

## Related

- **Principles:** 2 (designed for the role), 3 (calm in chaos), 8 (local-first), 11 (earns its place quietly).
- **Other ADRs:** builds on [ADR-014](ADR-014-tab-structure.md); D7 auth ADR (Phase H, [#245](https://github.com/Vergo402/paratech-struts/issues/245)) implements the guest→authed transition.
- **Open questions resolved:** contributes to closing [`99-open-questions.md`](../99-open-questions.md) #4/#26 (with [ADR-014](ADR-014-tab-structure.md)).
- **Open questions surfaced:** offline-auth window mechanics (D7/Phase H); pocket-lock geometry (Phase H — see [`00-ia-foundation.md`](../08-information-architecture/00-ia-foundation.md) §Persistent chrome).

---

## Amendment (2026-06-22) — a signed-in member is bound to a department

"Skip is always a first-class exit" applies to **guests**. It is **narrowed for signed-in members**: a
member must belong to a department before reaching the department-scoped tabs (Operations, Inventory,
Command, Settings). A member with no department sees an in-shell set-up gate (`RequireDepartment`,
`src/ui/dept`) offering Create / Join / Sign out instead of those tabs — their work must never land in the
shared, demo-seeded `guest` bucket alongside other no-department members (the per-department storage
isolation invariant, cloud-sync Increment 1). **Quick Find stays open to everyone** (a stateless calculator
with no department data), so the cold-open is still never walled, and **guests are unchanged**. Owner
decision (Alex). Automatic new-device re-discovery of a member's department (no code re-entry) lands with
cloud sync ([#232](https://github.com/Vergo402/paratech-struts/issues/232)); until then a returning member
on a new device re-enters their invite code.

---

## Notes

The routing diagram (boot → guest shell → forward auth) and the per-surface navigation table live in [`00-ia-foundation.md`](../08-information-architecture/00-ia-foundation.md) §Navigation pattern.
