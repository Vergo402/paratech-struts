# ADR-026: Status commit is the slide gesture only — no button twin, no hidden AT path (accessibility exception)

## Status

- [ ] Proposed
- [x] Accepted *(Alex's final KB-5 ruling, Phase H gate kick-back [#248](https://github.com/Vergo402/paratech-struts/issues/248) — 2026-06-10, reaffirmed at fix-plan approval 2026-06-11)*

**Date:** 2026-06-11
**Author:** Claude (Phase H fix session S8) — recording Alex's ruling
**Reviewer(s):** Alex (ruled 2026-06-10 on #248; locked 2026-06-11)

> **Scope note (2026-06-17, [ADR-035](ADR-035-mouse-status-commit-button.md)):** this ruling governs the **touch** posture (the surface its rationale was built on — wet-glove ghost-taps). On a **mouse** device, where that risk does not exist and the drag is merely clumsy, the slide swaps for a single tap-once button *instead of* the track (not a twin — the slide is absent). The "no button twin" rule below stands in full for touch.

---

## Context

[ADR-010](ADR-010-status-commit-model.md) locked the status commit model: a deliberate slide gesture, always reversible from the card. The accessibility doctrine then built a load-bearing contract on top of it — *assistive tech cannot slide* ([`accessibility.md`](../07-design-system/accessibility.md)) — promising that **every slide carries a focusable, labeled Advance / Step-back button pair** committing the same event. The Phase G gate review escalated that promise to the phone for everyone (OQ #37, "near-must": four trench reviewers distrusted a precise drag as the primary gloved commit), and the Phase H slice shipped it structurally: the `Slider` primitive rendered a plain visible button below every track.

Alex drove the slice at the Phase H gate (2026-06-10) and **kicked it back** ([#248](https://github.com/Vergo402/paratech-struts/issues/248) KB-5): the slide + button doubling is **"GOD AWFUL"** — two affordances for one action doubled the visual weight of every Equipment Assigned card, muddied the one-gesture mental model, and reintroduced exactly the ghost-tappable commit surface the slide exists to prevent. His ruling, recorded on #248 and final: **slider gesture only, period.**

---

## Decision

**The slide gesture is the ONLY way to commit a status transition.** For the shore-point lifecycle advance and step-back:

- **No visible button twin** — the #37 plain-button equivalent is removed from the `Slider` primitive and never reintroduced per call site.
- **No hidden assistive-tech or keyboard commit path** — no screen-reader-only button, no keyboard Enter/Space commit, no switch-access target. A hidden twin would be the same doubled model wearing an accessibility fig leaf, and Alex ruled against the twin as such.
- **The disabled gate reason stays visible** — when a slide is gated (e.g. "Waiting on group — 2 of 3 still Pending Equipment"), the reason renders as a visible text line under the track (`.fs-slide-reason`), owned by the Slider itself. The track fades when disabled; the reason does not.
- **Transitions still announce** — the polite live region speaks every commit ("Shore point — now Strut Set."). Assistive tech can **observe** the lifecycle fully; it cannot **drive** it.

**Scope guard — status transitions only.** Deploy (Assign Equipment), un-deploy, return, End Operation, and every other consequential action remain ordinary buttons and modals with full keyboard/AT operability. Broadcast is read-only and unaffected. Nothing else in the product inherits this exception; *assistive tech cannot slide* remains the governing rule for every other gesture (sheets keep their Close button, the side-drawer keeps its tab, pickers keep Power Select).

---

## Rationale

- **The field test outranks the trench prediction.** OQ #37's button-beside-slide was a reviewer hypothesis; the gate drive is the product's actual acceptance test, and it failed there decisively.
- **Two affordances for one action is a worse control, not a safer one.** The button reintroduces the wet-screen ghost-tap commit the slide was chosen to eliminate (synthesis §1.5, ADR-010) — pairing them gives every card the vulnerability back.
- **One mental model:** slide forward, slide back, anytime. The doubled control made every Equipment Assigned card read as four actions.
- **A hidden AT-only path was considered and rejected by the ruling itself** — "no button twins" with an invisible twin is not the decision; it is the decision evaded.

## Trade-off accepted (stated plainly)

Status transitions are **operable by pointer drag only**. A VoiceOver, TalkBack, keyboard-only, or switch-access user **cannot advance or step back a shore point**. They can read every card, every status, every announcement, and operate every non-status action in the app. This fails WCAG 2.1 SC 2.1.1 (Keyboard) and 2.5.1 (Pointer Gestures) for this one control class, and may be flagged in government / Section 508 procurement reviews. Alex accepts this for v4.0: the operator population is firefighters performing a gloved, safety-consequential physical task; the commit gesture is deliberately physical. If a real AT operator need surfaces, the remedy is a **new ADR** (e.g. a department-level "Native Controls"-style setting), not a quiet button.

---

## Alternatives Considered

- **Visible button twin under every slide (the #37 / Phase G shape).** Rejected by the gate drive — visual doubling, model muddying, ghost-tap surface ("GOD AWFUL").
- **AT-only hidden buttons (the pre-#37 accessibility.md contract).** Rejected — same twin, hidden; contradicts the "no hidden path" ruling and creates an untested second commit path.
- **Keyboard-only commit on the focused card (laptop posture).** Rejected — a keyboard path *is* a hidden twin, and Enter/Space on a focused card is precisely the accidental-activation class the slide defends against.
- **Long-press to commit.** Rejected — invisible affordance, timer-based (the class of mechanism ADR-010 already retired), no better for AT.

---

## Consequences

- **Positive:** one commit affordance per direction; cards lose the button stack (less visual weight, shorter cards); the ghost-tap commit surface is gone; the primitive cannot be mis-instantiated per call site.
- **Negative:** the AT/keyboard operability gap above, accepted and recorded; any future procurement objection lands on this ADR.
- **Docs amended by this ADR (the S8 sweep):** [`accessibility.md`](../07-design-system/accessibility.md) (§Assistive tech cannot slide rewritten; script registry row replaced), [`slider.md`](../03-primitives/slider.md) (universal rule 3 + accessibility floor + anti-patterns), [`button.md`](../03-primitives/button.md) (Advance/Step-back control section retired), [`card.md`](../03-primitives/card.md) (accessibility floor + laptop surface row), [`20-operations.md`](../08-information-architecture/20-operations.md) (locked-rules checkbox + four-surface row + SR notes). [`99-open-questions.md`](../99-open-questions.md) **OQ #37 → Resolved** (overridden by this ruling, both directions: no phone buttons, no AT-only buttons).
- **Code:** `Slider` drops `buttonLabel` + the built-in Button; `disabledReason` renders as `.fs-slide-reason`; tests drive the real pointer path (`Slider.testkit.ts`).

---

## Related

- **ADRs:** [ADR-010](ADR-010-status-commit-model.md) (the commit model this completes — gesture mechanics now sole-path); ADR-016 (modal-vs-sheet — consequential actions stay buttons/modals).
- **Ruling record:** [#248](https://github.com/Vergo402/paratech-struts/issues/248) KB-5 + final rulings (2026-06-10).
- **Retired:** Phase G gate near-must #37 (both directions); the `accessibility.md` button-pair contract for the status slide.
- **Principles:** 4 (one canonical action — restored), 3 (calm in chaos — less control noise); Principle 9's *label* requirement still holds (the track label names the step in words).
