# Design System: Motion

> Phase E, design-system token file 4 of 8. Authored at the depth of [`03-primitives/picker.md`](../03-primitives/picker.md).
> Source: essay [`05-essays/02-visual-language.md`](../05-essays/02-visual-language.md) "Motion Doctrine" + [`05-essays/07-field-conditions.md`](../05-essays/07-field-conditions.md) (haptics), **reconciled — not transcribed.** Essay 02's "undo toast … slides out when the window closes" and essay 07's contextual **8-second undo window** are **superseded by [ADR-010](../11-decisions/ADR-010-status-commit-model.md)** (slide-to-advance + always-reversible): there is no timed undo and no undo-progress-line to animate. Every `--motion-*` / `--ease-*` token here matches [`preview/tokens.css`](../preview/tokens.css) verbatim; the living styleguide is the rendered proof.

---

## Purpose

Motion is the most easily abused layer in a design system, and on a fireground it is the most dangerous. A screen that flashes, slides, pulses, or counts up is a screen competing with the collapse zone for the operator's attention — and losing that competition is a safety failure, not a polish miss. So FieldShore's motion doctrine is restrictive by design (Principle 3 — *calm in chaos*: "no flashing reds, no anxious alarms, no excessive motion … measured animation").

The rule is a one-sentence test: **every animation has a job, and if the job cannot be stated in one sentence, the animation does not ship.** There are exactly three legitimate jobs:

1. **Origin** — showing where something came from (a sheet rises from the edge it lives on).
2. **Confirmation** — confirming an action registered (the status badge cross-fades on commit).
3. **Orientation** — orienting the user to a new state (a screen pushes in, the old content fades out).

Animation that decorates, entertains, or demonstrates capability is cut. Everything below exists to serve one of those three jobs *and nothing else* — and every duration is tuned for the phone in a gloved hand, because **the phone is the floor** (the operator is waiting for the sheet with a structural-glove thumb; every millisecond of animation is a millisecond of waiting).

---

## Motion architecture

Two token groups, and that is the whole system: **durations** and **easings**. They compose — a transition picks one duration and one easing. The values come from essay 02's motion doctrine (recommended there; this file is the first to *commit* them — no ADR locks them). The scale is deliberately short: six durations, five easings, no more. A seventh of either is a design bug, extendable only by ADR.

Under `prefers-reduced-motion` and in the broadcast theme, the entire system collapses to `--motion-instant` — duration zero, no easing, an instant state swap (see Accessibility, below).

---

## Duration tokens

| Token | Value | Use |
|---|---|---|
| `--motion-instant` | `0ms` | Reduced-motion swap, broadcast view, the sync dot, anything that must not animate |
| `--motion-micro` | `100ms` | Button press state, checkbox/icon fill, nav content-pane fade |
| `--motion-transition` | `200ms` | Bottom-sheet slide-up, **side-drawer slide-in**, modal fade-in, scrim fade, toast appear |
| `--motion-status` | `250ms` | Shore-point status badge color cross-fade |
| `--motion-nav` | `300ms` | Full-screen list push, tab-switch content |
| `--motion-exit` | `180ms` | Toast slide-out + fade |

> **The sheet uses `--motion-transition` (200ms), not `--motion-nav` (300ms).** This is deliberate, not an oversight: the plate picker (preserved from v3.5.1 per picker doctrine) opens at the bottom of the screen and *the user is already waiting for it.* Every millisecond of sheet animation is a millisecond of waiting with a gloved thumb. A 300ms sheet would feel sluggish in exactly the workflow that can least afford it.

---

## Easing tokens

| Token | Curve | Use |
|---|---|---|
| `--ease-micro` | `ease-out` | Micro state changes (press, fill) — fast start, gentle settle |
| `--ease-standard` | `cubic-bezier(0.25, 0.1, 0.25, 1)` | Sheet / modal / toast entrance |
| `--ease-nav` | `cubic-bezier(0.4, 0, 0.2, 1)` | Navigation push — material-style decelerate |
| `--ease-status` | `ease-in-out` | Status badge cross-fade — symmetric, reads as a *change of state*, not an arrival |
| `--ease-exit` | `ease-in` | Toast dismissal — accelerate away |

Pairing is fixed by the duration's job: `--motion-micro` rides `--ease-micro`, `--motion-transition` rides `--ease-standard`, `--motion-nav` rides `--ease-nav`, `--motion-status` rides `--ease-status`, `--motion-exit` rides `--ease-exit`. Mixing a duration with a foreign easing is an anti-pattern.

---

## What moves

Each entry names its one-sentence job.

- **Bottom sheets** (plate picker, action sheets) slide up from the bottom edge — `--motion-transition` — *origin: it comes from the edge it lives on.* Translates `translateY(100%) → translateY(0)`; the scrim fades `0 → --scrim` simultaneously (the scrim *value* is owned by [`color.md`](color.md) — 40% light/dark, 55% sunlight; this file owns the fade *timing*). iOS hardening carries from v3.5.1: `touch-action: pan-y` + `transform: translateZ(0)` on the sheet container.
- **Modal overlays** fade the scrim `0 → --scrim` over `--motion-transition`; the modal card translates up 8pt at the same time (origin slightly below center, arrives at center) — *orientation.* ([`modal.md`](../03-primitives/modal.md).)
- **Toasts** slide in from the bottom, 16pt above the safe area, over `--motion-transition`, and never overlap the primary action — *confirmation.* They dismiss with `--motion-exit`. Maximum one toast at a time; a second action dismisses the first immediately. *(Per ADR-010 the toast is now a confirmation/notification surface only — it is **not** an undo affordance.)*
- **Status badge** cross-fades from the old status color to the new over `--motion-status` — *confirmation that the transition committed.* It is a color fill cross-fade only: **no size change, no rotation, no scale.** On a card's *first* appearance in a status, the badge does **not** animate (it would read as load-state noise when a list first renders).
- **Navigation** fades the outgoing content pane (`--motion-micro` opacity) then shows the new content immediately — *orientation.* The tab bar itself does not move.

---

## What does not move

- **The bottom nav bar.** Always visible, never animates. It is the fixed frame the operator orients against.
- **Card positions on reorder.** Sorting a list **snaps** — v4.0 does not animate card reflow. Animated reorders are expensive on long lists (a 200-shore-point operation) and pointless when the user just tapped a sort control.
- **The sync status dot.** It changes state without transition and **never pulses.** It is information, not an alert — a pulsing dot reads as an alarm the operator must service.
- **Load-capacity numbers.** They render immediately. **Never a count-up.** *(Capacity is demoted in the card hierarchy anyway — animating it would re-promote it by motion.)*
- **Cards on state change.** No scale, no zoom, no shake. Scale/zoom on a card while the operator is watching a live list is *nauseating* — the focus signal is border + fill, never motion (per [`03-primitives/card.md`](../03-primitives/card.md)).

---

## Status commit — slide-to-advance + red-slash reveal

This is the one place the motion doctrine was rewritten. Essay 02 and essay 07 described a tap-to-advance commit with a 5-second (or, in the field, 8-second) **undo toast carrying a progress line**. [ADR-010](../11-decisions/ADR-010-status-commit-model.md) (Accepted at the Phase E gate, 2026-06-01) replaced that mechanism: status advances via a **deliberate slide gesture** and is **reversible from the card at any time** by an authorized user.

Motion's role in the new model is narrow and `card.md` owns the affordance geometry (the slide track, the reverse control, the off-queue state); **this file owns the timing:**

- **On commit** (the slide completes), the status badge plays the `--motion-status` cross-fade — the same confirmation animation as before. A **medium-impact haptic** fires with it (see Haptics).
- **On reversal** (an authorized user steps the card back), the badge plays the *same* `--motion-status` cross-fade, simply toward the previous color. Reversal is not a special animation — it is the forward transition run the other way.
- **The off-queue state** (a card regressed off an active work queue) is a **passive red-slash "Removed from cut list" treatment — a visual state, not an animated transition.** It does not fade or wipe in; it is simply how the card looks in that state. *Visible state over silent change* (Principle 10): a card that animated away would read as data loss under stress.

> **Removed by ADR-010:** the 5-second undo-progress-line micro-interaction. There is no countdown bar, no constant-rate progress line, no timer animation anywhere in v4 — reversibility is spatial (a control that is always present), not temporal (a window that expires). Essay 07's recommendation to *lengthen* that window to 8 seconds is therefore moot: there is no window to lengthen.

---

## Haptics pair with motion

Haptics are the confirmation channel that works when the screen is **not** in the operator's field of view (eyes on the rubble, phone in hand). They fire *with* the visual transition, not instead of it (essay 07 — haptics as a primary signal channel):

- **Light haptic on touch start** — "the screen saw the touch."
- **Medium-impact haptic on state commit** to local state — "the action went through." (Synthesis §1.5.)

The operator feels the pair in sequence and knows the slide committed without looking down. *Note:* essay 07's third haptic — a light notification when the undo toast appears — went away with the undo toast (ADR-010); there is no toast-arrival haptic on a status transition. **Haptics are not suppressed by `prefers-reduced-motion`** — a haptic is not motion, and it is the accessibility channel for an operator who cannot watch the screen. v4 ships **no audio feedback** (Principle 3; Principle 10 — respect the radio); the haptic channel carries what audio would.

---

## Per-surface behavior

The motion system is authored for the phone and inherited unchanged by tablet and laptop — designed for the role, not the device (Principle 2), the same way [`color.md`](color.md) and [`typography.md`](typography.md) adapt per surface without forking components. Two surfaces are exceptions:

- **Sunlight.** Durations and easings are unchanged — motion is already minimal, and slowing or speeding it buys nothing under glare. The card shadow that appears in sunlight (`--card-shadow`, see [`color.md`](color.md)) is part of the *static* surface treatment, **not** an entrance animation; cards do not fade their shadow in.
- **Broadcast TV.** **Zero animation.** The TV view is a snapshot, not a live reactive component — it refreshes on a ~15-second poll or an explicit push from the command post. Animated transitions in a broadcast context distract the entire room (essay 02, Theme 4). Every duration token resolves to `--motion-instant` under `[data-theme="broadcast"]`.

---

## Accessibility — `prefers-reduced-motion`

When the OS reports `prefers-reduced-motion: reduce`, **all animations drop to instant** — duration zero, no easing. This is an **instant state swap, not a cross-fade to nothing**: the status badge does not transition, it *switches*; the sheet does not slide, it *appears*. Implementation is one media query that zeroes every `--motion-*` duration (the easings become irrelevant at zero duration) — primitives reference the tokens, so none of them needs its own reduced-motion branch.

Because **color is never the only state signal** (Principle 9 — every status is stripe + badge-with-text + label, per [`color.md`](color.md) and [`03-primitives/card.md`](../03-primitives/card.md)), removing the cross-fade loses *no* information: the new state is fully legible the instant it swaps. WCAG 2.1 AA is the floor; the reduced-motion swap is the conformance path for [2.3.3 Animation from Interactions] and the calm-in-chaos default the doctrine already favors. Full motion-accessibility behavior is consolidated in [`accessibility.md`](accessibility.md), authored last; it references this section as the source of record.

---

## Anti-patterns (do not do these)

- **An animation with no one-sentence job.** If you can't name origin, confirmation, or orientation, cut it.
- **A timed undo toast or progress line.** Superseded by ADR-010. Reversibility is the always-present slide-back control, not a countdown. Reintroducing a timer reintroduces the field failure the ADR was written against.
- **Scale / zoom / shake on a card during an operation.** Nauseating on a live list. State changes are color + border only.
- **Animating card reorder.** Snap. Animated reflow on a long list is expensive and serves no job.
- **A count-up on capacity (or any number).** Numbers render immediately.
- **A pulsing or accelerating indicator** — the sync dot, a badge, anything that ramps urgency near a threshold. Pulsing near zero manufactures anxiety that competes with the incident (Principle 3).
- **Any animation in the broadcast theme.** It is a snapshot, not a UI.
- **A duration or easing minted off-scale.** No 150ms, no 400ms, no custom bezier for one component. Six durations, five easings; extend only by ADR.
- **Mixing a duration with a foreign easing.** The pairings are fixed (see Easing tokens).

---

## Open questions for the gate

None blocking. The timing values and the `--motion-*` / `--ease-*` namespace split were confirmed with Alex (2026-06-02); ADR-010 locks the commit model. One item is deliberately deferred, not open:

1. **Exact slide mechanics** — full-card horizontal swipe vs. a dedicated slide-toggle control on the card. This is an affordance-geometry decision owned by [`03-primitives/card.md`](../03-primitives/card.md) and finalized in **Phase G/H** (per ADR-010); it does not change any motion token here — whichever control wins, the commit still plays `--motion-status` + a medium haptic.
