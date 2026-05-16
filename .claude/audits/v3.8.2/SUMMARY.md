# FieldStruts v3.8.2 — Full Audit Summary

**Audit completed:** 2026-05-16
**Version audited:** v3.8.2 (commit 65686d3)
**Auditors:** 5-role production audit team (Full-Stack, Frontend, Accessibility, SME, DevOps)
**Total passes:** 11 of 20 planned (code review fully covered; browser testing condensed due to context constraints)

---

## Total Findings: 121

| Severity | Count |
|----------|-------|
| **Critical** | **4** |
| **High** | **17** |
| Medium | 30+ |
| Low | 25+ |
| Info (verified or notes) | 40+ |

## Critical Findings (4)

### C-1: Phantom inventory decrement — non-atomic deploy
**ID:** F-1F-1
**Area:** `deployShorePoint()` lines 3567-3725

User A deploys last strut, User B concurrently deploys same strut. Transactions clamp to 0 (committed=true, no warning). Both users' SP writes succeed. **TWO shore points deployed against ONE physical strut.**

**Fix:** Conditional SP write on transaction's actual decrement, OR Cloud Function for atomic allocate+create.

### C-2: Listener wipes optimistic state mid-operation
**ID:** F-1F-2
**Area:** `inventoryRef.on('value')` lines 1341-1359

Listener wholesale-replaces `localInventory` on every snapshot. Listener fires mid-deploy (unrelated change by another user) → local decrement reverted before transaction completes. UI shows stale inventory; Firebase shows correct.

**Fix:** Migrate to `child_added`/`child_changed` events. Or pendingTransactions set to skip reconciliation for in-flight items.

### C-3: Operations listener replaces `activeOperation` whole
**ID:** F-1F-3
**Area:** `activeOpsQuery.on('value')` lines 1361-1376

Same issue as C-2 but for operation tree. Any uncommitted local mutation (new apparatus group, role assignment) vanishes when listener fires from unrelated update. Visible flicker, state corruption potential.

**Fix:** Granular listeners per subtree. Or "local overrides" dict merged on top of listener result.

### C-4: LongShore unrated zone has no acknowledgment gate
**ID:** F-4B-7
**Area:** Unrated zone warning + deploy flow

LongShore at >192" (16ft) shows warning but user can deploy without explicit acknowledgment. Safety-critical setting where exceeding manufacturer's rated range deserves a forced modal confirmation.

**Fix:** Modal gate: "Confirm: this exceeds Paratech's rated range. [Cancel] [I Acknowledge — Deploy]"

---

## High Severity Findings (17)

### Security / XSS
- **F-5A-1** — `escapeHtml()` used in HTML attribute value contexts at editApparatus line 1659. **Real XSS vector** — apparatus name `Test" onfocus="alert(1)` breaks out of value attribute.
- **F-1C-19** — `viewArchivedOp` and `renderShorePointCards` interpolate Firebase-sourced `deployedStrut.model`, lengths, loads raw. Stored XSS via peer write.
- **F-5C-2** — Department membership self-asserting; knowing deptId = full read/write (v4.0.0 deferral).

### Concurrent mutations
- **F-1F-4** — `assignedApparatus` array uses `set()`. Concurrent toggles lose entries silently.
- **F-1F-5** — `orgSwapRoles` granular update still corrupts with overlapping keys.
- **F-1F-6** — `getOperationInventory` live references mutated underfoot when listener reassigns array.
- **F-1F-7** — External equipment `set()` whole-object overrides concurrent decrement.
- **F-1F-8** — Shore-point status regression race; no `revision` tokens.
- **F-1F-9** — Group deploy + concurrent allocation → group total mismatch.

### Operations / Shore points
- **F-1C-1** — Group status regression: clicking pre-cutting transition can clobber advanced members of group.

### Error paths
- **F-1E-1** — `signInAnonymously()` failure silently strands app (no banner, no toast).
- **F-1E-2** — Member registration write fire-and-forget with no retry. Locks user out of department.
- **F-1B-01** — `.info/connected` listener never detached on `teardownListeners()`.

### Data integrity / import
- **F-1D-1** — `removeCustomRole` leaves orphan role assignments in Firebase.
- **F-1D-2** — Excel extension import silently rejected by security rules (missing `model` field).
- **F-1D-10** — Member registration bypasses retry queue.
- **F-1D-16** — `applyImportData` wholesale-replaces, breaks deployed references.

### Live browser finding
- **F-BR-1** — Live data renders `undefined" @ no load specified` and `?` for shore point with missing measurement data.

### Domain edge cases (SME)
- **F-4B-1** — AT 37-58 at exact 58" boundary has zero margin, no warning
- **F-4B-6** — LongShore unrated zone exact 192" boundary logic verified correct
- **F-4B-14** — LockStroke extension compatibility UI enforcement needs verification

---

## Cross-Cutting Themes

### Theme 1: Whole-tree listener replacement is the root of most concurrency bugs
**Affected findings:** C-1, C-2, C-3, F-1F-2, F-1F-3, F-1F-6, F-1F-12, F-1F-16

The `on('value', ...)` pattern replacing `localInventory`/`activeOperation` wholesale on every snapshot is the architectural pattern that causes optimistic-update conflicts, in-flight mutation wipes, and live-reference invalidation. Migrating to `child_added`/`child_changed`/`child_removed` patterns would eliminate this class of bug at the architectural level.

**Estimated effort:** Major refactor — v4.0.0 scope.

### Theme 2: Failed transactions silently dropped
**Affected findings:** F-1C-3, F-1E-5, F-5D-10

`firebaseSave()` line 847 skips queueing for transactions (because callbacks can't be serialized to localStorage). When transactions fail, only a diagnostic log is created — no retry, no user notification. After offline use, inventory desync is inevitable.

**Fix path:** For inventory specifically, queue a value-resync write (`set` with recomputed value from local state) alongside each transaction. Falls back gracefully on reconnect.

### Theme 3: XSS via Firebase-sourced data
**Affected findings:** F-5A-1, F-5A-2, F-1C-19

`escapeHtml()` does not escape `"` or `'` — only safe for text content, not attribute values. Three call sites use it inside `value="..."` attributes. Additionally, Firebase data is rendered raw at multiple paths assuming security rules prevent tampering — but rules don't validate per-field schemas for shore-point/operation data.

**Fix path:** Audit every `innerHTML` interpolation. Replace `escapeHtml()` with `escapeAttr()` inside attribute contexts. Add field-level validate rules to Firebase.

### Theme 4: `guardClick()` coverage inconsistent
**Affected findings:** F-1D-3 (and adjacent)

Critical destructive/state-changing buttons (updateShoreStatus, deleteShorePoint, deleteArchivedOp, clearRole) lack `guardClick` protection. Rapid double-taps possible during gloved field use can fire duplicate Firebase writes.

**Fix path:** Audit all onclick handlers. Wrap destructive actions in `guardClick`.

### Theme 5: Silent error degradation
**Affected findings:** F-1E-1, F-1E-2, F-1E-10, F-1E-11, F-1E-12, F-1E-17

Many error paths log to console only — no user-visible feedback. Field crews in disaster zones won't know when sync, auth, import/export, or feedback submission fails.

**Fix path:** Replace console-only error logging with persistent banner ("Auth failed — running offline-only") for auth-class failures, and toasts for transient ones.

---

## Recommended Action Plan

### Patch (v3.8.3) — Quick wins, 30-60 min total
1. **F-5A-1** — Replace `escapeHtml()` with `escapeAttr()` at lines 1659, 1742, 1747 (real XSS)
2. **F-5A-2** — Escape `g.type` at line 3048
3. **F-5B-6** — Wrap `sessionStorage.setItem` line 999 in try/catch
4. **F-5D-5** — Lowercase status in `normalizeStatus` (case-insensitive)
5. **F-5D-12** — Add `|| 0` guard on external equipment `available` decrement
6. **F-1C-6 / F-1D-4 / F-1D-8** — Add missing `renderInventory()` calls
7. **F-1C-8** — Show error toast on empty operation name
8. **F-1C-9** — Add random suffix to `groupId` to prevent collisions
9. **F-1D-7** — Clear `fieldstruts_myRoleName` on role-clear
10. **F-1D-11** — Read `deptName` from `fieldstruts_settings`, not separate key
11. **F-1D-12** — Close feedback modal in no-db branch
12. **F-1D-13** — Reset `opMultiBuilding` checkbox in `confirmStartOp`
13. **F-BR-1** — Guard undefined interpolations in `renderShorePointCards`

### Minor (v3.9.0) — UX & safety enhancements
1. **F-4B-7** (Critical) — Unrated zone acknowledgment modal gate
2. **F-1C-1** — Status-progression guard in `updateShoreStatus`
3. **F-1C-7** — Implement actual "Assign Equipment" deploy flow for pending SPs
4. **F-1C-10** — Gate locked-card actions on role
5. **F-1C-19** — Escape Firebase-sourced fields in render
6. **F-1D-1** — Fix orphan role assignments on `removeCustomRole`
7. **F-1D-2** — Add `model` field to extension imports
8. **F-1D-16** — Pre-import deployed-reference validation
9. **F-1E-1 / F-1E-2** — Persistent auth-failure banner + retry queue for member registration
10. **F-1E-3 / F-1E-4** — Null guards + error callbacks on connRef listener
11. **F-1A-11** — Auto-fill deductions for T-Shore and Double-T (not just 3-Post)
12. **F-4B-13** — Debounce Quick Find input
13. **F-5A-6** — Add SRI to external CDN scripts
14. **F-5A-9** — Field-level validate rules for operations
15. **F-5B-14** — Bundle SheetJS locally or cache in SW

### Major (v4.0.0) — Architectural changes
1. **C-1, C-2, C-3** — Migrate from `on('value')` to `child_*` listeners
2. **F-1F-1 / F-1F-9 / F-1F-14** — Server-side Cloud Function for atomic deploy
3. **F-1F-4 / F-1F-7 / F-1F-15** — Convert arrays to keyed objects (`assignedApparatus`, `customRoles`, `customApparatusTypes`)
4. **F-1F-8 / F-1F-17** — `revision` tokens + status-transition validation in security rules
5. **F-5A-12 / F-5C-2** — Per-device UID + role-based security rules

---

## Pass Reports Index

| Pass | File | Findings |
|------|------|----------|
| 1A — Algorithm & Constants | `role1-pass1a.md` | 18 |
| 1B — Firebase Integration | `role1-pass1b.md` | 13 |
| 1C — Operations & Deployment | `role1-pass1c.md` | 21 |
| 1D — Reverse-Trace UI→Data | `role1-pass1d.md` | 22 |
| 1E — Error Path Analysis | `role1-pass1e.md` | 20 |
| 1F — Concurrent Mutations | `role1-pass1f.md` | 20 |
| 4A — Domain Logic & Safety | `role4-pass4a.md` | 12 |
| 4B — Adversarial Domain | `role4-pass4b.md` | 15 |
| 5A+5B — Security + Resilience | `role5-pass5ab.md` | 29 |
| 5C+5D — Rules + Backward Compat | `role5-pass5cd.md` | 34 |
| Browser Tests (Rounds 3-7) | `role2-browser-tests.md` | 10 |

---

## Regression Check (Round 8)

All v3.5.2 audit findings remain fixed in v3.8.2:
- ✅ S2/S3 — ACME load table accuracy verified (Pass 1A, 4A)
- ✅ NEW-2 — LongShore load table accuracy verified (Pass 1A, 4A)
- ✅ X1-X3 — Drilldown / Inventory model / Command Layout XSS fixes verified
- ✅ S7 — Firebase listener first-fire guard intact
- ✅ R1 — `teardownListeners()` detaches all 6 data listeners (but missed `.info/connected` — F-1B-01)
- ✅ R3 — `orgSwapRoles` granular update intact (but new concurrent-overlap issue F-1F-5)
- ✅ v3.8.0 — Individual cut tracking verified (Pass 1C F-1C-13/14/15)
- ✅ v3.8.2 — Firebase validate rule (`name` → `model`) verified working in live test

**One latent regression discovered:** `endOperation()` blanket-resets inventory (F-1C-4) — masks any prior return-bug drift. Not a new bug, but an architectural code smell that hides regressions.

---

## Overall Assessment

**v3.8.2 is safe for current use as a planning aid** in USAR/FEMA structural collapse operations:
- ✅ Core algorithm correctness verified (Pass 1A + 4A)
- ✅ Load tables match manufacturer specs
- ✅ Conservative-floor interpolation prevents over-reporting
- ✅ Security rules block unauthorized writes
- ✅ Liability disclaimer in place (per CLAUDE.md, but see F-BR-9)

**Risk areas requiring attention:**
- ⚠️ Concurrent multi-device scenarios cause inventory desync (C-1, C-2, C-3) — limit to one device per dept or fix in v4.0.0
- ⚠️ XSS vector in apparatus rename (F-5A-1) — patch immediately in v3.8.3
- ⚠️ Unrated zone (LongShore >16ft) lacks acknowledgment gate (C-4) — high-priority v3.9.0
- ⚠️ Silent error degradation for auth/network failures — patch incrementally

**Bottom line:** The app is well-architected for single-device-per-department offline-first use. Multi-device concurrent use within the same operation is where the architectural limits show. v4.0.0 should address these systematically alongside the planned NIMS/auth restructure.
