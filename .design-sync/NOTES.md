# design-sync notes — fieldshore-v4

`fieldshore-v4` is a **Vite app, not a published component library** — there's no
barrel export and no library dist entry. The sync treats `src/ui/**` as the design
system (the ~90 components the user wants) and runs in **synth-entry mode** (esbuild
synthesizes an entry from src). Gotchas below are what make that work.

## Build setup (all already in config.json)

- **Self-symlink required.** `package-build.mjs` resolves `PKG_DIR` to
  `node_modules/<pkg>` when no `--entry` is passed, but npm never self-installs an app.
  Create it before every build (gitignored, so it doesn't survive a fresh clone):
  `ln -sfn .. node_modules/fieldshore-v4`. Without it the build dies with
  `ENOENT node_modules/fieldshore-v4/package.json`. **Re-create this on every fresh
  clone / re-sync.**
- **`srcDir: "src/ui"`** scopes discovery to the UI components. Without it, synth-entry
  pulls in `src/app/main.tsx`, `router.tsx`, `routes/*` and the `src/data` layer, which
  drag in `@import "tailwindcss"` (app/styles.css) and break the bundle.
- **`tsconfig: ".design-sync/tsconfig.sync.json"`** (NOT the repo tsconfig). The
  converter's `tsconfigPathsPlugin` (lib/bundle.mjs) tries the bare path before
  `/index.ts`, so a barrel import like `@ui/picker` resolves to the *directory* and
  esbuild errors "is a directory". The sync tsconfig maps all 14 barrel dirs explicitly
  to their `index.ts` **before** the `@*/​*` wildcards (plugin returns first match).
  If new barrel-dir imports appear in src/ui (`from '@core/x'` where `src/core/x/` is a
  dir), add an exact mapping to that file. Do NOT fork `lib/bundle.mjs` (contract file).
- **`extraFonts`** points at the `@fontsource-variable/{geist,inter}/index.css` packages.
  The app imports these in `main.tsx` (scoped out), so the built cssEntry only had
  dangling `/assets/*.woff2` @font-face rules. extraFonts ships the real woff2 + rewrites
  urls. Families: "Geist Variable" (--font-sans / UI), "Inter Variable" (--font-mono /
  numerals, ADR-028 diagonal-fractions).

## Default theme (CRITICAL — without it every component renders colorless)

- Color tokens live ONLY under `[data-theme="x"]` (the app sets it on `<html>`; the
  design tool sets nothing). Without a default, `--accent` etc. are undefined and all
  component chrome renders invisible — for previews AND for any design the agent builds.
- Fix: `.design-sync/default-theme.css` re-declares the **light** theme at
  `:where(:root)` (zero specificity, so explicit `[data-theme="dark|sunlight|broadcast"]`
  still wins). It reaches the styles.css closure via `tokensPkg: "fieldshore-v4"` (resolves
  to repo root through the self-symlink) + `tokensGlob: ".design-sync/default-theme.css"`.
  **Regenerate from `src/app/tokens.css [data-theme="light"]` if tokens change.**
- The conventions header tells the design agent it can switch themes with `[data-theme]`.

## Authoring previews

- `.d.ts` come out as `[key: string]: unknown` STUBS (ts-morph can't flatten inline prop
  types in synth mode) — author from the REAL props in `src/ui/.../<Name>.tsx`, not the .d.ts.
- Previews import `{ Name } from 'fieldshore-v4'`; each named export = one card cell.
- DesignSync write_files needs explicit `localPath` per file (path-only is rejected).

## Authored-preview gotchas (from wave 1 — 24 components, all graded good)

- **Name mapping:** `Input.tsx` exports `TextField`; `Measurement.tsx` exports
  `MeasurementValue`. Both land under the `general/` group (review sheets:
  `general__TextField.png`, `general__MeasurementValue.png`). Preview files, grade
  keys, and `--components` lists must use the EXPORTED name.
- **Inch marks in JSX:** a raw `"` inside a double-quoted attribute breaks the parse —
  use a brace expression `{'47 3/8"'}` or element text.
- **Surface-adaptive components pick their branch by viewport at capture time** (the
  capture browser is desktop-width ≥768px): `PickerSurface`→Popover/dropdown branch,
  `SideDrawer`→phone modal-drawer branch (jsdom has no matchMedia). Both grade good;
  just know which posture a screenshot shows. A narrow `cfg.overrides.<Name>.viewport`
  would force the phone branch if ever wanted (not needed).
- **`Slider` renders its mouse/tap-button branch** in capture (`useHasMouse()` true) —
  the drag track isn't exercisable headless. Spec-correct (ADR-034), not unstyled.
- **Popover/PickerSurface need a real `anchor` RefObject** on a rendered node — wrap a
  `<button ref={anchor}>` trigger in the cell.
- **No `cfg.overrides` needed for any of the 24** — default card mode + viewport worked.

## Wave 2 (feature components) — 23 more authored good; the rest are floor cards by necessity

- **Catalog ids are exact-match** (resolvers silently drop the sub-label on a miss):
  Multi-Base plate id = `multi` (NOT `multi-base`); LongShore strut model string =
  `LS 812` (NOT `LongShore 812`). Check `src/core/load/*` ids when authoring.
- **The 3 `*Diagram` components take NO props** — fixed inline-SVG welcome-slide drawings
  (`className="fs-ob-diagram"`, sized/golded by shipped CSS). Author bare cells.
- **`READ_ONLY_DND` is not re-exported** from the package — hand-write the inert
  `OrgDragApi` literal in a preview (SubTree returns an `<li>`, wrap in `.fs-org-tree>ul`).
- **Floor-carded by necessity (need a seeded-store / router / provider harness, not a
  per-component fix):** ShorePointDetail (TanStack `useQuery` → needs QueryClientProvider),
  SitStat, SitStatRollup, ICS201Brief, RosterStrip (live store hooks), Coachmark (needs a
  live `[data-tour]` DOM anchor, returns null without one), ChecklistHub (`useDepartment()`),
  CreateDepartmentScreen, JoinDepartmentScreen (router + store + camera). Plus the large
  store/router-bound surfaces never attempted: OperationsBoard, OperationsRail, CommandRail,
  CommandWorkspace, OrgChart/OrgDragLayer/OrgFullScreen, OnboardingHost, InventoryScreen,
  ImportExport, and the start/add/return/assign modals. Authoring these would need a
  provider-wrapped preview harness (cfg.provider + seeded fixtures) — a future enhancement.
- **`cfg.overrides`:** CuttingStation `{cardMode:single, viewport:960x720}` (desktop hero
  split, `useIsDesktop` ≥768px); GroupedShorePoint `{cardMode:column}` (rolodex full width).

## Wave 3 (re-sync 2026-06-28 — Auth P3–P5 + OP support + command-transfer + CSV import)

- **31 components uploaded** (10 new + 1 changed + 20 presentation-churned). New authored
  good: `OpPeriodIndicator` (prop-only — needs a full `Operation` object: id/name/
  multiBuilding/inlineDeploy/divisions/saws/status/createdAt/currentPeriod/periods[]),
  `FeedbackSheet` (inject the `api?: FeedbackApi` prop = `{submit: async ()=>({ok:true})}`
  to dodge Firebase). New floor cards (store/hook-bound): `AssignRoleSheet`,
  `AuditLogScreen`, `RoleEditorSheet`, `UserManagerScreen` (admin RBAC stores),
  `OpRolloverCard` (`useCommit`+`useDeviceUid`), `TransferCommand` (`useOrg`/`useOrgCommit`
  + embeds ICS201Brief), `ImportFlow` (4-step import store), `RequireDepartment` (router gate).
- **3 new barrel-dir mappings** were needed in `tsconfig.sync.json` for the admin imports:
  `@core/audit`, `@data/feedback`, `@data/sync` (each a dir → map to its `index.ts`
  BEFORE the `@core/*`/`@data/*` wildcards). Same failure mode as before ("is a directory").
- **`OpPeriod.tsx` exports TWO components** (`OpPeriodIndicator` + `OpRolloverCard`), not one
  named for the file — check exports, don't assume one-per-file.
- **`preview-rebuild.mjs` is NOT auto-staged into `.ds-sync/`.** It lives in the skill's
  `lib/` only. To fix GRID_OVERFLOW targeted-rebuilds: `cp "$SKILL/lib/preview-rebuild.mjs"
  .ds-sync/lib/` then run `node .ds-sync/lib/preview-rebuild.mjs …` (running from the skill
  base dir fails — esbuild only resolves from `.ds-sync/node_modules`).
- **After editing `cfg.overrides`, re-run the FULL `resync.mjs`, not just preview-rebuild.**
  A cardMode change alters render hashes for components that were "unchanged" by source, so
  they must re-enter the upload partition and the `_ds_sync.json` anchor — only the full
  driver recomputes both. (preview-rebuild alone leaves the anchor inconsistent.)
- **14 portal/wide components needed cardMode overrides this run** (the GRID_OVERFLOW set):
  single+primaryStory for fixed/portal overlays (ChecklistTab, FeedbackSheet, FloatingPanel,
  Modal, PickerSurface, Popover, Sheet); column for wide-but-flowable (EmptyState,
  NestedChecklist, Segmented, SideDrawer, Slider, Toggle, WarningGate). GRID_OVERFLOW is a
  presentation warning, non-blocking — but fixing it is cheap and makes the picker cards read.
- **`ChecklistTab` renders as a lone checkbox glyph by design** — it's an edge summon-tab
  affordance, not a panel. Single-mode card looks near-empty but is correct (graded good).
- **`find … -exec sh -c '…'` HANGS in this sandbox.** Build path lists with a flat
  `find … | grep -E "<regex>"` instead of per-item `-exec` subshells.

## `check_design_system` token-scope warning — INTENTIONAL, do not "fix" (2026-06-28)

`check_design_system` is a **claude.ai/design product tool** (runs server-side inside a
Design-project chat — seen as `_[tool: check_design_system]_` alongside `show_html` /
`eval_js` / `fork_verifier_agent`). It is **NOT** in this repo or the design-sync skill, and
**nothing design-sync emits changes what it flags** — it builds its own token registry from
the shipped CSS via "the app's scope filter" (the permissive heuristic described in
`lib/css.mjs:132`). So you can't run it or patch it from Claude Code, and you must NOT add
scope-recognition / ignore-list logic to `css.mjs` or `package-validate.mjs` to chase it —
that's motion without progress (`package-validate.mjs` provably never emits this warning).

It flags ~25 custom properties as "declared under component-style selectors and not registered
as design-system tokens." **Every one is intentional and must NOT be moved to `:root`** —
relocating them breaks sunlight status colors, the org chart, the system-filter chips, and
shadow-DOM theming. The real declarations (verified 2026-06-28):

- **`--sp-solid` sunlight overrides** — `src/ui/primitives/primitives.css:24-38`, scope
  `[data-theme='sunlight'] .is-<status>` (the saturated status hue; in sunlight it must swap
  to `--status-*-bg` to kill the white stripe). Base `.is-<status>` defs at lines 15-21.
- **`--org-line`, `--org-gap`** — `src/ui/command/command.css` `.fs-org` (org-chart connector
  lines/gaps; scoped so the chart owns them, not the global theme).
- **`--chip-color`** — `src/ui/quickfind/quickfind.css:181-183`,
  `.fs-sysfilter-chip--{gold,grey,lockstroke}` (per-chip accent; the whole point is per-variant).
- **`--fs-gs-stroke-strong`** — `src/ui/operations/operations.css:1539` `.fs-gs` (grouped-shore
  marker stroke).
- Plus Tailwind's `--tw-*` internals (75 in the built CSS, on the `*,::before,…` reset and
  `.ring`) — never design tokens.

**Spec for the product-side scope filter** (file as a `check_design_system` bug — these four
rules make it stop flagging the above without anyone moving CSS):
1. Treat a `:root, :host` selector list exactly like `:root`. Tailwind v4 emits `:root,:host`
   for its `@theme` layer so tokens reach shadow DOM (confirmed in the built `dist/assets/
   index-*.css`); props there are real tokens.
2. Ignore any property whose name starts with `--tw-` (Tailwind internals). Never tokens.
3. Treat a compound `[data-theme=<theme>] .is-<status>` selector as a recognized theme-scoped
   override (same class as a bare `.is-<status>`), so the `--sp-solid` sunlight overrides
   register WITH their scope instead of being flagged as orphan component-scoped props.
4. Allow-list as intentionally component-scoped (not tokens): `--org-line`, `--org-gap`
   (`.fs-org`); `--chip-color` (`.fs-sysfilter-chip--*`); `--fs-gs-stroke-strong` (`.fs-gs`).

## Known render warns (triaged — not new on re-sync)

- **[FONT_MISSING] "Inter", "Geist"** — these are the *bare fallback aliases* in the
  token font stacks (`"Geist Variable", "Geist", …`). The primary "* Variable" families
  ship and render; the bare names are OS-local fallbacks that don't need shipping. Benign.

## Render check / playwright

- Chromium installed via `(cd .ds-sync && npx playwright install chromium)` — playwright
  v1228 / Chrome-for-Testing 149. Cache at `~/Library/Caches/ms-playwright/`.

## Re-sync risks

- The self-symlink and `.ds-sync/node_modules` (incl. playwright) are gitignored —
  recreate both on a fresh clone (symlink line above; `cd .ds-sync && npm i` then
  `npx playwright install chromium`).
- `cssEntry` is pinned to a hashed Vite output (currently `index-2nbYp6m1.css`). **It
  changes on every `npm run build`** — ALWAYS `npm run build` first, then re-point
  `cfg.cssEntry` to the new `dist/assets/index-*.css` hash. A stale dist silently ships
  outdated component CSS (this bit wave 2: CuttingStation's hero rules were missing from a
  3-week-old dist). (Better: glob it at re-sync time.)
- Many app-feature components (operations/, command/, dept/) need live Zustand stores /
  TanStack router / Dexie data and **cannot render as standalone cards** — they ship the
  floor card by design. Authoring them faithfully would require provider/data scaffolding.
</content>
</invoke>
