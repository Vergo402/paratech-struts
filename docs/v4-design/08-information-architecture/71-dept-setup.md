# IA Spec: Department Setup

> Phase F information-architecture spec. Cites [`00-ia-foundation.md`](00-ia-foundation.md) for all cross-cutting rules (tab map, navigation / guest-first boot flow, modal-vs-sheet row, four-surface framework) and does not re-derive them.
> Source: the master plan **D7.2** (dept ownership — first registrant becomes Owner; owner generates the first invite code, 24h / one-time); [`06-synthesis.md`](../06-synthesis.md) §1.3 (guest-first, deferrable dept creation) + §Auth-identity (the **one-time Owner claim** — write `owner` only if `/departments/{deptId}/owner` does not exist; idempotent; the v3→v4 migration path); [ADR-015](../11-decisions/ADR-015-navigation-pattern.md), [ADR-009](../11-decisions/ADR-009-database-firebase-rtdb.md) (per-device UID, security rules), [ADR-008](../11-decisions/ADR-008-nims-org-structure.md), [ADR-016](../11-decisions/ADR-016-modal-vs-sheet-rules.md); the <2-minute zero-config onboarding bar ([`04-references/tablet-command.md`](../04-references/tablet-command.md) anti-pattern). **Net-new** — v3 has no dept-creation UI (a single hardcoded Dept ID via `connectDepartment`, app.js). GitHub [#207](https://github.com/Vergo402/paratech-struts/issues/207).

---

## Purpose

Create a new department (the creator becomes its **Owner**), or **claim ownership** of an existing un-owned department (the one-time claim, the v3→v4 migration path) — and produce the first **invite code** so teammates can join. The minimal "stand up a department" step, reached forward, deferrable.

## Where it lives

- **Tab / parent:** **pre-shell** — a full-screen route on first dept creation; thereafter reached from **[Settings](50-settings.md) → Department → "Create new department"** (per the [tab map](00-ia-foundation.md) §pre-shell, [ADR-014](../11-decisions/ADR-014-tab-structure.md)); **not** an overlay (the [modal-vs-sheet row](00-ia-foundation.md): pre-shell full-screen routes, not overlays).
- **How it is reached:** **forward** from [Login / Register](70-login-register.md) on success when no department exists yet; from [Settings](50-settings.md); or via the **"Claim department ownership" one-time banner** after a v3→v4 migration where no owner is set. **Never a cold-open gate** ([ADR-015](../11-decisions/ADR-015-navigation-pattern.md)). On success → the shell in AUTHED mode, the new Owner.
- **Issue:** [#207](https://github.com/Vergo402/paratech-struts/issues/207).

## Primary role(s) and surface(s)

- **Primary role(s):** the creating user → becomes **Owner** (the dept's super-admin — D7; titles spelled out, [ADR-008](../11-decisions/ADR-008-nims-org-structure.md)).
- **Primary surface(s):** **phone is the floor**; a **non-operational surface → 48pt targets**. Tablet/laptop center a wider form. **Broadcast does not render this.**

## Information hierarchy (above / below fold) — per surface

### Phone (the floor)
- **Above fold:** the **department name** field (the one required input) + the **Create department** primary.
- **Below fold:** on success, the **generated invite code** to copy/share (or a success route to it); **Continue as guest** remains available until the create is committed.

### Tablet / laptop
- **Above fold:** the same minimal form centered; laptop keyboard-first.

### Broadcast TV
- **Not rendered.**

## Primary action + secondary actions

- **Primary action (one — Principle 4):** **Create department** — collect the **department name** and write the **Owner claim** (`owner: {uid}`, allowed only if no owner exists — idempotent). Keep it to the one field: a new dept must stand up in **under two minutes with zero config** (the explicit anti-pattern rejection of competitors' heavy setup).
- **Secondary actions:** **claim ownership** of an existing un-owned dept (same write, different entry); copy/share the **generated invite code**; **Continue as guest** (until committed).
- **Destructive / terminal:** **none in the common path** (creation is additive; the Owner claim is idempotent and write-once).

## Composed primitives

- [x] [input](../03-primitives/input.md) — the **department name** field (validated length); inline `aria-invalid` on empty/invalid, never color-alone.
- [x] [button](../03-primitives/button.md) — primary **Create department** / **Claim ownership**; secondary copy-code, Continue as guest.
- [x] [badge](../03-primitives/badge.md) — the resulting **Owner** role badge.
- [x] [loading-state](../03-primitives/loading-state.md) — the create/claim write is a genuine wait → a busy primary button.
- [x] [sheet](../03-primitives/sheet.md) — the **success surface** showing the generated invite code to copy/share (a review sheet; or a success route — OQ).
- [ ] picker · card · modal · segmented · toggle · slider · toast · empty-state · warning-gate · nested-checklist — not core.

> **A new primitive would be a gate escalation, not a spec decision.**

## What ships v4.0 (and the Owner claim)

This screen **ships v4.0**. The **Owner** is claimed **once** — the security rule permits the `owner` write only if the field doesn't already exist (idempotent; safe to re-run on the migrating device — synthesis §Auth-identity). The first invite code (24h expiry, one-time) is generated here for teammate onboarding via [Invite Code Entry](72-invite-code.md). **Ownership transfer / multiple owners** is **not** in v4.0 (deferred with the [User Manager](https://github.com/Vergo402/paratech-struts/issues/209), v4.1+).

## Guest-first — never a gate

Dept creation is **deferrable** (Principle 11, [ADR-015](../11-decisions/ADR-015-navigation-pattern.md)): an operator can run an entire local operation as a guest and create/claim the department later. This route never blocks the work; **Continue as guest** stays available until the create is committed.

## Locked cross-cutting rules this screen honors

- [x] **Guest-first — never a gate**; deferrable; Continue-as-guest until committed ([ADR-015](../11-decisions/ADR-015-navigation-pattern.md), Principle 11).
- [x] **Pre-shell full-screen route, not an overlay** ([ADR-016](../11-decisions/ADR-016-modal-vs-sheet-rules.md)).
- [x] **Zero-config bar** — one field (dept name); a dept stands up in < 2 minutes (the competitor anti-pattern, [`04-references/tablet-command.md`](../04-references/tablet-command.md)).
- [x] **Phone is the floor**; **48pt non-operational targets**.
- [x] **Calm errors** — inline `aria-invalid`, never `alert()` (Principle 3).
- [x] **No mystery meat** — labeled field + buttons (Principle 9).
- [x] **NIMS / device roles spelled out** — "Owner," not an abbreviation ([ADR-008](../11-decisions/ADR-008-nims-org-structure.md)).
- [x] **No broadcast render.**

## The four-surface table (this screen)

| Dimension | Phone | Tablet | Laptop | Broadcast |
|---|---|---|---|---|
| Layout | single field + create | centered narrow form | centered + keyboard | **not rendered** |
| Above fold | dept name + Create | same | same | — |
| Primary-action affordance | tap Create (48pt) | tap Create | Enter creates | — |
| Added density | — | — | keyboard | — |
| Does NOT render | — | — | — | **the whole screen** |

## Empty / error / loading states

- **Empty:** n/a — the single field is the content.
- **Error:** empty/invalid name → inline [`input.md`](../03-primitives/input.md) `aria-invalid`; an offline create **queues and persists locally** (local-first; the dept exists locally, syncs on reconnect); a claim on an already-owned dept fails gracefully with a calm message (the rule blocks it); never `alert()`.
- **Loading:** the create/claim write → busy primary button ([`loading-state.md`](../03-primitives/loading-state.md)).

## Accessibility / screen-reader notes

**Cite [`accessibility.md`](../07-design-system/accessibility.md), do not restate.**
- Labeled dept-name field; focus lands there on mount; the busy primary announces via `aria-busy`; the success sheet (invite code) is focus-trapped with a labeled copy control + the code read as discrete characters ([`accessibility.md`](../07-design-system/accessibility.md) §Screen-reader scripts / §Focus & keyboard).

## Open questions (per-screen)

1. **Metadata beyond name** — whether Dept Setup collects address / dept type / Level or stays name-only; default is **name-only** for the <2-min bar (revisit at the Phase F gate).
2. **Invite-code surfacing** — exactly how the generated code is shown (success sheet vs. success route vs. handing off to [Settings](50-settings.md)); cross-ref [Invite Code Entry](72-invite-code.md) + the [Cross-Dept Invite](https://github.com/Vergo402/paratech-struts/issues/210) (v4.5) generator.
3. **Ownership transfer / multiple owners** — deferred to v4.1+ with the [User Manager](https://github.com/Vergo402/paratech-struts/issues/209).
4. **Multi-dept membership vs. switch** — whether creating a department adds it to a per-user list or replaces the current one (a data-model question shared with [Invite Code Entry](72-invite-code.md)); **escalated to [`99-open-questions.md`](../99-open-questions.md)**, resolved in Phase G/H.
