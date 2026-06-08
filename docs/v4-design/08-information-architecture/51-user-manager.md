# IA Spec: User Manager

> Phase F information-architecture spec. Cites [`00-ia-foundation.md`](00-ia-foundation.md) for all cross-cutting rules (tab map, navigation, modal-vs-sheet row, four-surface framework) and does not re-derive them.
> Source: the master plan **D7.3** (roles within a department — Owner / Admin / Member / Observer; the Owner/Admin may promote/demote/revoke); [`06-synthesis.md`](../06-synthesis.md) §1.3 (per-device UID auth, role-gated rules; "the full admin user manager (D7.3) is deferred per the skeptic — the rules + per-device UID + role storage are v4.0 work"); [ADR-008](../11-decisions/ADR-008-nims-org-structure.md) (**device-roles are NOT NIMS org positions**), [ADR-009](../11-decisions/ADR-009-database-firebase-rtdb.md) (per-device UID), [ADR-016](../11-decisions/ADR-016-modal-vs-sheet-rules.md), [ADR-014](../11-decisions/ADR-014-tab-structure.md)/[015](../11-decisions/ADR-015-navigation-pattern.md). **Net-new** — v3 is single shared Anonymous-Auth UID with no per-user model and no role gating; its `customRoles` / `promoteRoleLevel` / `demoteRoleLevel` (app.js:~2000–2550) operate on the **org chart**, a different concern. GitHub [#209](https://github.com/Vergo402/paratech-struts/issues/209).

---

## Purpose

The Owner/Admin surface for managing **who is in the department and what they can do**: list members, promote/demote their **device-role** (Owner / Admin / Member / Observer), and revoke access. It governs *permissions*, not the incident org chart.

## Where it lives

- **Tab / parent:** **Settings** — a role-gated admin screen nested under the Settings tab (per the [tab map](00-ia-foundation.md), [ADR-014](../11-decisions/ADR-014-tab-structure.md)); **not** a new tab.
- **How it is reached:** from the **role-gated Administration gateway in [Settings](50-settings.md)** (visible to Owner/Admin only). Push navigation within the Settings tab ([ADR-015](../11-decisions/ADR-015-navigation-pattern.md)).
- **Issue:** [#209](https://github.com/Vergo402/paratech-struts/issues/209).

## Primary role(s) and surface(s)

- **Primary role(s):** **Owner / Admin** only (D7.3 — they alone manage users). Members/Observers do not see this screen. Roles spelled out ([ADR-008](../11-decisions/ADR-008-nims-org-structure.md), [`voice-and-tone.md`](../07-design-system/voice-and-tone.md)).
- **Primary surface(s):** **phone is the floor**; a **non-operational surface → 48pt targets** ([`spacing-grid.md`](../07-design-system/spacing-grid.md)). Tablet/laptop add columns + keyboard. **Broadcast does not render this** (admin config, never a board).

## Information hierarchy (above / below fold) — per surface

### Phone (the floor)
- **Above fold:** the **member list** — each row a name + current **role [`badge`](../03-primitives/badge.md)** (Owner / Admin / Member / Observer); the device's own role shown.
- **Below fold:** pending invites (cross-ref [Invite Code Entry](72-invite-code.md) / [Department Setup](71-dept-setup.md) code generation); a member's detail / role-change entry.

### Tablet / laptop
- **Above fold:** members as a denser table with a sortable role column; laptop is keyboard-navigable.

### Broadcast TV
- **Not rendered.**

## Primary action + secondary actions

- **Primary action (one — Principle 4):** **change a member's role** — **promote / demote = a [`sheet`](../03-primitives/sheet.md)** (reversible, non-destructive — the ADR-016 User Manager row).
- **Secondary actions:** view a member's recent activity (a filtered link into the [Audit Log](53-audit-log.md)); see/copy a pending invite code.
- **Destructive / terminal:** **revoke access** = a destructive [`modal`](../03-primitives/modal.md) (default-Cancel; the ADR-016 User Manager row) — removing a member's permissions is terminal enough to confirm.

## Composed primitives

- [x] [list](../03-primitives/list.md) — the member list; rows.
- [x] [badge](../03-primitives/badge.md) — the **device-role** badge per member (+ the actor's own role).
- [x] [sheet](../03-primitives/sheet.md) — **promote / demote** (pick the new role).
- [x] [modal](../03-primitives/modal.md) — **revoke access** (destructive, IC/Owner-gated confirm).
- [x] [button](../03-primitives/button.md) — the role-change entry; the activity link.
- [x] [empty-state](../03-primitives/empty-state.md) — solo (only the Owner so far) → "Invite your team" pointing to the code generator; guest (not connected) → the [Settings](50-settings.md) sign-in path.
- [ ] picker · card · input · toggle · segmented · slider · toast · loading-state · warning-gate · nested-checklist — not core.

> **A new primitive would be a gate escalation, not a spec decision.**

## Device-roles are not NIMS org positions (the load-bearing distinction)

The four roles here — **Owner / Admin / Member / Observer** — are **department-governance permissions** (who may read/write/administer the data), per D7.3. They are **distinct from the NIMS org-chart positions** (Incident Commander, Operations Section Chief, Rescue/Shoring Group Supervisor) assigned on the [Org Chart](31-org-chart.md) ([ADR-008](../11-decisions/ADR-008-nims-org-structure.md)). A Member can be the Incident Commander of an operation (with the per-incident IC write elevation), and an Owner can be an Observer at a given incident. This screen never touches the org chart; it sets data permissions only.

## What ships v4.0 (and the flagged ambiguity)

The **per-device UID + role storage + the security rules that gate writes by role** ship **v4.0** (ADR-009; synthesis §1.3). Whether *this management UI* ships v4.0 or v4.1 is **ambiguous in the source** (the master-plan D7 "Option B" reads v4.0; the synthesis says "the full admin user manager (D7.3) is deferred") — **not resolved here; tracked as [`99-open-questions.md`](../99-open-questions.md) #32** (the roadmap decides). The IA is identical either way.

## 2FA forward hook (future, out of current scope)

If/when 2FA lands, the **"require 2FA" department policy** would live here — best scoped to **Owner/Admin accounts only**, **opt-in**, and **never a field wall** (Principle 11; a firefighter must reach the work). The 2FA *mechanism* (the sign-in challenge + personal enrollment) lives in [Login/Register](70-login-register.md) (#206) and [Settings](50-settings.md) (#202), and its events are recorded in the [Audit Log](53-audit-log.md). This is a **forward hook only** — out of current D7 scope, tracked as [`99-open-questions.md`](../99-open-questions.md) #33; not built.

## Locked cross-cutting rules this screen honors

- [x] **Role-gated** — Owner/Admin only; the gateway in [Settings](50-settings.md) hides it from Member/Observer.
- [x] **Device-roles ≠ NIMS positions** ([ADR-008](../11-decisions/ADR-008-nims-org-structure.md)) — this is permissions, not the org chart.
- [x] **NIMS / device roles spelled out** — "Operations Section Chief," "Owner," never abbreviations ([`voice-and-tone.md`](../07-design-system/voice-and-tone.md)).
- [x] **Modal-vs-sheet** per the ADR-016 User Manager row: promote/demote = sheet; revoke = destructive modal.
- [x] **Reversible vs destructive** — a role change is reversible (sheet, no confirm); revoke is terminal (modal confirm) (Principle 6).
- [x] **No comms / no push** (Principle 10) — a role change is a **permission change**, not a notification; nothing is messaged.
- [x] **Phone is the floor**; **48pt non-operational targets**.
- [x] **No broadcast render.**
- [x] **Every change is audited** — promote/demote/revoke write events to the [Audit Log](53-audit-log.md) (D7.5), attributed to the acting Owner/Admin.

## The four-surface table (this screen)

| Dimension | Phone | Tablet | Laptop | Broadcast |
|---|---|---|---|---|
| Layout | single-column member list | sortable role table | dense table + keyboard | **not rendered** |
| Above fold | members + role badges | members + role column | members + activity columns | — |
| Primary-action affordance | tap member → role sheet (48pt) | tap → sheet | keyboard + sheet | — |
| Added density | — | sortable column | activity / audit columns | — |
| Does NOT render | — | — | — | **the whole screen** |

## Empty / error / loading states

(Posture set in [`00-ia-foundation.md`](00-ia-foundation.md) §Cross-cutting empty / error / loading.)

- **Empty — solo dept:** the first-run [`empty-state`](../03-primitives/empty-state.md) — "Only you so far" + a pointer to generate an invite code ([Department Setup](71-dept-setup.md) / [Invite Code Entry](72-invite-code.md)).
- **Empty — guest (not connected):** points to the [Settings](50-settings.md) sign-in path (upstream-blocked variant), never a void.
- **Error:** a failed role write **queues locally** (sync indicator) and the row shows its prior role until it syncs; never `alert()`.
- **Loading:** local-first — the member list renders instantly; a role change shows a busy control on its commit ([`loading-state.md`](../03-primitives/loading-state.md)).

## Accessibility / screen-reader notes

**Cite [`accessibility.md`](../07-design-system/accessibility.md), do not restate.**
- Each member row announces *name · role* ("Firefighter Diaz, Member"); the promote/demote [`sheet`](../03-primitives/sheet.md) is focus-trapped with a labeled role picker (Power Select native `<select>` fallback under VoiceOver/TalkBack-or-Settings); the **revoke** [`modal`](../03-primitives/modal.md) names the consequence and defaults to Cancel ([`accessibility.md`](../07-design-system/accessibility.md) §Focus & keyboard).
- Role is a labeled badge, never color alone (Principle 9).

## Open questions (per-screen)

1. **Revoke semantics** — does revoke delete the member's UID from the dept or mark it inactive (retaining their audit trail)? Resolved with the Phase G auth workflow; the audit trail must survive either way (D7.5).
2. **Member export** — a CSV of members + roles (Phase I; shares the export pattern with [Inventory](40-inventory.md) / the [Audit Log](53-audit-log.md), not its own implementation).
3. **Admin-UI ship version** — v4.0 vs v4.1 → [`99-open-questions.md`](../99-open-questions.md) #32.
4. **2FA org policy** — the "require 2FA" toggle → [`99-open-questions.md`](../99-open-questions.md) #33 (out of current scope).
