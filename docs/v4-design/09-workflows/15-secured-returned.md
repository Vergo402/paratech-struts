# Workflow: Secured / Returned

> Phase G workflow spec — [#224](https://github.com/Vergo402/paratech-struts/issues/224). Sub-issue of epic [#135](https://github.com/Vergo402/paratech-struts/issues/135).
> Cites [`00-workflow-foundation.md`](00-workflow-foundation.md) for all shared conventions.
> Source: [`20-operations.md`](../08-information-architecture/20-operations.md) (Operations board — Wood Shore Secured lane, Strut Equipment Returned lane, role gates, Remove & Return modal); [`card.md`](../03-primitives/card.md) (ShorePointCard — `secured` and `returned` states, deployed-strut identity, terminal state); [`modal.md`](../03-primitives/modal.md) (inventory-consequential confirm); [`slider.md`](../03-primitives/slider.md) (Runner → Wood Shore Secured advance; step-back from Wood Shore Secured); [ADR-010](../11-decisions/ADR-010-status-commit-model.md) (always-reversible up to Wood Shore Secured; terminal at Returned); [ADR-016](../11-decisions/ADR-016-modal-vs-sheet-rules.md) (Remove & Return = inventory-consequential modal).
> **Precondition:** SP in Runner state (from workflow [#223 — Runner](14-runner.md)).

---

## Purpose and goal

The shore point is set. This workflow covers the final two states of the SP lifecycle:
**Wood Shore Secured** (strut in the opening, shoring confirmed) and **Strut Equipment Returned**
(equipment physically removed and returned to apparatus inventory at end of engagement).

**Goal:** runner advances Shore Point to Wood Shore Secured. Later — typically at operation end —
the team removes and returns the equipment; the SP advances to Strut Equipment Returned and
inventory is replenished.

These are two distinct moments, often separated by hours:
- **Wood Shore Secured** happens in the field when the strut is confirmed set.
- **Strut Equipment Returned** happens after the all-clear, when equipment is physically
  collected and returned to its apparatus.

---

## Actors and surfaces

| Actor | Surface | When |
|---|---|---|
| **Runner** | Phone (primary) | Advances Runner → Wood Shore Secured on arrival at the opening |
| **Entry / Rescue / Shoring Group Supervisor** | Phone (primary) | Advances Wood Shore Secured → Strut Equipment Returned at equipment retrieval |
| **IC / Safety Officer** | Phone or tablet | Override on either role gate |

Both transitions are **individual** (post-cutting phase split; each card advances independently).

---

## State diagram

```mermaid
stateDiagram-v2
    [*] --> Runner

    Runner --> ShoreSecured : runner · slide → Wood Shore Secured → slider (individual; role-gated Runner)
    ShoreSecured --> Runner : runner/IC · step-back slide → slider (individual; no inventory change)

    ShoreSecured --> ReturnedConfirm : officer · tap Remove & Return → button (inventory-consequential gate)
    ReturnedConfirm --> ShoreSecured : officer/IC · tap Cancel → modal
    ReturnedConfirm --> StrutEquipmentReturned : officer/IC · tap Confirm Return → modal (terminal; increments inventory)

    StrutEquipmentReturned --> [*] : terminal state — SP lifecycle complete
```

`[StrutEquipmentReturned]` is **terminal** — no step-back, no further advance. The SP remains
in the lane until the operation is archived (workflow [#238](../09-workflows/) — End of operation).

---

## Step-by-step

### Step 1 — Runner → Wood Shore Secured (slide)

```
┌─────────────────────────────────────┐
│  Cascade Building Fire  [sync ●]    │
│─────────────────────────────────────│
│  Runner                         (1) │
│  ┌─────────────────────────────┐    │
│  │ Div 1 · Area A · T-Shore    │    │
│  │ LS 203 · from Rescue 2      │    │
│  │ ●───────────────────────○   │    │  ← advance slide → Wood Shore Secured
│  │      ○──────────────────●   │    │  ← step-back → Cutting Station
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

Advance slide; no confirm (non-inventory-consequential per ADR-010). Role-gated Runner.
Commits immediately on slide-past-threshold.

After the slide: card moves to Wood Shore Secured lane. The Remove & Return action appears on the
card; the advance slide is gone (Wood Shore Secured's only forward transition is via the Remove &
Return button, not a slide).

⇩ commits → `[ShoreSecured]`

---

### Step 1-R — Step back to Runner

Step-back slide on the Wood Shore Secured card — runner realizes the strut is not fully set.
Returns SP to Runner state; no inventory change; no confirm needed. Card returns to Runner lane.

---

### Step 2 — Remove & Return Equipment (Wood Shore Secured → Strut Equipment Returned)

This transition is **inventory-consequential** (the strut returns to apparatus available count)
and terminal. It requires a confirm modal per [ADR-016](../11-decisions/ADR-016-modal-vs-sheet-rules.md):

```
┌─────────────────────────────────────┐
│  Wood Shore Secured             (2) │
│  ┌─────────────────────────────┐    │
│  │ Div 1 · Area A              │    │
│  │ T-Shore [1/3] · LS 203      │    │
│  │ from Rescue 2  ✓ Secured    │    │
│  │                             │    │
│  │ [ Remove & Return Equipment ]│   │  ← inventory-consequential action; raises modal
│  │      ○──────────────────●   │    │  ← step-back → Runner (still available)
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

**Remove & Return confirm modal:**

```
┌─────────────────────────────────────┐
│  Return equipment to inventory?     │
│─────────────────────────────────────│
│  LS 203 will be returned to         │
│  Rescue 2's available count.        │
│                                     │
│  This cannot be undone.             │
│                                     │
│  [ Cancel ]  [ Confirm Return ]     │
└─────────────────────────────────────┘
```

**Role gate:** Entry / Rescue / Shoring Group Supervisor role required. IC / Safety override.

**Confirmed →** SP advances to Strut Equipment Returned. Inventory increments (strut returns to
apparatus available count) on the submitting device instantly; propagates to others on next sync.

**Cancelled →** no state change; returns to Wood Shore Secured card.

For external equipment (from a visiting department): modal copy changes — "Return LS 203 to
External · Dept 14. This equipment will be marked as returned to the source department."
Phase H owns the copy variant; the rule is the same (inventory-consequential confirm).

⇩ commits → `[StrutEquipmentReturned]` — terminal

---

### Step 3 — Strut Equipment Returned (terminal state)

```
┌─────────────────────────────────────┐
│  Strut Equipment Returned       (1) │
│  ┌─────────────────────────────┐    │
│  │ Div 1 · Area A              │    │
│  │ T-Shore [1/3]               │    │
│  │ LS 203 · Rescue 2           │    │
│  │ ✓ Equipment returned        │    │  ← terminal state; no slides, no buttons
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

The card is read-only. No advance, no step-back — Strut Equipment Returned is the terminal state.
The card remains in this lane until the operation is archived (workflow [#238](../09-workflows/)).
Cites [`card.md`](../03-primitives/card.md) §Terminal state anatomy.

The lane itself de-emphasizes (collapsed by default in v4, or rendered at lower visual weight per
`20-operations.md` — exact treatment finalized in Phase H).

---

## Cross-surface story

| Device | Step | What it sees |
|---|---|---|
| Runner's **phone** | 1 | Advances Runner → Wood Shore Secured |
| Officer's **phone** | 2 | Taps Remove & Return on Wood Shore Secured card; confirms the modal |
| IC's **tablet** | — | On next sync: Wood Shore Secured lane decrements; Returned lane increments; inventory available count for LS 203 increments in Inventory tab |
| **Broadcast** | — | On next sync: Wood Shore Secured and Returned counts update |
| **Inventory tab** | — | On next sync: Rescue 2's LS 203 available count reflects the return |

No push (Principle 10). Inventory increment is local-first on the submitting device; sync-propagated.

---

## Reversibility

| Action | Reversible? | Mechanism |
|---|---|---|
| Runner → Wood Shore Secured | Yes — step-back | Step-back slide on Wood Shore Secured card (→ Runner) |
| Wood Shore Secured → Strut Equipment Returned | **No — terminal** | Confirm modal states "This cannot be undone." |

No timed undo at any point (ADR-010). Wood Shore Secured is the last reversible state. Once equipment
is returned, the inventory record is authoritative.

---

## Composed screens and primitives

- [`20-operations.md`](../08-information-architecture/20-operations.md) — Wood Shore Secured lane,
  Strut Equipment Returned lane, Remove & Return action, role gates.
- [`card.md`](../03-primitives/card.md) — ShorePointCard (`secured` and `returned` states,
  terminal anatomy, deployed-strut identity through both states).
- [`slider.md`](../03-primitives/slider.md) — Runner → Wood Shore Secured advance; Wood Shore Secured →
  Runner step-back.
- [`modal.md`](../03-primitives/modal.md) — Remove & Return inventory-consequential confirm
  (the "inventory-consequential confirm" variant from ADR-016).
- [`button.md`](../03-primitives/button.md) — Remove & Return action button on Wood Shore Secured card.

No new primitives.

---

## Accessibility

Cite [`accessibility.md`](../07-design-system/accessibility.md) §Focus & keyboard and
[`modal.md`](../03-primitives/modal.md) for modal focus management.

Screen-reader behavior particular to this workflow:

- **Wood Shore Secured advance:** **"Shore point Wood Shore Secured. Div 1, Area A, T-Shore, LS 203."**
  (`aria-live="polite"`)
- **Remove & Return button:** **"Remove and return equipment. LS 203 from Rescue 2."**
- **Confirm modal opens:** VoiceOver announces modal title: **"Return equipment to inventory."**
  Focus trap enters modal.
- **Confirm Return button:** **"Confirm return. LS 203 to Rescue 2. This cannot be undone."**
- **Returned state announce:** **"Shore point Strut Equipment Returned. Div 1, Area A."**
  (`aria-live="polite"`)
- **Role gate block:** **"Entry, Rescue, or Shoring role required to return equipment. Contact IC
  or Safety Officer."** (`aria-live="assertive"`)
- No new SR script row needed.

---

## Open questions

1. **Strut Equipment Returned lane collapse behavior:** whether the Returned lane auto-collapses
   or remains expanded post-operation is finalized in the end-of-operation workflow [#238](../09-workflows/)
   and confirmed in Phase H. This spec names the terminal state; the archival/collapse mechanics
   are #238's territory.
2. **External equipment return copy:** confirmed as "Return to External · Dept 14" in the modal
   (to match the cross-dept-invite model from `52-cross-dept-invite.md`). Phase H owns the
   exact copy.
3. **Concurrent returns (race condition):** if two devices submit Remove & Return for the same
   SP simultaneously while offline, the second transaction checks available count > 0 before
   incrementing — the v3 transaction guard ([CLAUDE.md](../../../CLAUDE.md) §NEW-7) carries forward.
   Phase H owns the resync behavior.
