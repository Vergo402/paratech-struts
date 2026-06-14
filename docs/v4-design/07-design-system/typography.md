# Design System: Typography

> Phase E, design-system token file 2 of 8. Authored at the depth of [`03-primitives/picker.md`](../03-primitives/picker.md).
> Source: essay [`05-essays/02-visual-language.md`](../05-essays/02-visual-language.md) "Typeface System" + [`06-synthesis.md`](../06-synthesis.md) §4 (Geist locked, conflict 2.6; typographic fractions). Reconciled, not transcribed — marketing-specific type is dropped, fractions are added.

---

## Purpose

Typography does most of the visual work in FieldShore. The palette is deliberately muted (see [`color.md`](color.md)); **hierarchy, authority, and field-readability come from type, not color.** A Garmin avionics MFD signals authority through typographic restraint and density discipline, not decoration — FieldShore follows that register. Two non-negotiables drive every choice: **measurements live in aligned columns** (tabular figures, always) and **the same type reads on a phone in the sun, a tablet across a room, and a TV at 12 feet** (one variable family, scaled per surface).

---

## The typeface — Geist (decided)

**Geist** (Vercel, OFL, 2023) is the v4.0 **UI** default. **Decided, not open** — synthesis conflict 2.6 closed open question #9 in Geist's favor. It is a variable grotesque with genuine tabular-numeral support, reads with authority at small sizes, has clean uncompromised display weights, and — critically — is *not* Inter (the default of every product without a typeface, and of half the reference corpus). **Numerals exception ([ADR-028](../11-decisions/ADR-028-inter-numerals-diagonal-fractions.md)):** the measurement/load **value** font is **Inter**, whose diagonal fractions read best at field distance — a partial, numerals-only override of "not Inter." Geist remains the UI typeface for all labels, headings, and body text.

- **`Geist`** — all UI text.
- **`Inter Variable`** (numerals only — the **value** font, [ADR-028](../11-decisions/ADR-028-inter-numerals-diagonal-fractions.md)) — **all measurements, load values, cut lengths, and timestamps.** `tabular-nums` guarantees column alignment regardless of digit combination, and its **diagonal fractions** render the 1/8″ family legibly at field distance (the reason for the override). Carried on the `--font-mono` token — a historical name kept to avoid an 18-site rename; it's the *value-font role*, not literally monospace.
- **Fallback:** the system stack on each token (`-apple-system`, etc.). Geist's UI fallback was `Inter`; with Inter now the value face the swap is still one `font-family` line at the root, tokens face-agnostic. Söhne (licensed, Klim) is **not** a live Phase-E option — parked as a Phase-I budget question (synthesis Q1).

```css
--font-sans: "Geist Variable", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
/* value/numeral font — Inter (ADR-028); "mono" is the role name, not the metric */
--font-mono: "Inter Variable", "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
```

Variable font, self-hosted and subsetted (Latin + the glyphs we use), `font-display: swap`, woff2. No FOIT; the system fallback in the stack is metrically close enough that swap is not a layout jump.

### Requirements this typeface satisfies
1. Tabular numerals at every weight (measurement columns must not go ragged).
2. Legible at 11px on a dense tablet surface (caption text is data, not a hint).
3. Heavy weight reads at 40px+ on a broadcast TV without feeling condensed.
4. Holds across all four themes (the sunlight weight bump below depends on a real weight axis).
5. One variable file, not eight weight files (network tax / visual compromise both avoided).

---

## Type ramp

Anchored at **14pt body**, minor-third-informed (≈1.2×), rounded to the 4pt-friendly grid. Sizes in pt = CSS px at 1:1. The **display tier is broadcast-surface only**; interactive app surfaces (phone/tablet/laptop) top out at `--type-headline-1` (24pt).

| Token | Size | Weight | Line-height | Tracking | Use |
|---|---|---|---|---|---|
| `--type-display-1` | 40 | 700 | 1.10 | −0.02em | Broadcast section headers / incident name |
| `--type-display-2` | 32 | 700 | 1.12 | −0.02em | Broadcast secondary / large board datum *(was the essay's marketing hero — marketing dropped, repurposed to broadcast)* |
| `--type-headline-1` | 24 | 600 | 1.25 | −0.01em | Modal title, screen section header |
| `--type-headline-2` | 20 | 600 | 1.30 | 0 | Card title (tablet), toast/sheet headline |
| `--type-body-lg` | 16 | 400 | 1.45 | 0 | Operation name, apparatus name |
| `--type-body` | 14 | 400 | 1.45 | 0 | Shore-point body copy, row labels (the anchor) |
| `--type-body-medium` | 14 | 500 | 1.45 | 0 | Active labels, badge text, button text |
| `--type-caption` | 12 | 400 | 1.35 | +0.02em | Timestamp, secondary metadata |
| `--type-label` | 11 | 500 | 1.30 | +0.04em | Table column header, nav label |
| `--type-mono` | 13 | 400 | 1.40 | 0 | **Inter** (value font, ADR-028) — measurement & load values |

Line-height is unitless (multiplier). In tight tabular cells (load tables, the deduction ledger) `--type-mono` may drop to line-height `1.0` for row density — specified per primitive, not globally.

---

## Tabular numerals — the hard rule

Any number that sits in a column, a table, an aligned pair, or that updates in place uses **tabular figures**:

```css
font-variant-numeric: tabular-nums;
```

- **Always tabular:** measurements, load capacities, cut lengths, deduction-ledger rows, timestamps, counts that change (SP counts per status, personnel count, elapsed OP time), inventory quantities.
- `--type-mono` (Inter, value font — ADR-028) carries `tabular-nums` + `diagonal-fractions` — use it for the **measurement/load values themselves**. Alignment comes from tabular figures, not fixed pitch.
- Geist (sans) with `tabular-nums` is used where a number sits inline in prose-like UI but must still not jitter (e.g., the SitStat datums).
- **Proportional figures** are acceptable only in genuine running prose (the user manual, empty-state sentences) where no number aligns to another.

This single rule is why every reference app's measurement columns look ragged and FieldShore's do not.

---

## Fractions — 1/8″ granularity, diagonal via the value font (synthesis §4; [ADR-012](../11-decisions/ADR-012-measurement-precision-eighth-inch.md); [ADR-028](../11-decisions/ADR-028-inter-numerals-diagonal-fractions.md))

FieldShore measurements are fractional and reported to **1/8″** — the field granularity (ADR-012: 1/16″ was false precision *and* unreadable at a gloved glance; the internal math was only 0.1″-decimal anyway). Denominators are therefore **2, 4, 8 only** (½, ¼/¾, ⅛/⅜/⅝/⅞). They must render legibly — never the super/subscript codepoint hack (`45¹¹⁄₁₆`) that rendered illegibly tiny at field distance.

**Spec (ADR-028):** fractions render as **diagonal fractions composed by the value font**. `MeasurementValue` emits plain text — `"48 1/2″"`, with a space before the fraction — and the font's OpenType `frac` feature (`font-variant-numeric: diagonal-fractions`, set on `.fs-meas`) draws the raised-numerator / slash / lowered-denominator glyph. The diagonal glyph scales with `font-size`, so every context — the 16px ledger row, the 28px promoted shelf, the 34px readout — gets a correctly-proportioned fraction with **no per-size CSS**.

- **Value font = Inter** (numerals only). Inter is the measurement/load value font, carried on the `--font-mono` token (a historical name — it's the *value-font role*, not literally monospace; alignment comes from `tabular-nums`, not fixed pitch). **Geist Sans stays the UI font** for labels, headings, and body. This is the standard "label in Sans / value in its own font" split — only the value face changed (Geist Mono → Inter). Partial override of the Geist-not-Inter decision, **for numerals only**.
- **`frac` is now used** — the earlier ban (denominator coverage) is **moot**: output is **eighths only** (½ ¼ ¾ ⅛ ⅜ ⅝ ⅞), which Inter covers completely. The hand-stacked digit-pair form (`.fr`) and its `.fs-fr-display` re-derivation are **retired** — they tested illegibly tiny at field distance (the same failure mode as the old Unicode hack, rebuilt by hand).
- The space before the fraction (`48 1/2″`, not `481/2″`) is **required** so `frac` composes "1/2" and not "481/2". The renderer always inserts it; consumer text runs must stay a single node so the feature applies across the value.
- Fractions inherit `tabular-nums` so column values still align on the integer's right edge.
- This is owned here as a token-level rule; the renderer is `MeasurementValue` ([input.md](../03-primitives/input.md) measurement display; [card.md](../03-primitives/card.md) result/deduction card). jsdom can't render the glyph, so the look is verified **live**, not in unit tests; rendered proof is in `preview/`.

**Resolved (ADR-028):** the "stacked vs diagonal house style" open call is closed → **diagonal**. Picked by eye from a live five-option comparison (Geist-Mono-stacked, Geist-Sans-diagonal, Geist-Sans-bigger-stacked, IBM-Plex-diagonal, Inter-diagonal); Inter-diagonal read best at field distance.

---

## Letter-spacing

| Tier | Tracking | Why |
|---|---|---|
| Display (32–40pt) | −0.02em | Close the gaps a variable font opens at large sizes |
| Headline (20–24pt) | −0.01em → 0 | Slight tightening at 24, neutral at 20 |
| Body (14–16pt) | 0 | Default tracking; Geist is designed for it |
| Caption (12pt) | +0.02em | Open slightly for small-size legibility |
| Label / nav (11pt) | +0.04em | Open further; small targets read better spaced |
| Mono | 0 | Never track monospace |

---

## Per-surface adaptation

The ramp is shared; **size and weight adapt by surface, components do not** (Principle 2 — designed for the role, not the device).

| Surface | Adaptation |
|---|---|
| **Phone (team officer)** | The ramp as listed. Primary actions and status labels never below `--type-body-medium` (14/500). |
| **Tablet (CP)** | Same ramp; higher density tolerates `--type-caption`/`--type-label` for the resource board. Card titles use `--type-headline-2`. |
| **Laptop (Toughbook)** | Same ramp; keyboard-first views (audit log, ICS-201) may use `--type-caption` in dense tables. Exportable views render at body+. |
| **Broadcast TV** | **Dedicated scale.** Minimum on-screen text **32pt** (`--type-display-2`); nav-equivalent labels that are 11pt on phone become ≥36pt here; incident name / largest datum at `--type-display-1` (40pt) or larger as the board scales. Heavy weight (700). No type below 32pt ever renders on broadcast. |
| **Sunlight (theme, phone)** | **Weight bumps one step:** body 400 → **500**, labels/medium 500 → **600**, headlines 600 → **700**. Size is unchanged; the weight bump (plus [`color.md`](color.md) black-on-white and 2pt strokes) is what survives glare. This requires Geist's real weight axis — a reason the typeface had to be variable with genuine weight differentiation. |

---

## Accessibility

- **Minimum interactive text:** `--type-label` (11pt) is the floor, used only for non-essential labels (nav, column headers) that are reinforced by icon + position. Essential/body text never below `--type-body` (14pt).
- **Dynamic Type / user font scaling:** the ramp is defined in `rem` against a root size so OS-level text-size preferences scale the whole system proportionally; layouts use min/max and wrap rather than truncate. No fixed-px text that ignores user scaling (Phase H acceptance criterion).
- **Weight is a second hierarchy channel** alongside size, so hierarchy survives for low-vision users who scale everything to one size.
- **`prefers-reduced-motion`** has no type effect (type doesn't animate; see [`motion.md`](motion.md)).
- Full VoiceOver/TalkBack behavior is consolidated in [`accessibility.md`](accessibility.md).

---

## Anti-patterns (do not do these)

- **Proportional numerals in a measurement column.** Always `tabular-nums` on the value font (Inter). This is the single most common quality tell.
- **`45¹¹⁄₁₆` faked with super/subscript codepoints, or the retired hand-stacked digit pair.** Both fail — use diagonal fractions via the value font ([ADR-028](../11-decisions/ADR-028-inter-numerals-diagonal-fractions.md)).
- **A third typeface.** Geist (UI) + Inter (numerals, ADR-028) is the entire system. No display face, no "friendly" secondary.
- **System-font fallback as the design.** The system-stack fallback is a *fallback*, never the authored target (essay 02's rejected skeptic position) — Geist and Inter are the authored faces.
- **Weight below 400 for body.** Geist's lighter axes wash out in sunlight; body floor is 400 (500 in sunlight).
- **Sub-32pt text on broadcast.** Unreadable at 12 ft.
- **All-caps body copy.** Reserved for `--type-label` micro-labels only, where the +0.04em tracking supports it.

---

## Open questions for the gate

1. **~~Geist `frac` denominator coverage~~ / ~~stacked vs. diagonal house style~~ — RESOLVED ([ADR-028](../11-decisions/ADR-028-inter-numerals-diagonal-fractions.md)).** Settled by eye from a live five-option comparison: **diagonal fractions via the value font's `frac` feature**, with **Inter** as the numerals-only value font. The coverage objection was moot (eighths-only output) and the hand-stacked form failed field-readability testing; diagonal Inter read best. The stacked `.fr` component is retired.
2. **Self-host vs. CDN for the Geist woff2.** Leaning self-host + subset (offline-first, no third-party request, SRI moot). Confirmed at Phase H build.
3. **Söhne** stays parked for Phase I (synthesis Q1) — not reopened in Phase E.
