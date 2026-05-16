# Pass 1D — Reverse-Trace UI → Data
**Auditor:** Senior Full-Stack Engineer (Opus)
**Date:** 2026-05-16
**Scope:** Every onclick/onchange/oninput handler in `index.html` (~80 handlers) traced to terminal Firebase writes / localStorage persists

## Summary

22 findings: 0 Critical, 4 High, 7 Medium, 8 Low, 3 Info. Highest-priority items:
- **F-1D-1** Orphan role assignments survive role deletion in Firebase
- **F-1D-2** Excel extension import silently rejected by security rules (missing `model` field — same class of bug as v3.8.2 fix)
- **F-1D-10** Member-set bypasses retry queue (offline-first failure mode)
- **F-1D-16** `applyImportData` wholesale replace destroys deployed references

## Findings

### F-1D-1: `removeCustomRole` leaves orphan role assignments in Firebase
**Severity:** High
**Area:** Org chart "Remove" → `removeCustomRole(roleId)` → `saveCustomRoles()`

When a custom role is deleted, function deletes assignments in `activeOperation.roles` locally but `saveCustomRoles()` writes ONLY `customRoles`, never `roles`. Listener replays old `roles` from Firebase, recreating ghost assignments to non-existent role.

**Fix:** Also call `firebaseSave(operationsRef.child(id).child('roles'), 'set', activeOperation.roles)` or per-key remove.

### F-1D-2: Excel inventory import silently rejects extension items
**Severity:** High
**Area:** Settings → Import Excel → `handleImport()` → `applyImportData()`

Extension items constructed WITHOUT `model` field. Security rule on `inventory/$itemId` requires `hasChildren(['model', 'quantity', 'available'])`. Firebase rejects with PERMISSION_DENIED. `firebaseSave` only logs to console + queues. User sees "Inventory imported successfully" but all imported extensions silently disappear from Firebase.

**Fix:** Add `model: ''` to extension item shape (matches `quickAdd` line 1994). Or update validate rule to make `model` conditional on `type === 'strut'`.

### F-1D-3: Workflow status-advance buttons lack `guardClick()` protection
**Severity:** Medium
**Area:** Shore-point cards → `updateShoreStatus()`

Status-advance/regress buttons call directly without `guardClick()`. Rapid double-taps fire Firebase `update` twice. Worse: between taps, group-vs-individual logic in `updateShoreStatus` may operate on different `members` set.

**Fix:** Wrap with `guardClick(this, () => updateShoreStatus(...))`. Same for `editShorePoint`, `deleteShorePoint`, `assignEquipmentToPending`.

### F-1D-4: `deleteShorePoint` doesn't call `renderInventory()` after equipment return
**Severity:** Medium
**Area:** Shore-point ✕ → `deleteShorePoint(spId)` → `returnInventoryItems()` → no `renderInventory()`

Calls `returnInventoryItems`, `persistInventory()`, `renderOperations()` — but never `renderInventory()`. Inventory display stale until next render trigger.

**Fix:** Add `renderInventory()` after `persistInventory()` (line ~4552).

### F-1D-5: `quickAdd` new-item path doesn't render inventory until modal closes
**Severity:** Low
**Area:** Add Equipment grid → `quickAdd()` → `persistInventory()` → `showAddEquipment()`

Modal grid redraws via `showAddEquipment()` but Inventory tab body doesn't render until `closeModal()` fires `renderInventory()`. Quick View panel stays stale if open.

**Fix:** Add `renderInventory()` after `persistInventory()` in new-item branch.

### F-1D-6: `closeModal('shorePointModal')` doesn't reset `editingShorePointId`
**Severity:** Medium
**Area:** Shore-point modal Cancel → `closeModal()`

`editingShorePointId` cleared in `confirmEditShorePoint` and `showAddShorePoint` but NOT in `closeModal`. Same gap for `editingExternalId`, `editingIndividualId`.

**Fix:** In `closeModal`, reset editing state per-modal. Also reset button visibility.

### F-1D-7: `clearRole()` for self leaves stale `fieldstruts_myRoleName`
**Severity:** Low (privacy)
**Area:** Role modal "Clear" → `clearRole()`

Removes `fieldstruts_myRole` but not `fieldstruts_myRoleName`. Next user on shared device sees prior responder's name in modal.

**Fix:** Add `localStorage.removeItem('fieldstruts_myRoleName')` in self-branch. Also in `confirmStartOp`.

### F-1D-8: `endOperation` doesn't call `renderInventory()` after wiping availability
**Severity:** Medium
**Area:** End op → `endOperation()`

Restores all `available = quantity` and writes Firebase, but closing render is `renderOperations()` only.

**Fix:** Add `renderInventory()` (cross-ref F-1C-6, F-1B-04).

### F-1D-9: `endOperation` causes O(n²) renders during SP loop
**Severity:** Medium
**Area:** `endOperation()` SP loop

Per SP: `persistOperation` + `persistInventory` + `renderInventory` + `renderOperations`. 100-SP op = 400 renders + 100 localStorage writes + UI flash. (Cross-ref F-1B-04, F-1C-5.)

**Fix:** Bulk-return loop; single persist+render at end; batched Firebase update.

### F-1D-10: Member registration bypasses `firebaseSave` retry queue
**Severity:** High
**Area:** `setupListeners()` line 1325 — `db.ref('.../members/${uid}').set(true)`

Member-set gates ALL reads/writes via security rules but fires raw — no offline queue, no retry, no `.catch`. Offline registration silently rejected; on reconnect, all reads denied. User locked out until fresh `setupListeners()`.

**Fix:** Wrap in `firebaseSave(...)` for queue + retry. Cross-ref F-1B-02, F-1E-2.

### F-1D-11: `submitFeedback` reads `fieldstruts_deptName` which is never written
**Severity:** Low
**Area:** Feedback Submit → `submitFeedback()` line 2100

`saveSettings()` writes `fieldstruts_settings`, not `fieldstruts_deptName`. So `entry.deptName` always `null`. Feedback dashboard triage impaired.

**Fix:** Read from parsed settings: `const settings = safeParse(localStorage.getItem('fieldstruts_settings'), {}); deptName: settings.name || null`.

### F-1D-12: `submitFeedback` no-db branch leaves modal open
**Severity:** Low
**Area:** Feedback Submit no-db path lines 2110-2115

If Firebase init failed, modal stays open over alert. User may resubmit creating duplicate queued entries.

**Fix:** Add `closeFeedbackModal()` after the else-branch alert.

### F-1D-13: `confirmStartOp` doesn't reset `opMultiBuilding` checkbox
**Severity:** Low
**Area:** Start Op modal → `confirmStartOp()` line 3418-3419

Resets `newOpName` and `newOpTaskForce` but not `opMultiBuilding`. Checkbox state carries over confusingly.

**Fix:** `document.getElementById('opMultiBuilding').checked = false;`

### F-1D-14: `quickAdd` mints Firebase keys inconsistently
**Severity:** Low
**Area:** `quickAdd()` line 2002

`item.id = (db && inventoryRef) ? inventoryRef.push().key : ('local-' + ...)`. Local-format IDs become Firebase keys with non-standard format. Works but inconsistent.

**Fix:** Migrate local-IDs to push-keys on first sync.

### F-1D-15: `saveSettings` doesn't update `deptName` for feedback
**Severity:** Low

Related to F-1D-11. DOM updates correctly but feedback lookup still wrong until F-1D-11 fix.

### F-1D-16: `applyImportData` wholesale-replaces inventory, breaks deployed references
**Severity:** High
**Area:** Settings → Import Excel → `applyImportData(data)` line 4895

`localInventory = data.map(...)` replaces entire array. If user filters out deployed rows in Excel, those items vanish from inventory but stay deployed. `returnInventoryItems` later finds nothing locally.

**Fix:** Pre-import, gather all `deployedStrut.inventoryId` + extensions + plates across active operations. Block import if any missing, or merge missing items preserving deployed counts.

### F-1D-17: `assignOrgChartRole` for 'self' doesn't render Operations tab
**Severity:** Low
**Area:** Org chart → assign self → `assignOrgChartRole('self', roleId)`

Only calls `renderCommandView()`. "My Role" chip on Operations tab stays stale.

**Fix:** Add `renderOperations()` after `renderCommandView()`.

### F-1D-18: `customApparatusTypes` empty array silently treated as null
**Severity:** Medium
**Area:** customTypesRef listener line 1441

Empty array → `customApparatusTypes = null` → falls back to defaults. User's "no types" preference clobbered.

**Fix:** Track `_hasCustomTypes` flag to distinguish "explicit empty" from "no data".

### F-1D-19: `confirmEditShorePoint` may leave stale `effectiveLength`
**Severity:** Medium (safety-adjacent)
**Area:** `confirmEditShorePoint()` lines 4515-4519

`effectiveLength` only recalculated `if (updateData.deductions)`. If user clears deductions, field retains old value. Subsequent cut-length flow uses stale effectiveLength.

**Fix:** Always recalculate: `updateData.effectiveLength = updateData.deductions ? Math.round(...) : updateData.requiredLength;`

### F-1D-20: Status buttons don't refresh Cut Table view
**Severity:** Low
**Area:** `updateShoreStatus` → no `renderCutTableView()`

If user is on Cut Table view and clicks "→ Cutting" on a process SP, cut table doesn't re-render.

**Fix:** `if (currentView === 'cuttable') renderCutTableView();` after `renderOperations()`.

### F-1D-21: `saveLocalApparatus` is inconsistent third pattern
**Severity:** Info

Unlike `persistOperation`/`persistInventory`, `saveLocalApparatus` is local-only without Firebase call inside. Firebase calls scattered separately. Cognitive load.

**Fix:** Rename to `persistApparatus`. Document why Firebase is separate.

### F-1D-22: `cancelOrgMove` unreachable from any onclick
**Severity:** Info

Function exists but no UI affordance to invoke it. Only way to cancel a picked node is re-tap.

**Fix:** Either expose a Cancel button in org chart toolbar or document the flow.

---

## Cross-Cutting Observations

**`guardClick` coverage is inconsistent.** Protected: `endOperation`, `confirmAddApparatus`, `confirmStartOp`, `confirmAddExternal`, `confirmAddIndividual`, `saveSettings`, `submitFeedback`, `confirmEditShorePoint`, `deployPendingShorePoint`, `returnEquipment`.

Missing: `editShorePoint`, `deleteShorePoint`, `updateShoreStatus` family, `assignEquipmentToPending`, `removeApparatus`, `removeApparatusType`, `removeExternal`, `removeIndividual`, `removeApparatusGroup`, `deleteArchivedOp`, `clearRole`.

**Modal state cleanup is weakest area.** `closeModal()` is generic; doesn't reset `editing*Id` globals or form fields. Refactor opportunity: per-modal cleanup hooks.

**Local-first pattern is well-followed since v3.5.3.** One critical exception found: `db.ref(.../members/uid).set(true)` bypasses queue — gates security-rules access (F-1D-10).
