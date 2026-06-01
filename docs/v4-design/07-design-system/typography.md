# Design System: Typography

> Phase E, design-system token file 2 of 8. Authored at the depth of [`03-primitives/picker.md`](../03-primitives/picker.md).
> Source: essay [`05-essays/02-visual-language.md`](../05-essays/02-visual-language.md) "Typeface System" + [`06-synthesis.md`](../06-synthesis.md) §4 (Geist locked, conflict 2.6; typographic fractions). Reconciled, not transcribed — marketing-specific type is dropped, fractions are added.

---

## Purpose

Typography does most of the visual work in FieldShore. The palette is deliberately muted (see [`color.md`](color.md)); **hierarchy, authority, and field-readability come from type, not color.** A Garmin avionics MFD signals authority through typographic restraint and density discipline, not decoration — FieldShore follows that register. Two non-negotiables drive every choice: **measurements live in aligned columns** (tabular figures, always) and **the same type reads on a phone in the sun, a tablet across a room, and a TV at 12 feet** (one variable family, scaled per surface).

---

## The typeface — Geist (decided)

**Geist** (Vercel, OFL, 2023) is the v4.0 default. **Decided, not open** — synthesis conflict 2.6 closed open question #9 in Geist's favor. It is a variable grotesque with genuine tabular-numeral support, reads with authority at small sizes, has clean uncompromised display weights, and — critically — is *not* Inter (the default of every product without a typeface, and of half the reference corpus).

- **`Geist`** — all UI text.
- **`Geist Mono`** (OFL, same foundry) — **all measurements, load values, cut lengths, and timestamps.** Monospace guarantees column alignment regardless of digit combination; it is also a visible quality signal (every reference app uses proportional numerals in measurement columns).
- **Fallback:** `Inter Variable` is the Phase-H fallback **only** if Geist's variable-axis support or subsetting surfaces a problem during the build. Tokens are face-agnostic, so the swap is one `font-family` line at the root. Söhne (licensed, Klim) is **not** a live Phase-E option — it is parked as a Phase-I budget question (synthesis Q1).

```css
--font-sans: "Geist Variable", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
--font-mono: "Geist Mono Variable", ui-monospace, SFMono-Regular, Menlo, monospace;
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
| `--type-mono` | 13 | 400 | 1.40 | 0 | **Geist Mono** — measurement & load values |

Line-height is unitless (multiplier). In tight tabular cells (load tables, the deduction ledger) `--type-mono` may drop to line-height `1.0` for row density — specified per primitive, not globally.

---

## Tabular numerals — the hard rule

Any number that sits in a column, a table, an aligned pair, or that updates in place uses **tabular figures**:

```css
font-variant-numeric: tabular-nums;
```

- **Always tabular:** measurements, load capacities, cut lengths, deduction-ledger rows, timestamps, counts that change (SP counts per status, personnel count, elapsed OP time), inventory quantities.
- `--type-mono` (Geist Mono) is inherently tabular and fixed-pitch — use it for the **measurement/load values themselves**.
- Geist (sans) with `tabular-nums` is used where a number sits inline in prose-like UI but must still not jitter (e.g., the SitStat datums).
- **Proportional figures** are acceptable only in genuine running prose (the user manual, empty-state sentences) where no number aligns to another.

This single rule is why every reference app's measurement columns look ragged and FieldShore's do not.

---

## Typographic fractions (new — synthesis §4)

FieldShore measurements are fractional (½", 5¾", 11⅝"). They must render as **true typographic fractions**, not same-size slashed numerals (`5 3/4`) and not a Unicode-vulgar-fraction grab bag (which only covers a few denominators and renders inconsistently).

**Spec:** the numerator and denominator are set **smaller than the whole number but raised/positioned so the fraction occupies the same total cap height** as the integer beside it — a true `5¾` appearance, vertically centered, the fraction bar at the optical midline.

- Preferred mechanism: the OpenType `frac` feature on Geist where the input is `5 3/4` → `font-feature-settings: "frac" 1;` (or `font-variant-numeric: diagonal-fractions;`). Verify Geist's `frac` coverage for all denominators FieldShore uses (halves, quarters, eighths, sixteenths) during Phase H; where a denominator is uncovered, fall back to a composed-glyph component (numerator `sup`, denominator `sub`, U+2044 fraction slash) sized to ~62% with baseline shift so total cap height matches.
- The whole number stays at the host size (e.g., `--type-mono` 13pt); the fraction set is the smaller component within it.
- Fractions inherit tabular alignment — `11⅝` and `5¾` in a column align on the integer's right edge.
- This is owned here as a token-level rule; the reusable render component is specified with [`input.md`](../03-primitives/input.md) (measurement display) and the result/deduction card in [`card.md`](../03-primitives/card.md).

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

- **Proportional numerals in a measurement column.** Always tabular / Geist Mono. This is the single most common quality tell.
- **`5 3/4` rendered as three same-size characters.** Use the typographic-fraction spec.
- **A third typeface.** Geist + Geist Mono is the entire system. No display face, no "friendly" secondary.
- **System-font fallback as the design.** Inter/system is a *fallback*, never the authored target (essay 02's rejected skeptic position).
- **Weight below 400 for body.** Geist's lighter axes wash out in sunlight; body floor is 400 (500 in sunlight).
- **Sub-32pt text on broadcast.** Unreadable at 12 ft.
- **All-caps body copy.** Reserved for `--type-label` micro-labels only, where the +0.04em tracking supports it.

---

## Open questions for the gate

1. **Geist `frac` denominator coverage.** Confirmed at Phase H against the real font; if eighths/sixteenths aren't covered by the OpenType feature, the composed-glyph fallback component ships. No blocker for the gate — the *rule* is fixed here.
2. **Self-host vs. CDN for the Geist woff2.** Leaning self-host + subset (offline-first, no third-party request, SRI moot). Confirmed at Phase H build.
3. **Söhne** stays parked for Phase I (synthesis Q1) — not reopened in Phase E.
