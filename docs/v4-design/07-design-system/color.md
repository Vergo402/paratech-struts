# Design System: Color

> Phase E, design-system token file 1 of 8. Authored at the depth of [`03-primitives/picker.md`](../03-primitives/picker.md).
> Source: essay [`05-essays/02-visual-language.md`](../05-essays/02-visual-language.md) "Color System" + [`06-synthesis.md`](../06-synthesis.md) §4, **reconciled and contrast-verified** — not transcribed. Every ratio in this file is recomputed by [`wcag-contrast.mjs`](wcag-contrast.mjs) (run `node docs/v4-design/07-design-system/wcag-contrast.mjs`). The token decisions are recorded in [`ADR-011`](../11-decisions/ADR-011-color-token-system.md).

---

## Purpose

Color in FieldShore carries three jobs and no others: **identity** (one accent that is unmistakably FieldShore, not another dispatch console), **state** (the shore-point lifecycle, always paired with text/shape so color is never the sole signal — Principle 9), and **surface hierarchy** (background → card → elevated, so the eye finds depth without shadows doing all the work).

Color does **not** carry urgency theater. No flashing reds, no anxious saturation (Principle 3, calm in chaos). The palette is muted and warm on purpose.

### Design position — exit the dispatch-console aesthetic

Every fire-service app in the [reference corpus](../04-references/) shares one palette: navy primary, white background, legacy red, amber warning, system fonts. It is the 1990s dispatch console carried forward, and it is *invisible* — an IC glancing at a FieldShore screen must not mistake it for the CAD. FieldShore exits that aesthetic with a **muted warm-slate dark surface** (`#1C1F23` — not navy, not OLED black) and a **single specific warm gold accent**. That dark slate is the single biggest visual differentiator from the competitive set; protect it.

---

## Token architecture

Tokens are **semantic, not literal**. A primitive references `--accent` or `--status-secured-text`, never a raw hex. Each theme is a complete, independently-authored set of the same semantic names — so the same `card.md` markup renders correctly in all four by swapping the active theme at the root.

```
:root[data-theme="light"]     { … }   /* preplan, office */
:root[data-theme="dark"]      { … }   /* incident operations (default at night) */
:root[data-theme="sunlight"]  { … }   /* on scene, direct sun — separately authored, NOT a dark override */
:root[data-theme="broadcast"] { … }   /* read-only TV at 8–12 ft */
```

Four token groups per theme: **surfaces & strokes**, **text**, **accent**, **status & feedback**.

---

## Theme 1 — Light (preplan, office)

Warm off-white surfaces, precise hairline strokes, no drop shadows. Clean without being clinical (the Stripe-docs / Linear-light register). Used for preplan review and office evaluation on a chief's computer. *(The v3 essay tagged this theme "demo mode"; demo mode is dropped — synthesis Q4 — so the label is preplan/office only.)*

### Surfaces & strokes
| Token | Value | Role |
|---|---|---|
| `--surface-bg` | `#F7F6F3` | Page background (warm white, not pure white) |
| `--surface-card` | `#FFFFFF` | Card / row surface |
| `--surface-card-hover` | `#FAFAF9` | Card hover / active-row fill |
| `--surface-elevated` | `#FFFFFF` | Sheet / modal surface (elevation via shadow, not color, in light) |
| `--surface-stroke` | `rgba(0,0,0,0.08)` | 1pt hairline border |
| `--accent-subtle` | `#FFF8E7` | Gold-tint background for selected state |
| `--scrim` | `rgba(0,0,0,0.40)` | Backdrop behind a sheet / modal — dims the parent; fades `0 → --scrim` (timing in [`motion.md`](motion.md)). The one scrim, shared by both overlay surfaces ([`sheet.md`](../03-primitives/sheet.md) / [`modal.md`](../03-primitives/modal.md)) |

### Text (ratios on `--surface-bg` `#F7F6F3` unless noted)
| Token | Value | Ratio | Use class |
|---|---|---|---|
| `--text-primary` | `#1A1A1A` | **16.10** (17.40 on card) | normal ✓ |
| `--text-secondary` | `#5C5C5C` | **6.19** (6.69 on card) | normal ✓ |
| `--text-tertiary` | `#8A8A8A` | **3.19** | **large/non-essential only** — never body copy |
| `--accent` | `#8C6700` | **4.79** (5.18 on card) | normal ✓ |

> **`--accent` correction:** essay 02 specified `#B8860B` and claimed 4.6:1; it actually computes to **3.01:1 — a hard fail** for text on either light surface. Corrected to **`#8C6700`** (4.79:1 on bg, 5.18:1 on card). See ADR-011.

### Status & feedback (status-text on status-tint)
| Status | `--status-*-text` | `--status-*-bg` | Ratio |
|---|---|---|---|
| pending | `#4B5563` | `#F3F4F6` | **6.87** ✓ |
| process | `#1D4ED8` | `#EFF6FF` | **6.16** ✓ |
| strutset | `#5B21B6` | `#F5F3FF` | **8.19** ✓ |
| cutting | `#92400E` | `#FEF3C7` | **6.37** ✓ |
| runner | `#9A3412` | `#FFEDD5` | **6.38** ✓ |
| secured | `#065F46` | `#ECFDF5` | **7.29** ✓ |
| returned | `#57534E` | `#F5F5F4` | **6.99** ✓ |
| `--danger` (feedback) | `#B91C1C` | `#FEF2F2` | **5.91** ✓ |

> **`pending` correction:** essay's `#6B7280` computes to 4.39:1 — a borderline miss. Corrected to **`#4B5563`** (6.87:1).

---

## Theme 2 — Dark (incident operations)

The default during night operations. A muted, desaturated, **warm** slate — the differentiator. Text is warm white (`#F0EFEC`), never blue-white.

### Surfaces & strokes
| Token | Value | Role |
|---|---|---|
| `--surface-bg` | `#1C1F23` | Page background (muted warm slate — **protect this value**) |
| `--surface-card` | `#252930` | Card / row surface |
| `--surface-card-hover` | `#2A2E36` | Card hover fill |
| `--surface-elevated` | `#2E333B` | Sheet / modal / focused surface |
| `--surface-stroke` | `rgba(255,255,255,0.07)` | 1pt hairline at 7% white |
| `--accent-subtle` | `#2A2310` | Gold-tint background for selected state |
| `--scrim` | `rgba(0,0,0,0.40)` | Backdrop behind a sheet / modal — 40% black, the doctrine value (as light); the darkened parent recedes beneath the lighter `--surface-elevated` |

### Text
| Token | Value | Ratio (on card `#252930`) | Use class |
|---|---|---|---|
| `--text-primary` | `#F0EFEC` | **12.70** (14.38 on bg) | normal ✓ |
| `--text-secondary` | `#9B9A97` | **5.19** | normal ✓ |
| `--text-tertiary` | `#8A8A86` | **4.21** | large; also clears normal |
| `--accent` | `#D4A017` | **6.96** on bg, **6.15** on card | normal ✓ |

> **`--text-tertiary` correction:** essay's `#6B6A67` computes to **2.70:1 — fails even the 3.0 large-text floor**. Corrected to **`#8A8A86`** (4.21:1), still correctly dimmer than `--text-secondary` (5.19:1). See ADR-011.
> Dark `--accent` `#D4A017` is the one value carried verbatim from the synthesis; essay claimed 4.5:1, true value is **6.96:1** (this file documents the computed number, per ADR-011).

### Status & feedback (bright status-text on dark status-tint)
| Status | `--status-*-text` | `--status-*-bg` | Ratio |
|---|---|---|---|
| pending | `#9CA3AF` | `#2A2D31` | **5.45** ✓ |
| process | `#60A5FA` | `#172033` | **6.40** ✓ |
| strutset | `#A78BFA` | `#221A38` | **6.06** ✓ |
| cutting | `#FBBF24` | `#2A2410` | **9.26** ✓ |
| runner | `#FB923C` | `#2A1B0F` | **7.35** ✓ |
| secured | `#34D399` | `#0F2620` | **8.29** ✓ |
| returned | `#A8A29E` | `#26231F` | **6.20** ✓ |
| `--danger` | `#F87171` | `#2A1416` | **6.27** ✓ |

---

## Theme 3 — Sunlight (on scene, direct sun)

**Separately authored, not a brightness boost on dark.** Its purpose is survivability on a phone at max brightness in direct afternoon sun (a 500-nit screen vs. 100,000-lux sun). The bottleneck is text-to-surface contrast and line weight, not background darkness — so the strategy is black-on-white, strokes thicken 1pt→2pt, cards gain a visible shadow, type weight bumps one step (specified in [`typography.md`](typography.md)), and status indicators grow from badge to solid full-width banner.

### Surfaces & strokes
| Token | Value | Role |
|---|---|---|
| `--surface-bg` | `#FFFFFF` | Page + card (max contrast) |
| `--surface-card` | `#FFFFFF` | Card surface; separated by 2pt stroke + shadow |
| `--surface-stroke` | `rgba(0,0,0,0.25)` | **2pt** stroke; guaranteed visible under glare |
| `--accent-subtle` | `#FFF3D6` | Selected-state tint (kept light; selection also gets weight/border) |
| `--scrim` | `rgba(0,0,0,0.55)` | Backdrop behind a sheet / modal — **stronger (55%)** than light/dark so the dim survives direct sun, the same thicken-for-glare strategy as the 2pt stroke and the card shadow |

### Text & accent
| Token | Value | Ratio (on white) | Use class |
|---|---|---|---|
| `--text-primary` | `#000000` | **21.00** | normal ✓ — the *only* text color permitted; no mid-gray text in sunlight |
| `--accent` | `#6E5000` | **7.47** | normal ✓ |

> **`--accent` correction:** essay's `#8B6500` computes to **5.30:1** — it passes AA but **fails the 7:1 contract sunlight sets for itself**. Corrected to **`#6E5000`** (7.47:1). See ADR-011.

### Status (solid fill, white text — the banner treatment)
Status in sunlight is a **solid-fill banner with white text**, not a tinted badge. White-on-fill ratios:
| Status | fill (`--status-*-bg`) | white-text ratio |
|---|---|---|
| pending | `#374151` | **10.31** ✓ |
| process | `#1D4ED8` | **6.70** ✓ |
| strutset | `#5B21B6` | **8.98** ✓ |
| cutting | `#92400E` | **7.09** ✓ |
| runner | `#9A3412` | **7.31** ✓ |
| secured | `#065F46` | **7.68** ✓ |
| returned | `#44403C` | **10.27** ✓ |
| `--danger` | `#B91C1C` | **6.47** ✓ |

All clear the essay's ≥4.5 sunlight-badge floor; most clear 7. (`process` and `--danger` land 6.47–6.70 — acceptable for the solid banner per the essay's stated floor; flagged in Open Questions for the gate if a stricter 7:1 banner is wanted.)

---

## Theme 4 — Broadcast TV (read-only, 8–12 ft)

Read-only status board on a wall display. No picker affordances, no interactivity (see [`picker.md`](../03-primitives/picker.md) surface table). **All text clears 7:1 (AAA)** because viewers can't control viewing angle. Status uses a **4pt left-border accent + text**, never a background fill (a wall of fills reads as noise at 12 ft). No animation; the view is a snapshot refreshed on a 15s poll or explicit CP push.

### Surfaces, text, accent
| Token | Value | Ratio (on bg) | Note |
|---|---|---|---|
| `--bc-surface-bg` | `#141618` | — | slightly darker than dark theme for TV gamma |
| `--bc-text-primary` | `#F4F4F4` | **16.49** | ✓ AAA |
| `--bc-text-secondary` | `#C0BFBC` | **9.86** | ✓ AAA *(essay claimed 5.8 — documented value is the computed 9.86)* |
| `--bc-accent` | `#E5B53D` | **9.51** | ✓ — brighter gold for TV gamma (dark-theme `#D4A017` would be 6.96 here, under the 7:1 bar) |

### Status (text/left-border accent on `--bc-surface-bg`, all ≥7:1)
| Status | color | Ratio |
|---|---|---|
| pending | `#9CA3AF` | **7.14** ✓ |
| process | `#60A5FA` | **7.13** ✓ |
| strutset | `#B9A7FC` | **8.63** ✓ |
| cutting | `#FBBF24` | **10.87** ✓ |
| runner | `#FB923C` | **8.01** ✓ |
| secured | `#34D399` | **9.44** ✓ |
| returned | `#A8A29E` | **7.19** ✓ |
| `--danger` | `#FB8C8C` | **7.97** ✓ |

> `strutset` and `--danger` were brightened from the dark-theme hues (`#A78BFA`→`#B9A7FC`, `#F87171`→`#FB8C8C`) specifically to clear broadcast's 7:1 floor.

---

## The shore-point status palette — reconciliation

The status colors are the most consequential color decision in the file. Three sources had to be reconciled (full rationale in [ADR-011](../11-decisions/ADR-011-color-token-system.md)):

1. **Essay 02's proposed palette** — muted/professional, exits v3's saturated console look. *Adopted in execution.* But it was **incomplete** (no `strutset`, no `returned`) and **semantically inverted** — it assigned **green to `runner`** and **blue to `secured`**. Green reads as "safe / complete / locked" almost universally; assigning it to in-transit and blue to the safe terminal state is a field-UX regression.
2. **v3.5.2-audited hexes** the essay claimed to "carry forward" — materially different hues (cutting `#7A4500` on yellow `#FFF176`, runner `#8A3300` on `#FFCC80`). *Retired* — they are the saturated look v4 exits.
3. **The renamed v4 enum** — `strutplaced` → `strutset` (display "Strut Set"), per [`nims-org-structure.md`](../04-references/nims-org-structure.md) §10 / matrix E-14.

**Resolution:** adopt the essay's muted execution and AA rigor, **restore green = `secured`** (field-correct), **fill the two gaps** (`strutset` = violet, distinct from process-blue; `returned` = warm neutral, distinct from pending-slate), and map to the renamed enum. Every resulting pair is AA-verified above.

### The v4 lifecycle status set
| Token group | Display label | Lifecycle meaning | v3 key |
|---|---|---|---|
| `--status-pending` | Pending | created, not yet worked | `pending` |
| `--status-process` | In Process | work underway | `process` |
| `--status-strutset` | **Strut Set** | strut placed, pre-cut | `strutplaced` (renamed) |
| `--status-cutting` | Cutting | wood being cut to length | `cutting` |
| `--status-runner` | Runner | cut piece in transit | `runner` |
| `--status-secured` | Shore Secured | installed and locked | `secured` |
| `--status-returned` | Strut Equipment Returned | equipment back in inventory (terminal) | `returned` |

`--danger` is a **feedback** color (errors, destructive actions, the `WarningGate` unrated-zone / over-capacity disclosures), **not** a lifecycle status. Success and info reuse the `secured` green and `process` blue hues respectively rather than introducing new tokens.

**`--status-waiting-*` — the amber waiting PRESENTATION (full S12 design audit).** A pending point with a `pendingReason` presents as **Waiting**: amber badge, stripe, value shelf, callout, rolodex tabs/dots (the `.is-waiting` hook rides beside `.is-pending` — [`card.md`](../03-primitives/card.md) §Pending). It is a presentation of `pending`, **never an eighth lifecycle status** — lanes, lockstep, and the reducer see only `pending`, so the table above stays seven rows. Values per theme: light `#7A5A00`/`#FBEFC4` (5.55), dark `#E6BE55`/`#2A2410` (8.73), sunlight `#5C4300`/`#FAE9B8` (7.71 — the one authored **pale-fill exception** to the banner treatment, dark ink on pale amber; the ink darkened from the design's `#6E5000` (6.20) to clear the 7:1 contract), broadcast `#E6BE55`/transparent (10.25). All proven in `wcag-contrast.mjs`.

> **Display labels (resolved 2026-06-01):** the in-progress state keeps the v3 key `process` and displays **"In Process"** — Alex reverted essay 02's "Active," which was never a doctrine decision. The locked state displays **"Shore Secured"** (key `secured`). Token names follow the keys (`--status-process`, `--status-secured`); only the displayed words are fixed here — full copy lives in [`voice-and-tone.md`](voice-and-tone.md).

---

### System colors — the strut-system identity family (`--sys-*`)

A **strut-system color** identifies a *physical Paratech strut system* on the result/recommendation surfaces (the `RecommendationCard`, [`card.md`](../03-primitives/card.md)). It is **identity, not state and not a UI accent** — the operator reads it to find the right strut in the cache, the same job the left color bar does. Gold = LongShore (maps to `--accent`), grey = AcmeThread (maps to `--text-secondary`). The one new token is **`--sys-lockstroke`** (S12, [ADR-011 Addendum 2](../11-decisions/ADR-011-color-token-system.md)).

**Why cyan for LockStroke.** Every LockStroke model is *physically grey* hardware — it shares AcmeThread's load table and its grey body. Coloring it grey on the face would make a LockStroke recommendation indistinguishable from an AcmeThread one. So the LockStroke identity word, left bar, and tells take **cyan** — the **opposite pole from the brand gold** and unmistakable from grey on a screen. It keys off the strut **system**, not its color. (Doctrine: this is a system-ID color, exempt from the one-accent rule for the same reason the emblem is — it never appears on a button, a status, or chrome.)

| Theme | `--sys-lockstroke` | `--sys-lockstroke-bg` | Ratio (text-use, AA) |
|---|---|---|---|
| Light | `#0E7490` | `#ECFEFF` | **4.96** on bg / 5.36 on card ✓ |
| Dark | `#06B6D4` | `#0E262D` | **6.81** on bg / 6.01 on card ✓ |
| Sunlight | `#155E75` | `#ECFEFF` | **7.27** on `#FFFFFF` ✓ — clears the 7:1 sunlight contract |
| Broadcast | `#22D3EE` | `transparent` | **10.04** on bc-bg ✓ — fill is transparent per the broadcast status convention |

All four pairs are emitted by [`wcag-contrast.mjs`](wcag-contrast.mjs) (8 new rows — each theme's color on its bg *and* on its card surface), proven against the same floors the lifecycle status hues meet. The `-bg` companion is the tint a LockStroke chip/badge could sit on; in broadcast it is transparent (a wall of fills reads as noise at 12 ft).

### `--sp-solid` — the third status hook, and the sunlight remap

The shared per-status hooks (`.is-{status}` in [`primitives.css`](../03-primitives/card.md)) carry two values — `--sp-text` (the status text color) and `--sp-bg` (its tint). S12 mints a **third, `--sp-solid`**: the *saturated identifying hue* that must survive every theme, including sunlight's all-white card where `--sp-text` flips to **white** for the banner.

- In **light / dark / broadcast**, `--sp-solid` = the status **text** hue (it equals `--sp-text` there).
- In **sunlight**, `--sp-solid` **remaps to the status `*-bg` solid fill hue** — the saturated banner color — because `--sp-text` is white in that theme and a white stripe/number/dot would vanish on the white card.

This **closes the sunlight-stripe placeholder** (the gate-script's known-gap #11): the shore-point card stripe, the value-shelf number, the waiting callout border, the grouped-stack tabs/dots, and the tablet status-summary dot all read `--sp-solid`, so the status hue is correct in sunlight instead of a placeholder mapping. (`--sp-solid` is a per-status *hook variable*, derived from the status tokens above — it adds no new hue to the palette.)

### The value-shelf status tint — a sanctioned status hue on a card region

The `ShorePointCard`'s measurement value shelf (the KB-6 "Treatment C" answer, [`card.md`](../03-primitives/card.md)) is a **status-tinted region**, not a status-tinted surface. Color is mixed from `--sp-solid` so it survives sunlight:

| Theme | Shelf ground | Hairline |
|---|---|---|
| Light / Dark | `color-mix(--sp-solid 13%, --surface-card)` | `color-mix(--sp-solid 22%, --surface-stroke)` |
| Sunlight | `color-mix(--sp-solid 10%, #FFFFFF)` | (same 22% mix) |
| Broadcast | `color-mix(--sp-solid 18%, --surface-card)` | (same 22% mix) |

The number itself renders in full-strength `--sp-solid`. This is a **C-class treatment** (tint a region) — a B-class one would tint the whole card surface and require a full ADR-011 amendment; tinting a bounded region keeps the one-accent discipline while letting the safety-critical number pop. Recorded as the sanctioned middle in [ADR-011 Addendum 2](../11-decisions/ADR-011-color-token-system.md).

### The filled-primary foreground — `--on-accent`

A filled **primary button** ([`button.md`](../03-primitives/button.md)) fills with `--accent` and needs a foreground that clears WCAG AA on that fill. The required foreground **flips by theme**, because `--accent` itself flips from dark gold (light / sunlight) to light gold (dark): white-on-gold and black-on-gold each fail in one theme, so the pair cannot be a fixed color. `--on-accent` is the per-theme answer, recomputed by [`wcag-contrast.mjs`](wcag-contrast.mjs):

| Theme | `--accent` fill | `--on-accent` | Ratio |
|---|---|---|---|
| Light | `#8C6700` (dark gold) | `#FFFFFF` | **5.18** ✓ |
| Dark | `#D4A017` (light gold) | `#1C1F23` (the warm-slate ink — not pure black) | **6.96** ✓ |
| Sunlight | `#6E5000` (dark gold) | `#FFFFFF` | **7.47** ✓ — clears the 7:1 sunlight contract |
| Broadcast | — | — | n/a — broadcast renders no buttons ([`button.md`](../03-primitives/button.md) surface table) |

This resolves the one token [`button.md`](../03-primitives/button.md) flagged for minting (its lone token dependency); any other `--accent`-filled control inherits it. (Added 2026-06-07; [ADR-011](../11-decisions/ADR-011-color-token-system.md) §Addendum.)

---

## Color is never the only signal (Principle 9)

A hard rule the status palette must honor, because color-blind operators and sunlight-washed screens both defeat hue:
- Every status **badge carries its label as text** ("Cutting", "Secured" — see [`badge.md`](../03-primitives/badge.md)). A color-blind user reads the word.
- Every **selected** state in a picker carries a checkmark, weight change, or border — not just `--accent-subtle` fill.
- The shore-point **card left-edge status stripe** is reinforced by the badge text and the card's status label; the stripe color is redundant, not load-bearing ([`card.md`](../03-primitives/card.md)).
- Sunlight theme escalates status from tinted badge to **solid banner** so the signal survives glare even before hue is read.

---

## Strokes & elevation (color side)

Cards never use a drop shadow; elevation is **stroke + a 1pt top-edge inner highlight at 6% opacity** in light/dark. Shadows are reserved for the three overlay surfaces — **sheets, modals, and the side-drawer** (geometry/blur specified in [`motion.md`](motion.md) / the primitive files; colors here):
| Token | Light | Dark | Sunlight |
|---|---|---|---|
| `--shadow-sheet` | `0 -2pt 16pt rgba(0,0,0,0.08)` | `0 -4pt 24pt rgba(0,0,0,0.18)` | `0 2pt 8pt rgba(0,0,0,0.08)` (cards gain a shadow here) |
| `--shadow-modal` | `0 8pt 32pt rgba(0,0,0,0.12)` | `0 8pt 32pt rgba(0,0,0,0.32)` | `0 4pt 16pt rgba(0,0,0,0.20)` (a centered card still casts under glare) |
| `--shadow-drawer` | `-2pt 0 16pt rgba(0,0,0,0.08)` | `-4pt 0 24pt rgba(0,0,0,0.18)` | `-2pt 0 8pt rgba(0,0,0,0.08)` (sideways inward cast; mirror the x-sign for a left-anchored drawer) |
| card top inner highlight | `inset 0 1pt 0 rgba(255,255,255,0.50)` | `inset 0 1pt 0 rgba(255,255,255,0.06)` | none (2pt stroke does the work) |

The overlay **scrim** is the other color-side overlay treatment: a single `--scrim` token, authored per theme above (40% light/dark, 55% sunlight). It is shared by the overlay surfaces — **sheet, modal, and the side-drawer** mint nothing, they reference it ([`sheet.md`](../03-primitives/sheet.md) / [`modal.md`](../03-primitives/modal.md) / [`side-drawer.md`](../03-primitives/side-drawer.md)) — though the side-drawer uses the scrim **only on phone** (on tablet/laptop it is a companion beside a live canvas, no scrim); the fade *timing* is owned by [`motion.md`](motion.md). **Broadcast has no `--scrim`** — that surface renders no overlays (no sheets, modals, or drawers; see [`picker.md`](../03-primitives/picker.md) surface table). The centered-modal cast shadow **`--shadow-modal`** is a symmetric **downward** cast (positive y-offset, larger blur), distinct from `--shadow-sheet`'s bottom-anchored `0 -Npt …` geometry, because the modal floats at center with no edge to sit flush against ([`modal.md`](../03-primitives/modal.md) Anatomy). The **side-drawer** cast shadow **`--shadow-drawer`** (minted in the table above for the 15th primitive — [`side-drawer.md`](../03-primitives/side-drawer.md), [ADR-019](../11-decisions/ADR-019-side-drawer-primitive.md)) is a **sideways inward** cast (a non-zero x-offset toward the canvas) — the one direction the sheet (up) and modal (down) shadows never covered. Broadcast has none of the three (no overlays).

---

## Theme switching & triggers

| Trigger | Behavior |
|---|---|
| **System** (default) | `prefers-color-scheme` resolves to light or dark, applied to `<html data-theme>` before first paint (carry v3's flash-prevention init). |
| **Manual** | Settings → Appearance: System / Light / Dark / Sunlight. Persisted at `fieldshore_theme` (carried from v3). |
| **Sunlight auto** | When `AmbientLightSensor` is available and permitted, auto-switch to sunlight at **≥10,000 lux** (synthesis §1.5/§4); revert below ~8,000 lux (hysteresis band to avoid flicker). Manual override always wins and pins until cleared. |
| **Broadcast** | Never auto. Entered only by casting/opening the broadcast view from a tablet/laptop; it is a distinct read-only surface, not a user theme toggle. |

The **sync indicator** maps to existing tokens, no new color: synced = `--status-process`, offline/idle = `--status-pending` text, queued writes = `--accent` (amber-gold). State change is instant, never pulsing (it is information, not an alarm — Principle 3/10).

---

## Surface adaptations

| Surface | Color behavior |
|---|---|
| **Phone** | Light/dark/sunlight. Sunlight auto-trigger lives here (the in-building team officer is the sun-exposed role). |
| **Tablet (CP)** | Light/dark. Higher information density tolerates the muted palette; status stripes carry the board at a glance across a room. |
| **Laptop (Toughbook)** | Light/dark; light is the default for after-action/export legibility on a desk. |
| **Broadcast TV** | `broadcast` only. Left-border status accents, no fills, AAA contrast, no animation. |

---

## Accessibility floor

- **Contrast policy:** every text token meets WCAG 2.1 AA for its use class — 4.5:1 normal, 3.0:1 large (≥24px or ≥18.66px bold) and UI components. `--text-tertiary` (light, 3.19:1) is **large/non-essential only**; the design system forbids it for body copy. Broadcast targets AAA 7:1 for all text.
- **Reproducibility:** every ratio in this file is emitted by [`wcag-contrast.mjs`](wcag-contrast.mjs). CI (Phase H) runs it; any token edit that drops a pair below its floor fails the build.
- **Never color-alone** (Principle 9) — enforced per the section above.
- The full per-primitive VoiceOver/TalkBack scripts and the consolidated contrast audit live in [`accessibility.md`](accessibility.md) (authored last in Phase E).

---

## Anti-patterns (do not do these)

- **Raw hex in a component.** Always a semantic token. A primitive that hard-codes `#D4A017` breaks theme-swap and sunlight.
- **A second accent in the UI.** FieldShore has exactly one accent (the gold); a "secondary brand color" is forbidden in product chrome. **Two carve-outs, neither a second UI accent:** (1) the brand **emblem** ([`logo-and-mark.md`](logo-and-mark.md)) is full-color by [`ADR-013`](../11-decisions/ADR-013-brand-emblem-full-color.md) — its aluminum / steel / wood / plywood hues live *only* inside the emblem and never leak into UI tokens; the in-product mark is the single-ink mono mark that inherits `--accent`. (2) the **strut-system colors** (`--sys-*`, §System colors below) are a distinct, fixed family that identifies a *physical strut system* on result/recommendation surfaces — gold = LongShore, grey = AcmeThread, **cyan = LockStroke** ([ADR-011 Addendum 2](../11-decisions/ADR-011-color-token-system.md)). They are identity, not emphasis: a `--sys-*` color never styles a button, a status, or chrome, and the one-gold-accent rule still binds every interactive affordance.
- **Color as the only state signal.** Banned by Principle 9 (see above).
- **Navy + saturated red.** That is the dispatch-console look v4 exits. Status reds are the muted `--danger`, never a fire-engine red header.
- **OLED black (`#000`) as the dark background.** The differentiator is the warm slate `#1C1F23`; `#000` is reserved for sunlight text only.
- **Pulsing/animated status or sync color.** Calm in chaos (Principle 3).
- **Inventing a status hue per call type.** The seven lifecycle tokens are the complete set.

---

## Open questions for the gate

1. ~~**`process` → "Active" display label.**~~ **Resolved (2026-06-01):** displays **"In Process"** (v3 key `process`, reverting essay 02's "Active"); the locked state displays **"Shore Secured"** (key `secured`). `badge.md` / `voice-and-tone.md` inherit these.
2. **Sunlight `process`/`--danger` banners at 6.47–6.70:1.** They clear the essay's ≥4.5 banner floor but not 7:1. Acceptable, or tighten the fills to clear 7:1 for full sunlight-contract consistency?
3. **`returned` visibility.** As a terminal/archival state, should its card be de-emphasized further (e.g., reduced opacity) beyond the warm-neutral hue? Resolved in `card.md` interaction, noted here for the color choice.
