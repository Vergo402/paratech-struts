# ADR-041: Canonical event order (cloud receipt), unconditional merge, and log-derived inventory

> Architecture Decision Record. Every committed design choice gets one. The number is the next sequential ID.

---

## Status

- [ ] Proposed
- [x] Accepted
- [ ] Superseded by ADR-XXXX
- [ ] Deprecated

**Date:** 2026-10-10
**Author:** Fable (architect), plan `plan-499-mutable-fountain.md`
**Reviewer(s):** Alex (decisions D1–D5 taken in plan mode 2026-10-10; plan approved)

---

## Context

The #262 tabletop exercise (three devices on local emulators, report `.claude/audits/phase-j/262-ttx/REPORT.md` F1/F2, issue #499) showed that two devices acting while one is offline end up with permanently different state — Incident Commander, shore-point status and stock counts — with no signal on any device.

Four properties of the v4 data layer combine to produce this:

1. **No shared fold order.** Each device folds its log in local append order (Dexie `seq`; `operationStore.ts` commit path and `boot()`). A peer event that happened earlier than events already folded is applied after them. `reconcile()` sorted only the incoming batch by `(at, id)`.
2. **Premise-based drops.** A peer `ShorePointStatusChanged` whose `from` did not match the local status was dropped before commit (the L-7 guard), and inventory-consequential peer events were rejected by the local pre-flight. Two devices therefore ended up holding *different* event sets, so no ordering rule could reconcile them.
3. **Unkeyed, non-commutative transfer resolvers.** `CommandTransferAccepted` and `Cancelled`/`Declined` each no-op once `commandTransfer` is null, and none named which initiate it resolved.
4. **Stored stock.** Inventory `available` was a durable field mutated inside the local commit transaction; the cloud row carried `quantity` only, and each device reconstructed "deployed" as `quantity − local available`. Stock followed whichever branch the device applied.

Constraints: ADR-009 (append-only event log; state is a projection), ADR-010 (status always reversible — no "most-advanced wins"), ADR-021 (exactly one IC of record), ADR-024 (per-row sync state is life-safety), Principle 10 (no pushes during an operation; losing state is shown as a persistent quiet state). The design docs at `07-design-system/architecture.md:111` and decision-matrix row I-19 described rules the code never implemented (a most-advanced-status merge; a transaction + `offlineTouched` stock model). Deployment status: beta, no fielded users (CLAUDE.md), so a one-time re-sort on upgrade is acceptable.

---

## Decision

**Fold every device's log in one canonical order, keyed by cloud receipt: `(receivedAt ?? +∞, at, id)`. Append every valid peer event unconditionally and let pure reducers no-op the losing branch deterministically. Derive inventory stock from the folded log (`available = quantity − held`, signed). Key the transfer handshake by `transferId`. Show the losing branch to the device that lost.**

Specifically:

- **D1 — cloud-first.** `receivedAt` is the RTDB server timestamp stamped on upload (`serverTimestamp()`); the cloud rule requires `receivedAt == now` on every event create. A device's own committed-but-unconfirmed events are *provisional* (no `receivedAt`) and sort after every received event, among themselves by `(at, id)`. Legacy cloud events without a stamp fold as `receivedAt = at`, normalized once at ingest. The change that reached the cloud first stands; online devices never see their board rewritten by a reconnecting phone.
- **Echo gate.** The RTDB SDK raises a local snapshot for the device's own `set()` with an *estimated* server value before the server acknowledges. A snapshot's `receivedAt` for an own event is ignored while that id is still in the upload queue; after the write resolves, the server value is read from the snapshot index (fallback: a one-shot `get`) and stamped via `markReceived`.
- **Ordered upload.** `flush()` drains strictly in commit order and stops the pass at the first failure, so upload order = commit order. A `commitMany` batch carries a `batchId` and uploads as one multi-path `update()`. A rejected re-upload whose id is already present in the latest snapshot is a lost acknowledgment, not a failure.
- **D2-clock — monotonic per device.** The store stamps `at` on every local commit from `max(Date.now(), last + 1)`; the clock observes only this device's own events (observing peers would let one skewed clock poison every timestamp fleet-wide); a 24 h forward skew resets with a diagnostic. `at` remains audit time; `receivedAt` is order; reducers never read `receivedAt`.
- **D3 — unconditional merge.** Peer events are schema-validated, deduplicated against the in-memory id set, appended durably (a per-row unique-index conflict means another tab already stored it) and folded. The L-7 drop and the remote pre-flight rejections are removed. Local commits keep a read-only pre-flight as user-error prevention. The fold is op-scoped: per-op states are folded from empty; a late arrival re-folds only the affected operation (two-tier: received state + provisional tail).
- **Active operation** = the earliest un-ended `OperationCreated`/`OperationReopened` in canonical order; a later one while an op is active folds as no-effect and is listed in Past operations as *superseded* (read-only; no synthetic `OperationEnded`).
- **Batch-atomic fold.** Events sharing a `batchId` fold all-or-nothing: if any member no-ops, the whole batch is no-effect (restores #421's invariant on peers; prevents a partial restructure).
- **Fold-time guards replace the remote pre-flight.** `ShorePointDeleted` (hard or soft) no-ops on a point holding equipment. `EquipmentDeployed` carries **no** fold-time safety verdict (D4): a deploy that reached the log without the UI's acknowledgment folds as deployed and shows the red capacity flag at read time (`deployedCapacityFlag` gains `noFit`/`exceedsCapacity`). The verdict stays catalog-independent and the fold cannot differ between app builds.
- **Transfer identity.** `PendingTransfer.transferId` = the initiating event's id; Accepted/Declined/Cancelled carry `transferId` and resolve only the matching pending; absent = legacy behaviour. `[Init, Cancel, Accept]` and `[Init, Accept, Cancel]` converge on every device.
- **D2-stock — derived inventory.** `held(inventoryId)` = tracked BOM components on shore points with `deployedBom` and `status !== 'returned'`, summed over every operation in the bucket, skipping operations whose latest `OperationEnded` carries `stockReleased` (D5: the End Operation confirm offers "All equipment is back on the rigs"; `OperationReopened` re-holds). `available = quantity − held` **may be negative**: two offline deploys of the last unit both stand and the rig shows an over-allocated tell. `available` is no longer persisted anywhere (schema, Dexie row, cloud row); `quantity` stays a manual last-write-wins field, applied verbatim from peers (no deployed-floor clamp — the clamp made quantity diverge per device). The load engine clamps a negative row at 0 at its boundary so an over-allocated rig never subtracts from a sibling's pool.
- **D3-surfacing — losing branch shown.** Fold outcomes (`applied` / `no-effect`, by reference identity — every reducer returns its input on a no-op) drive: a persistent quiet line in the sync-indicator area on the device whose own events lost ("Synced — N of your changes had no effect", drill-in rows, acknowledged with "Got it"); "— no effect" qualifiers in the point timeline, role history and audit log; the over-allocated chip on inventory rows; a "superseded" row in Past operations. Never a push or a modal (Principle 10). The #404 peer-cut badge counts only newly inserted applied arrivals (never retroactive).

---

## Rationale

- **Receipt order over device clocks.** A phone-clock order would let a reconnecting phone rewrite the boards of every device that stayed online (the TTX evidence shows the offline actor carrying the *earlier* `at` in both races), and would depend on fireground phone clocks. Receipt order changes only the device that was offline — the one that already expects to catch up — and the server is the one clock everyone shares (ADR-009's "conflict resolution mostly evaporates" holds only with a shared order).
- **Append, don't drop.** Dropping a peer event on a premise mismatch is what let two devices hold different event sets (LESSONS §5, silent rejection). With a shared order, a losing event is harmless in the log — the reducer no-ops it everywhere — and keeping it is what makes the loss *visible* (ADR-024: staleness is life-safety).
- **Stock as a projection.** Any stored counter that two devices mutate independently diverges by construction. Deriving `held` from the same log that carries status makes stock and status unable to disagree, and makes #500 (duplicate deploys) converge for free. Negative availability is the truthful rendering of two crews having claimed one strut; hiding one crew's deploy would be the dangerous choice.
- **No fold-time catalog dependence.** A fold that consults the strut/plate tables would make history re-write itself on a catalog edit and diverge between builds (`shorepoint/reducer.ts:35-45` already forbids this for plate heights). The safety verdict therefore stays in the local pre-flight and at read time.
- **Reference identity as the outcome signal.** It costs nothing in the hot path, needs no second reducer vocabulary, and the sweep test makes every future reducer branch honour it.

---

## Alternatives Considered

- **Phone-clock canonical order `(at, id)` with a hybrid logical clock.** Rejected: online boards flip on reconnect; clock skew decides winners; HLC `observe()` of peer events propagates one bad clock to the whole fleet's audit timestamps.
- **Most-advanced-status-wins merge** (as `architecture.md:111` described). Rejected: contradicts ADR-010 (always reversible), silently overrides a deliberate step-back, and does nothing for transfers or inventory.
- **Keep stored `available` and compensate the loser in the same transaction.** Rejected: compensation needs every device to agree on the loser before it can compensate, which is the ordering problem restated; it also leaves the "deployed = quantity − available" reconstruction that already drifted.
- **Fold-time safety verdict with verdict bits stamped on the deploy event.** Rejected (D4): keeps the point Pending on every device while a strut may physically stand, and re-opens a build-dependent fold. Read-time flagging keeps the truth visible without rewriting the log.
- **Server-side merge (Cloud Function or a sync service such as PowerSync, ADR-024's escape hatch).** Deferred: the client-side canonical fold closes the defect class without a new runtime; the escape hatch remains available.

---

## Consequences

- **Positive:** every device holding the same events shows the same IC, statuses and stock; the losing branch is visible on the device that lost; #500 converges; two tabs on one phone converge via the in-memory id set; the audit log, role history and point timeline read in the same order on every device.
- **Negative:** last-write-wins reducers (`OperationEdited`, `PositionRenamed/Reordered`, `ChecklistItemChecked`, `CuttingClaimed`, label/crew patches) stay LWW — all devices agree, but a reconnecting phone can overwrite an online edit without a tell (a `from`-premise follow-up is filed, not built). An operation ended with equipment still out keeps that stock counted until a point is reclaimed or `stockReleased` is recorded. Rules must deploy **after** the client build (a pre-fix build cannot write `receivedAt == now`); a stale service-worker build will fail to upload until it refreshes. First boot after the upgrade re-sorts the local log once; events the old code silently dropped now fold in, so boards may move once without user action (beta-only exposure).
- **Neutral:** Dexie `seq` remains the primary key but is no longer the fold order; the seed data's "stock on paper, none available" rig loses its premise (held counts come from events, not seed rows); the TTX driver reads stock as `quantity − held` from dumped events.

---

## Related

- Principles: 6 (as amended by ADR-010), 8, 9, 10.
- Other ADRs: builds on ADR-009 (event log as spine), ADR-010 (always-reversible status), ADR-021 (transfer handshake), ADR-024 (multi-device build; strikes the `offlineTouched` port at line 31), ADR-033 (atomic BOM deploy — the pre-flight guard moves to fold time), ADR-036 (reopen). Supersedes decision-matrix row I-19 (transaction + `offlineTouched` stock) and the `architecture.md:111` progression-guard sentence.
- Open questions resolved: which branch wins a concurrent cancel-vs-accept (ADR-021 was silent) — the cloud order.
- Open questions surfaced: a `from` premise for LWW edits; per-op `child_added` listeners instead of the whole-subtree `onValue` at Level I scale; a probe filter for the TTX driver.

---

## Notes

- Verified behaviour that shaped the echo gate: `@firebase/database` applies a `set()` to the local cache and raises the ancestor `onValue` with `serverTimestamp()` resolved to `Date.now() + serverTimeOffset` *before* the write reaches the server; the acknowledged snapshot with the real server value is raised before the `set()` promise resolves (`node_modules/@firebase/database/dist/index.esm.js`, `repoSetWithPriority`).
- The accepted UI mockup for the surfacing is `.claude/audits/phase-j/499-shots/mockup-accepted-2026-10-10.png`.
- Regression proof: the two-device convergence property test and TTX probes 1c, 4, 6, 12 and C-1 on the emulator harness.
