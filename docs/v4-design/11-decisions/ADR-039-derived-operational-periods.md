# ADR-039: Operational periods are derived, not stamped on every event

> Architecture Decision Record. Refines accepted decision **D-10** (`06-decision-tracking-matrix.md`) for #395.

---

## Status

- [x] Accepted

**Date:** 2026-06-28
**Author:** v4 build session (#395 multi-operational-period support)
**Reviewer(s):** Alex

---

## Context

[#395](https://github.com/Vergo402/paratech-struts/issues/395) builds operational-period
support: the persistent-header OP clock + rollover, and the audit log's first-class
**"by operational period"** filter axis (gate review M12; committed v4.0 requirement in
[`31-audit-log-review.md`](../09-workflows/31-audit-log-review.md) Step 3). Until now the
operational period was hardcoded "OP 1" (`CommandRail.tsx`) with no schema.

Accepted decision **D-10** (Future-Scale essay, `06-decision-tracking-matrix.md`) reads:
"Add `opNumber` as a tagged field on **every write** — shore points, status transitions,
role assignments, inventory transactions — so post-incident export can filter by period…
without reconstructing OP boundaries from timestamps." D-10's *intent* is per-OP export +
filtering; its *mechanism* is denormalising a period number onto every event.

The v4 architecture changes what that mechanism costs. The event log ([ADR-009](ADR-009-database-firebase-rtdb.md))
is the spine: every event already carries `at` (epoch ms) and `opId` (`event.ts` base).
Period boundaries are themselves first-class, replayed log events.

---

## Decision

**Model a period boundary as one event; derive every other event's period from its `at`.**

- New event `OperationPeriodStarted { ...base, periodNumber, plannedDurationMs?, iapRef? }`.
- Period 1 is **implicit** — reducer-seeded on `OperationCreated` at `createdAt`, exactly
  like `divisions:[1]` and `saws:['A']`. Legacy ops project a single period for free; **no
  migration**.
- The operation projection gains `currentPeriod` + `periods[]` (number, startedAt,
  plannedDurationMs?, iapRef?). `OperationPeriodStarted` is idempotent by `periodNumber`
  (concurrent rollovers converge) and never regresses `currentPeriod`.
- A pure `periodOf(at, periods)` (`core/operation/period.ts`) maps any event's `at` to its
  period number — the single source for "which OP did this happen in." The audit log's
  "by period" grouping and any per-OP export call it.

`opNumber` is **not** denormalised onto the other ~25 event types.

## Why this satisfies D-10 without its field

D-10's worry was "reconstructing OP boundaries from timestamps rather than reading a stored
field." That worry is answered: the boundaries **are** stored — as `OperationPeriodStarted`
events with exact `at`. Derivation is a deterministic lookup against stored markers, not a
heuristic over raw timestamps. So D-10's intent (clean per-OP filtering/export) is met, while
the denormalised field — which would touch every event constructor + every emit site + the
Firebase sync rules + a one-time conversion of existing incidents — is avoided.

## Consequences

- **Smaller, reversible build.** One new event, two projected fields, one pure helper. If a
  stamped field is ever genuinely needed, it can be added later (the boundary events make
  back-filling exact).
- **Cross-device.** Boundaries sync like any event; bucketing by `at` against shift-length
  (~8–12 h) boundaries is robust to ordinary clock skew.
- **Doctrine flag.** This refines an accepted matrix decision (D-10) — flag for the Phase J
  decision-trace audit. Supersedes D-10's mechanism; keeps its intent.
