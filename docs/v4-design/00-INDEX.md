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
| D | Synthesis + decision tracking matrix | 🟢 Done | Synthesis + coverage matrix committed 2026-05-24; revised 2026-05-31 after Alex's PR #282 review (18 comments folded in). Matrix: 218 accepted / 13 deferred / 15 rejected / 1 merged. The two held research items resolved 2026-05-31: NIMS org structure → **ADR-008** (`04-references/nims-org-structure.md`, all 7 questions answered), database → **ADR-009** (`04-references/database-evaluation.md`, stay on Firebase RTDB). Gate D passed; squash-merged to `v4-redesign` via PR #282. Phase E unblocked. |
| E | Design system (color, type, spacing, motion, primitives, etc.) | 🟡 In progress | **Gate trio APPROVED by Alex 2026-06-01** ([#292](https://github.com/Vergo402/paratech-struts/issues/292)): `color.md` + `typography.md` + `03-primitives/card.md` (four-theme contrast-verified via `wcag-contrast.mjs`) + **ADR-010** (status commit model, amends Principle 6) + **ADR-011** (color token system) + **ADR-012** (measurement precision → 1/8″, floor-rounded, SME-confirmed) — all three ADRs now Accepted. **Living styleguide** at `preview/` (token-driven HTML, 4 themes × 4 widths, fraction-style toggle) is the rendered proof. Card carries: RecommendationCard (1/8″ digit-pair fractions, indented deduction ledger, capacity demoted) + ShorePointCard (deployed strut cradle-to-grave, pending = v3 Assign-Equipment model). **Cascade now unblocked** — ~19 files (spacing → motion → primitives → cross-cutting), one issue per session. `spacing-grid.md` (E2) ✅ delivered ([#177](https://github.com/Vergo402/paratech-struts/issues/177)); `motion.md` (E3) ✅ delivered ([#178](https://github.com/Vergo402/paratech-struts/issues/178) — drops the timed-undo line per ADR-010); `iconography.md` (E4) ✅ delivered ([#179](https://github.com/Vergo402/paratech-struts/issues/179) — four-size grid, stroke tokens, ~46-glyph inventory, shore type diagram doctrine requirement); `logo-and-mark.md` (E6) ✅ delivered ([#180](https://github.com/Vergo402/paratech-struts/issues/180) — **new identity, full color**: an "FS" emblem built from a gold LongShore + 2 aluminum struts (rigid 6″ base/sole plates) and a cut-4×4/plywood-gusset S, + a simplified mono mark (themed, 16px-safe) + app-icon/favicon/wordmark; [**ADR-013**](https://github.com/Vergo402/paratech-struts/blob/v4-redesign/docs/v4-design/11-decisions/ADR-013-brand-emblem-full-color.md) exempts the emblem from the one-accent rule); `voice-and-tone.md` (E5) ✅ delivered ([#181](https://github.com/Vergo402/paratech-struts/issues/181) — copy doctrine: creed *terse · doctrine-aligned · never cute*; ratifies the seven status display labels `color.md` deferred here (incl. renames **Strut Set** / **Shore Secured** / **Strut Equipment Returned**); how-the-app-talks before/after rules; NIMS terminology lock via the "Chief Test"; per-surface + accessibility + anti-patterns; **mints no CSS tokens**, doc-only); `accessibility.md` (E7) ✅ delivered ([#182](https://github.com/Vergo402/paratech-struts/issues/182) — authored last, the consolidation point: **WCAG 2.1 AA floor / AAA where reachable**; consolidates all six siblings' a11y sections *by reference, not restatement*; the load-bearing **"assistive tech cannot slide"** rule (focusable Advance/Step-back button equivalents + `aria-live` announce + **Power Select** native-`<select>` fallback on VoiceOver/TalkBack-or-Settings); a screen-reader **script registry** (*Role · Name · State · Action-hint* grammar + scripts for the 2 filled primitives + global patterns; #183–196 extend it); modal focus-trap / skip-link / keyboard parity; haptics survive reduced-motion; **mints no CSS tokens**; lean baseline per Alex, formal SC-by-SC audit deferred to Phase H/J). **All 8 design-system token/system docs now complete; next: the primitive cascade — fill `03-primitives/*.md` at picker depth ([#183](https://github.com/Vergo402/paratech-struts/issues/183)–[#196](https://github.com/Vergo402/paratech-struts/issues/196)).** |
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
- `03-primitives/card.md` 🟢 (Phase E gate primitive — APPROVED 2026-06-01; status-stripe tap zone, slide-to-advance, red-slash off-queue, inline deduction ledger, capacity demoted, deployed-strut cradle-to-grave, pending = v3 Assign model)
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
- `04-references/nims-org-structure.md` 🟢 (Phase D follow-up — NIMS Group/Division/Supervisor doctrine + v3→NIMS mapping; all 7 questions resolved 2026-05-31 → ADR-008)
- `04-references/database-evaluation.md` 🟢 (Phase D follow-up — backend evaluation; stay on Firebase RTDB for v4.0 behind a `data/sync` seam → ADR-009)

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

- `06-synthesis.md` 🟢 (12 convergent themes, 7 productive conflicts, 4 surprises, recommended path; Alex's PR #282 review folded in; held sections resolved via ADR-008/ADR-009)
- `06-decision-tracking-matrix.md` 🟢 (247 recs from all 12 essays — 218 accepted / 13 deferred / 15 rejected / 1 merged after PR #282 review)

### Design System (Phase E)

- `07-design-system/color.md` 🟢 (gate trio — APPROVED 2026-06-01; 4 themes light/dark/sunlight/broadcast, reconciled status palette, all ratios verified)
- `07-design-system/typography.md` 🟢 (gate trio — APPROVED 2026-06-01; Geist + Geist Mono ramp, tabular numerals, 1/8″ digit-pair fractions)
- `07-design-system/wcag-contrast.mjs` 🟢 (reproducible WCAG verification — `node …/wcag-contrast.mjs`)
- `preview/` 🟢 (**living styleguide** — token-driven static HTML rendering the gate trio in all 4 themes; `npx serve docs/v4-design/preview` or the `v4-styleguide` preview config. A mockup, not the build; `preview/tokens.css` is reused in Phase H)
- `07-design-system/spacing-grid.md` 🟢 (E2 — 4pt internal grid / 8pt external rhythm, tokens `--space-1`–`--space-12`; complete 5-value corner-radius vocabulary; touch-target table reconciling B-16/G-1/G-7/G-17/B-6; surface breakpoints phone/tablet/laptop/broadcast; elevation rule)
- `07-design-system/motion.md` 🟢 (E3 — six duration tokens `--motion-*` + five easing tokens `--ease-*`; three legitimate animation jobs; what-moves/what-doesn't; **drops the 5s/8s timed-undo line per ADR-010**, status commit = slide-to-advance cross-fade + passive red-slash; haptics pair with motion; broadcast = zero motion; `prefers-reduced-motion` → instant swap. Tokens synced to `preview/tokens.css`.)
- `07-design-system/iconography.md` 🟢 (E4 — four-size artboard grid `--icon-size-sm/md/lg/xl`; `--icon-stroke-default` 1.5px + `--icon-stroke-heavy` 2px sunlight override; `--icon-radius` 2px derived; outlined/filled states via `--motion-micro`; ~46-glyph inventory across 6 categories; shore type diagrams two-artboard treatment + doctrine accuracy requirement; color from existing tokens, no new icon-specific tokens. Tokens synced to `preview/tokens.css`.)
- `07-design-system/voice-and-tone.md` 🟢 (E5 — copy doctrine: the creed *terse · doctrine-aligned · never cute*; **ratifies the seven status display labels** `color.md` deferred here, incl. the renames **Strut Set** / **Shore Secured** / **Strut Equipment Returned** with rationale; how-the-app-talks before/after rules (buttons, off-queue red-slash, warnings/disclaimers, empty states, toasts, sync); **NIMS terminology lock** via the "Chief Test" (titles spelled out, no acronyms; do-not-say/do-say table); per-surface + accessibility + anti-patterns. **Mints no CSS tokens** — copy is prose. Doc-only, no ADR; cites ADR-008/010/011/012 + matrix E-14.)
- `07-design-system/logo-and-mark.md` 🟢 (E6 — **new identity** per #10/ADR-013, not a refresh: a **full-color FS emblem** — gold LongShore vertical + 2 aluminum struts, rigid 6″ base/sole plates both ends; S of cut 4×4 + plywood gussets, 9-nail — paired with a **simplified mono mark** (single ink, themes via `--accent`, 16px-safe). App-icon, favicon, wordmark + emblem in `assets/logo/`. [`ADR-013`](11-decisions/ADR-013-brand-emblem-full-color.md) exempts the emblem from the one-accent rule. Rendered proof: Logo panel in `preview/`.)
- `07-design-system/accessibility.md` 🟢 (E7 — authored last, the consolidation point: **WCAG 2.1 AA floor / AAA where reachable** (sunlight + broadcast 7:1); consolidates the a11y sections of all six sibling docs *by reference, not restatement*; the load-bearing rule **"assistive tech cannot slide"** — the slide-to-advance commit always has focusable, labeled **Advance / Step-back** button equivalents + `aria-live` announce, plus the **Power Select** native-`<select>` fallback on VoiceOver/TalkBack-or-Settings; a screen-reader **script registry** (*Role · Name · State · Action-hint* grammar + concrete scripts for the 2 filled primitives + global patterns; #183–196 extend it); modal focus-trap / skip-link / keyboard parity; haptics survive reduced-motion. **Mints no CSS tokens.** Lean baseline per Alex; formal SC-by-SC audit deferred to Phase H/J.)

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
