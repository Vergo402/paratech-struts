# ADR-035: On a mouse the status-commit slide swaps for a tap-once button (the ADR-026 exception, by pointer type)

## Status

- [ ] Proposed
- [x] Accepted *(Alex's ruling — desktop slide "not working well at all", 2026-06-17)*

**Date:** 2026-06-17
**Author:** Claude (recording Alex's ruling)
**Reviewer(s):** Alex (ruled 2026-06-17)

**Amends:** [ADR-026](ADR-026-slide-only-status-commit.md) — scopes its "slide gesture only, no button twin" rule to **touch**. ADR-026 anticipated exactly this: *"If a real … operator need surfaces, the remedy is a new ADR … not a quiet button."*

---

## Context

[ADR-026](ADR-026-slide-only-status-commit.md) locked the status commit to the slide gesture alone — no visible button twin, no hidden AT/keyboard path — and rejected the button as "GOD AWFUL." That ruling was made in, and for, the **phone/field touch posture**: its whole case rests on (a) two affordances on one card doubling visual weight, and (b) the slide existing to defeat **wet-glove ghost-taps** — an accidental-activation risk that only exists for a finger on a touchscreen.

FieldShore now also runs on desktops and laptops (the command-post surface). Driving the slide with a **mouse**, Alex found it "not working well at all": a precise 1:1 drag-past-a-threshold is clumsy with a pointer, and the ghost-tap risk the slide defends against **does not exist** with a mouse — there is no wet glove, no palm, no stray touch. So on a mouse the slide is all cost and no benefit.

This is not the rejected scenario. ADR-026 rejected a button **beside** the slide on the **same** (touch) card — a *twin*, doubling the model and re-adding the ghost-tap surface. Here the button appears **instead of** the slide, **only** on a mouse device, where the slide is **absent**. There is one commit affordance per direction, exactly as ADR-026 demands — it is simply the right affordance for the input. The product already adapts a control to its surface this way: [ADR-032](ADR-032-surface-adaptive-pickers.md) swaps a bottom Sheet (phone) for an anchored dropdown (desktop) behind `useMediaQuery`.

---

## Decision

**The status-commit control is surface-adaptive by POINTER TYPE, not screen width:**

- **Touch (any width — phone AND field tablet):** the slide gesture, unchanged. ADR-026 holds in full. The wet-glove ghost-tap defense stays wherever a finger is the input.
- **Mouse / fine-pointer-with-hover (desktop, laptop):** the slide is replaced by a single **tap-once `Button`** committing the same event — `primary` on advance, `secondary` on the quieter step-back. No slide track is rendered.

**Detection is `useHasMouse()` = `(hover: hover) and (pointer: fine)`** — "the primary input is a mouse/trackpad." Width (`useIsDesktop`, ≥768px) is deliberately **not** used: a field tablet is wide but touch, and must keep the slide. The problem is the pointer, not the screen size (Alex's ruling, 2026-06-17). Test/SSR/jsdom (no `matchMedia`) defaults to **no mouse** → the slide branch, so every existing slide test stays on the gesture path.

**The button label is derived from the slide label** (`buttonLabelFrom`: "Slide to set Wood Shore Secured" → "Set Wood Shore Secured", "Slide back to Cutting Station" → "Back to Cutting Station"), so all call sites stay single-labelled. **Scope guard unchanged:** this is the status-commit control only; deploy / un-deploy / Remove & Return / End Operation remain their own buttons and modals on every surface.

---

## Rationale

- **The field test outranks the doctrine, again.** ADR-026 itself was a gate-drive override of a reviewer hypothesis; this is the same — Alex drove the desktop build and the mouse-slide failed there.
- **The ghost-tap rationale is input-specific.** The slide's reason for being is a wet-glove accidental commit. A mouse has none of that, so the safety case for the slide evaporates and only its clumsiness remains.
- **Not a twin.** One affordance per direction per surface. The "two affordances for one action" objection in ADR-026 simply does not apply when the slide is absent.
- **By pointer, not width — the safety property is preserved exactly where it matters.** A field touch-tablet (wide, coarse pointer) keeps the slide; only a genuine mouse device loses it.
- **Precedent exists.** ADR-032 already adapts a control to its surface behind a media query; this reuses the same `useMediaQuery` seam.

## Trade-off accepted (stated plainly)

On a mouse device the status transition is now a **single click** — there is no drag-deliberation step. This is acceptable because the ghost-tap class the deliberation defended against requires a touchscreen; a mouse click is already deliberate and targeted. The keyboard/AT operability gap ADR-026 recorded is **narrowed, not widened**: on a mouse device the button is fully keyboard- and AT-operable (it is a real `<button>`). The pure-touch AT gap from ADR-026 is unchanged and still stands for touch surfaces.

---

## Alternatives Considered

- **Keep slide-only everywhere (status quo).** Rejected by the desktop drive — clumsy with a mouse, no offsetting safety benefit.
- **Adapt by screen WIDTH (`useIsDesktop`, ≥768px), reusing ADR-032's exact signal.** Rejected — it would give a wide **field touch-tablet** a one-tap button and strip its ghost-tap protection. The safety property must follow the pointer, not the pixels.
- **Button BESIDE the slide on desktop (a true twin).** Rejected — that is the exact "GOD AWFUL" shape ADR-026 killed; doubling the model, re-adding a ghost-tappable surface.
- **A department/user "Native Controls" setting.** Rejected as premature — pointer type already answers the question without a setting to manage; revisit only if a touch-laptop hybrid posture proves it wrong.

---

## Consequences

- **Positive:** desktop/laptop operators get a fast, conventional one-tap commit, fully keyboard/AT-operable; the phone + field-tablet touch path is byte-identical (ADR-026 intact); the swap lives in one primitive (`Slider`), so no call site changes and it cannot be mis-instantiated.
- **Negative:** the button label is derived by stripping the "Slide to…/Slide back…" prefix — labels must keep that convention (a `ponytail:` note in `Slider.tsx` flags it; add an explicit prop if a label ever diverges).
- **Code:** `useHasMouse()` added to `useMediaQuery.ts`; `Slider` early-returns a `Button` branch when `useHasMouse()`; `buttonLabelFrom` exported + tested; mouse-branch tests stub `matchMedia`. No schema, event, or store change — the committed event is identical to the slide path.
- **Docs amended:** [ADR-026](ADR-026-slide-only-status-commit.md) Status note (scoped to touch); [`slider.md`](../03-primitives/slider.md) (mouse-branch rule).

---

## Related

- **ADRs:** [ADR-026](ADR-026-slide-only-status-commit.md) (the touch-only rule this scopes); [ADR-010](ADR-010-status-commit-model.md) (the commit model — unchanged; only the *affordance* adapts); [ADR-032](ADR-032-surface-adaptive-pickers.md) (the surface-adaptive precedent); ADR-016 (consequential actions stay buttons/modals — they always were).
- **Ruling record:** Alex, 2026-06-17 ("the sliding confirmations on the desktop version … need to be buttons. It's not working well at all").
- **Principles:** 4 (one canonical action — one affordance per direction per surface, preserved); 3 (calm in chaos).
