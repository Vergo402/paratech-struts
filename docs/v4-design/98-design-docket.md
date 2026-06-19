# Design Docket

> The curated running list of **design items** — visual, layout, and interaction concerns waiting for a design pass. Created 2026-06-11 at Alex's request ("do we have a running list of things to bring to design?").
>
> **This is a curation index, not a source of truth.** Every row links to its canonical home — a [`99-open-questions.md`](99-open-questions.md) row, a [#248](https://github.com/Vergo402/paratech-struts/issues/248) comment, the [gate script's known-gaps register](13-slice/_PHASE-H-GATE-SCRIPT.md), or a queued fix-session issue. Items are *resolved at the source*; when one resolves, strike its row here with a pointer. (The Phase E audit showed what happens when registers go blind to each other — this file exists so the design passes never re-learn that lesson.)
>
> **Habits:** every fix session (S10–S12) and every Phase I design session **opens by reading this file**. New design-class observations on #248 get a row here. Rapid adds go through the **`/docket`** skill (`.claude/skills/docket/`) — one line, committed immediately. An **ad hoc** row (no canonical home yet) is promoted to `99-open-questions.md` or #248 when it's first worked. **Cosmetic items deferred past the full v4 build** land in the **Post-build polish** section, home [#341](https://github.com/Vergo402/paratech-struts/issues/341).

---

## Riding S10 — measurement keypad ([#314](https://github.com/Vergo402/paratech-struts/issues/314))

| Item | Canonical home | Added |
|---|---|---|
| Measurement ⅛″ fraction sub-control form — strip vs picker geometry | [`99-open-questions.md`](99-open-questions.md) #20 | 2026-06-11 (seed) |
| Measurement + Division as big gloved tap targets — no spinners/scroll-wheels | [`99-open-questions.md`](99-open-questions.md) #38 | 2026-06-11 (seed) |
| Big-key custom keypad on phone + hardware-keyboard typed parsing on desktop (KB-3) | [#248](https://github.com/Vergo402/paratech-struts/issues/248) KB-3 → [#314](https://github.com/Vergo402/paratech-struts/issues/314) | 2026-06-11 (seed) |

## Riding S12 — card design pass ([#316](https://github.com/Vergo402/paratech-struts/issues/316))

**All five S12 items landed 2026-06-11 (commits `5912d7e..9faff63`) — struck to the Resolved table below.**

## Phase I design items

| Item | Canonical home | Added |
|---|---|---|
| PAR / pending-rows indicator in the persistent command chrome | [`99-open-questions.md`](99-open-questions.md) #39 | 2026-06-11 (seed) |
| Per-Division / per-Group SitStat roll-up at scale | [`99-open-questions.md`](99-open-questions.md) #43 | 2026-06-11 (seed) |
| Cutting Station: one-tap landing + explicit "NEXT" cut marker | [`99-open-questions.md`](99-open-questions.md) #44 | 2026-06-11 (seed) |
| Sync attention-grab without push — ticking count badge + persistent red-slash until tap-dismissed | [`99-open-questions.md`](99-open-questions.md) #45 | 2026-06-11 (seed) |
| Tablet-primary posture for the saw deck (phone stays the floor) | [`99-open-questions.md`](99-open-questions.md) #46 | 2026-06-11 (seed) |
| Plate/connector pickers: real photo thumbnails, not letter swatches | [gaps register](13-slice/_PHASE-H-GATE-SCRIPT.md) #8 | 2026-06-11 (seed) |
| Deduction ledger collapsed-by-default in Add Shore Point (Principle 7 disclosure) | [gaps register](13-slice/_PHASE-H-GATE-SCRIPT.md) #10 | 2026-06-11 (seed) |
| Focus lands on the moved card after Deploy (keyboard parity polish) | [gaps register](13-slice/_PHASE-H-GATE-SCRIPT.md) #6 | 2026-06-11 (seed) |
| "Waiting for inventory" pendingReason wording — broader than v3's; copy pass owns the nuance | [gaps register](13-slice/_PHASE-H-GATE-SCRIPT.md) footnote / S6 OQ1 | 2026-06-11 (seed) |
| First-run onboarding (welcome → checklist hub → guided Quick Find tips, all practice) — **built this session** (off-the-cuff ask, no tracking issue — this row is the record). Account-creation-gated + always skippable, so the guest cold-open is untouched. **Bends Principle 11** ("no tutorials between user and work") and revives a scoped practice sandbox the dropped demo-mode call excluded → owed **ADR-034** to formalize the new-member-welcome exception (pattern: ADR-010 amending Principle 6) if the feature is kept. Decision: *build now, formalize later* (Alex, 2026-06-17). | ad hoc — **ADR-034 owed** | 2026-06-17 |
| Cutting Station build (#222) shipped phone-functional; **deferred enhancements**: tablet drag-reorder of the cut queue (G-16) and the optional actual-cut input (`expected ↔ actual` diff badge). Queue is FIFO read-only order on every surface for now. | [`21-cutting-station.md`](08-information-architecture/21-cutting-station.md) OQ1/OQ3 | 2026-06-17 (Session 1) |
| ~~**Spec vs. reducer conflict — cutting→strutset step-back scope.**~~ **RESOLVED (Alex, 2026-06-17): group-wide, matching [`13-cutting.md`](09-workflows/13-cutting.md).** The reducer's `groupAdvance` now keys group fan-out on the EDGE (a `GROUP_ZONE` = process↔strutset↔cutting check on both endpoints), not the from-status, so cutting→strutset fans out to the whole lockstep set while Send-to-Runner (cutting→runner) stays individual. Not a broadening ADR — it aligns the reducer to the existing spec. Fixed in commit `3c7c76a`; unit-tested (group-wide + L-7 no-regress) and driven in-browser. | `core/operation/reducer.ts` | 2026-06-17 (Session 3) — RESOLVED |
| **Terminal return restores strut-only — widens to the full assembly with the inventory build.** The Remove & Return step (#224, `EquipmentReclaimed`) restores the **strut** to its source apparatus's available count today — the mirror of today's deploy, which only consumes the strut. Extensions + connectors + base plates are NOT yet consumed on deploy, so there is nothing to give back for them yet. The inventory build ([#330](https://github.com/Vergo402/paratech-struts/issues/330) / ADR-033) widens **deploy** to pull the whole assembly and **this same return** to restore it — symmetric, at one seam (`operationStore.ts`). Event named `EquipmentReclaimed` (not `EquipmentReturned`) to leave the `Equipment*` deploy/return names free for ADR-033's rename of `StrutDeployed/Returned`. Decision: *finish the operation flow first, then the inventory build* (Alex, 2026-06-17). | [#224](https://github.com/Vergo402/paratech-struts/issues/224) → ADR-033 / [#330](https://github.com/Vergo402/paratech-struts/issues/330) | 2026-06-17 (Session 2) |

## Post-build polish ([#341](https://github.com/Vergo402/paratech-struts/issues/341))

> Cosmetic / visual / interaction items intentionally deferred until **after the full v4 build (Phase I)**. Canonical home = epic [#341](https://github.com/Vergo402/paratech-struts/issues/341); a row is promoted to a sub-issue of that epic only when it's scheduled for work.

| Item | Canonical home | Added |
|---|---|---|
| Desktop: move the bottom tab bar to a true side selector (left nav rail) | [#341](https://github.com/Vergo402/paratech-struts/issues/341) | 2026-06-18 |
| Desktop: redesign the Operations / Cutting Station selector — bad UI | [#341](https://github.com/Vergo402/paratech-struts/issues/341) | 2026-06-18 |

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
| ~~Desktop = blown-up phone column; build the 768pt/1200pt breakpoints (KB-1)~~ | [#248](https://github.com/Vergo402/paratech-struts/issues/248) KB-1 → [#315](https://github.com/Vergo402/paratech-struts/issues/315) | 2026-06-11 — S11 landed (`24273e0`), #315 closed |
| ~~Per-lane status-summary bar at 768pt+ (rec G-15)~~ | fix-plan §S11 → [#315](https://github.com/Vergo402/paratech-struts/issues/315) | 2026-06-11 — S11 landed (`24273e0`), #315 closed |
| ~~KB-6 card hierarchy reads bland — important data must stand out (treatments A/B/C, Alex picks)~~ | [#248](https://github.com/Vergo402/paratech-struts/issues/248) KB-6 → [#316](https://github.com/Vergo402/paratech-struts/issues/316) | 2026-06-11 — S12 landed (`5912d7e..9faff63`): Treatment-C status-tinted value shelf, `card.md` + ADR-011 Addendum 2; #316 implemented |
| ~~Over-capacity Deploy card must be visually unmistakable~~ | [`99-open-questions.md`](99-open-questions.md) #40 | 2026-06-11 — **resolved** (99-OQ #40 → Resolved): danger fit badge + `is-gated` bar + closed Deploy; confirm at the Phase H re-drive |
| ~~Sunlight theme: card status stripe placeholder color mapping~~ | [gaps register](13-slice/_PHASE-H-GATE-SCRIPT.md) #11 | 2026-06-11 — `--sp-solid` minted with the sunlight remap (closes gap #11); `color.md` + ADR-011 Addendum 2 |
| ~~Grouped cards: rotate through stacked set instead of showing all members~~ | ad hoc (Alex, 2026-06-11) | 2026-06-11 — `GroupedShorePoint` rolodex stack (`card.md` §The grouped rolodex stack, `20-operations.md`) |
| ~~Slide-track label clips behind the handle at narrow lane columns (~328px)~~ | ad hoc (S11 verification, 2026-06-11) | 2026-06-11 — knob-side label-clearance padding rule (`slider.md` Anatomy); verify at the re-drive |
