# Design Docket

> The curated running list of **design items** — visual, layout, and interaction concerns waiting for a design pass. Created 2026-06-11 at Alex's request ("do we have a running list of things to bring to design?").
>
> **This is a curation index, not a source of truth.** Every row links to its canonical home — a [`99-open-questions.md`](99-open-questions.md) row, a [#248](https://github.com/Vergo402/paratech-struts/issues/248) comment, the [gate script's known-gaps register](13-slice/_PHASE-H-GATE-SCRIPT.md), or a queued fix-session issue. Items are *resolved at the source*; when one resolves, strike its row here with a pointer. (The Phase E audit showed what happens when registers go blind to each other — this file exists so the design passes never re-learn that lesson.)
>
> **Habits:** every fix session (S10–S12) and every Phase I design session **opens by reading this file**. New design-class observations on #248 get a row here. Rapid adds go through the **`/docket`** skill (`.claude/skills/docket/`) — one line, committed immediately. An **ad hoc** row (no canonical home yet) is promoted to `99-open-questions.md` or #248 when it's first worked.

---

## Riding S10 — measurement keypad ([#314](https://github.com/Vergo402/paratech-struts/issues/314))

| Item | Canonical home | Added |
|---|---|---|
| Measurement ⅛″ fraction sub-control form — strip vs picker geometry | [`99-open-questions.md`](99-open-questions.md) #20 | 2026-06-11 (seed) |
| Measurement + Division as big gloved tap targets — no spinners/scroll-wheels | [`99-open-questions.md`](99-open-questions.md) #38 | 2026-06-11 (seed) |
| Big-key custom keypad on phone + hardware-keyboard typed parsing on desktop (KB-3) | [#248](https://github.com/Vergo402/paratech-struts/issues/248) KB-3 → [#314](https://github.com/Vergo402/paratech-struts/issues/314) | 2026-06-11 (seed) |

## Riding S11 — desktop surface ([#315](https://github.com/Vergo402/paratech-struts/issues/315))

| Item | Canonical home | Added |
|---|---|---|
| Desktop = blown-up phone column; build the 768pt/1200pt breakpoints (KB-1) | [#248](https://github.com/Vergo402/paratech-struts/issues/248) KB-1 → [#315](https://github.com/Vergo402/paratech-struts/issues/315) | 2026-06-11 (seed) |
| Per-lane status-summary bar at 768pt+ (rec G-15) | fix-plan §S11 → [#315](https://github.com/Vergo402/paratech-struts/issues/315) | 2026-06-11 (seed) |

## Riding S12 — card design pass ([#316](https://github.com/Vergo402/paratech-struts/issues/316))

| Item | Canonical home | Added |
|---|---|---|
| Card hierarchy reads bland vs v3 — important data must stand out; treatments A (in-doctrine) / B (color-push, would amend ADR-011) / optional C; Alex picks (KB-6) | [#248](https://github.com/Vergo402/paratech-struts/issues/248) KB-6 → [#316](https://github.com/Vergo402/paratech-struts/issues/316) | 2026-06-11 (seed) |
| **Over-capacity Deploy card must be visually unmistakable** — same card-treatment class as KB-6; recommend folding into S12 rather than waiting for Phase I | [`99-open-questions.md`](99-open-questions.md) #40 | 2026-06-11 (seed) |
| Sunlight theme: card status stripe uses a placeholder color mapping (`--sp-solid` remap) | [gaps register](13-slice/_PHASE-H-GATE-SCRIPT.md) #11 | 2026-06-11 (seed) |
| Grouped cards: rotate through stacked set instead of showing all members | ad hoc (Alex, 2026-06-11) | 2026-06-11 |

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

## Unscheduled / watch

| Item | Canonical home | Added |
|---|---|---|
| `--motion-loop` — continuous-loop timing (spinner/shimmer): behavior value vs ADR-gated 7th duration token; decide when a spinner first ships | [`99-open-questions.md`](99-open-questions.md) #19 | 2026-06-11 (seed) |

## Resolved (struck rows land here)

*None yet.*
