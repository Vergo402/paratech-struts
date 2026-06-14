# ADR-028: Inter numerals + diagonal fractions

> Architecture Decision Record. Amends [typography.md §Fractions and §Typeface](../07-design-system/typography.md) — retires the hand-stacked digit-pair fraction and the `frac`-feature ban; partial, **numerals-only** override of the "Geist, not Inter" decision (synthesis conflict 2.6). Born from the Phase H slice re-drive ([#248](https://github.com/Vergo402/paratech-struts/issues/248)); tracked as [#317](https://github.com/Vergo402/paratech-struts/issues/317).

---

## Status

- [x] Proposed
- [x] Accepted *(Phase H re-drive — Alex, 2026-06-13)*

**Date:** 2026-06-13
**Author:** Claude Opus 4.8 (Phase H re-drive session)
**Reviewer(s):** Alex (picked the font + form by eye from a live comparison)

---

## Context

Fractions have **never looked good in any testing** (Alex). The v4 spec (typography.md §Fractions) rendered each fraction as a **hand-stacked digit pair** — numerator over a ruled bar over denominator (`.fr` spans), sized to `0.5em` of the host number (`0.36em` in the big shelf). The root cause was three compounding things, not one:

1. **The stacked digits were tiny.** Half (or a third) the integer's height — unreadable at arm's length and in sun. The same "illegibly tiny" failure as the v3 `45¹¹⁄₁₆` Unicode hack, rebuilt by hand.
2. **The value font was monospace.** Geist *Mono* forces fixed-pitch cells; a fraction sits awkwardly in them. Mono was only ever for column alignment — which `tabular-nums` gives on a proportional font, so mono bought nothing here.
3. **The spec banned the best option.** typography.md rejected the font's built-in `frac` feature citing denominator coverage. That objection is **moot**: FieldShore output is **eighths only** (½ ¼ ¾ ⅛ ⅜ ⅝ ⅞ — denominators 2/4/8 per [ADR-012](ADR-012-measurement-precision-eighth-inch.md)), which every quality font covers completely.

Alex compared five rendered options live (Geist-Mono-stacked, Geist-Sans-diagonal, Geist-Sans-bigger-stacked, IBM-Plex-diagonal, Inter-diagonal) and chose by eye.

---

## Decision

1. **Form = diagonal fractions.** Measurements render through the value font's OpenType `frac` feature (`font-variant-numeric: diagonal-fractions`, set on `.fs-meas`) — not hand-stacked spans. The renderer (`MeasurementValue`) emits **plain text** (`"48 1/2″"`, `"7′ 9 5/8″"`, `"−1 1/2″"`) and the font composes the glyph. The hand-stacked `Fraction` component and the `.fr` / `.fs-fr-display` CSS are **retired**.

2. **Value font = Inter, numerals only.** Inter becomes the measurement/load **value** font, carried on the existing `--font-mono` token (value changed Geist Mono → Inter; the token **name is kept** — all ~18 `--font-mono`/`--type-mono` sites are numeral sites, so a rename is needless churn). **Geist Sans stays the UI font** for all labels, headings, and body. This is the existing "label in Sans / value in its own font" split — only the value face moved.

3. **Partial override of "Geist, not Inter"** (synthesis conflict 2.6) — **for numerals only**. Geist remains the authored UI typeface; Inter is the authored *numeral* typeface.

4. **Keep `tabular-nums`** so column values still align on the integer's right edge — alignment comes from tabular figures, not from monospace.

---

## Rationale

- **Legibility outranks the typographer's instinct.** A measurement you can't read in sun is a failed measurement. Inter-diagonal read best at field distance in the live comparison; the stacked form failed the same way the Unicode hack did.
- **The coverage objection is gone.** Eighths-only output means `frac` is safe and consistent — there is no denominator the font can't compose.
- **The diagonal glyph scales for free.** It tracks `font-size`, so the 16px ledger row, the 28px promoted shelf, and the 34px readout all get a correctly-proportioned fraction with no per-size CSS — deleting the `0.726/r + 0.294` height re-derivation entirely.
- **The split is conventional, not a brand retreat.** "Value font ≠ UI font" is a standard data-display pattern; Geist still carries the product's voice everywhere a human reads words.

---

## Consequences

- **Dependencies:** `+@fontsource-variable/inter`, `−@fontsource-variable/geist-mono`. Net zero font count.
- **Token:** `--font-mono` value → Inter (name kept; comment records the value-font-role meaning). Mirrored byte-identical in `src/app/tokens.css` and `docs/v4-design/preview/tokens.css`.
- **Renderer simplified:** `MeasurementValue` returns a single text node; new `fractionText(n, d)` helper (leading space so `frac` doesn't fuse "481/2"). `Fraction` export removed from `ui/primitives`. Direct fraction-picker callers (`MeasurementInput`, `MeasurementEntryModal` eighths strips + slot value) emit plain `"n/d"`; their containers (`.fs-eighth`, `.fs-meas-slot-value`) get `diagonal-fractions`.
- **Text format changed:** measurement text is now spaced/slashed (`"48 1/2″"`), not concatenated (`"4812″"`). Unit tests assert the new form. **jsdom cannot render the glyph** — the look is verified **live**, not in tests.
- **Consumer requirement:** any value that mixes an integer and a fraction must be a **single text run** so the feature composes across it (the slot value was rebuilt from two JSX children into one string).
- **Resolves** the typography docket's "stacked vs diagonal house style" open call → **diagonal**.
- 356 unit/component tests pass; typecheck + lint clean. Live-verified on the slice (Quick Find readout, deduction ledger, shore-point shelf + detail line, cutting shelf) in light / dark / sunlight.
