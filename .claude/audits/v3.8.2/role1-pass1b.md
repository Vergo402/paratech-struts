# Pass 1B — State Management & Firebase Integration

**Auditor:** Senior Full-Stack Engineer (Opus)
**Date:** 2026-05-16
**Scope:** Lines 650-1600+ (full file traced for mutation paths), state management and Firebase
**Version under audit:** v3.8.2

## Summary

Audited all data mutation paths, Firebase integration points, and state management patterns across the full 5,291-line `app.js`. The local-first architecture introduced in v3.5.3 is well-implemented across the vast majority of mutation sites. `firebaseSave()` correctly handles queueing, version-tagged retries, and transaction failure logging. The diagnostic system is safely isolated from the write path.

**13 findings: 1 High, 5 Medium, 5 Low, 2 Info.** No critical (safety-impacting) findings.

## Findings

### F-1B-01: `.info/connected` listener is never detached
**Severity:** High
**Area:** `initFirebase()` line 1250, `teardownListeners()` line 1292

The `.info/connected` listener is attached via a function-scoped `const connRef` inside `initFirebase()`. This ref is never stored at module scope, so `teardownListeners()` cannot detach it. All 6 other data listeners (`inventoryRef`, `activeOpsQuery`, `archivedOpsQuery`, `apparatusRef`, `settingsRef`, `customTypesRef`) are properly detached. Since `initFirebase()` is only called once today, this doesn't cause duplicate listeners in practice. But it's architecturally inconsistent and would become a real leak if auth re-init were added.

**Fix:** Promote `connRef` to module scope and add `if (connRef) connRef.off();` to `teardownListeners()`.

### F-1B-02: Member registration bypasses `firebaseSave()`
**Severity:** Medium
**Area:** `setupListeners()` line 1325

`db.ref('departments/${deptId}/members/${uid}').set(true)` is a direct Firebase SDK call with no `.catch()`, no offline queueing, no retry. If it fails (network issue, permission denied), the error is an unhandled promise rejection. Since security rules may require `members/{uid} === true` for writes, a silently failed registration could cause all subsequent writes to fail.

**Fix:** Route through `firebaseSave()` for error handling and offline queueing.

### F-1B-03: Race between member registration and listener attachment
**Severity:** Medium
**Area:** `setupListeners()` lines 1323-1341

Member registration at line 1325 is fire-and-forget. Listener setup begins immediately after at line 1328. If security rules require membership for reads, listeners could fire before the membership write propagates. Firebase's single-connection ordering makes this work in practice, but it's not a guaranteed API contract.

**Fix:** Either await the registration or document that reads don't require membership.

### F-1B-04: `endOperation()` redundant persist/render — O(N) performance
**Severity:** Medium
**Area:** `endOperation()` line 4645

Calls `returnEquipment(sp.id)` per shore point in a loop. Each invocation calls `persistOperation()`, `persistInventory()`, `renderInventory()`, and `renderOperations()`. For 20 un-returned shore points, this is 40 localStorage writes and 40 DOM re-renders.

**Fix:** Use `returnEquipmentSingle(sp)` (line 4616) in the loop, then call persist/render once after.

### F-1B-05: `deleteArchivedOp()` skips localStorage persist
**Severity:** Medium
**Area:** `deleteArchivedOp()` line 3369

Removes from in-memory `archivedOperations` and fires Firebase remove, but never persists locally. Archived ops are online-only (populated only via Firebase listeners, never restored from localStorage). This is a design gap — the archive feature doesn't work offline at all.

**Fix:** Accept as known limitation and document, or add localStorage persistence for archived ops.

### F-1B-06: `_authReady` monkey-patched onto Firebase Auth object
**Severity:** Medium
**Area:** `setupListeners()` lines 1306-1314, `onListenerError()` line 1287

Custom `firebase.auth()._authReady = true` property on the Auth singleton is not a documented Firebase API. Works today but is fragile — a Firebase SDK update could shadow this property.

**Fix:** Use a module-scope `let authReady = false;` instead.

### F-1B-07: Full Firebase URLs stored in `pendingWrites`
**Severity:** Low
**Area:** `firebaseSave()` line 847, `flushPendingWrites()` line 896

`op.path` stores `ref.toString()` (full URL). Reconstruction via string replacement works but is fragile if the database URL changes. Mitigated by 24h MAX_AGE.

**Fix:** Store relative paths at enqueue time.

### F-1B-08: Feedback offline `pendingWrites` entry missing `appVersion`
**Severity:** Low
**Area:** `submitFeedback()` line 2112

Manual pending write construction omits `appVersion`, bypassing the version-mismatch discard logic. A stale feedback write from an old version could be replayed.

**Fix:** Add `appVersion: APP_VERSION`.

### F-1B-09: Diagnostic system correctly avoids recursion
**Severity:** Info
**Area:** `logSyncEvent()` line 802, `flushSyncDiagBuffer()` line 821

Uses direct `db.ref().push()` with `.catch(() => {})`. Buffer capped at 50 entries. Best-effort, never crashes. Well-implemented — no fix needed.

### F-1B-10: `setTheme()` uses raw `localStorage.setItem`
**Severity:** Low
**Area:** line 4716

Has its own try/catch but doesn't use `safeSetItem()`. Theme is non-critical. Negligible impact.

### F-1B-11: `localStorage.removeItem()` calls not try/catch wrapped
**Severity:** Low
**Area:** 6+ locations (lines 917, 2291, 2318, 2458, 3405, 4668)

Theoretical risk in restricted browsing contexts. Negligible in modern browsers.

### F-1B-12: `sendToRunner()`/`markCutDone()` Firebase before localStorage persist
**Severity:** Low
**Area:** lines 4412-4417, 4435-4440

Firebase call fires before `persistOperation()`. No practical impact since `firebaseSave()` is async and `persistOperation()` is sync.

**Fix:** Swap order for stylistic consistency.

### F-1B-13: Grouped shore point updates fire N individual Firebase writes
**Severity:** Info
**Area:** `updateShoreStatus()` line 3735

Could use multi-path `update()` for efficiency but would complicate offline queueing. Optional optimization.

---

## Comprehensive Local-First Verification

**30 mutation sites traced.** 29/30 follow the in-memory → localStorage → Firebase pattern correctly. 1 partial (`deleteArchivedOp` — missing localStorage persist, see F-1B-05).

All other verification areas passed:
- `firebaseSave()` — all 4 methods, error handling, queueing, diagnostics
- `flushPendingWrites()` — retry logic, age/version discard, error capture
- `persistOperation()`/`persistInventory()` — confirmed as sole write points
- All 6 Firebase listeners have error callbacks
- `teardownListeners()` detaches all 6 data listener refs (missing connRef per F-1B-01)
- `safeSetItem()` covers all significant localStorage writes
- Connection state tracking and flush-on-reconnect confirmed
