# ADR-009: Stay on Firebase Realtime Database for v4.0

## Status

- [x] Accepted

**Date:** 2026-05-31
**Author:** Alex (sign-off) + Claude Opus 4.8 (evaluation, ADR drafting)
**Reviewer(s):** Alex (final call)

---

## Context

During the Phase D review (PR #282), Alex asked: "Is Firebase the best database to use moving forward?" v3 runs on Firebase Realtime Database (RTDB, compat SDK v9.23.0, project `paratech-c3ab4`) with years of hardening — local-first writes, `pendingWrites` flush, the `/diagnostics/sync/` ledger, first-fire listener guards, schema-generated security rules, SRI-pinned SDK. v4 is a ground-up rebuild (Vite + React + TypeScript), local-first, must work offline for hours, and must reconcile across multiple devices when comms return (the "Build A" model).

A full evaluation was produced at `docs/v4-design/04-references/database-evaluation.md`, scoring Firebase RTDB against Firestore, Supabase, PocketBase, RxDB/PouchDB replication, ElectricSQL, PowerSync, Convex, InstantDB, Triplit, and a plain IndexedDB+CRDT baseline, against seven hard constraints: offline-for-hours, multi-device reconcile, append-only event log / audit ledger, PWA-now + React-Native-later, role-gated security rules, cost at department scale, and migration cost off the existing v3 Firebase investment.

---

## Decision

**Stay on Firebase Realtime Database for v4.0**, with all backend access isolated behind a `data/sync` repository seam (no Firebase import outside `data/`). A future backend swap then becomes a transport change, not a rewrite.

The v4 data model is the load-bearing decision, not the database: every write is an **immutable append** to an event log (`events/{opId}/`), and current state is a **projection**. With that model, conflict resolution mostly evaporates and the backend is an append-and-fan-out pipe — which makes RTDB safe and any candidate roughly interchangeable behind the seam.

**Second choice, if field-testing surfaces problems:** Supabase (Postgres) + PowerSync — switch only if RTDB's path-level last-write-wins is shown to lose field-level edits the event log doesn't already catch.

---

## Rationale

- RTDB is the only candidate scoring A/B on all seven constraints with **zero migration cost**. The entire v3 hardening investment crosses verbatim only if RTDB stays.
- RTDB's two genuinely weak spots — reliance on our own offline queue, and path-level last-write-wins conflicts — are already solved in v3 code and further neutralized by the v4 event-sourced log.
- The **offline-auth window** worry (Firebase ID tokens expire ~1h) is a non-issue: the long-lived refresh token plus flush-time authorization covers multi-hour outages.
- The **on-scene QR sign-in** idea (synthesis §5 Q8) is additive and mildly favors Firebase — it reuses the guest-mode anonymous UID, the members/role rules, and the event log.
- Switching backends would forfeit hardening for a problem the data model already addresses — cost without a matching benefit at v4.0 scale (small departments, a handful of devices per incident).

---

## Alternatives Considered

- **Firestore.** Better querying, but its offline cache and pricing model buy nothing over RTDB here and migration is non-trivial. Rejected for v4.0.
- **Supabase + PowerSync.** Strong relational model and row-level security; genuine second choice. Held as the switch target if RTDB conflict handling proves insufficient in field tests.
- **RxDB / ElectricSQL / Convex / InstantDB / Triplit.** Each is interesting for local-first, but all impose migration cost and/or maturity/lock-in risk that the event-sourced-behind-a-seam approach makes unnecessary at v4.0.
- **Plain IndexedDB + CRDT (Yjs/Automerge).** Maximum control, maximum build cost; the event log gives most of the benefit without hand-rolling a sync engine.

---

## Consequences

**Positive:**
- Zero migration; v3 sync/diagnostics/local-first hardening crosses verbatim.
- The `data/sync` seam keeps the door open — a future swap (e.g., at the v5 React Native fork) is a transport change.
- Storage still moves from `localStorage` to IndexedDB (Dexie) for capacity; that is independent of the backend choice.

**Negative:**
- Continued dependency on a Google-owned managed service (lock-in risk), mitigated by the seam and the portable event-sourced model.
- RTDB's querying is weaker than Postgres; the projection layer absorbs this.

**Neutral:**
- No change to the synthesis's offline/sync (§1.7, §4) or data-model (§4) direction — those were written assuming RTDB and are now confirmed.

---

## Related

- Reference: `docs/v4-design/04-references/database-evaluation.md` (full scoring matrix + sources).
- Synthesis: convergent theme §1.7; §4 "Offline / sync" and "Data model" directions (now finalized against this ADR).
- Matrix: A-7 (IndexedDB/Dexie), A-8 (event-sourced log), A-9 (Build A only), I-1 (per-device UID), and the sync rows.
- Open questions: §5 Q8 (on-scene QR sign-in) interacts with this choice; resolved as additive.

---

## Notes

ADR-005 (single-package v4.0), ADR-006 (schema reservations), and ADR-007 (build system + TypeScript strict) remain reserved for the Phase H decisions named in the synthesis. This decision took the next free number (009). The companion NIMS org-structure decision is ADR-008. The database-evaluation doc suggested "ADR-007" as a placeholder; the actual number is 009 to avoid collision with the reserved build-system ADR.
