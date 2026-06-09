# FieldShore — Project Guide

## What This Is

A PWA for USAR/FEMA firefighters to select Paratech rescue struts by measurement, manage inventory across apparatus, and run shoring operations with ICS/NIMS command structure. Built for field use on mobile — works offline.

**Live:** https://vergo402.github.io/paratech-struts/

---

## Architecture

- **3-file split** (refactored from single-file in v2.0.1):
  - `index.html` (~770 lines) — HTML shell, modals, forms
  - `app.js` (~8,800 lines) — All application logic, constants, Firebase integration
  - `style.css` (~2,200 lines) — All styles
- **Service worker:** `sw.js` — offline caching with stale-while-revalidate
- **Backend:** Firebase Realtime Database (compat SDK v9.23.0) — project `paratech-c3ab4`
- **Hosting:** GitHub Pages (auto-deploys on push to `main`)
- **No build step.** Edit files, push, done.

### Key Files

| File | Purpose |
|------|---------|
| `index.html` | HTML shell — header, nav, modals, forms |
| `app.js` | All JS logic, constants, Firebase calls |
| `style.css` | All CSS styles |
| `sw.js` | Service worker — update `CACHE_NAME` on every release |
| `manifest.json` | PWA manifest |

### Remote

| Name | Repo | Purpose |
|------|------|---------|
| `origin` | `Vergo402/paratech-struts` | Single repo (SSH) |

Uses SSH authentication. Branching workflow: `main` = production, feature branches for new work.

**Push on commit (standing rule, 2026-06-07):** whenever you commit, push to the same branch in the same step — do not ask separately about pushing. (Commit only when Alex asks; but a commit implies its push.) Never commit or push to `main` outside the release/merge process.

---

## GitHub Project — Status Tracking

There are **two separate project boards**. Always use the one that matches the branch being worked on:

| Board | Project # | URL | Used for |
|-------|-----------|-----|----------|
| FieldShore Roadmap (v3) | `1` | https://github.com/users/Vergo402/projects/1 | v3 issues — bugs, features, releases on `main` |
| v4 Redesign Roadmap | `2` | https://github.com/users/Vergo402/projects/2 | v4 issues — all work on `v4-redesign` branch |

When starting work on any GitHub issue (whether via `/plan`, `/v4-plan`, or ad-hoc), set its Project Status to **In Progress** using the correct board:

```bash
# v3 issue (project 1)
gh project item-list 1 --owner Vergo402 --limit 200 --format json \
  | jq -r '.items[] | select(.content.number == ISSUE_NUMBER) | .id'
gh project item-edit --id <item-id> --project-id PVT_kwHODy7CN84BYNd6 \
  --field-id PVTSSF_lAHODy7CN84BYNd6zhTU44c \
  --single-select-option-id 47fc9ee4

# v4 issue (project 2)
gh project item-list 2 --owner Vergo402 --limit 400 --format json \
  | jq -r '.items[] | select(.content.number == ISSUE_NUMBER) | .id'
gh project item-edit --id <item-id> --project-id PVT_kwHODy7CN84BYV37 \
  --field-id PVTSSF_lAHODy7CN84BYV37zhTcaGE \
  --single-select-option-id 47fc9ee4
```

**New issues created mid-session** must be added to the correct board as sub-issues of the current parent issue — never left as standalone issues.

### Closing issues

- **v4 issues (`v4-redesign` branch):** Close manually with `gh issue close NUMBER --repo Vergo402/paratech-struts` as soon as the work is done. Do NOT rely on `Closes #N` in commit messages — that keyword only fires on merge to the default branch (`main`), and v4 won't merge for a long time.
- **v3 issues (`main` branch):** `Closes #N` in the commit message works correctly on merge to main. Manual close is also fine.

The board Status updates to Done automatically when the issue closes.

---

## Versioning & Release Process

Follow [semver](https://semver.org/): MAJOR.MINOR.PATCH

On every change:
0. **Ensure the `v{VERSION}` Release option exists in the [FieldShore Roadmap Project](https://github.com/users/Vergo402/projects/1)** before any `/plan` scope-in or Project field-edit. Add via the web UI: project settings → fields → "Release" → "+ Add option". **Never** use `gh api graphql ... updateProjectV2Field` to add a single option — the mutation replaces the entire options list (set-and-replace semantics). See `feedback_project_field_mutations.md` memory.
1. Update version in **3 places:**
   - `index.html` header label: `<div class="version-label">v{VERSION}</div>` (~line 60)
   - `app.js` feedback appVersion: `appVersion: '{VERSION}'` (~line 1989)
   - `sw.js` cache name: `const CACHE_NAME = 'fieldshore-v{VERSION}';`
2. Work on a feature branch — do NOT push directly to `main` unless Alex explicitly says to
3. When ready, merge to `main` (which auto-deploys via GitHub Pages)
4. Create GitHub release with notes
5. **Update user manual** (see below)

**PATCH** (x.x.+1): bug fixes, label changes, UI tweaks
**MINOR** (x.+1.0): new features
**MAJOR** (+1.0.0): breaking changes, major restructuring

### User Manual — Auto-Update Rule

The user manual lives at `docs/USER-MANUAL.md`. It **must be updated and committed** whenever any of the following change:

- Features added, removed, or modified (any MINOR or MAJOR release)
- Shore types, ICS roles, apparatus types, or other operational constants
- UI workflow changes (new screens, changed navigation, status lifecycle)
- Shore point lifecycle statuses
- Settings options

**Do NOT update the manual for PATCH releases** (bug fixes only).

When updating:
1. Edit the relevant section(s) in `docs/USER-MANUAL.md`
2. Update the **Version** and **Last updated** fields at the top
3. Add a row to the **Version History** table (major.minor only)
4. Commit and push with the feature — the manual ships in the same commit

---

## App Structure

### Tabs (Bottom Nav)
1. **Quick Find** — Enter measurement + load, get matching struts
2. **Operations** — Create shoring operations, add shore points, deploy struts
3. **Inventory** — Manage apparatus and strut inventory (Excel import/export)
4. **Settings** — Department connection, data management, feedback

### Key Data Constants (app.js)
- `STRUTS[]` — All Paratech strut models with specs
- `BASE_PLATES[]` — 14 connector types with heights and base64 thumbnail images
- `WOOD_SIZES[]` — Header/footer lumber options (None, 4x4, 6x6)
- `SHORE_TYPES[]` — USACE shore configurations
- `APPARATUS_TYPES_DEFAULT[]` — Apparatus type hierarchy (Chief, Engine, Ladder, Rescue, Squad, Task Force, Other)
- `ICS_ROLES_DEFAULT[]` — ICS/NIMS roles (IC, Safety, Operations, Entry, Rescue, Shoring, Runner, Cutting, Wood)

### Key Functions (app.js)
- `findStrutCombinations()` — Core algorithm: finds struts that fit a measurement with optional deductions
- `openPlatePicker()` / `closePlatePickers()` — Bottom sheet connector picker (moves to `document.body` to escape modal stacking context)
- `exportInventory()` / `handleImport()` — Excel import/export via SheetJS
- `firebaseSave(ref, data)` — Wrapper for all Firebase writes (handles online queue + offline localStorage fallback)
- `escapeHtml(str)` — XSS protection for user-controlled innerHTML
- `openOrgChartNode(roleId)` — Modal to assign/clear apparatus and individuals to ICS roles
- `orgSwapRoles(roleA, roleB)` — Swaps all role assignments between two ICS positions (drag-and-drop org chart)
- `getGroupMembers(spId)` — Returns all shore points sharing the same `groupId` (for grouped shore types)
- `toggleSection(sectionKey)` — Collapsible operation sections with `sectionCollapsedState`
- `submitFeedback()` — Saves feedback to Firebase `/feedback/`

### Firebase Data Structure
```
/departments/{deptId}/
  name, inventory, operations, shorePoints
  operations/{opId}/
    roles: { targetId: roleId, ... }
    apparatusGroups: { gid: { name, type, members: [appId...] } }
    shorePoints: { spId: { groupId, groupIndex, groupTotal, ... } }
/feedback/{pushId}/
  category, text, deptId, deptName, timestamp, appVersion
```

---

## Known Patterns & Gotchas

- **CSS stacking context:** `.modal-overlay` (z-index 100) traps fixed children. The plate picker grid must be moved to `document.body` when opened inside a modal, then moved back on close.
- **Plate picker:** Uses bottom sheet pattern (anchored to `bottom: 0`, `max-height: 60vh`) with a scrim backdrop. v3.5.1 fix: `touch-action: pan-y` + `transform: translateZ(0)` + `visibility` toggle (instead of `display`) for iOS scroll reliability.
- **Firebase + service worker:** Firebase WebSocket URLs are excluded from SW caching (see `sw.js` fetch handler).
- **Local-first writes (v3.5.3):** Every mutation writes to in-memory state + localStorage first (`persistOperation()` / `persistInventory()`), then conditionally syncs to Firebase. `firebaseSave()` handles offline queuing internally. Never fork on `if (db) { firebase } else { localStorage }` — always do both.
- **`persistOperation()` / `persistInventory()`:** Centralized localStorage saves. Use these instead of raw `safeSetItem` calls. Defined at ~line 677.
- **`firebaseSave()` wrapper:** All Firebase writes go through this — handles the online/offline split in one place.
- **`escapeHtml()`:** Returns escaped via `div.textContent = s; return div.innerHTML`. **CRITICAL:** This escapes `<`, `>`, `&` but NOT `"` or `'`. Safe for element text contexts ONLY, not attribute values. Use `escapeAttr()` inside `attr="..."` interpolations.
- **Org chart drag-and-drop:** Supports 3 input methods — tap-to-pick-and-place, HTML5 drag events, touch drag with floating clone. State tracked via `orgChartPickedRole`.
- **Grouped shore points — phase-based split (v3.8.0):** Shore types with qty > 1 share a `groupId`. Behavior depends on phase: **pre-cutting** (pending → process → strutplaced → cutting) transitions apply to all group members at once via `getGroupMembers()`. **Cutting workflow** (cutting → runner → secured → returned) transitions operate on individual points only. Controlled by `individualPhase = ['cutting', 'runner', 'secured']` check in `updateShoreStatus()`. `markCutDone()`, `sendToRunner()`, and `returnEquipment()` always operate individually.
- **Git auth:** SSH key (configured 2026-05-09). Single repo, no staging remote.
- **Terminology:** "Footer" = wood sole plate at bottom. "Sole Plate" = metal connector at bottom of strut. "Header" = wood at top. "Group" = NIMS term (not "Team"). **CAVEAT:** v3.5.0 made the SP `group` field a dropdown of apparatus IDs — this is NIMS-terminology-incorrect (NIMS Group is a functional command unit, not a resource). To be renamed `assignedResource` in v4.0.0 (locked in ADR-008; see `docs/v4-design/11-decisions/`).

---

## How We Talk — Plain Language for Alex (standing rule, 2026-06-08)

Alex is a firefighter (USAR/FEMA) **and a tech-savvy power user of decades — but from
the user side, not the engineering/IT-internals side.** Assume full fluency with
*using* software: apps, phones, files, accounts, syncing, offline, settings. The wall
is the **under-the-hood engineering jargon** — architecture, data structures, the
plumbing. Translate only that. Do not explain user-level concepts, do not condescend,
do not pad. Calibrate the altitude; never dumb it down.

In **conversation** — chat replies, planning discussions, triage and gate write-ups,
code-review explanations, summaries of what an agent found:

- **Plain first, term in parentheses.** Lead with the meaning, then tuck the
  engineering term in parens so it's available but never in the way. E.g. "all the
  cloud-saving code lives in one swappable spot (a 'data/sync seam')."
- **Give the "so what," not a tutorial.** Say what the thing is and why it matters to
  the app. Skip the walk-through of concepts he already owns.
- **Analogies only when they truly fit — and as a one-liner, not a lecture.** Use
  ICS / shoring / fireground comparisons when the mapping is genuinely strong; skip
  them when forced. (Strong: a data/sync seam ≈ Operations going through one liaison
  instead of calling vendors directly — swap the vendor, Ops never knows.)
- **The glossary is the bridge.** `docs/PLAIN-LANGUAGE-GLOSSARY.md` translates the
  recurring engineering terms. Point Alex there; add new ones as they come up.

**Scope — conversation only.** This does NOT change how design docs, plans, specs,
ADRs, commit messages, or code comments are written — those keep their precise
vocabulary (v4 doc voice is governed by
`docs/v4-design/07-design-system/voice-and-tone.md`). The job is to pitch our
back-and-forth at the right altitude, not to dumb anything down.

---

## v3.5.2 hotfix (2026-05-14) — what shipped

The Round 2 audit identified ~100 unique issues catalogued in `.claude/audits/`. The v3.5.2 hotfix shipped 17 commits addressing safety-critical, data-integrity, security, and accessibility findings. Remaining items are staged for v3.5.3 / v3.6.0 / v4.0.0.

### ✅ Fixed in v3.5.2

| ID | Area | Notes |
|---|---|---|
| **S2/S3** | ACME load table | All 11 rows now match Paratech O&M Manual Table 2-7 exactly. 132" (11 ft) was over-reporting by 17% via interpolation cliff; 24" was over-reporting by 8.75%. See header comment on `ACME_LOAD_TABLE`. |
| **S1** | Double-deduction in pending re-validation | `findStrutCombinations` now receives `sp.requiredLength` (raw) instead of `sp.effectiveLength` (already deducted). Cache key includes deduction hash. |
| **S4** | sessionStorage parse guard | Top-level `JSON.parse(orgCollapsed)` is now try/catch wrapped and `Array.isArray()` validated. Corrupt or non-array values no longer halt module init. |
| **S5** | endOperation online localStorage cleanup | Online branch now mirrors offline: `activeOperation = null` + localStorage removal + render. |
| **S7** | Firebase listener first-fire guard | inventory/apparatus/customApparatusTypes listeners no longer wipe local data when the first snapshot is empty. Pushes local up to Firebase instead. |
| **S8** (partial) | confirmAddApparatus + updateShoreStatus optimistic | Both now apply local-first then Firebase. `deployShorePoint` + `returnEquipment` family still pending for v3.5.3 (complex multi-resource transactions). |
| **X1** | Drilldown XSS | Building, division, area, group fields all `escapeAttr()` in onclick + `escapeHtml()` in label. |
| **X2** | Inventory model XSS | renderInventory + Quick View + external equipment list all escape user-controlled fields. |
| **X3** | Command Layout onclick XSS | Inline JS construction replaced with data-attribute handler (`commandLayoutClick(this)`). |
| **A2** | Cutting/Runner badge contrast (light mode) | `--cutting-text` 6.76:1 and `--runner-text` 5.56:1 — both pass WCAG AA. Dark mode contrast already passes (no change needed). |
| **NEW-2** | LongShore load table | All 11 rows now match the Paratech LongShore datasheet (Dec 2019) exactly. 13 ft was over-reporting by 17.9%; 14 ft by 8.3%; 15 ft by 5.6%. Lengths < 6 ft (72") removed (not in datasheet). Lengths > 16 ft surface a deployable "unrated zone" warning that requires explicit team acknowledgment. |
| **NEW-3** | qty>4 sentinel | Instead of silent rejection, surface an explicit informational warning when load exceeds 4-strut capacity at the given length. |
| **NEW-6** | Excel ID preservation | Export now includes an `ID` column; import reads it through so round-trips don't orphan deployed-strut references. |
| **NEW-7** | Inventory return transaction sanity | Transaction handlers now abort on missing nodes (no phantom-item creation) and clamp `available` to `quantity` (no over-increment). |

### ✅ Fixed in v3.5.3

| ID | Area | Notes |
|---|---|---|
| **S6 / NEW-8** | Local-first write architecture | Eliminated the `if (db) { firebase } else { localStorage }` fork across all 44 mutation sites. Every write is now local-first + conditional Firebase sync. |
| **S8 family** | deployShorePoint + returnEquipment | Local inventory decrements/increments now unconditional for all item types (struts, extensions, plates, external equipment). |
| — | persistOperation / persistInventory | Centralized 24 operation and 10 inventory `safeSetItem` copy-pastes into two functions. |

### ✅ Fixed in v3.6.0

| ID | Area | Notes |
|---|---|---|
| **R1** | Listener leak | `teardownListeners()` detaches all `.on()` listeners before `setupListeners()` reattaches. Stored query refs (`activeOpsQuery`, `archivedOpsQuery`) and promoted `customTypesRef` to module scope. |
| **R3** | orgSwapRoles concurrent safety | Uses granular `update()` on changed keys instead of full-subtree `set()` on `roles` object. |
| — | Accessibility | 23 interactive `<div onclick>` / `<span onclick>` patterns now have `role="button"` + `tabindex="0"`. Delegated keyboard handler for Enter/Space. Section toggles gained `tabindex="0"`. |
| — | Performance | `getApparatusName()` builds a `Map` on first call per render cycle — O(1) lookups instead of O(n) `find()` in loops. |
| — | Wedge deduction | Verified correct — two formulas are intentionally different. Strut search deducts plates (part of strut assembly); cut length deducts wedge (wood replaces strut+plates). Not a bug. |

### ✅ Fixed in v3.7.0

| Feature | Notes |
|---|---|
| **Firebase Anonymous Auth** | Added `firebase-auth-compat.js` SDK + `signInAnonymously()` on init. Auth-aware `setupListeners()` waits for `onAuthStateChanged` + `getIdToken` before attaching realtime listeners. |
| **Database security rules** | All reads/writes require `auth != null`. Data validation on departments, inventory, apparatus, operations, feedback. `.indexOn` for operations status queries. Rules deployed via Firebase CLI (`database.rules.json`). |
| **Feedback photo attachment (#60)** | Camera/gallery file picker in feedback modal. Client-side compression (800×600 max, JPEG 0.6, base64). 5MB input limit, 500KB output limit enforced by database rules. |
| **Status dot key** | Green/amber legend below ICS Organization header showing Active vs Staged meaning. |

### ✅ Fixed in v3.7.2

| Feature | Notes |
|---|---|
| **Safety-critical load interpolation** | Replaced linear interpolation with conservative-floor method — always uses the shorter (higher-capacity) datasheet row when a measurement falls between two rows. Prevents over-reporting safe load. |
| **Liability disclaimer** | Added disclaimer on strut results: capacity figures are planning aids, not engineering certifications. |

### ✅ Fixed in v3.7.3

| Feature | Notes |
|---|---|
| **Empty state clarity** | When inventory lacks a fitting strut, the results area now shows a clear "No matching struts found" message with guidance, instead of a blank screen. |

### ✅ Fixed in v3.8.0

| Feature | Notes |
|---|---|
| **Inventory display refresh (#64)** | Added `renderInventory()` after `persistInventory()` in `deployShorePoint()` and `returnEquipment()`. Inventory tab now updates immediately after deploying or returning equipment. |
| **Individual wood cut tracking (#65)** | Phase-based group/individual split. Pre-cutting transitions remain group-wide; cutting workflow (cutting → runner → secured → returned) operates per-card. `markCutDone()`, `sendToRunner()`, `returnEquipment()` all rewritten from group to individual. |

### ✅ Fixed in v3.8.1

| Feature | Notes |
|---|---|
| **Sync diagnostics — error capture** | `flushPendingWrites()` now captures `err.message` on failed writes and includes up to 5 error details in `logSyncEvent('flush')`. `firebaseSave()` queued writes also store `lastError`. Deployed `/diagnostics/sync/` security rules. |

### ✅ Fixed in v3.8.2

| Feature | Notes |
|---|---|
| **Firebase inventory validate rule field mismatch** | `database.rules.json` validate rule required `name` field but inventory items use `model`. Every inventory write since v3.7.0 had silently failed validation with `PERMISSION_DENIED`. Rule corrected and deployed. `APP_VERSION` promoted to module-level constant. Pending writes from older versions now discarded via version filter. Transaction failures logged to `/diagnostics/sync/` via `logSyncEvent('transaction_failed')`. |

### ✅ Fixed in v3.8.3

| Feature | Notes |
|---|---|
| **Audit v3.8.2 quick wins** | 13 quick wins from the v3.8.2 full audit action plan. XSS attribute escaping (3 sites in apparatus rename + group dropdown), `g.type` escape in group label, `sessionStorage.setItem` in try/catch, case-insensitive `normalizeStatus`, `\|\| 0` guard on external equipment available decrement, missing `renderInventory()` calls after deploy/return/end, empty-name error toast in `confirmStartOp`, random suffix on deploy `groupId`, clear `myRoleName` on role-clear, read `deptName` from settings on feedback submission, close feedback modal in no-db branch, reset `opMultiBuilding` checkbox in `confirmStartOp`, guard undefined interpolations in `renderShorePointCards`. |

### ✅ Fixed in v3.9.0

| Feature | Notes |
|---|---|
| **Status-progression guard (F-1C-1)** | `updateShoreStatus()` uses `STATUS_ORDER` to skip group members already past the target status. Pre-cutting transitions (Send Back / Strut Placed / Cutting) no longer regress group-mates that have already advanced into cutting/runner/secured. |
| **Excel import — extensions and plates (F-1D-2)** | Extension items now include `model: ''` to pass the v3.8.2 validate rule. Added plate import via new `Plate ID` column. Excel imports no longer silently lose extension and plate rows. |
| **Orphan role assignment sync (F-1D-1)** | `removeCustomRole()` syncs cleared role assignments to Firebase via granular `update({ targetId: null })`. Listener no longer re-hydrates stale assignments to deleted roles. |
| **Apparatus group ID hardening (F-1C-9b)** | `confirmCreateGroup()` `gid` now `'grp-' + Date.now() + '-' + Math.random().toString(36).slice(2,6)` — prevents same-ms collisions across devices. |
| **Subresource Integrity (F-5A-6)** | Firebase SDK (3 scripts) and SheetJS pinned with SHA-384 `integrity` + `crossorigin="anonymous"`. Compromised CDN can no longer substitute malicious JS. SheetJS SRI added to dynamic loader in `loadXLSX()`. |
| **Shore-point peer-XSS hardening (F-1C-19)** | `renderShorePointCards()` and `viewArchivedOp()` now `escapeHtml()` `sp.deployedStrut.model` and coerce `ext.length` via `Number()`. Closes stored-XSS from peer write to Firebase shore-point data. |

### ✅ Fixed in v3.9.1

| Feature | Notes |
|---|---|
| **Revert F-1A-11 deduction auto-fill** | v3.9.0 auto-populated header/footer wood deductions for all shore types, defaulting T-Shore and Double-T to 4x4 (3.5"). That was wrong — T-Shore and Double-T can be built with either 4x4 or 6x6 lumber depending on load and span; operator must make explicit choice. 3-Post still auto-fills 6x6 (USACE/FEMA spec). |

### v3.9.2 → v3.17.2 — see `.claude/plans/CONSOLIDATED-STATUS.md`

The per-release "What shipped" view from v3.9.2 onward lives in **`.claude/plans/CONSOLIDATED-STATUS.md`** to keep this file scannable. Covers: XSS hotfix, v3.10.x audit minor + safety hotfix, v3.11.x Hartsdale field feedback + rename + Surfside hotfixes + security/correctness patch, v3.12.0 Command tab + dual-write + hazard log, v3.13.0–v3.14.3 desktop view + viewport-fill, v3.15.0 numbered divisions + offline hardening, v3.16.x SmartArt org chart + desktop polish + transaction resync, v3.17.x pre-v4 bundle + FAB fixes. The v3.11.2 multi-role audit report at `.claude/audits/v3.11.2/SUMMARY.md` is the canonical view of which audit findings closed in v3.11.3 vs deferred to v4.0.

### ⏳ Still pending — v4.0.0 (major restructure)

> **v4 is now an active, deliberate redesign on the `v4-redesign` branch** (forked at v3.19.1) — not just a backlog. All v4 design lives under **`docs/v4-design/`**; start with `00-INDEX.md`. The master plan ("constitution") is `~/.claude/plans/v4-master-plan.md` — all FieldShore plan files in the global `~/.claude/plans/` use descriptive `v4-`/`v3-`/`fieldshore-` names, mapped from their old random names in `.claude/plans/GLOBAL-PLAN-INDEX.md`. Use the `/v4-plan` (`/v4`) skill for v4 work; `/plan` is for v3 release work. **Nothing v4 ships to `main` until the Phase J cutover.**
>
> **Phase status (2026-06-09):** **A–F DONE. Next = Phase G (workflow design).** A–D (foundation, reference teardowns, 12 brainstorm essays, synthesis + 247-rec decision matrix); **E (design system)** — 8 token/system docs + **15 primitives** + ADR-010–013, cascade gate PASSED 2026-06-07; **F (information architecture)** — all **19 screen specs × 4 surfaces** + the `00-ia-foundation.md` foundation, **Phase F gate (#217) PASSED — Alex, 2026-06-09**. All five gate follow-ups closed before sign-off: **#304** custom-role RBAC (ADR-017), **#305** after-action auto-email (ADR-018), **#306** side-drawer primitive — the 15th (ADR-019), **#307** Inventory Excel/CSV redesign, **#308** Settings deeper pass. Phase F epic **#134 closed 2026-06-09** (board → Done). **Phase G** = state diagrams + screen-by-screen wireframes + accessibility scripts, 1–2 workflows per session, built on the 19 screen specs; the natural first workflow is **Start operation → Add shore point → Deploy strut**. The INDEX (`docs/v4-design/00-INDEX.md`) is the live truth for per-file status.
>
> Key decisions are locked as ADRs in `docs/v4-design/11-decisions/`:
> - **ADR-009 — database:** stay on **Firebase RTDB** for v4.0 behind a `data/sync` seam (event-sourced log; current state is a projection).
> - **ADR-008 — NIMS org structure:** two functional Groups (Rescue + Shoring Supervisors), Search/Medical add-ons at Level III+; Entry/Wood/Cutting/Runner tracked beneath as tasks/resources; **Cutting Station** = workstation card under Operations; Divisions numbered by floor, sides A–D; titles spelled out (no acronyms); **level presets deferred**.
> - **ADR-010–013 (Phase E):** status commit model (slide-to-advance + always-reversible, amends Principle 6); color token system (4 themes, one gold accent); measurement precision (1/8″, floor-rounded); full-color brand emblem (exempt from the one-accent rule).
> - **ADR-014–016 (Phase F foundation):** keep the v3 5-tab spine + nest; fixed bottom nav + guest-first cold-open; modal-vs-sheet doctrine applied per screen.
> - **ADR-017 — custom department roles (RBAC):** **Admin** = the only built-in role + an editable **Default** + unlimited department-defined custom roles (each ~8 back-office permission toggles); ≥1-Admin anti-lockout; **back-office only** — the fireground stays ICS-position-gated (two orthogonal axes); data-driven Firebase rules; creator → first Admin (Owner eliminated). The SP `"group"` field → `assignedResource`.
> - **ADR-018 — after-action auto-email:** a **Principle-10 scope clarification, NOT an exception** — records-only · on incident-complete · to IC/Operations · never during an op · never tactical; on by default, dept-disableable (toggle lives in Settings). The radio rule stays fully in force everywhere else.
> - **ADR-019 — side-drawer primitive (15th):** the edge-anchored slide-in **companion** panel (the checklist side-tab); the bottom-anchored `sheet` is an interrupt by doctrine and can't serve it; mints one token `--shadow-drawer`.
> - **Scope/interaction:** marketing site + demo mode **dropped**; capacity **demoted** (engine unchanged); status = **slide-to-advance + always-reversible** (no timed undo); **no in-app comms / no safety-hold**; **phone is the floor** for every workflow.

The original v4.0.0 backlog items below are now folded into (or superseded by) the v4-design work above:

- **Per-device UID + role-based security rules** — Anonymous Auth is in place but all users share the same permission level. v4.0.0 adds per-device UIDs and write restrictions per department. (Synthesis §1.3 / §4 Auth; backend per ADR-009.)
- **R3-R6 remaining** — `customRoles` and `assignedApparatus` still use `set()` — arrays need migration to keyed objects. (`customRoles` → `positions`, keyed object, per ADR-008.)
- **NIMS doctrine overhaul** — now specified in **ADR-008**: the `"Group"` field on shore points becomes `assignedResource` (it stores an apparatus assignment, not a NIMS Group); full position-title mapping in `docs/v4-design/04-references/nims-org-structure.md`.
- **3rd-party UX paradigm shifts** — Roster tab move, SP recommendation dedup (ShorePointCard vs. RecommendationCard, synthesis §3.2), compact card mode, activity feed paradigm. Addressed across the synthesis recommended path; detailed in Phase E/F.

---

## Audit references

Comprehensive audit complete on v3.5.1. See:
- `.claude/audits/AUDIT-INDEX.md` — Top-level entry point
- `.claude/audits/findings-ledger.md` — Every finding catalogued (~100 unique issues)
- `.claude/audits/v3.5.1-deep-audit-round2.md` — Round 2 deep findings
- `.claude/audits/v3.5.1-comprehensive-audit.md` — Round 1 (with caveats — see Round 2 corrections)
- `.claude/audits/interactive-findings.md` — Live findings from driving app at Surfside scale

Implementation:
- `.claude/plans/MASTER-PLAN.md` — Comprehensive multi-release plan covering all findings
- `.claude/plans/v3.5.2-safety-hotfix.md` — Minimum-viable safety hotfix
- `.claude/plans/v3.6.0-comprehensive-audit-fixes.md` — Round 1 plan (superseded by MASTER-PLAN)

---

## Production Audit Team (v3.3.0)

Role-based Claude sessions for the 6-pass production-readiness audit:

| Role | Model | Passes |
|------|-------|--------|
| Senior Full-Stack Engineer | Opus | 1 (Function & Logic), 2 (Architecture), 5 (Perf & Security) |
| Skeptical Senior Engineer | Opus | Adversarial review — pushes back on necessity, complexity, hidden costs, scope creep across all passes |
| Mobile/Frontend Engineer | Sonnet | 3 (UX Polish) |
| UX/Product Person | Sonnet | 4 (Accessibility) |
| Structural Collapse SME | Haiku | QA review — domain logic across all passes |
| DevOps/Backend Engineer | Opus | 5 (Perf & Security), 6 (Resilience) |

Passes execute sequentially (1→2→3→4→5→6). Each pass produces refactored code + changelog entry. Skeptical Senior Engineer runs cross-cutting across all passes as an adversarial counterweight.

---

## Local Development

```bash
npx serve -l 8095 .
# Open http://localhost:8095
```
