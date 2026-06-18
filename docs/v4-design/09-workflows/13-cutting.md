# Workflow: Cutting

> Phase G workflow spec — [#222](https://github.com/Vergo402/paratech-struts/issues/222). Sub-issue of epic [#135](https://github.com/Vergo402/paratech-struts/issues/135).
> Cites [`00-workflow-foundation.md`](00-workflow-foundation.md) for all shared conventions.
> Source: [`21-cutting-station.md`](../08-information-architecture/21-cutting-station.md) (the Cutting Station screen — FIFO queue, priority reorder, the two-step cut-done → runner slide sequence, red-slash off-queue); [`20-operations.md`](../08-information-architecture/20-operations.md) (Operations board — Strut Set lane, the Strut Set → Cutting Station slide, Cutting Station lane); [`card.md`](../03-primitives/card.md) (ShorePointCard — `cutting` state, cut-length emphasis, group badge, pre-cutting vs. individual advance split, red-slash); [`slider.md`](../03-primitives/slider.md) (slide-to-advance; step-back); [ADR-008](../11-decisions/ADR-008-nims-org-structure.md) (Cutting Station = workstation under Operations; Cutting role spelled out); [ADR-010](../11-decisions/ADR-010-status-commit-model.md) (reversibility, step-back).
> **Precondition:** SP in Equipment Assigned or Strut Set state (lifecycle from workflow [#221](12-deploying-a-strut.md)). The SP enters `cutting` state via a slide on the Operations board; the **Cutting Station** is where the cutter works the card through the two cut-specific steps.

---

## Purpose and goal

Get the strut cut to the right length and handed off to the runner. This workflow covers two
distinct action surfaces that work in sequence: the **Operations board** (the Strut Set → Cutting Station
slide, which is group-wide) and the **Cutting Station** (the cutter's workstation, which owns the
two-step cut-done → runner arc on each card individually).

**Goal:** Team officer advances the SP from Strut Set to Cutting Station (group-wide slide). The cutter
works the card at the Cutting Station: marks cut done after the saw runs, then sends to runner.
The SP advances to Runner state and leaves the Cutting Station queue.

---

## Actors and surfaces

| Actor | Surface | When |
|---|---|---|
| **Team officer** / **Shoring Group Supervisor** | Phone or tablet | Advances Strut Set → Cutting Station on the Operations board; this is the group-wide slide |
| **Cutter** (Cutting role) | Phone (floor, default) or tablet | Works the Cutting Station; Mark Cut Done → Send to Runner |
| **IC / Safety Officer** | Phone or tablet | Can override the Cutting role gate on either step |

Phone is the floor (Principle 2) for the cutter — the saw is running, the phone is the tool.
Cutting Station is reachable from Operations sub-nav or as the cutter's default screen on their
device.

---

## State diagram

```mermaid
stateDiagram-v2
    [*] --> StrutSet

    note right of StrutSet : SP is here after deploy arc (workflow #221)

    StrutSet --> Cutting : officer · slide → Cutting Station → slider (group-wide pre-cutting advance)
    Cutting --> StrutSet : officer/IC · step-back slide → slider (group-wide step-back; red-slash if in queue)

    Cutting --> CutDone : cutter · slide → Cut Done → slider (individual; Cutting Station; sets cuttingDone flag; stays cutting)
    CutDone --> Cutting : cutter/IC · step-back slide → slider (individual; clears cuttingDone flag)
    CutDone --> Runner : cutter · slide → Runner → slider (individual; Cutting Station; advances status; card leaves queue)

    Runner --> [*] : exits this workflow → enters workflow #223 (Runner)
```

Two distinct advance sub-arcs:
1. **Operations board arc** (Strut Set → Cutting Station): group-wide, team officer.
2. **Cutting Station arc** (Cutting → CutDone → Runner): individual per card, cutter at the
   Cutting Station. `CutDone` is an internal flag on the `cutting` state — it does not appear
   as its own lane on the Operations board.

---

## Step-by-step

### Step 1 — Strut Set → Cutting Station (Operations board; group-wide slide)

```
┌─────────────────────────────────────┐
│  Cascade Building Fire  [sync ●]    │
│─────────────────────────────────────│
│  Strut Set                      (3) │
│  ┌─────────────────────────────┐    │
│  │ Div 1 · Area A · 48-1/2"    │    │
│  │ T-Shore [1/3] · LS 203      │    │  ← group badge; all 3 members here
│  │ ●───────────────────────○   │    │  ← advance slide → Cutting Station (group-wide)
│  │      ○──────────────────●   │    │  ← step-back slide → Equipment Assigned
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

The advance slide on any group member advances **all group members to Cutting Station at once** (pre-cutting
group behavior per [`card.md`](../03-primitives/card.md) §Group phase-split). This is the last
group-wide advance — after Cutting Station, each card advances individually.

No confirm modal; this is a non-inventory-consequential status slide (ADR-010). The step-back
reverses all group members to Strut Set.

After the slide commits: all three cards move to the Cutting Station lane on the Operations board **and**
appear in the Cutting Station queue (ordered by `cuttingStartedAt`).

⇩ commits → `[Cutting]` for all group members

---

### Step 2 — Cutting Station queue (cutter's view)

```
┌─────────────────────────────────────┐
│  ✂ Cutting Station  [sync ●]        │  ← dedicated screen (cites 21-cutting-station.md)
│─────────────────────────────────────│
│  3 cuts in queue                    │
│  ┌─────────────────────────────┐    │
│  │ Div 1 · Area A · T-Shore    │    │
│  │                             │    │
│  │   48-1/2″                   │    │  ← cut length: PROMOTED, bold, cutting-hue
│  │                             │    │
│  │ LS 203 · from Rescue 2      │    │  ← deployed strut + source
│  │ [1/3] — now individual      │    │  ← group badge for context; individual from here
│  │ ●──────────────────────○    │    │  ← slide 1: Mark Cut Done
│  │      ○─────────────────●    │    │  ← step-back → Strut Set (with red-slash warning)
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ … next cut in queue …       │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

The Cutting Station screen is owned by [`21-cutting-station.md`](../08-information-architecture/21-cutting-station.md)
— this workflow cites it for layout and does not redraw it.

**Cut length is the one promoted number** — rendered larger, bold, in the cutting-status hue.
This is the single most important datum for the cutter: what length to cut to. Deduction context
is available on tap (demoted beneath cut length).

**Queue order:** FIFO by `cuttingStartedAt`. Grouped cards that entered Cutting Station at the same
moment are ordered by their group index (1/3 → 2/3 → 3/3).

**Priority override (tablet):** the lead can drag a card to the top of the queue on tablet (the
G-16 enhancement from `21-cutting-station.md`). Phone shows the queue read-only — the slide
still works on phone; only the drag-reorder is tablet-only.

---

### Step 3 — Mark Cut Done (slide 1; individual)

The cutter runs the saw, achieves the cut length. The card advances its internal `cuttingDone`
flag — status remains `cutting`; the card stays in the queue:

```
┌─────────────────────────────────────┐
│  ┌─────────────────────────────┐    │
│  │ Div 1 · Area A · T-Shore    │    │
│  │                             │    │
│  │   48-1/2″                   │    │  ← cut length stays promoted
│  │                             │    │
│  │ LS 203 · from Rescue 2      │    │
│  │ ✓ Cut done                  │    │  ← cuttingDone flag visible on card
│  │ ●──────────────────────○    │    │  ← slide 2: Send to Runner
│  │      ○─────────────────●    │    │  ← step-back → clears cuttingDone flag
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

**Role gate:** Cutting role required. IC / Safety Officer can override.

**Optional actual-cut override:** the cutter may record what was actually cut (different from
the expected cut length). The actual-cut input is an optional field beneath the cut-length display;
the diff surfaces as a small badge `expected ↔ actual`. It does not block advancement — it is
observational data for the after-action record.

**Step 3-R — Clear Cut Done (step-back from CutDone):** the cutter mis-flagged; step-back slide
clears the `cuttingDone` flag, returns card to the advance-slide-1 state. No confirm needed; no
inventory change.

---

### Step 4 — Send to Runner (slide 2; individual)

The strut is in hand and the runner is ready to carry it to the shore point:

```
┌─────────────────────────────────────┐
│  ✂ Cutting Station  [sync ●]        │
│─────────────────────────────────────│
│  2 cuts in queue                    │  ← count decremented for this card
│  ┌─────────────────────────────┐    │
│  │ Div 1 · Area A · T-Shore    │    │
│  │ ✓ Cut done → sent to runner │    │  ← read-only tail; card stays briefly visible
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ … remaining cuts …          │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

**Role gate:** Cutting role required (same gate as Mark Cut Done). IC / Safety override.

The card advances to `runner` state. In the Cutting Station:
- The card **moves to the read-only tail** (sent-to-runner section below the active queue) and
  stays visible until the equipment is returned. It does not vanish — Principle 10: no silent
  removal.
- Queue count decrements.

On the Operations board:
- The card moves from the Cutting Station lane to the Runner lane.

⇩ commits → `[Runner]` — exits this workflow → workflow [#223](14-runner.md)

---

### Step-back out of Cutting Station — red-slash

If a card steps back from Cutting Station → Strut Set while it is already in the Cutting Station queue:

```
┌─────────────────────────────────────┐
│  ┌─────────────────────────────┐    │
│  │ ╱─────────────────────────╲ │    │
│  │  Removed from cut list      │    │  ← red-slash diagonal; centered label
│  │ ╲─────────────────────────╱ │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

The card shows the **red-slash "Removed from cut list"** overlay (cites
[`card.md`](../03-primitives/card.md) §Off-queue red-slash). It is never silently removed from
the queue view — the cutter can see it was pulled. The card eventually disappears from the queue
on the next render cycle (or tap to dismiss). On the Operations board, the SP returns to the
Strut Set lane.

For grouped SPs: the step-back from Cutting Station → Strut Set is group-wide (all members step back).
If cards were already at different positions in the queue, each shows the red-slash individually.

---

## Cross-surface story

**Two actors, two screens working in tandem:**

| Device | Step | What it sees |
|---|---|---|
| Officer's **phone** (Operations) | 1 | Slides Strut Set → Cutting Station; all group members move to Cutting Station lane |
| Cutter's **phone** (Cutting Station) | 2–4 | Sees the card appear in queue; runs Mark Cut Done → Send to Runner |
| IC's **tablet** (CP) | — | On next sync: Cutting Station lane card count updates; Cutting Station queue reflects advances |
| Any connected device | — | On next sync: Operations board Cutting Station → Runner lane transition visible |
| **Broadcast** | — | On next sync: Cutting Station lane count decrements; Runner lane count increments |

The officer and cutter are typically on different devices in different locations — the officer
may be at the shore point while the cutter is at the saw station. No push (Principle 10); the
Cutting Station's queue updates on sync.

---

## Reversibility

| Action | Reversible? | Mechanism |
|---|---|---|
| Strut Set → Cutting Station (group slide) | Yes | Step-back slide (group-wide; all members return to Strut Set) |
| Mark Cut Done | Yes | Step-back slide on CutDone card (clears `cuttingDone` flag) |
| Send to Runner | Yes | Step-back from Runner → Cutting Station (workflow #223 owns that step-back) |
| Step-back out of Cutting Station | Yes | Red-slash visible; SP returns to Strut Set on Operations board |

---

## Composed screens and primitives

- [`21-cutting-station.md`](../08-information-architecture/21-cutting-station.md) — the
  Cutting Station workstation (queue, priority reorder, four-surface rendering).
- [`20-operations.md`](../08-information-architecture/20-operations.md) — Operations board
  (Strut Set → Cutting Station slide; Cutting Station lane; red-slash behavior).
- [`card.md`](../03-primitives/card.md) — ShorePointCard (`cutting` state, cut-length emphasis,
  group badge, phase-split rule, red-slash, `cuttingDone` flag).
- [`slider.md`](../03-primitives/slider.md) — all advance and step-back slides in this workflow.

No new primitives.

---

## Accessibility

Cite [`accessibility.md`](../07-design-system/accessibility.md) §Focus & keyboard.

Screen-reader behavior particular to this workflow:

- **Strut Set → Cutting Station slide (group):** on commit, `aria-live="polite"` announces **"3 shore
  points moved to Cutting Station. T-Shore group, Div 1."**
- **Cut length on Cutting Station card:** VoiceOver reads the promoted number prominently —
  **"Cut to 48 and a half inches. Div 1, Area A, LS 203, Rescue 2."**
- **Mark Cut Done commit:** **"Cut done marked. Slide to send to runner."** (`aria-live="polite"`)
- **Send to Runner commit:** **"Shore point sent to runner. Div 1, Area A, 48 and a half inches."**
- **Red-slash:** **"Shore point removed from cut list. Div 1, Area A."** (`aria-live="assertive"`)
- **Role gate block:** **"Cutting role required to advance. Contact IC or Safety Officer."**
  (`aria-live="assertive"` on denied tap).
- Slide controls have Advance / Step-back button equivalents per the *assistive-tech-cannot-slide*
  contract (`slider.md`). No new SR script row needed.

---

## Open questions

1. **Queue ordering for same-group members:** T-Shore ×3 all enter Cutting Station at the same timestamp.
   Ordered by group index (1/3 first) is the stated rule; Phase H implementation verifies this
   produces the expected FIFO behavior in practice.
2. **Multiple saw stations:** v4.0 assumes one Cutting Station queue. If a second saw opens
   (e.g., a concurrent team), per-station queues + cut-card routing are a workstation-instancing
   question (analogous to multiple Staging areas in NIMS); deferred to v4.5 / Phase G future.
3. **Actual-cut input UX:** the optional actual-cut override field beneath the promoted cut length
   — whether it is a tap-to-expand slot or always visible — finalized in Phase H with the Cutting
   Station form layout.
4. **Step-back scope on a partially-sent group:** if two of three T-Shore cards have been sent to
   Runner and one is still in Cutting Station, stepping back that last card is individual (post-cutting).
   Does the Operations board show the two Runner cards + one Strut Set card? Yes — the phase
   split means each card is now independent. Phase H confirms the visual state.
