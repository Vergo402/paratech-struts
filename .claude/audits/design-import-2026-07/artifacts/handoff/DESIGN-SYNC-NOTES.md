# Notes for the next `/design-sync` run

Issues surfaced by `check_design_system` in this project that must be fixed in the
**source repo** (the synced files here are read-only — hand-edits get overwritten on
the next sync and drift the project from the repo).

## 1 · 12 component-local custom properties flagged as unregistered tokens

**Status 2026-07-02:** the earlier `--sp-*` flag (25 properties) is RESOLVED — the source
renamed them to `--_sp-*` and the base `.is-*` scopes now register cleanly. 12 remain:

| Selector(s) | Property | Role |
|---|---|---|
| `.fs-org` | `--org-line`, `--org-gap` (each declared 2× — also dedupe) | org-chart layout knobs |
| `.fs-sysfilter-chip--gold/--grey/--lockstroke` | `--_chip-color` | variant → color selection (aliases the registered `--chip-*` tokens) |
| `.fs-rec--gold/--grey/--lockstroke`, `.fs-rec.is-gated` | `--rec-color` | variant → color selection |
| `.fs-gs` | `--fs-gs-stroke-strong` | component-local stroke |

**Diagnosis:** all are *component-local* variables set per variant class — the variant
mechanism itself. None are theme tokens; none can move to `:root`/`[data-*]` without
breaking the per-variant cascade.

**Fix in source (pick one):**
- Annotate each declaration with `/* @kind color */` (or the appropriate kind) so it
  registers scope-attached — note the `--_` underscore rename alone did **not** exempt
  `--_chip-color`, so the underscore convention is not what the detector excludes.
- Or resolve the variant color inline (`color: var(--chip-gold)`) and drop the
  intermediate custom property where it's only read once.
- Also dedupe the double `--org-line`/`--org-gap` declarations in `.fs-org`.

## 2 · (Carried over) duplicate `@font-face` + token-registration issues

If still present after re-sync: `fonts/fonts.css` was double-written (a minified block
pointing at non-existent `/assets/…-HASH.woff2`, plus a clean block pointing at the real
`./*.woff2` in `fonts/`). Emit only the clean block. Also: non-color tokens
(motion/ease/`--tw-*`) need `/* @kind … */` tags or renaming, and theme values should be
declared under `:root` / `[data-*]` rather than component selectors.

---
*Not fixable in this project — the bundle/token/font files are compiled `/design-sync`
output. Address in the source repo, then re-run `/design-sync`.*
