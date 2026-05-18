# Role 1 — Code Auditor — v3.11.2

**Audit date:** 2026-05-18
**Lane:** XSS / escape correctness / listener leaks / races / transactions / sw.js cache hygiene
**Commit:** dbfbc8b (v3.11.2)

## Executive summary

v3.11.2 is in solid shape on the items the v3.5.2 / v3.8.x / v3.9.0 hotfix series targeted. ACME table corrections, SRI on Firebase + SheetJS, peer-XSS coercion on `deployedStrut.model` + `e.length`, sessionStorage parse guard, status-progression guard, customTypesRef teardown, granular `roles` `.update()` swap, `escapeAttr` in drilldown attributes — all verified in place. The v3.11.2 hotfix surface (`fmtTimestamp`/`fmtDate`, `pendingReason` validation, apparatus name uniqueness validator, Start-Op listener re-render, `estimatedLoad` coercion in renderShorePointCards) is correctly implemented.

That said, the audit found **2 CRITICAL** open XSS vectors (attribute-context `escapeHtml` misuse in `aria-label` and toast HTML auto-detect on user-controlled `getRoleAbbr`/conflict list), **3 HIGH** open issues (deploy-transaction phantom-item asymmetry vs. return; `e.length` coercion regression in cut-table render; stored XSS via unvalidated `sp.cutLength` / peer-writable fields), and **6 MEDIUM/LOW** still-open carry-overs from v3.6.0 plan that were not addressed in v3.8–v3.11 (R4 `customRoles` set-clobber, R5 inventory root-set, R13 active-ops first-fire wipe, L9 `custom_`/`type_` ID jitter, L-M4 feedback path jitter, deploy-transaction missing `makeReturnIncrementer` symmetry). No CSP. Listener teardown is complete and correct.

## Severity histogram

- Critical: 2
- High: 4
- Medium: 5
- Low: 3

## Findings

### V3.11.2-R1-01 — `aria-label` uses `escapeHtml` in attribute context (sp.label breakout)
- **Severity:** Critical
- **Status:** STILL-OPEN
- **File:Line:** `app.js:3722`, `app.js:3723`
- **Maps to:** X5 (ledger, planned v3.6.0 — never shipped)
- **Finding:** `<button class="sp-edit-btn" ... aria-label="Edit ${escapeHtml(sp.label) || 'Shore Point'}">` and the matching delete button. `escapeHtml()` returns a `textContent`-encoded string that escapes `<`/`>`/`&` but **not** `"` or `'` (verified at `app.js:722-727` — `div.textContent = s; return div.innerHTML`). A peer-written `sp.label` value containing `"` breaks the attribute and injects an event handler. `sp.label` is rule-validated only as `isString() && length <= 200` (`database.rules.json:42`) — no character filtering. Direct stored-XSS via Firebase peer write.
- **Fix sketch:** Replace `escapeHtml(sp.label)` with `escapeAttr(sp.label)` for both `aria-label` interpolations. The text-content interpolation at line 3720 is correct and stays.

### V3.11.2-R1-02 — Toast HTML auto-detect XSS via user-controlled `getRoleAbbr` and apparatus-name conflict list
- **Severity:** Critical
- **Status:** STILL-OPEN
- **File:Line:** `app.js:3199`, `app.js:2091`, `app.js:2141`
- **Maps to:** X9 (ledger, planned v3.6.0)
- **Finding:** `showToast` at `app.js:901` uses regex `/<[a-z][\s\S]*>/i` to decide whether to call `el.innerHTML = msg` or `el.textContent = msg`. Three call sites pass user-controlled fields without escaping:
  - L3199: `` `Swapped ${getRoleAbbr(roleA)} ↔ ${getRoleAbbr(roleB)}` `` — `getRoleAbbr` returns `customRoles[].abbr` which is set in `addCustomRole` (L1453) via `trimmed.substring(0, 6)`. `validateInput` strips only control chars. A 5-char `<a x>` or 6-char `<svg>` passes through and triggers `innerHTML`.
  - L2091, L2141: `` `Name conflicts with: ${list}. Pick a different designator.` `` where `list = check.conflictsWith.join(', ')` is built from `localApparatus[].name` (user-controlled, max 100 chars). Apparatus name `'<img src=x onerror=alert(1)>'` triggers the regex and runs as HTML.
- **Fix sketch:** Either (a) escape interpolated user fields before passing to `showToast`, OR (b) refactor `showToast` into two functions — `showToast(text)` always uses `textContent`, `showToastHTML(html)` for the only legit HTML caller (undo-link toast at L1376). Option (b) is structural.

### V3.11.2-R1-03 — Deploy transactions create phantom inventory nodes (no `makeReturnIncrementer` symmetry)
- **Severity:** High
- **Status:** STILL-OPEN
- **File:Line:** `app.js:4175`, `app.js:4177`, `app.js:4180`, `app.js:4183` (and the parallel post-deploy assignEquipmentToPending block at `app.js:4458-4466`)
- **Maps to:** Half-of-NEW-7 — the return path got the guard in v3.5.2 (`makeReturnIncrementer` at L5373 returns `undefined` on `v == null` to abort), but the deploy path was never given the same treatment.
- **Finding:** Deploy decrement uses `'transaction', v => Math.max(0, (v || 0) - 1)`. If `v === null`/`undefined` (peer deleted the item between local find and Firebase commit, or item id is stale from a wiped-out import), `(v || 0) - 1 = -1`, `Math.max(0, -1) = 0` — transaction commits a phantom `{available: 0}` node with no `model`, `system`, `apparatus`, `quantity`. That phantom now fails the v3.8.2 `hasChildren(['model', 'quantity', 'available'])` validate rule and either bricks or silently drops on subsequent writes; either way the inventory tree gets corrupted.
- **Fix sketch:** Refactor to a `makeDeployDecrementer()` that returns `undefined` on `v == null`. Apply at all 8 deploy-transaction sites (4 in `deployShorePoint` + 4 in `assignEquipmentToPending`).

### V3.11.2-R1-04 — Cut-table render lost `Number(e.length)` coercion (regression vs. F-1C-19)
- **Severity:** High
- **Status:** REGRESSION
- **File:Line:** `app.js:5130`
- **Maps to:** F-1C-19 (v3.9.0 partial — fixed two of three sites)
- **Finding:** Comparison:
  - L3685 (renderShorePointCards): `(Number(e.length) || 0) + '"'` — coerced (correct).
  - L3863 (viewArchivedOp): `(Number(e.length) || 0) + '"'` — coerced (correct).
  - L5130 (renderCutTableCard): `e.length + '"'` — **uncoerced**. Peer-written `e.length = '<img src=x onerror=…>'` flows to L5174's innerHTML.
- **Fix sketch:** Replace `e.length + '"'` with `(Number(e.length) || 0) + '"'` at L5130 (and audit `e.length` interpolations elsewhere — there's another raw site at L5112 for `sp.actualCutLength + '"'`).

### V3.11.2-R1-05 — Unvalidated peer-writable fields rendered raw (`cutLength`, `actualCutLength`, `headerSize`, `footerSize`)
- **Severity:** High
- **Status:** NEW
- **File:Line:** `app.js:3766`, `app.js:3767`, `app.js:5112`, `app.js:5114`, `app.js:5135`, `app.js:5162`, `app.js:5167`, `app.js:5172`, `app.js:5173`
- **Maps to:** No prior ID — class of `database.rules.json` validate-gap.
- **Finding:** Several shore-point fields are interpolated into innerHTML without escape and without numeric coercion, and the rules at `database.rules.json:30-44` only validate `status`, `requiredLength`, `estimatedLoad`, `label`. Peer writes can put arbitrary strings into `sp.cutLength`, `sp.actualCutLength`, `sp.deductions.header`, `sp.deductions.sole`, `sp.requiredLength` for paths that bypass the targeted validate. Examples:
  - L3766: `` `(expected: ${sp.cutLength}")` ``
  - L5112: `${sp.actualCutLength != null ? sp.actualCutLength + '"' : ...}`
  - L5162: `${sp.requiredLength}"` — only rules-validated when written under the validated path, not when written via a parent `set`.
  - L5172/5173: `${headerSize}` / `${footerSize}` are derived from `sp.deductions?.header === 3.5 ? '4×4' : '6×6'` — the strict-equality fallthrough means a peer-injected string like `'<script>...</script>'` falls into `'6×6'` (safe by accident), but more subtle: `sp.deductions.header = 3.5` evaluates the literal-equality check correctly only if peer keeps numeric type. If peer writes `"3.5"` (string), it falls to `'6×6'` — wrong header rendered but not XSS. Safe in isolation; flagging as latent.
- **Fix sketch:** (a) Cast every numeric interpolation through `Number()` and use `Number.isFinite()` before render (the v3.9.0 hardening pattern). (b) Tighten `database.rules.json` to validate `cutLength`, `actualCutLength`, and deduction subfields. (Rule edits out of my lane per the audit constraints — pass to devops-resilience.)

### V3.11.2-R1-06 — `customRoles` writes via root `set` clobber concurrent role edits
- **Severity:** High
- **Status:** STILL-OPEN
- **File:Line:** `app.js:1273`
- **Maps to:** R4 (ledger, planned v3.6.0 — never shipped)
- **Finding:** `saveCustomRoles()` issues `firebaseSave(operationsRef.child(activeOperation.id).child('customRoles'), 'set', activeOperation.customRoles)`. Every reparent, rename, add, remove writes the entire array. Device A adds a role and Device B reparents an unrelated role in the same window → second write replaces the first's full array, losing Device A's add. The R3 fix (`orgSwapRoles` granular update) was applied; R4 (the customRoles-array writer) was not.
- **Fix sketch:** Migrate `customRoles` from array to keyed object (`customRoles: { roleId: { name, abbr, parentId, suggestedView } }`) and use `.update({ [roleId]: payload })` for single-role mutations. Bulk reparent ops still need a `.update({ ['roleA/parentId']: newParent, ['roleB/parentId']: newParent })` multi-path. Migration: read at listener time and coerce array→keyed.

### V3.11.2-R1-07 — Excel import root-`set` on `/inventory` still wipes concurrent writes
- **Severity:** High
- **Status:** STILL-OPEN (mitigated by v3.10.1 pre-backup)
- **File:Line:** `app.js:5864`
- **Maps to:** R5 (ledger, planned v3.6.0)
- **Finding:** `firebaseSave(inventoryRef, 'set', updates)` replaces the entire `/departments/{deptId}/inventory` subtree. Pre-destructive backup (`app.js:5843-5850`) means **recovery is possible**, but a concurrent write that lands between `once('value')` and the `set` is still lost. Two engines doing Excel import + manual qty change in the same window: import wins, manual change is gone (recoverable from backup but not visible to user).
- **Fix sketch:** Replace root `set` with per-item `update({})` using a multi-path object keyed by item id. Removed items (in old tree but not in new) handled with `null` values in the same update.

### V3.11.2-R1-08 — Active operations listener has no first-fire guard
- **Severity:** Medium
- **Status:** STILL-OPEN
- **File:Line:** `app.js:1801-1815`
- **Maps to:** Analogue of S7 (which fixed inventory + apparatus + customTypes, not operations)
- **Finding:** S7's first-fire guard was applied to `inventoryRef`, `apparatusRef`, `customTypesRef` (L1781, L1838, L1875). The `activeOpsQuery` listener has no equivalent — when it fires with no operations and the device has a `local-op-…` operation in memory from `loadLocalOperation`, `activeOperation = null` wipes it. Same class of bug, different listener.
- **Fix sketch:** Add `activeOpsFirstFire` flag mirroring `inventoryFirstFire`. On first empty snapshot when local has an unsaved op, push local to Firebase before accepting the empty snapshot as truth.

### V3.11.2-R1-09 — `custom_` and `type_` IDs are Date.now()-only — same-ms collision risk across devices
- **Severity:** Medium
- **Status:** STILL-OPEN
- **File:Line:** `app.js:1454` (`'custom_' + Date.now()`), `app.js:2007` (`'type_' + Date.now()`)
- **Maps to:** L9 (ledger, planned v3.6.0 — partially shipped; `grp-`, `app-`, `local-`, `inv-`, `local-op-`, `sp-` got jitter; `custom_` and `type_` were missed)
- **Finding:** Two devices adding a custom role or apparatus type in the same millisecond produce the same id. Later writes silently overwrite earlier ones. Apparatus-group id-collision fix at L2716 used `Date.now() + '-' + Math.random().toString(36).slice(2,6)` — apply the same pattern.
- **Fix sketch:** `'custom_' + Date.now() + '-' + Math.random().toString(36).slice(2,6)` and same for `type_`.

### V3.11.2-R1-10 — Feedback path `feedback/' + Date.now()` lacks jitter (offline queue collision)
- **Severity:** Medium
- **Status:** STILL-OPEN
- **File:Line:** `app.js:2603`
- **Maps to:** L-M4 (ledger, planned v3.6.0)
- **Finding:** Offline-feedback queue path constructed as `'feedback/' + Date.now()`. Two offline feedbacks submitted in the same millisecond on the same device land on the same Firebase path on flush — second overwrites first.
- **Fix sketch:** `'feedback/' + Date.now() + '-' + Math.random().toString(36).slice(2,6)` and confirm `flushPendingWrites` honours the keyed path.

### V3.11.2-R1-11 — `pendingWrites` may carry old-dept paths after `connectDepartment` switch
- **Severity:** Medium
- **Status:** STILL-OPEN
- **File:Line:** `app.js:1711-1717`, `app.js:606` (path reconstruction in `flushPendingWrites`)
- **Maps to:** L4 (ledger, planned v3.6.0)
- **Finding:** `connectDepartment()` reassigns `deptId` and calls `setupListeners()`, but does not clear `pendingWrites`. If a user goes offline writing to dept A, switches to dept B, then comes back online, queued writes replay against B's `firebaseio.com/…/departments/A/…` URLs (the path in the queue entry is the absolute URL, not a relative one). Depending on rules + dept membership, these writes either fail with permission_denied or — worse — land on the wrong dept.
- **Fix sketch:** In `connectDepartment`, either (a) drop all `pendingWrites` whose path contains a different `deptId` segment, or (b) rewrite paths to point to the new dept (only safe if the data was dept-agnostic; usually it isn't). Option (a) is safer; show a toast counting dropped writes.

### V3.11.2-R1-12 — `archivedOperations` listener unbounded
- **Severity:** Medium
- **Status:** STILL-OPEN
- **File:Line:** `app.js:1817-1818`
- **Maps to:** L5 (ledger, planned v3.6.0)
- **Finding:** `archivedOpsQuery = operationsRef.orderByChild('status').equalTo('archived')` with no `limitToLast`. After a year of operational use the listener fetches every archived op into RAM on every device on every load. Compounds with v3.10.1 `_backups` storage.
- **Fix sketch:** `.limitToLast(50)` and add a "Load older archived ops" pagination control in the archived ops view.

### V3.11.2-R1-13 — No CSP header / meta in index.html (defense-in-depth gap)
- **Severity:** Medium
- **Status:** STILL-OPEN
- **File:Line:** `index.html` (no `<meta http-equiv="Content-Security-Policy">`)
- **Maps to:** Not in ledger.
- **Finding:** GitHub Pages doesn't set CSP headers and the page has no meta-CSP tag. Combined with 80+ inline event handlers in index.html and template-string innerHTML throughout app.js, a single XSS escape (like R1-01 above) gets full script execution. CSP would not eliminate the underlying bugs but would significantly raise the bar for exploitation. Note: existing inline handlers mean a strict CSP requires either replacing them with `addEventListener` (a large refactor) or using `'unsafe-inline'` (defeats the purpose).
- **Fix sketch:** Phase 1 — add a CSP meta with `script-src 'self' https://www.gstatic.com https://cdn.sheetjs.com 'unsafe-inline'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`. Phase 2 — move inline handlers to delegated listeners and drop `'unsafe-inline'`. Out of lane to apply (devops-resilience).

### V3.11.2-R1-14 — sw.js fetch handler caches every successful response indefinitely
- **Severity:** Low
- **Status:** NEW
- **File:Line:** `sw.js:51-62`
- **Maps to:** Not in ledger.
- **Finding:** The fetch handler does `caches.match` then a network revalidate; on every successful response it `cache.put(event.request, clone)`. There's no cap on cache entries and no expiry on cached responses. The Firebase URL exclusion at L46-48 returns before reaching the cache logic, so realtime traffic is safe — but any user-initiated `fetch` to a third-party (e.g., dev tools, analytics, future features) lands permanently in the cache. Low impact today because the app only fetches its own assets + Firebase + SheetJS.
- **Fix sketch:** Either restrict caching to a known allowlist of asset paths, or implement an LRU eviction step before `cache.put`. Cosmetic for now.

### V3.11.2-R1-15 — `_lastOfflineToastTs` / `_lastFailToastTs` not reset on reconnect (latent UX bug)
- **Severity:** Low
- **Status:** NEW
- **File:Line:** `app.js:939-940`, used at L1018-1021
- **Finding:** Toast-debounce timestamps for the "Offline — will sync later" warning are never reset when the connection comes back. They naturally re-trigger after `SYNC_TOAST_DEBOUNCE_MS` (30s) regardless of session state, so worst case is a 30-second blind spot after the first offline write of a session. Not security-critical, but a code-correctness inconsistency: a long-running session would benefit from a reset hook on the `.info/connected === true` branch (`app.js:1604`).
- **Fix sketch:** On reconnect set both to `0`.

### V3.11.2-R1-16 — `firebaseSave` rejects unknown method with `Promise.reject` — only call site at L988 swallows nothing
- **Severity:** Low
- **Status:** NEW
- **File:Line:** `app.js:988`
- **Finding:** `if (method === 'set') ... else return Promise.reject(new Error('Unknown method: ' + method));` returns a rejected promise but no caller adds a `.catch` — and the surrounding `.then().catch()` chain at L990-1023 isn't applied to this rejection branch. Result: silent unhandled-rejection if a future call site passes a typo'd method. Hardening, not a live bug.
- **Fix sketch:** Throw synchronously instead of returning a rejected promise, or wrap the entire body in a single try/catch that returns `Promise.resolve()` from the catch.

## Verified-Fixed (anchors)

- **VERIFIED-FIXED:** S4 sessionStorage parse guard (`app.js:666-682` — try/catch + `Array.isArray()` check).
- **VERIFIED-FIXED:** S7 inventory + apparatus + customTypes first-fire guards (`app.js:1776-1890`).
- **VERIFIED-FIXED:** R1 listener teardown (`teardownListeners` at L1725 detaches all five module-scoped refs + connRef; `setupListeners` calls it before re-attach at L1759).
- **VERIFIED-FIXED:** R3 `orgSwapRoles` granular `.update()` (L3193-3196).
- **VERIFIED-FIXED:** X1 drilldown attribute escaping (`escapeAttr` at L4736, L4741, L4997).
- **VERIFIED-FIXED:** X2 inventory item.model escaping (L2307, L2337, L5921, L5923).
- **VERIFIED-FIXED:** X3 commandLayoutClick data-attribute pattern (L4971-4978, L4997).
- **VERIFIED-FIXED:** X4 `escapeAttr` in editApparatus value (L2123) + spGroup option (L2214, L2219).
- **VERIFIED-FIXED:** X6 / F-1C-19 `sp.deployedStrut.model` escape (L3734, L3870, L5174).
- **VERIFIED-FIXED:** X7 external equipment `ext.model` escape (L3588).
- **VERIFIED-FIXED:** X8 `g.type` escape (L3541).
- **VERIFIED-FIXED:** NEW-7 / S8 `makeReturnIncrementer` phantom-item guard on return path only (L5373-5379 — see R1-03 for asymmetry on deploy).
- **VERIFIED-FIXED:** F-1B-01 / F-1E-3 / F-1E-4 connRef module-scope + null-guards + error callback (L1591-1622).
- **VERIFIED-FIXED:** F-5A-6 SRI on Firebase compat scripts (index.html:625, 628, 631) + dynamic SheetJS (app.js:837).
- **VERIFIED-FIXED:** F-1D-1 orphan role assignment sync on `removeCustomRole` (L1510-1515).
- **VERIFIED-FIXED:** F-1C-9b apparatus group id jitter (L2716).
- **VERIFIED-FIXED:** F-1D-2 Excel import for extensions + plates with `model: ''` and Plate ID column (verified at the import path).
- **VERIFIED-FIXED (v3.11.2):** IP-034 `fmtTimestamp`/`fmtDate` centralization (L746-755, used at L3808, L3856-3857, L3830-3831).
- **VERIFIED-FIXED (v3.11.2):** IP-007 `pendingReason` whitelist (L4214-4215).
- **VERIFIED-FIXED (v3.11.2):** IP-033 apparatus name uniqueness (`canonicalizeApparatusName` / `validateApparatusName` at L793-825, applied at L2088 add and L2138 edit).
- **VERIFIED-FIXED (v3.11.2):** IP-011 `Number()` coercion on `sp.requiredLength` / `sp.estimatedLoad` in renderShorePointCards (L3731, L3751-3753).
- **VERIFIED-FIXED (v3.11.2):** IP-048 Start-Op modal re-render on apparatus listener fire (L1860-1862).
- **VERIFIED-FIXED:** F-1C-1 status-progression guard with `STATUS_ORDER` skip (`updateShoreStatus` — confirmed via the STATUS_ORDER constant at L691 and the individualPhase split logic).

## Out-of-lane notes

- [Lane: structural-sme] `getLoadCapacity` conservative-floor interpolation at `app.js:143-164` looks consistent — leaving algorithm correctness verification to Role 2.
- [Lane: structural-sme] `wedge` deduction omitted from strut-fit search but added to cut length — flagged as S-H1 in ledger (resolved per `CLAUDE.md` v3.6.0 note). Worth Role 2 re-verifying numerically.
- [Lane: mobile-ux] `<button class="sp-edit-btn">` at app.js:3722 is ~28px in computed style — sub-44px touch target. Likely already known.
- [Lane: nims-compliance] Default ICS roles at `app.js:1242-1252` still missing PSC/LSC/FSC + PIO/LNO (N1 in ledger). Group field on shore points still doctrinally wrong (N2).
- [Lane: devops-resilience] No CSP meta tag in index.html (see R1-13 — defense-in-depth flag, fix is yours).
- [Lane: devops-resilience] `database.rules.json:30-44` validates `status`/`requiredLength`/`estimatedLoad`/`label` for shore points but not `cutLength`/`actualCutLength`/`deductions/*` — flows into R1-05.
- [Lane: devops-resilience] sw.js cache hygiene gaps in R1-14 (no LRU, no allowlist) — fits your lane better than mine.
- [Lane: qa-driver] Recommend regression-driving the v3.11.2 hotfix points: apparatus name "Trk 1" vs "Truck 1" vs "Ladder 1" collision matrix, Start-Op modal opened pre-listener-fire, pending shore point with `pendingReason` round-trip.
- [Lane: battalion-chief] R1-01 + R1-02 + R1-03 are the headline release-blockers. The remaining HIGH items (R1-04, R1-05, R1-06, R1-07) are stored-XSS + race fixes that can ship in a v3.11.3 patch alongside.
