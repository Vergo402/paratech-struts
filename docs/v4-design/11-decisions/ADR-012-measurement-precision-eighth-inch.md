# ADR-012: Measurement precision — 1/8″ output, floor-rounded, specs kept exact

## Status

- [x] Proposed
- [ ] Accepted *(pending Phase E gate sign-off)*

**Date:** 2026-06-01
**Author:** Claude Opus 4.8 (Phase E session)
**Domain review:** `structural-collapse-sme` agent — doctrine verdict (Paratech O&M + USACE/FEMA shoring practice). Verdict: **approve, with a mandatory floor-rounding rule and an exact-spec rule.**
**Decided by:** Alex (chat, 2026-06-01) — *"go with 1/8th; 1/16ths was the fine carpentry skills coming out."*
**Reviewer(s):** Alex (Phase E gate — pending)

---

## Context

The RecommendationCard reports a strut/wood **effective length** — what the crew cuts to / sets the strut to — derived from `opening − Σ deductions`. Two problems surfaced while rendering the gate-trio card:

1. **The fraction was illegible.** Sixteenths have no precomposed Unicode glyph, so they were faked with superscript/subscript codepoints (`45¹¹⁄₁₆″`). At a gloved glance in sun this is unreadable — the exact failure a measurement display must not have. (Halves/quarters/eighths *do* have precomposed glyphs, which is why only the sixteenths broke.)

2. **The precision was never real to begin with.** The domain SME review found the app does **not** compute in sixteenths internally — it offers a 1/16″ *input* picker but rounds all internal results to one decimal place (`Math.round(x*10)/10` ≈ 0.1″), which doesn't even land on sixteenth marks (0.1″ = 1.6/16″). So the displayed sixteenth was already a fiction.

Field reality: the void is measured with a tape, in gloves, under stress — realistically to ~1/8″ — on un-machined dimensional lumber (saw kerf alone ≈ 1/8″). Reporting an answer to 1/16″ is **false precision**, and the deduction stack mixes clean wood halves (3.5″, 5.5″) with manufacturer-decimal plate heights (Channel Base = 3.4″, others 2.6″/1.8″/etc.), so the exact remainder rarely lands on any clean fraction anyway.

This ADR replaces the ragged 0.1″-decimal output with a clean, tape-readable **1/8″** value and codifies *how* it rounds — because the rounding direction is safety-critical and must not be left to `Math.round`.

---

## Decision

**All measurement *output* is reported to the nearest 1/8 inch, rounded DOWN (floored). Equipment spec dimensions stay exact in computation; only the final result is rounded, once.**

1. **Granularity = 1/8″ for displayed output** — effective length, wood cut length, and strut set target. 1/16″ output is retired as false precision.
2. **Round DOWN (floor to 1/8″) at the boundary — never round-to-nearest, never up.** When the exact value lands between two 1/8″ marks, take the shorter. *Short is absorbed by the loading wedge (1.5″ of designed travel) + strut thread; long is the hazard — it creates gaps, eccentric/point bearing, or a configuration the strut can't physically close.* Worst-case slack introduced is 0.125″, ≈8% of wedge travel — always coverable.
3. **Compute with exact spec dimensions; round only the final result.** Plate heights are **computed exact** (3.4″ stays 3.4″) — never pre-rounded before subtracting, which would inject ±1/16″ per term and accumulate to ±1/4″ over four terms, possibly unsafe-side. **Display:** plate deductions are shown as the nearest-1/8″ fraction (`≈3⅜″`) for column consistency and field-readability (Alex's call — the column should not mix `−3½″` wood with `−3.4″` decimal), **marked approximate** by a footnote with the exact 3.4″ retained for the math. This is the SME's explicit fraction-display fallback (its first preference was the bare decimal). Wood deductions (3½″, 5½″) are exact eighths — no marker. Either way the safety-critical **Effective** length is floored once, from exact inputs.
4. **Display fractions as legible digit pairs**, not super/subscript codepoints — one renderer for every denominator, sized to read at field distance. (Stacked vs. diagonal house style is specified in [`typography.md`](../07-design-system/typography.md); this ADR governs the *number*, not its glyph form.)

**Guardrails (carried with the decision):**
- The strut's adjustment range + 1.5″ wedge travel must cover the ≤0.125″ floor slack — asserted, and it always holds.
- Keep the existing **"even 1/8″ the strut can't extend further"** warning — under a floor-on-set rule it becomes the backstop, not less important.
- Keep the **liability disclaimer** on every result card. Tidy fractions read as *more* authoritative to a stressed crew, so the "planning aid, not engineering certification" line is non-negotiable.
- The 1/16″ *input* picker may stay (capture the crew's actual tape reading) or coarsen to 1/8″ — operator's choice; just never display *output* finer than 1/8″.

**Scope:** this is a v4 design decision recorded for the build. The corresponding **v3 app change** — replacing `Math.round`-to-nearest with an explicit floor at the cut-length / effective-length sites (app.js ~189, ~573, ~5295, ~6395) — is a separate implementation task (owner: `fullstack-engineer`, its own v3 release with SME sign-off), not part of this Phase E styleguide work.

---

## Rationale

- **No shoring load case in this app's scope warrants 1/16″.** Every shipped shore type (T-Shore, Double-T, 3-Post, rakers, long-span LongShore) is wedge- or thread-finished and compression-governed; the governing failure modes (Euler buckling at length, eccentric bearing) are insensitive to 1/16″ vs 1/8″ of pre-cut wood. If 1/16″ were the safety margin, the member would be unsafe regardless and doctrine says re-cut, not trust a tape. *(SME verdict Q1.)*
- **Floor is the safe direction, and it mirrors existing project doctrine.** "Cut to fit, finish with wedges" is standard FEMA US&R/USACE practice — the wedge exists specifically to take up under-length. Round-to-nearest can round a cut *up* (the dangerous way); the current `Math.round` is therefore a latent spec-deviation that this change fixes. Biasing down is the length-analogue of the app's existing conservative-floor load-table rule (v3.7.2). *(SME verdict Q2 — the key safety finding.)*
- **Rounding specs *in the math* accumulates unsafe error.** Exact-in, round-once-out caps total rounding at a single controlled 1/8″ step. Showing the plate as a nearest-1/8″ *display* fraction is acceptable **only** because the math keeps the exact 3.4″ and a footnote flags it approximate — the SME's explicit fraction-display fallback (its first preference was the bare decimal; Alex chose fractions for a consistent, readable column). *(SME verdict Q3.)*
- **Legibility is a safety property.** A measurement you can't read at arm's length in sun is a failed measurement. Eighths render cleanly (single-digit, legible digit pairs); the renderer drops the super/subscript hack entirely and is consistent across every denominator.
- **Honesty.** 1/8″ is *more* truthful than the prior 0.1″-decimal-shown-as-a-sixteenth, not a loss of real precision.

---

## Alternatives Considered

- **Keep 1/16″ input→output.** Rejected — false precision (internal math was 0.1″ decimal, never true sixteenths), and the sixteenth fraction is illegible at field distance.
- **Round to *nearest* 1/8″.** Rejected — can round a cut/set length *up*, the unsafe direction (gap, eccentric load, unreachable config). The whole point of the SME review was to forbid this.
- **Round each spec dimension to 1/8″ before subtracting.** Rejected — accumulates up to ±1/4″ over four deduction terms, possibly unsafe-side, and displays a figure (3⅜″) that contradicts the manufacturer O&M (3.4″).
- **Use precomposed Unicode fraction glyphs only.** Rejected — they exist only for halves/quarters/eighths, render smaller than the digit-pair form, and would be inconsistent the moment any other denominator appears. The digit-pair renderer is uniform and bigger.

---

## Consequences

- **Positive:** the cut-to answer is legible at a gloved glance; output is honest about real field resolution; rounding is always safe-side; the **math** uses exact spec dimensions (display fractions are flagged approximate, so nothing is silently altered); the deduction column reads as one consistent fraction column (value aligned, component name on a sub-line); fraction rendering loses all codepoint hacks and is uniform across denominators.
- **Cost / follow-on:** the v3 compute change (floor-rounding at the four cut/effective-length sites) is real work owned by `fullstack-engineer` — round-to-nearest → explicit floor — and must ship with the SME sign-off and the retained disclaimer/strut-extension-warning guardrails. Until then the v3 app still shows 0.1″ decimals.
- **Housekeeping:** the SME flagged that `reference_fema_ics_collapse.md` (cited in MEMORY.md as the FEMA shoring-doctrine anchor) is **missing from the repo**. The "cut-to-fit, wedge-to-finish" round-down doctrine here rests on general FEMA US&R/USACE practice from knowledge; that reference file should be created so the rule is traceable.
- **Reverses nothing in the color/type/card gate** — it refines what *number* the card shows and how it rounds; it touches the engine, not the visual system.

---

## References

- [`typography.md`](../07-design-system/typography.md) — fraction display spec (digit-pair renderer; stacked/diagonal house style).
- [`card.md`](../03-primitives/card.md) — RecommendationCard anatomy (effective length floored to 1/8″).
- Styleguide proof: `docs/v4-design/preview/` — RecommendationCard rendering both fraction modes (toolbar **Fraction** toggle).
- Domain basis: Paratech O&M Manual (continuous strut adjustment; base-plate Table 2-1 heights); FEMA US&R / USACE shoring "cut-to-fit, wedge-to-finish" practice. `WEDGE_DEDUCTION = 1.5″` (app.js:131).
