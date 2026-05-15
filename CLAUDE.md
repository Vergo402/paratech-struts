# Paratech Strut Selector — Project Guide

## What This Is

A PWA for USAR/FEMA firefighters to select Paratech rescue struts by measurement, manage inventory across apparatus, and run shoring operations with ICS/NIMS command structure. Built for field use on mobile — works offline.

**Live:** https://vergo402.github.io/paratech-struts/

---

## Architecture

- **3-file split** (refactored from single-file in v2.0.1):
  - `index.html` (~590 lines) — HTML shell, modals, forms
  - `app.js` (~4,000 lines) — All application logic, constants, Firebase integration
  - `style.css` (~1,250 lines) — All styles
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

---

## Versioning & Release Process

Follow [semver](https://semver.org/): MAJOR.MINOR.PATCH

On every change:
1. Update version in **3 places:**
   - `index.html` header label: `<div class="version-label">v{VERSION}</div>` (~line 45)
   - `app.js` feedback appVersion: `appVersion: '{VERSION}'` (~line 1088)
   - `sw.js` cache name: `const CACHE_NAME = 'paratech-struts-v{VERSION}';`
2. Work on a feature branch — do NOT push directly to `main` unless Alex explicitly says to
3. When ready, merge to `main` (which auto-deploys via GitHub Pages)
4. Create GitHub release with notes

**PATCH** (x.x.+1): bug fixes, label changes, UI tweaks
**MINOR** (x.+1.0): new features
**MAJOR** (+1.0.0): breaking changes, major restructuring

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
- `APPARATUS_TYPES[]` — Apparatus type hierarchy (Chief, Engine, Ladder, Rescue, Squad, Task Force, Other)
- `ICS_ROLES[]` — ICS/NIMS roles (IC, Safety, Operations, Entry, Rescue, Shoring, Runner, Cutting, Wood)

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
- **Grouped shore points:** Shore types with qty > 1 share a `groupId`. Status transitions, cut marking, runner sends, and equipment returns apply to all group members at once. Guards prevent double-processing of already-advanced members.
- **Git auth:** SSH key (configured 2026-05-09). Single repo, no staging remote.
- **Terminology:** "Footer" = wood sole plate at bottom. "Sole Plate" = metal connector at bottom of strut. "Header" = wood at top. "Group" = NIMS term (not "Team"). **CAVEAT:** v3.5.0 made the SP `group` field a dropdown of apparatus IDs — this is NIMS-terminology-incorrect (NIMS Group is a functional command unit, not a resource). To be renamed `assignedResource` in v4.0.0.

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

### ⏳ Still pending — v4.0.0 (major restructure)

- **Per-device UID + role-based security rules** — Anonymous Auth is in place but all users share the same permission level. v4.0.0 adds per-device UIDs and write restrictions per department.
- **R3-R6 remaining** — `customRoles` and `assignedApparatus` still use `set()` — arrays need migration to keyed objects.
- **NIMS doctrine overhaul** — Default ICS structure is not NIMS-compliant for Type I/II incidents. The `"Group"` field on shore points stores apparatus IDs but NIMS Group is a functional command unit — terminology violation.
- **3rd-party UX paradigm shifts** — Roster tab move (move Apparatus/External/Individuals/My-Role OFF Operations page), SP recommendation dedup (220 cards for 11 configs at TF scale), compact shore-point card mode, activity feed paradigm.

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
| Mobile/Frontend Engineer | Sonnet | 3 (UX Polish) |
| UX/Product Person | Sonnet | 4 (Accessibility) |
| Structural Collapse SME | Haiku | QA review — domain logic across all passes |
| DevOps/Backend Engineer | Opus | 5 (Perf & Security), 6 (Resilience) |

Passes execute sequentially (1→2→3→4→5→6). Each pass produces refactored code + changelog entry.

---

## Local Development

```bash
npx serve -l 8095 .
# Open http://localhost:8095
```
