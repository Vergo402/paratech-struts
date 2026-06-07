# UI Primitive: The Warning Gate

> Phase E primitive spec — **the cascade's fourteenth file, added at the gate.** The **persistent safety disclosure**: a caveat that rides a result for as long as the result is on screen, and which the operator must *see* — and, for the deployable-but-out-of-envelope case, *acknowledge* — before acting. It is the one primitive that may **never** auto-dismiss. Authored at the depth of [`picker.md`](picker.md).
> Source: essay [`05-essays/06-domain-ux.md`](../05-essays/06-domain-ux.md) (the warning/disclaimer copy) + [`05-essays/11-scenario-stress.md`](../05-essays/11-scenario-stress.md) — **matrix [K-11](../06-decision-tracking-matrix.md): "Phase E primitive set includes WarningGate primitive distinct from Toast and Modal … one primitive, three uses (unrated zone, qty>4, liability disclaimer)"** (accepted) — and [`06-synthesis.md`](../06-synthesis.md) §1.10 / §3.4. **Governed by Principle 7** (*visible safety* — the safety-critical fact is never hidden, never dismissable) and **Principle 3** (*calm in chaos* — the danger is an accent and a word, never an alarm). Grounded in the **real v3 safety surfaces** — the LongShore **unrated-zone** acknowledgment (v3.5.2 NEW-2, the >16 ft deployable-with-acknowledgment band), the **qty>4 over-capacity** sentinel (v3.5.2 NEW-3), and the **liability disclaimer** on every strut result (v3.7.2) — the way [`card.md`](card.md) is grounded in `renderResults()`. The gate mints **no token of its own**: [`color.md`](../07-design-system/color.md) §The shore-point status palette already names `--danger` as *"the `WarningGate` unrated-zone / over-capacity disclosures,"* and every other value is owned by a sibling and cited. **Distinct from [`modal.md`](modal.md)** (the modal *blocks and dismisses* for a destructive/terminal confirmation; the gate *persists and annotates* a safe-to-show result) **and from [`toast.md`](toast.md)** (the toast is transient and non-safety; the gate is durable and safety-critical).

---

## Purpose

A warning gate is a **safety caveat bound to a result.** Quick Find returns a strut whose reach lands in the LongShore unrated zone; the deduction engine reports a load past the rated capacity at this length; every strut result carries the standing reminder that the number is a planning aid, not a stamped calculation. Each of these is a fact the operator must *see* before they trust the result — and, for the one that is still deployable, must *acknowledge* before they deploy. None of them may quietly disappear.

The gate exists because v3 already learned what happens when a safety message is treated like ordinary feedback. v3's earliest passes surfaced an unrated-zone warning as a toast — and a toast disappears on a timer, eyes-off, before a gloved operator on the rubble ever reads it. [ADR-010](../11-decisions/ADR-010-status-commit-model.md) retired the timed-undo toast for the same reason; the warning gate is the positive form of that lesson: **a safety-critical disclosure must be the one thing on the screen that cannot time out.** It is reached for rarely and it is loud only in persistence, never in motion — the danger reads as a muted `--danger` accent and an exact, doctrine-quotable sentence, never a flashing red banner (Principle 3).

This is the third member of the "consequence" family, and the three divide cleanly by *what the consequence demands of the operator*: the **toast** tells them something transient they may ignore; the **modal** stops them before a destructive act they must confirm; the **warning gate** annotates a result they may act on, with a caveat that must ride along.

---

## The boundary — what is, and is not, a warning gate

The gate is the most-confused safety surface in the system precisely because v3 (and the early cascade) conflated it with the modal — so its boundaries are rules, not judgment calls, the same discipline [`modal.md`](modal.md) / [`sheet.md`](sheet.md) and [`toast.md`](toast.md) impose on theirs. A warning gate sits at the intersection of *safety-critical* and *bound to a still-valid result*; the moment a message is one but not both, it belongs to a different primitive.

| It is a **warning gate** when… | It is **not** a warning gate — it is… |
|---|---|
| It discloses a **safety caveat on a result the operator may still read or act on** (unrated zone, over-capacity, the disclaimer) | …a [**modal**](modal.md) when the operator must **stop and confirm a destructive / terminal / inventory-mutating action** before it fires (End Operation, Return Equipment, un-deploy, delete) |
| It must **persist** as long as the result is on screen — it cannot auto-dismiss | …a [**toast**](toast.md) when the message is **transient and non-safety** — an action registered, a sync event |
| It is the **standing condition of a result** (this strut, at this length, under this disclaimer) | …**inline field validation** ([`input.md`](input.md) `aria-invalid`) when it is a **data-entry error** ("enter a length first") |
| Its danger is **information** — *what is true about this option* | …the **hazard badge** ([`card.md`](card.md) / [`badge.md`](badge.md)) when it flags an **area condition**, not a result's rating |

> **A warning gate is safety-critical and bound to a result. If it must be confirmed before a destructive act, it is a modal; if it may auto-dismiss, it is a toast.**

Two boundaries are load-bearing enough to state in full:

- **Warning gate vs. the modal — the disambiguation this primitive was added to settle.** The modal is the **heavy confirmation for a destructive / terminal / inventory-mutating action**: it *blocks*, it has a Cancel that is the safe default, and dismissing it commits nothing ([`modal.md`](modal.md); [ADR-010](../11-decisions/ADR-010-status-commit-model.md) — *"heavy confirmation … only for destructive/terminal actions"*). The warning gate is the opposite shape: it **does not block** the result from rendering, it **cannot be dismissed away**, and it annotates an option that is **safe enough to show** (and often still to deploy). End Operation is a modal; a result whose reach is in the unrated zone is a warning gate. Earlier cascade drafts routed destructive confirmations through "the warning-gate" — that was the conflation; destructive confirmation is the **modal's** job, and the gate is only the three safety disclosures of matrix K-11.
- **Warning gate vs. the toast — the persistence boundary (Principle 7).** A toast disappears; a safety disclosure must not. *A safety-critical message must never be able to auto-dismiss.* This is absolute: the unrated-zone disclosure, the over-capacity sentinel, and the liability disclaimer each ride the result card for as long as the result is on screen, and the disclaimer never softens its words ([`voice-and-tone.md`](../07-design-system/voice-and-tone.md): *"Planning aid, not an engineering certification … this line is non-negotiable"*).

---

## The three uses — one primitive, three jobs

Per matrix K-11, the gate is **one primitive with three uses**, separated by *how much the caveat constrains the action* — not by appearance. All three render the same way (the anatomy below); they differ only in whether the result remains deployable and whether an acknowledgment is required.

| Use | The caveat | Result still deployable? | Acknowledgment | Copy ([`voice-and-tone.md`](../07-design-system/voice-and-tone.md)) |
|---|---|---|---|---|
| **Unrated zone** | The reach lands outside the manufacturer's rated envelope (LongShore above 16 ft / 192″) | **Yes — with explicit acknowledgment** | **Required before deploy** — a focusable, labeled control the operator must engage | *"LongShore above 16 ft (192″) is not rated by Paratech — rescue engineering consultation required."* |
| **Over capacity** | The load exceeds rated capacity at this length (the qty>4 / 4:1 safety-factor sentinel) | **No** — this strut cannot carry this opening | n/a — the deploy path is closed, the gate explains why | *"Load exceeds rated capacity at the 4:1 safety factor — this strut cannot be deployed for this opening."* |
| **Liability disclaimer** | Every strut result is a planning aid, not a stamped engineering calculation | n/a — standing on all results | n/a — passive, permanent | *"Planning aid, not an engineering certification."* |

The three are deliberately **not** three components — collapsing them into one primitive is the K-11 ruling, and it is why the gate has one anatomy and one set of rules. What varies is the *interaction*: the **unrated zone** is the only one that gates an action (it must be acknowledged before the deploy button is live); **over capacity** removes the deploy path and stands as the explanation; the **disclaimer** is the always-present footnote that the first two escalate from.

> **The unrated-zone acknowledgment is the gate's defining interaction.** v3 made the >16 ft band *deployable, but only after explicit team acknowledgment* (v3.5.2 NEW-2). v4 keeps that exactly: the result renders, the warning gate rides it, and the deploy action stays **disabled until the operator engages the acknowledgment** — at which point deploy becomes available and the disclosure remains visible. The acknowledgment is a real, labeled control (its exact affordance — checkbox vs. a deliberate confirm — is finalized in the slice; see Open questions); it is **never** a slide (the slide is status-only, [`slider.md`](slider.md)) and **never** a modal that dismisses away (the disclosure must stay on the result, not vanish with an "OK").

---

## Anatomy

| Property | Value | Token / source |
|---|---|---|
| Host | **Bound to the result** — a band on the `RecommendationCard`, not a free-floating overlay | [`card.md`](card.md) §`RecommendationCard` (placement is the card's; the disclosure content is this primitive's) |
| Layout | A left **`--danger` rule** + the **Warning** glyph + the caveat sentence; the disclaimer is a quieter footnote line at the card foot | `--danger` [`color.md`](../07-design-system/color.md); **Warning** glyph [`iconography.md`](../07-design-system/iconography.md) §Status ("Off-queue / unrated-zone warning") |
| Danger treatment | **`--danger` as an accent — the rule and the glyph — never a full red fill** (Principle 3; the same restraint [`toast.md`](toast.md)'s Error variant keeps); the *word* always carries the meaning (Principle 9) | `--danger` [`color.md`](../07-design-system/color.md) ("`--danger` is feedback, not a status") |
| Background | The card surface — the gate is part of the card, not a scrimmed overlay | `--surface-card` [`color.md`](../07-design-system/color.md) |
| Scrim | **None.** A warning gate does not dim the screen — it is information bound to a result, not a blocking surface | — (the absence is the spec; a scrim is the [`modal.md`](modal.md)'s) |
| Elevation | **No drop shadow** — cast shadows are reserved for the scrimmed overlay surfaces (sheet, modal); the gate is inline, like a [badge](badge.md) | [`spacing-grid.md`](../07-design-system/spacing-grid.md) §Elevation; [`color.md`](../07-design-system/color.md) §Strokes & elevation |
| Caveat text | The exact doctrine sentence, **never truncated, never softened** | `--type-body` [`typography.md`](../07-design-system/typography.md); numbers tabular ([ADR-012](../11-decisions/ADR-012-measurement-precision-eighth-inch.md)) |
| Acknowledgment (unrated zone only) | A focusable, labeled control ≥ **56pt** operational; the deploy button stays disabled until it is engaged, with its reason adjacent | [`spacing-grid.md`](../07-design-system/spacing-grid.md) §Touch targets; [`button.md`](button.md) (disabled-with-reason) / [`input.md`](input.md) (the control form, finalized in the slice) |
| Internal padding | **12pt / 16pt** — the card-band rhythm | `--space-3` / `--space-4` [`spacing-grid.md`](../07-design-system/spacing-grid.md) §Spacing tokens |

The gate is deliberately the inverse of the [modal](modal.md) on the two axes that matter: it carries **no scrim** (it must not block the result) and **no drop shadow** (it is not an overlay — it is a band the card owns). It separates from the rest of the result by its `--danger` rule and glyph, not by floating above the content. It mints nothing; it is assembled entirely from the danger-feedback, surface, type, spacing, and icon vocabularies the system already owns.

---

## Persistence & acknowledgment — the rules that are the whole point

This is the gate's equivalent of the modal's "Confirmation doctrine" and the toast's "Not the undo": the rule the primitive exists to hold, recorded so it cannot regress.

- **It cannot auto-dismiss.** There is no timer, no dwell, no swipe-to-clear on the caveat itself. It persists as long as the result that carries it is on screen (Principle 7). The instant a safety disclosure can disappear on its own, it is a toast — and a safety toast is the field failure this primitive was added to prevent.
- **It is never hidden behind a disclosure.** The caveat is inline on the result, never collapsed into an expander or a "details" tap (the same rule [`card.md`](card.md) holds for the deduction ledger — *"visible safety," Principle 7*). An operator must not have to open anything to learn a result is out of envelope.
- **The disclaimer is permanent and unsoftened.** "Planning aid, not an engineering certification" rides every strut result and never rewords toward reassurance — tidy 1/8″ fractions read as more authoritative than they are, and the disclaimer is the counterweight ([`voice-and-tone.md`](../07-design-system/voice-and-tone.md)).
- **Acknowledgment gates the action, not the disclosure.** For the unrated zone, engaging the acknowledgment **unlocks deploy** but **does not clear the warning** — the disclosure stays visible on the deployed result. Acknowledging means "I have seen this," not "dismiss this."
- **Over capacity closes the deploy path.** When the load exceeds rating, the gate is the *explanation* for a deploy action that is disabled outright — there is no acknowledgment that re-enables it; the operator must choose a different strut, quantity, or opening.

---

## v3 grounding — three real safety surfaces, one primitive

v4 *narrows and unifies* rather than invents — all three uses ship in v3 today, each handled at its own call site with no shared treatment:

- **The unrated zone** is v3.5.2 **NEW-2**: LongShore lengths above 16 ft surface a *deployable "unrated zone" warning that requires explicit team acknowledgment*; lengths Paratech does not rate at all (AcmeThread / LockStroke above 12 ft) surface a *no-deployment-path* empty state instead ([`voice-and-tone.md`](../07-design-system/voice-and-tone.md) §Empty states). v4 keeps both, and routes the deployable-with-acknowledgment case through this primitive.
- **Over capacity** is v3.5.2 **NEW-3**: the qty>4 sentinel that *surfaces an explicit informational warning when load exceeds 4-strut capacity at the given length* instead of silently rejecting. v4 keeps the explicit surface and gives it the gate's persistent treatment.
- **The liability disclaimer** is v3.7.2: capacity figures are *planning aids, not engineering certifications*, shown on strut results. v4 keeps it on every result, verbatim and unsoftened.

**The v4 gap this closes:** the three surfaces shared a *job* (a safety caveat that must not be missed) but not a *treatment* — and an early cascade pass let "warning-gate" drift into meaning "any confirmation," colliding with the [modal](modal.md). v4 fixes both: one primitive for the three disclosures, with a boundary that hands every destructive/terminal/inventory **confirmation** back to the modal where it belongs.

---

## Universal rules

1. **A warning gate is safety-critical and bound to a result, and it never auto-dismisses** (Principle 7). A caveat that can time out is a [toast](toast.md), and a safety toast is forbidden.
2. **Destructive confirmation is the modal's, not the gate's.** End Operation, Return Equipment, un-deploy, delete — those *stop and confirm* through a [modal](modal.md) ([ADR-010](../11-decisions/ADR-010-status-commit-model.md)). The gate only *discloses* the three K-11 caveats.
3. **The danger is an accent and a word, never an alarm** (Principle 3 / Principle 9). A `--danger` rule and the Warning glyph plus the exact sentence — never a full red fill, never a pulse, never an exclamation mark ([`voice-and-tone.md`](../07-design-system/voice-and-tone.md)).
4. **The caveat is inline, never behind a disclosure** (Principle 7). Visible safety means the operator reads it without opening anything.
5. **The disclaimer never softens.** "Planning aid, not an engineering certification," verbatim, on every result.
6. **Acknowledgment unlocks the action and keeps the disclosure.** The unrated-zone acknowledgment is a real, focusable, labeled control that enables deploy; it does not clear the warning.
7. **The acknowledgment is never a slide and never a dismissing modal.** The slide is status-only ([`slider.md`](slider.md)); a modal would let the disclosure vanish on "OK" (rule 1).
8. **Mints no token.** `--danger` accent, `--surface-card`, the Warning glyph, `--type-body`, `--space-3/4` — system vocabulary, never a hand-rolled value.

---

## Surface adaptations

| Surface | Warning-gate behavior |
|---|---|
| **Phone (team officer)** | The canonical case — the gloved operator reading a Quick Find result in the sun. The `--danger` rule and Warning glyph survive glare; the caveat never truncates; the unrated-zone acknowledgment is a 56pt control. |
| **Tablet (command post)** | Same band, inline on the result card in the board. Room for the full caveat without truncation; no new vocabulary. |
| **Laptop (Toughbook)** | **Keyboard-first** — the acknowledgment control is in the tab order and the disabled deploy states its reason adjacently; Esc does nothing to the disclosure (it is not dismissable). |
| **Sunlight** | The `--danger` rule thickens 1pt→2pt with the theme and the glyph uses `--icon-stroke-heavy`; the caveat weight bumps one step ([`color.md`](../07-design-system/color.md) / [`typography.md`](../07-design-system/typography.md) / [`iconography.md`](../07-design-system/iconography.md)). It does **not** escalate to a full-bleed banner — a safety disclosure that became an alarm is the doctrine's anti-pattern (Principle 3). |
| **Broadcast TV** | The result cards a gate rides (Quick Find / deploy) are interactive and **do not render on broadcast** ([`picker.md`](picker.md) / [`card.md`](card.md)) — so the gate does not appear there either. Whether a *deployed* shore point that was acknowledged in the unrated zone should surface that flag on the board is an Open question. |

---

## Accessibility floor

- **The disclosure is durable content, not a fleeting announcement.** Unlike the [toast](toast.md)'s polite, announce-once live region, the gate is **persistent text in the document** — a screen-reader user can navigate back to it for as long as the result is present (it is the *source of record* for the caveat, not an awareness blip). It reads as its level + what it flags, the **severity-badge grammar** consolidated in [`accessibility.md`](../07-design-system/accessibility.md): *"Unrated zone — LongShore above 16 feet is not rated by Paratech; rescue engineering consultation required."* Numbers speak as the field says them, tabular ([ADR-012](../11-decisions/ADR-012-measurement-precision-eighth-inch.md)).
- **Never color-alone** (Principle 9). The `--danger` rule is reinforced by the Warning glyph **and** the caveat word; a colorblind or sun-blind operator reads the sentence, not the hue.
- **The acknowledgment is a first-class control.** For the unrated zone it is a focusable, labeled control — *"Checkbox, Acknowledge unrated zone, unchecked. Double tap to acknowledge."* — and the deploy button it gates announces as disabled-with-reason until it is engaged ([`button.md`](button.md); [`accessibility.md`](../07-design-system/accessibility.md) §Screen-reader scripts).
- **Reduced motion loses nothing.** The gate does not animate in (it is a static state of the result), so there is nothing to suppress; the caveat is text and legible the instant the result renders.
- **Screen-reader script** registered in [`accessibility.md`](../07-design-system/accessibility.md) §Screen-reader scripts, following the *Role · Name · State · Action-hint* grammar.

---

## Anti-patterns (do not do these)

- **A safety disclosure in a toast** (or anything that auto-dismisses). The exact failure this primitive exists to prevent — a caveat that times out, eyes-off, before it is read (Principle 7; [`toast.md`](toast.md) rule 4).
- **A modal for the disclosure.** A modal blocks and then *dismisses* — the caveat must stay on the result, not vanish on "OK." (The modal is for the destructive *confirmation*, a different job.)
- **Routing a destructive / terminal / inventory confirmation "through the warning gate."** End Operation, Return Equipment, un-deploy — those are [modals](modal.md) ([ADR-010](../11-decisions/ADR-010-status-commit-model.md)). The gate only discloses the three K-11 caveats; conflating the two is the bug this file was added to fix.
- **A full red fill, a pulse, or an exclamation mark.** The danger is a `--danger` accent plus the word (Principle 3 / Principle 9; [`voice-and-tone.md`](../07-design-system/voice-and-tone.md)).
- **Burying the caveat behind a "details" disclosure.** It is inline, always (Principle 7).
- **Softening the disclaimer**, or dropping it from any result. "Planning aid, not an engineering certification," verbatim, everywhere.
- **An acknowledgment that clears the warning.** Acknowledging unlocks deploy; the disclosure persists on the deployed result.
- **A slide as the acknowledgment.** The slide is status-only ([`slider.md`](slider.md)); a safety acknowledgment is a deliberate, labeled control.

---

## Open questions for the gate / downstream

1. **The exact acknowledgment affordance.** Whether the unrated-zone acknowledgment is a checkbox, a labeled confirm button, or a typed/deliberate confirm is affordance geometry finalized in the **vertical slice (Phase H)** against the deploy flow — the same way [`slider.md`](slider.md) and [`button.md`](button.md) defer pixel geometry. The *rules* (it gates deploy, it is focusable and labeled, it never clears the disclosure, it is never a slide) are fixed here.
2. **Deployed-result persistence + broadcast.** Whether an unrated-zone (or over-capacity-override, if ever permitted) caveat that was acknowledged at deploy should ride the `ShorePointCard` cradle-to-grave — and therefore surface on the broadcast board — is an Operations-IA decision ([`card.md`](card.md) OQ; Phase F/G). This primitive owns the *result* disclosure; whether it follows the deployed strut is the workflow's call.
3. **Over-capacity: hidden vs. shown-disabled.** Whether an over-capacity strut is shown with a closed deploy path and the gate explaining why, or filtered out with the reason surfaced in the [empty state](empty-state.md), is an IA call per screen (Phase F) — the [`empty-state.md`](empty-state.md) "settle-before-empty / defer to the warning card" boundary already anticipates this. The *copy* and the *persistence rule* are fixed here.
4. **Who may acknowledge.** The authorization model for acknowledging an unrated-zone deploy (any member, or an IC/owner) is the D7 auth work, the same dependency [`modal.md`](modal.md) and [`slider.md`](slider.md) name; the gate renders whatever that model permits.
