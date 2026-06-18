# UI Primitive: The Badge

> Phase E primitive spec. The **read-only indicator** — a small colored tag that *tells* you something and is never touched. Authored at the depth of [`picker.md`](picker.md).
> Source: essay [`05-essays/02-visual-language.md`](../05-essays/02-visual-language.md) "Color System" + [`06-synthesis.md`](../06-synthesis.md) §4, governed by **Principle 9** (*color is never the only signal*) and **[ADR-010](../11-decisions/ADR-010-status-commit-model.md)** (the status badge cross-fades on commit; no timed undo). Grounded in the **real v3 badge sprawl** — roughly two dozen distinct badge-shaped classes (`.status-badge`, `.di-status-pill`, `.role-badge`, `.hazard-badge`, `.status-dot`, `.lane-count`, …) rendered inline across `app.js` / `style.css`, the way [`card.md`](card.md) is grounded in v3's `renderResults()`. The badge mints **no token of its own** — every value is owned by a sibling and cited (`--radius-badge` / `--space-2` [`spacing-grid.md`](../07-design-system/spacing-grid.md), the `--status-*` palette [`color.md`](../07-design-system/color.md), the seven labels [`voice-and-tone.md`](../07-design-system/voice-and-tone.md), `--motion-status` [`motion.md`](../07-design-system/motion.md)). Distinct from the interactive chip ([`input.md`](input.md)) — see **The read-only boundary**.

---

## Purpose

A badge is a **small, static visual indicator** — a colored pill, a tag, a number, a dot — that carries one piece of information at a glance and asks for nothing back. The operator *reads* it. There is no tap target, nothing to dismiss, no state it owns. It is the quietest primitive in the system and the most frequent: a status, a count, a category, a warning flag.

The reason v3 needs this doc is the same reason [`picker.md`](picker.md) needed its own: **the same conceptual thing looks different in a dozen places.** v3 grew roughly two dozen badge-shaped classes — a status pill here, a drill-down status pill there, a count bubble, a count superscript, a role tag, an "External" tag, a hazard severity chip, an active/staged dot — each hand-styled at its call site with its own padding, radius, and color logic. They are all *the same idea*: a little tag that tells you something. The reference apps the industry uses do not re-invent that tag per screen; FieldShore will not either.

v4 collapses the sprawl into a **small, ruled vocabulary** — five read-only variants, every value cited to the token file that owns it. The badge is where the design system's redundancy promise is kept: because **a badge always carries a word or a number, not a hue alone**, the status it shows survives glare, colorblindness, and a reduced-motion swap with zero information lost (Principle 9).

---

## The variants

v4 ships **five read-only badge variants**. Which one you reach for is determined by *what the tag carries*, not by taste.

| Variant | Carries | Examples | v3 origin |
|---|---|---|---|
| **Status badge** | The shore-point lifecycle state, as its label word | "Cutting Station", "Wood Shore Secured" on a `ShorePointCard`; status pills in the drill-down | `.status-badge`+7, `.di-status-pill` |
| **Count badge** | A number — *inline count* (in a header/row) or *notification count* (superscript on a control) | "12" in a lane header; the quantity superscript on a quick-add button; SP count per status | `.lane-count`, `.ops-tree-count`, `.app-count`, `.quick-add-qty`, `.qv-count`, `.sp-number` |
| **Label / tag badge** | A short categorical word or abbreviation — an attribute, not a status | a NIMS position abbreviation, "External", group index "1 / 3", equipment source | `.role-badge`, `.task-force-label`, `.ext-badge`, `.group-label`, `.apparatus-source` |
| **Severity badge** | A condition needing attention, in the feedback palette, always with a word | "HIGH" / "MITIGATED" on a hazard; "⚠ UNRATED" on a deployed point; a cut-length mismatch | `.hazard-badge` ×4, `.sp-unrated-badge`, `.cut-diff-warning`, `.span-warning` |
| **Indicator dot** | The smallest signal — a color dot **always paired with adjacent text** | active / staged org position; a status swatch in the legend | `.status-dot`, `.legend-swatch`, `.inv-section .dot` |

The **status badge** is the canonical one — safety-critical, the spine of the app, specified in its own section below. The other four are supporting players that obey the same anatomy and the same color-never-alone rule.

---

## The read-only boundary

**Badge vs. interactive chip is a rule, not a judgment call** — the same discipline [`picker.md`](picker.md) imposes on its variants and [`sheet.md`](sheet.md) / [`modal.md`](modal.md) impose on theirs:

| It is a **badge** when… | It is **not** a badge when… |
|---|---|
| You read it and move on | It has a tap target or fires an action |
| It carries information — status, count, category, flag | It carries a control — an `×`, a remove, a toggle |
| It owns no state; it reflects state owned elsewhere | Activating it mutates data |
| Static across its whole life on screen | It can be dismissed, edited, or selected |

> **A badge is read-only. An `×` or a tap target makes it not a badge.**

The one v3 element this excludes is the **assignment chip** (`.app-chip` — an apparatus or individual rendered as a pill with an `×` that removes the assignment, used in the Command org chart). It *looks* like a label badge and *behaves* like a control: it has a dismiss affordance and writes to the operation when tapped. It is a **token/tag-input** pattern and belongs to [`input.md`](input.md), not here. badge.md draws the line and points; it does not document the chip. (Likewise the inline lock glyph `.sp-lock-icon` and any status/shore-type glyph are **icons** owned by [`iconography.md`](../07-design-system/iconography.md); a badge may *contain* one, but a bare icon is not a badge.)

---

## Anatomy

| Property | Value | Token / source |
|---|---|---|
| Shape | **Pill / rounded-rect** for text badges; **circle** for a notification count and an indicator dot | — |
| Corner radius | **6pt** — tightest in the system, half the card's 12pt, so a chip inside a card never competes with the card's own corner | `--radius-badge` — [`spacing-grid.md`](../07-design-system/spacing-grid.md) §Corner radius |
| Internal padding | **8pt** horizontal (a dot/superscript has none) | `--space-2` — [`spacing-grid.md`](../07-design-system/spacing-grid.md) §Spacing tokens ("Badge internal padding") |
| Text | **14 / 500**, the active-label weight; counts use **tabular figures** so a number that changes in place does not jitter | `--type-body-medium` — [`typography.md`](../07-design-system/typography.md); `font-variant-numeric: tabular-nums` §Tabular figures |
| Icon (when paired) | **16px** inline; supplemental, never load-bearing — the word carries the meaning | `--icon-size-sm` — [`iconography.md`](../07-design-system/iconography.md) ("Inline badges, status indicator dots") |
| Color — status | Per-theme `--status-*-text` on `--status-*-bg` tint | [`color.md`](../07-design-system/color.md) §status palette |
| Color — label/tag | `--accent` on `--accent-subtle`, or a neutral surface tint | [`color.md`](../07-design-system/color.md) |
| Color — severity | `--danger` (and the warning hues) — the **feedback** palette, never a lifecycle status | [`color.md`](../07-design-system/color.md) ("`--danger` is a feedback color, not a status") |
| Color — count (neutral) | `--text-secondary` on a surface tint; status-tinted only when it counts a status | [`color.md`](../07-design-system/color.md) |
| Contrast | Every text-on-tint pair clears WCAG 2.1 AA; sunlight white-on-fill clears ≥4.5 (most ≥7) | [`color.md`](../07-design-system/color.md) §Accessibility floor / [`wcag-contrast.mjs`](../07-design-system/wcag-contrast.mjs) |

The badge takes the system's **smallest radius on purpose** — `--radius-badge` is 6pt, exactly half the 12pt card/button radius, so the hierarchy reads correctly when a badge sits inside a card ([`spacing-grid.md`](../07-design-system/spacing-grid.md) §Corner radius). It is the one element with *no* elevation — never a shadow (those belong to the sheet and modal), never a border heavier than the hairline the surface already carries.

---

## The status badge — the canonical, safety-critical variant

The shore-point status badge is the spine of the app and the one badge that is safety-consequential. It carries the lifecycle state on every `ShorePointCard`, drill-down row, and broadcast board. Its rules are mostly *inherited* — locked by the token files — and recorded here so they do not regress.

- **It is its label word, never a color.** The seven display labels are fixed in [`voice-and-tone.md`](../07-design-system/voice-and-tone.md) (their source of record) and this primitive renders them verbatim — it never invents or abbreviates them:

  | enum key | badge label |
  |---|---|
  | `pending` | Pending Equipment |
  | `process` | Equipment Assigned |
  | `strutset` | **Strut Set** |
  | `cutting` | Cutting Station |
  | `runner` | Runner |
  | `secured` | **Wood Shore Secured** |
  | `returned` | **Strut Equipment Returned** |

- **Its color is locked, per theme, by [`color.md`](../07-design-system/color.md)** — `--status-{key}-text` on `--status-{key}-bg`. The badge cites; it never picks a hex.
- **It escalates across themes, and the escalation is the accessibility story:**
  - **Light / dark** — a tinted pill: status text on the matching status tint.
  - **Sunlight** — a **solid full-width banner, white text on the solid status fill** ([`color.md`](../07-design-system/color.md) §Sunlight). A tinted pill loses to 100,000-lux glare; the banner survives it *before* hue is even read.
  - **Broadcast TV** — **a 4pt left-border accent + text**, never a fill — a wall of fills reads as noise at 12 ft ([`color.md`](../07-design-system/color.md) §Broadcast).
- **It cross-fades on commit, and only on commit.** When the operator slides a card to advance ([ADR-010](../11-decisions/ADR-010-status-commit-model.md)), the badge cross-fades from the old status color to the new over `--motion-status` (**250ms**, `--ease-status`) — *confirmation that the transition committed.* It is a **color cross-fade only: no size change, no rotation, no scale.** Reversal plays the same cross-fade toward the previous color. On a card's **first appearance** in a status (a list first rendering) the badge **does not animate** — that would read as load-state noise ([`motion.md`](../07-design-system/motion.md) §What moves).
- **It is redundant, never the sole signal** (Principle 9). On a `ShorePointCard` the status reads three ways — the left-edge stripe, this badge's *word*, and the card's status label ([`card.md`](card.md) owns the **placement**: stripe + badge; badge.md owns the **chip itself**). Remove any one channel and the state is still legible.
- **It is never pulsed or ramped.** Urgency theater is forbidden (Principle 3); the badge confirms a change, it does not manufacture alarm ([`motion.md`](../07-design-system/motion.md) anti-patterns).

---

## v3 grounding — two dozen classes, one vocabulary

v3 renders badge-shaped UI from many call sites with no shared primitive — `.status-badge` in `renderShorePointCards()` (`app.js:5328`), `.hazard-badge` in the hazard log (`app.js:4779`), `.status-dot` in the org tree (`app.js:6981`), count bubbles in lane headers and the drill-down tree (`app.js:5281`, `app.js:6584`), tags scattered through the Command tab. v4 re-sorts every one of them into the five variants above — **by what it carries, not by its v3 markup:**

| v3 class(es) | v4 variant |
|---|---|
| `.status-badge` + 7 status modifiers, `.di-status-pill` | **Status badge** |
| `.lane-count`, `.ops-tree-count`, `.app-count`, `.qv-count`, `.di-count`, `.sp-number`, `.quick-add-qty` | **Count badge** (inline; `.quick-add-qty` is the notification sub-form) |
| `.role-badge`, `.task-force-label`, `.ext-badge`, `.group-label`, `.apparatus-source` | **Label / tag badge** |
| `.hazard-badge-{high,medium,low,mitigated}`, `.sp-unrated-badge`, `.cut-diff-warning`, `.span-warning` | **Severity badge** |
| `.status-dot.status-{active,staged}`, `.legend-swatch`, `.inv-section .dot` | **Indicator dot** |
| `.app-chip` + `.chip-x` | **Not a badge** → [`input.md`](input.md) (interactive chip) |
| `.sp-lock-icon` and other inline glyphs | **Not a badge** → [`iconography.md`](../07-design-system/iconography.md) (icon) |

**What carries forward verbatim:** the WCAG-AA contrast work the v3.5.2 hotfix paid for on the cutting/runner badges is already absorbed into [`color.md`](../07-design-system/color.md)'s verified palette — v4 does not re-derive it. **The v4 gap this closes:** the dozen-ways-to-style-a-tag inconsistency itself — one radius (`--radius-badge`), one padding (`--space-2`), one text token (`--type-body-medium`), one color source (the `--status-*` / `--danger` / `--accent` palette), applied everywhere.

---

## Universal rules

1. **A badge is read-only.** No tap target, no dismiss, no edit. An `×` or an action makes it a chip ([`input.md`](input.md)) or a button ([`button.md`](button.md)), not a badge.
2. **Color is never the only signal** (Principle 9). Every status and severity badge carries its **word**; every indicator dot carries **adjacent text**. A hue with no word is forbidden.
3. **Status words are locked elsewhere.** The seven labels live in [`voice-and-tone.md`](../07-design-system/voice-and-tone.md); the badge renders them verbatim and never abbreviates a status.
4. **Status colors are locked elsewhere.** The `--status-*` palette lives in [`color.md`](../07-design-system/color.md), per theme; the badge cites, never picks a hex. Severity uses `--danger` (feedback), never a lifecycle status token.
5. **One geometry.** `--radius-badge` (6pt), `--space-2` (8pt) padding, `--type-body-medium` (14/500) text, tabular figures for counts — system-wide, not per call site.
6. **Only the status badge animates, and only on commit** — a `--motion-status` color cross-fade, no scale/rotation, none on first render ([`motion.md`](../07-design-system/motion.md)). Every other badge is static.
7. **No urgency theater.** No pulsing, ramping, or blinking badge — not the count, not the severity flag, not the sync dot (Principle 3; [`motion.md`](../07-design-system/motion.md)).
8. **No elevation.** Badges never cast a shadow; shadows belong to the sheet and modal ([`card.md`](card.md) / [`color.md`](../07-design-system/color.md) §Elevation).
9. **A paired icon is supplemental.** When a status or shore-type glyph rides a badge it clarifies; the word still carries the meaning ([`iconography.md`](../07-design-system/iconography.md)).

---

## Surface adaptations

Badges are the **one primitive that renders on every surface, broadcast included** — precisely *because* they are read-only. Where pickers, sheets, and modals vanish on the broadcast board (they are interactive), badges are the board's entire content.

| Surface | Badge behavior |
|---|---|
| **Phone (team officer)** | The canonical tinted pill / count / dot. The status badge sits on the `ShorePointCard`; notification counts ride controls. |
| **Tablet (command post)** | Identical vocabulary; room for fuller label/tag text the phone truncates — no new variants. |
| **Laptop (Toughbook)** | Identical; badges are non-interactive so keyboard focus skips them (the *card* is focusable, not its badge). |
| **Broadcast TV** | **Renders — read-only is the whole surface.** The status badge becomes a **4pt left-border accent + text**, never a fill ([`color.md`](../07-design-system/color.md) §Broadcast); inline counts render with tabular figures; an indicator dot resolves to its **text** (broadcast reads one board, no bare dots at 12 ft). The **notification-count** sub-form does **not** appear — it rides a control, and controls do not render on broadcast. No animation: the board is a snapshot on a 15s poll. |

The **sunlight** theme is the other escalation: the status badge grows from tinted pill to **solid white-on-fill banner** so the signal survives direct sun ([`color.md`](../07-design-system/color.md) §Sunlight). Label/tag and severity badges thicken their hairline to 2pt and bump weight one step with the rest of the sunlight theme ([`typography.md`](../07-design-system/typography.md)), but stay pills.

---

## Accessibility floor

- **The status badge reads as its label word, never as a color** — "Cutting Station," not "yellow." This is already registered in [`accessibility.md`](../07-design-system/accessibility.md) §Screen-reader scripts and is the load-bearing accessibility behavior of the primitive.
- **An indicator dot must have adjacent text.** A bare color dot is mystery meat (Principle 9); the dot is decoration *beside* the word ("Active"), and the screen reader announces the word.
- **A count badge announces what it counts**, not a bare number — "12 shore points in Cutting Station," not "12" — so the figure has a referent for a non-visual user.
- **A severity badge announces its level as a word** — "High severity hazard," "Unrated zone" — and is paired with the consequence text it flags ([`voice-and-tone.md`](../07-design-system/voice-and-tone.md) warning copy), never a red fill alone.
- **Badges are not in the focus order.** They carry no action, so they are not tab stops; the *card or control they sit on* is focusable and speaks the badge inline as part of its own announcement (e.g. the `ShorePointCard` script "Shore point B-2, **Wood Shore Secured**, Division 2").
- **Reduced motion loses nothing.** The status cross-fade collapses to an instant swap ([`motion.md`](../07-design-system/motion.md)); because the badge is a word, the new state is fully legible the instant it switches.
- Per-variant VoiceOver / TalkBack scripts are registered in [`accessibility.md`](../07-design-system/accessibility.md) §Screen-reader scripts.

---

## Anti-patterns (do not do these)

- **A color-only badge.** A hue with no word fails in sun and for colorblind operators (Principle 9). Every status, severity, and dot carries text.
- **A badge with an `×` or a tap action.** That is an interactive chip ([`input.md`](input.md)) or a button ([`button.md`](button.md)) — not a badge. The read-only boundary is a rule.
- **Re-styling a tag at its call site.** One radius, one padding, one text token, one color source — never a hand-rolled pill per screen (the exact v3 debt this doc retires).
- **Re-deriving a status word or color.** The seven labels are [`voice-and-tone.md`](../07-design-system/voice-and-tone.md)'s; the palette is [`color.md`](../07-design-system/color.md)'s. Never hard-code "Strut Installed" or an `rgba(...)`.
- **A status badge that animates on first render**, scales, or rotates. It cross-fades color on commit only ([`motion.md`](../07-design-system/motion.md)).
- **A pulsing or ramping badge** — count, severity, or sync dot. Urgency theater competes with the incident (Principle 3).
- **Severity in a lifecycle color, or a status in `--danger`.** `--danger` is feedback; the `--status-*` tokens are the lifecycle. They do not borrow each other's palette.
- **A bare indicator dot with no neighboring label**, or a count with no referent for a screen reader.
- **A shadow on a badge** to make it "pop." Elevation belongs to the sheet and modal ([`card.md`](card.md)).

---

## Open questions for downstream

1. **Exact per-surface geometry.** Pixel padding, the dot diameter, the notification-count circle size, and the sunlight banner height are affordance geometry finalized in the **vertical slice (Phase H)** — like the sheet's swipe threshold (sheet.md OQ2) and the card's slide mechanics (card.md OQ1). The *vocabulary* (five variants, one radius, one padding, color-never-alone) is fixed here.
2. **Notification-count overflow.** The cap and overflow form for a notification count (`9+`? `99+`? hide past a threshold?) is a Phase F/H call once the screens that carry one are specified. Flagged so it is not silently truncated.
3. **The interactive chip's full spec.** The assignment chip (`.app-chip` + `×`) is excluded here and lands in [`input.md`](input.md) as a token/tag-input pattern; its dismiss mechanics, focus behavior, and SR script are that doc's to write.
4. **Co-rendered shore-type icon + status badge.** When a `ShorePointCard` shows both a shore-type diagram badge ([`iconography.md`](../07-design-system/iconography.md), 24px) and the status badge, their spacing and order on the phone (the floor surface) is an IA decision per screen (Phase F).
