# FieldStruts — Architecture Reference

**Purpose:** Conventions, patterns, and constraints for working in the FieldStruts codebase.

Pairs with `CLAUDE.md` (project guide) and `.claude/audits/findings-ledger.md` (known issues).

---

## Core architecture

### 3-file PWA

```
index.html  (~610 lines)  — HTML shell, modals, forms, version label
app.js      (~4,900 lines) — All JS logic, constants, Firebase, rendering
style.css   (~1,600 lines) — All styles incl. dark mode via [data-theme="dark"]
sw.js       (~50 lines)    — Service worker, stale-while-revalidate
manifest.json              — PWA manifest
```

No bundler. No transpiler. Everything ships as-written.

### State layers (in priority order)

1. **In-memory module globals** (the source of truth at runtime):
   - `activeOperation` — the current operation object including shore points
   - `localApparatus` — all apparatus in the department
   - `localInventory` — all inventory items
   - `myRole` — this device's self-assigned ICS role
   - `customApparatusTypes` — user-defined apparatus types

2. **Firebase Realtime Database** (cross-device sync):
   - `/departments/{deptId}/inventory/{itemId}/...`
   - `/departments/{deptId}/apparatus/{appId}/...`
   - `/departments/{deptId}/operations/{opId}/...`
   - `/departments/{deptId}/settings/...`
   - `/departments/{deptId}/customApparatusTypes/...`
   - `/feedback/{pushId}/...` (global, write-only from clients)

3. **localStorage** (offline fallback + UI prefs):
   - `fieldstruts_deptId` — current department ID
   - `fieldstruts_operation` — full active operation JSON (only written when offline; see `persistOperation` line 487)
   - `fieldstruts_inventory` — overwritten on every Firebase listener fire
   - `fieldstruts_apparatus` — same
   - `fieldstruts_pendingWrites` — queued writes for replay on reconnect
   - `fieldstruts_settings` — `{name}` (dept name)
   - `fieldstruts_myRole` — current role
   - `fieldstruts_myRoleName` — assigned person name
   - `fieldstruts_theme` — `'system' | 'light' | 'dark'`
   - `fieldstruts_deductionToggle` — Quick Find pref
   - `fieldstruts_custom_apparatus_types`

4. **sessionStorage:**
   - `orgCollapsed` — Set of collapsed org chart node IDs (⚠ unguarded parse at line 415)

### Data flow (current — post-v3.5.1)

```
User action (tap deploy, change status)
  ↓
Mutation function (e.g. updateShoreStatus)
  ↓
  if (db && deptId && opId):
    firebaseSave(ref, method, data)  ← Firebase-only write
    [⚠ NO local mutation — UI stays stale until listener echo]
  else:
    Object.assign(local, data)       ← Direct mutation
    safeSetItem(localStorage)
    renderXxx()
  ↓
[ONLINE PATH] Firebase listener fires with echoed data
  ↓
  activeOperation = ops[0]            ← Full reference replace
  renderOperations()
```

**Problem:** The online path's "no local mutation, wait for listener echo" pattern is the root cause of multiple data-integrity bugs (S6, S8, S9 in audit). Operations don't visibly update in offline-queued mode. **The v3.6.0 plan converts every site to optimistic-local-then-Firebase.**

### Data flow (target — post-v3.6.0)

```
User action
  ↓
Mutation function
  ↓
1. Object.assign(local, data)         ← Always mutate first
2. safeSetItem(localStorage)          ← Always persist locally
3. renderXxx()                         ← Always re-render
4. if (db && deptId && opId):
     firebaseSave(ref, method, data)   ← Fire-and-forget
  ↓
[Listener echo eventually reconciles, but UI already shows correct state]
```

---

## Conventions

### Function naming

- `renderXxx()` — Pure render of a section into a known container element. Idempotent. Called freely.
- `xxxClicked()`, `openXxx()`, `showXxx()` — User-triggered UI actions
- `confirmXxx()` — Modal "OK" button handlers
- `getXxx()` — Pure accessor returning derived state
- `xxxByYyy()` — Predicate helpers (`canReparent`, `isDescendantOf`)
- `loadLocalXxx()` — Load from localStorage into module globals
- `firebaseSave(ref, method, data)` — All Firebase writes go through this wrapper

### CSS variables (theming)

Light mode in `:root`. Dark mode in `:root[data-theme="dark"]`. JS applies `data-theme` attribute on `<html>`; never use `@media (prefers-color-scheme: dark)` for new CSS (refactored out in v3.5.0).

### Component patterns

**Modal:**
```html
<div class="modal-overlay" id="myModal">
  <div class="modal">
    <h2 class="modal-title">Title</h2>
    <!-- content -->
    <button onclick="closeModal('myModal')">Cancel</button>
    <button onclick="guardClick(this, confirmAction)">Save</button>
  </div>
</div>
```

Open via `openModal('myModal')`. Close via `closeModal('myModal')` OR backdrop click OR Escape key. `openModal` moves focus into the modal; `closeModal` restores focus to the trigger.

**Bottom sheet (plate picker):**
- `position: fixed; left: 16px; right: 16px; bottom: 0`
- `max-height: 60vh`
- `overflow-y: auto`
- `touch-action: pan-y`
- `transform: translateZ(0)` (forces compositing layer for iOS)
- `visibility: hidden/visible` (not `display: none/block`) so iOS initializes scroll layer

**Optimistic UI (target pattern):**
```javascript
function changeSomething(data) {
  // 1. Mutate local
  Object.assign(activeOperation.foo, data);
  // 2. Persist
  safeSetItem('fieldstruts_operation', JSON.stringify(activeOperation));
  // 3. Render
  renderOperations();
  // 4. Fire Firebase write (optional, reconciles via listener)
  if (db && deptId && activeOperation.id) {
    firebaseSave(operationsRef.child(activeOperation.id).child('foo'), 'update', data);
  }
}
```

---

## Schema reference

### Operation (`activeOperation`)

```javascript
{
  id: 'opId-firebase-push-key' | 'local-op-<timestamp>',
  name: string,                          // user-entered
  status: 'active' | 'archived',
  startTime: ISO string,
  endTime: ISO string | null,
  multiBuilding: boolean,
  taskForce: string | undefined,         // free text
  assignedApparatus: string[],           // apparatus IDs
  individuals: { [id]: {id, name} },
  roles: { [targetId]: roleId },         // targetId = appId or 'ind-'+indId
  roleNames: { [targetId]: name },       // optional assignee name override
  apparatusGroups: { [gid]: {name, type, members: appId[]} },
  externalEquipment: { [extId]: {deptName, apparatus, model, qty, available} },
  customRoles: Role[],                   // array; sometimes Object via Firebase
  shorePoints: ShorePoint[],             // array; sometimes Object via Firebase
}
```

⚠ `shorePoints` and `customRoles` can be received as Object from Firebase (because RTDB doesn't store sparse arrays). Always normalize via `getShorePoints()` / `getOperationRoles()`.

### ShorePoint

```javascript
{
  id: 'sp-...',
  label: string,
  building: string | undefined,
  division: string,                      // free text or apparatus ID for Group level
  area: string,
  group: string,                         // v3.5.0+: apparatus ID, fallback to legacy free text
  shoreType: string,                     // from SHORE_TYPES
  requiredLength: number,                // opening, in inches
  effectiveLength: number,               // = requiredLength - sum(deductions)
  estimatedLoad: number,                 // pounds
  status: 'pending' | 'process' | 'strutplaced' | 'cutting' | 'runner' | 'secured' | 'returned',
  createdAt: ISO,
  deductions: {
    header: number,                      // wood header height
    sole: number,                        // wood footer height
    topPlate: number,                    // metal plate height
    bottomPlate: number,
    topPlateName: plateId,               // for display lookup (v3.4.0+)
    bottomPlateName: plateId
  } | null,
  deployedStrut: { model, system, apparatus, inventoryId, external?, deptName? } | null,
  deployedExtensions: [{ length, system, apparatus, inventoryId }],
  deployedPlates: [{ plateId, position, apparatus, inventoryId }],
  deployedAt: ISO,
  cutLength: number,                     // computed at status=cutting
  cuttingStartedAt: ISO,
  actualCutLength: number | undefined,   // user-entered if differs from cutLength
  cutMarkedDone: boolean,
  runnerStartedAt: ISO,                  // when sent to runner
  securedAt: ISO,
  returnedAt: ISO,
  // Group (T-post pair, 3-Post, etc.):
  groupId?: string,
  groupIndex?: number,
  groupTotal?: number
}
```

### Role (customRoles)

```javascript
{
  id: 'ic' | 'safety' | 'operations' | 'entry' | 'rescue' | 'shoring' | 'runner' | 'cutting' | 'wood' | 'custom_<timestamp>',
  name: string,
  abbr: string,                          // up to 6 chars
  parentId: string | null,               // null = root (IC)
  suggestedView?: 'ops' | 'command' | 'cuttable' | 'safety'  // suggests this view when assigned
}
```

⚠ Default roles use stable IDs (`'ic'`, `'safety'`, etc.). Custom roles use `'custom_<ts>'` and may collide on rapid creation (L9 finding).

### Apparatus

```javascript
{
  id: 'app-<ts>-<rand>' | firebase-push-key,
  name: string,
  type: 'chief' | 'engine' | 'ladder' | 'rescue' | 'squad' | 'taskforce' | 'other' | custom
}
```

⚠ Future v4.0.0 schema: add `agency`, `crewSize`, `crew[]`, `kind`, `nimsType` (I-V).

### Inventory Item

```javascript
{
  id: firebase-push-key,
  type: 'strut' | 'extension' | 'plate',
  model?: string,                        // STRUTS[].model (for strut/extension)
  system?: 'AcmeThread' | 'LockStroke' | 'LongShore',
  length?: number,                       // for extension
  plateId?: string,                      // for plate, references BASE_PLATES[].id
  apparatus: appId,
  quantity: number,                      // total on this apparatus
  available: number                      // currently not deployed
}
```

---

## Render lifecycle

### When does each render fire?

| Function | Trigger |
|---|---|
| `renderOperations()` | Tab switch to Operations, status changes, drilldown, op data change |
| `renderCommandView()` | Switch to Command view, role changes |
| `renderCutTableView()` | Switch to Cut Table view, status to cutting/runner/secured |
| `renderInventory()` | Inventory tab, equipment add/edit/delete |
| `renderResults()` | Quick Find results after `runQuickSelect` |
| `renderArchivedOps()` | When loading archived ops |
| `renderOrgChart()` | Inside `renderCommandView` |
| `renderRolesSection()` | Inside `renderCommandView` |
| `renderRoleSuggestion()` | After role-affecting actions |

### Render perf (measured Round 2, v3.5.1)

At 200 shore points / 100 apparatus / 21 assigned:
- `renderOperations` at root drilldown: 0.6 ms (only 2 layout cards)
- `renderOperations` with all 200 cards visible: 10.3 ms (acceptable)
- `renderCommandView`: 1.4 ms
- `renderCutTableView`: 2.3 ms (7 active cards)
- DOM nodes: 2,313
- Memory: ~16 MB

Drilldown architecture (Building → Division → Area → Group → Cards) keeps render fast because we never render all 200 SP cards at once at typical use.

---

## Firebase patterns

### Listener attachment

```javascript
// CURRENT (problem: no .off() on dept switch)
inventoryRef.on('value', (snap) => { ... }, errHandler);

// TARGET (v3.6.0 plan)
let activeListeners = [];
const cb = (snap) => { ... };
inventoryRef.on('value', cb, errHandler);
activeListeners.push({ ref: inventoryRef, event: 'value', cb });
// In setupListeners (before re-attach) or logOut:
for (const { ref, event, cb } of activeListeners) ref.off(event, cb);
activeListeners = [];
```

### Write patterns

| Pattern | When to use |
|---|---|
| `firebaseSave(ref, 'set', data)` | Replace entire node value. **Dangerous on shared structures** — concurrent writes clobber. |
| `firebaseSave(ref, 'update', {a:1, b:2})` | Merge specific fields. **Preferred for most writes.** |
| `firebaseSave(ref, 'remove')` | Delete node. |
| `firebaseSave(ref, 'transaction', v => v+1)` | Read-modify-write atomically. **Use for counters (inventory available).** |
| `db.ref(parent).update({'a/x':1, 'b/y':2})` | Atomic multi-path update. **Use for cascades.** |

### Conflict resolution

There is none today. Last write wins. For shared structures (roles, assignedApparatus, customRoles, inventory map), this causes silent data loss when two devices write simultaneously. v3.6.0 plan converts these to keyed `update()` writes so children don't collide.

### Offline behavior

- All Firebase calls return promises; on rejection, `firebaseSave` queues to `pendingWrites` array (which is persisted to localStorage).
- `pendingWrites` is replayed on `.info/connected` flipping to `true`.
- Transactions are NOT queued — silently dropped on rejection (R6 finding).
- Firebase persistence (`enablePersistence`) is NOT enabled — the app reimplements offline queue manually.

---

## Service Worker

### Cache strategy

Today: stale-while-revalidate for ALL assets (broken — see audit C5).

Target (v3.6.0):
- Network-first for `index.html` and `app.js` (so bug fixes reach the field)
- Stale-while-revalidate for `style.css`, fonts, images
- Skip Firebase WebSocket URLs

### Update flow

- Bump `CACHE_NAME` on every release (e.g. `fieldstruts-v3.5.1` → `fieldstruts-v3.5.2`)
- Old caches are deleted on `activate`
- `controllerchange` event triggers a reload on the client — but suppressed when on Ops screen with active op
- v3.6.0 plan: re-check on screen change so users don't get stuck on old SW

---

## Build & deploy

```bash
# Local development
npx serve -l 8095 .
# Open http://localhost:8095

# Test changes
# (no test harness — manual checklist; see MASTER-PLAN.md verification matrix per phase)

# Release
git checkout -b feature/vX.X.X
# ... edit app.js, index.html, style.css ...
# Bump version in 3 places:
#   - index.html: <div class="version-label">vX.X.X</div>
#   - app.js: appVersion: 'X.X.X'
#   - sw.js: CACHE_NAME = 'fieldstruts-vX.X.X'
git add -p
git commit -m "vX.X.X — ..."
git checkout main
git merge feature/vX.X.X
git push origin main
# GitHub Pages auto-deploys
gh release create vX.X.X --title "vX.X.X" --notes "..."
```

---

## Known anti-patterns to avoid in new code

1. **`if (online) { firebaseSave } else { localStorage }`** — broken: never updates local state when online. Use optimistic-local-then-Firebase pattern.

2. **`firebaseSave(ref, 'set', fullObject)` on shared structures** — silently clobbers concurrent writes. Use `update({path: value})` for individual fields.

3. **`<div onclick="...">`** — not keyboard accessible, not announced by screen readers. Use `<button>` and add `tabindex`+`keydown` handler if you need a div-shaped clickable.

4. **`innerHTML += \`${userString}\``** without escape — XSS surface. Use `escapeHtml(userString)` for content, `escapeAttr(userString)` for attribute values.

5. **Native `confirm()` / `alert()`** — small targets, hostile to gloves, blocks page. Use `customConfirm()` and inline error UI.

6. **`new Date()` for distributed timestamps** — devices' clocks drift. Use `firebase.database.ServerValue.TIMESTAMP` when writing to Firebase.

7. **`'<prefix>-<Date.now()>'` for IDs** — collisions on rapid creation. Add jitter: `'<prefix>-<Date.now()>-<Math.random().toString(36).slice(2,6)>'`.

8. **`localStorage.setItem(key, JSON.stringify(...))`** — synchronous, can throw on quota. Always use `safeSetItem(key, value)`.

9. **`JSON.parse(localStorage.getItem(...))`** — throws on corrupt data. Use `safeParse(value, fallback)`.

10. **Setting `activeOperation.foo = bar` then forgetting to call `safeSetItem`** — local mutation lost on reload. Always persist after mutation when offline.

---

## Future architecture (v4.0.0)

- Firebase Auth (anonymous) + per-device UID + Firebase Security Rules
- Per-record agency tagging on apparatus, inventory, external equipment, roles
- Multi-tenant operation model: ops live at `/operations/{opId}` not under a dept
- Operational period model with snapshots
- NIMS-correct role taxonomy with `roleType` (command/general/branch/division/group/strike-team)
- ICS form export pipeline (ICS-201, 203, 204, 211, 215, 219, 221)
- Per-write attribution metadata (`{by, agency, at}`)

---

## Reference materials

In the repo under `docs/` (for offline access during development):
- `docs/Operation-and-Maintenance-Manual-for-Rescue-Support-Systems-Lockstroke-Acmethread-and-Low-Clearance.pdf` — Paratech O&M Manual (authoritative for AcmeThread/LockStroke)
- `docs/bips_08.pdf` — FEMA BIPS-08 collapse structures
- `docs/paratech-struts-reference.md` — Internal notes on Paratech strut data
- `docs/usr_structures.md` — USR / NIMS structures reference
