# ADR-036: A finished operation can be re-opened (archive is recoverable, not terminal)

## Status

- [ ] Proposed
- [x] Accepted *(Alex's ruling — "Add a way back," 2026-06-17)*

**Date:** 2026-06-17
**Author:** Claude (recording Alex's ruling)
**Reviewer(s):** Alex (ruled 2026-06-17, the confirm-before-plan gate on Session 3)

**Amends:** [`16-end-of-operation.md`](../09-workflows/16-end-of-operation.md) — resolves its OQ2 ("Re-open an archived operation"), which had deferred re-open with the stopgap answer "start a new operation." Re-open now ships in v4.0.

---

## Context

The end-of-operation workflow spec ([`16-end-of-operation.md`](../09-workflows/16-end-of-operation.md))
treated ending an operation as the lifecycle's one **terminal** commit: the confirm modal states the
record "cannot be re-opened," and OQ2 deferred any real re-open path. The recovery story for a mistake
was "start a new operation."

Two field realities pushed back when Alex re-evaluated the spec before planning Session 3:

- **The 3am fat-finger.** End Operation is a single confirmed tap. A tired IC who ends the wrong
  incident — or ends the right one a beat too early — would otherwise have to **rebuild the entire
  board from scratch** (at Surfside scale, 200+ shore points). That is not a recovery; it is a
  re-entry shift.
- **The reflash / not-actually-done case.** A structure called clear can re-involve; an operation
  thought complete can need to resume on the same incident record, not a fresh one.

The event log already makes this cheap: every operation's events are **retained**, so an ended
operation is fully re-projectable (`projectOperationById`). Nothing was deleted on end — only the
operation's status flipped to `ended`. "Re-open" is therefore a small, honest addition, not a data
recovery feat.

This is **not** a reversal of [ADR-010](ADR-010-status-commit-model.md) (no timed undo). ADR-010
bans an *automatic, time-boxed* undo of a just-made commit. Re-open is the opposite shape: an
**explicit, deliberate, separately-confirmed action** taken later on an **archived record** the user
navigated to on purpose. It is a new forward command (`OperationReopened`), not an un-commit.

---

## Decision

**An ended operation can be re-opened, making it the active operation again with every shore point
intact.**

- **Trigger:** a "Re-open this incident" action inside the read-only archive drill-in
  (`PastOperationView`), behind a **Cancel-first confirm** modal. Re-open is never one tap.
- **Authority:** **any connected device** may re-open. Once an operation has ended there is no live
  command structure to gate against; the confirm is the guard. The department login/permissions
  system (RBAC) is deferred (auth builds above the data/sync seam, stubbed for now), so a
  device-level gate is the only one that can be *truly* enforced today — a role label would be
  decoration, not a lock. **Revisit when auth lands:** an Admin/command gate may then be added.
- **One active operation at a time (hard constraint).** Re-open is offered only from the empty
  state (no active operation), and the store **rejects** an `OperationReopened` commit when an
  operation is already active (`reason: 'an operation is already active'`). You can never run two.
- **Mechanism:** a new `OperationReopened` event flips the op's status back to `active`. Because the
  active projection is **op-scoped** (it folds only the active operation's events — see Session 3),
  re-opening rebuilds that incident's full state from the retained log, which the incremental
  reducer alone could not do after a different op had started.

---

## Rationale

- **The field test outranks the spec's caution.** The "terminal" framing was a Phase-F default, not a
  field-validated decision. Re-evaluating it before building, the recovery cost of a mis-tap (rebuild
  the whole board) is plainly unacceptable.
- **The log already supports it.** Events are retained; an ended op is re-projectable. Re-open is a
  status flip, not a resurrection — low risk, high safety value.
- **Device-level gate is the honest gate.** Anything stronger pretends an enforcement that the
  not-yet-built auth layer can't back. Don't ship a lock with no bolt.
- **Not an ADR-010 violation.** Explicit, confirmed, later, on an archived record — a forward command,
  not a timed auto-undo.

## Trade-off accepted (stated plainly)

Re-open is gated only by a confirm dialog, so on a shared device anyone can resurrect a closed
incident. This is acceptable for v4.0: the surface is post-incident (no live tactical state to
corrupt), the action is explicit and confirmed, and the one-active-op rule prevents the only
structurally dangerous case (two live operations). When auth/RBAC lands, an optional command-level
gate can be layered on without changing the event or the projection.

---

## Alternatives Considered

- **Keep archive terminal; recover by starting a new operation (the spec's stopgap).** Rejected —
  forces a full board rebuild for a single mis-tap; unworkable at scale.
- **Gate re-open to an Admin / command role now.** Rejected as premature — the permissions system
  isn't built, so the gate would be unenforceable today (a label, not a lock). Deferred to the
  auth session.
- **A timed undo on End Operation instead of re-open.** Rejected — that *is* the ADR-010-banned shape,
  and a time-boxed window doesn't cover the reflash case (which can be hours later).
- **Allow re-open even with an active op (auto-archive the current one).** Rejected — silently ending
  a live incident to resurrect an old one is exactly the kind of destructive surprise the confirm
  doctrine exists to prevent. One active op; re-open only from the empty state.

---

## Consequences

- **Positive:** a mis-ended or re-flared incident is recovered in two taps with all shore points
  intact; no board rebuild. The fix rides the retained event log — no new storage.
- **Negative:** on a shared device re-open isn't access-controlled until auth lands (trade-off above).
- **Code (Session 3):** new `OperationReopened` event + reducer case; the active projection becomes
  op-scoped (`projectOperation` folds only the active op — also fixes a latent cross-incident
  shore-point bleed); `projectOperationById` / `projectArchive` read projections; store re-projects
  on the three lifecycle-boundary events and pre-flight-rejects re-open when an op is active;
  `PastOperationView` hosts the confirmed re-open.
- **Docs amended:** [`16-end-of-operation.md`](../09-workflows/16-end-of-operation.md) OQ1 (archive
  surface now built) + OQ2 (re-open resolved here).

---

## Related

- **ADRs:** [ADR-010](ADR-010-status-commit-model.md) (no timed undo — re-open is a forward command,
  not an un-commit); [ADR-030](ADR-030-recoverable-shore-point-delete.md) (the same "recoverable, not
  terminal" instinct applied to shore-point delete); [ADR-009](ADR-009-database-firebase-rtdb.md)
  (the retained event log that makes re-projection free).
- **Workflow:** [`16-end-of-operation.md`](../09-workflows/16-end-of-operation.md).
- **Ruling record:** Alex, 2026-06-17 — confirm-before-plan gate on Session 3: "Add a way back."
- **Principles:** 3 (calm in chaos — a mistake is recoverable, not catastrophic); 6 (always-reversible).
