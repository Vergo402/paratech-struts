# Pass 5A+5B — Security + Resilience

**Auditor:** DevOps/Backend Engineer (Opus)
**Date:** 2026-05-16
**Scope:** Full codebase — app.js (~5292 lines), index.html (627 lines), sw.js (48 lines), database.rules.json (57 lines)
**App version under audit:** v3.8.2

---

## Security Findings (13 items: 0 Critical, 4 Medium, 2 Low, 3 Info, 4 Pass)

### F-5A-1: `escapeHtml()` used in HTML attribute value contexts — 3 sites
**Severity:** Medium (effectively High — actually exploitable)
**Area:** `editApparatus()` line 1659, `populateGroupDropdown()` lines 1742, 1747

`escapeHtml()` (line 669) does NOT escape `"` or `'`. Three call sites use it inside `value="..."` attributes:

- **Line 1659** (`editApparatus`): `value="${escapeHtml(app.name)}"` — `app.name` is user-entered. A name like `Test" onfocus="alert(1)` breaks out of the value attribute and injects an event handler. `validateInput()` does not strip `"`. **Highest priority fix.**
- **Line 1742** (`populateGroupDropdown`): `<option value="${escapeHtml(appId)}">` — appId is system-generated, low practical risk.
- **Line 1747** (`populateGroupDropdown`): `<option value="${escapeHtml(currentValue)}">` — currentValue can be legacy free-text.

**Fix:** Replace `escapeHtml()` with `escapeAttr()` at all three sites.

### F-5A-2: Unescaped `g.type` in innerHTML at line 3048
**Severity:** Low
**Area:** Apparatus group rendering

`${g.type || ''}` is rendered raw. The value comes from a constrained `<select>`, but a malicious Firebase write could inject HTML.

**Fix:** `${escapeHtml(g.type) || ''}`.

### F-5A-3: `plate.name`/`plate.height` unescaped at line 5153
**Severity:** Info
**Area:** Plate picker rendering

From hardcoded `BASE_PLATES[]` constants, not exploitable. Acceptable.

### F-5A-4: `showToast()` innerHTML pattern
**Severity:** Info
**Area:** `showToast()`

Fragile but currently safe. All callers escape user values. Worth refactoring to use textContent in v4.0.

### F-5A-5: Firebase API key in source
**Severity:** Info
**Area:** Firebase config

Expected for client SDK, not a secret. Security relies on database rules, not key obscurity.

### F-5A-6: No SRI on external CDN scripts
**Severity:** Medium
**Area:** `index.html` lines 619-621, `app.js` line 697

Firebase SDK (3 scripts) and SheetJS (dynamically loaded) have no `integrity` or `crossorigin` attributes. In a disaster zone with degraded DNS, a compromised CDN could exfiltrate all data.

**Fix:** Add SRI hashes and `crossorigin="anonymous"`.

### F-5A-7: No dangerous JS patterns
**Severity:** Info (Pass)
**Area:** Full codebase

No `eval`, `new Function`, `document.write`, or string-arg `setTimeout`/`setInterval`. Verified clean.

### F-5A-8: Inventory validation rule correct
**Severity:** Info (Pass)
**Area:** `database.rules.json`

`hasChildren(['model', 'quantity', 'available'])` matches actual schema. v3.8.2 fix from `name` to `model` verified.

### F-5A-9: Operations lack field-level validation in database rules
**Severity:** Medium
**Area:** `database.rules.json` lines 27-30

Only require `name` and `status` children. No validation on: status values (should be `active`/`archived`), shorePoints structure, roles, assignedApparatus, externalEquipment, or individuals. A malicious client could inject XSS payloads into shore point labels via direct Firebase writes.

**Fix:** Add validate rules for each child path with appropriate constraints.

### F-5A-10: All feedback readable by any authenticated user
**Severity:** Low
**Area:** `database.rules.json` line 35

`/feedback: { ".read": "auth != null" }` — anyone who opens the app can read all feedback including photos from all departments.

**Fix:** Restrict to admin role (or remove read entirely — only admin needs to read).

### F-5A-11: Catch-all rule blocks arbitrary paths
**Severity:** Info (Pass)
**Area:** `database.rules.json`

`$other: { .read: false, .write: false }` prevents writes to undefined paths. Verified working.

### F-5A-12: Any user can self-register as department member
**Severity:** Medium (Deferred to v4.0.0)
**Area:** `database.rules.json`, security model

Knowing a `deptId` grants full read/write. By design for Anonymous Auth model; needs per-device UID + role-based rules in v4.0.0.

### F-5A-13: onclick handlers with system-generated IDs without `escapeAttr()`
**Severity:** Info
**Area:** ~30 sites throughout the file

IDs are Firebase push keys or timestamp-based, cannot contain special chars. Acceptable risk.

---

## Resilience Findings (16 items: 0 Critical, 1 Medium, 5 Low, 10 Pass)

### F-5B-1: Service worker correct
**Severity:** Info (Pass)
**Area:** `sw.js`

Cache version matches (fieldstruts-v3.8.2), assets complete, Firebase/SheetJS excluded, stale-while-revalidate correct, old caches deleted, `skipWaiting()` + `clients.claim()` present.

### F-5B-3: Offline write queue robust
**Severity:** Info (Pass)
**Area:** `firebaseSave()`, `flushPendingWrites()`

`pendingWrites` persisted to localStorage, version-aware discard, MAX_RETRIES (3), MAX_AGE (24h), error capture in diagnostic events, transactions correctly not queued.

### F-5B-4: All `JSON.parse` calls guarded
**Severity:** Info (Pass)
**Area:** Full codebase

7 call sites verified, all wrapped in try/catch or using `safeParse()` helper.

### F-5B-5: `safeSetItem()` catches QuotaExceededError
**Severity:** Info (Pass)
**Area:** `safeSetItem()`

All significant localStorage writes use it or have their own try/catch.

### F-5B-6: `sessionStorage.setItem` at line 999 not in try/catch
**Severity:** Low
**Area:** Org chart toggle state persistence

Can throw in private browsing mode, would break org chart collapse/expand toggle.

**Fix:** Wrap in try/catch.

### F-5B-7: All 6 Firebase listeners have error callbacks
**Severity:** Info (Pass)
**Area:** `setupListeners()`

Route to `onListenerError()`, app continues with cached data.

### F-5B-8: App works without Firebase
**Severity:** Info (Pass)
**Area:** Initialization

`typeof firebase !== 'undefined'` guard, `db` null fallback, full localStorage-only operation.

### F-5B-9: Anonymous auth failure handled
**Severity:** Info (Pass)
**Area:** `initFirebase()`

Caught, warned, app falls back to local data.

### F-5B-10: Connection state correct
**Severity:** Info (Pass)
**Area:** `.info/connected` listener

Visual indicator, toast debouncing (30s), flush on reconnect.

### F-5B-11: SW reload suppressed during active operations
**Severity:** Info (Pass)
**Area:** Service worker update handler

Prevents data loss in critical field scenarios.

### F-5B-12: Pending write path reconstruction fragile
**Severity:** Low
**Area:** `flushPendingWrites()` line 896

Stores absolute Firebase URL, reconstructs relative path by stripping root. Mitigated by version-aware discard and try/catch.

### F-5B-13: `endOperation()` quadratic renders
**Severity:** Low (cross-referenced with F-1B-04)
**Area:** `endOperation()` line 4645

N calls to `returnEquipment()` each trigger full re-render. Visible lag with 20+ shore points.

**Fix:** Batch returns using `returnEquipmentSingle()` in loop, then persist/render once after.

### F-5B-14: SheetJS not cached — import/export broken offline
**Severity:** Medium
**Area:** Service worker excludes SheetJS from cache

Loaded from CDN on-demand. In a disaster zone, import/export simply fails. Field crews can't roll inventory between apparatus without connectivity.

**Fix:** Bundle locally or cache in SW on first load.

### F-5B-15: `_authReady` custom property on Firebase auth object
**Severity:** Low (cross-referenced with F-1B-06)
**Area:** `setupListeners()`

Fragile, could break on SDK update.

**Fix:** Use module-scoped boolean.

### F-5B-16: No shape validation on localStorage data
**Severity:** Low
**Area:** Initial state load

`safeParse` handles corrupt JSON but doesn't validate array shape. Mitigated by Firebase overwrite on connect.

---

## Fix Priority

### Patch (v3.8.3) — 3 items, ~8 min
1. **F-5A-1:** Replace `escapeHtml()` with `escapeAttr()` at lines 1659, 1742, 1747 (REAL XSS vector in apparatus rename)
2. **F-5A-2:** Escape `g.type` at line 3048
3. **F-5B-6:** Wrap `sessionStorage.setItem` at line 999 in try/catch

### Minor (v3.9.0) — 5 items, ~70 min
4. **F-5A-6:** Add SRI to external scripts
5. **F-5A-9:** Add field-level validation to operations in database rules
6. **F-5A-10:** Restrict feedback reads
7. **F-5B-14:** Bundle SheetJS locally or cache in SW
8. **F-5B-15:** Replace `_authReady` with module-scoped boolean

### Deferred (v4.0.0)
9. **F-5A-12:** Per-device UID + role-based security rules
