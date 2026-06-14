# ADR-030: Recoverable shore-point delete — soft-delete + Restore

> Architecture Decision Record. Turns the shore-point delete into a soft-delete with a board **Deleted** section and a one-tap Restore. Adds a `deletedAt` field to the `ShorePoint` schema and a `ShorePointRestored` event. Born from the Phase H slice re-drive ([#248](https://github.com/Vergo402/paratech-struts/issues/248)) as the condition Alex set for accepting ADR-029's gappy numbering; tracked as [#319](https://github.com/Vergo402/paratech-struts/issues/319).

---

## Status

- [x] Proposed
- [x] Accepted *(Phase H re-drive — Alex, 2026-06-14)*

**Date:** 2026-06-14
**Author:** Claude Opus 4.8 (Phase H re-drive session)
**Reviewer(s):** Alex (chose the board-section placement + the "Deleted" naming)

---

## Context

Before this, a confirmed delete (`DeleteShorePointModal` → `ShorePointDeleted` event → reducer `.filter()`) dropped the card off the board with **no in-app way to get it back**. The event log keeps the bytes (append-only, ADR-009) but nothing surfaced them — a crew couldn't undo a mis-tap mid-incident.

This is the paired half of **ADR-029**: that ADR makes a shore-point number survive deletion (`max+1`, never reused), and Alex's condition for accepting the resulting **number gaps** (`#1 #2 #4`) was that **a deleted point must be recoverable**. A gap you can walk back is fine; a gap from an irrecoverable mistake is not.

A timed undo toast was rejected — the status-commit model already rejected timed undo (ADR-010/026: always-reversible, visible state, never a disappearing affordance).

---

## Decision

1. **Soft-delete, not hard.** `ShorePointDeleted` stamps `ShorePoint.deletedAt` (epoch ms) and **keeps the point in the projection**; it is no longer filtered out. A new **`ShorePointRestored`** event clears the stamp. The event type name is unchanged (old logs replay as soft-deletes — harmless).
2. **A board "Deleted" section.** Soft-deleted points leave the seven status lanes (excluded from lanes *and* their counts/summary bar) and collect in a collapsed **Deleted (N)** section at the bottom of the board — always visible when N > 0, collapsed by default. Each row is a slim line: the `#N` tab, `label · type`, `division · area`, and a **Restore** button. Not the full card — its slides/Edit/Delete don't apply to a deleted point.
3. **Restore is one tap, no confirm.** Restoring is itself reversible, so it needs no gate. Delete keeps its confirm (removing active work is deliberate), with copy that now says it's recoverable.
4. **"Deleted," not "Removed."** The word is *deleted* throughout (section, flag, copy). "Removed" is reserved for the cutting off-queue sense — the card's presentational `removed` prop / "Removed from cut list" (#222) — and would imply the point had travelled the workflow.

---

## Rationale

- **The number-survival rule needs an escape hatch, and this is it.** ADR-029 trades a tidy sequence for a stable radio handle; recoverable delete is what makes that trade safe.
- **Soft-delete makes the high-water mark free.** Because the point stays in the `shorePoints` array (just flagged), `nextSeqBase` already maxes over it — a restored `#3` can never collide with a later `#4`, with **no change to the numbering helper** (the issue's "derive max from the event log" fallback is unnecessary).
- **Visible state over hidden trash (Principle 10).** A labelled, counted section beats a hidden "show deleted" toggle: the crew can always see that something *was* deleted and walk it back. A bottom sheet was rejected — a sheet is an interrupt by doctrine (ADR-019), wrong for a passive, possibly-growing list.
- **Two more events, no new path.** Event-sourcing (ADR-009) makes delete and restore symmetric appends; the audit trail records both for free.

---

## Consequences

- **Schema:** `ShorePoint.deletedAt?` (epoch ms; presence = deleted). Reducer-managed only — absent from `ShorePointPatch` (not user-editable). Distinct from the card's presentational `removed`.
- **Events:** new `ShorePointRestored` (mirror of `ShorePointDeleted`: `spId`). `ShorePointDeleted` reducer semantics change from filter to soft-flag.
- **Board:** `byStatus` and the division/area filter lists skip `deletedAt`-set points; a new `deleted` memo (most-recent-first) feeds the `DeletedSection`. `.fs-deleted*` styles reuse the lane header/chevron, muted so the section never reads as an eighth status.
- **Grouping:** delete granularity is unchanged — per card, Pending-only. A soft-deleted grouped-shore member is filtered from its stack upstream in `byStatus`; Restore returns it. The shared `seq` (ADR-029) is untouched.
- **Numbering quirk (ADR-029) stands** — gaps are still gappy; this ADR makes them *recoverable*, not gone.
- Tests: reducer round-trip (delete → restore) + no-number-reuse; board delete-leaves-lane + Restore-commits-and-announces. Typecheck + lint clean. Live-verified on the slice.
