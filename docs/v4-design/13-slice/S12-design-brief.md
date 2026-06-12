# S12 Design Brief — Shore-Point Card Treatments

> **Audience: Claude Design** (web, reads this repo on the `v4-redesign` branch) — and any
> design session sketching card treatments ahead of the S12 build. Authored at S11
> close-out (2026-06-11) per the kick-back fix plan §S12 "Claude Design bridge."
>
> **Ground rules (locked 2026-06-11):** sketches are exploration only — **never the source
> of truth**. Decisions and finalization happen in-code, in the S12 Claude Code session,
> on the real app. Wanted back from a sketch round: exported screens/images + short notes
> on which direction(s) to build as `/gallery` treatments for Alex to pick from.

> **Outcome (2026-06-11) — S12 landed.** The Claude Design round returned a **full handoff**
> (not just sketches), archived at [`./S12-handoff/`](./S12-handoff/) as exploration reference.
> Per the locked ground rules it was **finalized in-code** on the real app — commits
> `5912d7e..9faff63`, [#316](https://github.com/Vergo402/paratech-struts/issues/316) — and where
> the handoff and the implementation diverge, the **code is the truth** (the handoff is archived
> reference). The shipped direction is **Treatment C** (status-tinted value shelf, not a full-surface
> tint). Decisions are recorded in [ADR-011 Addendum 2](../11-decisions/ADR-011-color-token-system.md)
> and the updated primitives + system docs ([`card.md`](../03-primitives/card.md),
> [`slider.md`](../03-primitives/slider.md), [`color.md`](../07-design-system/color.md),
> [`typography.md`](../07-design-system/typography.md), [`logo-and-mark.md`](../07-design-system/logo-and-mark.md),
> [`20-operations.md`](../08-information-architecture/20-operations.md)). **Pending: Alex's re-drive
> verdict on [#248](https://github.com/Vergo402/paratech-struts/issues/248).**

---

## The problem (kick-back KB-6, [#248](https://github.com/Vergo402/paratech-struts/issues/248) → [#316](https://github.com/Vergo402/paratech-struts/issues/316))

Alex's gate verdict on the v4 slice: **cards read bland next to v3 — the important data
does not stand out.** The shore-point card is the unit firefighters scan all day; the
measurement, the status, and "what do I do next" must pop at arm's length in sun, with
gloves, on a wet screen.

## The treatment spec (fix plan §S12)

Produce **2–3 treatments** of the same card content:

- **v3 reference** — the existing v3 card as the baseline to beat (screenshots in
  `13-slice/screenshots/`, or run the v3 app at the repo root).
- **Treatment A — within doctrine:** measurement promoted to headline mono-bold,
  status-hue emphasis per [`card.md`](../03-primitives/card.md)'s cut-table precedent,
  heavier identity. Must not mint tokens or break the one-accent rule
  ([ADR-011](../11-decisions/ADR-011-color-token-system.md)).
- **Treatment B — pushes color:** status-tinted card surface/border. **Explicitly flagged:
  shipping a B-class winner requires an ADR-011 amendment** — sketch it anyway; the
  amendment is a recorded decision, not a blocker.
- **Optional middle C** between A and B.

Alex picks (phone + desktop look). Winner applies to **both**
[`ShorePointCard.tsx`](../../src/ui/operations/ShorePointCard.tsx) and
[`RecommendationCard.tsx`](../../src/ui/operations/RecommendationCard.tsx).

## Design requirements riding S12 (docket snapshot, 2026-06-11 post-S11)

Snapshot of [`98-design-docket.md`](../98-design-docket.md) §Riding S12 — the live table
wins if they diverge:

1. **KB-6 card hierarchy** (the headline item, spec above).
2. **Over-capacity Deploy card must be visually unmistakable**
   ([99-OQ #40](../99-open-questions.md)) — same treatment class. Today it's the
   `is-gated` danger accent + closed Deploy; the treatments should make the gated card
   impossible to mistake for a deployable one. Principle 3 still binds: an accent and a
   word, never a full red fill.
3. **Sunlight theme status stripe is a placeholder** (gate-script gaps register #11) — the
   stripe color mapping (`--sp-text` remap) was never designed for sunlight. Treatments
   must show the card in **all four themes** (dark default · light · sunlight · broadcast).
4. **Grouped cards: rotate through the stacked set** (Alex, ad hoc) — a grouped shore
   (e.g. one 3-Post = 3 cards badged 1/3·2/3·3/3) could render as one stacked card that
   rotates/pages through members instead of three siblings. Sketch at least one take.
5. **Slide-track label clips behind the handle at narrow lane columns** (~328px tablet
   2-col, S11 verification) — if a treatment touches the slide row, give the label
   clearance at 328px.

## Real rendering contexts (post-S11 — sketch at these widths)

| Surface | Card column width | Notes |
|---|---|---|
| Phone (390pt) | ~358px, single column | The floor. Bottom nav present. |
| Tablet (768pt) | **~328px**, 2-col board | Narrowest case — labels must survive here. |
| Laptop (1280pt) | ~373px, 3-col board | G-15 summary bar above the board. |
| Laptop (1440pt) | ~437px, 3-col board | |

## Anatomy + constraints (cite, don't re-invent)

- **Card primitive:** [`card.md`](../03-primitives/card.md) — 60px floor; 4pt status
  stripe with 16pt tap zone; slide-to-advance rows (gesture only, ADR-026 — no buttons).
- **Color:** [`color.md`](../07-design-system/color.md) + ADR-011 — one gold accent;
  per-status hue tokens via the `is-{status}` hooks (`--sp-text`/`--sp-bg`,
  `src/ui/primitives/primitives.css`); live values in `src/app/tokens.css`.
- **Type:** [`typography.md`](../07-design-system/typography.md) — measurement is mono
  with stacked ⅛″ digit-pair fractions (see `.fr` in the live CSS).
- **Spacing:** [`spacing-grid.md`](../07-design-system/spacing-grid.md) — internal card
  padding never changes across surfaces.
- **Live styles:** `src/ui/operations/operations.css` (`.fs-spc*` shore-point card,
  `.fs-rec*` recommendation card).
- **WCAG AA** in all four themes (`07-design-system/wcag-contrast.mjs` is the checker).

## Card content to carry (both cards, all states)

ShorePointCard: identity (Division · building · area), **measurement** (the big number),
shore type, group badge (n/total), status badge, deployed strut (model + source
apparatus, cradle-to-grave), pending reason line, slide rows (advance + step-back).
RecommendationCard: COLOR—SYSTEM header, model + fit range, extensions, the rigid
deduction ledger (signed −3½″ values), promoted Effective length, capacity (demoted),
disclaimer WarningGate, gated states (unrated ack · over-capacity closed).
