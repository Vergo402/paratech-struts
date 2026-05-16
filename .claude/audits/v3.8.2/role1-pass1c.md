# Pass 1C — Operations, Shore Points, Deployment
**Auditor:** Senior Full-Stack Engineer (Opus)
**Date:** 2026-05-16
**Scope:** Lines 2500-4600 (with reference to broader file as needed)

## Summary

21 findings: **3 High**, 6 Medium, 6 Low, 6 Info. The High-severity findings expose architectural issues in the optimistic-update + Firebase listener pattern that surface as data desync. The v3.8.2 security-rules fix addresses the symptom (PERMISSION_DENIED) but transactions remain silently dropped on failure, which is a deeper issue (F-1C-3).

## Findings

### F-1C-1: Group status regression — pre-cutting transitions silently clobber advanced members
**Severity:** High
**Area:** `updateShoreStatus()` (line 3735-3773)

The split rule `members = individualPhase.includes(normalizeStatus(sp.status)) ? [sp] : getGroupMembers(spId)` uses the CLICKED SP's status to decide whether to act on the group. When the clicked SP is in a pre-cutting phase (e.g. `process`), the WHOLE group is taken — but group members may have advanced into cutting/runner/secured already. The skip check at line 3748 only skips when `member.status === newStatus`. There is no check to prevent REGRESSING a member that's at a later status.

**Expected:** Clicking "→ Strut Placed" on SP-B (at `process`) where group-mate SP-A is at `cutting`/`runner`/`secured` should leave SP-A alone.
**Actual:** SP-A is forcibly set back to `strutplaced` via `Object.assign(member, {status: 'strutplaced'})`, wiping its cut progress. `cutLength`/`cuttingStartedAt`/`cutMarkedDone`/`actualCutLength` remain on the SP record but become orphaned and contradictory with the new status.
**Reproduction:** Deploy qty=2. Advance both to cutting. Send SP-B back to strutplaced, then back to process. Click "→ Strut Placed" on SP-B. SP-A regresses from cutting to strutplaced.
**Fix:** Add a status-progression guard before mutating:
```js
if (STATUS_ORDER.indexOf(normalizeStatus(member.status)) >= STATUS_ORDER.indexOf(newStatus)) continue;
```

### F-1C-2: Listener overwrites in-flight optimistic state with stale snapshot
**Severity:** High
**Area:** `activeOpsQuery.on('value')` (line 1362-1376), `inventoryRef.on('value')` (line 1341-1359)

Both listeners unconditionally replace local state (`activeOperation` / `localInventory`) with the latest snapshot. After a local-first mutation, the snapshot fires once with the pre-update state (because the write is in-flight), then again with the post-update state. The first fire transiently wipes the just-applied local change. With multiple rapid mutations (deploy 4x quickly, two-user simultaneous edits), interim wipes cause flicker and brief incorrect renders.

**Expected:** Either (a) listener merges by path/id rather than replacing whole tree, or (b) optimistic local writes are tagged with a pending epoch so a stale snapshot doesn't overwrite a newer local change.
**Actual:** Whole-tree replacement on every snapshot fire — last-listener-fire wins; flicker visible to user.
**Fix:** Track pending write timestamps per shore-point / inventory id; in the listener, skip applying a snapshot value if a more recent local mutation is still pending. Or migrate listeners to per-child `child_added`/`child_changed`/`child_removed` events.

### F-1C-3: Transaction-style Firebase writes are silently dropped on failure
**Severity:** High
**Area:** `firebaseSave()` catch handler (line 844-862)

When `method === 'transaction'` and the write fails (offline, timeout, security rule), the failed op is logged to diagnostics but NOT queued to `pendingWrites` — the `if (method !== 'transaction')` guard skips the queue. Inventory increments/decrements use transactions exclusively (`deployShorePoint` lines 3691-3700, `returnInventoryItems` lines 4582-4609). Result: while offline, every deploy/return desyncs Firebase's `available` counters from local state. On reconnect, the inventory listener (line 1355) overwrites local with stale Firebase values, undoing the local decrements.

**Expected:** Inventory transactions either re-run on reconnect or fall back to a value-based update so they can be queued.
**Actual:** Silently dropped. After enough offline traffic, Firebase `available` ≠ true deployed count, and the listener pollutes back into local.
**Fix:** For each transaction, also queue a value-resync write that recomputes `available` from local state (count deployed SPs referencing this inventoryId) and pushes it on reconnect. Or move to computing `available` server-side as `quantity − count(activeDeploys)` and stop persisting it.

### F-1C-4: `endOperation()` blanket-resets ALL inventory — masks bugs and risks clobbering concurrent state
**Severity:** Medium
**Area:** `endOperation()` lines 4653-4665

After looping `returnEquipment()` for each shore point, the function unconditionally sets `localInventory[i].available = item.quantity` for every item, then Firebase-`set`s every `available` to `item.quantity`. This is correct in the happy path but silently masks prior return-inventory drift, and on Firebase it overwrites `available` with a `set` for every item (bypassing the transaction handler).

**Fix:** Remove the blanket reset; trust per-SP `returnInventoryItems()`. If a defensive sanity sweep is desired, log discrepancies rather than silently overwriting them.

### F-1C-5: `endOperation()` performs O(N) full re-renders inside its return loop
**Severity:** Medium
**Area:** `endOperation()` lines 4648-4651

The loop calls `returnEquipment(sp.id)` for each non-returned SP. Each invocation runs full persist + render. For 50 shore points: 50 renders and 100 localStorage writes plus N Firebase transactions.

**Fix:** Inline the inventory-and-status logic without per-iteration render. End with a single persist+render. (Cross-referenced with F-1B-04 and F-5B-13.)

### F-1C-6: `endOperation()` does not call `renderInventory()` after the blanket inventory reset
**Severity:** Low
**Area:** `endOperation()` lines 4667-4670

After resetting `localInventory[i].available = item.quantity`, only `renderOperations()` is called. Inventory tab shows stale values until next render trigger.

**Fix:** Append `renderInventory();` to the end of `endOperation()`.

### F-1C-7: `assignEquipmentToPending()` does not actually assign equipment — UX dead end
**Severity:** Medium
**Area:** `assignEquipmentToPending()` line 3507-3514

Button labeled "🔧 Assign Equipment" delegates to `editShorePoint()`, which hides the Find button. The user can ONLY change location/label/load — they cannot trigger a strut search and convert the pending SP into a deployed one. Misleading button; pending SPs cannot be deployed without deletion + re-add.

**Fix:** Keep the Find button visible when editing a pending SP and add a "deploy into this pending SP" code path. On deploy, mutate the existing SP record in place rather than creating a new one.

### F-1C-8: `confirmStartOp()` silently swallows empty-name submission
**Severity:** Low
**Area:** `confirmStartOp()` lines 3385-3386

Early return leaves the modal open with no error message. User clicks "Start" and nothing happens.

**Fix:** `if (!name) { alert('Operation name is required.'); return; }` and/or focus #newOpName.

### F-1C-9: `groupId` collision risk — only uses `Date.now()` with no randomness
**Severity:** Low
**Area:** `deployShorePoint()` line 3580

`'grp-' + Date.now()` — two simultaneous deploys across devices would produce the same groupId, merging unrelated shore-point groups.

**Fix:** `const groupId = qty > 1 ? 'grp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6) : null;`

### F-1C-10: Card lock is purely cosmetic — action buttons fire regardless of role
**Severity:** Medium
**Area:** `renderShorePointCards()` lines 3211-3214, `updateShoreStatus()` line 3735

Comment says "Card locks at 'placed' and beyond — only IC/Safety can unlock", but transition buttons remain visible and `updateShoreStatus()` performs no role check. False sense of access control.

**Fix:** Gate transition buttons on `myRole` when `isLocked`, OR add an early `guardLocked()` check in `updateShoreStatus()` that no-ops with a toast for non-privileged taps.

### F-1C-11: `getOperationInventory()` inconsistent `available > 0` filter between local and external
**Severity:** Low
**Area:** `getOperationInventory()` lines 2955-2986

Local-inventory filter returns items regardless of `available` count. External-equipment loop skips items with `available <= 0`. No current bug (downstream re-checks) but inconsistent.

**Fix:** Add `i.available > 0` to the local filter, or remove the check from the external loop.

### F-1C-12: Inventory item references returned by `getOperationInventory()` are LIVE references — implicit contract
**Severity:** Info
**Area:** `getOperationInventory()`

Verified correct but undocumented contract. `filter()` returns a new array but elements are same object references. Future refactor using `.map(i => ({...i}))` would silently break local-first pattern.

**Fix:** Add code comment documenting the live-reference contract.

### F-1C-13: `markCutDone()` / `sendToRunner()` correctly individual — verified
**Severity:** Info
**Area:** `markCutDone()` lines 4422-4443; `sendToRunner()` lines 4399-4420

Both operate on a single SP found by id and never invoke `getGroupMembers()`. Matches v3.8.0 spec.

### F-1C-14: `returnEquipment()` correctly individual + renders inventory — verified
**Severity:** Info
**Area:** `returnEquipment()` lines 4630-4643

Calls `persistOperation()` + `persistInventory()` + `renderInventory()` + `renderOperations()` in correct order. Matches v3.8.0 spec.

### F-1C-15: `deployShorePoint()` correctly renders inventory after persist — verified
**Severity:** Info
**Area:** `deployShorePoint()` lines 3706-3722

Calls `persistOperation()` → `persistInventory()` → `renderInventory()` → `renderOperations()` when deployed.length > 0. Matches v3.8.0 spec.

### F-1C-16: `deployShorePoint()` extension deduplication logic is correct but obtuse
**Severity:** Medium
**Area:** `deployShorePoint()` lines 3594-3605

Dedupe predicate compares `i.available` against count of in-this-call picks for the same id. Works because `i.available` is read fresh each iteration. Future refactors that delay the decrement could break this silently.

**Fix:** Pre-compute `const extRemaining = new Map(...)` and decrement in-loop. Refactor-resistant.

### F-1C-17: `deployShorePoint()` plate selection is non-deterministic across apparatus
**Severity:** Medium
**Area:** `deployShorePoint()` lines 3623-3628

Plate-pick takes first match from `opInv`. If multiple apparatus carry the same plate, the chosen apparatus depends on `localInventory` order (Firebase snapshot order, non-deterministic across reloads). Return-equipment audit trails become inconsistent.

**Fix:** Prefer `i.apparatus === strutInvItem.apparatus` first; fall back to any.

### F-1C-18: `deployedExtensions[*]` resolution within qty>1 deploy — verified safe
**Severity:** Info
**Area:** `deployShorePoint()` lines 3594-3656

Within one deploy call, find and decrement happen in the same outer loop. Per-iteration recompute confirmed safe.

### F-1C-19: Firebase-sourced fields rendered raw — stored XSS via peer write
**Severity:** Medium
**Area:** `renderShorePointCards()` lines 3234-3240, `viewArchivedOp()` lines 3354-3360

`sp.requiredLength`, `sp.estimatedLoad`, `sp.deployedStrut.model`, `ext.length` interpolated raw. Firebase rules require auth but don't validate per-field schema for these paths. Any authenticated peer can poison the data — e.g. `deployedStrut.model = '<img src=x onerror=...>'` — and trigger stored XSS on every peer rendering the op.

**Fix:** Wrap user-controllable strings in `escapeHtml()`. Coerce numerics via `Number()`. Add database validation rules.

### F-1C-20: `getGroupMembers()` returns `[]` for missing SP — masks bugs upstream
**Severity:** Low
**Area:** `getGroupMembers()` lines 3728-3733

`[sp].filter(Boolean)` returns `[]` for undefined sp. Silent no-op for callers. No current bug but foot-gun for future callers.

**Fix:** `if (!sp) { console.warn('getGroupMembers: SP not found:', spId); return []; }`

### F-1C-21: `deployPendingShorePoint()` ignores `spQuantity` — always creates 1 SP
**Severity:** Low
**Area:** `deployPendingShorePoint()` lines 3516-3565

Shore-point modal supports qty selection (1-4), but pending SPs are always saved as a single SP regardless of qty. Inconsistent with `deployShorePoint`.

**Fix:** Loop n=0..spQuantity-1, set groupId/groupIndex/groupTotal when spQuantity>1.

---

## Severity Summary

| Severity | Count | IDs |
|----------|-------|-----|
| Critical | 0 | — |
| High | 3 | F-1C-1, F-1C-2, F-1C-3 |
| Medium | 6 | F-1C-4, F-1C-5, F-1C-7, F-1C-10, F-1C-16, F-1C-17, F-1C-19 |
| Low | 6 | F-1C-6, F-1C-8, F-1C-9, F-1C-11, F-1C-20, F-1C-21 |
| Info | 6 | F-1C-12, F-1C-13, F-1C-14, F-1C-15, F-1C-18 |
