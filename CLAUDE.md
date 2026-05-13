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
- **Plate picker:** Uses bottom sheet pattern (anchored to `bottom: 0`, `max-height: 60vh`) with a scrim backdrop.
- **Firebase + service worker:** Firebase WebSocket URLs are excluded from SW caching (see `sw.js` fetch handler).
- **`firebaseSave()` wrapper:** All Firebase writes go through this — handles the online/offline split in one place.
- **`escapeHtml()`:** Must be used on any user-controlled string rendered via innerHTML.
- **Org chart drag-and-drop:** Supports 3 input methods — tap-to-pick-and-place, HTML5 drag events, touch drag with floating clone. State tracked via `orgChartPickedRole`.
- **Grouped shore points:** Shore types with qty > 1 share a `groupId`. Status transitions, cut marking, runner sends, and equipment returns apply to all group members at once. Guards prevent double-processing of already-advanced members.
- **Git auth:** SSH key (configured 2026-05-09). Single repo, no staging remote.
- **Terminology:** "Footer" = wood sole plate at bottom. "Sole Plate" = metal connector at bottom of strut. "Header" = wood at top. "Group" = NIMS term (not "Team").

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
