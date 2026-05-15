# Paratech Strut Selector — Roadmap Phase Plan

_Created: 2026-05-11 | Current version: v3.0.0_

---

## Phase 3 — Multi-Jurisdictional Response (v3.1.0)

**Goal:** During mutual aid incidents, pull other departments' apparatus and inventory into your operation so shore point searches show all available struts across departments.

### Features
1. **Add Mutual Aid Department** — In Settings or within an active operation, enter another department's ID to link them
2. **Read-Only Inventory Access** — Pull linked departments' apparatus and inventory from Firebase in real time
3. **Unified Shore Point Search** — When finding strut combos for a shore point, include mutual aid inventory in results with a department badge showing the source
4. **Mutual Aid Apparatus in Operations** — Assign mutual aid apparatus to operations; their equipment shows with a visual badge (different color or icon)

### Implementation

**Data Model:**
```
/departments/{deptId}/
  mutualAid: { linkedDeptId: { addedAt: timestamp, addedBy: "deviceName" }, ... }
```
Each department maintains its own list of linked departments. No changes needed to the linked department's data — we just read their `/departments/{linkedDeptId}/inventory` and `/apparatus` paths.

**Firebase Security Rules:**
Currently all reads/writes are open (no auth). For mutual aid to work safely long-term, we'd need rules like:
```json
"departments": {
  "$deptId": {
    ".read": "true",
    ".write": "data.child('members').hasChild(auth.uid) || !data.exists()"
  }
}
```
For now (no auth), any department can read any other department's data, so mutual aid reads work out of the box. The risk: anyone with a dept ID can see that department's data. This is acceptable for the fire service context (dept IDs aren't secret), but worth noting.

**Key Code Changes:**
- `app.js`: New `mutualAidDepts` state variable (array of linked dept IDs)
- `app.js`: New `loadMutualAidInventory(deptId)` — attaches Firebase listener to remote dept's inventory/apparatus
- `app.js`: Modify `findStrutCombinations()` to optionally include mutual aid inventory, tagging results with source dept
- `app.js`: Modify shore point card rendering to show department badge on mutual aid equipment
- `app.js`: New UI in Settings to add/remove mutual aid departments
- `index.html`: Add mutual aid section to Settings tab

**Scope:** Medium (~3-4 hours)

**Dependencies:** None. Firebase currently allows open reads.

---

## Phase 4 — Operation Reports (v3.2.0)

**Goal:** When an operation ends (or on demand), generate an after-action summary showing everything that happened — for FEMA documentation and department records.

### Features
1. **After-Action Report** — Auto-generated when `endOperation()` is called, also available via button during active ops
2. **Report Contents:**
   - Operation name, location, start/end time, duration
   - Assigned apparatus (with types and groups)
   - ICS role assignments
   - All shore points: type, location (building/floor/area), measurement, deductions, strut deployed, status history
   - Equipment inventory used (struts, plates, wood)
   - Mutual aid departments involved (if Phase 3 is done)
3. **Export Options:**
   - Print-friendly HTML view (styled for paper, no nav/buttons)
   - PDF download (via browser print-to-PDF or a library like jsPDF)
   - Copy-to-clipboard as formatted text
4. **Duplicate Shore Point** — "Copy" button on deployed shore points to create a new shore point with same settings (type, location, deductions, plates, wood) but fresh status

### Implementation

**Report Generation:**
- New `generateReport(opId)` function that reads the operation data and builds an HTML report
- Report lives in a full-screen modal or new tab, styled with `@media print` CSS for clean printing
- Data is already in `activeOperation` — no new Firebase reads needed for active ops
- For archived ops: read from `archivedOperations` array or Firebase `/departments/{deptId}/operations/{opId}`

**Duplicate Shore Point:**
- New `duplicateShorePoint(spId)` function
- Copies: `type`, `shoreType`, `building`, `division`, `area`, `topPlate`, `bottomPlate`, `topWood`, `bottomWood`, `deductions`, `apparatusId`
- Does NOT copy: `status` (starts at "process"), `id` (generates new), `groupId`/`groupIndex`/`groupTotal` (not grouped), `cutLength`, `actualCutLength`, `cutMarkedDone`
- Add "Copy" button to shore point cards when status is past "process"

**Key Code Changes:**
- `app.js`: New `generateReport()` function (~100-150 lines of HTML templating)
- `app.js`: New `duplicateShorePoint(spId)` function
- `style.css`: `@media print` styles for report view
- `index.html`: Report modal container

**Scope:** Medium-Large (~4-5 hours)

**Dependencies:** Phase 3 optional (report can show mutual aid data if available, but works without it)

---

## Phase 5 — Quality of Life (v3.3.0)

**Goal:** Polish and convenience features based on field use experience.

### Features

1. **Dark Mode / Night Mode**
   - Toggle in Settings
   - CSS custom properties already use `var(--bg)`, `var(--text-primary)`, etc. — swap values via a `.dark-mode` class on `<body>`
   - Persist preference in localStorage
   - Respect `prefers-color-scheme` media query as default

2. **Long-Press Quick Add Quantity**
   - Currently: tap "+ Quick Add" adds 1 unit of a strut to inventory
   - New: long-press (500ms) opens a small prompt/popover to enter a specific quantity
   - Uses `setTimeout` on `touchstart`/`mousedown`, cancelled on `touchend`/`mouseup` if < 500ms (normal tap adds 1)

3. **Pre-Deployment Inventory Checklist**
   - New view/modal: for each apparatus in the operation, show a checklist of its inventory
   - Firefighter walks the rig and checks off each item physically present
   - Helps catch missing equipment before the operation starts
   - Stored per-operation: `activeOperation.checklist = { apparatusId: { itemId: true/false, ... } }`

4. ~~Live Elapsed Time Counter~~ — **Already implemented** in v1.8.0 (app.js lines 2888-2893, shows in operation header)

### Implementation

**Dark Mode:**
- `style.css`: Define dark-mode custom property overrides inside `body.dark-mode { ... }` block
  - `--bg: #121212`, `--card-bg: #1E1E1E`, `--text-primary: #E0E0E0`, `--text-secondary: #9E9E9E`, etc.
  - `--blue: #64B5F6` (lighter blue for contrast on dark)
  - Adjust borders, shadows, modal overlays
- `app.js`: `toggleDarkMode()` function, persist to localStorage, load on init
- `index.html`: Toggle switch in Settings

**Long-Press Quick Add:**
- `app.js`: Modify `renderQuickAddButtons()` to attach `touchstart`/`touchend`/`mousedown`/`mouseup` handlers
- `app.js`: On long-press, show a small quantity input (prompt or inline popover)
- No Firebase changes — uses existing `addToInventory()` with a `qty` parameter

**Pre-Deployment Checklist:**
- `app.js`: New `renderChecklist(apparatusId)` function
- `app.js`: New `toggleChecklistItem(apparatusId, itemId)` function
- Button in operation view: "Pre-Deploy Check" → opens modal with apparatus tabs and item checkboxes
- Persist to Firebase under operation

**Scope:** Medium (~3-4 hours total, each feature is ~1 hour)

**Dependencies:** None

---

## Suggested Priority Order

| Priority | Phase | Version | Rationale |
|----------|-------|---------|-----------|
| 1 | Phase 5 — Quality of Life | v3.3.0 | Fastest to ship, immediate daily-use improvements |
| 2 | Phase 4 — Operation Reports | v3.2.0 | FEMA documentation need, duplicate shore points save field time |
| 3 | Phase 3 — Mutual Aid | v3.1.0 | Largest scope, needs Firebase rules planning, less frequent use case |

> **Note:** Version numbers above are placeholders. Actual version depends on which phase ships first and whether patches happen in between. Phase 5 features could also be split across multiple patch/minor releases instead of one big drop.

---

## Status Key

- ✅ Done
- 🔧 In Progress
- ⬜ Not Started

| Feature | Status |
|---------|--------|
| Multi-Jurisdictional Response | ⬜ |
| Operation Reports | ⬜ |
| Duplicate Shore Point | ⬜ |
| Dark Mode | ⬜ |
| Long-Press Quick Add Qty | ⬜ |
| Pre-Deployment Checklist | ⬜ |
| Live Elapsed Time | ✅ (v1.8.0) |
