# ADR-019: Side-drawer — the 15th UI primitive (a gate escalation)

> Architecture Decision Record. Adds a **15th** primitive to the locked 14-primitive set: [`03-primitives/side-drawer.md`](../03-primitives/side-drawer.md), an edge-anchored slide-in **companion** panel. Mints one token — `--shadow-drawer` (recorded in [ADR-011](ADR-011-color-token-system.md) §Addendum). Re-homes the two checklist screens — Task Level ([#204](https://github.com/Vergo402/paratech-struts/issues/204)) and IC Command ([#203](https://github.com/Vergo402/paratech-struts/issues/203)) — onto it.

---

## Status

- [x] Proposed
- [x] Accepted *(Phase F [#217](https://github.com/Vergo402/paratech-struts/issues/217) gate follow-up [#306](https://github.com/Vergo402/paratech-struts/issues/306) — Alex, 2026-06-09)*

**Date:** 2026-06-09
**Author:** Claude Opus 4.8 (Phase F gate follow-up #306)
**Reviewer(s):** Alex (#306 — approved 2026-06-09; chose a *true* side drawer at the #217 gate)
**Escalates:** the Phase E primitive lock (14 primitives, sealed at the cascade gate [#133](https://github.com/Vergo402/paratech-struts/issues/133) / [#292](https://github.com/Vergo402/paratech-struts/issues/292), 2026-06-07) → **15**.

---

## Context

The Phase E cascade gate (2026-06-07) locked the primitive set at **14** (the 13 cascade files + [`warning-gate.md`](../03-primitives/warning-gate.md)). Every screen spec composes "only the 14," and the standing rule across the specs is: *"a new primitive would be a gate escalation, not a spec decision."*

At the Phase F [#217](https://github.com/Vergo402/paratech-struts/issues/217) gate (CH-3 / CH-4), Alex moved both checklist screens from front-and-center destinations to **"a small tab off to the side with a checkmark-box, which slides open"** on demand. On review (the CH-3/4 finding), the existing [`sheet`](../03-primitives/sheet.md) is **bottom-anchored by core doctrine** (thumb reach / phone-is-the-floor; tablet → center popover) and is an *interrupt* surface — summoned for one choice, then gone. A **true side drawer** — a *persistent companion* that slides in from a vertical edge and leaves the canvas **live** on large screens — is not a sheet variant. Alex chose the true side drawer ("slides in from the side"). Adding it is therefore a deliberate **gate escalation**, recorded here rather than smuggled in as a spec decision.

---

## Decision

1. **Add [`03-primitives/side-drawer.md`](../03-primitives/side-drawer.md) as the 15th primitive** — an edge-anchored, summonable **companion** panel reached from a persistent edge tab (the checkmark-box affordance). Its boundary rule: **side-drawer** (companion, consult-while-you-work) vs. **sheet** (bottom interrupt, one choice) vs. **modal** (center stop, destructive). v4.0 ships **one** variant — the **checklist drawer** (holds a [`nested-checklist`](../03-primitives/nested-checklist.md)); the container is content-agnostic for the future.
2. **Mint one token — `--shadow-drawer`** — a sideways / inward cast. The existing shadow tokens cast vertically only (`--shadow-sheet` up `0 -Npt`, `--shadow-modal` down `0 8pt`); an edge panel needs the one direction neither covers. This is the **sanctioned ADR-gated token addition** ([`color.md`](../07-design-system/color.md) / [`motion.md`](../07-design-system/motion.md) cap their scales and extend "only by ADR"); it is recorded in [ADR-011](ADR-011-color-token-system.md) §Addendum alongside `--on-accent` / `--shadow-modal`, which were added the same way at the Phase E audit, and synced to `preview/tokens.css`. The drawer mints **nothing else** — it cites `--scrim`, `--motion-transition` + `--ease-standard`, `--surface-elevated` / `--surface-stroke`, `--radius-sheet`, `--space-*`, 56pt targets.
3. **Re-home** Task Level Checklist ([#204](https://github.com/Vergo402/paratech-struts/issues/204), [`22-task-level-checklist.md`](../08-information-architecture/22-task-level-checklist.md)) and IC Command Checklist ([#203](https://github.com/Vergo402/paratech-struts/issues/203), [`33-ic-command-checklist.md`](../08-information-architecture/33-ic-command-checklist.md)) onto the side-drawer: both are reached via the edge tab and slide open. The checklists' depth, attestation, signing (role + time, D7.5), one-section-open behavior, and content are **unchanged** (owned by [`nested-checklist.md`](../03-primitives/nested-checklist.md)) — **only placement changes**.
4. The primitive count is now **15** in the **live registries** ([`00-INDEX.md`](../00-INDEX.md), [`accessibility.md`](../07-design-system/accessibility.md)); the historical "14th / fourteenth file" statements (the Phase E gate state) stand.

---

## Rationale

- **A companion is a different posture from an interrupt.** The checklist is consulted repeatedly *while working*; a bottom sheet that re-rises each time, or a centered modal that stops the operator, is the wrong surface. The side edge is where a persistent, always-available panel belongs.
- **The escalation is honest.** The 14 were locked; rather than stretch the sheet past its bottom-anchored doctrine (which would corrupt the sheet's meaning), v4 records a new primitive via this ADR — the exact mechanism the design system reserves for this.
- **One token, minimal blast radius.** The drawer reuses everything the overlay system already defines and adds only the one shadow *direction* that genuinely did not exist.

---

## Alternatives Considered

- **Realize it as a sheet variant (a sheet that opens from the side).** **Rejected** (CH-3/4 finding): the sheet is bottom-anchored by doctrine (thumb reach) and is an *interrupt*; a side companion with a live canvas contradicts that rationale and would blur a load-bearing distinction.
- **An inline collapsible panel (accordion in place) — no overlay, no new primitive.** **Rejected:** it pushes the canvas around and is not "slides in from the side" (Alex's words); it also loses the large-screen companion-beside-canvas posture.
- **Keep the checklists as front-and-center pushed screens (no change).** **Rejected (Alex, #217):** they should not be front-and-center; a summonable side tab is the chosen placement.
- **Add no token; reuse `--shadow-modal`.** **Rejected:** `--shadow-modal` casts downward (a centered float); on a full-height edge panel it pools wrong. The correct depth cue is a sideways inward cast — `--shadow-drawer`.

---

## Consequences

**Positive:** the checklists get the right home (a summonable companion); the design system gains a genuinely missing surface, recorded honestly; one token added, everything else reused.

**Negative:** the primitive set is **15**, not 14 — every "the 14 primitives" reference in the live registries updates, and future specs compose 15. (The gate-escalation bar is unchanged: a 16th would need its own ADR.)

**Neutral:** [`warning-gate.md`](../03-primitives/warning-gate.md) / [`toast.md`](../03-primitives/toast.md) / [`99-open-questions.md`](../99-open-questions.md) #21 / the decision matrix keep their accurate "14th / fourteenth file" wording (they describe the Phase E gate state); only the live registries move to 15.

---

## Related

- **New primitive:** [`03-primitives/side-drawer.md`](../03-primitives/side-drawer.md).
- **Token:** [ADR-011](ADR-011-color-token-system.md) §Addendum (`--shadow-drawer`); [`color.md`](../07-design-system/color.md) §Strokes & elevation; `preview/tokens.css`.
- **Applied in:** [`22-task-level-checklist.md`](../08-information-architecture/22-task-level-checklist.md) (#204), [`33-ic-command-checklist.md`](../08-information-architecture/33-ic-command-checklist.md) (#203); [`00-ia-foundation.md`](../08-information-architecture/00-ia-foundation.md) tab-map + modal-vs-sheet table.
- **Other ADRs:** [ADR-011](ADR-011-color-token-system.md) (color-token system — the mint), [ADR-016](ADR-016-modal-vs-sheet-rules.md) (the overlay rules — the drawer joins the overlay vocabulary). Escalates the Phase E cascade gate ([#133](https://github.com/Vergo402/paratech-struts/issues/133) / [#292](https://github.com/Vergo402/paratech-struts/issues/292)).
- **Principles:** 9 (no mystery meat — the tab is labeled), 2 (designed for the role / surface — companion-beside-canvas on large screens), the *assistive-tech-cannot-slide* rule ([`accessibility.md`](../07-design-system/accessibility.md)).
- **GitHub:** [#306](https://github.com/Vergo402/paratech-struts/issues/306) (this work) · [#217](https://github.com/Vergo402/paratech-struts/issues/217) (the gate) · [#203](https://github.com/Vergo402/paratech-struts/issues/203) / [#204](https://github.com/Vergo402/paratech-struts/issues/204) (the checklists) · [#133](https://github.com/Vergo402/paratech-struts/issues/133) (the Phase E primitive cascade).

---

## Notes

The drawer is a content-agnostic container; v4.0 ships only the checklist variant. The exact swipe / peek / pinned-open geometry is Phase H (the standing affordance-geometry deferral), like the sheet's swipe threshold. A 16th primitive would be its own gate escalation — this ADR does not lower that bar.
