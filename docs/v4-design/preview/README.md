# FieldShore v4 — Living Styleguide (preview)

A token-driven, static HTML rendering of the v4 design system. It makes the design **visible** during the design phase so gates are visual decisions, not hex-table reads.

## Run it

No build step. From the repo root:

```bash
npx serve -l 8095 docs/v4-design/preview
# open http://localhost:8095
```

…or open `index.html` with the preview tools. Use the toolbar to switch **Theme** (Light / Dark / Sunlight / Broadcast) and **Width** (Phone / Tablet / TV / Full).

## What's rendered (Phase E gate trio)

- **Color** — all four themes at once: surfaces, text tiers, accent, and the full status palette, each labeled with hex + the verified WCAG ratio.
- **Typography** — the Geist ramp at real sizes, Geist Mono tabular columns, and the typographic-fraction spec.
- **Card** — `ShorePointCard` (status stripe + 16pt tap zone, slide-to-advance, red-slash "Removed from cut list" state) and `RecommendationCard` (inline deduction ledger, capacity demoted).

## Guardrails (read before extending)

1. **This is a mockup, not the build.** Pure HTML/CSS + a few lines of vanilla JS for the styleguide's own theme/width toggles. **No framework, no `app.js`, no Firebase, no app logic.** It does **not** pre-decide the Phase H stack (React/Tailwind/TS — those are ADR-005/006/007). The Phase H build re-implements these primitives in the chosen stack, **consuming `tokens.css` verbatim** (the one file here that is not throwaway).
2. **The markdown specs are the source of truth.** `07-design-system/*.md` and `03-primitives/*.md` carry the design + rationale; this folder renders them. If rendering surfaces a gap, fix the **spec**, not just the CSS — they update in the same session, no silent drift.
3. **`tokens.css` values are the verified set** from `color.md` / `typography.md`, identical to the hexes in `07-design-system/wcag-contrast.mjs`. Re-run that script after any token edit.
4. **Stays on `v4-redesign`.** Nothing v4 ships to `main` until Phase J, so this is local-preview + screenshots for now. A phone-browsable GitHub Pages preview is a deferred option.

## Files

| File | Role |
|---|---|
| `tokens.css` | The four theme token blocks + type ramp + spacing/radius. **Reused in Phase H.** |
| `styleguide.css` | Base reset (from v3 `style.css:1–86`) + the primitive component styles. |
| `index.html` | Gallery shell + the Type and Card sections. |
| `styleguide.js` | Toolbar toggles + the Color section (rendered from one `PALETTE` source). |

## Growing it

Each Phase E session: author the markdown spec → add its tokens to `tokens.css` → add a section/states to the styleguide → screenshot. By the end of Phase E this is a complete component gallery in all four themes. Phase F adds full-screen mockups under `preview/screens/`.
