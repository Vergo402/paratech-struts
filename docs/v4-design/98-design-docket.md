# Design Docket

> The curated running list of **design items** — visual, layout, and interaction concerns waiting for a design pass. Created 2026-06-11 at Alex's request ("do we have a running list of things to bring to design?").
>
> **This is a curation index, not a source of truth.** Every row links to its canonical home — a [`99-open-questions.md`](99-open-questions.md) row, a [#248](https://github.com/Vergo402/paratech-struts/issues/248) comment, the [gate script's known-gaps register](13-slice/_PHASE-H-GATE-SCRIPT.md), or a queued fix-session issue. Items are *resolved at the source*; when one resolves, strike its row here with a pointer. (The Phase E audit showed what happens when registers go blind to each other — this file exists so the design passes never re-learn that lesson.)
>
> **Habits:** every fix session (S10–S12) and every Phase I design session **opens by reading this file**. New design-class observations on #248 get a row here. Rapid adds go through the **`/design-docket`** skill (`.claude/skills/design-docket/`) — one line, committed immediately. An **ad hoc** row (no canonical home yet) is promoted to `99-open-questions.md` or #248 when it's first worked. **Cosmetic items deferred past the full v4 build** land in the **Post-build polish** section, home [#341](https://github.com/Vergo402/paratech-struts/issues/341).

---

## Riding S10 — measurement keypad ([#314](https://github.com/Vergo402/paratech-struts/issues/314))

**All three S10 items shipped 2026-06-11 (commits `714bac9..de5c944`) — struck to the Resolved table below.**

## Riding S12 — card design pass ([#316](https://github.com/Vergo402/paratech-struts/issues/316))

**All five S12 items landed 2026-06-11 (commits `5912d7e..9faff63`) — struck to the Resolved table below.**

## Phase I design items

| Item | Canonical home | Added |
|---|---|---|
| PAR / pending-rows indicator in the persistent command chrome | [#352](https://github.com/Vergo402/paratech-struts/issues/352) (OQ #39) | 2026-06-11 (seed) |
| Per-Division / per-Group SitStat roll-up at scale | [#376](https://github.com/Vergo402/paratech-struts/issues/376) — visual pass (#353 functional shipped) | 2026-06-11 (seed) |
| Tablet-primary posture for the saw deck (phone stays the floor) | [#376](https://github.com/Vergo402/paratech-struts/issues/376) — visual pass (#354 functional shipped) | 2026-06-11 (seed) |
| Plate/connector pickers: real photo thumbnails, not letter swatches | [#384](https://github.com/Vergo402/paratech-struts/issues/384) (design-idea; was gaps register #8) | 2026-06-11 (seed) |
| Inside-officer "Mine" lens — sticky per-device slice (rig and/or division/area) narrowing the board to To-do/Done + "X left · Y done", slides kept (officer advances own) | [#370](https://github.com/Vergo402/paratech-struts/issues/370) (ad hoc, Alex 2026-06-20) | 2026-06-20 |
| ~~ICS org chart: layout & visual design pass — center-on-IC · command-staff clipping · broken/uneven connector lines · remove "Top of command" subtitle · button placement~~ ✅ built ([PR #396](https://github.com/Vergo402/paratech-struts/pull/396)) | [#373](https://github.com/Vergo402/paratech-struts/issues/373) (was #248) | 2026-06-21 |
| ~~ICS node-detail modal: UX/flow overhaul — zero flow between sections and actions~~ ✅ built ([PR #396](https://github.com/Vergo402/paratech-struts/pull/396)) | [#374](https://github.com/Vergo402/paratech-struts/issues/374) (was #248) | 2026-06-21 |
| Cutting Station: filter to show only cuts assigned to user's station, not full operation queue | [#375](https://github.com/Vergo402/paratech-struts/issues/375) (was #248) | 2026-06-21 |
| Cutting Station: calm empty state ("No cuts queued") when the queue is empty — currently renders nothing (component returns null) | [#389](https://github.com/Vergo402/paratech-struts/issues/389) (design-idea) | 2026-06-22 |
| Individual saw stations A/B/+N each on their own screen; officers see only their assigned station's current cut + full pending list | [#390](https://github.com/Vergo402/paratech-struts/issues/390) (design-idea) | 2026-06-23 |
| Collapsible nav bar — hide the nav to reclaim screen space on dense workflows | [#391](https://github.com/Vergo402/paratech-struts/issues/391) (design-idea) | 2026-06-23 |
| Change Command nav icon to a simple hierarchy-tree glyph | [#392](https://github.com/Vergo402/paratech-struts/issues/392) (design-idea) | 2026-06-23 |
| Inventory import: bespoke 4-step validated flow (file pick → column map → row validation → commit) — Step-2 mapper built on existing primitives, no library | [ADR-038](11-decisions/ADR-038-bespoke-column-mapping.md) (OQ #36 resolved) | 2026-06-28 |

## Doctrine deviation watch

| Item | Canonical home | Added |
|---|---|---|
| **Assign Equipment renders as a centered modal** ([#346](https://github.com/Vergo402/paratech-struts/issues/346)), not a bottom sheet — deliberately deviating from [ADR-016](11-decisions/ADR-016-modal-vs-sheet-rules.md) (assign = interrupt = sheet). Alex's call: the two-step assign flow (pick strut → Review sources) needs full-height centered layout on the command-post surface. Recorded in a doc-comment in `AssignEquipmentSheet.tsx`. Flag for the Phase J modal-vs-sheet doctrine audit. | [#346](https://github.com/Vergo402/paratech-struts/issues/346) / [ADR-016](11-decisions/ADR-016-modal-vs-sheet-rules.md) | 2026-06-19 |
| **Floating draggable panel — a 16th interaction primitive** beyond the locked 15. The Operations Details + Available-Inventory companions float over the board (desktop ≥768px) and can be dragged aside to read the cards underneath, instead of the edge-docked [`side-drawer.md`](03-primitives/side-drawer.md) (ADR-019). Alex's call (board-dominant redesign): docked columns starved the board. Spec'd in [`03-primitives/floating-panel.md`](03-primitives/floating-panel.md), decided in [ADR-037](11-decisions/ADR-037-floating-draggable-panel.md); doc-comment in `FloatingPanel.tsx`. Flag for the Phase J doctrine audit. | [ADR-037](11-decisions/ADR-037-floating-draggable-panel.md) / [`floating-panel.md`](03-primitives/floating-panel.md) | 2026-06-20 |
| **Phone press-and-hold/drag reparent on the org chart** — [`31-org-chart.md`](08-information-architecture/31-org-chart.md) originally locked phone reparent to **button equivalents only** (drag = a tablet affordance; "Phone does NOT render drag-reparent"). #323 added phone press-and-hold drag off-spec; it was broken (dead-still-hold required) and Alex chose to **fix + bless it** rather than drop it ([#367](https://github.com/Vergo402/paratech-struts/issues/367), 2026-06-28). Drag is **additive** — the "Move…" buttons stay the AT/keyboard floor. `31-org-chart.md` amended; flag for the Phase J doctrine audit. No new ADR (a surface-affordance addition, not a new primitive). | [#367](https://github.com/Vergo402/paratech-struts/issues/367) / [`31-org-chart.md`](08-information-architecture/31-org-chart.md) | 2026-06-28 |
| **ShorePointCard compaction — strut/source off the card face.** [`card.md`](03-primitives/card.md) made the deployed **strut model + apparatus source** required *on the card face cradle-to-grave*. The interior-officer glance redesign (now that Details holds the full BOM) folds **strut + extensions into the value bar** (cut-length-only at `cutting`), appends the **assigned resource** to the location line, and moves the **source rig** + raw-opening/deduction/load detail line **into Details**. Alex's call. `card.md` amended; flag for the Phase J doctrine audit. No new ADR (a card density revision, not a new primitive). | [`card.md`](03-primitives/card.md) | 2026-06-20 |

## Post-build polish ([#341](https://github.com/Vergo402/paratech-struts/issues/341))

> Cosmetic / visual / interaction items intentionally deferred until **after the full v4 build (Phase I)**. Canonical home = epic [#341](https://github.com/Vergo402/paratech-struts/issues/341); a row is promoted to a sub-issue of that epic only when it's scheduled for work.

| Item | Canonical home | Added |
|---|---|---|
| Desktop: move the bottom tab bar to a true side selector (left nav rail) | [#386](https://github.com/Vergo402/paratech-struts/issues/386) (sub-issue of #341) | 2026-06-18 |
| Desktop: redesign the Operations / Cutting Station selector — bad UI | [#387](https://github.com/Vergo402/paratech-struts/issues/387) (sub-issue of #341) | 2026-06-18 |
| Dashed empty-shell (`.fs-ops-detail-shell`, pinned detail column ≥1200) is a net-new idiom — formalize as a reusable empty-state pattern, or re-style to the surface/hairline convention vs the 2px dashed border | [#388](https://github.com/Vergo402/paratech-struts/issues/388) (sub-issue of #341) | 2026-06-18 |

## Unscheduled / watch

| Item | Canonical home | Added |
|---|---|---|
| `--motion-loop` — continuous-loop timing (spinner/shimmer): behavior value vs ADR-gated 7th duration token; decide when a spinner first ships | [`99-open-questions.md`](99-open-questions.md) #19 ([#355](https://github.com/Vergo402/paratech-struts/issues/355)) | 2026-06-11 (seed) |

## Resolved (struck rows land here)

| Item | Canonical home | Resolved |
|---|---|---|
| ~~Add Shore Point modal: scroll-area margin too large~~ | [#248](https://github.com/Vergo402/paratech-struts/issues/248) (2026-06-19) | 2026-06-19 — shipped (`f7c3854`): phone `.fs-modal` frame 32px → 20px below 768px |
| ~~Move/advance buttons carry the next/prior step's status color~~ | [#248](https://github.com/Vergo402/paratech-struts/issues/248) (2026-06-19) | 2026-06-19 — shipped (`f7c3854`): Slider `tone` tints the whole bar (destination/prior `--sp-solid`); `slider.md` note, Phase J doctrine flag |
| ~~Deduction ledger collapsed-by-default in Add Shore Point~~ | [gaps register](13-slice/_PHASE-H-GATE-SCRIPT.md) #10 | 2026-06-18 — shipped (#349, `8ea41a3`) |
| ~~Focus lands on the moved card after Deploy~~ | [gaps register](13-slice/_PHASE-H-GATE-SCRIPT.md) #6 | 2026-06-19 — shipped (#350, `a9a12a0`) |
| ~~Operations sort/filter: native `<select>` → v4 Sheet picker~~ | [#248](https://github.com/Vergo402/paratech-struts/issues/248) board sort/filter | 2026-06-15 — shipped: surface-adaptive pickers (ADR-032) |
| ~~Operations sort/filter: persist the choice (per-op / across reload)~~ | [#248](https://github.com/Vergo402/paratech-struts/issues/248) board sort/filter | 2026-06-13 — shipped (#347) |
| ~~Operations filter: cascade the Area options to the selected Division~~ | [#248](https://github.com/Vergo402/paratech-struts/issues/248) board sort/filter | 2026-06-13 — shipped (#347) |
| ~~ShorePointCard: promote the pre-cutting Required-strut-length number~~ | [#248](https://github.com/Vergo402/paratech-struts/issues/248) card Design 2 | 2026-06-13 — shipped (#351, `eb77532`) |
| ~~Measurement ⅛″ fraction sub-control form — strip vs picker geometry~~ | [`99-open-questions.md`](99-open-questions.md) #20 | 2026-06-11 — S10 shipped (`714bac9..de5c944`): 56pt 8-button tap-strip, form modal |
| ~~Measurement + Division as big gloved tap targets — no spinners/scroll-wheels~~ | [`99-open-questions.md`](99-open-questions.md) #38 | 2026-06-11 — S10 shipped: 56pt tap targets, no spinners/wheels |
| ~~Big-key custom keypad on phone + hardware-keyboard typed parsing on desktop (KB-3)~~ | [#314](https://github.com/Vergo402/paratech-struts/issues/314) | 2026-06-11 — S10 shipped (#314 closed): phone 56pt dialer + tap-strip, desktop hardware-keyboard + `parseMeasurement` |
| ~~Cutting Station: one-tap landing + explicit "NEXT" cut marker~~ | [`99-open-questions.md`](99-open-questions.md) #44 | 2026-06-17 — Phase I shipped (`b7568cc`): direct landing via sub-nav, first card is implicit NEXT |
| ~~Sync attention-grab without push — ticking count badge + persistent red-slash until tap-dismissed~~ | [`99-open-questions.md`](99-open-questions.md) #45 | 2026-06-17 — Phase I shipped (`b7568cc`): red-slash "Removed from cut list" on step-back, dismissible. Ticking badge deferred to multi-device sync (Phase I) |
| ~~"Waiting for inventory" pendingReason wording — broader than v3's; copy pass owns the nuance~~ | [gaps register](13-slice/_PHASE-H-GATE-SCRIPT.md) footnote / S6 OQ1 | 2026-06-17 — Phase I shipped: distinct reasons ("no stock" vs. "no matching strut"); copy refinement queued |
| ~~First-run onboarding (welcome → checklist hub → guided Quick Find tips, all practice)~~ | [ADR-034](11-decisions/ADR-034-first-run-onboarding.md) | 2026-06-17 — Phase I shipped (`22a7a85`): account-creation-gated, always skippable. Principle-11 exception formalized in ADR-034. |
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
