# Design System: Logo & Mark

> Phase E, design-system token file 6 of 8. Authored at the depth of [`03-primitives/picker.md`](../03-primitives/picker.md).
> Source: essay [`05-essays/02-visual-language.md`](../05-essays/02-visual-language.md) "The 'P' Mark" — **superseded, not transcribed.** Open question #10 resolved to a **new identity, not a refresh** (Alex, 2026-05-31), and the identity is a **full-color emblem** per [`ADR-013`](../11-decisions/ADR-013-brand-emblem-full-color.md) (Alex, 2026-06-02) — which overrides the essay's "geometry-refresh the P" and amends [`color.md`](color.md)'s "no second brand color" rule. Artwork lives in [`assets/logo/`](assets/logo/); the rendered proof is the **Logo & Mark** panel in [`preview/`](../preview/index.html). Strut/timber depiction doctrine-checked by the `structural-collapse-sme` agent.

---

## Purpose

The mark is the one place in FieldShore where the product gets to say what it *is* before a word is read. Every reference app in the [corpus](../04-references/) wears a generic public-safety badge — a shield, a cross, a flame, a navy roundel. FieldShore's mark is the opposite move: it is the **tools themselves**. The "FS" is built from a rescue strut assembly and a gusseted timber shore — the two things the whole product exists to manage. An incident commander who has never seen the app still reads "shoring" off the icon.

This is a **new identity, not a refresh** of the v3 "P-in-a-square" (Open Q#10). And it is **full color** (ADR-013): the only place in the entire system exempt from the one-accent rule, because a flat monogram cannot carry the gold-LongShore-vs-aluminum-strut distinction that makes the mark legible *as shoring*.

---

## The system is two marks

A full-color emblem cannot survive a 16px favicon or recolor itself for a light theme. So the identity is **two marks, one family:**

| Mark | File | Role | Themes? |
|---|---|---|---|
| **Full-color emblem** | [`mark-color.svg`](assets/logo/mark-color.svg) | The primary brand identity. Splash / login / about / launch / printed & broadcast credits. The hero. | No — authored for the slate ground. |
| **Simplified mono mark** | [`mark-mono.svg`](assets/logo/mark-mono.svg) | The functional mark. Favicon, app-icon glyph fallback, nav, dense UI, any **light** surface, notification badge — anywhere small or theme-driven. | Yes — single ink = `--accent`. |

**The rule of thumb:** if the mark is larger than ~48px and sits on slate (or a dark/broadcast surface), use the emblem. Everywhere else — small, light, or theme-following — use the mono mark. They are the same "FS" letterforms, so swapping between them never reads as two different brands.

---

## Concept & construction

The "FS" is a small, honest shoring assembly:

**The "F" — three complete struts.**
- **Vertical = a gold Paratech LongShore** (the longest-reach strut — credible as the tall spine; doctrine-confirmed).
- **Two arms = aluminum struts** (the horizontals).
- **Every strut is capped at both ends by a rigid 6″ Paratech plate** — the base plate at the head, the sole plate at the foot. Each strut carries a short collar band (the locking collar) so it reads as a real strut, not a bar.

**The "S" — cut 4×4 lumber, gusseted.** A curve can't be built from straight lumber, so the S is **five cut 4×4 members** in a blocky/segmented S, **fastened at the four butt joints with plywood gusset plates**, each gusset carrying a **3×3 (9) nail pattern** — the way a T-shore is fastened. Gussets sit at the interior corners (the load corners), which the SME confirmed is where a shoring tech expects them.

> **Doctrine note (SME):** the depiction reads as credible to a USAR audience. The Paratech bottom connector is strictly the *sole plate* and the top the *base plate* (not "rigid base plate" at both ends); the spec uses base/sole accordingly. A 9-nail gusset pattern is within the FEMA range (16d commons, count by load) and will not register as wrong at mark scale.

---

## The full-color emblem — palette

These hues exist **only in the emblem.** They are not UI tokens and never appear in product chrome (ADR-013). The gold and the slate ground are the one tie to the system (`--accent` / `--surface-bg`, dark theme).

| Element | Fill | Role |
|---|---|---|
| Gold LongShore (vertical) | `#D4A017` | The brand gold — identical to dark `--accent`. The hero member. |
| Gold shade (collar) | `#A87C0E` | LongShore locking collar. |
| Aluminum struts (horizontals) | `#AEB4BB` | Realistic aluminum. |
| Strut collars | `#5E646C` | Aluminum-strut locking collars. |
| Steel base / sole plates | `#6E747C` | The rigid 6″ end plates (both ends, every strut). |
| 4×4 lumber (the S) | `#C39A5E` | Cut dimensional lumber. |
| Plywood gusset | `#CBB287` (edge `#A88E5E`) | The connector plates. |
| Nails | `#2C2A28` | 3×3 pattern per gusset. |

Ground: **slate `#1C1F23`** (dark `--surface-bg`). The emblem is authored for this ground and does not recolor.

---

## The simplified mono mark — one ink, themed

[`mark-mono.svg`](assets/logo/mark-mono.svg) is a single `currentColor` shape, so it inherits `--accent` and is correct in every theme automatically. Its only nod to the concept is form: the **F's bars are rounded** (struts), the **S is square** (lumber).

**The F5 geometry fix (S12, adopted in-code).** The shipped mono glyph was refined so the S reads unambiguously as an S at small sizes: its segmented members now carry **S-defining hook terminals** (short stubs that close the top-right and bottom-left of the S so it can't be misread as a blocky "5" or "8"), the corner radius is **unified at `rx=4`** across every member (the old glyph mixed radii), the **S is narrowed (68 → 56 units wide)** so it balances against the F, and the artboard is **`viewBox="0 0 160 100"`**. This is the canonical mono mark; any place that embeds the glyph (favicon, app-icon fallback, the brand sheet) tracks this geometry.

| Theme | Ink (`--accent`) | Ground (`--surface-bg`) | Ratio |
|---|---|---|---|
| Dark | `#D4A017` | `#1C1F23` | 6.96:1 |
| Light | `#8C6700` | `#F7F6F3` | 4.79:1 |
| Sunlight | `#6E5000` | `#FFFFFF` | 7.47:1 |
| Broadcast | `#E5B53D` | `#141618` | 9.51:1 |

(Ratios from [`color.md`](color.md) / [`wcag-contrast.mjs`](wcag-contrast.mjs) — all clear the 3:1 graphical-object floor; most clear AA text.)

---

## Size & detail ladder

| Size | Mark | What's present |
|---|---|---|
| ≥ 96px | emblem | Full detail — collars, nails, plate edges, every member. |
| 48–96px | emblem | Reads cleanly; nails/edges begin to merge but the material story holds. |
| 24–48px | **mono** | The emblem's color detail collapses here — switch to the mono mark. |
| ≤ 16px | **mono** | Bare "FS"; the favicon floor. The emblem is **never** used this small. |

The mono mark is legibility-verified down to **16px** (the favicon tier) in the preview panel. The emblem's floor is **~48px on slate**; below that it is mush and the mono mark takes over.

---

## App icon

[`app-icon.svg`](assets/logo/app-icon.svg) — the **full-color emblem on the slate `#1C1F23` square**, dark variant only (it is always on slate, so it never washes out). The artboard is full-bleed; the **12pt-equivalent corner radius** is applied by the OS on iOS (the SVG carries an 18/100 radius for Android/PWA/preview).

| Platform | Sizes |
|---|---|
| iOS | 1024 (App Store), 180, 167, 152, 120 |
| Android / PWA | 512 (maskable + any), 192, 144, 96 |
| Maskable | 512 with ≥10% safe-area padding (the emblem already sits inside an ~20% inset) |

Raster export of these sizes is mechanical and deferred to Phase H; the vector is the source.

---

## Favicon

[`favicon.svg`](assets/logo/favicon.svg) — the **mono mark in gold on the slate square** (not the emblem; the emblem can't read at favicon size). Ship `favicon.svg` plus a 32 and 16 `.ico` fallback (Phase H). The notification badge uses the same lockup.

---

## Wordmark

[`wordmark.svg`](assets/logo/wordmark.svg) — the **emblem + "FieldShore"** set in **Geist** (see [`typography.md`](typography.md)), "Field" at 500 and "**Shore**" at 700 (the established brand weight split), `-1` tracking. **No tagline lockup** (per essay 02). This is the primary identity on splash, login, and the about screen.

- **Clear space** between emblem and wordmark: one stroke-width of the gold member.
- **Dark ground:** wordmark text `--text-primary` (`#F0EFEC`). **Light ground:** text `#1A1A1A` and either the emblem on a slate chip or the mono mark in its place.
- Minimum wordmark height: emblem at 32px (text stays ≥`--type-headline-1`).

**In-app lockups render the wordmark text as HTML, never the baked SVG text** (S12). [`wordmark.svg`](assets/logo/wordmark.svg) bakes "FieldShore" as outlined glyphs — fine for a static export, but inside the app the lockup composes **"Field" + "Shore" as live, theme-styled text**: **"Field"** in `--text-primary` and **"Shore"** in `--accent`, **both at 700**, `-0.01em` tracking. Reasons: it themes for free (the gold "Shore" follows `--accent` across all four themes; the brand sheet's static export uses an 800 weight for "Shore" against the slate ground, but the in-app lockup is 700), it stays crisp at any size, and it scales with Dynamic Type instead of as a fixed raster. The baked `wordmark.svg` is for off-app surfaces (export headers, printed/broadcast credits); it is never the in-app header lockup.

---

## Clear space & misuse

- **Clear space** around any mark = the height of the F's top base plate (≈ the gold member's width). Nothing — text, edge, other logo — inside it.
- **Minimum sizes:** emblem 48px; mono mark 16px; wordmark 32px tall.
- The emblem only ever appears on **slate** (or, on a light surface, on a slate chip). It is never set on a photo, a gradient, or a light field bare.

---

## Accessibility floor

- The mark is a **graphical object** (WCAG 3:1). The mono mark meets it in every theme (table above); the emblem's gold member on slate is 6.96:1 and its aluminum/steel members clear 3:1 on slate.
- **Alt text:** `"FieldShore"` when the mark stands for the brand; `alt=""` (decorative) when it sits beside the visible "FieldShore" wordmark, to avoid a double announce. Full per-context behavior consolidates in [`accessibility.md`](accessibility.md).
- The mark is **never** a color-only signal (Principle 9) — it is identity, not status.
- Honors `prefers-reduced-motion` trivially: the mark never animates (see [`motion.md`](motion.md) — no logo reveal/spin).

---

## Anti-patterns (do not do these)

- **The full-color emblem in product chrome.** It is for identity surfaces (splash/login/about/credits), never a nav icon, button, or list affordance — that's the mono mark's job. The one-accent rule still binds all UI (ADR-013).
- **The emblem below ~48px, or on a light/photo/gradient ground.** It collapses and washes out. Use the mono mark, or put the emblem on a slate chip.
- **Recoloring the emblem.** Its palette is fixed (gold/aluminum/steel/wood/ply/nails). No "FieldShore blue," no monochrome-tinting the emblem, no swapping the LongShore off gold.
- **A second hardcoded color anywhere outside the emblem.** The emblem is the *only* exemption from one-accent; do not let its wood/steel/aluminum leak into a button or badge.
- **The mono mark in a baked color.** It is `currentColor` so it themes — never ship it as a fixed `#D4A017` in a themed context.
- **A tagline lockup.** "FieldShore — rescue strut selection" and the like are forbidden (essay 02). The wordmark is mark + "FieldShore," nothing more.
- **Stretching, rotating, re-spacing the FS, or separating F from S.** The assembly is the mark; pull it apart and it stops reading as shoring.
- **A doctrinally wrong strut/timber detail.** The geometry is a quiet credibility signal to a USAR audience; keep the SME's base/sole-plate and gusset placement intact if the art is ever redrawn.

---

## Open questions for the gate

1. **Full-color emblem vs. the system's restraint.** ADR-013 exempts the emblem from the one-accent rule. Confirmed by Alex in-session; flagged here because it is the single most visible departure from v4's flat, one-accent discipline. The gate either ratifies ADR-013 or pulls back to a monochrome mark.
2. **Emblem on light surfaces — slate chip vs. mono mark.** Spec'd as "mono mark on light, emblem on a slate chip when the emblem is required." Confirm the chip treatment (radius, padding) at the gate or defer to Phase F when a real light-surface placement appears.
3. **9-nail gusset pattern.** SME confirms it's in range and illegible-as-wrong at scale; a future redraw could match a specific FEMA load case, but it's not required. Deferred.
4. **Production rasters + wiring.** iOS asset-catalog PNGs, the `.ico`, and replacing the v3 `#1565C0` "P" in [`manifest.json`](../../../manifest.json) / [`index.html`](../../../index.html) are Phase H — the vectors here are the source of truth.
