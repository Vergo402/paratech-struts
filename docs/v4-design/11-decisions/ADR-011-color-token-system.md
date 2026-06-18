# ADR-011: v4 color token system — contrast corrections + status-palette reconciliation

## Status

- [ ] Proposed
- [x] Accepted *(Phase E gate — Alex, 2026-06-01)*

**Date:** 2026-05-31
**Author:** Claude Opus 4.8 (Phase E session) + reproducible WCAG verification ([`wcag-contrast.mjs`](../07-design-system/wcag-contrast.mjs))
**Reviewer(s):** Alex (Phase E gate — approved 2026-06-01)

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
- **Neutral:** the dark-theme differentiator (`--surface-bg #1C1F23`, `--accent #D4A017`) is unchanged; the corrections touch the light accent, dark tertiary, light pending, sunlight accent, and the two broadcast hues only. `badge.md`, `voice-and-tone.md`, and the data model inherit the renamed enum and the resolved display labels noted in color.md (the in-progress state displays "Equipment Assigned" — v3 key `process`, reverting essay 02's "Active"; the locked state displays "Wood Shore Secured", key `secured`).

---

## Addendum (2026-06-07) — `--on-accent` + `--shadow-modal` minted

The Phase E primitive cascade surfaced two tokens the gate-trio color set had **named but not yet minted**; both are added to [`color.md`](../07-design-system/color.md) under this ADR — filling out the accepted token system, not a new decision:

- **`--on-accent`** — the per-theme foreground for a filled primary button ([`button.md`](../03-primitives/button.md), its lone flagged token dependency). Because `--accent` flips dark-gold ↔ light-gold by theme, the foreground cannot be a fixed color: **Light `#FFFFFF` (5.18) · Dark `#1C1F23` (6.96) · Sunlight `#FFFFFF` (7.47, clears the 7:1 contract)**; Broadcast renders no buttons. Verified by [`wcag-contrast.mjs`](../07-design-system/wcag-contrast.mjs) — pairs added to the script, all pass.
- **`--shadow-modal`** — the centered-modal cast shadow ([`modal.md`](../03-primitives/modal.md) Anatomy + OQ1), a symmetric **downward** cast distinct from `--shadow-sheet`'s bottom-anchored geometry: **Light `0 8pt 32pt /.12` · Dark `/.32` · Sunlight `0 4pt 16pt /.20`**; Broadcast none.

Both were anticipated (the `--shadow-modal` flag already sat in color.md §Strokes & elevation, and both primitives flagged their needs); this addendum records the mint so the move from "flagged" to "defined" is on the record (Strict Rule 3). The `preview/tokens.css` mirror was synced the same session, and the previously-missing `--scrim` mirror (a prior drift from color.md) was added with them.

---

## Addendum (2026-06-09) — `--shadow-drawer` minted (the 15th primitive)

The Phase F [#217](https://github.com/Vergo402/paratech-struts/issues/217) gate added a **15th** UI primitive, the **side-drawer** ([`side-drawer.md`](../03-primitives/side-drawer.md), [ADR-019](ADR-019-side-drawer-primitive.md)) — an edge-anchored companion panel. Like the sheet and modal it is a real overlay and casts a real shadow, but in the **one direction the existing tokens never covered**: a **sideways inward** cast from the anchored edge toward the canvas (the sheet casts up, the modal down). **`--shadow-drawer`** is minted in [`color.md`](../07-design-system/color.md) §Strokes & elevation — **Light `-2pt 0 16pt /.08` · Dark `-4pt 0 24pt /.18` · Sunlight `-2pt 0 8pt /.08`** (right-anchored default; mirror the x-sign for a left-anchored drawer); **Broadcast none** (no overlays). Synced to `preview/tokens.css`. This is the sanctioned ADR-gated token addition — the move from "flagged" to "defined" on the record (Strict Rule 3), the same mechanism as `--on-accent` / `--shadow-modal` above. It is purely geometric (an alpha-black cast, like its siblings), so no `wcag-contrast.mjs` pair applies.

---

## Addendum 2 (2026-06-11) — S12 card pass: `--sys-lockstroke`, the status-tint value shelf, `--sp-solid`

The S12 card-design pass ([#316](https://github.com/Vergo402/paratech-struts/issues/316), the KB-6 "cards read bland" fix) introduced three color decisions on top of the accepted token system. They are recorded here — extending ADR-011, not a new ADR — because each is a deliberate, bounded move within the one-accent discipline rather than a fresh palette decision. All ratios are emitted by [`wcag-contrast.mjs`](../07-design-system/wcag-contrast.mjs).

**(a) `--sys-lockstroke` — a strut-system identity color (cyan).** The `RecommendationCard` identifies a strut by its physical *system*. Gold = LongShore (`--accent`), grey = AcmeThread (`--text-secondary`); **LockStroke is physically grey too** — it shares AcmeThread's body and load table — so on the card face a LockStroke recommendation was indistinguishable from an AcmeThread one. The fix is **`--sys-lockstroke` = cyan**, keyed off the strut *system*, not its color: cyan is the **opposite pole from the brand gold** and unmistakable from grey on screen. Per theme, contrast-verified on the surface *and* the card (8 new `wcag-contrast.mjs` rows): **Light `#0E7490` / bg `#ECFEFF` — 4.96/5.36 · Dark `#06B6D4` / `#0E262D` — 6.81/6.01 · Sunlight `#155E75` / `#ECFEFF` — 7.27 (clears the 7:1 sunlight contract) · Broadcast `#22D3EE` / transparent — 10.04**. This is **not a second UI accent**: a `--sys-*` color is strut-system *identity*, scoped to the result/recommendation surfaces, and never styles a button, a status, or chrome. The one-gold-accent anti-pattern in [`color.md`](../07-design-system/color.md) is amended to carve out the `--sys-*` family explicitly (the same shape as ADR-013's emblem carve-out — identity, not emphasis).

**(b) The status-tint value shelf — a sanctioned status hue on a card *region* (the C-class middle).** KB-6 asked for the `ShorePointCard`'s key number to stand out. The treatment range was: **A** (within doctrine — promote type only) / **B** (tint the whole card surface/border — which *would require a full ADR-011 amendment*, status hue is otherwise paired-with-text only) / an optional **C** between them. The shipped answer is **C: tint a bounded region, not the surface** — the measurement value shelf is a full-bleed row tinted from `--sp-solid` (the status hue), with the number itself in full-strength `--sp-solid`. The mix recipe: **light/dark `color-mix(--sp-solid 13%, --surface-card)`, sunlight `10%` on `#FFFFFF`, broadcast `18%`**, hairlines a `22%` mix into the stroke. This records the C-class as the sanctioned use of a status hue on a card *region* — color is never the only signal (the label words the phase, the badge carries the status text), so it stays inside Principle 9. A B-class winner (full-surface tint) would still need a full amendment; this addendum does **not** authorize that.

**(c) `--sp-solid` — the third status hook + the sunlight remap.** The shared `.is-{status}` hooks carried `--sp-text` and `--sp-bg`; S12 mints a third, **`--sp-solid`** = the *saturated identifying hue* that must read in every theme. In light/dark/broadcast it equals the status **text** hue; in **sunlight** it **remaps to the status `*-bg` solid fill** hue, because `--sp-text` is white there (the banner) and a white stripe/number/dot would vanish on the white card. `--sp-solid` is a derived *hook variable* (it adds no new hue to the palette) consumed by the card stripe, the value shelf, the waiting callout, the grouped-stack tabs/dots, and the tablet status-summary dot. This **closes the sunlight-stripe placeholder** — the gate-script's known-gap #11 — replacing the placeholder stripe mapping with the correct status hue in sunlight.

The `preview/tokens.css` mirror and `src/app/tokens.css` were synced in the same S12 commit range (`5912d7e..9faff63`); `wcag-contrast.mjs` was extended with the 8 lockstroke pairs and re-run (all pass for their use class; sunlight and broadcast lockstroke clear 7:1).

---

## Related

- **Principles:** 9 (color is never the only signal), 7 (visible safety), 3 (calm/muted palette).
- **Other ADRs:** ADR-008 (renamed status enum — `strutset`); pairs with ADR-010 (the status *commit* model, which `card.md` renders in these colors).
- **Synthesis:** §4 visual language (palette anchors, "document the ratio" rule), §3.4 (capacity demoted — affects which colors lead a card, not the tokens).
- **Open questions:** #9 typeface is resolved separately (Geist); this ADR resolves the color portion of the §4 visual direction. Surfaced then resolved (2026-06-01): the in-progress state displays **"Equipment Assigned"** (v3 key `process`, reverting essay 02's "Active"), the locked state **"Wood Shore Secured"** (key `secured`). Still open: sunlight `process`/`--danger` banner at 6.47–6.70 vs. a stricter 7:1 (gate question in color.md).

---

## Notes

Verification artifact: [`wcag-contrast.mjs`](../07-design-system/wcag-contrast.mjs) — `node docs/v4-design/07-design-system/wcag-contrast.mjs` prints every pair, its ratio, and pass/fail for its use class. Last run at authoring: all pairs pass for their use class; broadcast all ≥7:1.
