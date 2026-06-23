# Building with FieldShore v4

FieldShore is a field tool for USAR/FEMA rescue-shoring crews — measure a void, pick
struts, run the shoring operation under ICS/NIMS command. Phone-first, glove-friendly,
high-contrast. Build designs out of the real components below; style your own layout
glue with the design tokens (never hand-rolled colors or pixel sizes).

## Theme — REQUIRED to get color

Color tokens are theme-scoped. The bundle ships a **default light theme on `:root`**, so
components are styled out of the box. To use another theme, wrap your design in a themed
container — everything inside inherits it:

```jsx
<div data-theme="dark">   {/* "light" (default) · "dark" (incident ops) · "sunlight" (high-glare) · "broadcast" (text-only) */}
  …your design…
</div>
```

The primitives are plain React — no provider needed. Just import and render:

```jsx
import { Button, Card, Badge } from '<global>';   // window.FieldShore.*
```

## Styling idiom — use components, style glue with tokens

Components carry their own look via internal `fs-*` classes (`fs-button`, `fs-card`,
`fs-badge`, …) — **do not re-style them or reinvent them with raw `<button>`/`<div>`.**
For YOUR layout (spacing, grids, section headers) use the design tokens via `var(--*)`:

| Family | Tokens (real names) |
|---|---|
| Surface | `--surface-bg` `--surface-card` `--surface-card-hover` `--surface-elevated` `--surface-stroke` |
| Text | `--text-primary` `--text-secondary` `--text-tertiary` |
| Accent | `--accent` `--accent-subtle` `--on-accent` (one gold accent — never introduce a second) |
| Status | `--status-{pending,process,strutset,cutting,runner,secured,returned,waiting}-{text,bg}` · `--danger-{text,bg}` |
| Spacing | `--space-1`…`--space-12` (4px step) |
| Type | `--type-display-1/2` `--type-headline-1/2` `--type-body` `--type-body-lg` `--type-body-medium` `--type-caption` `--type-label` `--type-mono` (shorthand: `font: var(--type-body)`) |
| Radius | `--radius-card` `--radius-button` `--radius-input` `--radius-badge` `--radius-sheet` |
| Fonts | `--font-sans` (Geist — UI) · `--font-mono` (Inter — numerals, tabular + diagonal fractions) |
| Elevation | `--scrim` `--shadow-sheet` `--shadow-modal` `--shadow-drawer` (Cards are FLAT — no shadow) |

## Where the truth lives

- `styles.css` — the one stylesheet to link; its `@import` closure carries the tokens,
  fonts, and all component CSS.
- Each component's `<Name>.prompt.md` (usage + cells) and `<Name>.d.ts` (prop contract).

## Idiomatic example

```jsx
<div data-theme="light" style={{ display: 'grid', gap: 'var(--space-4)', padding: 'var(--space-5)', background: 'var(--surface-bg)' }}>
  <h2 style={{ font: 'var(--type-headline-2)', color: 'var(--text-primary)', margin: 0 }}>Division 2 · Side A</h2>
  <Card>
    <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <Badge variant="status" status="cutting" />
      <span style={{ font: 'var(--type-body)', color: 'var(--text-secondary)' }}>SP-14 · 3-Post · LongShore 812</span>
    </div>
  </Card>
  <Button variant="primary" onPress={() => {}}>Deploy strut</Button>
</div>
```

## Catalog

48 components ship rich preview cards (all primitives + pickers + the signature operation
surfaces: Button, Card, Badge, Slider, Toggle, Segmented, Modal, Sheet, SideDrawer,
ShorePointCard, RecommendationCard, CuttingStation, EquipmentRow, QuickFind, …). The
remaining feature components import and work but show a typographic placeholder card — they
need a seeded app store/router to render meaningfully, so prefer the carded ones when
composing new screens.
