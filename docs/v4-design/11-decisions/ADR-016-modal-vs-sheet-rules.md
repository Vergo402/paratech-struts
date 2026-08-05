# ADR-016: Modal-vs-sheet rules — ratify the primitive doctrine, apply it per screen

> Architecture Decision Record. The per-screen application table lives in [`08-information-architecture/00-ia-foundation.md`](../08-information-architecture/00-ia-foundation.md) §Modal-vs-sheet rules; this ADR records the decision.

---

## Status

- [x] Proposed
- [x] Accepted *(Phase F foundation mini-gate — Alex, 2026-06-07)*

**Date:** 2026-06-07
**Author:** Claude Opus 4.8 (Phase F foundation session)
**Reviewer(s):** Alex (Phase F foundation gate — approved 2026-06-07)

---

## Context

[`99-open-questions.md`](../99-open-questions.md) lists "modal-vs-sheet rules" as a Phase F cross-cutting decision ([#216](https://github.com/Vergo402/paratech-struts/issues/216)). The doctrine itself is already settled at the primitive layer: [`sheet.md`](../03-primitives/sheet.md) and [`modal.md`](../03-primitives/modal.md) each state "sheet-vs-modal as a rule," and [ADR-010](ADR-010-status-commit-model.md) reserves heavy confirmation for the destructive/terminal. What Phase F still owes is not a new rule but an **application**: which surface each screen raises for each of its overlay actions, so a screen spec doesn't re-argue the boundary.

---

## Decision

**Adopt the existing [`sheet.md`](../03-primitives/sheet.md)/[`modal.md`](../03-primitives/modal.md) boundary verbatim and apply it as a per-screen table.** Sheet = non-destructive choose/enter/review (≤ 60vh, thumb-reach). Modal = destructive/terminal confirm, inventory-consequential confirm, oversized form, or blocking alert. Everyday status change = slide-to-advance on the card (no overlay, [ADR-010](ADR-010-status-commit-model.md)). Safety disclosure = the persistent [`warning-gate`](../03-primitives/warning-gate.md) on the `RecommendationCard`. Each screen spec cites its row in the application table.

---

## Rationale

- **The boundary is already a rule, not a judgment call** — re-deciding it per screen would reintroduce the v3 inconsistency the primitives were written to kill ([`sheet.md`](../03-primitives/sheet.md), [`modal.md`](../03-primitives/modal.md)).
- **The everyday flow stays overlay-free** ([ADR-010](ADR-010-status-commit-model.md)): a slide advances status and is reversible from the card; a non-destructive choice is a sheet that dismisses with nothing committed (Principle 6). Confirmation modals are reserved for the rare terminal/inventory-mutating action.
- **A single application table is the audit trail** — it makes visible, in one place, exactly which screen raises which surface, so reviewers and Phase G/H authors check one row, not the whole corpus.
- **Safety lives in the [`warning-gate`](../03-primitives/warning-gate.md), not an overlay** ([Principle 7](../02-principles.md)): unrated-zone / over-capacity / disclaimer ride the result card and never auto-dismiss.

---

## Alternatives Considered

- **Re-decide modal-vs-sheet inside each screen spec.** Rejected — duplicative, drift-prone, and exactly the inconsistency the primitive doctrine removed.
- **Carry v3's nine `.modal-overlay` surfaces forward as nine modals.** Rejected — most are non-destructive entry forms that become sheets; only the genuinely terminal/oversized stay modals ([`modal.md`](../03-primitives/modal.md) §v3 grounding).

---

## Consequences

- **Positive:** every screen spec is shorter (cites one row); overlay behavior is consistent app-wide; the reversible/destructive split is enforced structurally.
- **Negative:** the application table must be kept in sync as screens are specced — a new overlay action means a new row, owned by [`00-ia-foundation.md`](../08-information-architecture/00-ia-foundation.md).
- **Neutral:** a few v3 modals (Add Hazard, Assign Role, Add Equipment/External/Individual) re-home as sheets; Start Operation / Add Shore Point stay modals as full-screen forms.

---

## Related

- **Principles:** 4 (one canonical action), 6 (doubt-free escapes), 7 (visible safety), 9 (no mystery meat).
- **Other ADRs:** [ADR-010](ADR-010-status-commit-model.md) (status commit / confirmation doctrine); builds on [ADR-014](ADR-014-tab-structure.md). Primitive doctrine: [`sheet.md`](../03-primitives/sheet.md), [`modal.md`](../03-primitives/modal.md), [`warning-gate.md`](../03-primitives/warning-gate.md).
- **Open questions resolved:** [`99-open-questions.md`](../99-open-questions.md) modal-vs-sheet cross-cutting decision ([#216](https://github.com/Vergo402/paratech-struts/issues/216)).
- **Open questions surfaced:** when a full-screen-form modal should be a pushed route instead ([`modal.md`](../03-primitives/modal.md) OQ2) — resolved in the Operations spec.

---

## Notes

The application table (one row per screen) lives in [`00-ia-foundation.md`](../08-information-architecture/00-ia-foundation.md) §Modal-vs-sheet rules and is the live artifact; this ADR is its rationale.

### Known blessed deviations

- **Assign Equipment (#346) — MODAL, not a sheet.** By this ADR's boundary, Assign Equipment is a non-destructive choose/review flow and would default to a sheet. Alex's explicit call (2026-06-19): the bottom sheet read poorly on the wider command-post surface, so it renders as a center-anchored `Modal` (`variant="form"`) instead. Recorded in the component doc-comment (`src/ui/operations/AssignEquipmentSheet.tsx`) and the design docket. Treat this as the one named exception to the table, not a precedent for re-litigating other rows.
