# IA Spec: Login / Register

> Phase F information-architecture spec. Cites [`00-ia-foundation.md`](00-ia-foundation.md) for all cross-cutting rules (tab map, navigation / guest-first boot flow, modal-vs-sheet row, four-surface framework, persistent chrome) and does not re-derive them.
> Source: the master plan **D7.1** (auth method) + **D7.2** (dept ownership); [`06-synthesis.md`](../06-synthesis.md) §1.3 (cold-open / guest-first) + §Auth-identity (guest mode default, "Sign in to sync" the only auth surface, per-device UID, one-time Owner claim); [ADR-015](../11-decisions/ADR-015-navigation-pattern.md) (guest-first cold-open), [ADR-009](../11-decisions/ADR-009-database-firebase-rtdb.md) (per-device UID, security rules), [ADR-008](../11-decisions/ADR-008-nims-org-structure.md), [ADR-016](../11-decisions/ADR-016-modal-vs-sheet-rules.md); [Principle 11](../02-principles.md) (the app earns its place quietly). **Net-new** — v3 has only Firebase **Anonymous Auth** (`signInAnonymously`, app.js:~2597) + a hardcoded Dept ID (`connectDepartment`) + one shared permission level (the `members` stub in `database.rules.json`); per-user login/register is new in v4.0. GitHub [#206](https://github.com/Vergo402/paratech-struts/issues/206).

---

## Purpose

Sign an existing user in, or create a new account — establishing the authenticated, per-device identity that the four-role model and security rules gate on (D7). It is the **forward** destination of the "Sign in to sync" banner and Settings, never a wall between the firefighter and the work.

## Where it lives

- **Tab / parent:** **pre-shell** — a full-screen route that mounts *outside* the five-tab shell (per the [tab map](00-ia-foundation.md) §pre-shell, [ADR-014](../11-decisions/ADR-014-tab-structure.md)); **not** a sixth tab and **not** an overlay (the [modal-vs-sheet row](00-ia-foundation.md): "Login / Register · Dept Setup · Invite Code | the forms | **Pre-shell full-screen routes, not overlays**").
- **How it is reached:** **forward only** — the dismissible **"Sign in to sync" banner** (shell chrome, surfaced on [Quick Find](10-quick-find.md) and elsewhere) or **[Settings](50-settings.md) → Department**. **Never a cold-open gate** ([ADR-015](../11-decisions/ADR-015-navigation-pattern.md); the boot flow in [`00-ia-foundation.md`](00-ia-foundation.md) §Navigation). On success → forward to [Department Setup](71-dept-setup.md) (no dept yet) or [Invite Code Entry](72-invite-code.md) (joining), or straight back to the shell (already a member).
- **Issue:** [#206](https://github.com/Vergo402/paratech-struts/issues/206).

## Primary role(s) and surface(s)

- **Primary role(s):** any user (becomes Owner / Admin / Member / Observer only *after* a dept is created or joined — D7; this screen establishes identity, not role). NIMS-independent device roles spelled out ([ADR-008](../11-decisions/ADR-008-nims-org-structure.md)).
- **Primary surface(s):** **phone is the floor**; a **non-operational surface → 48pt targets** (like [Settings](50-settings.md); [`spacing-grid.md`](../07-design-system/spacing-grid.md)). Tablet/laptop center a wider form. **Broadcast does not render this** (a cast board never shows a login form).

## Information hierarchy (above / below fold) — per surface

### Phone (the floor)
- **Above fold:** the brand mark; the **Sign In ↔ Create Account** mode control; the **email + password** fields; the primary submit.
- **Below fold:** the **magic-link** ("email me a sign-in link") path; **Forgot password**; and — always present — **Continue as guest** (the way back to the work).

### Tablet / laptop
- **Above fold:** the same form centered in a narrow column; laptop is keyboard-first (tab order, Enter submits).

### Broadcast TV
- **Not rendered.** Auth is never projected.

## Primary action + secondary actions

- **Primary action (one — Principle 4):** **authenticate** — sign in or create an account. Default method is **email + password**, with **email magic-link** as the no-password path (D7.1 *recommendation, pending Alex's confirm — OQ*). The **Sign In ↔ Create Account** mode is a [`segmented`](../03-primitives/segmented.md) value control.
- **Secondary actions:** **Continue as guest** (first-class — Principle 11; never trap the user here); **magic-link**; **Forgot password**.
- **Destructive / terminal:** none.

## Composed primitives

- [x] [input](../03-primitives/input.md) — **email** (text) + **password** (the secure-text variant); validation is inline `aria-invalid` + a specific message, never color-alone.
- [x] [button](../03-primitives/button.md) — primary **Sign in / Create account**; secondary **magic-link**, **Forgot password**, **Continue as guest**.
- [x] [segmented](../03-primitives/segmented.md) — the **Sign In ↔ Create Account** mode (value variant).
- [x] [loading-state](../03-primitives/loading-state.md) — the auth network call is a genuine wait → a **busy control** on the submit button (one of the legitimate loaders).
- [ ] picker · card · sheet · modal · toggle · slider · toast · badge · empty-state · warning-gate · nested-checklist — not core. Errors resolve **inline** ([`input.md`](../03-primitives/input.md) `aria-invalid`), calm (Principle 3) — never `alert()`, never a modal in the common path.

> **A new primitive would be a gate escalation, not a spec decision.**

## What ships v4.0 (and what doesn't)

This screen **ships v4.0** (the auth/identity cluster is not content-deferred like the checklist strings). v4.0 delivers per-device UID, the four-role storage + security rules, and the create/join/Owner-claim flow. The **auth method** is the D7.1 recommendation — **email + password (default) + email magic-link (no-password path)**; phone/SMS OTP and SSO are out of scope. The **Admin User Manager UI** (D7.3 — promote/demote/revoke) is the **separate [#209](https://github.com/Vergo402/paratech-struts/issues/209) screen, deferred to v4.1**; this screen does not manage other users.

## Guest-first — never a gate (the load-bearing rule)

The app boots to **guest mode on [Quick Find](10-quick-find.md) with no auth wall** (Principle 11, [ADR-015](../11-decisions/ADR-015-navigation-pattern.md)); a firefighter at a collapse reaches the shore-point list, not a login form. This screen is reached **forward** and is **fully deferrable** — guest state persists locally, so an operator can run an entire operation as a guest and claim/sync later. Therefore **Continue as guest is a permanent, first-class action here** — the screen never traps. (The v3→v4 migration is silent; if it ran, the device is already a Member and may never see this screen — synthesis §Auth-identity.)

## Locked cross-cutting rules this screen honors

- [x] **Guest-first — never a cold-open gate**; Continue-as-guest always present ([ADR-015](../11-decisions/ADR-015-navigation-pattern.md), Principle 11).
- [x] **Pre-shell full-screen route, not an overlay** ([ADR-016](../11-decisions/ADR-016-modal-vs-sheet-rules.md)).
- [x] **Phone is the floor**; **48pt non-operational targets** ([`spacing-grid.md`](../07-design-system/spacing-grid.md)).
- [x] **Calm errors** — inline `aria-invalid` + specific copy, never `alert()`, never an alarm (Principle 3; [`input.md`](../03-primitives/input.md)).
- [x] **No mystery meat** — labeled fields + buttons, no icon-only primary (Principle 9).
- [x] **Respect the radio** — no unsolicited notifications; the banner that leads here is dismissible (Principle 10).
- [x] **NIMS / device roles spelled out** ([ADR-008](../11-decisions/ADR-008-nims-org-structure.md), [`voice-and-tone.md`](../07-design-system/voice-and-tone.md)).
- [x] **No broadcast render** — auth is never projected.
- [x] **Local-first** — guest state persists; auth is sync, not a precondition for work (Principle 8).

## The four-surface table (this screen)

| Dimension | Phone | Tablet | Laptop | Broadcast |
|---|---|---|---|---|
| Layout | single-column form | centered narrow column | centered + keyboard-first | **not rendered** |
| Above fold | mode + email/password + submit | same | same, tab-ordered | — |
| Primary-action affordance | tap submit (48pt) | tap submit | Enter submits | — |
| Added density | — | — | keyboard tab order | — |
| Does NOT render | — | — | — | **the whole screen** |

## Empty / error / loading states

(Posture set in [`00-ia-foundation.md`](00-ia-foundation.md) §Cross-cutting empty / error / loading.)

- **Empty:** n/a — the form is the content; there is no zero-state (guest is the "skip" path, not an empty state).
- **Error:** invalid email / wrong password / expired magic-link → inline [`input.md`](../03-primitives/input.md) `aria-invalid` + a specific, calm message; an offline submit **queues the intent and tells the user plainly** (local-first); never `alert()`.
- **Loading:** the auth round-trip is a real wait → a **busy submit button** ([`loading-state.md`](../03-primitives/loading-state.md)); everything else is instant.

## Accessibility / screen-reader notes

**Cite [`accessibility.md`](../07-design-system/accessibility.md), do not restate.**
- Labeled email/password fields; the password field exposes a show/hide control (labeled, not icon-only); the mode [`segmented`](../03-primitives/segmented.md) uses roving-tabindex; errors announce via `aria-invalid` + the message text ([`accessibility.md`](../07-design-system/accessibility.md) §Screen-reader scripts / §Focus & keyboard).
- Focus lands on the first field on route mount; the busy submit announces its state via `aria-busy`; **Continue as guest** is reachable by keyboard before submit (never buried).

## Open questions (per-screen)

1. **Auth method** — email + password (default) + email magic-link is the D7.1 *recommendation*, tracked as [`99-open-questions.md`](../99-open-questions.md) **#4b (decided in Phase H)**; the IA composes the same primitives either way.
2. **Password-reset + magic-link exact flows** — the email-link round-trip UX is a Phase G workflow.
3. **Display-name entry point** — whether the user's display name is captured here (account creation), in [Department Setup](71-dept-setup.md), or in [Invite Code Entry](72-invite-code.md); resolved across the cluster + the Phase G auth workflow.
4. **On-scene QR sign-in** (synthesis Q8) — scan-to-sign-in + pre-fill; feasibility confirmed by [ADR-009](../11-decisions/ADR-009-database-firebase-rtdb.md), affordance deferred to Phase G.
5. **v3→v4 migration progress UI + offline-auth token window** — silent migration UX and the refresh-token "trust this device" window are Phase H.
