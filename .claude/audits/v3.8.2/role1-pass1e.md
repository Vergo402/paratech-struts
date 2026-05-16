# Pass 1E — Error Path Analysis
**Auditor:** Senior Full-Stack Engineer (Opus)
**Date:** 2026-05-16
**Scope:** Failure modes and graceful degradation across the full app.js

## Summary

20 findings: 0 critical, 2 High, 5 Medium, 10 Low, 3 Info. The dominant pattern is **silent degradation** — errors caught and logged but not surfaced to the user, especially around auth and member registration. F-1E-1 (auth failure) and F-1E-2 (member-registration failure) can leave a user appearing online but losing all data with no warning. F-1E-5 (transactions dropped from offline queue) compounds these into plausibly silent data loss.

## Findings

### F-1E-1: `signInAnonymously()` failure silently strands the app
**Severity:** High
**Area:** `initFirebase()` lines 1241–1248

`firebase.auth().signInAnonymously().catch(err => console.warn(...))` logs to console only — no toast, no banner, no signal that auth never succeeded. The connection-status pill shows online (because `db.goOnline()` succeeded), but writes will silently fail. `onListenerError()` suppresses errors because `_authReady` is falsy.

**Fix:** Surface a persistent "Auth failed — running offline-only" banner when `signInAnonymously()` rejects. Add `_authFailed = true` flag so `setupListeners()` can fall back to local-only mode.

### F-1E-2: Member registration write at line 1325 has no `.catch()` or retry
**Severity:** High
**Area:** `setupListeners()` lines 1323–1326

`db.ref('departments/${deptId}/members/${uid}').set(true)` is fire-and-forget. If it fails (transient blip, rules race), every subsequent write is denied. `firebaseSave()` queues each write, but the underlying issue (missing membership) is never retried. After 3 retries per write, data is discarded silently.

**Fix:** Wrap member registration in `firebaseSave()` for offline queue + retry semantics. Block listener attach until registration succeeds.

### F-1E-3: `connStatus` element access is unguarded — TypeError if element removed
**Severity:** Medium
**Area:** `initFirebase()` lines 1251–1264

`const el = document.getElementById('connStatus'); el.className = ...` — if element is removed, every value event throws. Cascades because it fires on every reconnect.

**Fix:** `if (!el) return;` at top of listener.

### F-1E-4: `connRef` listener has NO error callback (unlike other 6 listeners)
**Severity:** Medium
**Area:** `initFirebase()` line 1251

Every other listener passes `onListenerError`. `connRef.on('value')` doesn't. Permission rule misconfiguration on root would cause uncaught console error and `isOnline` stays false.

**Fix:** Add `(err) => onListenerError('connection', err)` as third arg.

### F-1E-5: Failed transactions silently discarded — permanent local/remote drift
**Severity:** Medium
**Area:** `firebaseSave()` lines 829–863

When transaction fails, `transaction_failed` logs to diag but op is NOT added to `pendingWrites` (line 848: `if (method !== 'transaction')`). Used by `deployShorePoint` (3691, 3693, 3696, 3699), `returnInventoryItems` (4582, 4588, 4598, 4609). After 24h offline, the only record is in `logSyncEvent`.

**Fix:** For transactions, re-execute the handler on reconnect, OR re-derive desired post-state and queue a `set` with awareness of concurrent ops. (Cross-ref F-1C-3.)

### F-1E-6: `op.data = data` for `remove` operations
**Severity:** Low
**Area:** `firebaseSave()` line 849

For `remove`, `data` is undefined. `op.data = undefined` serializes as missing key. JSON round-trip loses the key. Currently no bug but brittle.

**Fix:** Skip `op.data = data` when method is `remove`.

### F-1E-7: `firebaseSave()` with `data === undefined` for `set`/`update` not validated
**Severity:** Medium
**Area:** `firebaseSave()` line 829

`ref.set(undefined)` in Firebase compat SDK performs a `remove`. No guard rejects undefined for non-remove methods. Slip-through becomes silent data deletion.

**Fix:** `if ((method === 'set' || method === 'update') && data === undefined) return Promise.reject(new Error('No data'));`

### F-1E-8: `findStrutCombinations()` doesn't validate inputs defensively
**Severity:** Medium
**Area:** `findStrutCombinations()` line 167

`NaN` measurement: `NaN < x` and `NaN > x` are both false → range check doesn't skip. Capacity computation cascades NaN. Renderer prints "NaN" / "NaN%" to user. Callers do validate, but algorithm is safety-critical core.

**Fix:** First lines: `if (!Number.isFinite(requiredLength) || requiredLength <= 0) return []; if (!Number.isFinite(estimatedLoad) || estimatedLoad < 0) return []; if (![0,1,2].includes(sfIndex)) return [];`

### F-1E-9: `getDeductions()` assumes DOM elements exist
**Severity:** Low
**Area:** `getDeductions()` lines 4999–5016

Toggle guard at line 5001 returns null if missing, but `parseFloat(document.getElementById(prefix + 'Header').value)` throws TypeError if any element is removed. User clicks Search and nothing happens.

**Fix:** Defensive lookup pattern with null fallback.

### F-1E-10: `exportInventory()` shows toast on XLSX failure but no fallback
**Severity:** Low
**Area:** `exportInventory()` line 4728

If CDN is blocked, user sees "Failed to load export library" toast and is stuck. No CSV fallback.

**Fix:** Offer CSV fallback when XLSX load fails — data is small and well-defined.

### F-1E-11: `handleImport()` uses blocking `alert()` for errors
**Severity:** Low
**Area:** `handleImport()` lines 4814–4891

(1) `alert()` can break iOS Safari modal context. (2) Missing required column shows generic "No valid inventory rows found" — user can't diagnose. (3) SheetJS errors show cryptic messages like "Unsupported ZIP comment".

**Fix:** Replace `alert()` with toast. Validate column names upfront. Catch SheetJS errors with friendly message.

### F-1E-12: `submitFeedback()` shows success alert before write completes
**Severity:** Low
**Area:** `submitFeedback()` lines 2089–2116

Line 2107 calls `firebaseSave(feedbackRef, 'set', entry)` and immediately calls `alert('Thank you!...')` — but the write may still fail and queue. User believes feedback submitted, but may never land.

**Fix:** Move success alert into `.then()` of `firebaseSave`. Honest offline message in `.catch()`.

### F-1E-13: `getIdToken(true).catch()` doesn't retry setupListeners
**Severity:** Medium
**Area:** `setupListeners()` lines 1310–1315

When `getIdToken(true)` succeeds, `setupListeners()` is called recursively. When it fails, `_authReady = true` but `setupListeners()` is NOT called again. Function bails. Listeners never attach.

**Fix:** Even on `getIdToken` failure, call `setupListeners()` recursively. Listeners will error with `permission_denied` and `onListenerError()` will surface it.

### F-1E-14: Multiple `JSON.parse()` outside `safeParse()`
**Severity:** Medium
**Area:** `deployShorePoint()` line 3569, `initCustomApparatusTypes()` line 1538, line 983

Most `JSON.parse` goes through `safeParse()`. Three bypass it (one is try/catch wrapped, two are deep-clone of constants — safe in practice but brittle).

**Fix:** Replace `JSON.parse(JSON.stringify(X))` with `structuredClone(X)` — faster and avoids parse throw scenario.

### F-1E-15: `endOperation()` triggers full re-render per shore point
**Severity:** Low
**Area:** `endOperation()` lines 4645–4671

50 shore points = 100 full re-renders + 50 Firebase transactions racing. Freezes UI for seconds. (Cross-ref F-1B-04, F-1C-5, F-5B-13.)

**Fix:** `returnEquipmentBatch()` — process all locally, single Firebase update, single re-render.

### F-1E-16: `prompt()` calls — no validation, breaks on iOS PWAs
**Severity:** Low
**Area:** `addCustomRole()` 1133, `editCustomRole()` 1152, `addApparatusType()` 1552, `renameApparatusType()` 1565

`prompt()` is blocking, ugly on mobile, fails on iOS PWAs with prompts disabled. Returns null silently → role/type not added, no error.

**Fix:** Replace with in-page modal pattern (already exists for `showAddRoleMenu()`).

### F-1E-17: Service worker registration failure silent
**Severity:** Low
**Area:** `init()` line 5251

SW register `.catch()` only logs. If SW fails (file://, CSP, 404), app loses offline support. User won't notice until offline.

**Fix:** One-time toast: "Offline support unavailable — verify HTTPS."

### F-1E-18: `_lastFocusedElement.focus()` may fail silently if element removed
**Severity:** Low
**Area:** `closeModal()` lines 2028–2031

If element was removed from DOM while modal was open, `focus()` on detached element does nothing. Screen-reader users stranded.

**Fix:** Check `document.contains(_lastFocusedElement)` before focusing. Fall back to trigger button or sensible default.

### F-1E-19: `flushPendingWrites()` legacy transaction entries fall through
**Severity:** Medium
**Area:** `flushPendingWrites()` lines 894–910

`else { failed.push(op); continue; }` catches transaction-method ops without incrementing retries. Legacy queued transactions from old versions retry infinitely (24h check would catch them, but retry counter doesn't advance).

**Fix:** Discard transaction entries in the else branch instead of pushing to failed.

### F-1E-20: `handleLogin()` and `connectDepartment()` silently swallow empty input
**Severity:** Low
**Area:** `handleLogin()` line 1270, `connectDepartment()` line 1280

`if (!id) return;` — user sees no feedback, thinks app is broken.

**Fix:** `if (!id) { showToast('Department ID can only contain letters, numbers, and dashes', 'warning'); return; }`

---

## Severity Summary

| Severity | Count | IDs |
|----------|-------|-----|
| Critical | 0 | — |
| High | 2 | F-1E-1, F-1E-2 |
| Medium | 5 | F-1E-3, F-1E-4, F-1E-5, F-1E-7, F-1E-8, F-1E-13, F-1E-14, F-1E-19 |
| Low | 10 | F-1E-6, F-1E-9, F-1E-10, F-1E-11, F-1E-12, F-1E-15, F-1E-16, F-1E-17, F-1E-18, F-1E-20 |
| Info | 3 | (verified architectural patterns: `safeParse`, `safeSetItem`, `onListenerError`) |
