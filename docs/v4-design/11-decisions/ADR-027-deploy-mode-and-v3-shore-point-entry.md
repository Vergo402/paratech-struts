# ADR-027: Per-operation deploy mode + v3 Add Shore Point order + crew (assignedResource) capture

> Architecture Decision Record. Amends workflow [#220](https://github.com/Vergo402/paratech-struts/issues/220) ([`09-workflows/11-adding-a-shore-point.md`](../09-workflows/11-adding-a-shore-point.md) Step 2) and [ADR-016](ADR-016-modal-vs-sheet-rules.md) (the Add/Assign split is now a per-op mode, not a hard rule). Born from the Phase H slice re-drive ([#248](https://github.com/Vergo402/paratech-struts/issues/248)).

---

## Status

- [x] Proposed
- [x] Accepted *(Phase H re-drive — Alex, 2026-06-13)*

**Date:** 2026-06-13
**Author:** Claude Opus 4.8 (Phase H re-drive session)
**Reviewer(s):** Alex (directed the change live during the re-drive)

---

## Context

During the [#248](https://github.com/Vergo402/paratech-struts/issues/248) re-drive, Alex drove the built v4 Add Shore Point screen and found it "designed nothing like the v3." The v4 spec (workflow [#220](https://github.com/Vergo402/paratech-struts/issues/220), gate-passed) had deliberately departed from v3 in three ways: a **location-first** field order, the **strut-finding moved out** of the entry modal into a separate Assign Equipment sheet (workflow #221), and the **Group / Estimated Load fields dropped** (KB-7 also replaced v3's 1×–4× quantity buttons with "Number of shores").

Alex's call: restore v3's order and context, keep the new KB-3 measurement keypad ([#314](https://github.com/Vergo402/paratech-struts/issues/314)), and — crucially — make the one-step-vs-two-step split a **per-department/per-operation choice rather than a hard architecture rule**, because both workflows are real: a small op has one person size-find-deploy in a single breath; a large op has an officer drop Pending cards for a separate retrieval/assign crew. Group is **crew accountability**, not a label — tracked through the op, destined for a Command roll-up.

---

## Decision

1. **Deploy mode is per-operation** (`Operation.inlineDeploy: boolean`), set in the Start/Edit Operation form **above Multi-building**, and **flippable mid-incident** via Edit Operation (no separate control — editing a running op is the flip). New ops **default to one-step inline**.
   - **One-step (true):** the Add Shore Point form carries **Find Available Struts → RecommendationCards → Deploy**, plus **Save as Pending**. v3's combined describe-find-deploy.
   - **Two-step (false):** the form is describe-only → drops a Pending card → equipment is assigned from the board's **Assign Equipment** sheet. The prior v4 behavior.
   - The two-step **Assign Equipment sheet stays available in both modes** — Pending cards must be assignable regardless (e.g. no stock on scene yet). One-step is purely **additive**; nothing is torn out.

2. **Add Shore Point returns to the v3 field order:** Shore Type → Label → Building *(multi-building ops)* → Division · Area · **Group** → Measurement *(KB-3 keypad retained)* → Deductions → **Estimated Load** → Number of shores.

3. **Group restored as `assignedResource`** ([ADR-008](ADR-008-nims-org-structure.md)): the crew/apparatus assigned to a point, picked from the **on-scene apparatus** (distinct names from inventory), stored on the point, shown on the `ShorePointCard`, and **reassignable throughout the op** (accountability, not a Pending-locked field). The **Command roll-up** ("which group is on which points / who's done what") is **deferred to Phase I** — the Command tab is unbuilt; per-card display ships now so data accrues before the view exists.

4. **Estimated Load re-added** as an optional planning input that feeds the engine's capacity gating (`findForShorePoint` now passes `sp.estimatedLoad ?? 0`; it was hardcoded `0`).

5. **KB-7 kept unchanged** — quantity stays "Number of shores" with per-shore strut fan-out. (Alex: "leave the quantity as is.")

---

## Rationale

- **Both workflows are legitimate; the incident decides, not the architecture.** Forcing every department through the two-step split was the misstep. A per-op flag — flippable as an incident grows or winds down — matches fireground reality and costs nothing to switch (the modes are presentation over the same event log; everything already committed stays valid across a flip).
- **One-step reuses, doesn't rebuild.** The same `RecommendationCard` (S12 design) renders inside the form; the engine runs on a **draft** shore point built from the form state — no commit needed to preview.
- **Group is accountability.** v3 treated it as a tracked resource assignment; v4 had simply not built it yet. Capturing it now (even ahead of the Command view) is the cheap, correct first step.

---

## Consequences

- **Schema:** `Operation.inlineDeploy` (absent on pre-feature event replay → defaults `true`); `ShorePoint.assignedResource` + `ShorePoint.estimatedLoad` (+ both in `ShorePointPatch`). `assignedResource` applies before the Pending field-lock (reassignable); `estimatedLoad` locks post-Pending like the measurement.
- **Inline deploy** commits one atomic `ShorePointAdded` batch, then a per-point `StrutDeployed` (separate commits — `commitMany` rejects inventory-consequential events). Partial stock leaves overflow points Pending (visible on the board; a "deployed X of N" toast is a deferred polish).
- **Amends:** workflow [#220](https://github.com/Vergo402/paratech-struts/issues/220) Step 2 (the location-first order and "engine runs after submit, not inline" are now mode-dependent); [ADR-016](ADR-016-modal-vs-sheet-rules.md) (the Assign Equipment sheet is the two-step surface, not the only deploy surface).
- **Phase I owes** the Command roll-up of `assignedResource`. Tracked as a follow-up to the Command screen build.
- 346 unit/component tests pass; typecheck + lint clean. Live-verified on the slice (Start Operation toggle; v3-order form; inline engine run).
