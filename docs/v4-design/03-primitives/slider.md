# UI Primitive: The Slider

> Phase E primitive spec. The **slide-to-commit control** — the deliberate gesture that advances a shore point through its lifecycle, and the safety-critical heart of v4's interaction model. Authored at the depth of [`picker.md`](picker.md).
> Source: essay [`05-essays/02-visual-language.md`](../05-essays/02-visual-language.md) "Status Commit" + [`05-essays/07-field-conditions.md`](../05-essays/07-field-conditions.md) (the gloved/wet/sun rationale) + [`06-synthesis.md`](../06-synthesis.md) §1.5 (field-conditions commit model) and §4 (Field UX). **Governed by [ADR-010](../11-decisions/ADR-010-status-commit-model.md)** (slide-to-advance + always-reversible; amends Principle 6's mechanism) and **Principle 3** (calm in chaos), **Principle 4** (one canonical action), **Principle 9** (color is never the only signal). The slide *placement* on the card belongs to [`card.md`](card.md); this file owns the *control* — see **The division of labor**. Grounded in the **real v3 status flow** — the tap-to-advance buttons (`updateShoreStatus()`, `markCutDone()`, `sendToRunner()`, `returnEquipment()`) the slide replaces — the way [`card.md`](card.md) is grounded in `renderResults()` and [`badge.md`](badge.md) in the v3 badge sprawl. The slider mints **no token of its own** — every value is owned by a sibling and cited (`--radius-button` [`spacing-grid.md`](../07-design-system/spacing-grid.md), `--accent` / `--status-*` / `--surface-*` [`color.md`](../07-design-system/color.md), `--motion-micro` / `--motion-status` [`motion.md`](../07-design-system/motion.md), the 56/60pt targets [`spacing-grid.md`](../07-design-system/spacing-grid.md)).

---

## Purpose

A slider in FieldShore is **a track and a draggable thumb that commit a discrete state transition when the thumb is dragged past a threshold.** It is not a value control — it does not select 18½″ or set a brightness. It commits *one named step*: "Slide to set Runner." It is the gesture the team officer performs hundreds of times an incident, gloved, on a wet screen, in the sun, with eyes mostly on the rubble.

The slider exists because **a tap is the wrong gesture for a safety-consequential commit.** Field physics ([ADR-010](../11-decisions/ADR-010-status-commit-model.md), synthesis §1.5): structural-glove fingertips contact at 18–22 mm and miss the 44pt floor ~30% of the time; a wet screen fires ghost taps; the in-building role is not watching the screen. v3 advanced status with tap buttons, so a ghost tap could march a shore point into Cutting unbidden. v4 replaces tap-to-advance with a **deliberate slide**: a gesture a brush or a raindrop cannot complete, that commits immediately, and that is **always reversible from the card** — no "Are you sure?", no timed undo (Principle 6 as amended by ADR-010).

This is the one primitive whose *gesture* is the doctrine. The picker's job is choosing; the badge's job is telling; the slider's job is **committing a step you cannot un-mean.**

---

## The division of labor

The slide-to-advance affordance is described in three places on purpose; each owns a different layer, and they do not contradict. Stated here so the boundary is a rule, not a guess — the same discipline [`badge.md`](badge.md) draws with the card ("card.md owns the placement; badge.md owns the chip itself"):

| Layer | Owner |
|---|---|
| **The model** — slide commits immediately, always reversible, no timed undo, heavy confirm reserved for destructive/terminal | [ADR-010](../11-decisions/ADR-010-status-commit-model.md) |
| **The control** — track, thumb, direction, commit threshold, snap-back, label legibility, the AT button-equivalent contract | **this file** |
| **The placement** — where the track sits on the `ShorePointCard`, the reverse control's secondary position, the off-queue red-slash, grouped scope, pending = Assign-Equipment-not-slide | [`card.md`](card.md) |
| **The timing** — the commit cross-fade duration, the haptic pair | [`motion.md`](../07-design-system/motion.md) |
| **The scripts + a11y narrative** — the consolidated VoiceOver/TalkBack registry and the *assistive tech cannot slide* rule | [`accessibility.md`](../07-design-system/accessibility.md) |

`card.md` was authored at the Phase E gate before this primitive was filled, so it carries the slide affordance inline; from here `slider.md` is the source of record for the **control**, and `card.md` remains the source of record for **placement and card-context behavior** (the reverse affordance's position, the red-slash, grouped phase-split, the pending exception). Where the two touch, they cite each other.

---

## The variants

The slide gesture is deliberately confined to **one job — committing a discrete lifecycle step** — so the vocabulary is small, the way [`motion.md`](../07-design-system/motion.md) holds to six durations and a seventh is a bug. There are **two configurations of one control**, mirror images:

| Variant | Commits | Thumb start → travel | Emphasis | Example |
|---|---|---|---|---|
| **Advance slider** (canonical) | the **next** lifecycle status | **leading (left) edge → rightward** | **Primary** — full-width, prominent, the canonical action (Principle 4) | "Slide to set Runner" on a `ShorePointCard` |
| **Step-back slider** (secondary) | the **previous** lifecycle status | **trailing (right) edge → leftward** | **Secondary** — smaller, lower-contrast, placed below the advance track | "Step back to Cutting" |

The directions are fixed and they are opposites on purpose (per [`card.md`](card.md)): advancing committed work reads as *forward/rightward*, reversing it as *back/leftward*, so neither can be mistaken for the other and neither fires from a stray tap. The step-back is **visually secondary** — the next step is the canonical action; reversal is the escape hatch, always present but never competing for the track's width.

Depth here is not in variant *count* — it is in the **mechanics** (threshold, snap-back, the label rule, the domain boundary, the AT contract) specified below. Two configurations, exhaustively ruled, is the whole control.

---

## What is **not** a slider — the read-the-rule boundary

Like [`sheet.md`](sheet.md) vs [`modal.md`](modal.md) and [`badge.md`](badge.md) vs the interactive chip, the slide control draws a hard line against the things it resembles. Reaching for a slider in any of these cases is the error:

| It is the **slide control** when… | It is **not** when… | Use instead |
|---|---|---|
| You commit one *named discrete step* in a lifecycle | You set a *value on a continuous range* | a numeric **input** ([`input.md`](input.md)) |
| The commit is safety-consequential and must resist ghost-taps | The choice is a *binary on/off* | a **toggle** ([`toggle.md`](toggle.md)) |
| There is a forward and a back along one ordered axis | The choice is *one of a few peers* | **inline segmented** ([`picker.md`](picker.md)) |
| The action *changes status only* | The action *mutates inventory* or is *terminal* | a **button** → [`warning-gate.md`](warning-gate.md) |

> **FieldShore ships no value-range slider.** This is a deliberate absence, not an omission. The temptations and why each is refused:
> - **Measurement entry** is the obvious place a drag-slider shows up in other apps — and it is exactly wrong here. Measurements are exact to **1/8″, floored** ([ADR-012](../11-decisions/ADR-012-measurement-precision-eighth-inch.md)); a thumb dragged across a track cannot reliably land on 45 5/8″, and "close enough" on a cut length is a safety failure. Measurement is the 56pt numeric keypad ([`input.md`](input.md)), never a slider.
> - **Load / capacity** could be a range in another product. It is **demoted** in v4 (synthesis §3.4) and computed by the conservative-floor engine, never dialed by hand.
> - **Brightness / sunlight** is a theme switch (System / Light / Dark / Sunlight) with an ambient-lux auto-trigger ([`color.md`](../07-design-system/color.md)), not a continuous dimmer.
>
> So every "slider" in FieldShore is the **action slider**. If a future surface genuinely needs a value range, that is an ADR and a new variant — not an inline decision.

---

## The commit domain — which transitions are slides

The slide governs the **status-only** middle of the lifecycle. The two ends mutate inventory and are therefore **not** slides — a distinction inherited verbatim from [`card.md`](card.md) and [ADR-010](../11-decisions/ADR-010-status-commit-model.md):

```
 pending ──▶ process ──▶ strutset ──▶ cutting ──▶ runner ──▶ secured ──▶ returned
    │       └─────────────── slide (advance) ───────────────┘              │
    │       ◀────────────── slide (step-back) ──────────────┘              │
    │                                                                      │
 [Assign Equipment]                                          [Return Equipment]
  deploy · button ·                                          terminal · button ·
  decrements stock                                           mutates stock
  → warning-gate                                             → warning-gate
```

- **`pending → process` is not a slide.** It is **Assign Equipment** — a deploy action that pulls a strut from inventory — rendered as a full-width process-blue button, because reaching In Process *means* a strut was deployed ([`card.md`](card.md) §Pending). A point with nothing to advance has no track.
- **`process → strutset → cutting → runner → secured` are slides.** This is the everyday lifecycle advance; it changes status only, never shows a confirm, and is the advance slider's entire forward domain.
- **`secured → returned` is not a slide.** Returning equipment mutates inventory and is terminal — it is a button that invokes [`warning-gate.md`](warning-gate.md) (the heavy confirmation [ADR-010](../11-decisions/ADR-010-status-commit-model.md) reserves for destructive/terminal/inventory actions).
- **Step-back has the same boundary.** Reversing within `secured … process` is a step-back slide. The two reversals that cross an inventory boundary — **un-deploying** (`process → pending`) and **un-returning** (`returned → secured`) — are *not* slides; they confirm through the warning-gate, because they move stock ([`card.md`](card.md): "the only reversal that confirms is one that is itself destructive/terminal or mutates inventory").

One sentence: **the slide owns status; the button-plus-gate owns inventory.**

---

## Anatomy

| Part | Treatment | Token / source |
|---|---|---|
| **Track** | Full-width recessed channel, the prominent primary action; ≥**56pt** tall (operational floor), **60pt** in sunlight | `--radius-button` (12pt) [`spacing-grid.md`](../07-design-system/spacing-grid.md) §Corner radius; 56/60pt §Touch targets |
| **Track rest fill** | Neutral, recessed against the card surface (reads as an inset channel, not a raised button) | a surface fill + `--surface-stroke` hairline, per theme [`color.md`](../07-design-system/color.md) (exact rest fill finalized in the slice — see Open questions) |
| **Thumb** | The grabbable affordance; carries a directional chevron ([`iconography.md`](../07-design-system/iconography.md)) — supplemental, never load-bearing | `--accent` (the one affordance/identity color) [`color.md`](../07-design-system/color.md); radius nested below the track (`--radius-input`, 8pt) so the thumb sits *inside* the channel |
| **Label** | The next step in words — **"Slide to set Runner"** — centered in the track, **always fully legible, never truncated** | `--text-primary` [`color.md`](../07-design-system/color.md); the primary-action label treatment shared with [`button.md`](button.md); field-readability ramp [`typography.md`](../07-design-system/typography.md) |
| **Travel reveal** | As the thumb moves, the channel behind it fills with the **destination status's hue** — the operator drags the next state into being | `--status-{next}-*` [`color.md`](../07-design-system/color.md) §status palette (the solid banner fill in sunlight) |
| **Step-back control** | Secondary slide, mirror direction, below the track; smaller and lower-emphasis | same tokens, reduced prominence; placement owned by [`card.md`](card.md) |

The track takes `--radius-button` (12pt) so it reads as part of the card/button language, and the thumb nests one radius tighter (`--radius-input`, 8pt) so it sits *inside* the channel — the same nesting logic that makes a 6pt badge sit inside a 12pt card ([`spacing-grid.md`](../07-design-system/spacing-grid.md) §Corner radius). The slider mints **no token**; it is assembled entirely from the surface, accent, status, radius, and motion vocabularies the system already owns.

**The travel-reveal is why the slide *means* something.** The channel does not fill with a generic accent — it fills with the **color of the state you are committing to**, and at commit the status badge cross-fades to that exact hue ([`badge.md`](badge.md) / [`motion.md`](../07-design-system/motion.md)). Advancing to Cutting reveals the cutting hue; the badge lands on the cutting hue; the gesture and its confirmation are the same color. This keeps color tied to the lifecycle palette (never decorative) and gives the operator a visible answer to "what am I about to do."

---

## The advance slider — the canonical, safety-critical control

The forward slide is the spine of the operations workflow. Its mechanics are the doctrine:

- **Direct manipulation while dragging.** The thumb tracks the finger 1:1 — no animation, no easing, no lag (a timed transition during a drag fights the thumb). The drag itself consumes no motion token; it *is* the finger.
- **Commit only past a deliberate threshold.** The slide commits **only when the thumb is dragged past a commit threshold** well along the track (the far portion of travel) and released there. This threshold is the ghost-tap defense: a gloved brush or a raindrop moves the thumb a little, not across the threshold, so nothing commits. (The *rule* is fixed here; the *exact* threshold proportion is finalized in the vertical slice — see Open questions, and the precedent of the sheet's swipe threshold, [`sheet.md`](sheet.md) OQ2.)
- **Snap-back on release-short.** Released before the threshold, the thumb **snaps back to rest** over `--motion-micro` (100ms, `--ease-micro` — fast start, gentle settle; no bounce, no overshoot) and **nothing commits.** Only the light touch-start haptic fired; there is no commit haptic, no announcement, no state change. A half-slide is a non-event, by design.
- **Commit is immediate and writes the event.** Past the threshold, the new status is committed to the append-only event log the instant the gesture completes ([ADR-010](../11-decisions/ADR-010-status-commit-model.md), synthesis §1.1). No confirm dialog. The everyday advance never asks "Are you sure?" (Principle 6 as amended).
- **The confirmation is the badge cross-fade + a haptic, not the slider.** On commit, the status badge plays the `--motion-status` cross-fade to the destination hue (250ms, `--ease-status`) and a **medium-impact haptic** fires; a **light haptic** fired earlier on touch-start ([`motion.md`](../07-design-system/motion.md) §Haptics). The operator *feels* the commit without looking down — the haptic pair is the eyes-off confirmation channel. The slider's own job ends at commit; it does not animate the badge (that is the badge's, [`badge.md`](badge.md)).
- **The label is always fully legible.** The track's next-status label ("Slide to set Runner") is **never truncated**, including on the phone — the floor surface. A phone-view review caught a side-by-side layout squeezing it to "Slide to set Run…"; that is forbidden. The track owns the full width; the step-back control sits *below*, not beside, so it never steals label space ([`card.md`](card.md)).
- **No urgency theater on the thumb.** The thumb does not pulse, glow, or animate to attract attention at rest (Principle 3; [`motion.md`](../07-design-system/motion.md) anti-patterns). It is a calm, obvious affordance, not an alarm.

### Step-back — the always-present escape

Reversal is not a special interaction; it is the forward slide run the other way. The step-back control:

- Mirrors the advance — **thumb at the trailing (right) edge, travels leftward** — so the direction itself reads as "go back."
- Is **permanent, not a five-second window.** Reversibility is *spatial* (a control that is always there), not *temporal* (a timer that expires unseen) — the core of [ADR-010](../11-decisions/ADR-010-status-commit-model.md). A stray advance self-heals because the step-back is one gesture away in 5 seconds or 5 minutes.
- Plays the **same** `--motion-status` cross-fade on commit, toward the *previous* status's hue ([`motion.md`](../07-design-system/motion.md)).
- **Shows no confirmation pop-up** within the status-only domain — reversibility, not confirmation, handles regret. The *only* reversal that confirms is one that crosses the inventory boundary (un-deploy / un-return), which is a warning-gate, not this control (see The commit domain).
- Is **visually secondary** — smaller, lower-emphasis, below the advance track — so the canonical next step stays the loudest thing (Principle 4).

### Grouped shore points

The slide renders identically on a grouped card; only the *scope* of the commit differs, and that scope is the card's concern ([`card.md`](card.md), the v3.8.0/v3.9.0 phase-based split via `getGroupMembers()`): **pre-cutting**, the advance slide commits all group members at once; **in the cutting workflow and after**, it commits only that one piece. The live region announces the scope — "Advancing all 2 group members" ([`accessibility.md`](../07-design-system/accessibility.md) §Screen-reader scripts). How the group-vs-individual scope is *signposted on the slide affordance* is finalized with the grouped-shore workflow (Phase G; [`card.md`](card.md) OQ4).

---

## v3 grounding — tap buttons become one gesture

v3 had **no slider.** Status advanced by tapping a row of per-state buttons, each calling into the status machinery (`updateShoreStatus()`, with `markCutDone()`, `sendToRunner()`, `returnEquipment()` for the cutting-workflow steps). Every one of those taps could be fired by a ghost touch on a wet screen. v4 collapses the button row into the single slide gesture — **by what the action does, not by its v3 markup:**

| v3 tap action | v4 |
|---|---|
| "Strut Placed" / "Cutting" / "Send to Runner" / "Mark Cut Done" / "Secured" (status-only steps) | **Advance slider** |
| "Send Back" / any step-down within the status-only range | **Step-back slider** |
| "Assign Equipment" (deploy from pending) | **Button** → deploy ([`card.md`](card.md) §Pending); *not* a slider |
| "Return Equipment" (terminal, mutates inventory) | **Button** → [`warning-gate.md`](warning-gate.md); *not* a slider |

**What carries forward verbatim:** the **status-progression guard** (`STATUS_ORDER`, v3.9.0 — a slide never regresses a group-mate that has already advanced past the target) and the **phase-based group/individual split** (v3.8.0/v3.9.0). Only the *commit gesture* changes — tap → slide. **The v4 gap this closes:** a safety-critical state change that any stray contact could trigger. The slide makes the commit *deliberate*; the always-present step-back makes a mistake *self-healing*; the event log makes both *auditable*.

---

## Universal rules

1. **A slide commits; a tap does not.** Tapping a card opens/reads it ([`card.md`](card.md)); the slide is the only gesture that advances status. A wet-screen ghost tap must never change lifecycle state.
2. **Commit only past a deliberate threshold; release-short snaps back and commits nothing.** A half-slide is a non-event.
3. **Every slide has a focusable, labeled button equivalent.** Advance and Step-back exist as real buttons for keyboard and assistive tech — *assistive tech cannot slide* (see Accessibility floor). The gesture and the button commit the **same event**.
4. **The label is the next step, in words, never truncated** (Principle 9; Principle 4). "Slide to set Runner," fully legible on the phone.
5. **Status-only domain.** The slide advances status; it never deploys, returns, ends an operation, or mutates inventory — those are buttons/[`warning-gate.md`](warning-gate.md) (The commit domain; [ADR-010](../11-decisions/ADR-010-status-commit-model.md)).
6. **Reversibility, not confirmation.** The everyday advance shows no confirm; the step-back is permanent, not a timer ([ADR-010](../11-decisions/ADR-010-status-commit-model.md)). Only an inventory-crossing reversal confirms.
7. **One geometry, cited not minted.** `--radius-button` track, `--radius-input` thumb, `--accent` thumb, `--status-*` travel reveal, `--motion-micro` snap-back, the 56/60pt targets — system tokens, never a hand-rolled value.
8. **No urgency theater.** The thumb never pulses, glows, or ramps; the only motion is direct-manipulation drag, the snap-back, and the badge's commit cross-fade (Principle 3; [`motion.md`](../07-design-system/motion.md)).

---

## Surface adaptations

| Surface | Slider behavior |
|---|---|
| **Phone (team officer)** | The canonical control. Full-width advance track in the right-thumb reach zone, label never truncated; step-back below. The slide is the primary commit. The 56pt floor applies; the gloved/wet/sun case *is* the design case. |
| **Tablet (command post)** | Same slide. A tablet also affords **drag-for-priority-reorder** on the Cutting Station (a different drag, finalized Phase G; [`card.md`](card.md)); the status slide is unchanged. Room for fuller labels the phone keeps tight. |
| **Laptop (Toughbook)** | **Keyboard-first.** The focused card exposes "Advance to [next]" / "Step back to [prev]" as real buttons; Enter/Space commits. Pointer-drag works, but the keyboard path is first-class, not a fallback ([`accessibility.md`](../07-design-system/accessibility.md)). |
| **Broadcast TV** | **The slider does not render.** Broadcast is read-only; interactive primitives vanish there (the same rule that drops pickers, sheets, and modals — [`picker.md`](picker.md) / [`card.md`](card.md)). The status reads from the badge/left-border accent; there is no track, no thumb, no commit affordance on the wall display. |

**Sunlight** is the one escalation: the track grows to **60pt** ([`spacing-grid.md`](../07-design-system/spacing-grid.md) — the single target that exceeds the 56pt floor), the stroke thickens 1pt→2pt and the label weight bumps one step ([`color.md`](../07-design-system/color.md) / [`typography.md`](../07-design-system/typography.md)), and the travel reveal uses the **solid status banner fill** so the destination state survives glare before its hue is even read — the same sunlight escalation the status badge makes ([`badge.md`](badge.md)).

---

## Accessibility floor

The slider is the primitive that makes *assistive tech cannot slide* a load-bearing rule rather than a slogan — a VoiceOver, switch, or keyboard user cannot perform a drag, so the slide can **never** be the only path:

- **Every slider exposes a focusable, labeled button pair** — **"Advance to [next status]"** and **"Step back to [previous status]"** — always present in the DOM and the focus order, not a mode that toggles on. The gesture and the buttons commit the **same event**; neither is second-class ([`accessibility.md`](../07-design-system/accessibility.md) §Assistive tech cannot slide; [`card.md`](card.md) §Accessibility floor). The slide is the *enhancement* for the gloved thumb, layered over the buttons.
- **The reverse is permanent, so no one races a countdown they can't see.** Because the model is commit-immediately / always-reversible and not a timed-undo toast, an assistive-tech user is never timed out of the escape ([ADR-010](../11-decisions/ADR-010-status-commit-model.md)).
- **Commit announces once, politely, as a word.** A `aria-live="polite"` region speaks **"Shore point B-2, now Cutting"** on advance and the prior state on reversal — the status *label*, never the color (Principle 9). Grouped commits announce scope: "Advancing all 2 group members."
- **The drag is silent until it commits.** No announcement on touch-start, no per-pixel `aria-live` chatter mid-drag, never `aria-live="assertive"` for a routine commit ([`accessibility.md`](../07-design-system/accessibility.md) anti-patterns). One commit, one polite announcement.
- **Screen-reader script** (registered in [`accessibility.md`](../07-design-system/accessibility.md) §Screen-reader scripts, following the *Role · Name · State · Action-hint* grammar): the buttons read **"Button, Advance to Runner."** / **"Button, Step back to Cutting,"** and on activation the card announces its new state. This file follows that registry; it does not re-invent the grammar.
- **Touch targets:** track ≥56pt, 60pt in sunlight, with the 8pt inter-target dead zone between the advance track and the step-back control so a wet thumb cannot hit both ([`spacing-grid.md`](../07-design-system/spacing-grid.md)).
- **Reduced motion loses nothing.** The drag is direct manipulation (not suppressed — it tracks the finger); the snap-back and the badge cross-fade collapse to an **instant swap** under `prefers-reduced-motion` ([`motion.md`](../07-design-system/motion.md)). Because the state is also a word, the new status is fully legible the instant it commits.
- **Haptics are not motion and survive reduced-motion** ([`accessibility.md`](../07-design-system/accessibility.md)): the medium-impact commit haptic is the confirmation for an operator who cannot watch the screen, so it is never suppressed.

---

## Anti-patterns (do not do these)

- **Tap-to-advance.** The v3 mechanism, retired by [ADR-010](../11-decisions/ADR-010-status-commit-model.md): a ghost tap on a wet screen must not change safety-critical state. Tap opens; slide commits.
- **A slide with no focusable button equivalent.** A drag without an Advance/Step-back button locks out every keyboard and assistive-tech user — the cardinal sin this primitive exists to prevent.
- **A value-range slider** for measurement, capacity, or anything continuous. Measurement is exact 1/8″ keypad entry ([ADR-012](../11-decisions/ADR-012-measurement-precision-eighth-inch.md)); a drag cannot land on 45 5/8″.
- **A slide to deploy, return, end an operation, or otherwise mutate inventory.** Those are buttons → [`warning-gate.md`](warning-gate.md). The slide is status-only.
- **A confirm modal after a successful everyday advance.** Principle 6 / [ADR-010](../11-decisions/ADR-010-status-commit-model.md) — reversibility handles regret; "Are you sure?" does not belong in the lifecycle flow.
- **A timed "Undo (5s)" toast on a status slide.** Reversibility is the always-present step-back, not a countdown ([`motion.md`](../07-design-system/motion.md); reintroducing the timer reintroduces the field failure the ADR was written against). The toast is for confirmations/notifications only ([`toast.md`](toast.md)).
- **A truncated slide label** — "Slide to set Run…". The track owns full width; the step-back sits below it, never beside.
- **A commit on a half-slide.** Release-short snaps back and commits nothing; a low threshold defeats the ghost-tap defense.
- **A timed transition on the drag itself.** The thumb tracks the finger 1:1 — animating the drag fights the finger.
- **A pulsing, glowing, or bouncing thumb.** Urgency theater (Principle 3); the snap-back rides `--motion-micro` with no overshoot.
- **A minted radius, duration, or color for the slider.** Use the vocabulary; a new value is an ADR, not an inline call.
- **Announcing every pixel of the drag**, or `aria-live="assertive"` for a routine commit. One polite announcement, on commit only.

---

## Open questions for the gate / downstream

1. **Exact slide mechanics & commit threshold.** Full-card horizontal swipe vs. a dedicated slide-toggle control on the card, and the precise threshold proportion (where along the track the commit fires), are affordance geometry shared with [`card.md`](card.md) OQ1 and finalized in the **vertical slice (Phase H)** / Operations workflow (Phase G) — the precedent set by the sheet's swipe threshold ([`sheet.md`](sheet.md) OQ2). The *rules* (deliberate threshold, snap-back, same-event button equivalent) are fixed here; whichever control wins, the commit still plays `--motion-status` + a medium haptic.
2. **Track rest fill + thumb pixel geometry.** The exact recessed-channel fill per theme and the thumb's pixel size are visual geometry finalized in the slice against the [`color.md`](../07-design-system/color.md) surfaces — like the badge's dot diameter ([`badge.md`](badge.md) OQ1). The vocabulary (track = `--radius-button`, thumb = `--radius-input` + `--accent`, neutral recessed rest) is fixed here.
3. **Travel-reveal treatment.** Whether the destination-status hue fills the whole channel behind the thumb or only a leading edge, and at what opacity, is a gate read finalized in the slice. The *rule* (the reveal is the destination status's hue, matching the commit cross-fade) is fixed.
4. **Reversal authorization.** *Who* may step a card back (owner / admin / member / IC) is the authorization model surfaced by [ADR-010](../11-decisions/ADR-010-status-commit-model.md) consequences and resolved in the D7 auth/roles work — a dependency of the step-back control, not a primitive geometry question. Flagged so it is not silently assumed.
