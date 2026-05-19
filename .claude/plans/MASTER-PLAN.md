# FieldShore — Master Implementation Plan

**Covers every finding from the two-round audit.** Pull individual finding details from `.claude/audits/findings-ledger.md`. This plan sequences fixes across releases with code-level specifics.

> **Status as of 2026-05-18:** v3.5.2 ✅ shipped, v3.6.0 ✅ shipped, v3.7.x ✅ shipped (v3.7.0 auth + photos, v3.7.1 auth race hotfix, v3.7.2 safety/liability + interpolation→conservative-floor, v3.7.3 empty-state clarity), v3.8.x ✅ shipped (v3.8.0 individual wood cut tracking + inventory display fix, v3.8.1 sync diagnostics error capture, v3.8.2 Firebase validate rule fix, v3.8.3 audit quick wins), v3.9.x ✅ shipped (v3.9.0 audit minor — status guard / Excel ext+plate import / orphan-role sync / SRI / peer-XSS hardening, v3.9.1 revert T-Shore deduction auto-fill, v3.9.2 XSS hotfix), v3.10.x ✅ shipped (v3.10.0 audit minor, v3.10.1 disableFirebaseWrites guard + auto-backup), v3.11.x ✅ shipped (v3.11.0 Hartsdale field feedback fixes, v3.11.1 FieldStruts→FieldShore rename, v3.11.2 Surfside release-blocker hotfix, v3.11.3 security/correctness patch — 2 Critical XSS + 7 High), v3.12.0 ✅ shipped (Command tab separation, `group`→`assignedResource` dual-write, `customRoles` concurrent-safe, hazard log/ICS-208, force-update mechanism, 9 audit-medium fixes), v3.13.x ✅ shipped (v3.13.0 desktop view with top nav + Operations split, v3.13.1 re-targeted onto Command tab), v3.14.x ✅ shipped (v3.14.0 Operations-tab desktop split-view, v3.14.1 USAR FOG link fix, v3.14.2 Wayback URL + status pills + 44px hit targets hotfix, v3.14.3 desktop view fills viewport + planning-doc drift cleanup).
>
> **Strategic pivot 2026-05-17 — local-first reframe.** Phase 3 / v4.0.0 has been reframed away from federal Type I/II / USAR-TF scale toward everyday municipal fire department use: cars into buildings, residential partial collapses, light commercial partial collapses. Primary persona is a small/mid municipal department running Type IV–V incidents (1 dept, 1 IC, 2–4 apparatus, 5–20 shore points, hours-to-shift duration). The original Surfside TTX-2 / federal-scope Phase 3 content has been deferred to a new "Federal Future" section at the end of the v4.0.0 block — nothing is deleted, just resequenced. **Canonical v4.0 source is now `.claude/plans/v4.0.0-plan.md`** (the per-release plan rewritten in parallel with this update). This MASTER-PLAN file retains v3.x finding traceability and the long-arc release-roadmap view.
>
> The 19-reviewer strategic audit and React-Native phasing live in `.claude/plans/v4.0-to-v5.0-roadmap.md`; that file is the long-horizon companion to this one. Federal-scope features deferred from v4.0 fold into v4.1/v4.2 (PWA) or v5.x (post-React-Native cutover) depending on field demand.

---

## Release roadmap

| Release | Theme | Effort | Risk | Scope | Status |
|---|---|---|---|---|---|
| **v3.5.2** | SAFETY HOTFIX — algorithm + data integrity + brick + critical XSS | 1-2 days | Low | 14 surgical fixes | ✅ Shipped |
| **v3.6.0** | UX / Safety / Race conditions / Accessibility | 4-6 weeks | Medium | ~60 findings | ✅ Shipped |
| **v3.11.2** | PATCH — 7 release-blocker bugs (scale-agnostic Surfside fixes) | 1 week | Low | Pre-v4 stability cleanup | ✅ Shipped |
| **v3.11.3** | PATCH — 2 Critical XSS + 7 High from v3.11.2 audit + photo feature removal | 1 week | Low | Security & correctness | ✅ Shipped |
| **v3.12.0** | MINOR — Command tab separation + group dual-write + hazard log + 9 audit-medium fixes | 1-2 weeks | Low | Operations tab decomposition (v4.0 prep) | ✅ Shipped |
| **v3.13.0–v3.14.3** | MINOR/PATCH — desktop view (top nav + Operations split, Command split, drilldown sidebar, viewport-fill) + Wayback link + 44px hit target hotfix | 3-5 days | Low | Desktop-class field deployment surface | ✅ Shipped |
| **v3.15.0** | MINOR — numbered divisions (#93) + offline inventory hardening (#71, #80 partial) | 7-10 days | Low | Feature + architectural infra | ✅ Shipped |
| **v3.16.0** | MINOR — SmartArt ICS org chart (#95) + 12 must/should-fix items (#96) from 5-agent review | 3-5 days | Low | Interactive hierarchy tree with per-node controls | ⏳ In progress |
| **v3.17.0** | MINOR — local-first defaults (scenario presets, solo-IC, Quick-start FAB) + pre-v4 dual-write window (`Strut Placed`→`Strut Set`, `customRoles`→keyed, `assignedApparatus`→keyed) | 1-2 weeks | Low | Onboarding ergonomics + schema migration prep | ⏳ Planned |
| **v4.0.0** | MAJOR — NIMS doctrine corrections + per-device UID + schema cutover + Cloud Function for atomic allocate+create | 2-3 weeks | Medium | Local persona reframe; federal-scope deferred | ⏳ Planned (see `.claude/plans/v4.0.0-plan.md`) |
| **v4.1+** | Federal Future folding-in + deferred polish | TBD | — | Multi-agency, IC[], full FEMA Type I/II, bulk-deploy, etc. | ⏳ Planned |

**v4.0 release-train duration:** ~5-7 weeks remaining (v3.15.0 + v3.16.0 + v3.17.0 + v4.0.0). The original v4.0 plan called for v3.12.0 to absorb the local-first defaults; in practice v3.12.0 absorbed the Command-tab refactor and the defaults were recycled into v3.16.0.

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

# Release 3: v4.0.0 — Local-first NIMS Corrections + Per-device UID ⏳ Planned

> **Strategic reframe 2026-05-17.** v4.0.0 has been narrowed to a local-municipal-fire-department persona — Type IV–V incidents (cars into buildings, residential partial collapses, light commercial partial collapses), 1 dept, 1 IC, 2–4 apparatus, 5–20 shore points, hours-to-shift duration. The original Surfside TTX-2 / federal-USAR-TF scope (multi-agency auth, Unified Command IC[], full FEMA Type I/II presets, agency badges, full demob lifecycle, ICS-205/207/208/209/211/215, bulk-deploy, victim cluster linkage, cribbing audit lifecycle) has been deferred — see the "Federal Future" section at the end of this v4.0.0 block. Nothing is deleted; the federal scope returns in v4.1+ / v5.x depending on field demand. **Canonical per-release plan:** `.claude/plans/v4.0.0-plan.md`. **Long-horizon companion:** `.claude/plans/v4.0-to-v5.0-roadmap.md` (PWA → React Native + web command module phasing, 19-reviewer audit, legal/IP, vendor-agnostic data model).

**Effort estimate:** 2–3 weeks for v4.0.0 itself; ~5–6 weeks for the full v4.0 release train (v3.11.2 + v3.12.0 + v4.0.0).

**Schema changes:** Targeted and migration-safe. Per-device UID arrives (single-dept scope). `sp.group` → `sp.assignedResource` rename. `'Strut Placed'` → `'Strut Set'` status label rename. `customRoles` array → keyed object (deferred terminology + array-to-keyed work continues from v3.6.0 leftover). No multi-tenancy schema cutover; the federal `/operations/{opId}` global namespace is deferred.

## Phase 3A — Per-device UID + role-based scope (single-dept) (1 week)

> **Scope narrowed 2026-05-17.** Multi-agency identity (per-actor + agency + qualifications + checkInTs/checkOutTs) has been deferred to "Federal Future." v4.0.0 ships per-device UID, per-write attribution (no `agency` field — single-dept), and role-based write scope inside an operation. Validate rules enforce `byUid` presence.

### 3A.1 — Per-device UID (X10, X11)

Anonymous Auth is already in place since v3.7.0 (`firebase.auth().signInAnonymously()`). v4.0.0 promotes the UID to a first-class identity:

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
  defaultRole: null           // optional — last-used role for quick role pickup
}
```

Note: `agency` field intentionally omitted at this phase. A local department is a single agency; the multi-agency identity model is deferred (see Federal Future).

### 3A.2 — Per-write attribution (`_meta: { byUid, at }`)

Wrap `firebaseSave` to decorate every write:

```javascript
function firebaseSave(ref, method, data) {
  if (method === 'set' && typeof data === 'object' && data !== null) {
    data = { ...data, _meta: { byUid: uid, at: firebase.database.ServerValue.TIMESTAMP } };
  }
  // ... existing logic
}
```

### 3A.3 — Firebase Security Rules (single-dept, role-aware)

```json
{
  "rules": {
    "departments": {
      "$deptId": {
        ".read": "auth != null && root.child('departments/' + $deptId + '/members/' + auth.uid).exists()",
        ".write": "auth != null && root.child('departments/' + $deptId + '/members/' + auth.uid).val() != null",
        "inventory": {
          "$itemId": {
            ".validate": "newData.child('quantity').val() >= 0 && newData.child('available').val() <= newData.child('quantity').val() && newData.child('_meta/byUid').isString()"
          }
        },
        "operations": {
          "$opId": {
            "shorePoints": {
              "$spId": {
                ".write": "auth != null && (root.child('departments/' + $deptId + '/operations/' + $opId + '/roles').child(auth.uid).val() == 'operations' || root.child('departments/' + $deptId + '/operations/' + $opId + '/roles').child(auth.uid).val() == 'ic' || root.child('departments/' + $deptId + '/operations/' + $opId + '/roles').child(auth.uid).val() == 'safety')"
              }
            }
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

**Role-based write scope inside operations (v4.0.0):**
- Operations role and IC can mutate SP status, deploy, return
- Safety role can pause operations and write hazards
- All writes require `_meta.byUid == auth.uid` (validate rule rejects spoofing)

Per-agency cross-tenancy scope (federal-IST read-only on local inventory, etc.) is deferred to Federal Future.

### 3A.4 — `sanitizeForDisplay` belt-and-braces (X12)

Add a helper that strips HTML metacharacters at storage time:

```javascript
function sanitizeForDisplay(s) {
  if (typeof s !== 'string') return s;
  return s.replace(/[<>"'&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;' }[c]));
}
```

Apply at `validateInput` for display-bound fields.

## Phase 3B — Local-first ergonomics (1 week)

> **Replaced 2026-05-17.** The original Phase 3B (multi-tenancy + agency tagging + IC[] Unified Command + agency badges + `/operations/{opId}` global namespace) has been deferred to "Federal Future." A local department is a single agency; multi-agency identity adds setup friction with zero benefit for the primary persona. The new Phase 3B targets solo-IC quick-start and local-scenario presets.

### 3B.1 — Type IV/V default org chart preset

On first launch (and as the default selection at operation start), the org chart preset is **Type IV/V — Working Fire**:

```javascript
ICS_ROLES_TYPE_V_DEFAULT = [
  { id: 'ic',         name: 'Incident Commander', abbr: 'IC',  parentId: null,  roleType: 'command' },
  { id: 'safety',     name: 'Safety Officer',     abbr: 'SO',  parentId: 'ic',  roleType: 'command' },
  { id: 'operations', name: 'Operations Section', abbr: 'OSC', parentId: 'ic',  roleType: 'general', optional: true }
];
```

A first-due IC with a single apparatus may run the entire incident with only the `ic` role populated. Safety is recommended; Operations is collapsible until a second apparatus arrives. This replaces the v3.x default of a 9-role tree that overwhelmed local-scale users.

### 3B.2 — Scenario presets

Three scenario presets, selectable at "Start Operation" alongside the org-chart preset:

- **Car into building** — single building, single division, default `estimatedLoad: medium`, suggests T-Shore + Double-T from inventory
- **Residential partial collapse** — A/B/C/D division dropdown enabled, default `estimatedLoad: medium`, suggests 3-Post + T-Shore
- **Light commercial partial collapse** — A/B/C/D division + multi-building enabled, default `estimatedLoad: heavy`, suggests 3-Post (USACE/FEMA spec) + T-Shore

Presets pre-populate: SP form defaults (load, division dropdown visibility, building dropdown enabled/disabled), recommended shore types in the Quick Find shore-type chips, and the org-chart preset suggestion.

### 3B.3 — Quick-start "first-due" mode for solo IC

A single tap from cold start lands in an active operation:
- "Start First-Due" button on the empty Operations tab home screen
- One-tap creates operation with: a single auto-named apparatus (`Engine-N` where N is incremented from a local counter), the current device's UID as IC, default Type IV/V preset, single-building scenario
- Hands the user directly to "Add First Shore Point" modal

Removes the OP-setup friction (multi-step start modal → role assignment → apparatus add → SP add) for the >95% case of a solo IC arriving first-due.

### 3B.4 — Streamlined Start-Operation flow for solo IC

When the device profile shows no prior operations OR only one apparatus configured in inventory:
- Skip the apparatus checkbox grid (auto-assigns the only available apparatus)
- Collapse role assignment to a single "I am IC" affirmation toggle
- Default operation name to `{date} — {scenario}` (e.g., `2026-05-17 — Car into building`)
- Total taps from cold start to first SP add: ≤3

When the device has prior multi-apparatus operations, the full Start-Operation modal returns automatically.

## Phase 3C — NIMS doctrine (local scale) (1–2 weeks)

> **Scope narrowed 2026-05-17.** Type IV/V remains the default (configured in Phase 3B). Type III is supported for local-FD task-force-light incidents. Type I/II / full FEMA Command + General Staff has been deferred to Federal Future. OP-boundary snapshot emission, full FEMA demob lifecycle (proposed→reviewed→approved→executing→released), individuals-level check-in/check-out + Time UL surface, "X apparatus, Y personnel" Command-tab rollup, cribbing audit lifecycle, victim locator / linkedVictim / victimCluster — all deferred to Federal Future.
>
> What ships in v4.0.0 (local-scale NIMS correctness): terminology fixes, span-of-control warnings, role history event log, multi-holder render at role nodes, SP Building/Division/Area dropdowns, SP ID indexing normalization, custom role deprecate/supersede workflow, `'Strut Placed'` → `'Strut Set'` rename, `group` → `assignedResource` rename, `renderOrgChart` defensive hardening.

### 3C.1 — Default role tree presets (N1, N13) — Type IV/V + Type III only

**Type IV/V — Working Fire:** Defined in Phase 3B.1 (default at first launch).

**Type III — Local-FD task-force-light:** (optional, selected at op start for larger local incidents):
```javascript
ICS_ROLES_TYPE_III = [
  { id: 'ic',             name: 'Incident Commander',         abbr: 'IC',  parentId: null,             roleType: 'command' },
  { id: 'safety',         name: 'Safety Officer',             abbr: 'SO',  parentId: 'ic',             roleType: 'command' },
  { id: 'operations',     name: 'Operations Section Chief',   abbr: 'OSC', parentId: 'ic',             roleType: 'general' },
  { id: 'planning',       name: 'Planning Section Chief',     abbr: 'PSC', parentId: 'ic',             roleType: 'general' },
  { id: 'logistics',      name: 'Logistics Section Chief',    abbr: 'LSC', parentId: 'ic',             roleType: 'general' },
  // Operations sub-tree
  { id: 'rescue-branch',  name: 'Rescue Branch Director',     abbr: 'RBD', parentId: 'operations',     roleType: 'branch' },
  { id: 'shoring-group',  name: 'Shoring Group Supervisor',   abbr: 'SGS', parentId: 'rescue-branch',  roleType: 'group' },
  { id: 'search-group',   name: 'Search Group Supervisor',    abbr: 'SrGS', parentId: 'rescue-branch', roleType: 'group' }
];
```

**Type I/II — DEFERRED to Federal Future.** The full FEMA Type I Command + General Staff (PIO, Liaison, FASC, Cost UL, Time UL, Procurement UL, Comp/Claims UL, multiple Branch Directors, Strike Teams) is overkill for the local persona and bloats the org chart for first-due use. The architecture supports adding it back as a preset; the roles themselves remain in custom-role territory for departments that need them.

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

### 3C.3 — Operational periods (N3) — light version

Local hours-to-shift operations rarely roll a second operational period, but the data model still supports them:

```javascript
activeOperation.operationalPeriods = [
  { num: 1, start: '...', end: '...', briefingTime: '...', objectives: [], ics: { rolesSnapshot: {...} } },
  // ...
];
activeOperation.currentPeriod = 1;  // index
```

On period transition: snapshot role assignments and SP statuses into the closing period's archive.

UI: "OP 1 (0830–...)" badge on Command page. Manual "Start New OP" action under Settings (no auto-transition).

**Deferred to Federal Future:** App-owned OP-boundary snapshot emission + "writes since last snap" diff surface in Command tab (federal multi-op forensic feature). Operations-tab OP-indicator badge + "Now entering OP N" transition banner.

### 3C.4 — Apparatus check-in / demob (C8, N11) — light version

Schema change (keyed-object migration, NOT full FEMA lifecycle):
```javascript
// Old: assignedApparatus: ['app-1', 'app-2']
// New (v4.0.0 — minimum migration):
assignedApparatus: {
  'app-1': { arrivedAt: '...', assignedAt: '...', demobedAt: null, status: 'on-scene' },
  'app-2': { arrivedAt: '...', assignedAt: '...', demobedAt: '...', status: 'demobbed' }
}
```

UI: "Demobilize" button on each apparatus chip preserves history (single-step demob — no proposed/reviewed/approved gate).

**Deferred to Federal Future:** Full FEMA demob lifecycle (proposed → reviewed → approved → executing → released), per-resource demob status across all resource classes, cache-decon prereq tracking, drag-orderable release-sequence plan, individuals-level check-in/check-out + Time UL surface with shift tracking.

### 3C.5 — Append-only role history event log (N12, J1)

```javascript
activeOperation.roleHistory = [
  { ts: ..., periodNum: 1, action: 'assign',   targetId: 'app-1',       role: 'rescue',        byUid: ... },
  { ts: ..., periodNum: 1, action: 'reparent', roleId: 'shoring-group', from: 'rescue-branch', to: 'cleanup-branch', byUid: ... }
];
```

Append-only — never mutated, only added to. Useful at any scale for shift-change documentation and post-incident review. Combined with the v3.9.0 orphan-role-assignment-sync fix, this surfaces the full audit trail of role transitions.

### 3C.6 — Multi-holder render at role nodes (IP-045)

v4.0.0 ships the multi-holder render at role nodes (a single role node can show multiple assigned individuals with a "multi-holder" badge — needed for Type IV/V where one person may hold IC + Safety at span <7):

```javascript
apparatus = { id, name, kind, type, crewSize }
// Multi-holder per role at the org-chart layer
roles = { 'role-id': { holders: ['app-1', 'app-2'], chair: 'app-1' } }
```

The crew-level data model (`apparatus.crew = [{name, status}]`) and the PAR dashboard land as a v4.0.0 stub: data structure in place, "Show Crew" view collapsed-by-default, full PAR-counting workflow deferred. Local fire departments do PAR via radio + accountability tags, not via app.

**Deferred to Federal Future:** Full PAR dashboard with auto-counting, individuals-level check-in/check-out + Time UL surface with shift tracking, "X apparatus, Y personnel" rollup in Command-tab header.

### 3C.7 — Terminology + SP fields (N2, IP-035, IP-044, IP-049, IP-057)

- Rename `sp.group` → `sp.assignedResource` everywhere. Drilldown level relabeled. Migration script handles existing data.
- Rename status pill `'Strut Placed'` → `'Strut Set'`. Disambiguate `'In Process'` into `Cutting` / `Assembling` / `Deploying` sub-states.
- Add `spDivision` (A/B/C/D dropdown) — useful at local scale too.
- Add `spBuilding` dropdown sourced from incident-defined buildings.
- Add free-text notes field per SP.
- Normalize SP ID indexing — commit to push-key (NOT `Object.keys`), document the contract.
- Add new optional `sp.nimsGroup` for functional grouping (Shoring Group, etc.). Defaults to null at local scale.

### 3C.8 — `renderOrgChart` defensive hardening (IP-023, IP-047)

Default `roleAssignments` to `{}` on entry. Visual-layout regression tests at parentId depth 4/5/6 (confirmed crash on bare call during Surfside TTX-2 OP1+OP2; depth-4+ render unverified through OP4). v3.11.2 ships a minimum-viable version (depth-4 only — see Phase 3G.0); v4.0.0 extends to depth-5/6.

### 3C.9 — Custom role deprecate/supersede workflow (IP-006, IP-046)

When a custom role is deleted (or an individual is promoted from a custom role to a standard role), assignments are migrated to the supersede target rather than orphaned. Supersede prompt offered on deletion: "Reassign 3 holders to: [dropdown]?"

### 3C.10 — Span-of-control surfacing extension (IP-020)

Three-tier span warning is already shipped in v3.6.0 (Phase 2G.4). v4.0.0 extends with the "Convert to Branches" workflow at the Section→Branch transition when span >7. Small enough to land in this phase.

**Deferred to Federal Future (Phase 3C scope only):**
- Cribbing audit lifecycle (`lastInspected`, `cribbing_status` enum, `auditHistory[]`, Cribbing Audit view) — federal forensic doctrine
- Victim locator / `linkedVictim` / `victimCluster` (rescue-to-shoring linkage) — federal forensic doctrine
- Operation-level safety state (`paused-weather`, `paused-hazard`, `paused-PAR`) + per-SP `paused` status + SafetyEvent log — local FDs use radio for this
- Multi-role assignment per individual at NIMS Type I span <7 (eliminate shadow-individual workaround for FASC+Cost UL double-hat) — only matters at federal scale

## Phase 3D — ICS forms (baseline) (3–5 days)

> **Scope narrowed 2026-05-17.** ICS-201 + ICS-203 only for v4.0.0 — the two forms a local IC actually hands off at end-of-shift / to the next-up officer. ICS-202, 204, 205, 207, 208, 209, 211, 215 all deferred to Federal Future. Local Type IV/V incidents rarely run long enough to produce a full ICS form bundle, and the form templates for the deferred forms require federal layout fidelity that isn't worth the engineering cost at this scale.

### 3D.1 — `exportOperationReport()` — ICS-201 + ICS-203 baseline (N4, C4)

ZIP output containing:
- `ICS-201_briefing.pdf` (incident summary, current org chart, resources, situation summary)
- `ICS-203_org_period_N.pdf` (one per period — usually just OP 1 at local scale)
- `shore_points_timeline.xlsx` (per-SP audit log: status transitions, deployments, cut records)

Use jsPDF + XLSX (already lazy-loaded) for generation. Templates match FEMA ICS-201 / ICS-203 form layouts.

Triggered from Archived view + "Export Mid-Op" button on Command page. Sufficient for local-FD shift handoff + post-incident review.

**Deferred to Federal Future:**
- ICS-202 (incident objectives) — needed for multi-OP planning
- ICS-204 (assignment list per branch/group) — needed for Type III+
- ICS-205 (Comms Plan: Command/Tactical/Support/Air-to-Ground/Emergency Traffic frequencies + per-role `nets: []` binding)
- ICS-207 (org chart visual export)
- ICS-208 (Hazards register — operation-level + per-SP with timestamps, owner, mitigation, last-verified)
- ICS-209 (SitStat — single-screen view for incoming IST: pile status, recent rescues, weather/hazards, current/next priorities, command staff, apparatus + personnel on-scene, status counts)
- ICS-211 (check-in list — needed when individuals-level check-in lands)
- ICS-215 (planning worksheet — needed for shift planning at Type III+)

## Phase 3E — Strut algorithm enhancements (deferred from v3.6.0) (3 days)

> **Unchanged in 2026-05-17 reframe.** Every Phase 3E item is scale-agnostic correctness work (algorithm accuracy, capacity surfacing, deduction geometry, regression coverage). Keep all sub-phases.

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

### 3E.2 — Always-show capacity + margin with color bands (S-H2, IP-027)

Always render capacity, margin, and color-coded margin class in result cards. Margin color bands: green ≥30%, amber 15–30%, red <15%. "Near max" warning at margin/load < 30%.

### 3E.3 — RecommendedQty surface > 4 (S-H3, IP-028)

When required qty > 4, return as a `requires-multiple-struts` result type rather than empty. Verify the sentinel surfaces through Quick Find AND the Deploy modal result cards, plus an informational banner.

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

### 3E.6 — 5-query smoke deck (CI regression) (IP-029)

Lock a 5-query smoke deck into CI regression on every release: 132"/15klb, 24"/8klb, 200"/5klb, 96"/25klb, 120"/200klb. Run against `findStrutCombinations`; flag on any deviation. Catches the kind of algorithm regression that caused the v3.5.2 11ft over-report issue.

## Phase 3F — Hardening (1 week)

> **Scope narrowed 2026-05-17.** Bulk-deploy mode (3F.6) and virtualization (3F.9) are deferred to Federal Future — both are designed for the 220+ SP federal scale that isn't present in the local persona. WCAG audit (3F.4), reactive count cards (3F.5), inventory FAB on Quick Find (3F.7), combined Start-Op + first SP modal (3F.8), canonical apparatus roster (3F.1) all stay.

### 3F.1 — Pre-built apparatus + inventory templates (M7 in USAR audit, IP-039 trimmed)

Pre-built JSON bundles for common local-apparatus configurations (Engine, Ladder, Rescue, Heavy Rescue, Squad). Import in one action. The federal chief-level roster (app-ic-day, app-osc-2/3, app-fasc-1, app-rescue-branch, etc.) deferred to Federal Future.

### 3F.2 — Storage trim UI (L2)

"Cache full" banner with "Clear archived ops cache" button.

### 3F.3 — Print stylesheet (BC L3)

CSS `@media print` rules for ICS-201/203 hardcopy.

### 3F.4 — WCAG AA contrast + touch-target audit (IP-015, IP-055)

WCAG AA contrast audit across all 7 status pills in both light and dark modes + WCAG 2.5.5 AAA 44×44px touch-target audit (Quick Find fraction select specifically flagged).

### 3F.5 — Reactive count cards (IP-030)

Count cards subscribed to local-first state stream — eliminate the ~30s debounce after programmatic mutation observed in Surfside TTX-2. Useful at any scale.

### 3F.7 — Inventory quick-view FAB on Quick Find (IP-053)

Add a floating "View inventory" button on the Quick Find tab so users can check apparatus stock without tab-switching.

### 3F.8 — Combined Start-Op + first SP modal (IP-054)

A single modal that creates the operation AND adds the first SP. Reachable in ≤2 taps from cold start. Pairs with Phase 3B.3 (Quick-start "first-due" mode).

**Deferred to Federal Future:**
- 3F.6 — Bulk-deploy mode (range + load + cluster batch suggest) — designed for 220+ SP federal scenarios (Surfside TTX-2 measured 45–60s/SP friction at that scale)
- 3F.9 — Virtualization on Operations SP list + Inventory apparatus selector + find-struts memoization cache invalidation — premature for local scale (5–20 SPs per operation)
- Canonical chief-level apparatus roster (app-ic-day/night, app-osc-2/3, app-psc-2, app-lsc-2, app-fasc-1, app-rescue-branch, app-search-group, app-shoring-group, app-heavy-rigging-group, app-medical-unit, app-demob-ul, app-doc-ul, app-eoc-liaison) — federal scale

## Phase 3G — v3.11.2 release-blocker hotfix (scale-agnostic)

> **Scope narrowed 2026-05-17.** The original Phase 3G ingested the Surfside TTX-2 federal hotwash. With the local-first reframe, only the scale-agnostic release-blocker bugs ship in v3.11.2. Every federal-scope finding has been moved to the "Federal Future" section below this phase — nothing is deleted, just resequenced.
>
> Surfside TTX-2 background (preserved for traceability): 4 OPs × 36 simulated hours, peak 494 personnel, 66 shore points, 12 live extractions + 4 recoveries, 5 IC transfers + 6 OSC rotations. 63 catalogued findings. Full record: `.claude/simulations/surfside-ttx-2/hotwash/` — see `improvement-plan.md` (63 IP rows), `v4.0.0-gap-analysis.md` (1:1 mapping to MASTER-PLAN with deltas), `final-report.md` (executive summary).

### 3G.0 — v3.11.2 PATCH (release-blocker bugs only)

These are regression-class bugs that affect users at any scale. Ship as v3.11.2 PATCH before any v4.0.0 phase code begins. Total scope: ~1 week.

- [ ] **Add-SP modal Save Changes button visibility** — button hidden in Add path until find-struts flow runs; bypassed via programmatic `db.ref().push() + persistOperation()` during Surfside TTX-2. Add visibility integration test asserting `submit.offsetParent !== null && getComputedStyle(submit).display !== 'none'`. *Source: IP-007, severity critical.*
- [ ] **`estimatedLoad` numeric coercion** — UI dropdown labels are string `'medium'`/`'heavy'` but `database.rules.json` validate rule requires numeric. Add string→numeric coercion in `addShorePoint()` + inline form hints + API-contract doc. *Source: IP-011, severity critical.*
- [ ] **`guardClick` first-submit regression** — swallowed first submit silently. Fix or surface toast confirmation. *Source: IP-010, severity critical.*
- [ ] **Apparatus naming uniqueness validator** — "Engine-1" naming collision risk; no validation. Add canonicalized base-name collision rejection within a department. *Source: IP-033, severity critical.*
- [ ] **24-hour timestamp audit** — `toLocaleString()` / `toLocaleTimeString()` defaults to 12h; fire-ground context generally uses 24h. Replace app-wide with `{hour12: false}`. *Source: IP-034, severity high.*
- [ ] **`renderOrgChart` defensive hardening** — default `roleAssignments` to `{}` on entry. Visual-layout regression test at parentId depth 4. *Source: IP-047, severity high.*
- [ ] **Start-Op modal apparatus checkbox eager render** — list rendered empty on first open. Render synchronously before modal opens. *Source: IP-048, severity high.*

### Phase 3G verification additions

| Phase | Verification |
|---|---|
| 3G.0 / IP-007 | Save Changes button visible in Add path on first open of Add-SP modal; integration test asserts visibility |
| 3G.0 / IP-010 | First submit on Add-SP form is accepted; no silent swallow |
| 3G.0 / IP-011 | `estimatedLoad` numeric coercion accepts string `'medium'` from UI and persists numeric (no `PERMISSION_DENIED`) |
| 3G.0 / IP-033 | Adding apparatus with collision name (case-/whitespace-normalized) is rejected with toast |
| 3G.0 / IP-034 | All app-wide timestamp surfaces (Command tab, SP cards, cut table, role history) render 24h |
| 3G.0 / IP-047 | `renderOrgChart` callable with undefined `roleAssignments` without crash; depth-4 nested tree renders |
| 3G.0 / IP-048 | Apparatus checkboxes visible on first open of Start-Op modal (no empty list) |

---

## Federal Future — deferred from v4.0

> **Added 2026-05-17.** This section catalogs every federal-scope item moved out of v4.0.0 by the local-first reframe. Nothing is deleted; the federal-scale work folds into v4.1 / v4.2 (PWA) or v5.x (post-React-Native cutover), driven by field demand. Surfside TTX-2 IP IDs preserved for traceability against `.claude/simulations/surfside-ttx-2/hotwash/improvement-plan.md`.

### Federal Future — Auth + Multi-tenancy (deferred from Phase 3A + 3B)

| Item | Source | Severity | Rationale for defer |
|---|---|---|---|
| Multi-agency identity model (per-actor `agency` field, agency badges, agency hash-to-color palette) | N5, IP-002, IP-003 | High | Single municipal dept = single agency. Multi-agency adds setup friction with no local benefit. |
| `/operations/{opId}` global namespace migration (cross-dept op sharing) | N5, N6, C1, X10 | High | Federal-IST + multi-TF coordination need; local FDs don't share operations across departments. |
| Per-agency write scope in security rules (federal-IST read-only on local-FD inventory, local-FD cannot write to TF-State cache) | IP-001, IP-004 | Critical | Federal scope only — local FDs trust all dept members equally for writes. |
| Unified Command IC[] collection at org chart root (multiple ICs from different agencies) | N6 | High | Local incidents have a single IC >95% of the time. |
| Agency badges on apparatus chips | N5, IP-002 | Medium | Single agency = same color everywhere; the visual would be noise. |
| Agency filter + agency-coverage report (struts/deployments/demob per agency) | IP-003 | High | Federal coordination tool. |

### Federal Future — NIMS Type I/II + Full FEMA (deferred from Phase 3C)

| Item | Source | Severity | Rationale for defer |
|---|---|---|---|
| Type I FEMA Command + General Staff preset (Liaison, PIO, FASC, Branch Directors, Group Sups, all Unit Leaders) | N1, N13, IP-022 | High | Bloats org chart for first-due IC. Architecture supports adding the preset back; roles available as custom roles in the meantime. |
| Type II preset (5 Sections + Command Staff + Staging) | N1, IP-014 | High | Federal/state task force scale. |
| Finance/Admin Section Chief + Cost UL + Time UL + Procurement UL + Comp/Claims UL in default presets | IP-005 | Critical | Federal billing/admin staff. Local FDs don't run a 5th Section. |
| Staging as first-class node under OSC + Released terminal state for apparatus | IP-018 | High | Federal Type III+ staffing flow. |
| "Choose ICS Template" selector for Type I/II (wired into Start-Op modal) | IP-014 | High | Type IV/V default + Type III optional sufficient for local scale (delivered in Phase 3C.1). |
| App-owned OP-boundary snapshot emission + "writes since last snap" diff surface | N3, IP-026 | High | Multi-OP federal forensic feature; local incidents rarely run a second OP. |
| Operations-tab OP-indicator badge + "Now entering OP N" transition banner | IP-016 | High | Same — multi-OP only. |
| Full FEMA demob lifecycle (proposed → reviewed → approved → executing → released) + per-resource demob status + cache-decon prereq tracking + drag-orderable release-sequence plan | C8, N11, IP-008 | Critical | Federal demob runs as a multi-day formal process; local FDs demob via "put it back on the rig." Single-step demob ships in Phase 3C.4. |
| Individuals-level check-in/check-out + Time UL surface with shift tracking | IP-019 | High | Federal staffing accountability. Local FDs use radio + accountability tags. |
| "X apparatus, Y personnel" rollup in Command-tab header | IP-021 | Medium | Federal accountability scale. |
| Cribbing audit lifecycle (`lastInspected`, `cribbing_status` enum, `auditHistory[]`, Cribbing Audit view filtered by time-since-last-inspection) | IP-009 | Critical | Federal forensic doctrine — multi-day operations with audit cycles. Local FDs inspect via radio + visual check. |
| Operation-level safety state (`operating | paused-weather | paused-hazard | paused-PAR`) + per-SP `paused` status + SafetyEvent log | IP-032 | High | Local FDs handle weather/hazard pauses via radio. |
| Victim locator / `linkedVictim` / `victimCluster` fields on SPs + Victim Locator view | IP-038 | High | Federal rescue-to-shoring linkage tracking; out of scope for local Type IV/V. |
| Multi-role assignment per individual at NIMS Type I span <7 (eliminate shadow-individual workaround for FASC+Cost UL double-hat) | IP-040 | High | Federal Type I problem — at local scale, multi-holder render (delivered in Phase 3C.6) covers the use cases. |

### Federal Future — ICS forms beyond 201/203 (deferred from Phase 3D)

| Item | Source | Severity | Rationale for defer |
|---|---|---|---|
| ICS-202 (incident objectives) | IP-024 | High | Multi-OP planning artifact. |
| ICS-204 (assignment list per branch/group) | N4 | High | Type III+ branch/group structure. |
| ICS-205 Comms Plan (Command/Tactical/Support/Air-to-Ground/Emergency Traffic frequencies + per-role `nets: []` binding) | IP-025 | High | Federal radio plan; local FDs use single fireground freq. |
| ICS-207 (org chart visual export) | IP-024 | High | Useful at federal scale; v4.0.0 covers via ICS-203 PDF org section. |
| ICS-208 (Hazards register — operation-level + per-SP with timestamps, owner, mitigation, last-verified) | IP-036 | High | Federal Safety Officer tool. |
| ICS-209 SitStat single-screen view (<60s load for incoming IST: pile status, recent rescues, weather/hazards, priorities, command staff, apparatus/personnel counts) | IP-037 | Critical | Federal IST handoff tool. Local IC handoffs are verbal + ICS-201. |
| ICS-211 (check-in list — pairs with individuals-level check-in) | N4 | High | Federal personnel accountability. |
| ICS-215 (planning worksheet) | N4 | High | Multi-OP shift planning. |
| Role-history export + external-equipment deployment-history export bundled into AAR | IP-024 | High | Append-only role-history data model lands in Phase 3C.5; the export packaging is federal AAR scale. |
| Apparatus-level `.struts` rollup materialized via listener (LSC reads cache totals from apparatus chip) | IP-043 | Medium | Federal cache-management tool. |

### Federal Future — Strut algorithm + Hardening (deferred from Phase 3E + 3F)

| Item | Source | Severity | Rationale for defer |
|---|---|---|---|
| Bulk-deploy mode (range + load + cluster batch suggest) targeting <15s/SP at scale | IP-031 | High | Designed for 220+ SP federal scenarios (Surfside TTX-2 measured 45–60s/SP friction at that scale). Local incidents have 5–20 SPs total. |
| Virtualization on Operations SP list + Inventory apparatus selector + find-struts memoization cache invalidation | IP-056 | Medium | Premature at local scale. Revisit when single-op SP counts exceed ~100. |
| Canonical chief-level apparatus roster bundle (app-ic-day/night, app-osc-2/3, app-psc-2, app-lsc-2, app-fasc-1, app-rescue-branch, app-search-group, app-shoring-group, app-heavy-rigging-group, app-medical-unit, app-demob-ul, app-doc-ul, app-eoc-liaison) | IP-039 | High | Federal task-force chief staffing. v4.0.0 ships local-apparatus bundles (Engine/Ladder/Rescue/Heavy/Squad). |
| `/diagnostics/sync` admin-readable rule | IP-058 | Low | Federal multi-agency diagnostics surface. |
| Stale `fieldstruts_*` localStorage cleanup during v3→v4 migration | IP-060 | Low | Belongs to the migration script regardless of scope. Can land in v4.0.0 if zero-cost. |

### How Federal Future folds back in

Federal-scope items reactivate when one of these triggers fires:
1. **Field demand from a federal/state task force** — e.g., a TF requests multi-agency support, multi-OP support, or full FEMA Type I preset.
2. **v5.x React-Native cutover** — the monorepo migration is a natural seam to introduce the federal-scope schema (`/operations/{opId}` global namespace) without churning the v4.x PWA users.
3. **Surfside TTX-3 (or similar federal exercise)** — re-run the federal hotwash against the v4.x codebase to validate what local-first leaves on the table.

See `.claude/plans/v4.0-to-v5.0-roadmap.md` for the React-Native phasing and the 19-reviewer audit context.

---

## Verification matrix for v4.0.0 (local-first)

> **Updated 2026-05-17.** Federal-scope verifications (multi-agency badges, Type II Unified Command IC[], ICS-211, full ICS bundle) moved to Federal Future. The matrix below covers v4.0.0 local-scale scope only.

| Phase | Verification |
|---|---|
| 3A.1 | After install, prompted for display name. Refresh persists identity. No `agency` prompt. |
| 3A.2 | All Firebase writes include `_meta: { byUid, at }`. Validate rule rejects writes missing `_meta.byUid`. |
| 3A.3 | Attempt to write to `/departments/dept-X/inventory/...` from a uid not in `dept-X/members` → permission denied. SP-status write attempted by uid not assigned to `operations` / `ic` / `safety` role → permission denied. |
| 3B.1 | First launch lands on Operations tab with Type IV/V default org chart preset (IC + Safety + collapsible Operations). |
| 3B.2 | Selecting "Car into building" preset at op start pre-populates: medium load default, single building, T-Shore + Double-T as shore-type chip suggestions. |
| 3B.3 | "Start First-Due" button from empty Operations tab home → user lands in active operation in ≤2 taps with auto-named Engine + IC role self-assigned. |
| 3B.4 | Solo IC with one apparatus configured → Start-Op modal collapses to "I am IC" toggle + default name. Multi-apparatus inventory → full Start-Op modal returns. |
| 3C.1 | "Choose ICS Template" → "Type III local" → org chart populates with Planning, Logistics, Rescue Branch, Shoring Group. No Type I/II option visible. |
| 3C.2 | Attempt to drag Safety under Operations → blocked with NIMS doctrine warning. |
| 3C.3 | Click "Start New OP" → OP 1 snapshot saved to `operationalPeriods[0]`, OP 2 badge appears on Command page. |
| 3C.4 | Demobilize Engine 1 → apparatus visually muted but visible in op history. Single-step demob (no proposed/reviewed/approved gate). |
| 3C.5 | IC transfer A → B → A (3 transitions) → "View role history" surfaces all 3 with timestamps + actors (byUid). |
| 3C.6 | One individual holding both IC and Safety renders at both nodes with "multi-holder" badge. |
| 3C.7 | Status pill labeled `'Strut Set'` (not `'Strut Placed'`). SP form shows Building dropdown + Division (A/B/C/D) + notes field + `assignedResource` dropdown (not `group`). Existing v3.x data migrates with `sp.group` → `sp.assignedResource`. |
| 3C.9 | Custom role "Apparatus Officer" assigned to 3 individuals → delete role → supersede prompt offers reassignment dropdown. |
| 3D.1 | End operation → "Export Report" → ZIP downloads with `ICS-201_briefing.pdf` + `ICS-203_org_period_1.pdf` + `shore_points_timeline.xlsx`. No ICS-205/208/209 in bundle. |
| 3E.2 | Strut result with margin ≥30% renders green, 15–30% amber, <15% red. |
| 3E.3 | Required qty > 4 result surfaces as "requires-multiple-struts" through both Quick Find and Deploy modal. |
| 3E.6 | Push to main → CI runs 5-query smoke deck (132"/15klb, 24"/8klb, 200"/5klb, 96"/25klb, 120"/200klb) against `findStrutCombinations`. Regression on any deviation. |
| 3F.4 | All 7 status pills pass WCAG AA 4.5:1 contrast in light + dark modes. Quick Find fraction select has ≥44×44px tap target. |
| 3F.5 | Programmatic SP creation reflects in count cards within 1 frame (no debounce). |
| 3F.8 | Cold start → tap Operations → "Start First-Due" reachable; combined modal opens "Add First SP" form after op creation in same flow. |

---

# Release 4+: v4.1+ Federal Future + deferred polish

**v4.1+ priorities (in rough order of likelihood):**
1. **Federal Future fold-in** — work from the "Federal Future" section above, prioritized by field demand. Multi-agency auth, Unified Command IC[], full FEMA Type I/II presets, ICS-205/208/209, full demob lifecycle, bulk-deploy mode, virtualization, cribbing audit lifecycle, victim locator. Each of these is a candidate for a v4.1 / v4.2 minor depending on which task force / federal incident drives the need.
2. **v5.x React-Native cutover** — the monorepo migration described in `.claude/plans/v4.0-to-v5.0-roadmap.md`. Federal Future items may roll forward into v5.0 instead of being backported to v4.x PWA, depending on the cutover timeline.

**Deferred polish (low-impact, time-permitting):**
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
- v3.11.2: Backward compatible. Bug fixes + numeric coercion + uniqueness validator + 24h timestamp surfaces. No schema changes.
- v3.12.0: Backward compatible. Type IV/V default + scenario presets + schema dual-write (new SPs persist both `sp.group` and `sp.assignedResource` to ease the v4.0 cutover).
- v4.0.0: **Breaking, but narrow.** Migration required:
  - `assignedApparatus: []` → `{}` of objects (single-step demob status; no full FEMA lifecycle)
  - `sp.group` → `sp.assignedResource` (after v3.12.0 dual-write, the cutover is no-op for new data)
  - `customRoles` array → keyed object (continuation of v3.6.0 leftover)
  - Per-write `_meta: { byUid, at }` injected on every Firebase set
  - Per-device UID via Anonymous Auth (already in place since v3.7.0; v4.0.0 promotes UID to a first-class identity)
  - Migration script runs at first v4 load
  - **NOT included:** `/operations/{opId}` global namespace cutover (deferred to Federal Future). Existing `/departments/{deptId}/operations/{opId}` layout preserved.

## Testing strategy

Per CLAUDE.md, there's no test harness. v3.6.0 should add at minimum:
- Manual checklist per phase (defined in verification matrix above)
- Smoke test before each release: full workflow walk-through (create op → add apparatus → add SPs → cut → runner → secure → return → end)

Future: invest in a Playwright-based smoke test that runs against the local dev server.

## Rollout

- v3.5.2 → as fast as feasible. Today.
- v3.6.0 → 4-6 weeks. Roll out via GitHub Pages auto-deploy. Service worker forces refresh.
- v3.11.2 → 1 week PATCH (release-blocker bugs).
- v3.12.0 → 1-2 weeks MINOR (Type IV/V default + local scenario presets + schema dual-write).
- v4.0.0 → 2-3 weeks (~5-6 weeks total for the train v3.11.2 + v3.12.0 + v4.0.0). Coordinated rollout: in-app banner 1 week ahead. Migration script logged via Firebase for monitoring. Have a v3.12.x branch standing by in case of regression.

## Communication

For each release, the GitHub release notes should call out:
- What was fixed and why
- Any behavioral changes (e.g., v3.5.2's "some configs that previously passed may now require additional struts"; v4.0.0's "default org chart is now IC + Safety + Operations only — Type I/II presets deferred")
- Any user actions needed (e.g., v4.0.0's "you'll be asked to set your display name; multi-agency identity is deferred to v4.1+")

---

# Single-file summary for Alex

If you only read one thing for v3.x: **v3.5.2 fixes the strut algorithm capacity over-report. Ship that today.** v3.6.0 followed in 4-6 weeks.

If you only read one thing for v4.0.0: **The 2026-05-17 local-first reframe.** v4.0.0 has been narrowed from federal/USAR/Type I-II scale to municipal-FD Type IV-V scale. Multi-agency auth, IC[], full FEMA presets, bulk-deploy, full demob lifecycle, ICS-205/207/208/209/211/215 — all moved to "Federal Future" (above). What ships: per-device UID + role-based scope, Type IV/V default org chart + scenario presets, NIMS terminology corrections, ICS-201/203 baseline export, scale-agnostic algorithm correctness. The canonical per-release plan is `.claude/plans/v4.0.0-plan.md`. The long-horizon companion (React-Native phasing) is `.claude/plans/v4.0-to-v5.0-roadmap.md`.
