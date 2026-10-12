---
paths:
  - "app.js"
  - "index.html"
  - "style.css"
  - "sw.js"
  - "manifest.json"
---

# v3 app reference (path-scoped rule)

Moved from CLAUDE.md 2026-10-12. The authoritative copy for v3 work is CLAUDE.md on `main` in the `fieldshore-main/` worktree; the v3 files on `v4-redesign` lag live.

### Key Files

| File | Purpose |
|------|---------|
| `index.html` | HTML shell — header, nav, modals, forms |
| `app.js` | All JS logic, constants, Firebase calls |
| `style.css` | All CSS styles |
| `sw.js` | Service worker — update `CACHE_NAME` on every release |
| `manifest.json` | PWA manifest |

---

## App Structure

### Tabs (Bottom Nav)
1. **Quick Find** — Enter measurement + load, get matching struts
2. **Operations** — Create shoring operations, add shore points, deploy struts
3. **Inventory** — Manage apparatus and strut inventory (Excel import/export)
4. **Settings** — Department connection, data management, feedback

### Key Data Constants (app.js)
- `STRUTS[]` — All Paratech strut models with specs
- `BASE_PLATES[]` — connector types with heights and base64 thumbnail images
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
- **`persistOperation()` / `persistInventory()`:** Centralized localStorage saves. Use these instead of raw `safeSetItem` calls.
- **`firebaseSave()` wrapper:** All Firebase writes go through this — handles the online/offline split in one place.
- **`escapeHtml()`:** Returns escaped via `div.textContent = s; return div.innerHTML`. **CRITICAL:** This escapes `<`, `>`, `&` but NOT `"` or `'`. Safe for element text contexts ONLY, not attribute values. Use `escapeAttr()` inside `attr="..."` interpolations.
- **Org chart drag-and-drop:** Supports 3 input methods — tap-to-pick-and-place, HTML5 drag events, touch drag with floating clone. State tracked via `orgChartPickedRole`.
- **Grouped shore points — phase-based split (v3.8.0):** Shore types with qty > 1 share a `groupId`. Behavior depends on phase: **pre-cutting** (pending → process → strutplaced → cutting) transitions apply to all group members at once via `getGroupMembers()`. **Cutting workflow** (cutting → runner → secured → returned) transitions operate on individual points only. Controlled by `individualPhase = ['cutting', 'runner', 'secured']` check in `updateShoreStatus()`. `markCutDone()`, `sendToRunner()`, and `returnEquipment()` always operate individually.
- **Git auth:** SSH key (configured 2026-05-09). Single repo, no staging remote.
- **Terminology:** "Footer" = wood sole plate at bottom. "Sole Plate" = metal connector at bottom of strut. "Header" = wood at top. "Group" = NIMS term (not "Team"). **CAVEAT:** v3.5.0 made the SP `group` field a dropdown of apparatus IDs — this is NIMS-terminology-incorrect (NIMS Group is a functional command unit, not a resource). To be renamed `assignedResource` in v4.0.0 (locked in ADR-008; see `docs/v4-design/11-decisions/`).

## Local Development

```bash
npx serve -l 8095 .
# Open http://localhost:8095
```
