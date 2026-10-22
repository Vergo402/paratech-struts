# #251 QA brief — 30 User management (roles & members)

**Spec:** `docs/v4-design/09-workflows/30-user-management.md` · **Phase G issue:** #233 (epic #135) · drafted 2026-10-13 against HEAD 903a68e.

**Workflow in plain words.** An Admin (or anyone holding "Manage users & roles") opens Settings → Administration → Users & roles. Two views: Members (who holds which role) and Roles (what each role may do in the back office). Admin assigns a role to a member in a sheet, creates or edits roles with eight on/off permissions, and can revoke a member or delete a custom role behind a destructive confirm. The last Admin can never be demoted or revoked. None of this touches ICS positions on the fireground. Since June, #439 added server-side member provisioning: the Admin creates a member's login in-app, with a starter password the member must replace at first sign-in ("Set your password" gate). Neither ADR-017 nor the spec describes that flow; treat it as in force.

## Setup

1. Device A (`http://localhost:5200`, harness HARNESS.md): `/auth` → Create Account (Admin account) → Create department. Creator becomes the first Admin (ADR-017, Owner eliminated). Add 1 apparatus (e.g. "Engine 1") via Settings/Inventory so the rig picker has content.
2. Build members through the app's own UI (Users & roles → Members → **+ Add member**: fields Name, "Email — their sign-in", Role, Rank / title, Apparatus, Badge / ID, Phone, Certifications; button **Create account**). Create 3 members: "Dana Reyes" (role Default), "Lee Cho" (Default), "Pat Okafor" (to be given a custom role). The hand-over panel ("Account created") shows email + Starter password (`<lastname>123!`, lowercased; e.g. `reyes123!`) — record it for 30-17.
3. Second device B (`http://127.0.0.1:5200`, separate origin): sign in as one created member (Dana) using the starter password → forced to the "Set your password" gate (30-17).
4. Optionally device C/second Admin: promote Lee Cho to Admin when a second Admin is required (30-09/30-10), then demote back.
5. Phone viewport 390x844 for everything unless stated. Tablet/laptop check for 30-03.

**Routes / labels (verified in src/):**
- Entry: `/settings/administration` → group "Department" → row **Users & roles** ("Invite members, set what each role can do") → `/users`. Row only shown with manageUsers. Header "User manager", back button aria-label "Back to Settings" (goes to `/settings/account`).
- Segmented labelled "View": **Members** | **Roles**.
- Members list: row = name, sub = "rank · rig", role badge, chevron; own row shows "· you" and is not tappable; revoked rows show "Revoked" + **Reactivate**; unrotated starter shows key badge "starter". Footer "The last Admin can't be revoked or demoted". Buttons **+ Add member**, **Import CSV**. Invite code block with **Regenerate**.
- Tap a member → sheet title **Member** (role list as buttons, profile fields, **Save changes**, **Reset password to starter**, **Revoke access**).
- Roles list: **Admin** (tag "built-in"), **Default** (tag "built-in · editable"), customs; one-line summary ("Full access", "Read · field work"); **+ Create role**. Non-Admin sees "Only an Admin can create or change roles".
- Role sheet titles **Create role** / **Edit role**; field "Role name"; 8 toggles labelled: Read department data · Run field work · Create & end operations · Manage inventory & apparatus · Manage roster · Manage department settings · Manage users & roles · Export / delete data; buttons **Cancel**, **Save role**/**Create role**, **Delete role** (custom only).
- Modals: "Revoke access?" (Cancel / **Revoke access**), "Delete role?" (Cancel / **Delete role**), "Reset <name>'s password?" (Cancel / **Reset password**), "Regenerate invite code?".

## Criteria

| ID | Criterion (observable outcome) | Tag | Spec § | How to drive / what to read |
|---|---|---|---|---|
| 30-01 | Admin reaches User manager via Settings → Administration → "Users & roles"; header reads "User manager"; back button returns to Settings. | Testable | Preconditions | From `/settings/administration` tap the row; read h1; tap back. |
| 30-02 | Screen shows a "View" segmented with Members and Roles; Members is the default on phone; switching swaps lists; selected option exposed to AT (aria selected/checked). | Testable | Step 1, a11y | Read tree: segmented group label "View", selected state. Spec's SR phrase "Members, selected" is a fixed copy claim; record actual. |
| 30-03 | On tablet/laptop widths Members and Roles show side by side (spec: both visible). | Testable (QA records NOT-BUILT if only one face shows) | Step 1 | Resize 1024x768; code shows one face at a time. |
| 30-04 | Members list: each member row shows name and a role badge (Admin / Default / custom name); own row marked "· you" and not tappable; creator shows Admin. | Testable | Step 1 | Read rows. Spec heading "Members (8)" count is not in build; record. |
| 30-05 | Roles list shows Admin tagged "built-in", Default tagged "built-in · editable", custom roles untagged, each with a permission summary line. | Testable | Step 3 | Roles view. |
| 30-06 | Tapping a member opens a sheet listing every role; the current role is checked and disabled; tapping another role reassigns without a confirm modal; the list badge updates. | Testable | Step 2 | Tap Dana → pick a custom role; read badge. |
| 30-07 | Role assignment is reversible: re-pick the previous role, badge returns; no timed undo. | Testable | Reversibility | Reassign back. |
| 30-08 | Promote to Admin works through the same sheet (pick "Admin"); no separate "Promote to Admin" button exists, so the spec's PromoteSheet is folded into assign. | Testable | Step 2 | Pick Admin for Lee; badge Admin. Record the folded flow as a note, not a FAIL. |
| 30-09 | Demote an Admin via re-assign works while a second Admin exists. | Testable | Reversibility | With Lee as Admin, reassign Lee to Default as the other Admin. |
| 30-10 | Anti-lockout: with exactly one active Admin, opening that Admin's sheet shows non-Admin role choices disabled with reason "Promote another member to Admin first", and Revoke access is disabled with the same reason; not a silent no-op. | Testable | Step 4, anti-lockout | Single-Admin dept: own row is not tappable, so first make Lee Admin, sign in as Lee, or inspect Admin A's sheet from Lee. Also read the footer line. Spec's exact copy ("This is the only Admin — promote someone else first") differs; record actual. |
| 30-11 | An Admin cannot demote or revoke themself ("Another Admin must make this change"); own row has no sheet. | Testable | Anti-lockout | Own row non-interactive; with 2 Admins check own-row behavior. Code: SELF_ADMIN_REASON. |
| 30-12 | Anti-lockout is also enforced server-side: a direct DB write removing the last Admin's role is denied. | Testable | Step 4 (rules) | Optional: REST/SDK write as that Admin on emulator, expect PERMISSION_DENIED. Rules unit tests exist (`npm run test:rules`), not a substitute. |
| 30-13 | Create role: **+ Create role** opens sheet "Create role" with name field + the 8 toggles, labelled as listed above, all off for a new role (record actual defaults); saving adds the role to the list with the correct summary. | Testable | Step 3 | Name "Crew Lead", enable Read + Run field work + Create & end operations; check list summary. Toggle labels differ from spec: "Manage roster" (spec "Manage roster / accountability"), "Export / delete data" (spec "Export / delete dept data"). Not a FAIL; copy drift. |
| 30-14 | Each toggle is operable by keyboard/AT with a visible on/off thumb state, not color alone; exposes role=switch/checked with its label. | Testable | Step 3, a11y | read_page on the sheet; screenshot on and off. |
| 30-15 | Edit role: tap a custom role → "Edit role" sheet prefilled; flipping a toggle and **Save role** updates the summary; **Cancel** discards. | Testable | Step 3 | Edit then Cancel path, then Save path. |
| 30-16 | Default role is editable but its name field is disabled; Admin role is not tappable (fixed, all eight). | Testable | Step 3 | Tap Default (name disabled); Admin row has no chevron. |
| 30-17 | Role change takes effect for the affected member on next sync, silently (no notification): member on device B loses/gains the matching UI (e.g. Users & roles row vanishes when manageUsers removed; hide-not-grey). | Testable | Cross-surface | Device B signed in as Dana; Admin A assigns/edit role; B updates without a banner/toast. |
| 30-18 | A non-manageUsers member does not see "Users & roles" in Administration; direct nav to `/users` shows empty state "Admin access only" with "Back to Settings". | Testable | Role gate | Device B as Default member: open `/settings/administration`, then `location.assign('/users')`. |
| 30-19 | A custom role holding "Manage users & roles" (non-Admin) can open User manager and add/revoke/assign non-Admin members, but Roles view is read-only ("Only an Admin can create or change roles") and cannot grant Admin. | Testable | Role gate (spec: custom role w/ Manage users & roles) | Superseded in part: build is stricter than spec, see Superseded list. Drive and record. |
| 30-20 | Revoke: member sheet → **Revoke access** opens destructive modal "Revoke access?" with Cancel (default focus) and **Revoke access**; text states the member loses access immediately and the record stays. | Testable | Step 4 | Read modal; check focus lands on Cancel; spec title "Revoke Lt. Cho's access?" differs (build names the member in the body, title generic). |
| 30-21 | Cancel in the revoke modal changes nothing; Revoke access marks the member "Revoked" (row dimmed with Reactivate), not deleted. | Testable | Step 4, OQ1 | Do both. OQ1 resolved in build: mark inactive, not delete. |
| 30-22 | A revoked member's device loses access (signed out / write denied) on sync; their earlier actions remain in the Audit Log attributed to them. | Testable | Step 4, cross-surface | Device B as revoked member; Admin opens Audit Log (`/audit-log`) and finds their earlier entries. |
| 30-23 | Revoke is reversible in build via **Reactivate** (spec says terminal, re-invite). | Superseded: see list | Reversibility | Tap Reactivate; row returns active. Record as drift, behavior is Testable. |
| 30-24 | Delete custom role: Edit role sheet → **Delete role** → destructive modal "Delete role?" (Cancel default) stating holders move to Default; confirm removes the role and the affected member's badge becomes Default. | Testable | Step 4 | Give Pat the custom role, delete it, read Pat's badge. Delete is absent for Admin and Default. |
| 30-25 | Failed governance writes (e.g. offline) show an inline alert in the modal/sheet and the modal stays open; no false success. | Testable | #426 (build) | Go offline per HARNESS, attempt revoke; read `role="alert"`. |
| 30-26 | Add member (#439): **+ Add member** → fill Name + Email → **Create account** (disabled with reason "Enter at least a name and email" until filled) → "Account created" panel with email and Starter password; new row appears with "starter" key badge. | Testable | #439 (net-new) | Drive. Starter format `<lastname>123!`. |
| 30-27 | New member signs in with the starter password and is forced to **Set your password** (fields Starter password / New password / Confirm new password, button "Save and continue") before reaching the app; mismatch and same-as-starter produce inline errors; after success the "starter" badge disappears from the Admin's list. | Testable | #439 | Device B sign-in; Admin A refreshes list. |
| 30-28 | **Reset password to starter** (member sheet) → destructive modal "Reset <name>'s password?" showing the starter; confirm returns the key badge and signs the member out. | Testable | #439 | Drive; check device B signed out. |
| 30-29 | Invite code block: shows current code; **Regenerate** → destructive modal; after confirm a new code shows and the old code no longer joins. | Testable | #232/#423 (build) | Join attempt with old code from a fresh origin. |
| 30-30 | Touch targets on this screen are ≥ 44px (spec says 48pt non-operational): member rows, role rows, toggles, modal buttons, back button. | Testable | Role gate/targets | Measure bounding boxes via JS at 390x844. Code CSS lists min-height 48px; 40px at admin.css:288, check what it is. |
| 30-31 | The screen never alters the Org Chart or fireground gating: a member holding a read-only custom role can still be assigned Incident Commander on an operation and perform the IC's actions (orthogonal axes). | Testable | Orthogonal-axes | Needs an operation; assign Pat (custom role with only Read) as IC via Command → org chart; confirm IC actions work. |
| 30-32 | Role/member changes appear in the Audit Log (administrative view) attributed to the acting Admin. | Testable | Cross-surface | `/audit-log` as Admin after steps above; Settings row text "Incident and governance record". |
| 30-33 | Other Admins' devices show updated Members/Roles lists after sync. | Testable | Cross-surface | Second Admin device; list refresh after A's change (may need pull-to-refresh/reopen, see Risks). |

## Superseded / Deferred

- **Create-role "Manage roster / accountability" and "Export / delete dept data" labels** → build uses "Manage roster", "Export / delete data" (copy drift, `permissionSummary.ts`). Treat as SPEC-DRIFT if QA flags it.
- **Spec "Revoke is terminal, re-invite to restore"** → Superseded by build behavior: revoked member row stays, marked "Revoked", **Reactivate** (resolves spec OQ1: mark inactive, never delete UID; audit trail survives). Criterion 30-23 covers it. Source: `UserManagerScreen.tsx` (#426 follow-up); no ADR number found.
- **Spec "UI may ship v4.0 or v4.1"** → Superseded by `99-open-questions.md` #32 (Resolved, ships v4.0; Alex 2026-06-22). Everything above is Testable accordingly.
- **Spec role gate "Admin or custom role with Manage users & roles can do everything"** → Superseded by J257-S4/S7 / #463 (Security audit 257): role authoring, granting Admin, credential custody (email change, password reset) are Admin-only; a non-Admin manageUsers holder gets add/revoke/assign of non-Admin members only. 30-19 and 30-28 read accordingly.
- **Separate "Promote to Admin" sheet** → folded into assign sheet (build); not a defect.
- **Member list CSV export** (spec OQ4) → no export in build; **Import CSV** (bulk add, #439) exists instead. Not tested here beyond presence; covered by personnel-import QA if any.
- **2FA org policy** (spec OQ5, `99-open-questions.md` #33) → Deferred, not built in v4.0.
- **Broadcast render** → N/A; broadcast surface itself deferred (#496). Nothing to drive.
- **Tamper-proof rules for role/membership writes** → Deferred (#512 [v4.1], ADR-042; also #520 gate on R1–R3). Not tested.
- **#509** (batchId reuse can void a batch) → v4.1, out of scope.
- **Switch/leave/delete department in-app** → Won't-fix (memory: do not re-propose); not in this spec.

## Risks for the QA agent

- A single-Admin department makes the creator's own row non-interactive. To see anti-lockout reasons, sign in as a second user (Admin or manageUsers holder) and open the sole Admin's sheet; otherwise you cannot reach 30-10.
- Role changes propagate through a roles/members listener plus an explicit `refresh()` for the acting device; another device may need a moment or a revisit of the screen. Record sync delay, not as FAIL unless it never arrives.
- Member sign-in uses the emulator Auth; `@example.test` emails only. Never repeat passwords in the report (starter format is derived from the surname, record only that it matched the pattern).
- New members are forced through "Set your password" before anything else renders; that is the #439 gate, not a stuck app.
- Toggle labels and modal titles will not match the spec's wireframe text exactly (see Superseded). Judge the behavior; log copy diffs once as SPEC-DRIFT.
- Settings row is labelled "Users & roles" in Administration but the screen title is "User manager"; both are correct.
- The Revoke modal text names the member in body copy, not the title; Cancel is the default-focused button via `data-modal-cancel`.
- Sheet scrim-close may need reload (HARNESS). `/users` direct navigation via `location.assign`.

## Orchestrator addendum (2026-10-21, HEAD 5cb1bbd)
- **Functions emulator required for this spec.** The #439 provisioning flow ("+ Add member" → Create account, "Set your password" gate) calls Cloud Functions; in emulator mode the app connects to `127.0.0.1:5001` (`src/data/functions/firebase.ts:18`). `npm run emulators` starts only auth + database, so start the emulators for this pass with:
  `PATH=/opt/homebrew/opt/openjdk/bin:$PATH npx firebase emulators:start --only auth,database,functions --project fieldshore-database`
  (`functions/lib/` is already built; if the functions emulator fails to load, run `npm --prefix functions run build` first, read-only otherwise). Confirm port 5001 is listening before driving 30-1x. If provisioning still cannot run on the harness, give the closest verdict and say exactly why in Proof — do not mark NOT-BUILT.
- Positions follow the account (552faca). Admin = department ROLE (ADR-017); the last-Admin anti-lockout is in force. A role change made on one device may not reach an already-signed-in device until a fresh sign-in (seen in spec 25; record what you see, cite 25/REPORT.md).
- Known filed today: #552 (manageSettings role can edit checklists). If Users & roles shows the same class of gap (a custom role reaching Admin-only screens), cite #552 and file nothing new.
