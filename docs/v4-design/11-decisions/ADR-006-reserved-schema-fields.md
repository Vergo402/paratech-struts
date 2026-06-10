# ADR-006: Reserved schema fields — v4 reserves, v5 enforces

> Architecture Decision Record. The Phase H schema-reservation record. v4 reserves, on every record type, the namespace v5's federal/IST workflows need — so v5 never migrates existing records. v4 enforces none of it. Source of truth: essay [`04-future-scale.md`](../05-essays/04-future-scale.md) recs 1–11. Companion: [ADR-009](ADR-009-database-firebase-rtdb.md) (the event-sourced model these reservations sit inside).

---

## Status

- [x] Proposed

**Date:** 2026-06-09
**Author:** Claude Opus 4.8 (architect agent, drafting)
**Reviewer(s):** Alex — pending Phase H foundation mini-gate

---

## Context

v4.0 ships Level IV–V (the everyday case). The design ceiling reaches Level I ([ADR-003](ADR-003-scope-everyday-expandable.md)). The Surfside TTX-2 simulation showed that the three most consequential gaps were not missing features — they were structural choices made by omission: no agency tag on any record, a singular IC slot that could not hold Unified Command for 30 hours, and a role slot that overwrote (so five IC transfers left no trail). Essay 04 enumerates the reservations that close that gap cheaply; data-resilience (09) and NIMS (05) corroborate each. The synthesis weighed "reserve now" vs. "premature abstraction" as a productive conflict (§2.4) and **confirmed at the Phase D gate (PR #282) that the reservations land in v4.0**. This ADR is the formal record, pending the Phase H foundation mini-gate. It closes board [#309](https://github.com/Vergo402/paratech-struts/issues/309).

---

## Decision

**Reserve, on every record type, the namespace v5 needs — so v5 never migrates existing records — and enforce none of it in v4.0.** A reserved field sits at its default; v4 ignores it; v5 reads and writes it. Because the data model is event-sourced ([ADR-009](ADR-009-database-firebase-rtdb.md)), every write is an append, so adding a field is appending a key, never rewriting history.

The reservations (essay 04, recs 1–11):

- **`agencyId`** on every record type (inventory, apparatus, operation writes, role assignments) — default = the department's own identifier. Never enforced in v4; the user never sees or configures it.
- **`IC` as a collection, not a singular slot** — Unified Command is two (or more) co-equal entries, not a workaround in IAP prose. The v3 `roles[targetId] = 'ic'` single slot is retired.
- **`roleHistory` append-only** at `/operations/{opId}/roleHistory/{pushId}` with `{ roleId, targetId, assignedAt, departedAt, byUid, agencyId }` — write-appends a new record; read filters `departedAt == null` for the current org-chart projection. No overwrite, ever.
- **`arrivedAt` / `demobbedAt`** on apparatus records — default null. Drive ICS-211, PAR, and the mutual-aid reimbursement package.
- **`nets: []`** as a typed array on every role record — empty by default; v5 writes the ICS-205 comms-plan data.
- **`resourceType`** (FEMA US&R Type I–V) optional on apparatus — default empty; populated manually on task-force apparatus at cache import.
- **Inventory `status` enum** — `staged` / `deployed` / `decon-required` / `decon-complete` / `released`, default `staged`. v5 builds the demob workflow against it.
- **`linkedVictim`** (string ID, default null) on shore points — v5's Victim Locator filters SPs where it matches a cluster ID.

The companion formatting/tagging reservations from essay 04 (recs 7, 10) — `opNumber` tagged on every write, and all timestamps via `{ hour12: false }` 24-hour formatters — are part of the same reserve-now discipline and ship in v4.0.

---

## Rationale

- **The cost is asymmetric** (synthesis §2.4). An unread schema field costs ~zero in v4 (it sits at its default and v4 ignores it). A v5 migration walks every record every department has ever written — days of engineering, real data-integrity risk. Position A wins on every reservation that is enumerated.
- **It dovetails with the event-sourced model** ([ADR-009](ADR-009-database-firebase-rtdb.md)): a write is an append to the log, so reserving a field is appending a key, not migrating prior events. `roleHistory` *is* event-sourcing applied to role assignments — the append-and-filter pattern is the same one the whole `data/` layer uses.
- **Each reservation is grounded in simulation evidence**, not aspiration: `agencyId` (IST got local-FD write scope), `IC` collection (UC stood 30 hours outside the model), `roleHistory` (5 IC + 6 OSC transfers reconstructed in a parallel Google Sheet) — essay 04's opening.
- **The SitStat ceiling** (essay 04 §"What the SitStat Requires") is a query over exactly these fields. None require shipping the SitStat in v4; they only require that the data model not make it impossible.

---

## Alternatives Considered

- **Add no fields v4 doesn't read (skeptic, essay 08).** Rejected (synthesis §2.4): "no validated user" is true of the *field* but not of the *migration it prevents*. The reservation is a hedge whose cost is null and whose payoff is avoiding a whole-database migration.
- **Reserve only `agencyId` + IC collection; defer the rest.** Rejected: the same asymmetric-cost argument applies to each of the eleven recs individually; there is no reason to pay a partial migration later when the full reservation is free now.
- **Physically restructure the Firebase tree to `{agencyId}/{deptId}/{resourceId}` now.** Rejected for v4.0 (essay 04 §"The Namespace"): the *logical* structure is reserved via the `agencyId` field; the *physical* path stays `/departments/{deptId}/` so v3↔v4 tree compatibility (essay 01 rec 26) holds through the dual-track window.

---

## Consequences

**Positive:**
- v5's federal/IST workflows are additive — new screens and queries over data that was already accumulating — not a migration across every record.
- The reservations make the Level-I design-ceiling claim ([ADR-003](ADR-003-scope-everyday-expandable.md)) true rather than aspirational.

**Negative:**
- The Zod schemas carry fields v4 never reads — a small, documented surface a future contributor might mistake for dead. This ADR + the per-field audit-trail comment discipline (synthesis §1.9) is the explanation of record.

**Neutral:**
- The reserved fields are backend-agnostic (synthesis §4 Data model); they hold whether the backend is RTDB ([ADR-009](ADR-009-database-firebase-rtdb.md)) or the second-choice Supabase path.

---

## Related

- **Principles:** 12 (structural collapse is a different data class — these reservations are what "different data class" means at the schema level), 8 (local-first — the reserved fields ride the same append path).
- **Other ADRs:** [ADR-009](ADR-009-database-firebase-rtdb.md) (event-sourced append model + IndexedDB/Dexie these reservations sit inside), [ADR-008](ADR-008-nims-org-structure.md) (the IC collection + role-history serve the NIMS two-Group org structure), [ADR-024](ADR-024-d5-multi-device-build-a.md) (per-row sync state on the same records), [ADR-022](ADR-022-mutual-aid-v40-qr-guest.md) (`agencyId` + guest unit-tag attribution interact at the mutual-aid boundary).
- **Board issue closed:** [#309](https://github.com/Vergo402/paratech-struts/issues/309).
- **Open questions resolved:** none uniquely (this ADR is the §2.4 resolution record).
- **Reference:** essay [`04-future-scale.md`](../05-essays/04-future-scale.md) recs 1–11 (source of truth). Synthesis §1.11, §2.4, §4 Data model.

---

## Notes

The synthesis (§1.11, line 97) and essay 04 (recs 1, 12) sometimes point the schema language at "ADR-005"; the synthesis later fixes the split — ADR-005 is the single-package decision and ADR-006 is the schema reservations (§2.4 line 153). This ADR is the canonical home for the eleven reservations. Essay 04 rec 9 (cross-agency apparatus-name uniqueness) and rec 12 (the marketing-site ceiling claim) are *not* schema reservations: rec 9 is a validator behavior tracked separately, and rec 12 is moot under the dropped-marketing-site decision (synthesis §3.3 / Q6). They are noted here only so the rec-1-to-11 mapping is unambiguous.
