# Pass 5C+5D — Firebase Rules + Backward Compatibility
**Auditor:** DevOps/Backend Engineer (Opus)
**Date:** 2026-05-16
**Scope:** Firebase security rules + legacy data handling

---

## Pass 5C — Firebase Rules Findings

### F-5C-1: Department write race — first-user TOCTOU window
**Severity:** Medium
**Area:** `database.rules.json` line 6

`.write` rule allows first-user creation via `!data.child('members').exists()`. Two devices simultaneously typing the same brand-new deptId both pass the check and both register as members. No atomic claim — any user can "join" an unowned department by typing its name. Slated for v4.0.0 per release notes.

### F-5C-2: Department membership is self-asserting — no invite gate
**Severity:** High
**Area:** `database.rules.json` lines 6, 10–14; `app.js` line 1325

Knowing a deptId = full read/write access. Any authenticated user can register themselves into any department they know the ID of via line 1325. No invite, approval, or owner gate. Deferred to v4.0.0 (per-device UID + role-based rules).

### F-5C-3: `inventory` validate accepts `available` child-only writes
**Severity:** Medium
**Area:** `database.rules.json` lines 16-20

Validate only fires on `$itemId` writes, not on child path writes (`/inventory/{id}/available`). Partial-write could leave item without `model`/`quantity`. Currently fine because first-create writes all three, but worth knowing.

### F-5C-4 to F-5C-7: Validate rules match code
**Severity:** Info
- F-5C-4: Apparatus validate matches `confirmAddApparatus()` schema
- F-5C-5: Operations validate matches `confirmStartOp()` schema
- F-5C-6: `.indexOn: status` correctly used by both queries
- F-5C-7: Feedback validate matches `submitFeedback()` schema

### F-5C-8: Feedback `image` rule lacks base64-format check + size accounting mismatch
**Severity:** Low
**Area:** `database.rules.json` line 40

Rule enforces `length < 500000` on base64 (~375KB binary). Worst-case photos could exceed 500KB after base64. No client-side pre-write check; if rejected, entire feedback submission fails.

**Fix:** Add client-side size check before write; fall back to text-only on size failure.

### F-5C-9: `diagnostics/sync` read undefined → denied (correct)
**Severity:** Info
Write-only from client perspective. Intentional.

### F-5C-10: `logSyncEvent` bypasses `firebaseSave` (correct architectural decision)
**Severity:** Info
Direct `push().catch()` avoids recursion. Has own buffer for offline.

### F-5C-11: `$other` catch-all blocks all unknown paths
**Severity:** Medium (architectural maintainability)

Future feature additions silently fail until rules updated. Maintainability concern.

### F-5C-12: `customRoles` and `assignedApparatus` stored as arrays — array-as-object hazard
**Severity:** Medium
**Area:** `app.js` lines 992, 2169

Firebase serializes arrays as objects with numeric keys. Hole development causes inconsistent shapes. Tracked as v4.0.0 R3-R6.

### F-5C-13: Feedback `.read` allows any auth user to read all feedback
**Severity:** Medium
**Area:** `database.rules.json` lines 34–43

`.read: "auth != null"` — anyone reads all feedback from all departments. Privacy leak.

**Fix:** Restrict to admin only, or remove client-side read entirely.

### F-5C-14: `auth.uid` not stamped on feedback writes
**Severity:** Low
**Area:** `submitFeedback()` lines 2096–2103

Feedback cannot be attributed to specific device for support follow-up beyond self-reported deptId/deptName.

### F-5C-15: Members `.read` inherits from dept-level (correct)
**Severity:** Info

### F-5C-16: `firebaseSave` `update` bypasses validate-required fields
**Severity:** Medium
**Area:** `app.js` line 1907

Firebase `update()` doesn't trigger parent `validate` unless newData references missing field. If `model` was ever absent (legacy), update can leave item malformed.

---

## Pass 5D — Backward Compatibility Findings

### F-5D-1 to F-5D-3: Legacy field handling robust
**Severity:** Info
- F-5D-1: Missing `model` falls through to `plateId` via `||` fallback chain
- F-5D-2: Missing `plateId` handled by `|| {}` guard
- F-5D-3: `getShorePoints()` normalizes array vs object correctly

### F-5D-4: Missing `groupId` — handled correctly
**Severity:** Info

`getGroupMembers(spId)` returns `[sp].filter(Boolean)` when groupId is falsy. Single-point fallback works.

### F-5D-5: `normalizeStatus` not case-insensitive
**Severity:** Medium
**Area:** `app.js` lines 3151-3156

Handles undefined/null/empty → 'process'. Does NOT normalize case. A `'Process'` status (e.g., from Excel import roundtrip) returns as `'Process'` and won't match STATUS_ORDER — SP never appears in any lane.

**Fix:** Lowercase before mapping.

### F-5D-6 to F-5D-8: Optional fields handled with `|| {}` defaults
**Severity:** Info

### F-5D-9: Missing `appVersion` on pending writes — treated as current (correct)
**Severity:** Info
`op.appVersion && op.appVersion !== APP_VERSION` short-circuit allows unversioned writes through.

### F-5D-10: Legacy `method: 'transaction'` writes — failed branch doesn't increment retries
**Severity:** Medium
**Area:** `flushPendingWrites()` line 902

`else { failed.push(op); continue; }` doesn't bump retries. Stale transaction-method ops retry forever until age-discard at 24h.

**Fix:** Either increment retries or immediately discard transaction-method ops.

### F-5D-11: Missing `type` field defaults to 'other' (correct)
**Severity:** Info

### F-5D-12: External equipment missing `available` → NaN propagation
**Severity:** Medium
**Area:** `app.js` lines 3673-3674

`undefined - 1 = NaN`, then `Math.max(0, NaN) = NaN`. Field never recovers. Local mirror has no `|| 0` guard (Firebase transaction at line 3691 does).

**Fix:** Add `|| 0` guard on local decrement to match transaction.

### F-5D-13: Missing `deployedPlates` — `if (sp.deployedPlates)` guard (correct)
**Severity:** Info

### F-5D-14: Unknown plateId → silently treated as zero-height
**Severity:** Low
**Area:** `getDeductions()` lines 5007-5011

`topPlate = BASE_PLATES.find(...)` returns undefined for unknown ID → `topH = 0`. Silent under-deduction in safety-critical calculation if legacy plate IDs exist.

**Fix:** Log warning when plateId doesn't match known plates.

### F-5D-15: `validateInput` slices by character count — emoji surrogate pair split
**Severity:** Info
**Area:** `app.js` lines 684-687

`slice(0, maxLength)` on UTF-16 surrogate pair could split mid-character. Practical risk: low.

**Fix:** `[...str].slice(0, maxLength).join('')` for proper grapheme handling.

### F-5D-16: Legacy `floor`/`team` field migration — read-time patches, never persisted
**Severity:** Low
**Area:** `app.js` lines 1369-1370, 1385-1386

Migration patches applied at read time on every load. No writeback. Zombie data accumulates.

**Fix:** Migrate on read and persist if changed.

### F-5D-17: JSON import doesn't backfill `available`
**Severity:** Medium
**Area:** `app.js` lines 4893-4910

Excel import sets `available`. JSON import doesn't. Validate rule will reject if missing.

**Fix:** Apply same backfill in JSON path.

### F-5D-18: Service worker cache versioning + legacy app loading window
**Severity:** Info

Brief window where new app.js runs against stale cached HTML during SW update. Mitigated by 3-place version bump discipline.

---

## Severity Summary

**Pass 5C (Firebase rules):** 1 High, 4 Medium, 11 Info
**Pass 5D (Backward compat):** 3 Medium, 4 Low, 11 Info

## Top Priorities

1. **F-5C-2 / F-5C-13** (High/Medium privacy) — Deferred to v4.0.0
2. **F-5D-5** (Medium) — Case-insensitive status normalization (1-line fix)
3. **F-5D-10** (Medium) — Increment retries or discard legacy transactions
4. **F-5D-12** (Medium) — Guard `available` decrement with `|| 0`
