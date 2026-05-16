# FieldStruts — Master Implementation Plan

**Covers every finding from the two-round audit.** Pull individual finding details from `.claude/audits/findings-ledger.md`. This plan sequences fixes across releases with code-level specifics.

> **Status as of 2026-05-16:** v3.5.2 ✅ shipped, v3.6.0 ✅ shipped, v3.7.x ✅ shipped (v3.7.0 auth + photos, v3.7.1 auth race hotfix, v3.7.2 safety/liability + interpolation→conservative-floor, v3.7.3 empty-state clarity), v3.8.x ✅ shipped (v3.8.0 individual wood cut tracking + inventory display fix, v3.8.1 sync diagnostics error capture). The v4.0.0 section of this plan is **superseded** by `.claude/plans/v4.0-to-v5.0-roadmap.md`, which adds the 19-reviewer strategic audit (C1–C5 STOP-SHIP findings, monorepo/React-Native phasing, legal/IP, vendor-agnostic data model). This file is retained for v3.x finding traceability.

---

## Release roadmap

| Release | Theme | Effort | Risk | Scope | Status |
|---|---|---|---|---|---|
| **v3.5.2** | SAFETY HOTFIX — algorithm + data integrity + brick + critical XSS | 1-2 days | Low | 14 surgical fixes | ✅ Shipped |
| **v3.6.0** | UX / Safety / Race conditions / Accessibility | 4-6 weeks | Medium | ~60 findings | ✅ Shipped |
| **v4.0.0** | Multi-agency + NIMS doctrine + Auth (BREAKING) | 6-10 weeks | High | ~15 findings + breaking schema changes | ⏳ Planned (see v4.0-to-v5.0-roadmap.md) |
| **v4.1+** | Deferred polish + advanced features | TBD | — | Remaining low-priority items | ⏳ Planned |

---

# Release 1: v3.5.2 SAFETY HOTFIX ✅ Shipped

**Detail:** See `.claude/plans/archive/v3.5.2-safety-hotfix.md` for fix-by-fix specifics.

**Headline:** Fix the strut algorithm capacity over-reporting at 11 ft and 2 ft. This is the only finding with a direct line from "app says it's OK" to "rescuer dies."

**Includes:**
- S1, S2, S3 — Strut algorithm correctness (ACME_LOAD_TABLE, double-deduction)
- S4 — sessionStorage parse guard
- S5, S6 — Online persistence + endOperation localStorage cleanup
- S7 — Firebase listener first-fire guard
- S8, S9 — `confirmAddApparatus` and `endOperation` local-state updates
- X1, X2, X3, X4 — Critical XSS fixes (drilldown, inventory model, command layout, attribute escapes)
- A2 — Cutting/Runner badge contrast
- U1 — F2 collapsed-section fix (Apparatus only)

**Release note:** "Strut capacity calculations corrected to match Paratech O&M Manual Table 2-7. Some configurations that previously passed may now require additional struts; this is correct per the manual."

---

# Release 2: v3.6.0 — UX, Safety, Race Conditions, Accessibility ✅ Shipped

**Detail:** See `.claude/plans/archive/v3.6.0-comprehensive-audit-fixes.md` for the full fix-by-fix plan.

**Effort estimate:** 4-6 weeks (one developer-equivalent)

**Branch strategy:** Single long-lived branch `feature/v3.6.0`. Commit per-phase. Open PR mid-stream for review opportunities.

## Phase 2A — Data integrity hardening (1 week)

Foundation phase — fixes that other phases depend on.

### 2A.1 — Optimistic local updates everywhere (S6, S8, S9, R7, R10)

Convert every `firebaseSave` call site that today writes Firebase-only to the optimistic-update pattern:

```javascript
// BEFORE:
if (db && deptId && opId) {
  firebaseSave(ref, 'set', data);
}

// AFTER:
// 1. Mutate local state immediately
Object.assign(target, data);

// 2. Persist to localStorage as fallback
safeSetItem('fieldstruts_operation', JSON.stringify(activeOperation));

// 3. Fire-and-forget Firebase write (listener will reconcile)
if (db && deptId && opId) {
  firebaseSave(ref, 'set', data);
}

// 4. Re-render
renderOperations();
```

**Call sites:** `updateShoreStatus`, `sendToRunner`, `markCutDone`, `confirmEditShorePoint`, `deployShorePoint`, `confirmAddApparatus`, `endOperation`, `toggleApparatusAssignment`, `confirmCreateGroup`, `removeApparatusGroup`, `assignRole`/`clearRole` paths, `confirmAddExternal`, `confirmAddIndividual`, `removeIndividual`, `removeExternal`, `editApparatus`, `removeApparatus` (cascade).

### 2A.2 — Listener detachment on dept switch (R1)

```javascript
let activeListeners = [];

function detachAllListeners() {
  for (const { ref, event, cb } of activeListeners) {
    try { ref.off(event, cb); } catch (e) { /* silently */ }
  }
  activeListeners = [];
}

function setupListeners() {
  detachAllListeners();
  // ... existing attach code, but wrapped:
  const invCb = (snap) => { /* ... */ };
  inventoryRef.on('value', invCb, errHandler);
  activeListeners.push({ ref: inventoryRef, event: 'value', cb: invCb });
  // Repeat for apparatus, operations active, operations archived, settings, customApparatusTypes
}
```

Also: call `detachAllListeners()` in `logOut()` AND on `beforeunload` to be safe.

### 2A.3 — Listener first-fire guard for ALL listeners (S7, L7)

Already applied to inventoryRef + apparatusRef in v3.5.2. Extend to:
- `settings` listener (line 1046)
- `customApparatusTypes` listener (line 1054)
- For ops listener: if local op exists with `id.startsWith('local-op-')` AND Firebase has no record, push the local op to Firebase before accepting empty snapshot

### 2A.4 — Schema normalization on read (Round 1 H2)

```javascript
// In operations listener callback, after spread:
ops = Object.entries(data).map(([id, op]) => {
  if (op.customRoles && !Array.isArray(op.customRoles)) op.customRoles = Object.values(op.customRoles);
  if (op.assignedApparatus && !Array.isArray(op.assignedApparatus)) op.assignedApparatus = Object.values(op.assignedApparatus);
  // shorePoints already handled at line 991-996
  return { id, ...op };
});
```

### 2A.5 — pendingWrites improvements (L3, L4, R6)

- Clear pendingWrites in `connectDepartment` (currently only `logOut`)
- Store relative paths instead of full URLs (line 581-582)
- Add idempotency key per write `(method + path + JSON.stringify(data)).slice(0, 100)`
- On flush, dedupe by idempotency key before replaying
- For transaction failures: re-queue with same transaction handler (currently silently dropped at line 579)

### 2A.6 — `safeSetItem` quota detection + recovery (L2)

```javascript
let storageHealthy = true;

function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
    if (!storageHealthy) {
      storageHealthy = true;
      hideStorageBanner();
    }
  } catch (e) {
    storageHealthy = false;
    showStorageBanner(e.message);
    // Attempt cache trim: remove pendingWrites older than 1h, archive snapshots
    tryAutoTrimCache();
  }
}

function tryAutoTrimCache() {
  try {
    // Remove pendingWrites entries older than 1 hour
    const cutoff = Date.now() - 3600000;
    pendingWrites = pendingWrites.filter(p => p.timestamp > cutoff);
    localStorage.setItem('fieldstruts_pendingWrites', JSON.stringify(pendingWrites));
  } catch {}
}
```

Add a persistent yellow banner with "Cache full — [Clear archived data]" button.

### 2A.7 — Cross-tab storage sync (L-M5)

```javascript
window.addEventListener('storage', (e) => {
  if (!e.key || !e.key.startsWith('fieldstruts_')) return;
  if (e.key === 'fieldstruts_operation') {
    // Another tab updated the op; reload it
    const stored = localStorage.getItem('fieldstruts_operation');
    if (stored) activeOperation = safeParse(stored, activeOperation);
    renderOperations();
  } else if (e.key === 'fieldstruts_inventory') {
    loadLocalInventory();
    if (document.getElementById('screenInventory').classList.contains('active')) renderInventory();
  }
  // ... etc
});
```

### 2A.8 — beforeunload + visibilitychange (L-M6)

```javascript
window.addEventListener('beforeunload', () => {
  // Force-flush pending writes to localStorage one more time
  if (activeOperation) safeSetItem('fieldstruts_operation', JSON.stringify(activeOperation));
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    // Re-fire init logic for state recovery
    const stored = localStorage.getItem('fieldstruts_operation');
    if (stored) {
      const restored = safeParse(stored, null);
      if (restored && restored.id !== (activeOperation && activeOperation.id)) {
        activeOperation = restored;
        renderOperations();
      }
    }
  }
});
```

## Phase 2B — Form draft recovery (3 days)

### 2B.1 — Shore Point form draft (U4)

Save draft to localStorage on every input. On init, if draft exists for current op, show resume toast.

```javascript
let spDraftSaveTimer = null;

function saveSpDraft() {
  if (!activeOperation || !document.getElementById('shorePointModal').classList.contains('active')) return;
  clearTimeout(spDraftSaveTimer);
  spDraftSaveTimer = setTimeout(() => {
    const draft = {
      opId: activeOperation.id,
      ts: Date.now(),
      label: document.getElementById('spLabel').value,
      building: document.getElementById('spBuilding').value,
      division: document.getElementById('spDivision').value,
      area: document.getElementById('spArea').value,
      group: document.getElementById('spGroup').value,
      feet: document.getElementById('spFeet').value,
      inches: document.getElementById('spInches').value,
      fraction: document.getElementById('spFraction').value,
      load: document.getElementById('spLoad').value,
      shoreType: document.getElementById('spShoreType').value
    };
    safeSetItem('fieldstruts_spDraft', JSON.stringify(draft));
  }, 250);
}

// Attach to all form inputs:
['spLabel', 'spBuilding', 'spDivision', 'spArea', 'spGroup', 'spFeet', 'spInches', 'spFraction', 'spLoad', 'spShoreType'].forEach(id => {
  document.getElementById(id).addEventListener('input', saveSpDraft);
});

// On successful save or close: clear draft
function clearSpDraft() { localStorage.removeItem('fieldstruts_spDraft'); }

// On init, after activeOperation loaded:
const draftRaw = localStorage.getItem('fieldstruts_spDraft');
if (draftRaw) {
  const draft = safeParse(draftRaw, null);
  if (draft && draft.opId === activeOperation.id && Date.now() - draft.ts < 24*3600000) {
    showToast(`Resume <strong>${escapeHtml(draft.label || 'unnamed')}</strong> shore point? <a href="#" onclick="event.preventDefault();resumeSpDraft()">Resume</a> | <a href="#" onclick="event.preventDefault();clearSpDraft()">Discard</a>`, 'info', 30000);
  }
}
```

### 2B.2 — Apparatus + Individual + External form drafts

Same pattern for the four other forms. Lower priority since those flows are shorter; do them if time permits.

## Phase 2C — Race condition fixes (1 week)

### 2C.1 — Atomic multi-path updates for cascades (R7, R9, R16, R18)

Firebase supports `db.ref().update({'path/a': v1, 'path/b': null, ...})` as one atomic commit. Use it for:

```javascript
// removeApparatus cascade:
const updates = {};
updates[`apparatus/${id}`] = null;
for (const item of itemsToRemove) {
  updates[`inventory/${item.id}`] = null;
}
// Also remove from assignedApparatus if present:
if (assignedApparatus.includes(id)) {
  updates[`operations/${opId}/assignedApparatus`] = assignedApparatus.filter(a => a !== id);
}
db.ref(`departments/${deptId}`).update(updates);
```

Same pattern for:
- `removeIndividual` cascade (3 writes → 1 multi-path)
- `returnEquipmentSingle` SP-then-inventory (2 writes → atomic)
- `updateShoreStatus` group member loop (N writes → 1 multi-path)

### 2C.2 — Replace full-tree `set` with keyed `update` (R3, R4, R5, R15, R19)

```javascript
// orgSwapRoles BEFORE:
firebaseSave(ref('operations/{opId}/roles'), 'set', roles);

// AFTER — write only the changed keys:
const updates = {};
for (const targetId of assignedToA) updates[`operations/${opId}/roles/${targetId}`] = roleB;
for (const targetId of assignedToB) updates[`operations/${opId}/roles/${targetId}`] = roleA;
db.ref(`departments/${deptId}`).update(updates);
```

Apply to:
- `orgSwapRoles` (line 2291) — write only changed entries
- `saveCustomRoles` (line 687) — write only the changed role (track which role changed in the caller)
- `toggleApparatusAssignment` (line 1740-1756) — store as map keyed by ID `{id: true}` so writes don't collide
- `customApparatusTypes` (line 1165) — keyed map
- Excel import (line 4462-4470) — per-item updates

### 2C.3 — Transactional deploy (R10)

In `deployShorePoint`, wrap the inventory decrement transaction to also abort the SP write if available would go negative:

```javascript
const result = await inventoryRef.child(strutInvItem.id).child('available').transaction(v => {
  if ((v || 0) <= 0) return; // abort
  return v - 1;
});
if (!result.committed) {
  showToast('Strut no longer available — please re-check inventory', 'error');
  return;
}
// Only NOW write the shore point
firebaseSave(spRef, 'set', sp);
```

### 2C.4 — Cancel modal cleanup of edit IDs (R14)

In `closeModal`, clear all editing IDs:

```javascript
function closeModal(id) {
  // ... existing logic ...
  if (id === 'shorePointModal') editingShorePointId = null;
  if (id === 'addExternalModal') editingExternalId = null;
  if (id === 'addIndividualModal') editingIndividualId = null;
}
```

### 2C.5 — guardClick on cut table buttons (R11)

Replace inline onclick with guardClick wrapper for `sendToRunner`, `updateShoreStatus`, `markCutDone` buttons in cut table render.

### 2C.6 — Block deploy until first echo (R13)

```javascript
let firstEchoReceived = { inventory: false, apparatus: false, operations: false };

function deployShorePoint(...) {
  if (!firstEchoReceived.inventory) {
    showToast('Syncing inventory — try again in a moment', 'warning');
    return;
  }
  // ... existing logic
}
```

## Phase 2D — UX recovery + Field use (1 week)

### 2D.1 — Undo toasts for irreversible actions (U2)

Implement using existing `undoReparent` pattern:

```javascript
let lastStatusUndo = null;

function updateShoreStatus(spId, newStatus) {
  // Snapshot before mutation
  const members = getGroupMembers(spId);
  lastStatusUndo = members.map(m => ({
    id: m.id, status: m.status, cutLength: m.cutLength,
    cuttingStartedAt: m.cuttingStartedAt, deployedStrut: m.deployedStrut
  }));

  // ... mutate as before ...

  showToast(`${members[0].label || 'SP'} → ${newStatus} <a href="#" onclick="event.preventDefault();undoStatus()">Undo</a>`, 'success', 8000);
}

function undoStatus() {
  if (!lastStatusUndo) return;
  for (const snap of lastStatusUndo) {
    const sp = activeOperation.shorePoints.find(p => p.id === snap.id);
    if (sp) Object.assign(sp, snap);
  }
  lastStatusUndo = null;
  safeSetItem('fieldstruts_operation', JSON.stringify(activeOperation));
  renderOperations();
  showToast('Status undone');
}
```

Same pattern for `sendToRunner`, `deployShorePoint`.

### 2D.2 — Custom confirm sheet (U3)

```javascript
function customConfirm(title, message, options = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.style.zIndex = '300';
    overlay.innerHTML = `<div class="modal" style="max-width:480px;padding:24px">
      <h2 style="font-size:18px;margin-bottom:8px">${escapeHtml(title)}</h2>
      <p style="margin-bottom:24px;color:var(--text-secondary)">${escapeHtml(message)}</p>
      <div style="display:flex;flex-direction:column;gap:12px">
        <button data-action="ok" class="btn btn-primary" style="min-height:56px;${options.destructive ? 'background:var(--red);border-color:var(--red)' : ''}">${escapeHtml(options.okText || 'OK')}</button>
        <button data-action="cancel" class="btn btn-outline" style="min-height:56px">${escapeHtml(options.cancelText || 'Cancel')}</button>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
      const action = e.target.dataset?.action;
      if (action) { overlay.remove(); resolve(action === 'ok'); }
    });
  });
}
```

Refactor all 10 `confirm()` sites to `await customConfirm(...)`. Each call site function becomes async.

### 2D.3 — Long-press requires movement (U5)

```javascript
let orgTouchStartX = 0, orgTouchStartY = 0;

function orgTouchStart(event, roleId) {
  // ... existing pick-and-place guard ...
  orgTouchStartX = event.touches[0].clientX;
  orgTouchStartY = event.touches[0].clientY;
  // ... existing long-press timer ...
}

function orgTouchMove(event) {
  const touch = event.touches[0];
  const dx = touch.clientX - orgTouchStartX;
  const dy = touch.clientY - orgTouchStartY;
  if (Math.sqrt(dx*dx + dy*dy) > 8) {
    orgTouchMoved = true;
    if (orgLongPressTimer) { clearTimeout(orgLongPressTimer); orgLongPressTimer = null; }
  }
  // ... existing logic ...
}

// Also: add touchcancel handler
function orgTouchCancel(event) {
  if (orgLongPressTimer) { clearTimeout(orgLongPressTimer); orgLongPressTimer = null; }
  if (orgTouchClone) { orgTouchClone.remove(); orgTouchClone = null; }
  cancelOrgMove();
}
// Wire ontouchcancel in renderNode
```

### 2D.4 — Status badges enhancement (U6, A22)

```css
.status-badge { font-size: 16px; padding: 6px 14px; }
.status-badge::before { content: ''; margin-right: 6px; }
.status-badge.pending::before { content: '⏳'; }
.status-badge.process::before { content: '🔵'; }
.status-badge.strutplaced::before { content: '🟦'; background: repeating-linear-gradient(45deg, transparent 0 4px, rgba(0,0,0,0.1) 4px 8px); }
.status-badge.cutting::before { content: '✂'; }
.status-badge.runner::before { content: '🏃'; }
.status-badge.secured::before { content: '✓'; }
.status-badge.returned::before { content: '✕'; }
```

Plus the hatched diagonal pattern for `strutplaced` to signal unsecured fall hazard.

### 2D.5 — Quick Find direct deploy (U7)

In `renderResults` for `isOperation=false` case, add a "Deploy here" button when `activeOperation` is set:

```javascript
if (activeOperation) {
  html += `<button class="btn btn-sm btn-primary" onclick='deployFromQuickFind(${JSON.stringify(r).replace(/"/g, '&quot;')})'>Deploy this</button>`;
}

function deployFromQuickFind(result) {
  showAddShorePoint();
  // Pre-fill form
  setMeasurementFromInches('sp', result.openingLength);
  document.getElementById('spLoad').value = currentLoad;
  // ... etc
  // Then auto-trigger findForShorePoint and select the strut
}
```

### 2D.6 — Combined measurement input (U9)

```javascript
function parseMeasurement(text) {
  if (!text) return 0;
  text = text.trim();
  if (/^\d+(\.\d+)?$/.test(text)) return parseFloat(text);
  const m = text.match(/^(\d+)'?(?:\s*(\d+))?(?:[\s-](\d+)\/(\d+))?"?$/);
  if (m) {
    const ft = parseInt(m[1]) || 0;
    const inch = m[2] ? parseInt(m[2]) : 0;
    const frac = (m[3] && m[4]) ? parseInt(m[3]) / parseInt(m[4]) : 0;
    return ft * 12 + inch + frac;
  }
  return null;
}
```

Add a single text input alongside the existing three-field UI; parse and update fields on blur.

### 2D.7 — "Yours" lane (U10), Notes field (U11), Deduction toggle pref (U12)

Standard CRUD changes.

## Phase 2E — Cut Table improvements (3 days)

### 2E.1 — Group dedup (O3)

```javascript
function renderCutTableView() {
  // Build groups
  const byGroup = {};
  for (const sp of activePoints) {
    const key = sp.groupId || sp.id;
    if (!byGroup[key]) byGroup[key] = [];
    byGroup[key].push(sp);
  }
  // Render one card per group with badge
  for (const [key, members] of Object.entries(byGroup)) {
    const lead = members[0];
    const badge = members.length > 1
      ? `<span class="group-badge">${members[0].shoreType} — ${members.length}× cuts</span>`
      : '';
    html += renderCutTableCard(lead, 'active', badge, members);
  }
}
```

### 2E.2 — Priority/location sort (O4)

Group cards by Floor/Division (ascending number); within each, sort by `cuttingStartedAt`. Add a "pin to top" button on each card.

### 2E.3 — Persist actual-cut input through done state (U8)

In `renderCutTableCard` for `mode === 'done'`, keep the input visible but disabled, showing the current `actualCutLength` or last-typed value. On transition to runner, snapshot the input value.

### 2E.4 — Stale cut warning (D5 for cut table)

```javascript
function getStaleness(sp) {
  if (!sp.cuttingStartedAt) return null;
  const elapsed = Date.now() - new Date(sp.cuttingStartedAt).getTime();
  if (elapsed > 60 * 60 * 1000) return { level: 'red', label: `Stale — ${Math.floor(elapsed/60000)}m cutting` };
  if (elapsed > 30 * 60 * 1000) return { level: 'yellow', label: `${Math.floor(elapsed/60000)}m cutting` };
  return null;
}
```

### 2E.5 — Runner identity (O1 full)

Replace prompt() from v3.5.2 with a custom select modal populated from Runner-role assignees:

```javascript
async function sendToRunner(spId) {
  const runnerName = await pickRunner();
  if (!runnerName) return;
  // ... existing logic ...
  updateData.runnerName = runnerName;
  updateData.runnerStartedAt = new Date().toISOString();
}

async function pickRunner() {
  const runners = getRoleAssignments().runner || [];
  // ... show modal with runner options + free-text fallback ...
}
```

## Phase 2F — Stale indicators + Visibility (3 days)

### 2F.1 — Stale shore point indicators (D5)

In `renderShorePointCards`, compute staleness and render under status pill:

```javascript
const stale = getStaleness(sp);
const staleClass = stale ? ` sp-stale-${stale.level}` : '';
const staleLabel = stale ? `<div class="sp-stale-label">${stale.label}</div>` : '';
```

CSS:
```css
.sp-stale-yellow { box-shadow: 0 0 0 2px var(--yellow); }
.sp-stale-red { box-shadow: 0 0 0 2px var(--red); animation: pulse 2s infinite; }
```

### 2F.2 — Orphan reference fallback (V1-int)

```javascript
function getGroupDisplayName(value) {
  if (!value) return '';
  const app = localApparatus.find(a => a.id === value);
  if (app) return app.name;
  // Heuristic: if value looks like an app ID (starts with "app-" or matches Firebase push pattern),
  // it's a deleted apparatus — show friendly fallback
  if (/^(app-|-)/.test(value)) return '(Unknown apparatus)';
  return value; // Legacy free-text
}
```

### 2F.3 — Activity feed (V2)

```javascript
function pushActivity(type, msg) {
  if (!activeOperation) return;
  if (!activeOperation.activity) activeOperation.activity = [];
  activeOperation.activity.unshift({ ts: Date.now(), type, msg, by: getMyDisplayName() });
  if (activeOperation.activity.length > 50) activeOperation.activity.pop();
}
```

Push from every status transition, deploy, assignment, etc. Render last 20 on Command page.

### 2F.4 — Drilldown filter (V4)

```html
<div class="status-filter-chips">
  <button data-status="all" class="active">All (12)</button>
  <button data-status="pending">⏳ Pending (3)</button>
  <button data-status="cutting">✂ Cutting (2)</button>
  ...
</div>
```

Filter applied in `getFilteredPoints()`.

### 2F.5 — Command page reorder (V5)

Action-summary banner at top: "14 in-progress · 3 cuts pending · 7 secured · 4 unassigned apparatus".

## Phase 2G — Safety dashboard + Stop-work + Hazards (1 week)

### 2G.1 — Stop-Work FAB (D2)

```html
<button id="stopWorkFab" class="stop-work-fab hidden" onclick="initiateStopWork()">STOP WORK</button>
```

```css
.stop-work-fab {
  position: fixed; bottom: 80px; right: 20px;
  background: var(--red); color: white;
  padding: 20px; border-radius: 50%;
  font-size: 12px; font-weight: 700;
  z-index: 1000;
}
```

Show only when `myRole === 'ic' || 'safety'`. Press → confirm dialog → write `stopWorkActive` to Firebase → all clients show full-screen red banner + disable status buttons.

### 2G.2 — Hazard log (D3)

```javascript
function reportHazard(type, location, severity, mitigations) {
  if (!activeOperation.hazards) activeOperation.hazards = [];
  activeOperation.hazards.push({
    id: 'hz-' + Date.now() + '-' + Math.random().toString(36).slice(2,6),
    type, location, severity, mitigations,
    reportedBy: getMyDisplayName(),
    reportedAt: new Date().toISOString(),
    cleared: false
  });
  saveOperation();
}
```

UI: Hazard button on each SP card; banner on affected area drilldown items.

### 2G.3 — Safety dashboard view (D6)

New view in `index.html`:

```html
<section class="screen" id="screenSafety">
  <div class="safety-tile" id="parTile"></div>
  <div class="safety-tile" id="hazardTile"></div>
  <div class="safety-tile" id="staleTile"></div>
  <div class="safety-tile" id="spanTile"></div>
  <div class="safety-tile" id="unsecuredTile"></div>
</section>
```

When `myRole === 'safety'`, suggested view changes to 'safety'.

### 2G.4 — Three-tier span warning (N9)

```javascript
const directReports = opRoles.filter(x => x.parentId === roleId).length;
let spanIndicator = '';
if (directReports > 7) spanIndicator = '<span class="span-warning span-red" aria-label="Span exceeded">⚠</span>';
else if (directReports >= 6) spanIndicator = '<span class="span-warning span-yellow" aria-label="Span high">⚠</span>';
else if (directReports < 3 && directReports > 0) spanIndicator = '<span class="span-info" aria-label="Span underutilized">ⓘ</span>';
```

### 2G.5 — Unsecured visual (D4)

In `renderShorePointCards`, status `strutplaced` (built but not secured) gets a hatched diagonal pattern + ⚠ UNSECURED overlay.

## Phase 2H — Accessibility critical fixes (1 week)

### 2H.1 — Convert non-semantic interactives to buttons (A1, A5, A13, A14)

Replace `<div onclick>` / `<span onclick>` patterns with `<button>` for:
- `.org-node` (drag-drop org chart) — `<button>` + `tabindex` + keyboard handlers (Enter/Space picks; Arrow keys navigate; Escape cancels)
- `.drilldown-item` — `<button>`
- `.lane-header` — `<button aria-expanded>` with proper keyboard handler
- `.section-toggle` — `<button aria-expanded>` with keyboard handler
- `.role-card` — `<button role="radio" aria-checked>`
- `.plate-option` — `<button role="option">` inside `<div role="listbox">`
- `.app-chip` action button — separate `<button>` from the chip body
- `.list-item-row` — `<button>` for clickable rows

### 2H.2 — Modal focus trap (A6)

In `openModal`, add a keydown handler that traps Tab/Shift+Tab within the modal's focusable elements.

```javascript
function trapFocus(modal) {
  const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  modal.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  });
}
```

### 2H.3 — Background `inert` when modal open (A7)

```javascript
function openModal(id) {
  // ... existing logic ...
  document.querySelectorAll('#mainApp > *:not(.modal-overlay)').forEach(el => el.setAttribute('inert', ''));
}

function closeModal(id) {
  // ... existing logic ...
  if (!document.querySelector('.modal-overlay.active')) {
    document.querySelectorAll('#mainApp > *').forEach(el => el.removeAttribute('inert'));
  }
}
```

### 2H.4 — Status change announcer (A4)

```html
<div id="statusAnnouncer" role="status" aria-live="polite" aria-atomic="true" class="visually-hidden"></div>
```

```javascript
function announce(msg) {
  const el = document.getElementById('statusAnnouncer');
  el.textContent = '';
  setTimeout(() => { el.textContent = msg; }, 100);
}

// In updateShoreStatus after mutation:
announce(`Shore point ${sp.label} changed to ${STATUS_LABELS[newStatus]}`);
```

### 2H.5 — Plate picker keyboard (A10)

Build the picker as a proper listbox pattern. Trigger button has `aria-haspopup="listbox"`, `aria-expanded`, `aria-controls`. Grid is `role="listbox"`. Each `.plate-option` is `role="option"` with `aria-selected`. Open: move focus to selected option. Arrow keys navigate; Enter selects; Escape closes and returns focus to trigger.

### 2H.6 — Form labels `for=` linkage (A11)

Audit every `<label>` in `index.html`; add `for=` linked to input `id=`.

### 2H.7 — Inline error UI (A12)

Replace all 19 `alert()` validation calls with:

```javascript
function setFieldError(inputId, errorMsg) {
  const input = document.getElementById(inputId);
  const errId = inputId + 'Error';
  let err = document.getElementById(errId);
  if (!err) {
    err = document.createElement('div');
    err.id = errId;
    err.className = 'field-error';
    err.setAttribute('role', 'alert');
    input.parentNode.insertBefore(err, input.nextSibling);
  }
  err.textContent = errorMsg;
  input.setAttribute('aria-invalid', 'true');
  input.setAttribute('aria-describedby', errId);
  input.focus();
}
```

### 2H.8 — Touch target sizing (A15, A16, A18)

CSS adjustments:
```css
.view-switcher button { padding: 14px 4px; min-height: 48px; }
.inv-qv-close { min-width: 44px; min-height: 44px; padding: 12px; }
.action-row { gap: 8px; }
```

### 2H.9 — Dark mode contrast (A3)

```css
:root[data-theme="dark"] {
  --blue-light: #0D1F3D;  /* was #1A3050 — now meets 4.5:1 with #42A5F5 text */
}
```

## Phase 2I — XSS remaining + Storage timestamps (3 days)

### 2I.1 — XSS finishing (X5, X6, X7, X8, X9)

- X5: `aria-label="..."` → use `escapeAttr` instead of `escapeHtml`
- X6: `escapeHtml(sp.deployedStrut.model)` at lines 2838, 2949, 3957
- X7: `escapeHtml(ext.model)` at line 2699
- X8: `escapeHtml(g.type)` at line 2654
- X9: Split `showToast` into `showToast(text)` (always textContent) and `showToastHTML(html)` (innerHTML, callers must escape user content). Update all callers.

### 2I.2 — Timestamp consistency + ID jitter (L8, L9)

- All localStorage writes use Firebase `ServerValue.TIMESTAMP` when online (already used for feedback at line 1684)
- ID generation: add `+ Math.random().toString(36).slice(2,6)` to every `Date.now()`-only ID

### 2I.3 — Listener race lifecycle housekeeping (L-M1, L-M2, L-M3)

- Add `touchcancel` listener wired to `cancelOrgMove`
- Re-check controllerchange reload on screen-change events

## Phase 2J — NIMS partial (N9 already covered in 2G.4)

Most NIMS doctrine items defer to v4.0.0. But N9 (three-tier span warning) is small enough to land in v3.6.0.

## Verification matrix for v3.6.0

| Phase | Verification |
|---|---|
| 2A.1 | With `db.goOffline()`, every confirm/save operation visibly updates UI immediately |
| 2A.2 | Settings → Connect to dept-B, then dept-A's apparatus changes should NOT echo into dept-B view |
| 2A.5 | Simulate offline for 25 hours via timestamp manipulation → pendingWrites shows per-write drop notification, not generic toast |
| 2A.6 | Fill localStorage to 4.9MB → next write triggers persistent yellow banner with [Clear archived data] button |
| 2B.1 | Open Shore Point form, type 5 fields, kill the tab. Reopen → toast offers "Resume [label]" |
| 2C.2 | Two devices simultaneously assigning different apparatus to different roles → both assignments survive |
| 2D.1 | Tap "→ Cutting" by mistake → 8s undo toast → tap undo → status reverts |
| 2D.2 | All native `confirm()` replaced with custom sheets, color-coded for destructive |
| 2D.3 | Place water droplet on screen over org node → no reparent mode trigger |
| 2E.1 | Add a Double T-post pair to operation → cut table shows ONE card with "T-POST PAIR — 2 cuts" badge |
| 2F.1 | Pending SP for 2.5h → red ring + "Stale 2h 30m pending" label |
| 2G.1 | As IC, tap STOP WORK → other devices show full-screen red banner |
| 2G.3 | Switch My Role to Safety → app shows Safety dashboard not Command view |
| 2H.1 | Plug in keyboard, Tab through interface → reach every interactive control with visible focus |
| 2H.4 | Open VoiceOver/TalkBack → advance an SP status → assistive tech announces "Shore point 5C changed to Cutting" |
| 2I.1 | Set apparatus name to `X" onfocus="alert(1)"` → no script execution on Inventory tab |

---

# Release 3: v4.0.0 — Multi-Agency / NIMS / Auth (BREAKING) ⏳ Planned

> **Superseded by [`v4.0-to-v5.0-roadmap.md`](v4.0-to-v5.0-roadmap.md).** The strategic roadmap reframes v4.0.0 as Phase 0 of a multi-platform plan (PWA → React Native + web command module) and adds 19-reviewer audit findings, legal/IP groundwork, and a vendor-agnostic data model. Use that file for current planning; the section below is retained for the original v3.x-audit-derived scope.

**Effort estimate:** 6-10 weeks

**Major schema changes:** This is a breaking version. Existing data needs migration.

## Phase 3A — Firebase Auth + Security (2 weeks)

### 3A.1 — Anonymous Auth (X10, X11)

```javascript
firebase.initializeApp(firebaseConfig);
await firebase.auth().signInAnonymously();
const uid = firebase.auth().currentUser.uid;
```

Store local "device profile" in localStorage:
```javascript
{
  uid,
  displayName: 'Alex Vergo',  // user-prompted on first sign-in
  agency: 'mdfr',             // user-prompted on first sign-in
  defaultRole: null
}
```

### 3A.2 — Per-write attribution

Wrap `firebaseSave` to decorate every write:

```javascript
function firebaseSave(ref, method, data) {
  if (method === 'set' && typeof data === 'object' && data !== null) {
    data = { ...data, _meta: { by: uid, agency: agency, at: firebase.database.ServerValue.TIMESTAMP } };
  }
  // ... existing logic
}
```

### 3A.3 — Firebase Security Rules

```json
{
  "rules": {
    "departments": {
      "$deptId": {
        ".read": "auth != null && root.child('departments/' + $deptId + '/members/' + auth.uid).exists()",
        ".write": "auth != null && root.child('departments/' + $deptId + '/members/' + auth.uid).val() != null",
        "inventory": {
          "$itemId": {
            ".validate": "newData.child('quantity').val() >= 0 && newData.child('available').val() <= newData.child('quantity').val()"
          }
        },
        "members": {
          "$uid": {
            ".write": "auth.uid === $uid || root.child('departments/' + $deptId + '/admins/' + auth.uid).exists()"
          }
        }
      }
    }
  }
}
```

### 3A.4 — `sanitizeForDisplay` belt-and-braces (X12)

Add a helper that strips HTML metacharacters at storage time:

```javascript
function sanitizeForDisplay(s) {
  if (typeof s !== 'string') return s;
  return s.replace(/[<>"'&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;' }[c]));
}
```

Apply at `validateInput` for display-bound fields.

## Phase 3B — Multi-tenancy + Agency tagging (2 weeks)

### 3B.1 — Schema changes (N5, N6, X10, C1)

**Old schema:** `/departments/{deptId}/operations/{opId}/...`

**New schema:** `/operations/{opId}/...` with `/agencies/{agencyId}/members/{uid}` for membership

Per-record `agency` field on:
- Apparatus (`{id, name, type, agency}`)
- Inventory items (`{id, type, model, ..., agency}`)
- External equipment (`{id, model, qty, agency}`)
- Roles assignments include `{role, by: uid, agency}`

### 3B.2 — Migration script

On first v4 load:
1. Read all existing local data
2. Tag with `agency = settings.name` as best-effort
3. Push to new schema location
4. Mark old schema as deprecated

### 3B.3 — Agency badges (N5)

Color-code apparatus chips by agency. Hash agency name to color from a fixed palette.

### 3B.4 — Unified Command (N6)

Allow multiple IC role holders. Replace `ic` (singular) with `IC` (collection) at the org chart root. Each IC entry includes agency tag.

## Phase 3C — NIMS doctrine (2 weeks)

### 3C.1 — Default role tree presets (N1, N13)

Three presets selectable at op start:

**Type IV/V — Working Fire:**
```javascript
ICS_ROLES_TYPE_V = [
  { id: 'ic', name: 'Incident Commander', abbr: 'IC', parentId: null },
  { id: 'safety', name: 'Safety Officer', abbr: 'SO', parentId: 'ic' },
  { id: 'operations', name: 'Operations Section Chief', abbr: 'OSC', parentId: 'ic' }
];
```

**Type III — USAR Task Force:**
```javascript
ICS_ROLES_TYPE_III = [
  { id: 'ic', name: 'Incident Commander', abbr: 'IC', parentId: null },
  { id: 'safety', name: 'Safety Officer', abbr: 'SO', parentId: 'ic' },
  { id: 'pio', name: 'Public Information Officer', abbr: 'PIO', parentId: 'ic' },
  { id: 'liaison', name: 'Liaison Officer', abbr: 'LNO', parentId: 'ic' },
  { id: 'operations', name: 'Operations Section Chief', abbr: 'OSC', parentId: 'ic' },
  { id: 'planning', name: 'Planning Section Chief', abbr: 'PSC', parentId: 'ic' },
  { id: 'logistics', name: 'Logistics Section Chief', abbr: 'LSC', parentId: 'ic' },
  // Operations sub-tree
  { id: 'rescue-branch', name: 'Rescue Branch Director', abbr: 'RBD', parentId: 'operations', roleType: 'branch' },
  { id: 'shoring-group', name: 'Shoring Group Supervisor', abbr: 'SGS', parentId: 'rescue-branch', roleType: 'group' },
  { id: 'search-group', name: 'Search Group Supervisor', abbr: 'SrGS', parentId: 'rescue-branch', roleType: 'group' },
  // ... etc
];
```

**Type I/II — Major Collapse:** Full ICS with multiple Operations Sections + Branches + Divisions + Groups + Strike Teams.

### 3C.2 — Role typing + reparent enforcement (N7, N8)

Add `roleType: 'command' | 'general' | 'branch' | 'division' | 'group' | 'strike-team'` to role schema. Enforce hierarchy in `orgReparentRole`:

```javascript
const ALLOWED_PARENTS = {
  'command': null,    // Only IC, no parent
  'general': 'command',
  'branch': 'general',
  'division': 'branch',
  'group': 'branch',
  'strike-team': 'group',
  'single-resource': 'strike-team'
};

function canReparentRole(childRole, newParentRole) {
  if (childRole.id === 'ic') return false;
  if (childRole.id === 'safety') return false;  // (with warning override option)
  const expected = ALLOWED_PARENTS[childRole.roleType];
  return newParentRole.roleType === expected || ['ic', 'general'].includes(newParentRole.roleType);
}
```

`canReparent()` permission shifts from Safety to Planning Section Chief.

### 3C.3 — Operational periods (N3)

```javascript
activeOperation.operationalPeriods = [
  { num: 1, start: '...', end: '...', briefingTime: '...', objectives: [], ics: { rolesSnapshot: {...} } },
  // ...
];
activeOperation.currentPeriod = 4;  // index
```

On period transition: snapshot role assignments, SP statuses, hazards, into the closing period's archive.

UI: "OP 4 (1900-0700)" badge on Command page.

### 3C.4 — Apparatus check-in / demob (C8, N11)

Schema change:
```javascript
// Old: assignedApparatus: ['app-1', 'app-2']
// New:
assignedApparatus: {
  'app-1': { arrivedAt: '...', assignedAt: '...', demobedAt: null, status: 'on-scene' },
  'app-2': { arrivedAt: '...', assignedAt: '...', demobedAt: '...', status: 'demobbed' }
}
```

UI: "Demobilize" button on each apparatus chip preserves history.

### 3C.5 — Role history (N12, J1)

```javascript
activeOperation.roleHistory = [
  { ts: ..., periodNum: 4, action: 'assign', targetId: 'app-1', role: 'rescue', by: uid, agency: ... },
  { ts: ..., periodNum: 4, action: 'reparent', roleId: 'shoring-group', from: 'rescue-branch', to: 'cleanup-branch', by: uid },
  ...
];
```

### 3C.6 — Personnel + PAR (D1, N10)

```javascript
apparatus = { id, name, kind, type, agency, crewSize, crew: [{name, status}] }
```

PAR dashboard:
```javascript
function getPAR() {
  let total = 0, accountedFor = 0;
  for (const app of getActiveApparatus()) {
    total += app.crewSize;
    for (const member of app.crew || []) {
      if (member.status !== 'unaccounted') accountedFor++;
    }
  }
  return { total, accountedFor, missing: total - accountedFor };
}
```

### 3C.7 — "Group" terminology fix (N2)

Migration: rename `sp.group` to `sp.assignedResource`. Drilldown level renamed. Add new optional `sp.nimsGroup` for functional grouping (Shoring Group, Search Group, etc.).

## Phase 3D — ICS forms export (1 week)

### 3D.1 — `exportOperationReport()` (N4, C4)

ZIP output containing:
- `ICS-201_briefing.pdf` (incident summary, current org chart, resources)
- `ICS-203_org_period_N.pdf` (one per period)
- `ICS-204_assignment_period_N.pdf`
- `ICS-211_check_in_list.xlsx`
- `ICS-215_planning_worksheet.xlsx`
- `shore_points_timeline.xlsx`
- `hazards_log.xlsx`

Use jsPDF + XLSX (already lazy-loaded) for generation. Templates match FEMA form layouts.

Triggered from Archived view + "Export Mid-Op" button on Command page.

## Phase 3E — Strut algorithm enhancements (deferred from v3.6.0) (3 days)

### 3E.1 — Wedge + plate geometry consistency (S-H1)

Define canonical:
```javascript
function getSetLength(requiredLength, deductions) {
  return requiredLength - (deductions?.header || 0) - (deductions?.sole || 0) - WEDGE_DEDUCTION;
}

function getStrutLength(setLength, deductions) {
  return setLength - (deductions?.topPlate || 0) - (deductions?.bottomPlate || 0);
}
```

Use `getStrutLength` in `findStrutCombinations` for effective length matching.

### 3E.2 — Always-show capacity + margin (S-H2)

Always render capacity, margin, and color-coded margin class in result cards. "Near max" warning at margin/load < 30%.

### 3E.3 — RecommendedQty surface > 4 (S-H3)

When required qty > 4, return as a `requires-multiple-struts` result type rather than empty.

### 3E.4 — LS 1016 193-198" handling (S-H4)

Show "physically fits but no published rating" warning.

### 3E.5 — Store capacity on deploy (S-M6)

```javascript
sp.deployedStrut = {
  model, system, apparatus,
  inventoryId,
  capacity: r.capacity,           // NEW
  totalCapacity: r.totalCapacity, // NEW
  recommendedQty: r.recommendedQty // NEW
};
```

## Phase 3F — Hardening (1 week)

### 3F.1 — Bulk apparatus + inventory templates (M7 in USAR audit)

Pre-built JSON bundles for each task force. Import in one action.

### 3F.2 — Storage trim UI (L2)

"Cache full" banner with "Clear archived ops cache" button.

### 3F.3 — Print stylesheet (BC L3)

CSS `@media print` rules for ICS-203/204 hardcopy.

## Verification matrix for v4.0.0

| Phase | Verification |
|---|---|
| 3A.1 | After install, prompted for display name + agency. Refresh persists identity. |
| 3A.3 | Attempt to write to `/departments/dept-X/inventory/...` from a uid not in `dept-X/members` → permission denied. |
| 3B.1 | Connect to a multi-agency op as FL-TF1 → see all apparatus from all agencies with badges. Write a deploy → it's tagged with `agency: 'fltf1'` in Firebase. |
| 3B.4 | Type II op with 3 ICs (Local, State, Federal) all visible at org chart root. |
| 3C.1 | At op start, "Choose ICS Template" → "Type III USAR" → org chart populates with Planning, Logistics, Branches. |
| 3C.2 | Attempt to drag Safety under Operations → blocked with NIMS doctrine warning. |
| 3C.3 | Click "Start Op Period 5" → period 4 snapshot saved, role assignments reset prompt. |
| 3C.4 | Demobilize Engine 32 → apparatus visually muted but visible in op history. ICS-211 export shows full timeline. |
| 3C.6 | Add 4-person crew to Engine 32 → headcount jumps from "1 apparatus" to "1 apparatus, 4 personnel". |
| 3D.1 | End operation → "Export AAR Report" → ZIP downloads with all 7 ICS forms generated. |

---

# Release 4+: v4.1+ deferred polish

Items deferred beyond v4 (mostly low-impact polish):
- S-L1 to S-L6 (algorithm polish)
- L-L1 to L-L7 (storage/UI minor)
- R21, R22 (race conditions polish)
- A21, A24, A25, A26 (a11y polish)
- U13, U14 (UX polish)
- P2 (perf at 1000+ SPs)

These can be addressed in patch releases as time permits.

---

# Cross-cutting concerns

## Backward compatibility

- v3.5.2: 100% backward compatible. Just bugfixes.
- v3.6.0: Backward compatible. New optional fields (notes, runnerName, hazards) on operations. Apparatus + inventory schema unchanged.
- v4.0.0: **BREAKING.** Migration required:
  - `/departments/{deptId}/operations/` → `/operations/{opId}` with agency tagging
  - `assignedApparatus: []` → `{}` of objects
  - `sp.group` → `sp.assignedResource`
  - New auth required
  - Migration script runs at first v4 load

## Testing strategy

Per CLAUDE.md, there's no test harness. v3.6.0 should add at minimum:
- Manual checklist per phase (defined in verification matrix above)
- Smoke test before each release: full workflow walk-through (create op → add apparatus → add SPs → cut → runner → secure → return → end)

Future: invest in a Playwright-based smoke test that runs against the local dev server.

## Rollout

- v3.5.2 → as fast as feasible. Today.
- v3.6.0 → 4-6 weeks. Roll out via GitHub Pages auto-deploy. Service worker forces refresh.
- v4.0.0 → 6-10 weeks. Plan a coordinated rollout: post in-app banner 2 weeks ahead. Migration script logged via Firebase for monitoring. Have a v3.6.x branch standing by in case of regression.

## Communication

For each release, the GitHub release notes should call out:
- What was fixed and why
- Any behavioral changes (e.g., v3.5.2's "some configs that previously passed may now require additional struts")
- Any user actions needed (e.g., v4.0.0's "you'll be asked to set your display name and agency")

---

# Single-file summary for Alex

If you only read one thing: **v3.5.2 fixes the strut algorithm capacity over-report. Ship that today.** Everything else can wait. The plans for v3.6.0 and v4.0.0 are deep but sequenced — start v3.6.0 after v3.5.2 is in the field for a week with no issues.
