# UI Primitive: The Input

> Phase E primitive spec. The **data-entry primitive** — where the operator puts a *value* in. Authored at the depth of [`picker.md`](picker.md).
> Source: essay [`05-essays/02-visual-language.md`](../05-essays/02-visual-language.md) "Input (text field)" + [`05-essays/06-domain-ux.md`](../05-essays/06-domain-ux.md) (measurement & load entry, "The Deduction Ledger") + [`05-essays/07-field-conditions.md`](../05-essays/07-field-conditions.md) rec 10 (the 56pt custom numeric keypad for gloved entry) + [`06-synthesis.md`](../06-synthesis.md) §1.5, §3.4. Governed by **Principle 9** (*color is never the only signal* — focus and error are never a hue alone), **Principle 6 / [ADR-010](../11-decisions/ADR-010-status-commit-model.md)** (a reversible edit never asks "Are you sure?"), and **[ADR-012](../11-decisions/ADR-012-measurement-precision-eighth-inch.md)** (measurements are 1/8″). Grounded in the **real v3 form inputs** — the base field (`style.css:172`), the assignment chip `.app-chip` + `.chip-x` (`app.js:4992` / `style.css:599`), and the feet/inches/fraction measurement split (`index.html:120`, `getMeasurementInches()` `app.js:3403`) — the way [`card.md`](card.md) is grounded in `renderResults()`. The input mints **no token of its own** — every value is owned by a sibling and cited (`--radius-input` [`spacing-grid.md`](../07-design-system/spacing-grid.md); `--accent` / `--danger` / `--surface-*` [`color.md`](../07-design-system/color.md); `--type-mono` + the stacked digit-pair fraction [`typography.md`](../07-design-system/typography.md); `--motion-micro` [`motion.md`](../07-design-system/motion.md)). It **receives three explicit handoffs**: the **interactive chip** deferred here by [`badge.md`](badge.md), the **measurement-display component** deferred here by [`typography.md`](../07-design-system/typography.md), and the **multi-select filter chip** — the v3 strut-system filter (Gold / Grey / LockStroke) — deferred here by [`segmented.md`](segmented.md). Distinct from the picker (choice from a *single*-select set — [`picker.md`](picker.md) / [`sheet.md`](sheet.md)), the segmented control (exactly one of N, inline — [`segmented.md`](segmented.md)), and the toggle ([`toggle.md`](toggle.md)).

---

## Purpose

An input is any control where the operator **enters a value** — a name, a note, a load in pounds, a measurement, a set of assignments. Where the [picker](picker.md) asks *which one* from a defined set, the input asks *what value*, and the set of valid answers is open. It is the second-most-consequential primitive after the [card](card.md): a measurement typed wrong is a strut cut wrong, so the entry path is a safety surface, not a form-field afterthought.

The reason v3 needs this doc is the same reason [`picker.md`](picker.md) and [`badge.md`](badge.md) needed theirs: **the same conceptual act looks different in a dozen places.** v3 grew form fields at `18px`/`2px` here, `13px`/`1px` there (`style.css:172`, `.select-compact` `style.css:1531`, `.login-form input` `style.css:1004`), validated some fields with a toast and a `.focus()` and others with a blocking `alert()`, and entered a measurement through a number box plus a sixteen-option `<select>` of decimals. They are all *the same idea*: a place to put a value. v4 collapses the sprawl into a **small, ruled vocabulary** — one geometry, one validation model, one entry path for the gloved thumb.

---

## Input vs. picker is a rule, not a judgment call

The same discipline [`picker.md`](picker.md) imposes on its variants and [`sheet.md`](sheet.md) / [`modal.md`](modal.md) / [`badge.md`](badge.md) impose on theirs. The boundary is whether the answer is *typed* or *chosen*:

| It is an **input** when… | It is **not** an input when… |
|---|---|
| The operator enters a free value — types, dictates, or builds a set | The operator selects from a fixed, enumerable set → **picker** |
| The valid answers are open/unbounded (a name, a note, a measurement, a load) | The valid answers are a known list (wood size, role, division, incident Level) → **picker** ([`picker.md`](picker.md) / [`sheet.md`](sheet.md)) |
| It holds a value the operator authored | It holds a binary on/off → **toggle** ([`toggle.md`](toggle.md)) |
| It edits a set of assigned values (the tag-input) | It is one of 2–4 mutually-exclusive options (the 1×–4× quantity) → **inline segmented** ([`picker.md`](picker.md) / [`segmented.md`](segmented.md)) |
| It toggles a multi-select **filter** — zero-or-many of a small fixed set (the strut-system filter) | It selects exactly **one** of a small set, always (the theme; wood size) → **segmented** ([`segmented.md`](segmented.md)) |

> **You type an input; you pick a picker.** A `<select>` is never an input in v4.

This is the single largest re-sort in the doc: **v3's `<select>` controls are pickers in v4** (`spDivision`, `spGroup`, `qfHeader`/`qfSole` wood, `newApparatusType`, `hazardType`/`hazardSeverity`, `feedbackCategory` — all `<select>` today, all bound for [`sheet.md`](sheet.md)'s picker-sheet or [`picker.md`](picker.md)'s inline-segmented variant). The input owns **free entry**, the **interactive chip**, and the **multi-select filter chip**. The one place the input and picker primitives interlock is the **measurement field**, whose ⅛″ fraction sub-choice is a small picker living inside an input — specified below.

---

## The variants

v4 ships **seven input variants**. Which one you reach for is determined by *what is entered*, not by taste.

| Variant | Enters | Examples | v3 origin | Commit |
|---|---|---|---|---|
| **Text field** | One line of free text | Operation name, apparatus name, shore-point label, hazard location, source dept | text `<input>` ×11 (`index.html:431`, `:630`, …) | On blur / form submit |
| **Text area** | Multi-line free text | Hazard notes, feedback | `<textarea>` (`hazardNotes`, `feedbackText`) | On form submit |
| **Numeric field** | A number, via the 56pt keypad | Load (lbs); a small bounded count via stepper sub-form | number `<input inputmode="numeric">` (`inputLoad`); `.inv-qty-btn` ± | On blur / form submit |
| **Measurement field** | Feet + inches + ⅛″ fraction → one length | Quick Find opening, shore-point length | `qfFeet`/`qfInches`/`qfFraction` + hidden total | On blur; the cut answer floors to ⅛″ |
| **Search field** | Free text that filters a list live | Division search, apparatus search at scale | `drilldownSearchInput` (`app.js:6638`) | Filters on input (debounced) |
| **Chip / tag-input** | A set of assigned values, each removable | Apparatus / individuals assigned to an org position | `.app-chip` + `.chip-x` (`app.js:4992`) | Each add/remove commits immediately, reversibly |
| **Filter chips (multi-select)** | A subset of a small fixed set of filter predicates — any combination, including none | Strut-system filter (Gold / Grey / LockStroke) in Quick Find | `.system-toggle` ×3 (`toggleSystem()` / `getActiveSystemFilter()`, `app.js:404`) | Each tap toggles one predicate, immediately and reversibly |

The **measurement field** is the canonical, domain-critical one — its own section below, the way [`card.md`](card.md) specifies `ShorePointCard`. The **chip / tag-input** is the [`badge.md`](badge.md) handoff and the **multi-select filter chip** the [`segmented.md`](segmented.md) handoff — each its own section below. The other four obey the shared anatomy and validation model.

---

## The measurement field — the domain-critical variant

A measurement typed wrong is the most expensive input error in the app, so the measurement field is specified at the depth of a card variant. It is a **compound** control: whole feet and whole inches are *entered*, the ⅛″ fraction is *chosen*, and the three resolve to one length in inches.

- **Gloved entry is the design case.** The phone is the floor, and a team officer in the void cannot land an OS keyboard key with a structural glove (essay 07). So the measurement field's primary entry path on phone is a **custom numeric keypad — 56pt minimum keys, 3-column, no letters, centered** (essay 07 rec 10; the 56pt operational floor is [`spacing-grid.md`](../07-design-system/spacing-grid.md)'s). The OS keyboard is the fallback for keyboard/AT users; system dictation is the secondary affordance, with full voice entry deferred to v4.5 ([`accessibility.md`](../07-design-system/accessibility.md) §Non-visual channels).
- **The fraction is ⅛″, not 1/16″** ([ADR-012](../11-decisions/ADR-012-measurement-precision-eighth-inch.md)). v3's `qfFraction` `<select>` carried sixteen decimal options (`0.0625`…`0.9375`); v4 carries **eight** (0, ⅛, ¼, ⅜, ½, ⅝, ¾, ⅞). The fraction is a bounded choice — a small picker inside the field — so its sub-control follows [`picker.md`](picker.md) (inline strip or a picker-sheet; the exact form is an Open question, the value set is fixed).
- **Every measurement renders in Geist Mono, tabular, with the stacked digit-pair fraction** ([`typography.md`](../07-design-system/typography.md)) — the integer at host size, the fraction as a legible ~0.6em component, never `5 3/4` slashed and never the `45¹¹⁄₁₆` codepoint hack. This holds for the value as it is entered *and* as it is read back.
- **Entry is exact; the cut answer floors.** What the operator types is stored faithfully (v3's `getMeasurementInches()` sums `feet*12 + inches + fraction` into a hidden total — carried forward). The **floor-to-⅛″** rounding is a property of the *Effective / cut-to* number on the [`card.md`](card.md) deduction ledger, not of the entry field — the field does not silently round what the operator entered.
- **Bounds carry forward as inline validation.** v3 clamps at 30 ft / 360″ with a toast (`app.js:3408`); v4 keeps the bound but surfaces it inline (see Validation), not as a transient toast.

### The measurement-display component — the shared fraction renderer (handed off from `typography.md`)

[`typography.md`](../07-design-system/typography.md) §Fractions owns the fraction *rule* and explicitly defers the **reusable component** here. It is the **read-only** counterpart to the measurement field — the same digit-pair markup, used wherever a stored measurement is shown rather than entered:

- Markup is composed real digits, not glyph codepoints: `<span class="fr"><span class="n">5</span><span class="d">8</span></span>`. **Stacked is the house default** (numerator over a ruled bar over denominator — the tape-measure form); diagonal is acceptable only for a large display datum.
- Geist Mono, `font-variant-numeric: tabular-nums`, ⅛″ denominators only (2, 4, 8). Values in a column align on the integer's right edge.
- It is the component [`card.md`](card.md) calls for the `RecommendationCard` range, the deduction ledger, and the `cutting`-state cut length; the `ShorePointCard` Required length; and the measurement field's own read-back. **One renderer, every measurement.**
- **Rendered proof already exists** — both render modes behind a live toggle in [`preview/`](../preview/) (the styleguide the gate trio shipped). input.md adds no new preview; it names the component the styleguide already proves.

This is the one part of the input primitive that is **read-only**, and therefore the one part that renders on broadcast (see Surface adaptations) — the same logic that lets [`badge.md`](badge.md) render on broadcast while pickers and sheets do not.

---

## The chip / tag-input — the interactive token field (handed off from `badge.md`)

[`badge.md`](badge.md) §The read-only boundary excludes the **assignment chip** (`.app-chip` + `.chip-x`) by rule — *a badge with an `×` or a tap action is not a badge* — and defers its full spec here. The chip is an input because the field it lives in **holds and edits a set of values**: the operator builds a set of org-position assignments and removes them one at a time. The picker supplies the candidates; the **tag-input holds the result and removes them.**

- **Anatomy.** A pill that **shares the badge's geometry** — `--radius-badge` (6pt, the "status badges, chips" radius, [`spacing-grid.md`](../07-design-system/spacing-grid.md)) and `--space-2` padding — because a chip and a badge look alike on purpose; the **`×` and the two tap targets** are what make it an input, not the shape. Fill is `--accent-subtle` with `--accent` / `--text-primary` text ([`color.md`](../07-design-system/color.md)); it **never borrows a `--status-*` hue** — an assignment is not a lifecycle state.
- **Two distinct controls in one pill.** The **chip body** is a button that opens the assignment (v3: opens the role modal — `openApparatusRoleModal()`); the **`×`** is a *separate* button that removes the assignment (v3: `removeApparatusFromOp()` → `toggleApparatusAssignment(appId, false)`, `app.js:3829`). Each is a real `role="button"`; the `×` keeps its **own ≥44pt hit area** — a behavior v3 already shipped (`.chip-x { min-width:44px; min-height:44px }`, `style.css:600`) and v4 must not regress.
- **Removal is reversible, so it never confirms** (Principle 6 / [ADR-010](../11-decisions/ADR-010-status-commit-model.md)). Removing an assignment commits immediately and is undone by re-assigning — there is no "Are you sure?" because nothing is destroyed and no inventory moves. (Contrast a *strut* un-deploy, which moves inventory and therefore confirms via [`modal.md`](modal.md) — but that is not a chip removal.) The `×` is calm, not danger-colored: `--text-secondary` at rest, emphasizing to `--text-primary` on focus/hover; it does not flash `--danger`, because removal is not destruction.
- **The candidate source is a picker.** Which apparatus or individual the chip represents is chosen from a [`picker.md`](picker.md) variant; the tag-input is the field that *collects* those choices. The exact picker per screen is an IA decision (Phase F).

---

## The multi-select filter chip — bounded multi-select (handed off from `segmented.md`)

[`segmented.md`](segmented.md) §The single-select boundary excludes the **multi-select filter** by rule — *a segmented control is exactly one of N; the instant a control allows zero or many selections, it is not segmented* — and defers it here. The canonical instance is the v3 **strut-system filter**: the Gold / Grey / LockStroke row in Quick Find. It *looks* like a segmented control (and the picker seed listed it as one), but it is built **multi-select** — `toggleSystem()` flips each button's `.active` independently and `getActiveSystemFilter()` returns an **array** of every active system (`app.js:404`), so the operator can show Gold *and* Grey, or none. It is an input because the field **holds and edits a set** — the same reason the assignment tag-input above is one.

- **It filters; it does not store a value.** A filter chip narrows what a list shows; it moves no inventory and authors no operator value. This is why it sits beside the **search field** — the input owns *both* of FieldShore's filter controls, free-text search and bounded multi-select chips — rather than beside the value-entry variants.
- **Zero selected is legal and meaningful** (typically "show all systems," the v3 default). That legal empty set is exactly what disqualifies it from being a [segmented control](segmented.md) (always *one*) and from being a [toggle](toggle.md) row (*one* boolean): a bounded multi-select with a legal empty set is the filter chip, full stop.
- **Selection is never the fill hue alone** (Principle 9). A **selected** chip carries the `--accent-subtle` fill **and** a 2pt `--accent` border **and** a leading checkmark; **unselected** is the at-rest surface chip with a `--surface-stroke` hairline. It shares the badge geometry — `--radius-badge` (6pt), `--space-2` padding, `--type-body-medium` — like the assignment chip, and it **never borrows a `--status-*` hue** (a filter predicate is not a lifecycle state).
- **No `×`, no picker — it is not the tag-input.** The predicate set is fixed (the three strut systems), so each chip toggles on/off *in place*; "removing" a filter is just toggling it off. The assignment tag-input *grows and shrinks* an open set sourced from a picker; the filter chip *toggles* a closed set. Same shape, opposite contract — which is why the two share this primitive but not a section.
- **Each toggle commits immediately and reversibly** (Principle 6 / [ADR-010](../11-decisions/ADR-010-status-commit-model.md)) — the list re-filters at once; no Apply, no confirm, no undo toast. Reversal is toggling the chip back, the multi-select analogue of [`segmented.md`](segmented.md)'s "reversal is re-selection."
- **It announces as a toggle button** — `role="button"` + `aria-pressed` (the v3 mechanism at `app.js:407`), read as *"Gold, filter, selected"* / *"not selected"*, following the [`accessibility.md`](../07-design-system/accessibility.md) registry grammar (*Role · Name · State*).

---

## Anatomy — the base field

| Property | Value | Token / source |
|---|---|---|
| Height | **56pt** operational (the floor for any field touched mid-operation); **48pt** on non-operational surfaces (Settings, department setup) | [`spacing-grid.md`](../07-design-system/spacing-grid.md) §Touch targets |
| Corner radius | **8pt** — softer than the badge (6pt), tighter than the card/button (12pt), so a field reads as its own tier | `--radius-input` — [`spacing-grid.md`](../07-design-system/spacing-grid.md) §Corner radius |
| Padding | **16pt** horizontal | `--space-4` — [`spacing-grid.md`](../07-design-system/spacing-grid.md) §Spacing tokens |
| Background | Card surface (or the elevated surface when the field sits in a sheet / modal) | `--surface-card` / `--surface-elevated` — [`color.md`](../07-design-system/color.md) |
| Border — rest | 1pt hairline (**2pt under sunlight**, like every stroke) | `--surface-stroke` / 2pt sunlight — [`color.md`](../07-design-system/color.md) |
| Border — focus | The accent, applied over `--motion-micro` (100ms) — a visible focus ring, never a hue swap alone | `--accent` — [`color.md`](../07-design-system/color.md); `--motion-micro` / `--ease-micro` — [`motion.md`](../07-design-system/motion.md) |
| Border — invalid | `--danger`, **paired with a message** (never the red border alone) | `--danger` — [`color.md`](../07-design-system/color.md); Principle 9 |
| Label (always visible) | Sits above the field; the placeholder is never the label | `--type-body-medium` (14/500) — [`typography.md`](../07-design-system/typography.md) |
| Field value | Free text at **16pt** (the field-readable floor); **measurements & loads in Geist Mono, tabular** | `--type-body-lg` / `--type-mono` — [`typography.md`](../07-design-system/typography.md) |
| Placeholder | A hint, in tertiary text — disappears on entry, carries no essential meaning | `--text-tertiary` — [`color.md`](../07-design-system/color.md) |
| Helper / error text | Below the field; helper in secondary, error in `--danger` | `--type-caption` — [`typography.md`](../07-design-system/typography.md) |

The field takes **`--radius-input` (8pt) on purpose** — between the badge's 6pt and the card/button's 12pt — so the radius hierarchy stays legible when a field, a chip, and a button share a form ([`spacing-grid.md`](../07-design-system/spacing-grid.md) §Corner radius). Like the card, an input carries **no drop shadow**; elevation belongs to the sheet and modal it may sit inside.

---

## Validation & error — inline, specific, never color-alone

This is the input's load-bearing v4 correction, and the reason the primitive earns its own validation section.

- **Errors are inline, not transient.** v3 reports a bad field with a `showToast(...)` plus `.focus()` (e.g. empty operation name, `app.js:5518`) or, worse, a blocking `alert()` ("Need at least 2 assigned apparatus", `app.js:3839`). v4 closes this: an invalid field carries **`aria-invalid` + a message in `--danger` beside it** ([`accessibility.md`](../07-design-system/accessibility.md) §Open questions names `aria-invalid` form messaging as one of the three v3 gaps the vertical slice closes). A toast is confirmation/notification only ([ADR-010](../11-decisions/ADR-010-status-commit-model.md)); an `alert()` never carries forward.
- **The message names what failed and what to do** ([`voice-and-tone.md`](../07-design-system/voice-and-tone.md)): "Operation name is required," "Measurement exceeds the 30 ft maximum" — not "Invalid input," never "Something went wrong." Sentence case, no exclamation mark.
- **Color is never the only signal** (Principle 9): the error is the `--danger` border *and* the message text. A red ring with no words fails in sun and for a colorblind operator — the same rule [`modal.md`](modal.md) states for an invalid field.
- **Validation does not block keystrokes.** It resolves on blur / submit, not on every character; an input never triggers an async loading state (there are no remote lookups in a field — the parallel of [`picker.md`](picker.md) rule "all picker data is local").
- **The v3 safety behaviors carry forward verbatim:** `validateInput(value, maxLen)` (strips control characters, enforces `maxlength`) and `inputmode="numeric"` on number fields — both are real v3 hardening, kept, not re-derived.

---

## v3 grounding — one vocabulary, and what is *not* an input

v3 renders entry UI from many call sites with no shared field primitive. v4 re-sorts each by *what is entered*, **not** by its v3 markup:

| v3 control | v4 variant |
|---|---|
| text `<input>` — op name, apparatus name, SP label/building/area, hazard location, source dept/apparatus, individual name, role person | **Text field** |
| `<textarea>` — `hazardNotes` (500), `feedbackText` (2000) | **Text area** |
| number `<input inputmode="numeric">` — `inputLoad` / `spLoad` | **Numeric field** (keypad) |
| `qfFeet`/`qfInches` + `qfFraction` `<select>` + hidden `inputLength` | **Measurement field** (compound) + the measurement-display component |
| `drilldownSearchInput` (live filter, no debounce) | **Search field** (debounced) |
| `.app-chip` + `.chip-x` (`app.js:4992` apparatus, `:5038` individual) | **Chip / tag-input** |
| `.system-toggle` ×3 — Gold / Grey / LockStroke, **multi-select** (`toggleSystem()` / `getActiveSystemFilter()` returns an array, `app.js:404`) | **Filter chips** (multi-select) — deferred here by [`segmented.md`](segmented.md) |
| `.inv-qty-btn` ± stepper | **Numeric field** — bounded-count stepper sub-form |
| `<select>` — division, group, apparatus type, hazard type/severity, feedback category, header/sole wood | **Not an input → picker** ([`sheet.md`](sheet.md) / [`picker.md`](picker.md)) |
| checkbox — `qfDeductionToggle`, `opMultiBuilding` | **Not an input → toggle** ([`toggle.md`](toggle.md)) |
| `.qty-btn` 1×–4× (`role="radiogroup"`) | **Not an input → inline segmented** ([`picker.md`](picker.md) / [`segmented.md`](segmented.md)) |
| file `<input>` — inventory import | **Platform file picker** — OS-owned; outside the custom-field vocabulary |

**What carries forward verbatim:** `validateInput()`'s control-char stripping + `maxlength`, `inputmode="numeric"`, the chip-`×` 44pt hit area, `getMeasurementInches()`'s feet/inches/fraction summation, and the strut-system filter's **multi-select semantics** (`toggleSystem()` / `getActiveSystemFilter()`'s array — show many, one, or none; only its routing and styling change). **The v4 gap this closes:** the per-call-site geometry sprawl (one `--radius-input`, one 56pt height, one focus token everywhere), the toast/`alert()` validation debt (inline `aria-invalid` instead), and the strut-system filter's misnaming (a multi-select filter dressed as a "toggle" and seeded as a "segmented").

---

## Universal rules

1. **A label is always visible; the placeholder is a hint, never the label.** A field whose only label is its placeholder loses its name the instant the operator types.
2. **You type an input; you pick a picker.** Free entry is an input; a choice from a fixed set is a [picker](picker.md); a binary is a [toggle](toggle.md). A `<select>` styled as a field is the anti-pattern.
3. **Measurements and loads render in Geist Mono, tabular, with the stacked digit-pair fraction** ([`typography.md`](../07-design-system/typography.md)) — entered and read back. Never proportional numerals, never `5 3/4`, never the codepoint hack.
4. **Validation is inline, specific, and never color-alone** — `aria-invalid` + a message that names the failure and the fix ([`voice-and-tone.md`](../07-design-system/voice-and-tone.md) / [`accessibility.md`](../07-design-system/accessibility.md)), not a toast and not an `alert()`.
5. **One geometry** — `--radius-input` (8pt), 56pt operational height, `--space-4` padding, focus = `--accent` over `--motion-micro`. System-wide, not per call site.
6. **The 56pt numeric keypad is the gloved-entry path** for measurements and loads; the OS keyboard is the keyboard/AT fallback, dictation the secondary affordance (essay 07; voice deferred to v4.5).
7. **A reversible edit never confirms** (Principle 6 / [ADR-010](../11-decisions/ADR-010-status-commit-model.md)): removing a chip just removes it (undone by re-assigning). Only a destructive or inventory-moving action confirms, and that is a [modal](modal.md), not a field.
8. **Color is never the only signal** (Principle 9): focus is a visible ring (not hue alone); an error is border + message (not red alone).
9. **No drop shadow on a field.** Elevation belongs to the sheet/modal it may sit in ([`card.md`](card.md)).

---

## Surface adaptations

| Surface | Input behavior |
|---|---|
| **Phone (team officer)** | The floor. 56pt full-width fields; the **custom 56pt numeric keypad** is the measurement/load path. Large forms (Start Operation, Add Shore Point) live in the full-screen-form [`modal.md`](modal.md); short entries in a [`sheet.md`](sheet.md). |
| **Tablet (command post)** | Same fields, denser forms; a paired hardware keyboard is honored. The CP is where multi-field forms are most used (Start Operation, Add Apparatus). |
| **Laptop (Toughbook)** | **Keyboard-first**: Tab order follows reading order, Enter submits the safe action, `<textarea>` may `resize: vertical`, search fields show a visible clear. The OS keyboard supersedes the on-screen keypad. |
| **Broadcast TV** | **Entry controls never render** — inputs are interactive and broadcast is read-only ([`picker.md`](picker.md) / [`sheet.md`](sheet.md)). The **measurement-display component does render** (it is read-only), as the large value beside its label; no field, no keypad, no chip `×`. |

The **sunlight** theme thickens every field border 1pt → 2pt and bumps the value/label weight one step with the rest of the theme ([`color.md`](../07-design-system/color.md) / [`typography.md`](../07-design-system/typography.md)); the field stays a field. The focus ring stays `--accent` — under sunlight the accent is the 7:1 `#6E5000`, so the ring survives glare.

---

## Accessibility floor

- **Every field is a programmatically labeled control** — a real `<label for>` or `aria-labelledby`, not a visually-adjacent `<div>`. The placeholder is never the accessible name.
- **Invalid state is announced, not just colored** — `aria-invalid="true"` + `aria-describedby` pointing at the message, announced **politely** (never `aria-live="assertive"` for a routine field error). This is one of the three v3 gaps [`accessibility.md`](../07-design-system/accessibility.md) commits to the vertical slice (v3 uses `alert()` / toast and has no `aria-invalid`).
- **The measurement keypad is fully operable** — 56pt keys, each individually labeled; the field announces per the registry grammar (*Role · Name · State · Action hint*): **"Opening measurement, text field, 18 and one-half inches."** Numbers speak as the field says them — eighths as spoken fractions, never raw decimals ([ADR-012](../11-decisions/ADR-012-measurement-precision-eighth-inch.md)).
- **Power Select fallback** — where the ⅛″ fraction (or any bounded sub-choice in a field) would otherwise be a custom control, VoiceOver / TalkBack and "Native Controls" get the OS-native `<select>` ([`accessibility.md`](../07-design-system/accessibility.md) §The Power Select fallback). A custom control never wears native semantics it does not honor.
- **The chip is two labeled buttons** — the body ("Button, Rescue 2, Rescue Group Supervisor. Double tap to reassign.") and the remove ("Button, Remove Rescue 2 from Rescue Group Supervisor."), both keyboard-operable; the v3 delegated Enter/Space handler (`app.js:8756`) carries forward.
- **Focus is visible** and meets the non-text-contrast bar (the `--accent` ring); focus order follows reading order ([`accessibility.md`](../07-design-system/accessibility.md) §Focus & keyboard).
- **Reduced motion** collapses the focus transition to an instant state change ([`motion.md`](../07-design-system/motion.md)); nothing is lost.
- **Type scales** — fields reflow and survive 200% zoom without horizontal scroll (the AA resize floor, [`accessibility.md`](../07-design-system/accessibility.md)).
- **Screen-reader scripts register in [`accessibility.md`](../07-design-system/accessibility.md) §Screen-reader scripts** following its grammar: the text field, the search field, the numeric/measurement field (already listed there), the chip body, and the chip remove. This doc writes them; that file is their registry.

---

## Anti-patterns (do not do these)

- **A placeholder as the only label.** It vanishes on the first keystroke, taking the field's name with it.
- **A `<select>` styled to look like a field, or an input where a picker belongs.** Free entry is an input; a defined set is a picker (the boundary rule). A toggle is not an input; the 1×–4× quantity is a segmented picker.
- **A multi-select filter built as a segmented control (or a single-select choice built as filter chips).** Filter chips are zero-or-many — the strut-system filter shows Gold *and* Grey, or none; a segmented control is exactly one, always ([`segmented.md`](segmented.md)). Choose by how many can be active at once, never by how the button row looks (the v3 `.system-toggle` was misread as a "toggle" *and* seeded as a "segmented" precisely because it *looks* like one).
- **A toast or `alert()` as the validation channel.** The v3 debt does not carry forward — inline `aria-invalid` + a message instead.
- **A red border with no message.** Color-only error fails in sun and for colorblind operators (Principle 9).
- **Proportional numerals, `5 3/4` slashed, or the `45¹¹⁄₁₆` codepoint hack in a measurement.** Use the stacked digit-pair component ([`typography.md`](../07-design-system/typography.md)).
- **The OS keyboard as the *only* measurement path on phone.** The 56pt keypad is the gloved path; the OS keyboard is the AT/keyboard fallback, not the design target (essay 07).
- **A chip remove `×` smaller than 44pt**, or a chip that is one tap target instead of two — v3 already fixed the hit area; do not regress it.
- **"Are you sure?" before removing a chip**, or any confirmation on a reversible edit (Principle 6 / [ADR-010](../11-decisions/ADR-010-status-commit-model.md)).
- **Validating on every keystroke**, or a field that triggers an async loading state (there are no remote lookups in a field).
- **Re-styling a field per call site.** One radius, one height, one focus token — never a hand-rolled `18px`/`2px` field per screen (the exact v3 debt this doc retires).
- **A drop shadow on a field** to make it "pop." Elevation belongs to the sheet and modal ([`card.md`](card.md)).

---

## Open questions for downstream

1. **Exact measurement-keypad layout.** The ft / in / fraction arrangement, and whether the ⅛″ fraction is an inline strip or a small picker-sheet (8 values sits just past [`picker.md`](picker.md)'s 7-option boundary), is affordance geometry finalized in the **vertical slice (Phase H)** — like the card's slide mechanics ([`card.md`](card.md) OQ1) and the sheet's swipe threshold ([`sheet.md`](sheet.md) OQ2). The *doctrine* (56pt keys, Geist Mono, stacked fraction, exact entry / floored cut answer) is fixed here.
2. **`aria-invalid` inline-validation utility + the `.sr-only` utility.** Both are v3 gaps [`accessibility.md`](../07-design-system/accessibility.md) §Open questions commits to the Phase H slice, not to this design phase. Flagged so the inline-error model above is not expected as built code in Phase E.
3. **Search-field debounce + clear affordance.** v3's `drilldownSearchInput` filters on every keystroke with no debounce; the debounce interval and the clear-button form are a Phase H call. Flagged so the "no async, debounced" rule is not silently dropped.
4. **The tag-input's candidate picker per screen.** Which [`picker.md`](picker.md) variant supplies a chip's value (and the empty-state copy before any assignment exists) is an IA decision per screen (Phase F).
5. **Stepper bounds.** The min/max and long-press-to-repeat behavior of the numeric-field stepper sub-form (v3's `.inv-qty-btn`) are finalized with the Inventory workflow (Phase G).
6. **The filter chip's selected-state geometry.** The exact selected treatment (fill + border weight + checkmark-vs-filled-dot affordance) and the chip height in the operational row are affordance geometry finalized in the **vertical slice (Phase H)**, like the measurement-keypad layout (OQ1). The *contract* — bounded multi-select, zero-is-legal, immediate + reversible, color-never-alone, no `×` / no picker — is fixed here.
