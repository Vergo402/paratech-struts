<!--
  Per-screen IA spec template — Phase F.
  Copy this file to `NN-screen-name.md`, delete this comment, and fill every section.
  Authored at the depth of `../03-primitives/picker.md` and `card.md`.
  CITE `00-ia-foundation.md` for the tab map (ADR-014), navigation (ADR-015), the
  modal-vs-sheet row (ADR-016), the four-surface framework, and the persistent-chrome
  contract — do NOT re-derive them here.
  Compose only the existing 14 primitives — inventing a new one is a GATE escalation,
  not a spec decision.
-->

# IA Spec: [Screen Name]

> Phase F information-architecture spec. Cites [`00-ia-foundation.md`](00-ia-foundation.md) for all cross-cutting rules.
> Source: [synthesis §, rec IDs, GitHub issue #, dependent ADRs/essays].

---

## Purpose

One sentence: what this screen is for and who reaches it.

## Where it lives

- **Tab / parent:** [Quick Find · Operations · Command · Inventory · Settings · pre-shell · projection] — per the [tab map](00-ia-foundation.md#the-tab-map--where-every-screen-lives) ([ADR-014](../11-decisions/ADR-014-tab-structure.md)).
- **How it is reached:** [nav path; what surfaces it — assignment, sub-nav, header tap, banner, cast] — per the [navigation model](00-ia-foundation.md#navigation-pattern--adr-015) ([ADR-015](../11-decisions/ADR-015-navigation-pattern.md)).
- **Issue:** [#NNN].

## Primary role(s) and surface(s)

- **Primary role(s):** [team officer · IC · Operations Section Chief · Group Supervisor · Cutting Station lead · owner/admin/member/observer] (NIMS titles spelled out — [ADR-008](../11-decisions/ADR-008-nims-org-structure.md)).
- **Primary surface(s):** name the **floor** surface (phone unless justified) and the enhancement surfaces.

## Information hierarchy (above / below fold) — per surface

### Phone (the floor)
- **Above fold:** the single next decision; persistent chrome present ([§Persistent chrome](00-ia-foundation.md#persistent-chrome-the-contract-every-ic-facing-screen-honors)).
- **Below fold:** secondary content.
### Tablet
- **Above fold:** what the board / status-summary bar / second pane adds.
### Laptop
- **Above fold:** added density / command-palette entries / audit columns.
### Broadcast TV (read-only projection)
- What renders large; what does **not** render (no interactive primitives); type ≥ 32pt.

## Primary action + secondary actions

- **Primary action (one — Principle 4):** [the canonical action] — which primitive carries it (slide / sheet / button).
- **Secondary actions:** [disclosure / overflow / sheet — never competing for the primary's real estate].
- **Destructive / terminal / inventory-mutating actions:** which raise a [`modal`](../03-primitives/modal.md) confirm (per this screen's [modal-vs-sheet row](00-ia-foundation.md#the-per-screen-application-table-each-screen-spec-cites-its-row), [ADR-016](../11-decisions/ADR-016-modal-vs-sheet-rules.md)).

## Composed primitives

Check those used; one line each on *how*. (A primitive not on this list of 14 is a gate escalation.)

- [ ] [card](../03-primitives/card.md) — Base / `ShorePointCard` / `RecommendationCard` / org-node
- [ ] [list](../03-primitives/list.md) — card list / row list / sectioned / tree
- [ ] [picker](../03-primitives/picker.md) · [ ] [sheet](../03-primitives/sheet.md) · [ ] [modal](../03-primitives/modal.md) · [ ] [badge](../03-primitives/badge.md) · [ ] [button](../03-primitives/button.md)
- [ ] [input](../03-primitives/input.md) · [ ] [toggle](../03-primitives/toggle.md) · [ ] [segmented](../03-primitives/segmented.md) · [ ] [slider](../03-primitives/slider.md) · [ ] [toast](../03-primitives/toast.md)
- [ ] [empty-state](../03-primitives/empty-state.md) · [ ] [loading-state](../03-primitives/loading-state.md) · [ ] [nested-checklist](../03-primitives/nested-checklist.md) · [ ] [warning-gate](../03-primitives/warning-gate.md)

## Locked cross-cutting rules this screen honors

Tick each; note the screen-specific application where relevant. (Full statements in [`00-ia-foundation.md`](00-ia-foundation.md).)

- [ ] **Phone is the floor** — usable phone-only; enhancements never assumed.
- [ ] **Status = slide-to-advance, always reversible** ([ADR-010](../11-decisions/ADR-010-status-commit-model.md)); assistive tech gets Advance/Step-back buttons.
- [ ] **NIMS terminology** — titles spelled out, no acronyms ([ADR-008](../11-decisions/ADR-008-nims-org-structure.md)).
- [ ] **Capacity demoted** — the deduction ledger leads any `RecommendationCard`; capacity is secondary.
- [ ] **Measurements** — 1/8″ floored, diagonal fractions ([ADR-012](../11-decisions/ADR-012-measurement-precision-eighth-inch.md)).
- [ ] **No safety-hold / no in-app comms / no push** (Principle 10).
- [ ] **Tap geometry** — 56pt / 60pt status / 8pt dead zone (48pt on non-operational surfaces).
- [ ] **Modal-vs-sheet** per this screen's [application-table row](00-ia-foundation.md#the-per-screen-application-table-each-screen-spec-cites-its-row).
- [ ] **No silent removal** — off-queue = red-slash card state (Principle 10).
- [ ] **Visible safety** — deductions / warnings inline; safety omission → [`warning-gate`](../03-primitives/warning-gate.md), never a neutral empty (Principle 7).
- [ ] **Persistent Safety Officer + OP header** on IC-facing screens.

## The four-surface table (this screen)

Cites the [framework](00-ia-foundation.md#the-four-surfaces--progressive-density-one-app); fill the screen-specific cells.

| Dimension | Phone | Tablet | Laptop | Broadcast |
|---|---|---|---|---|
| Layout |  |  |  |  |
| Above fold |  |  |  |  |
| Primary-action affordance |  |  |  | — (read-only) |
| Added density | — |  |  | read-only |
| Does NOT render | — | — | — | interactive primitives |

## Empty / error / loading states

(Posture is set in [`00-ia-foundation.md`](00-ia-foundation.md#cross-cutting-empty--error--loading-posture); state only what is particular here.)

- **Empty:** which [`empty-state`](../03-primitives/empty-state.md) variant (first-run / filtered / upstream-blocked / all-clear) + the exact copy; settle-before-empty.
- **Error:** inline [`aria-invalid`](../03-primitives/input.md) / [`warning-gate`](../03-primitives/warning-gate.md) / blocking-alert [`modal`](../03-primitives/modal.md) — never `alert()`.
- **Loading:** name a treatment ([`loading-state`](../03-primitives/loading-state.md)) only where a real wait exists; local-first usually shows nothing.

## Accessibility / screen-reader notes

**Cite [`accessibility.md`](../07-design-system/accessibility.md), do not restate it.**

- Screen-reader scripts for composed primitives → [`accessibility.md`](../07-design-system/accessibility.md) §Screen-reader scripts (extend the registry only with this screen's *new* compositions).
- "Assistive tech cannot slide" — confirm Advance/Step-back button equivalents exist for any slide → [`accessibility.md`](../07-design-system/accessibility.md) §Assistive tech cannot slide.
- Focus order; modal focus-trap + inert background; skip-link / breadcrumb back-path → [`accessibility.md`](../07-design-system/accessibility.md) §Focus & keyboard.
- Power Select applicability; persistent-vs-announce-once for any safety disclosure; keyboard parity.

## Open questions (per-screen)

Numbered. Affordance geometry → flag for Phase H. Genuine IA → resolve at the Phase F gate or carry to [`99-open-questions.md`](../99-open-questions.md).

1. …
