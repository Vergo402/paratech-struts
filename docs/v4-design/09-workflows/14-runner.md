# Workflow: Runner

> Phase G workflow spec — [#223](https://github.com/Vergo402/paratech-struts/issues/223). Sub-issue of epic [#135](https://github.com/Vergo402/paratech-struts/issues/223).
> Cites [`00-workflow-foundation.md`](00-workflow-foundation.md) for all shared conventions.
> Source: [`20-operations.md`](../08-information-architecture/20-operations.md) (Operations board — Runner lane, slide-to-advance); [`card.md`](../03-primitives/card.md) (ShorePointCard — `runner` state, deployed-strut identity); [`slider.md`](../03-primitives/slider.md) (advance and step-back); [ADR-008](../11-decisions/ADR-008-nims-org-structure.md) (Runner = a task/resource under Operations, not a NIMS position title — spelled out as "Runner"); [ADR-010](../11-decisions/ADR-010-status-commit-model.md) (always-reversible step-back).
> **Precondition:** SP in Runner state (from Send to Runner in workflow [#222 — Cutting](13-cutting.md)).

---

## Purpose and goal

The strut is cut and in hand. The runner carries it from the saw station to the shore point.
When the strut is physically set in the opening, the runner slides the card to Wood Shore Secured.

**Goal:** runner advances the SP from Runner → Wood Shore Secured. One slide; individual (post-cutting
phase split is in effect). The card carries the deployed strut identity throughout.

---

## Actors and surfaces

| Actor | Surface | When |
|---|---|---|
| **Runner** | Phone (primary) | Physically carrying the cut strut to the opening; slides the card on arrival |
| **Team officer** / **Shoring Group Supervisor** | Phone or tablet | May advance if Runner role not explicitly assigned |
| **IC / Safety Officer** | Phone or tablet | Override on any role gate |

Phone is the floor (Principle 2). The runner's slide happens on arrival at the shore point —
one handed, at the opening.

**Role gate:** Runner role required to advance Runner → Wood Shore Secured. IC / Safety override.

---

## State diagram

```mermaid
stateDiagram-v2
    [*] --> Runner

    Runner --> ShoreSecured : runner · slide → Wood Shore Secured → slider (individual; role-gated Runner)
    Runner --> Cutting : runner/IC · step-back slide → slider (individual; returns card to Cutting Station)

    ShoreSecured --> [*] : exits this workflow → enters workflow #224 (Secured / Returned)
```

The simplest workflow in the lifecycle arc — one slide, one actor, no branch paths other than
step-back. Individual (post-cutting phase split is in full effect; no group-wide behavior).

---

## Step-by-step

### Step 1 — Runner lane: slide → Wood Shore Secured

```
┌─────────────────────────────────────┐
│  Cascade Building Fire  [sync ●]    │
│─────────────────────────────────────│
│  Runner                         (1) │
│  ┌─────────────────────────────┐    │
│  │ Div 1 · Area A              │    │
│  │ T-Shore [1/3] · Runner      │    │  ← group badge for context; individual behavior
│  │ LS 203 · from Rescue 2      │    │  ← deployed strut identity (persists cradle-to-grave)
│  │ ●───────────────────────○   │    │  ← advance slide → Wood Shore Secured
│  │      ○──────────────────●   │    │  ← step-back slide → Cutting Station
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

**Element acted on:** the advance slide on the Runner-lane ShorePointCard.

No confirm modal — this is a non-inventory-consequential status advance (ADR-010). Commits
immediately on slide-past-threshold.

⇩ commits → `[ShoreSecured]` — exits this workflow → workflow [#224](15-secured-returned.md)

---

### Step 1-R — Step back to Cutting Station

```
┌─────────────────────────────────────┐
│  Cutting Station                (1) │  ← card moves back to Cutting Station lane on Operations board
│  ┌─────────────────────────────┐    │
│  │ Div 1 · Area A · T-Shore    │    │
│  │ LS 203 · Cutting Station    │    │
│  │ … (returns to Cutting queue)│    │  ← re-enters Cutting Station queue at current position
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

Step-back slide on the Runner card. The SP returns to `cutting` state; it re-enters the
Cutting Station queue. The `cuttingDone` flag is preserved (the saw already ran — the step-back
is about the runner not being ready, not about re-cutting). The card shows in Cutting Station
with the Cut Done state visible; the cutter can immediately re-slide → Send to Runner.

No confirm needed; no inventory change.

---

## Cross-surface story

Single-actor story (Runner on phone):

| Device | Step | What it sees |
|---|---|---|
| Runner's **phone** | 1 | Drives the slide; SP advances to Wood Shore Secured |
| Team officer's **phone** (Operations) | — | On next sync: Runner lane decrements; Wood Shore Secured lane increments |
| IC's **tablet** | — | On next sync: Operations board updates |
| **Broadcast** | — | On next sync: Runner count decrements; Wood Shore Secured count increments |

No push (Principle 10).

---

## Reversibility

| Action | Reversible? | Mechanism |
|---|---|---|
| Runner → Wood Shore Secured | Yes (step-back from #224) | Step-back slide on Wood Shore Secured card (workflow #224 owns that) |
| Runner → Cutting Station (step-back) | Yes | Step-back slide on Runner card; re-enters Cutting Station queue with `cuttingDone` intact |

---

## Composed screens and primitives

- [`20-operations.md`](../08-information-architecture/20-operations.md) — Runner lane on
  Operations board.
- [`card.md`](../03-primitives/card.md) — ShorePointCard (`runner` state, deployed-strut
  identity, group badge for context).
- [`slider.md`](../03-primitives/slider.md) — advance (→ Wood Shore Secured) and step-back
  (→ Cutting Station) slides.

No new primitives.

---

## Accessibility

Cite [`accessibility.md`](../07-design-system/accessibility.md) §Focus & keyboard.

Screen-reader behavior particular to this workflow:

- **Runner card:** VoiceOver reads **"Shore point Runner. Div 1, Area A, T-Shore, LS 203,
  Rescue 2. Group 1 of 3."**
- **Advance slide commit:** **"Shore point Wood Shore Secured. Div 1, Area A."**
  (`aria-live="polite"` on the card after transition)
- **Step-back commit:** **"Shore point returned to Cutting Station. Div 1, Area A."**
- **Role gate block:** **"Runner role required to advance. Contact IC or Safety Officer."**
  (`aria-live="assertive"`)
- Slide controls have Advance / Step-back button equivalents per the *assistive-tech-cannot-slide*
  contract. No new SR script row needed.

---

## Open questions

1. **`cuttingDone` flag preservation on step-back from Runner → Cutting Station:** the stated rule is
   that the flag is preserved (saw already ran). Phase H confirms this is the correct UX
   (cutter sees "Cut done — slide to send to runner" immediately without re-marking).
2. **Role gate scope:** whether the Runner role gate applies only to the slide or also to
   viewing the Runner lane — the spec says gate is on the advance action, not the view.
   Finalized with ADR-017 RBAC implementation in Phase H.
