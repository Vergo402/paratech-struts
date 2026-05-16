# Pass 1F — Concurrent Mutation Analysis
**Auditor:** Senior Full-Stack Engineer (Opus)
**Date:** 2026-05-16
**Scope:** Race conditions, data integrity, concurrent operations across multi-device sync

## Summary

20 findings: **3 Critical**, **6 High**, 8 Medium, 1 Low-Medium, 1 Low, 1 Info.

**Critical class:** The optimistic local-first + whole-tree listener pattern allows inventory desync and phantom deployments under realistic multi-device load (3+ apparatus, 5+ users). F-1F-1, F-1F-2, F-1F-3 represent architectural-level concurrency issues that need v4.0.0-scale solutions (Cloud Function for atomic ops, child_added/changed listeners instead of value, revision tokens).

## Architecture Summary

- **Mutation pattern:** Listeners replace `localInventory` / `activeOperation` wholesale on every Firebase snapshot. Mutations apply locally first (synchronously), then dispatch async Firebase writes via `firebaseSave()`.
- **Transactions:** Only `inventory/{id}/available` and `externalEquipment/{id}/available` use `.transaction()`. Everything else (status, deployedStrut object, shore-point sets, role assignments, apparatus group membership, custom roles, assignedApparatus array) is last-writer-wins (LWW) via `set()` / `update()`.
- **No optimistic-locking / version tokens / revision IDs** anywhere.

## Findings

### F-1F-1: Strut deployment inventory + shore-point object are NOT atomic — phantom decrement
**Severity:** Critical
**Area:** `deployShorePoint` lines 3567–3725

User A taps Deploy. Local decrements `available` 1→0. Two async writes fire in parallel: SP `set()` and `available` transaction. User B (separate device) concurrently grabs the same last strut. B's transaction commits first. A's transaction sees `v=0`, clamps to 0 (`committed === true`, no warning). A's SP write succeeds — TWO shore points deployed against ONE physical strut.

**Fix:** Make SP write conditional on transaction's actual decrement. Inspect `result.snapshot.val()` and reject SP write if `v === 0` before decrement. Best: Cloud Function for atomic allocate+create. Toast "another user took the last unit" when transaction clamps.

### F-1F-2: Listener fires mid-operation and wipes local optimistic decrement
**Severity:** Critical
**Area:** `inventoryRef.on('value')` lines 1341–1359, `deployShorePoint` 3676

Listener wholesale-replaces `localInventory` on every snapshot. Mid-deploy: User A sets `available = 2`, transaction in flight. Listener fires (unrelated change by User B). Replaces `localInventory` from snapshot with `available = 3`. A's transaction completes 3→2. UI shows 3; Firebase shows 2.

**Fix:** Migrate to `child_added`/`child_changed`/`child_removed` events. Or maintain `pendingTransactions: Set<itemId>` and skip `available` reconciliation for keys with in-flight transactions.

### F-1F-3: Operations listener replaces `activeOperation` whole — destroys uncommitted mutations
**Severity:** Critical
**Area:** `activeOpsQuery.on('value')` lines 1361–1376

After local mutation (e.g., new apparatus group), before Firebase write reaches server, B's unrelated operation rename triggers listener fire. Snapshot doesn't include A's new group. `activeOperation` replaced — A's group vanishes. A's write lands later, but in-between renders show missing group.

**Fix:** Granular listeners per subtree (apparatusGroups, roles, shorePoints). Or "local overrides" dict merged on top of listener result until Firebase ack arrives.

### F-1F-4: `assignedApparatus` array uses `set()` — concurrent toggles lose entries
**Severity:** High
**Area:** `toggleApparatusAssignment` lines 2158–2172

User A toggles ON `eng-2`: writes `set(['eng-1', 'eng-2'])`. User B concurrently toggles ON `lad-3`: writes `set(['eng-1', 'lad-3'])`. Last-writer-wins drops the other apparatus silently.

**Fix:** Store as keyed object `{appId: true}`. Per-key `update()` or `set()`/`remove()` to toggle. Same migration needed for `customRoles`.

### F-1F-5: `orgSwapRoles` swap concurrent — partial-clobber overlap
**Severity:** High
**Area:** `orgSwapRoles` lines 2678–2707

R3 v3.6.0 fix used granular `update()`, but two users swapping with overlapping role keys still corrupt. A swaps Ops↔Safety: `{eng-1: 'safety', eng-2: 'operations'}`. B swaps Safety↔Rescue: `{eng-2: 'rescue', eng-3: 'safety'}`. After both: Operations unassigned, Safety has TWO apparatus.

**Fix:** Wrap read+swap in Firebase transaction on `roles` node. Re-derive assignedToA/B from `currentRoles` inside transaction body.

### F-1F-6: `getOperationInventory` returns live references — mutated underfoot
**Severity:** High
**Area:** `getOperationInventory` lines 2955–2986, `deployShorePoint` 3583, 3676

Listener reassigns `localInventory` to NEW array with NEW objects. Captured `strutInvItem` reference orphaned. Decrement on orphaned object. `persistInventory()` writes new array (pre-decrement) to localStorage. Local + localStorage look un-decremented but Firebase is correct.

**Fix:** After listener reassignment, captured references stale. Re-look-up by ID immediately before mutating: `localInventory.find(i => i.id === capturedId)`. Or patch in place — never reassign `localInventory`.

### F-1F-7: External equipment editing — `set()` whole object overrides concurrent decrement
**Severity:** High
**Area:** `confirmAddExternal` edit path lines 2810–2829, `deployShorePoint` 3673-3674

User A edits external equipment to raise qty. Writes whole object `{quantity: 5, available: 4}` (built from stale `existing.available = 2` with their offset). Concurrent: User B deploys, transaction decrements `available` 2→1. A's whole-object `set` lands after, overwrites `available` back to 4. B's deployed strut is "available" again — double allocation.

**Fix:** Use granular field updates. `firebaseSave(.../quantity, 'set', qty)` separately. `available` via transaction: `(v) => Math.max(0, (v||0) + delta)`.

### F-1F-8: Shore-point status regression — no lifecycle invariants
**Severity:** High
**Area:** `updateShoreStatus` lines 3735–3773

User A sends SP to runner. User B (stale view) sends back to cutting. Pings based on Firebase ordering, not user intent. `cutMarkedDone` flag set by A can collide with reset from B's `sendToRunner` — wood is cut but system says incomplete.

**Fix:** Add `revision: number` field. Increment via transaction. Reject local writes with stale revision. Enforce status-transition rules in security rules.

### F-1F-9: Two users deploy from group's last struts simultaneously → group total mismatch
**Severity:** High
**Area:** `deployShorePoint` 3567–3725

User A wants qty=4 raker. User B simultaneously deploys different shore with same strut model. Loop iterations interleave with listener replays. UI shows "3 of 4 deployed" but 2 of those struts are referenced by B's shore points.

**Fix:** Defer group-deploy loop until transactions confirm. `Promise.all` of N transactions, then create N SPs where N = successful allocations.

### F-1F-10: `pendingWrites` replay can resurrect deleted entities
**Severity:** Medium
**Area:** `firebaseSave` failure 847-851, `flushPendingWrites` 865-936

User A offline, deploys SP, queued. B (online elsewhere) deletes the op via archival. A reconnects, replay creates ghost SP under archived op.

**Fix:** Pre-flight `once('value')` check parent exists before replay. Or use `update()` on parent path so non-existent parents fail.

### F-1F-11: Apparatus groups can have orphan member references
**Severity:** Medium
**Area:** `confirmCreateGroup` lines 2216-2234

A creates group `[eng-1, eng-2]`. B concurrently removes `eng-1`. Filter at render time drops orphans but stored data has them.

**Fix:** Sanitation pass on read. Long-term: referential integrity in security rules.

### F-1F-12: `localInventory.filter(...)` reassignment breaks references in flight
**Severity:** Medium
**Area:** `updateQty` 1894, `removeApparatus` 1693, `quickAdd`

Click handler holds stale `item` reference. After listener reassigns array, `find()` returns undefined. Tap leads to nothing — user gets no feedback.

**Fix:** Toast on lookup failure. Defer click handlers behind microtask to re-resolve before mutation.

### F-1F-13: `endOperation` archival races with concurrent SP status change
**Severity:** Medium
**Area:** `endOperation` 4645-4671

User A ends op while User B sets SP to secured. Status flips back-and-forth depending on Firebase ordering. Double-return possible if B later transitions to returned.

**Fix:** Multi-path `update()` that sets all SP statuses + op archived atomically. Security rules reject status changes on archived ops.

### F-1F-14: Apparatus deletion races with deployed shore points — phantom inventory creation
**Severity:** Medium
**Area:** `removeApparatus` 1687-1710

A removes apparatus. B mid-deploy holds `strutInvItem` ref. B's transaction at line 3693: `v => Math.max(0, (v || 0) - 1)`. If node deleted, `v === null`, `(null||0) - 1 = -1`, clamped to 0 — RESURRECTS deleted node as `{available: 0}` (no model/quantity).

**Fix:** Mirror NEW-7 fix on deploy path: `v => { if (v === null) return undefined; return Math.max(0, v - 1); }` to abort transaction. Better: prevent apparatus deletion while ANY active op references it.

### F-1F-15: Custom roles list rebuild during concurrent assignment
**Severity:** Medium
**Area:** `removeCustomRole` 1161-1203, `saveCustomRoles` 988-994

Whole-array LWW. A removes role + its children. B adds new role under different parent. Last writer wins on the entire array.

**Fix:** Migrate `customRoles` from array to keyed object so `update()` semantics apply per role.

### F-1F-16: `renderInventory` consumes `localInventory` while listener replaces underfoot
**Severity:** Low-Medium
**Area:** `renderInventory` 1797-1883

Synchronous render, no interleave mid-loop. Risk between render calls. Multiple modals close in succession or listener-triggered render races UI-triggered render → DOM rebuilt twice, click handlers discarded mid-tap.

**Fix:** Throttle render via `requestAnimationFrame`. `_renderScheduled` flag to dedup multiple triggers per frame.

### F-1F-17: `getGroupMembers` skip check permits status regression (cross-ref F-1C-1)
**Severity:** Medium

Already documented in Pass 1C. Skip check at 3748 only skips members AT target status, not those past it. Concurrent group transitions can regress members.

**Fix:** Define explicit `VALID_TRANSITIONS` table. Reject transitions not in table. Mirror in security rules.

### F-1F-18: `customApparatusTypes` listener empty-array → null fallback to defaults
**Severity:** Low

Per Pass 5D F-5D-1. Empty array (user wanted empty) treated as null (fall back to defaults).

**Fix:** Track `_hasCustomTypes` flag. Don't reset to null on empty array.

### F-1F-19: Individuals add/remove races — ID collisions
**Severity:** Low
**Area:** `confirmAddIndividual` 2890-2913

`'i' + Date.now()` keys can collide across devices within same ms. Fallback inconsistency: some places use Firebase push key, others Date-based.

**Fix:** Always use `firebase.database().ref().push().key`. Fallback to local random ID with sufficient entropy.

### F-1F-20: `archivedOperations.sort(...)` mutates re-built array (verified safe)
**Severity:** Info

Listener reassigns array, render holds old reference. Click IDs may not exist; `viewArchivedOp` already guards with `find`/`return early`. Low severity.

---

## Severity Summary

| Severity | Count | IDs |
|----------|-------|-----|
| Critical | 3 | F-1F-1, F-1F-2, F-1F-3 |
| High | 6 | F-1F-4, F-1F-5, F-1F-6, F-1F-7, F-1F-8, F-1F-9 |
| Medium | 8 | F-1F-10, F-1F-11, F-1F-12, F-1F-13, F-1F-14, F-1F-15, F-1F-17, F-1F-18 |
| Low-Medium | 1 | F-1F-16 |
| Low | 1 | F-1F-19 |
| Info | 1 | F-1F-20 |

## Cross-Cutting Recommendations

1. **Stop wholesale array-replacement in listeners** (F-1F-2, F-1F-3, F-1F-6, F-1F-12, F-1F-16) — switch to `child_*` listeners or merge-in-place patterns.
2. **Convert arrays to keyed objects** for `assignedApparatus`, `customRoles`, `customApparatusTypes`, `shorePoints` (F-1F-4, F-1F-7, F-1F-15, F-1F-18) — eliminates LWW on entire collections.
3. **Make deployment a server-side atomic operation** via Cloud Function (F-1F-1, F-1F-9, F-1F-14) — current SP write + inventory transaction are independent.
4. **Add status-transition validation** in security rules and client (F-1F-8, F-1F-17). Define `VALID_TRANSITIONS` table.
5. **Mirror v3.5.2 NEW-7 transaction fix on deploy path** (F-1F-14) — abort transactions targeting null nodes.
6. **Add `revision` token** on shore points and inventory items so optimistic-update conflicts surface as user-visible "out-of-date — refresh" toasts.
7. **Guard pending-write replay** against parent existence (F-1F-10) — verify parents exist before replaying queued writes after long offline periods.

**Cumulative high-priority class:** F-1F-1 + F-1F-2 + F-1F-9 + F-1F-14 under realistic Surfside/Task Force scale (3+ apparatus, 5+ users), inventory consistency will silently drift and shore points will deploy against ghost equipment within hours. Bundle into v4.0.0 architectural fix.
