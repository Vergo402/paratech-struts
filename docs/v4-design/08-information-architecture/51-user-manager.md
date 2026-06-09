# IA Spec: User Manager

> Phase F information-architecture spec. Cites [`00-ia-foundation.md`](00-ia-foundation.md) for all cross-cutting rules (tab map, navigation, modal-vs-sheet row, four-surface framework) and does not re-derive them.
> **Rewritten for the custom-role model ([ADR-017](../11-decisions/ADR-017-custom-department-roles.md); #304 / #217 gate, 2026-06-08)** — replaces the fixed Owner/Admin/Member/Observer ladder with **Admin = the only built-in role + an editable Default + department-defined custom roles**.
> Source: [ADR-017](../11-decisions/ADR-017-custom-department-roles.md) (the model — supersedes master-plan D7.3); [`06-synthesis.md`](../06-synthesis.md) §1.3 (per-device UID auth, role-gated rules; the management UI is the deferred part); [ADR-008](../11-decisions/ADR-008-nims-org-structure.md) (**device-roles are NOT NIMS org positions** — the two-axes basis), [ADR-009](../11-decisions/ADR-009-database-firebase-rtdb.md) (per-device UID + data-driven security rules), [ADR-016](../11-decisions/ADR-016-modal-vs-sheet-rules.md), [ADR-014](../11-decisions/ADR-014-tab-structure.md)/[015](../11-decisions/ADR-015-navigation-pattern.md). **Net-new** — v3 is a single shared Anonymous-Auth UID with no per-user model and no role gating; its `customRoles` / `promoteRoleLevel` / `demoteRoleLevel` (app.js:~2000–2550) operate on the **org chart**, a different concern. GitHub [#209](https://github.com/Vergo402/paratech-struts/issues/209) (screen) / [#304](https://github.com/Vergo402/paratech-struts/issues/304) (this rewrite).

---

## Purpose

The Admin surface for **defining what roles a department has and who holds them**: build and edit the department's **roles** (each a set of back-office permissions), and **assign** a role to each member (promote to Admin, revoke). It governs *department permissions* — not the incident org chart, and not the live fireground actions (those follow ICS position).

## Where it lives

- **Tab / parent:** **Settings** — a role-gated admin screen nested under the Settings tab (per the [tab map](00-ia-foundation.md), [ADR-014](../11-decisions/ADR-014-tab-structure.md)); **not** a new tab.
- **How it is reached:** from the **Admin-gated Administration gateway in [Settings](50-settings.md)** (visible to Admins, and to any custom role granted "Manage users & roles"). Push navigation within the Settings tab ([ADR-015](../11-decisions/ADR-015-navigation-pattern.md)).
- **Issue:** [#209](https://github.com/Vergo402/paratech-struts/issues/209) (screen); [#304](https://github.com/Vergo402/paratech-struts/issues/304) (the custom-role rewrite).

## Primary role(s) and surface(s)

- **Primary role(s):** **Admin** (and any custom role granted **Manage users & roles**) — they alone see and use this screen ([ADR-017](../11-decisions/ADR-017-custom-department-roles.md)). Roles spelled out ([ADR-008](../11-decisions/ADR-008-nims-org-structure.md), [`voice-and-tone.md`](../07-design-system/voice-and-tone.md)).
- **Primary surface(s):** **phone is the floor**; a **non-operational surface → 48pt targets** ([`spacing-grid.md`](../07-design-system/spacing-grid.md)). Tablet/laptop add columns + keyboard. **Broadcast does not render this** (admin config, never a board).

## What it manages — two lists (Roles + Members)

This screen has two faces, switched by a [`segmented`](../03-primitives/segmented.md) scope:

1. **Roles** — the department's role definitions: **Admin** (built-in, full, can't be deleted) + the **Default** (built-in, editable — what a new member gets) + any **custom roles** the department creates. Each role is a name + the back-office permission toggles ([ADR-017](../11-decisions/ADR-017-custom-department-roles.md)).
2. **Members** — the people in the department, each with the role they hold. Assign/change a member's role; promote to Admin; revoke access.

## Information hierarchy (above / below fold) — per surface

### Phone (the floor)
- **Above fold:** the **Members** list by default — each row a name + current **role [`badge`](../03-primitives/badge.md)**; the device's own role shown. A [`segmented`](../03-primitives/segmented.md) switches to the **Roles** list.
- **Below fold:** pending invites (cross-ref [Invite Code Entry](72-invite-code.md) / [Department Setup](71-dept-setup.md)); a member's detail / role-change entry; under Roles, the create-role entry.

### Tablet / laptop
- **Above fold:** members as a denser table with a sortable role column; the Roles list beside it (tablet) or as a second pane with the role editor (laptop); laptop is keyboard-navigable.

### Broadcast TV
- **Not rendered.**

## Primary action + secondary actions

- **Primary action (one — Principle 4):** **assign a member's role** — a [`sheet`](../03-primitives/sheet.md) (pick from the department's roles; reversible, non-destructive — the ADR-016 User Manager row).
- **Secondary actions:** **create / edit a role** (a [`sheet`](../03-primitives/sheet.md) — name + the permission [`toggle`](../03-primitives/toggle.md)s); **promote to Admin** (a sheet); view a member's recent activity (a filtered link into the [Audit Log](53-audit-log.md), itself IC/Operations-gated per #217); see/copy a pending invite code.
- **Destructive / terminal:** **revoke a member's access** and **delete a custom role** = a destructive [`modal`](../03-primitives/modal.md) (default-Cancel — the ADR-016 User Manager row). The **last Admin cannot be demoted or revoked** (anti-lockout, [ADR-017](../11-decisions/ADR-017-custom-department-roles.md)) — the action is shown disabled with a reason, never a dead end. Deleting a custom role that members still hold reassigns them to the **Default** first (named in the confirm).

## Composed primitives

- [x] [list](../03-primitives/list.md) — the **Members** list and the **Roles** list; rows.
- [x] [segmented](../03-primitives/segmented.md) — the **Members ⇆ Roles** scope.
- [x] [badge](../03-primitives/badge.md) — the **role** badge per member (+ the actor's own role); a "built-in" tag on Admin / Default.
- [x] [toggle](../03-primitives/toggle.md) — the **per-permission switches** in the role editor (the ~8 back-office capabilities, [ADR-017](../11-decisions/ADR-017-custom-department-roles.md)); each is a form-toggle, committed with the role.
- [x] [sheet](../03-primitives/sheet.md) — **assign a member's role**; **create / edit a role** (name + permission toggles); **promote to Admin**.
- [x] [modal](../03-primitives/modal.md) — **revoke access** / **delete a custom role** (destructive, default-Cancel).
- [x] [button](../03-primitives/button.md) — the assign / create-role / promote entries; the activity link.
- [x] [empty-state](../03-primitives/empty-state.md) — solo (only the founding Admin so far) → "Invite your team"; guest (not connected) → the [Settings](50-settings.md) sign-in path.
- [ ] picker · card · input (beyond the role-name field) · slider · toast · loading-state · warning-gate · nested-checklist — not core.

> **A new primitive would be a gate escalation, not a spec decision.** The role editor's permission switches are the existing [`toggle`](../03-primitives/toggle.md), not a new control.

## The role model ([ADR-017](../11-decisions/ADR-017-custom-department-roles.md))

- **Admin** — the only **built-in, mandated** role; full permissions; **≥ 1 Admin always remains** (the last Admin can't be demoted/revoked). The dept **creator is the first Admin** ([Department Setup](71-dept-setup.md)).
- **Default** — built-in but **editable**: what a member gets on join (Read + Run-field-work out of the box); an Admin can change what it allows (down to read-only).
- **Custom roles** — unlimited, department-defined; a name + a chosen subset of the **~8 back-office permission toggles**: Read · Run field work · Create & end operations · Manage inventory & apparatus · Manage roster/accountability · Manage department settings · Manage users & roles · Export / delete department data.
- **The fireground actions are NOT here** — deploy / cut / secure / return stay gated by **ICS position** within the operation (v3 `canPerformShoreAction`), and the [Audit Log](53-audit-log.md) read/export is IC / Operations (#217). This screen sets **back-office permissions only**.

## Device-roles are not NIMS positions, and not fireground gates (the load-bearing distinction)

The roles here are **department-governance permissions** (who may read/write/administer the data), per [ADR-017](../11-decisions/ADR-017-custom-department-roles.md). They are **distinct from the NIMS org-chart positions** (Incident Commander, Operations Section Chief, Rescue/Shoring Group Supervisor) assigned on the [Org Chart](31-org-chart.md) ([ADR-008](../11-decisions/ADR-008-nims-org-structure.md)). The two axes are orthogonal: a member with a read-only department role can still be the Incident Commander of an operation (gaining the per-incident IC write elevation), and a department Admin holds no special command authority at an incident — command follows ICS position. This screen never touches the org chart and never gates a fireground action — it sets data permissions only.

## What ships v4.0 (and the flagged ambiguity)

The **per-device UID + the role/permission schema + the Default + the data-driven security rules that gate writes by the looked-up permission set** ship **v4.0** ([ADR-017](../11-decisions/ADR-017-custom-department-roles.md) / [ADR-009](../11-decisions/ADR-009-database-firebase-rtdb.md)). Whether *this management UI* (the role editor + member assignment) ships v4.0 or v4.1 is **still the open roadmap question** — tracked as [`99-open-questions.md`](../99-open-questions.md) #32. The IA is identical either way; v4.0 ships the model even if the UI lands later.

## 2FA forward hook (future, out of current scope)

If/when 2FA lands, the **"require 2FA" department policy** would live here — best scoped to **Admin (and a custom role granted Manage users & roles)**, **opt-in**, and **never a field wall** (Principle 11). The 2FA *mechanism* (the sign-in challenge + personal enrollment) lives in [Login/Register](70-login-register.md) (#206) and [Settings](50-settings.md) (#202); its events are recorded in the [Audit Log](53-audit-log.md). A **forward hook only** — tracked as [`99-open-questions.md`](../99-open-questions.md) #33; not built.

## Locked cross-cutting rules this screen honors

- [x] **Admin-gated** — Admin (and a custom role granted Manage users & roles) only; the gateway in [Settings](50-settings.md) hides it from everyone else.
- [x] **Admin is the only mandated role; ≥ 1 Admin always remains** ([ADR-017](../11-decisions/ADR-017-custom-department-roles.md)) — the last Admin can't be demoted/revoked.
- [x] **Device-roles ≠ NIMS positions ≠ fireground gates** ([ADR-008](../11-decisions/ADR-008-nims-org-structure.md), [ADR-017](../11-decisions/ADR-017-custom-department-roles.md)) — back-office permissions only; the org chart and the ICS-position field gates are separate axes.
- [x] **Roles spelled out** — "Admin," a custom role's full name, never abbreviations ([`voice-and-tone.md`](../07-design-system/voice-and-tone.md)).
- [x] **Modal-vs-sheet** per the ADR-016 User Manager row: assign role / create-edit role / promote = sheet; revoke / delete-role = destructive modal.
- [x] **Reversible vs destructive** — assigning/editing is reversible (sheet, no confirm); revoke + delete-role are terminal (modal confirm) (Principle 6).
- [x] **No comms / no push** (Principle 10) — a role change is a **permission change**, not a notification.
- [x] **Phone is the floor**; **48pt non-operational targets**.
- [x] **No broadcast render.**
- [x] **Every change is audited** — create/edit/delete-role + assign/promote/revoke write events to the [Audit Log](53-audit-log.md) (D7.5), attributed to the acting Admin.

## The four-surface table (this screen)

| Dimension | Phone | Tablet | Laptop | Broadcast |
|---|---|---|---|---|
| Layout | single-column Members list; segmented to Roles | Members table + Roles beside | dense table + Roles pane + role editor | **not rendered** |
| Above fold | members + role badges | members + role column | members + activity columns | — |
| Primary-action affordance | tap member → assign-role sheet (48pt) | tap → sheet | keyboard + sheet | — |
| Added density | — | sortable column + Roles list | activity / audit columns + role editor | — |
| Does NOT render | — | — | — | **the whole screen** |

## Empty / error / loading states

(Posture set in [`00-ia-foundation.md`](00-ia-foundation.md) §Cross-cutting empty / error / loading.)

- **Empty — solo dept:** the first-run [`empty-state`](../03-primitives/empty-state.md) — "Only you so far" + a pointer to generate an invite code ([Department Setup](71-dept-setup.md) / [Invite Code Entry](72-invite-code.md)). The Roles list still shows the built-in Admin + Default.
- **Empty — guest (not connected):** points to the [Settings](50-settings.md) sign-in path (upstream-blocked variant), never a void.
- **Error:** a failed role write **queues locally** (sync indicator); the row shows its prior role until it syncs; never `alert()`.
- **Loading:** local-first — the lists render instantly; a role change shows a busy control on its commit ([`loading-state.md`](../03-primitives/loading-state.md)).

## Accessibility / screen-reader notes

**Cite [`accessibility.md`](../07-design-system/accessibility.md), do not restate.**
- Each member row announces *name · role* ("Firefighter Diaz, Default role"); the assign-role and role-editor [`sheet`](../03-primitives/sheet.md)s are focus-trapped with labeled controls (the permission [`toggle`](../03-primitives/toggle.md)s announce *label · on/off*; Power Select native `<select>` fallback for the role picker); the **revoke** / **delete-role** [`modal`](../03-primitives/modal.md) names the consequence and defaults to Cancel ([`accessibility.md`](../07-design-system/accessibility.md) §Focus & keyboard).
- Role is a labeled badge, never color alone (Principle 9); a permission toggle's state is carried by position + label, never color alone.

## Open questions (per-screen)

1. **Revoke semantics** — does revoke delete the member's UID from the dept or mark it inactive (retaining their audit trail)? Resolved with the Phase G auth workflow; the audit trail must survive either way (D7.5).
2. **Permission keys + schema shape** — the exact permission identifiers and the `/departments/{deptId}/roles/` schema are finalized with the data-layer work (Phase H) behind the `data/sync` seam ([ADR-009](../11-decisions/ADR-009-database-firebase-rtdb.md) / [ADR-017](../11-decisions/ADR-017-custom-department-roles.md)).
3. **Admin-UI ship version** — v4.0 vs v4.1 → [`99-open-questions.md`](../99-open-questions.md) #32 (the model + rules are firmly v4.0).
4. **Member export** — a CSV of members + roles (Phase I; shares the export pattern with [Inventory](40-inventory.md) / the [Audit Log](53-audit-log.md)).
5. **2FA org policy** — the "require 2FA" toggle → [`99-open-questions.md`](../99-open-questions.md) #33 (out of current scope).
