# Design Docket

> The curated running list of **design items** — visual, layout, and interaction concerns waiting for a design pass. Created 2026-06-11 at Alex's request ("do we have a running list of things to bring to design?").
>
> **This is a curation index, not a source of truth.** Every row links to its canonical home — a [`99-open-questions.md`](99-open-questions.md) row, a [#248](https://github.com/Vergo402/paratech-struts/issues/248) comment, the [gate script's known-gaps register](13-slice/_PHASE-H-GATE-SCRIPT.md), or a queued fix-session issue. Items are *resolved at the source*; when one resolves, strike its row here with a pointer. (The Phase E audit showed what happens when registers go blind to each other — this file exists so the design passes never re-learn that lesson.)
>
> **Habits:** every fix session (S10–S12) and every Phase I design session **opens by reading this file**. New design-class observations on #248 get a row here. Rapid adds go through the **`/docket`** skill (`.claude/skills/docket/`) — one line, committed immediately. An **ad hoc** row (no canonical home yet) is promoted to `99-open-questions.md` or #248 when it's first worked. **Cosmetic items deferred past the full v4 build** land in the **Post-build polish** section, home [#341](https://github.com/Vergo402/paratech-struts/issues/341).

---

## Riding S10 — measurement keypad ([#314](https://github.com/Vergo402/paratech-struts/issues/314))

**All three S10 items shipped 2026-06-11 (commits `714bac9..de5c944`) — struck to the Resolved table below.**

## Riding S12 — card design pass ([#316](https://github.com/Vergo402/paratech-struts/issues/316))

**All five S12 items landed 2026-06-11 (commits `5912d7e..9faff63`) — struck to the Resolved table below.**

## Phase I design items

| Item | Canonical home | Added |
|---|---|---|
| PAR / pending-rows indicator in the persistent command chrome | [`99-open-questions.md`](99-open-questions.md) #39 | 2026-06-11 (seed) |
| Per-Division / per-Group SitStat roll-up at scale | [`99-open-questions.md`](99-open-questions.md) #43 | 2026-06-11 (seed) |
| Tablet-primary posture for the saw deck (phone stays the floor) | [`99-open-questions.md`](99-open-questions.md) #46 | 2026-06-11 (seed) |
| Plate/connector pickers: real photo thumbnails, not letter swatches | [gaps register](13-slice/_PHASE-H-GATE-SCRIPT.md) #8 | 2026-06-11 (seed) |
| Deduction ledger collapsed-by-default in Add Shore Point (Principle 7 disclosure) | [gaps register](13-slice/_PHASE-H-GATE-SCRIPT.md) #10 | 2026-06-11 (seed) |
| Focus lands on the moved card after Deploy (keyboard parity polish) | [gaps register](13-slice/_PHASE-H-GATE-SCRIPT.md) #6 | 2026-06-11 (seed) |
| Add Shore Point modal: scroll area margin too large — hard to hit scroll target | [#248](https://github.com/Vergo402/paratech-struts/issues/248) (2026-06-19) | 2026-06-19 |

## Doctrine deviation watch

| Item | Canonical home | Added |
|---|---|---|
| **Assign Equipment renders as a centered modal** ([#346](https://github.com/Vergo402/paratech-struts/issues/346)), not a bottom sheet — deliberately deviating from [ADR-016](11-decisions/ADR-016-modal-vs-sheet-rules.md) (assign = interrupt = sheet). Alex's call: the two-step assign flow (pick strut → Review sources) needs full-height centered layout on the command-post surface. Recorded in a doc-comment in `AssignEquipmentSheet.tsx`. Flag for the Phase J modal-vs-sheet doctrine audit. | [#346](https://github.com/Vergo402/paratech-struts/issues/346) / [ADR-016](11-decisions/ADR-016-modal-vs-sheet-rules.md) | 2026-06-19 |

## Post-build polish ([#341](https://github.com/Vergo402/paratech-struts/issues/341))

> Cosmetic / visual / interaction items intentionally deferred until **after the full v4 build (Phase I)**. Canonical home = epic [#341](https://github.com/Vergo402/paratech-struts/issues/341); a row is promoted to a sub-issue of that epic only when it's scheduled for work.

| Item | Canonical home | Added |
|---|---|---|
| Desktop: move the bottom tab bar to a true side selector (left nav rail) | [#341](https://github.com/Vergo402/paratech-struts/issues/341) | 2026-06-18 |
| Desktop: redesign the Operations / Cutting Station selector — bad UI | [#341](https://github.com/Vergo402/paratech-struts/issues/341) | 2026-06-18 |
| Dashed empty-shell (`.fs-ops-detail-shell`, pinned detail column ≥1200) is a net-new idiom — formalize as a reusable empty-state pattern, or re-style to the surface/hairline convention vs the 2px dashed border | [#341](https://github.com/Vergo402/paratech-struts/issues/341) | 2026-06-18 |

## Unscheduled / watch

| Item | Canonical home | Added |
|---|---|---|
| `--motion-loop` — continuous-loop timing (spinner/shimmer): behavior value vs ADR-gated 7th duration token; decide when a spinner first ships | [`99-open-questions.md`](99-open-questions.md) #19 | 2026-06-11 (seed) |
| Operations sort/filter: upgrade native `<select>` dropdowns to the v4 Sheet picker (`DivisionPicker` pattern) for full design-system feel | [#248](https://github.com/Vergo402/paratech-struts/issues/248) board sort/filter | 2026-06-13 |
| Operations sort/filter: persist the choice (per-op / across reload) — currently in-memory per session like v3's drilldown | [#248](https://github.com/Vergo402/paratech-struts/issues/248) board sort/filter | 2026-06-13 |
| Operations filter: cascade the Area options to the selected Division (v1 lists them independently) | [#248](https://github.com/Vergo402/paratech-struts/issues/248) board sort/filter | 2026-06-13 |
| ShorePointCard: consider promoting the pre-cutting Required-strut-length number (size/weight), as cutting already does — Design 2 keeps it at normal shelf size for now | [#248](https://github.com/Vergo402/paratech-struts/issues/248) card Design 2 | 2026-06-13 |

## Resolved (struck rows land here)

| Item | Canonical home | Resolved |
|---|---|---|
| ~~Measurement ⅛″ fraction sub-control form — strip vs picker geometry~~ | [`99-open-questions.md`](99-open-questions.md) #20 | 2026-06-11 — S10 shipped (`714bac9..de5c944`): 56pt 8-button tap-strip, form modal |
| ~~Measurement + Division as big gloved tap targets — no spinners/scroll-wheels~~ | [`99-open-questions.md`](99-open-questions.md) #38 | 2026-06-11 — S10 shipped: 56pt tap targets, no spinners/wheels |
| ~~Big-key custom keypad on phone + hardware-keyboard typed parsing on desktop (KB-3)~~ | [#314](https://github.com/Vergo402/paratech-struts/issues/314) | 2026-06-11 — S10 shipped (#314 closed): phone 56pt dialer + tap-strip, desktop hardware-keyboard + `parseMeasurement` |
| ~~Cutting Station: one-tap landing + explicit "NEXT" cut marker~~ | [`99-open-questions.md`](99-open-questions.md) #44 | 2026-06-17 — Phase I shipped (`b7568cc`): direct landing via sub-nav, first card is implicit NEXT |
| ~~Sync attention-grab without push — ticking count badge + persistent red-slash until tap-dismissed~~ | [`99-open-questions.md`](99-open-questions.md) #45 | 2026-06-17 — Phase I shipped (`b7568cc`): red-slash "Removed from cut list" on step-back, dismissible. Ticking badge deferred to multi-device sync (Phase I) |
| ~~"Waiting for inventory" pendingReason wording — broader than v3's; copy pass owns the nuance~~ | [gaps register](13-slice/_PHASE-H-GATE-SCRIPT.md) footnote / S6 OQ1 | 2026-06-17 — Phase I shipped: distinct reasons ("no stock" vs. "no matching strut"); copy refinement queued |
| ~~First-run onboarding (welcome → checklist hub → guided Quick Find tips, all practice)~~ | ad hoc — **ADR-034 owed** | 2026-06-17 — Phase I shipped (`22a7a85`): account-creation-gated, always skippable. Bends Principle 11; decision to formalize recorded. Feature complete; ADR owed. |
| ~~Cutting Station build (#222) shipped phone-functional~~ | [`21-cutting-station.md`](08-information-architecture/21-cutting-station.md) OQ1/OQ3 | 2026-06-17 — Phase I shipped (`b7568cc`): phone-functional, FIFO read-only queue. Tablet drag-reorder (G-16) + actual-cut input explicitly deferred Phase I |
| ~~Spec vs. reducer conflict — cutting→strutset step-back scope~~ | `core/operation/reducer.ts` | 2026-06-17 — Resolved (`3c7c76a`): `groupAdvance` keys fan-out on EDGE, not from-status. Aligns reducer to spec; unit-tested + driven. |
| ~~Terminal return restores strut-only — widens to full assembly with inventory build~~ | [#224](https://github.com/Vergo402/paratech-struts/issues/224) → ADR-033 / [#330](https://github.com/Vergo402/paratech-struts/issues/330) | 2026-06-17 — Phase I shipped (`cfe004a`): strut return complete. Extensions + plates deferred to inventory build (#330, ADR-033) |
| ~~Settings tab UI — too overwhelming, needs redesign~~ | [#248](https://github.com/Vergo402/paratech-struts/issues/248) (2026-06-18) | 2026-06-18 — Shipped but flagged for design pass. Theme picker + settings controls work; layout/hierarchy needs polish. |
| ~~Quick Find card layout — mobile polish needed~~ | [#248](https://github.com/Vergo402/paratech-struts/issues/248) (2026-06-18) | 2026-06-18 — Shipped but flagged for design pass. Cards render; mobile composition/spacing needs refinement. |
| ~~Desktop = blown-up phone column; build the 768pt/1200pt breakpoints (KB-1)~~ | [#248](https://github.com/Vergo402/paratech-struts/issues/248) KB-1 → [#315](https://github.com/Vergo402/paratech-struts/issues/315) | 2026-06-11 — S11 landed (`24273e0`), #315 closed |
| ~~Per-lane status-summary bar at 768pt+ (rec G-15)~~ | fix-plan §S11 → [#315](https://github.com/Vergo402/paratech-struts/issues/315) | 2026-06-11 — S11 landed (`24273e0`), #315 closed |
| ~~KB-6 card hierarchy reads bland — important data must stand out (treatments A/B/C, Alex picks)~~ | [#248](https://github.com/Vergo402/paratech-struts/issues/248) KB-6 → [#316](https://github.com/Vergo402/paratech-struts/issues/316) | 2026-06-11 — S12 landed (`5912d7e..9faff63`): Treatment-C status-tinted value shelf, `card.md` + ADR-011 Addendum 2; #316 implemented |
| ~~Over-capacity Deploy card must be visually unmistakable~~ | [`99-open-questions.md`](99-open-questions.md) #40 | 2026-06-11 — **resolved** (99-OQ #40 → Resolved): danger fit badge + `is-gated` bar + closed Deploy; confirm at the Phase H re-drive |
| ~~Sunlight theme: card status stripe placeholder color mapping~~ | [gaps register](13-slice/_PHASE-H-GATE-SCRIPT.md) #11 | 2026-06-11 — `--sp-solid` minted with the sunlight remap (closes gap #11); `color.md` + ADR-011 Addendum 2 |
| ~~Grouped cards: rotate through stacked set instead of showing all members~~ | ad hoc (Alex, 2026-06-11) | 2026-06-11 — `GroupedShorePoint` rolodex stack (`card.md` §The grouped rolodex stack, `20-operations.md`) |
| ~~Slide-track label clips behind the handle at narrow lane columns (~328px)~~ | ad hoc (S11 verification, 2026-06-11) | 2026-06-11 — knob-side label-clearance padding rule (`slider.md` Anatomy); verify at the re-drive |
