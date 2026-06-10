# IA Spec: Invite Code Entry

> Phase F information-architecture spec. Cites [`00-ia-foundation.md`](00-ia-foundation.md) for all cross-cutting rules (tab map, navigation / guest-first boot flow, modal-vs-sheet row, four-surface framework) and does not re-derive them.
> Source: the master plan **D7.2** (a second user joins a dept by entering an invite code, 24h / one-time, added with the **Default role** — [ADR-017](../11-decisions/ADR-017-custom-department-roles.md), "Member" folded into the Default); [`06-synthesis.md`](../06-synthesis.md) §1.3 (guest-first, deferrable join) + §Auth-identity; [ADR-015](../11-decisions/ADR-015-navigation-pattern.md), [ADR-009](../11-decisions/ADR-009-database-firebase-rtdb.md), [ADR-008](../11-decisions/ADR-008-nims-org-structure.md), [ADR-016](../11-decisions/ADR-016-modal-vs-sheet-rules.md). **Distinct from the cross-dept *incident* invite** ([#210](https://github.com/Vergo402/paratech-struts/issues/210), D7.4, v4.5) — this is **dept-level join**, not incident-scoped mutual aid. **Net-new** — v3 has no join concept (a single hardcoded Dept ID). GitHub [#208](https://github.com/Vergo402/paratech-struts/issues/208).

---

## Purpose

Join an existing department by entering its invite code — adding this user to the dept with the **Default role** ([ADR-017](../11-decisions/ADR-017-custom-department-roles.md)). The teammate-onboarding counterpart to the code [Department Setup](71-dept-setup.md) generates. Reached forward, deferrable.

## Where it lives

- **Tab / parent:** **pre-shell** — a full-screen route on join; thereafter reached from **[Settings](50-settings.md) → Department → "Join existing department"** (per the [tab map](00-ia-foundation.md) §pre-shell, [ADR-014](../11-decisions/ADR-014-tab-structure.md)); **not** an overlay.
- **How it is reached:** **forward** from [Login / Register](70-login-register.md) on success when joining, or from [Settings](50-settings.md). **Never a cold-open gate** ([ADR-015](../11-decisions/ADR-015-navigation-pattern.md)). On success → the shell in AUTHED mode, with the **Default role**.
- **Issue:** [#208](https://github.com/Vergo402/paratech-struts/issues/208).

## Primary role(s) and surface(s)

- **Primary role(s):** the joining user → gets the **Default role** (read everything in the dept; run field work in operations they're part of; an **Admin** may assign a different role later via the [User Manager](https://github.com/Vergo402/paratech-struts/issues/209) — [ADR-017](../11-decisions/ADR-017-custom-department-roles.md)). Roles spelled out ([ADR-008](../11-decisions/ADR-008-nims-org-structure.md)).
- **Primary surface(s):** **phone is the floor** (a teammate joins from their own phone); a **non-operational surface → 48pt targets**. Tablet/laptop center the form. **Broadcast does not render this.**

## Information hierarchy (above / below fold) — per surface

### Phone (the floor)
- **Above fold:** the single **invite-code** field (with a **paste-from-clipboard** convenience) + the **Join department** primary.
- **Below fold:** a calm inline error area (invalid / expired / already-used); **Continue as guest** until committed.

### Tablet / laptop
- **Above fold:** the same single-field form centered; laptop keyboard-first (paste + Enter).

### Broadcast TV
- **Not rendered.**

## Primary action + secondary actions

- **Primary action (one — Principle 4):** **Join department** — enter the invite code and submit; on success the user is added with the **Default role**.
- **Secondary actions:** **paste** the code from the clipboard; **Continue as guest** (until committed).
- **Destructive / terminal:** none.

## Composed primitives

- [x] [input](../03-primitives/input.md) — the **invite-code** field (a constrained code entry); inline `aria-invalid` for invalid/expired/used, never color-alone.
- [x] [button](../03-primitives/button.md) — primary **Join department**; secondary **Paste**, Continue as guest.
- [x] [loading-state](../03-primitives/loading-state.md) — the join write/validation is a genuine wait → a busy primary button.
- [x] [badge](../03-primitives/badge.md) — the resulting **Default** role badge (on success).
- [ ] picker · card · sheet · modal · segmented · toggle · slider · toast · empty-state · warning-gate · nested-checklist — not core. Errors resolve **inline**, calm (Principle 3) — never `alert()`.

> **A new primitive would be a gate escalation, not a spec decision.**

## What ships v4.0 (and the dept-vs-incident distinction)

This screen **ships v4.0**: enter a code → join with the **Default role**. The **role on join is the Default** ([ADR-017](../11-decisions/ADR-017-custom-department-roles.md)); an **Admin** assigns a different role later via the [User Manager](https://github.com/Vergo402/paratech-struts/issues/209). **This is a dept-level join.** The **cross-dept *incident* invite** — an assisting department getting scoped access to *one incident* at a mutual-aid scene — is a **separate flow** ([Cross-Dept Invite, #210](https://github.com/Vergo402/paratech-struts/issues/210), D7.4, **v4.5**); do not conflate them.

## Guest-first — never a gate

Joining is **deferrable** (Principle 11, [ADR-015](../11-decisions/ADR-015-navigation-pattern.md)): a teammate can work locally as a guest and join/sync later. This route never blocks the work; **Continue as guest** stays available until the join is committed.

## Locked cross-cutting rules this screen honors

- [x] **Guest-first — never a gate**; deferrable; Continue-as-guest until committed ([ADR-015](../11-decisions/ADR-015-navigation-pattern.md), Principle 11).
- [x] **Pre-shell full-screen route, not an overlay** ([ADR-016](../11-decisions/ADR-016-modal-vs-sheet-rules.md)).
- [x] **Phone is the floor**; **48pt non-operational targets**.
- [x] **Calm errors** — invalid / expired / already-used codes are inline `aria-invalid` + specific copy, never an alarm, never `alert()` (Principle 3; [`input.md`](../03-primitives/input.md)).
- [x] **No mystery meat** — labeled field + buttons (Principle 9).
- [x] **Device roles spelled out** — e.g. the **Default** role ([ADR-008](../11-decisions/ADR-008-nims-org-structure.md), [ADR-017](../11-decisions/ADR-017-custom-department-roles.md)).
- [x] **No broadcast render.**
- [x] **Dept-join ≠ incident-join** — kept distinct from the [Cross-Dept Invite](https://github.com/Vergo402/paratech-struts/issues/210) (v4.0 — [ADR-022](../11-decisions/ADR-022-mutual-aid-v40-qr-guest.md)).

## The four-surface table (this screen)

| Dimension | Phone | Tablet | Laptop | Broadcast |
|---|---|---|---|---|
| Layout | single code field + Join | centered narrow form | centered + keyboard/paste | **not rendered** |
| Above fold | code field + paste + Join | same | same | — |
| Primary-action affordance | tap Join (48pt) | tap Join | Enter joins | — |
| Added density | — | — | keyboard + paste | — |
| Does NOT render | — | — | — | **the whole screen** |

## Empty / error / loading states

- **Empty:** n/a — the single field is the content.
- **Error:** invalid / expired / already-used code → inline [`input.md`](../03-primitives/input.md) `aria-invalid` + a specific, calm message; an offline join **queues and tells the user plainly** (local-first); never `alert()`.
- **Loading:** the join validation/write → busy primary button ([`loading-state.md`](../03-primitives/loading-state.md)).

## Accessibility / screen-reader notes

**Cite [`accessibility.md`](../07-design-system/accessibility.md), do not restate.**
- The code field is labeled and announces its expected format; the **Paste** control is labeled (not icon-only); errors announce via `aria-invalid` + the message; focus lands on the field on mount ([`accessibility.md`](../07-design-system/accessibility.md) §Screen-reader scripts / §Focus & keyboard).

## Open questions (per-screen)

1. **Code format / alphabet / validation** — length and character set (avoiding ambiguous glyphs), QR vs. text — affordance geometry for Phase G/H; shared with the [Department Setup](71-dept-setup.md) generator + the v4.5 [Cross-Dept Invite](https://github.com/Vergo402/paratech-struts/issues/210).
2. **Role on join** — the **Default role** ([ADR-017](../11-decisions/ADR-017-custom-department-roles.md)); an **Admin** assigns a different role later via the [User Manager](https://github.com/Vergo402/paratech-struts/issues/209). (Resolved at the #217 gate.)
3. **Display-name entry point** — captured here, in [Login / Register](70-login-register.md), or in the shell; resolved across the cluster + the Phase G auth workflow.
4. **Multi-dept membership vs. switch** — whether joining adds the dept to a per-user list or replaces the current one (the data-model question shared with [Department Setup](71-dept-setup.md)); **escalated to [`99-open-questions.md`](../99-open-questions.md)**, resolved in Phase G/H.
5. **Code paste UX** — clipboard-read affordance detail (Phase H).
