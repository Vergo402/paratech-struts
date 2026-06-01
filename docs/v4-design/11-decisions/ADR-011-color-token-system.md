# ADR-011: v4 color token system — contrast corrections + status-palette reconciliation

## Status

- [x] Proposed
- [ ] Accepted *(pending Phase E gate sign-off)*

**Date:** 2026-05-31
**Author:** Claude Opus 4.8 (Phase E session) + reproducible WCAG verification ([`wcag-contrast.mjs`](../07-design-system/wcag-contrast.mjs))
**Reviewer(s):** Alex (Phase E gate — pending)

---

## Context

[`color.md`](../07-design-system/color.md) had to turn essay [`02-visual-language.md`](../05-essays/02-visual-language.md)'s proposed palette into the committed v4 token system. The essay specified hexes and **claimed** WCAG contrast ratios, but those claims were never independently computed, and the essay predates Alex's PR #282 review. A reproducible verification pass (the WCAG 2.1 relative-luminance formula, scripted) found:

1. **Four genuine AA failures** where the essay's hex doesn't meet its use class — two of them failing even the 3.0 large-text floor / the theme's own stated contract.
2. **Several "wrong-but-safe" claims** — tokens that pass but whose *documented* ratio is incorrect (e.g., dark accent claimed 4.5:1, actually 6.96:1). Synthesis §4 rec 5 requires the token file to document the ratio; transcribing the essay's numbers would ship wrong ones.
3. An **incomplete and semantically inverted status palette.** The essay gave six status tokens (omitting `strutset` and `returned`, both real lifecycle states) and assigned **green to `runner`** and **blue to `secured`** — inverting the near-universal "green = safe/complete/locked" reading. It also claimed to "carry forward" the v3.5.2-audited cutting/runner hexes while specifying materially different ones.

color.md cannot ship on unverified, incomplete, or semantically-inverted color, so the token set had to be authored as a verified system rather than transcribed.

---

## Decision

Adopt the single coherent, AA-verified v4 color token system specified in [`color.md`](../07-design-system/color.md):

1. **Four contrast corrections:** light `--accent` `#B8860B → #8C6700` (3.01 → 4.79); dark `--text-tertiary` `#6B6A67 → #8A8A86` (2.70 → 4.21); light status `pending` `#6B7280 → #4B5563` (4.39 → 6.87); sunlight `--accent` `#8B6500 → #6E5000` (5.30 → 7.47, clearing sunlight's 7:1 contract).
2. **Status-palette reconciliation:** keep the essay's muted/professional *execution* and AA rigor, **restore green = `secured`** (field-correct), **add the two missing states** — `strutset` (violet, distinct from active-blue) and `returned` (warm neutral, distinct from pending-slate) — **retire the v3.5.2 hexes**, and map to the renamed enum (`strutplaced → strutset`, display "Strut Set"; per [`nims-org-structure.md`](../04-references/nims-org-structure.md)/ADR-008).
3. **Document recomputed ratios, never the essay's claimed ones.** Every ratio in color.md is emitted by `wcag-contrast.mjs`.
4. **Broadcast brightens two hues** (`strutset` `#A78BFA → #B9A7FC`, `--danger` `#F87171 → #FB8C8C`) to clear broadcast's 7:1 AAA floor.

The one synthesis-pinned value — dark `--accent` `#D4A017` — is **kept**; only its *documented* ratio is corrected (4.5 → 6.96).

---

## Rationale

- **WCAG AA is a safety floor here, not a nicety.** color.md's text is field-critical (load values, status, deductions) and read in sun and by low-vision users. Shipping `#B8860B` (3.01:1) as accent text or dark tertiary (2.70:1) would fail real operators. The corrections are the minimum change that clears each token's use class with margin (no token left sitting on the 4.5 line).
- **Green = secured is field-correct.** Across domains green reads as "safe / done / locked." Assigning it to in-transit (`runner`) and blue to the safe terminal state (`secured`) is a usability regression the field would feel; restoring it costs nothing (the green still passes AA at 7.29:1 on its tint).
- **Completeness.** The lifecycle has seven states; a token file missing two of them isn't a system. `strutset` and `returned` are authored to be distinct in hue and verified.
- **Reproducibility eliminates a known failure class.** Scripting the ratios (CI-checkable at Phase H) is the color analogue of the v3.8.2 silent-validation-failure fix: a token edit that drops a pair below floor fails the build instead of shipping silently.
- **Honesty over transcription.** Documenting the essay's wrong ratios would be worse than omitting them; the recomputed numbers are the committed record.

---

## Alternatives Considered

- **Adopt essay 02's palette verbatim.** Rejected — four AA failures, two missing lifecycle states, inverted secured/runner semantics.
- **Carry the v3.5.2-audited hexes forward** (as the essay's "carry forward" wording implied). Rejected — they are the saturated dispatch-console look v4 deliberately exits (synthesis §4 visual position); only their *AA discipline* is carried, not their hues.
- **Keep the essay's claimed ratios in the token file.** Rejected — they are demonstrably wrong; the file must carry computed values (synthesis §4 rec 5).
- **Leave `strutset`/`returned` undefined until a later phase.** Rejected — the card primitive (gate trio) renders all seven states now; the palette must be complete for the gate.

---

## Consequences

- **Positive:** every token is AA-verified for its use class and reproducible; status semantics are field-correct and complete; broadcast clears AAA.
- **Negative:** the committed hexes diverge from essay 02's literal values in the places enumerated above. This ADR is the record of *why*, so the divergence is auditable rather than silent.
- **Neutral:** the dark-theme differentiator (`--surface-bg #1C1F23`, `--accent #D4A017`) is unchanged; the corrections touch the light accent, dark tertiary, light pending, sunlight accent, and the two broadcast hues only. `badge.md`, `voice-and-tone.md`, and the data model inherit the renamed enum and the "Active"-label open question noted in color.md.

---

## Related

- **Principles:** 9 (color is never the only signal), 7 (visible safety), 3 (calm/muted palette).
- **Other ADRs:** ADR-008 (renamed status enum — `strutset`); pairs with ADR-010 (the status *commit* model, which `card.md` renders in these colors).
- **Synthesis:** §4 visual language (palette anchors, "document the ratio" rule), §3.4 (capacity demoted — affects which colors lead a card, not the tokens).
- **Open questions:** #9 typeface is resolved separately (Geist); this ADR resolves the color portion of the §4 visual direction. Surfaced: `process`→"Active" display label (voice-and-tone), sunlight `active`/`--danger` banner at 6.47–6.70 vs. a stricter 7:1 (gate question in color.md).

---

## Notes

Verification artifact: [`wcag-contrast.mjs`](../07-design-system/wcag-contrast.mjs) — `node docs/v4-design/07-design-system/wcag-contrast.mjs` prints every pair, its ratio, and pass/fail for its use class. Last run at authoring: all pairs pass for their use class; broadcast all ≥7:1.
