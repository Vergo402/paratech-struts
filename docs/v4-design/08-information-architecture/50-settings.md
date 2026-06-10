# IA Spec: Settings

> Phase F information-architecture spec. Cites [`00-ia-foundation.md`](00-ia-foundation.md) for all cross-cutting rules (tab map, navigation, modal-vs-sheet row, four-surface framework, persistent chrome) and does not re-derive them.
> Source: the [`00-ia-foundation.md`](00-ia-foundation.md) tab map **Settings** row (themes · the Build-A/Build-C dept-choice toggle, C disabled "Coming with mobile app" · Native Controls · dept registration entry) + modal-vs-sheet **Settings** row (toggles commit in place; delete/leave dept = destructive modal, 48pt non-operational targets); [`06-synthesis.md`](../06-synthesis.md) §1.7 (Build A vs Build C) + [ADR-009](../11-decisions/ADR-009-database-firebase-rtdb.md); the custom-role model ([ADR-017](../11-decisions/ADR-017-custom-department-roles.md): Admin + an editable Default + department-defined roles); [ADR-011](../11-decisions/ADR-011-color-token-system.md) (themes), [ADR-008](../11-decisions/ADR-008-nims-org-structure.md), [ADR-014](../11-decisions/ADR-014-tab-structure.md)/[015](../11-decisions/ADR-015-navigation-pattern.md)/[016](../11-decisions/ADR-016-modal-vs-sheet-rules.md). Grounded in the v3 Settings tab (`index.html` screenSettings): `connectDepartment()` (app.js:2759), `saveSettings()` (7855), `setTheme()` (7894), `renderApparatusTypesList()` (3445) / `addCustomApparatusType()` (3108), `manualCheckForUpdates()` (1874), `exportInventory()` (7906) / `handleImport()` (7992) / `downloadTemplate()` (8033), `openFeedbackModal()` (3722) / `submitFeedback()` (3738), `logOut()`. **Largely a v3 carry-forward + the v4 additions (Build choice, Native Controls, role/registration, admin gateways).** GitHub [#202](https://github.com/Vergo402/paratech-struts/issues/202).

---

## Purpose

The app's **configuration home**: appearance, the department connection + registration + this device's role, the sync-build choice, the accessibility (Native Controls) fallback, data management, feedback, reference materials, and the gateways to administration (User Manager) and the Audit Log. The one tab that is setup/config, not field work.

## Where it lives

- **Tab / parent:** **Settings** — the fifth bottom-nav tab home (per the [tab map](00-ia-foundation.md), [ADR-014](../11-decisions/ADR-014-tab-structure.md)); nothing nests *as a tab* beneath it, but it holds the forward routes to the pre-shell auth screens and the admin screens.
- **How it is reached:** the Settings bottom-nav tab; and it is the **forward destination of the guest-mode "Sign in to sync" path** — a guest reaches [Login/Register](https://github.com/Vergo402/paratech-struts/issues/206), [Department Setup](https://github.com/Vergo402/paratech-struts/issues/207), and [Invite Code](https://github.com/Vergo402/paratech-struts/issues/208) *from here*, never as a cold-open gate ([`00-ia-foundation.md`](00-ia-foundation.md) §Navigation / guest-first, [ADR-015](../11-decisions/ADR-015-navigation-pattern.md)).
- **Issue:** [#202](https://github.com/Vergo402/paratech-struts/issues/202).

## Primary role(s) and surface(s)

- **Primary role(s):** **any user** (everyday config — appearance, sync, accessibility, updates, feedback, reference); **Admin** (and custom roles granted the matching back-office permission) additionally see the admin gateways (User Manager, Cross-Dept Invite) and the **Department policies** group — the custom-role model ([ADR-017](../11-decisions/ADR-017-custom-department-roles.md)), device roles spelled out. **Who sees what is the [§Settings by context](#settings-by-context) matrix** (guest / member / Admin).
- **Primary surface(s):** **phone is the floor** — but Settings is a **non-operational surface**, so its targets are the **48pt** non-operational size, not the 56pt operational floor ([`spacing-grid.md`](../07-design-system/spacing-grid.md); the ADR-016 Settings row). Tablet/laptop add two-column density + keyboard-friendly forms. **Broadcast does not render Settings** (it is config, never a cast board).

## Information hierarchy (above / below fold) — per surface

### Phone (the floor)
- **Above fold:** **Appearance** (theme); **Department** (connection / registration + this device's role); **Sync** (the Build A / Build C choice).
- **Below fold:** **Accessibility** (Native Controls); **Data Management** (Excel/CSV export / import / template); **Apparatus Types**; **App Updates**; **Feedback**; **Reference Materials**; the **Administration gateways** (role-gated) + the **Department policies** group (Admin-only); **Log Out**. *(Which of these actually render for the current user is the [§Settings by context](#settings-by-context) matrix.)*

### Tablet / laptop
- **Above fold:** settings groups in two columns; the Excel data-management flows + forms foregrounded and keyboard-friendly.

### Broadcast TV
- **Not rendered.** Settings is a configuration surface; a cast device never projects it.

## Primary action + secondary actions

- **Primary action (one — Principle 4):** **change a setting** — most **commit in place** (theme, Native Controls, the Build choice) the moment they're toggled, immediate + reversible (Principle 6; the ADR-016 Settings row).
- **Secondary actions:** department registration (forward routes to auth); data management (Excel); feedback; check for updates; the admin gateways.
- **Destructive / terminal:** **Log Out** and **Leave / Delete Department** raise a destructive [`modal`](../03-primitives/modal.md) (default-Cancel, 48pt non-operational targets — the ADR-016 Settings row); an Excel **import that would orphan deployed struts** raises the shared orphan-confirm [`modal`](../03-primitives/modal.md) ([40-inventory.md](40-inventory.md)).

## Composed primitives

- [x] [segmented](../03-primitives/segmented.md) — **theme** (System / Light / Dark — the v3 `.theme-toggle` → the value variant); the **Build A / Build C** choice (a value segmented with **Build C disabled**, labeled "Coming with mobile app").
- [x] [toggle](../03-primitives/toggle.md) — **Native Controls** (immediate + reversible per Principle 6); the **Department policies** switches (after-action auto-email, [ADR-018](../11-decisions/ADR-018-after-action-auto-email.md)); other binary preferences. No new primitive — the after-action policy is the existing form-toggle.
- [x] [input](../03-primitives/input.md) — Department ID / name fields; the feedback description; apparatus-type name entry.
- [x] [button](../03-primitives/button.md) — Connect / Save department; Export / Import / Download Template; Check for Updates; Feedback; the admin-gateway links; Log Out.
- [x] [list](../03-primitives/list.md) — the settings groups; the apparatus-types list; the reference-material links.
- [x] [sheet](../03-primitives/sheet.md) — **Feedback** (the v3 modal re-homes to a sheet per [ADR-016](../11-decisions/ADR-016-modal-vs-sheet-rules.md)); the apparatus-type add.
- [x] [modal](../03-primitives/modal.md) — **Log Out** / **Leave-or-Delete Department** (destructive); the Excel **import orphan-confirm**; import parse-failure blocking alert.
- [x] [badge](../03-primitives/badge.md) — this device's **role** (Admin / Default / a department-defined role); the app **version**; a "guest / connected" indicator.
- [x] [loading-state](../03-primitives/loading-state.md) — the Excel import/export determinate progress (a legitimate wait).
- [ ] picker · card · slider · toast · empty-state · warning-gate · nested-checklist — not core (the dept-registration sub-forms are the **pre-shell auth routes**, not overlays).

> **A new primitive would be a gate escalation, not a spec decision.**

## The settings groups

1. **Appearance** — theme: **System / Light / Dark** (the authored themes, [ADR-011](../11-decisions/ADR-011-color-token-system.md)). **Sunlight auto-activates at ≥ 10,000 lux** with a manual override ([`color.md`](../07-design-system/color.md)); **broadcast is a cast/display mode, not a user theme pick.** So the user-facing control is the three base themes; sunlight is automatic-with-override; broadcast does not appear as a choice.
2. **Department** — connection (Dept ID / name, faithful to v3 `connectDepartment` / `saveSettings`) + the **registration entry** forwarding to [Login/Register](https://github.com/Vergo402/paratech-struts/issues/206) / [Department Setup](https://github.com/Vergo402/paratech-struts/issues/207) / [Invite Code](https://github.com/Vergo402/paratech-struts/issues/208) (guest-first — reached forward, never a gate); **this device's role** shown as a [`badge`](../03-primitives/badge.md) — this is the **back-office department role** (Admin / Default / a department-defined role, [ADR-017](../11-decisions/ADR-017-custom-department-roles.md)), **not** the device's ICS position in an operation (the two axes are orthogonal — [User Manager](https://github.com/Vergo402/paratech-struts/issues/209) §the-load-bearing-distinction). This dept role is what gates the rest of this screen (see [§Settings by context](#settings-by-context)); **Leave / Delete Department = destructive [`modal`](../03-primitives/modal.md)**.
3. **Sync (Build choice)** — the **Build A / Build C** [`segmented`](../03-primitives/segmented.md): **Build A** (multi-device local-first queue + batch reconcile — ships v4.0, the default) is selectable; **Build C** (a Command-Post hub with a real-time WebSocket relay) is **disabled, labeled "Coming with mobile app"** — it ships at v5.0 with React Native because a PWA cannot host a local WebSocket relay ([`06-synthesis.md`](../06-synthesis.md) §1.7, [ADR-009](../11-decisions/ADR-009-database-firebase-rtdb.md)). The toggle is **visible-but-disabled** so the roadmap is honest, not hidden.
4. **Accessibility — Native Controls** ([`toggle`](../03-primitives/toggle.md)): ON makes every picker render as the OS-native `<select>` (the **Power Select** fallback); it **auto-enables under VoiceOver / TalkBack** ([`accessibility.md`](../07-design-system/accessibility.md); the picker doctrine in [`picker.md`](../03-primitives/picker.md)).
5. **Data Management** — **Export / Import / Download Template** — the **one** Excel/CSV implementation, shared with [Inventory](40-inventory.md) and reached from both (the full 10-column schema + Flatfile-style validated import + xlsx/csv round-trip specified there, [#307](https://github.com/Vergo402/paratech-struts/issues/307) — **resolves [OQ2](#open-questions-per-screen)**: one implementation, not two). **Per-action gating:** **Download Template** + **Export** are open to **any connected member** (read-only actions — the Default role's Read covers them); **Import** mutates department stock → **Admin / Manage-inventory-&-apparatus** only ([ADR-017](../11-decisions/ADR-017-custom-department-roles.md)). The shared **orphan-confirm modal** + determinate loader protect deployed references on import.
6. **Apparatus Types** — manage the custom apparatus-type vocabulary (faithful to v3 `renderApparatusTypesList` / `addCustomApparatusType`; NIMS terms, [ADR-008](../11-decisions/ADR-008-nims-org-structure.md)). **This resolves [40-inventory.md](40-inventory.md) OQ3: the apparatus-type *vocabulary* is edited here; Inventory's Add Apparatus *consumes* the set, it does not edit it.** **Gating: read is always on** — every connected member can *view* the list (they need the available types when adding apparatus) — but **add / rename / delete is Admin / Manage-inventory-&-apparatus** only ([ADR-017](../11-decisions/ADR-017-custom-department-roles.md)).
7. **App Updates** — **Check for Updates** (faithful to v3 `manualCheckForUpdates`; the service-worker update flow).
8. **Feedback** — category + description → Firebase (faithful to v3 `submitFeedback`); a [`sheet`](../03-primitives/sheet.md).
9. **Reference Materials** — static doctrine links (USACE Shoring Operations Guide, FEMA US&R), faithful to v3.
10. **Administration** — the **gateway links** (navigate elsewhere; this group never holds behavioral toggles — those live in §11). Three gateways, **three different gating rules** (this **resolves [OQ4](#open-questions-per-screen)** and reconciles the [Audit Log](https://github.com/Vergo402/paratech-struts/issues/211) §gateway-gating handoff):
    - **[User Manager](https://github.com/Vergo402/paratech-struts/issues/209)** — a **back-office admin feature**: **hidden** from anyone who isn't Admin or granted Manage-users-&-roles. Hidden, not greyed — there is nothing to tap and nothing to wonder about.
    - **[Cross-Dept Invite](https://github.com/Vergo402/paratech-struts/issues/210)** — **hidden** from non-Admins; for an Admin it is **visible and active** (mutual-aid incident sharing **ships v4.0** per [ADR-022](../11-decisions/ADR-022-mutual-aid-v40-qr-guest.md) — pulled forward from the earlier v4.5 deferral).
    - **[Audit Log](https://github.com/Vergo402/paratech-struts/issues/211)** — the one that is **visible to every connected member**, because it is a **department/command record, not an admin feature** — but access is **ICS-position-checked at entry**: tapping in when this device is not assigned **Incident Commander or Operations Section Chief** in an active (or just-closed) operation lands on a **locked state with a plain reason** ("Access requires Incident Commander or Operations Section Chief assignment in an active operation"), never a dead end (#217; consistent with [53-audit-log.md](53-audit-log.md) §Primary-role). This is the one gateway where the **lock is visible** rather than the gateway hidden — the record exists for two specific ICS positions, not for a back-office role.

    | Gateway | Guest (no dept) | Default / custom member | Admin |
    |---|---|---|---|
    | User Manager | — | **hidden** | visible + active |
    | Cross-Dept Invite | — | **hidden** | visible + active (v4.0, ADR-022) |
    | Audit Log | — | **visible, ICS-position-checked at entry** | **visible, ICS-position-checked at entry** |
    | Department policies (§11) | — | **hidden** | visible |

11. **Department policies (Admin-only)** — department-wide **behavioral toggles** (how the app *acts* for the whole department), distinct from §10's navigation gateways. The whole group is **hidden** from anyone who isn't Admin / Manage-department-settings (the hide-not-grey rule).
    - **After-action auto-email** ([`toggle`](../03-primitives/toggle.md)) — **on by default, department-disableable** (the Principle 5 safe default: the commanders get the record; a department with its own records/PII policy can turn it off). When on, completing an incident (End Operation) emails the assembled after-action packet to the Incident Commander / Operations Section Chief. This is the toggle whose **placement [ADR-018](../11-decisions/ADR-018-after-action-auto-email.md) deferred to this pass** ([#305](https://github.com/Vergo402/paratech-struts/issues/305) / [#308](https://github.com/Vergo402/paratech-struts/issues/308)); the email **transport** is Phase H ([`99-open-questions.md`](../99-open-questions.md) #35). Per ADR-018 this is a **Principle 10 scope clarification** (an after-action record read *later* is documentation, not communication) — **not** an in-app-comms feature.
    - The group is **extensible** — future department-wide policies (e.g. the "require 2FA" hook, [`99-open-questions.md`](../99-open-questions.md) #33) land here without reworking §10.

12. **Log Out** — destructive/terminal [`modal`](../03-primitives/modal.md).

## Settings by context

Settings is the one screen whose **contents change with who's looking** — three primary contexts, each a different screen. The rule throughout is **hide, don't grey** (an absent group is simply not for this role; there is nothing to tap and nothing to wonder about) — with the single deliberate exception of the **Audit Log gateway**, which stays *visible* and shows a *locked state* on entry because it is a command record, not a back-office feature.

**Guest (no department connected):**
- Sees: **Appearance · Sync · Accessibility · App Updates · Feedback · Reference Materials**.
- **Department** group shows the forward **"Sign in to sync"** path to [Login/Register](https://github.com/Vergo402/paratech-struts/issues/206) / [Department Setup](https://github.com/Vergo402/paratech-struts/issues/207) / [Invite Code](https://github.com/Vergo402/paratech-struts/issues/208) (guest-first — reached forward, never a wall).
- **Not shown:** Data Management + Apparatus Types (no department = no inventory to manage), Administration, Department policies.

**Connected — Default / custom member:**
- Sees every group **except** Administration's **User Manager** and **Cross-Dept Invite** (hidden) and the whole **Department policies** group (hidden).
- **Apparatus Types:** view-only (add / rename / delete gated to Admin / Manage-inventory).
- **Data Management:** **Export + Download Template** available; **Import** gated to Admin / Manage-inventory.
- **Administration:** the **Audit Log** gateway is visible and **ICS-position-checked at entry** (opens for an Incident Commander / Operations Section Chief; otherwise the locked state with its reason).
- *(A custom role carrying a back-office permission — e.g. Manage-users-&-roles — sees the matching gateway/group; the permission, not the role name, is what gates.)*

**Admin:**
- Sees **everything**. Administration shows all three gateways: **User Manager** (active), **Cross-Dept Invite** (active, v4.0 — ADR-022), **Audit Log** (still ICS-position-checked — being Admin does **not** grant command-record access; that follows ICS position, the orthogonal axis).
- **Department policies** group visible + editable (the after-action auto-email toggle).
- **Apparatus Types** fully editable; **Data Management** full (Export + Import + Template).

The two gating axes never cross: the **department role** (back-office, [ADR-017](../11-decisions/ADR-017-custom-department-roles.md)) decides which *admin/config* surfaces render; the **ICS position** ([ADR-008](../11-decisions/ADR-008-nims-org-structure.md)) alone decides Audit Log entry. An Admin with no command assignment still can't read the Audit Log; a non-Admin Incident Commander can.

## Locked cross-cutting rules this screen honors

- [x] **Phone is the floor** — every setting is reachable phone-only.
- [x] **Non-operational tap geometry** — **48pt** targets (Settings is not field work), the documented exception to the 56pt operational floor ([`spacing-grid.md`](../07-design-system/spacing-grid.md); ADR-016 Settings row).
- [x] **Guest-first** — auth/registration is reached **forward** from here, never a cold-open wall ([ADR-015](../11-decisions/ADR-015-navigation-pattern.md)).
- [x] **NIMS terminology** — apparatus types + device roles spelled out ([ADR-008](../11-decisions/ADR-008-nims-org-structure.md), [`voice-and-tone.md`](../07-design-system/voice-and-tone.md)).
- [x] **Reversible settings never confirm** — theme / Native Controls / Build choice commit in place (Principle 6); only **Log Out / Leave-Delete Dept** confirm (destructive [`modal`](../03-primitives/modal.md)).
- [x] **No silent data loss** — the Excel import orphan-confirm protects deployed references (the v3.5.2 transaction-sanity lesson; [40-inventory.md](40-inventory.md)).
- [x] **Modal-vs-sheet** per the ADR-016 Settings row: toggles/segmented in place; feedback/apparatus-add = sheet; destructive = modal; dept registration = pre-shell routes.
- [x] **Honest roadmap** — Build C is visible-but-disabled, not hidden (Principle 11 / [`voice-and-tone.md`](../07-design-system/voice-and-tone.md)).
- [x] **Hide-not-grey for role-gated surfaces** — a group/gateway a role can't use is **absent**, not greyed (User Manager, Cross-Dept Invite, Department policies), so there's nothing to tap and nothing to wonder about. The **single exception is the Audit Log gateway**: it stays **visible with a locked entry state** because it is a command record gated by **ICS position**, not a back-office role (see [§Settings by context](#settings-by-context) / [53-audit-log.md](53-audit-log.md)).
- [x] **Two orthogonal gating axes** — back-office **department role** ([ADR-017](../11-decisions/ADR-017-custom-department-roles.md)) gates the admin/config surfaces; **ICS position** ([ADR-008](../11-decisions/ADR-008-nims-org-structure.md)) alone gates Audit Log entry; being Admin grants no command-record access.
- [x] **Capacity demoted** — N/A here.

## The four-surface table (this screen)

| Dimension | Phone | Tablet | Laptop | Broadcast |
|---|---|---|---|---|
| Layout | single-column setting groups | two-column groups | two-column + keyboard forms | **not rendered** |
| Above fold | Appearance · Department · Sync | the same, two-up | same + Excel foregrounded | — |
| Primary-action affordance | toggle/segmented in place (48pt) | in place | in place + keyboard | — |
| Added density | — | two-column | keyboard-first Excel + forms | — |
| Does NOT render | — | — | — | **the whole screen** |

## Empty / error / loading states

(Posture set in [`00-ia-foundation.md`](00-ia-foundation.md) §Cross-cutting empty / error / loading.)

- **Empty — guest (not connected to a department):** not a void — the **Department** group shows the forward "Sign in to sync" path to [Login/Register](https://github.com/Vergo402/paratech-struts/issues/206) etc. (guest-first, never a wall).
- **Error:** Excel import parse failure → a blocking-alert [`modal`](../03-primitives/modal.md) with the reason; inline [`input.md`](../03-primitives/input.md) validation on the dept fields; feedback submit failure resolves inline; never `alert()`.
- **Loading:** instant for local settings; **determinate progress** only for the Excel round-trip ([`loading-state.md`](../03-primitives/loading-state.md)); a dept connect/auth call shows a busy control on its button.

## Accessibility / screen-reader notes

**Cite [`accessibility.md`](../07-design-system/accessibility.md), do not restate.**
- The theme/Build segmented + the Native Controls toggle announce per the registry ([`accessibility.md`](../07-design-system/accessibility.md) §Screen-reader scripts); a **disabled** Build C announces its disabled state + the "Coming with mobile app" reason, not just greyed pixels (Principle 9).
- **Native Controls** is itself the accessibility fallback control — and it auto-engages under VoiceOver/TalkBack regardless of its stored value ([`accessibility.md`](../07-design-system/accessibility.md) §Power Select).
- Destructive modals (Log Out / Leave-Delete Dept, import orphan) trap focus + name the consequence ([`accessibility.md`](../07-design-system/accessibility.md) §Focus & keyboard); 48pt non-operational targets still meet the AA target-size floor.

## Open questions (per-screen)

1. **Theme taxonomy in the control** — the user-facing picker is System / Light / Dark with sunlight auto-at-lux + manual override and broadcast excluded (per [`color.md`](../07-design-system/color.md)); the **manual sunlight-override affordance remains a Phase H slice detail** (geometry of the override control), the standing geometry-deferral class.
2. **~~Data-management single implementation~~ — RESOLVED (#308).** One shared Excel/CSV implementation, reached from both Settings and [Inventory](40-inventory.md), specified in [40-inventory.md](40-inventory.md) §Excel/CSV import-export ([#307](https://github.com/Vergo402/paratech-struts/issues/307); see §Data Management above). Build details (the column-mapper component) are the Phase H tooling decision tracked in [`99-open-questions.md`](../99-open-questions.md) #36.
3. **Department-registration sub-flow** — exactly where the boundary sits between an in-Settings sheet and the **pre-shell auth routes** ([#206](https://github.com/Vergo402/paratech-struts/issues/206)/[#207](https://github.com/Vergo402/paratech-struts/issues/207)/[#208](https://github.com/Vergo402/paratech-struts/issues/208)) is resolved with the auth specs (done in Session 6).
4. **~~Admin-gateway visibility by role~~ — RESOLVED (#308).** Specified in [§Administration](#the-settings-groups) (the gating matrix) and [§Settings by context](#settings-by-context): User Manager + Cross-Dept Invite + Department policies are **hidden** off-role; the **Audit Log** gateway is **visible to all but ICS-position-checked at entry** (IC / Operations, #217). The two axes — back-office role ([ADR-017](../11-decisions/ADR-017-custom-department-roles.md)) vs. ICS position ([ADR-008](../11-decisions/ADR-008-nims-org-structure.md)) — never cross.
