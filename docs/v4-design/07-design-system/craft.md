# Craft — the elevation language (Stage 1, epic #430)

> Accepted by Alex 2026-07-05 from the in-chat mockup round (Inventory dark + Settings dark
> + Inventory sunlight). This is **execution doctrine on top of the locked system** — it
> changes no token values, no theme set (ADR-011), no accent (ADR-013), no motion scale
> (motion.md). It governs how screens COMPOSE what already exists. Rolled out worst-first:
> Inventory + Settings (#431) → Operations (#432) → Quick Find (#433) → Command (#434),
> cohesion sweep (#435). Baseline evidence: `.claude/audits/v4-visual-elevation-2026-07/`.

## 1. Numerals are the heroes

A screen exists to answer one question, and the answer is almost always a number
("how many can I still grab", "what length do I cut"). That number renders as a **hero
numeral** — `--type-mono-hero` (600 22px Inter, tabular) — and never renders smaller
than the label that names it.

- **Dominant / denominator pattern:** in `N / M` figures the numerator is the hero;
  `/ M` renders as `--type-mono` at `--text-tertiary`. The two never share weight.
- **Stat figures** (supporting rollups) use `--type-mono-stat` over a `--type-caption`
  micro-label in `--text-secondary`/`--text-tertiary`.
- All numerals are tabular (`--font-mono` carries `tabular-nums`); measurement strings
  (36″ – 57″) use `--type-mono`.

## 2. Stat strip

A quiet row of 2–4 stat figures directly under the screen context, answering the screen's
top-level question before any scrolling: `53 on hand · 9 deployed · 18 models`. Figures at
`--type-mono-stat`, labels at `--type-caption`. No card, no border — whitespace-separated.
One figure MAY carry the accent when it is the "committed to the incident" number.

## 3. Card anatomy v2 — content out-elevates chrome

Data groups live on **cards**; controls sit on the page. (The baseline had this inverted:
buttons had surfaces while equipment rows were bare hairlines.)

- Recipe (all tokens pre-existed): `background: var(--surface-card)`;
  `border: var(--stroke-width) solid var(--surface-stroke)`;
  `border-radius: var(--radius-card, 14px)`; `box-shadow: var(--card-top-highlight), var(--card-shadow)`.
- Interior rows separate with `--surface-stroke` hairlines that **drop on `:last-child`** —
  a card never ends in a dangling rule.
- Group label (uppercase `--type-label`, tracked) sits OUTSIDE the card, with a right-aligned
  count (`N models`) on the same baseline.

## 4. Depletion bar

A 3px bar under a stock row's identity encodes `available / quantity` pre-attentively:

- Track `--surface-stroke`; fill `--text-tertiary` (healthy).
- **Running low** (`available ≤ ⅓ quantity`, still > 0): fill switches to `--accent` and the
  row may carry a "running low" chip.
- **Out** (`available = 0`): bare track; the hero numeral and an `all N deployed` chip take
  `--status-cutting-*` (the attention pair already AA-verified per theme — solid-fill in
  sunlight by that theme's own rules).
- Static this stage; animating the fill is a Stage 3 (#435) candidate under `--motion-status`.

## 5. Gold budget

The one-accent doctrine (ADR-011/013) failed in EXECUTION, not in principle: baseline screens
carried 5–8 simultaneous gold elements. The budget:

- **≤ 2 gold elements per view** in addition to the nav's active state: normally the single
  primary action + at most one selection/status accent.
- One selected-state family per view may use the accent border + `--accent-subtle` treatment;
  every other selection reads through ink/weight.
- Secondary and utility actions are neutral (`secondary`/`tertiary` variants); they never
  compete with the primary in color.
- The "deployed" chip counts as the one status accent on Inventory (equipment committed to
  the incident is the operationally-relevant highlight).

## 6. One title per screen

The chrome (AppHeader) owns the screen title on phone. Screens render **context**, never a
second `h1` of the same word: subtitle (`Hartsdale FD · 5 apparatus`), stat strip, actions.
The header's version tag was dev chrome — the build identity lives in Settings' footer and
About, not on every screen.

## 7. Tap targets vs. visual weight

Control hit areas stay ≥ 56px (the floor is untouchable). Visual weight may be lighter than
the hit area — a 44px-looking stepper extends its touch target to 56px via padding/expanded
hit box, never by shrinking the target.

## 8. Copy carries no plumbing

System enums, v3 color-code jargon, and internal terminology never surface in user copy:
`Gold (LongShore)` → **LongShore** (single shared label map, `src/ui/inventory/systemLabels.ts`).
Row descriptions in settings lists say what the user gets, not what the module is called.

## 9. Workstation heroes (Stage 2a addendum, #432)

The numeral ramp has three steps, one per altitude:

- `--type-mono-stat` (17px) — stat-strip figures, queue-row numerals.
- `--type-mono-hero` (22px) — a **card's** dominant value (the measurement shelf).
- `--type-mono-display` (64px) — a **workstation's** one action number (the Cutting
  Station cut length). At most one display numeral on screen; it may carry the
  workstation's status hue (cutting amber) — that is the status accent, not gold.

Every hero numeral carries a micro-label naming WHICH number it is (`OPENING` /
`EFFECTIVE` / `CUT` / `ELAPSED`), and a workstation hero spells its math out in a quiet
caption line ("Opening 54″ − 6×6 header + footer − 1½″ wedge") — the number is
checkable on scene, never an oracle.

Queue rows show **position numerals** (1, 2, 3…), never a decorative affordance: a grip
that doesn't drag is a broken promise; the numeral states a fact.

## Rollout state

| Screen | Status |
|---|---|
| Inventory + Settings (#431) | built with this doc (exemplar) — punch-list pass applied |
| Operations + Cutting Station (#432) | built with this doc (Stage 2a) |
| Quick Find (#433), Command (#434) | pending delta-mockups |
| Motion finesse + empty states (#435) | pending |
