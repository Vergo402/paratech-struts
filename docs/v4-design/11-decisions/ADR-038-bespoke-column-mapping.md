# ADR-038: Bespoke column-mapping in the Inventory import flow

> Architecture Decision Record. Resolves open question #36 (`99-open-questions.md`).

---

## Status

- [x] Accepted

**Date:** 2026-06-28
**Author:** v4 build session (column-mapping UI library decision)
**Reviewer(s):** Alex

---

## Context

The Inventory validated-import flow ([`40-inventory.md`](../08-information-architecture/40-inventory.md) §"Validated import flow") specs a Flatfile-style 4-step sheet: file pick → **column mapping (Step 2)** → row validation → commit gate. Open question #36 deferred the Step-2 build choice to Phase H as a tooling-class decision (sibling of build-tooling #11 → [ADR-007](ADR-007-build-system-typescript-strict.md) and component-library #13): **build bespoke**, use an **open-source headless mapper**, or **license Flatfile**.

Constraints that bear on the choice:

- FieldShore is **offline-first** — the only network dependency is Firebase realtime sync; everything else works with no connection.
- The import target is a **fixed 10-column schema** (`CSV_HEADERS` in `src/data/inventory/excel.ts`), not arbitrary spreadsheets. Mapping is 1:1 per column with an "Ignore" option.
- The case-insensitive header → field match **already exists** in `excel.ts` (`autoMap`), and surface-adaptive single-select pickers are already shipped primitives.

---

## Decision

Build the column-mapper (and the surrounding 4-step import flow) **bespoke**, on the existing design-system primitives — no new dependency, no licensed service.

---

## Rationale

- **Offline-first is decisive.** The mapper runs on a file the operator already holds; it must work with no network. A bespoke component is pure client code.
- **The schema is fixed and tiny.** Ten fields + "Ignore" is a per-column single-select. The transform/coercion/multi-column power of a generic mapper is dead weight here.
- **The pieces already exist.** `autoMap` pre-fills the mapping; `BottomSheetPicker`/`FullScreenList` (surface-adaptive per [ADR-032](ADR-032-surface-adaptive-pickers.md)) render each field choice; `Sheet` hosts the steps. The bespoke mapper is composition, not new infrastructure.
- **Design-fidelity.** A foreign UI kit would fight the Tailwind primitives and the mockup-fidelity rule; bespoke stays native to the system.

---

## Alternatives Considered

- **License Flatfile.** Rejected — it is a cloud service: inventory data would leave the device and require a network connection to map columns. Disqualifying for an offline field PWA, plus a recurring licensing cost.
- **Open-source headless mapper** (react-spreadsheet-import and peers). Rejected — built for arbitrary unknown spreadsheets (transforms, type coercion, multi-column merges) and ships its own UI kit. ~95% of its capability is unused against a fixed 10-field schema, and it pulls a heavy dep tree (and a spreadsheet parser) FieldShore deliberately avoids.

---

## Consequences

- **Positive:** zero new dependencies; fully offline; native look-and-feel; the validation logic in `excel.ts` is reused unchanged behind an editable `ColumnMapping` seam.
- **Negative:** FieldShore owns the mapper code. Acceptable — it is small and the schema rarely changes.
- **Neutral:** `excel.ts` splits into `parseRecords` / `autoMap` / `validateRows`; `parseCsv` stays a composed one-liner so existing callers and tests are unaffected.

### Scope note — CSV only (xlsx deferred)

This decision covers the **mapping UI**, not the file format. The current slice is **CSV-only** (`excel.ts`); the spec's "xlsx or csv" Step 1 stays deferred — xlsx parsing needs a spreadsheet library (SheetJS), which is its own separate tooling question, not part of OQ #36.

---

## Related

- Principles: Principle 1 (phone is the floor), Principle 10 (no silent data loss).
- Other ADRs: [ADR-032](ADR-032-surface-adaptive-pickers.md) (surface-adaptive pickers — the field chooser), [ADR-007](ADR-007-build-system-typescript-strict.md) / component-library #13 (sibling tooling decisions).
- Open questions resolved: #36.
- Open questions surfaced: xlsx import library (whether/when to add SheetJS) — tracked as a deferred scope note, not yet a numbered OQ.
