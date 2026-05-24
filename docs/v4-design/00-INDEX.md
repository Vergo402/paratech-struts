# FieldShore v4 Design Folder Index

> Scannable table of contents. Updated by every commit. The full plan lives at `/Users/alex/.claude/plans/keen-whistling-pancake.md` (outside the repo, so it survives branch churn).

---

## Status Legend

| Status | Meaning |
|---|---|
| 🟢 Done | Committed, reviewed, accepted |
| 🟡 In progress | Being written |
| 🚦 Gate ready | Awaiting Alex review |
| ⚪ Not started | Planned, not yet begun |
| 🔴 Blocked | Waiting on a decision or dependency |

---

## Phase Status

| Phase | Description | Status | Notes |
|---|---|---|---|
| A | Foundation: branch, folder, seed files, Project setup, /v4-plan skill | 🟢 Done | All seed files committed. Project items converted from drafts to real Issues (#129 through #138). Open questions #1, #2, #17 resolved. Demo mode added to Bucket 1. |
| B | Reference app teardowns + positioning doc | 🟢 Done | Structural deliverables shipped 2026-05-21 (6 teardowns + positioning.md). Sign off review closed 12 follow ups by 2026-05-22. Positioning doc rewritten in Alex's voice and trimmed to ~1,450 words (commit e7f9bb3, 2026-05-23). Gate B passed 2026-05-23 after adding Principle 12 (ADR-004) out of #280, so Phase C briefing packet carries the data class framing. |
| C | 12-agent brainstorm essays | 🟢 Done | Gate C passed 2026-05-24. All 12 essays reviewed; no changes requested. Phase D dispatched. All 12 essays committed 2026-05-23 (59,559 words total; target was 2,750–3,000 per essay, several came in higher because the lens earned it, no padding flagged). Each essay carries the 250-word executive summary and numbered recommendations Phase D copies verbatim into the coverage matrix. Notable: essay 8 (skeptical-review) dissents against ADR-003 and ADR-004 via numbered recs (permitted); essay 11 (scenario-stress) flags sibling-essay predictions that are likely to tear at Hamden/Meadowville scale; essay 4 surfaces 12 data-model schema fields that must be reserved in v4 to avoid v5 migration. |
| D | Synthesis + decision tracking matrix | 🟡 In progress | Phase D dispatched 2026-05-24. |
| E | Design system (color, type, spacing, motion, primitives, etc.) | ⚪ Not started | Blocked by D |
| F | Information Architecture per screen × 4 surfaces | ⚪ Not started | Blocked by E |
| G | Workflow specs across all surfaces | ⚪ Not started | Blocked by F |
| H | Vertical slice prototype | ⚪ Not started | Blocked by G |
| I | Whole-app build (months) | ⚪ Not started | Blocked by H |
| J | Cutover to main | ⚪ Not started | Blocked by I |

---

## Resolved Backlog: Phase B follow ups

Twelve issues filed from Alex's sign off review of 2026-05-21 (eleven on review day, one retroactive). All closed as of 2026-05-22.

| # | Title | Closed |
|---|---|---|
| [#269](https://github.com/Vergo402/paratech-struts/issues/269) | positioning: Replace The Sentence with Alex's rewrite | 2026-05-21 |
| [#270](https://github.com/Vergo402/paratech-struts/issues/270) | positioning: Tone down pass across the whole document | 2026-05-21 |
| [#271](https://github.com/Vergo402/paratech-struts/issues/271) | positioning: Fix First Due paragraph | 2026-05-21 |
| [#272](https://github.com/Vergo402/paratech-struts/issues/272) | positioning: Fix Tablet Command paragraph | 2026-05-21 |
| [#273](https://github.com/Vergo402/paratech-struts/issues/273) | positioning: Reframe defensibility | 2026-05-21 |
| [#274](https://github.com/Vergo402/paratech-struts/issues/274) | positioning: Rewrite for voice; name Level III through I expansion | 2026-05-22 |
| [#275](https://github.com/Vergo402/paratech-struts/issues/275) | positioning: Reclassify RapidSOS as UX/UI reference | 2026-05-22 |
| [#276](https://github.com/Vergo402/paratech-struts/issues/276) | positioning: Acknowledge DRR Rescue in the in rubble bullet | 2026-05-22 |
| [#277](https://github.com/Vergo402/paratech-struts/issues/277) | ADR-002: Principle 1 scope clarification | 2026-05-22 |
| [#278](https://github.com/Vergo402/paratech-struts/issues/278) | ADR-003: Scope, everyday plus expandable | 2026-05-22 |
| [#279](https://github.com/Vergo402/paratech-struts/issues/279) | Plain language cleanup of all v4 artifacts | 2026-05-22 |
| [#281](https://github.com/Vergo402/paratech-struts/issues/281) | terminology: rename incident complexity from Type to Level (retroactive sub issue of #274) | 2026-05-22 |
| [#280](https://github.com/Vergo402/paratech-struts/issues/280) | Design Foundation: structural collapse is a different data problem (resolved at Gate B via Principle 12 + ADR-004) | 2026-05-23 |

---

## File Index

### Foundation (Phase A)

- `01-context.md` why this redesign exists 🟢
- `02-principles.md` the 12 design principles 🟢 (Principle 12 added 2026-05-23 via ADR-004, out of #280)
- `03-primitives/picker.md` UI picker doctrine (worked example of design depth) 🟢
- `11-decisions/ADR-template.md` template for Architecture Decision Records 🟢
- `99-open-questions.md` rolling list of unresolved questions 🟢

### Primitives (Phase E will fill these out)

- `03-primitives/picker.md` 🟢 (seeded in Phase A)
- `03-primitives/sheet.md` ⚪
- `03-primitives/modal.md` ⚪
- `03-primitives/card.md` ⚪
- `03-primitives/badge.md` ⚪
- `03-primitives/button.md` ⚪
- `03-primitives/list.md` ⚪
- `03-primitives/input.md` ⚪
- `03-primitives/toggle.md` ⚪
- `03-primitives/segmented.md` ⚪
- `03-primitives/slider.md` ⚪
- `03-primitives/toast.md` ⚪
- `03-primitives/empty-state.md` ⚪
- `03-primitives/loading-state.md` ⚪
- `03-primitives/nested-checklist.md` ⚪ (backs IC Command, Task Level, ORM screens; see plan D6)

### Reference Teardowns (Phase B. Real product names, comparative analysis under nominative fair use, the legal doctrine that lets you name a competitor's product when comparing truthfully. See ADR-001.)

- `04-references/tablet-command.md` 🟢 (2339w)
- `04-references/first-due.md` 🟢 (2637w)
- `04-references/rednmx.md` 🟢 (2599w)
- `04-references/iamresponding.md` 🟢 (2498w)
- `04-references/rapidsos.md` 🟢 (2347w)
- `04-references/fire-rescue-systems.md` 🟢 (2435w)
- `04-references/positioning.md` 🟢 (2613w synthesis, 2 axis chart: tactical vs records by doctrine fluent vs agnostic)

### Brainstorm Essays (Phase C. Target was 2,750–3,000 words each, 250 word exec summary + numbered recs. Several came in over target where the lens earned it; no padding flagged.)

- `05-essays/01-architecture.md` 🟢 (5522w, 30 recs)
- `05-essays/02-visual-language.md` 🟢 (5665w, 18 recs)
- `05-essays/03-ic-workflow.md` 🟢 (3787w, 14 recs)
- `05-essays/04-future-scale.md` 🟢 (3617w, 12 recs)
- `05-essays/05-nims-doctrine.md` 🟢 (4417w, 22 recs)
- `05-essays/06-domain-ux.md` 🟢 (4088w, 25 recs)
- `05-essays/07-field-conditions.md` 🟢 (4610w, 18 recs)
- `05-essays/08-skeptical-review.md` 🟢 (3204w, 15 recs)
- `05-essays/09-data-resilience.md` 🟢 (6779w, 20 recs)
- `05-essays/10-implementation.md` 🟢 (5732w, 25 recs)
- `05-essays/11-scenario-stress.md` 🟢 (6026w, 18 recs)
- `05-essays/12-tech-debt.md` 🟢 (6112w, 30 recs)

### Synthesis (Phase D)

- `06-synthesis.md` ⚪
- `06-decision-tracking-matrix.md` ⚪ (every essay recommendation tracked: accepted / deferred / rejected / merged)

### Design System (Phase E)

- `07-design-system/color.md` ⚪
- `07-design-system/typography.md` ⚪
- `07-design-system/spacing-grid.md` ⚪
- `07-design-system/motion.md` ⚪
- `07-design-system/voice-and-tone.md` ⚪
- `07-design-system/iconography.md` ⚪
- `07-design-system/logo-and-mark.md` ⚪
- `07-design-system/accessibility.md` ⚪

### Information Architecture (Phase F)

Per screen specs across all four surfaces (phone / tablet / laptop / broadcast TV). One file per screen including v3 derived screens, three checklist screens (D6), and the auth/dept/admin screens (D7).

### Workflows (Phase G)

Per workflow specs with state diagrams, screen by screen wireframes, interaction notes, undo windows, accessibility scripts. Cross surface story for each.

### Wireframes (Phase G)

Text based wireframes initially, optionally Figma later.

### Decisions (continuous)

ADRs for every committed choice. Template at `11-decisions/ADR-template.md`.

---

## How to Use This Folder

- **New session opens v4 work** → read `00-INDEX.md` (this file), `01-context.md`, `02-principles.md`, then jump to the phase status row to find current work.
- **Need to make a design decision** → write an ADR using the template. Commit it before implementing.
- **Need to know what's not yet decided** → read `99-open-questions.md`.
- **Want to understand the standard of detail for design work** → read `03-primitives/picker.md` as the worked example.

---

## Strict Rules

1. **Real names are allowed under nominative fair use** (the legal doctrine that lets you name a competitor's product when comparing truthfully)**.** Describe behavior, not brand. Never disparage. Cite truth. No trademarked taglines presented as endorsements. See ADR-001. (Previous rule: codenames only, relaxed 2026-05-21.)
2. **Nothing in here is committed to `main`.** Everything stays on the `v4-redesign` branch until Phase J cutover.
3. **Every committed decision becomes an ADR.** No silent design changes.
4. **The plan file (`keen-whistling-pancake.md`) is the constitution.** This folder is its execution.
