# System Architecture — the whole-system map

> Phase H pre-slice scaffold, design-system doc. Authored at the depth of [`03-primitives/picker.md`](../03-primitives/picker.md).
> Source: essays [`05-essays/01-architecture.md`](../05-essays/01-architecture.md) (folder tree, build config, stack, event flow) and [`05-essays/12-tech-debt.md`](../05-essays/12-tech-debt.md) §8/§30 (seam decomposition, line budget, lint floor), **translated to the accepted Phase H ADRs — not transcribed**. Where the essays predate the ADRs (monorepo paths, "v4.5 hub," demo mode, visible-but-disabled toggle), this doc follows the ADR. Resolves open question [#24](../99-open-questions.md), closes board [#310](https://github.com/Vergo402/paratech-struts/issues/310). The seam *contracts* live in the companion [`module-boundaries.md`](module-boundaries.md); this doc is the map, that doc is the constitution.

---

## Purpose

This is the single map of what v4 is built on and how a tap becomes a saved, synced event — the thing a new contributor (or a future Claude session) reads instead of re-reading twelve essays. It owns the **shape of the whole**: the folder tree, the two entry points, the build, the data-flow story, how the stack fits together, and the two guardrails that keep it from collapsing back into one file. It does **not** own the seam-by-seam import contracts — those are [`module-boundaries.md`](module-boundaries.md)'s job.

**One framing rule governs the entire system: the architecture's job is to disappear.** Every load-bearing call below is a choice about *which thing vanishes* in service of the work the firefighter and the IC are actually doing (essay 01 §10). A 200 KB bundle is what lets the type ramp render at 60 fps on a Toughbook over a hotspot. A pure typed core is what lets a structural-collapse SME read the load math and trust it. The right answer is always the one the user never has to notice.

---

## The single package, two entry points

v4.0 ships as **one package** — not a monorepo, not React Native ([ADR-005](../11-decisions/ADR-005-single-package-pwa.md)). The Turborepo monorepo and the React Native shell are the v5.0 fork, not v4.0 work. Package-boundary discipline is enforced by folder structure plus ESLint import rules plus a CI boundary check, *not* by separate packages — which holds the line exactly as well inside one package, without the wiring ([ADR-005](../11-decisions/ADR-005-single-package-pwa.md) rationale).

```
fieldshore/
├── index.html               # the single mount shell (one <div id="root">)
├── vite.config.ts           # one Vite config (see Build)
├── tsconfig.json            # TS strict (see TypeScript)
├── eslint.config.js         # the boundary check + lint floor live here
├── database.rules.json      # GENERATED from the Zod schema; CI asserts match
├── public/
│   └── plates/*.jpg         # plate thumbnails — were base64 in app.js, now static
└── src/
    ├── app/                 # entry point 1: the field PWA (v4.0 ships this)
    │   ├── main.tsx         #   mounts the React tree into #root
    │   └── routes/          #   TanStack Router route tree
    ├── site/               # entry point 2: reserved (marketing/docs) — empty in v4.0
    ├── core/               # PURE domain. No React. No Firebase. Typed in, typed out.
    │   ├── load/           #   load tables + conservative-floor engine
    │   ├── shorepoint/     #   status state machine + reducer
    │   └── operation/      #   operation model reducer (fans out to shorepoint)
    ├── data/               # the ONLY place Firebase exists
    │   ├── sync/           #   the data/sync seam: queue, flush, reconcile, diagnostics
    │   └── store/          #   local-first persistence (IndexedDB via Dexie) + event log
    └── ui/                  # the React component layer — reaches data only via repo hooks
        ├── quickfind/  operations/  inventory/  command/  settings/  checklists/
        └── picker/         #   the picker primitives (incl. VisualGridPicker)
```

The two entry points are the **only** intra-package split v4.0 carries. `src/app/` is the field PWA — the whole of v4.0. `src/site/` is reserved for the eventual marketing/docs front door (the essay's `apps/marketing`, demoted to a reserved folder; the marketing site + demo mode are dropped from v4.0 scope per the synthesis Q4 / [ADR-024](../11-decisions/ADR-024-d5-multi-device-build-a.md)). Both share `core/`, `data/`, `ui/` when `site/` is built — one design system, one front door for now.

> **Translation note.** Essay 01 §3 and essay 12 §1 use monorepo paths (`packages/core/...`, `apps/field/...`). Those predate [ADR-005](../11-decisions/ADR-005-single-package-pwa.md) and are **not** used here: every path is single-package (`src/core/*`, `src/data/*`, `src/app/`, `src/site/`). The folders extract cleanly into a Turborepo at v5.0 via `git mv src/core/ → packages/core/`, history intact — the seam discipline is what makes that mechanical rather than a rewrite.

---

## The eleven module seams

The codebase is **eleven module seams plus the picker primitives** — named byte-identically in [ADR-005](../11-decisions/ADR-005-single-package-pwa.md) and [ADR-007](../11-decisions/ADR-007-build-system-typescript-strict.md), and identically in [`module-boundaries.md`](module-boundaries.md):

`core/load` · `core/shorepoint` · `core/operation` · `data/sync` · `data/store` · `ui/quickfind` · `ui/operations` · `ui/inventory` · `ui/command` · `ui/settings` · `ui/checklists` — plus `ui/picker` primitives.

Essay 12 §1 sketched a richer internal breakdown (`core/doctrine`, `core/data`, `core/workflow`, `core/schema`, `core/id`). Those may appear as **sub-structure inside** a named seam (e.g. the Zod schema lives inside `core/`, ID minting is a util inside `core/`), but they do **not** expand or rename the canonical eleven. The map and the constitution name the same eleven, identically to the ADRs. Each seam's purpose, import contract, and the v3 lesson it carries are in [`module-boundaries.md`](module-boundaries.md) — this map only places them.

The boundary that makes the list load-bearing: **no Firebase import lives outside `data/` (`data/sync`, `data/store`); no React lives inside `core/*`; `ui/*` reaches data only through repository hooks, never Firebase directly** ([ADR-005](../11-decisions/ADR-005-single-package-pwa.md) / [ADR-007](../11-decisions/ADR-007-build-system-typescript-strict.md)).

---

## The build

**Vite + `vite-plugin-pwa`, one config** ([ADR-007](../11-decisions/ADR-007-build-system-typescript-strict.md)). Vite is esbuild in dev (single-digit-ms HMR), Rollup for the production build (code splitting, tree shaking; critical-path bundle targets well under 200 KB gzipped). v3's "edit `app.js`, push, wait for GitHub Pages" loop is retired — it carried no static analysis, which is the root cause of half the audit findings (essay 12 §"no build deploy").

Two build facts ride this choice and matter to the data layer:

- **`vite-plugin-pwa` retires the hand-maintained `sw.js`.** The per-release `CACHE_NAME` bump goes away; cache invalidation is automatic on the manifest hash. The Workbox config is generated. **The one v3 behavior that survives the retirement: the Firebase WebSocket exclusion becomes a Workbox runtime route rule** — the realtime socket is never cached, exactly as `sw.js` excluded it in v3 ([ADR-007](../11-decisions/ADR-007-build-system-typescript-strict.md); essay 01 §4).
- **`database.rules.json` is generated, not hand-written.** The single Zod schema generates the rules; the client validates against the same schema; CI asserts the generated file matches the committed one ([ADR-023](../11-decisions/ADR-023-component-state-stack.md), [ADR-009](../11-decisions/ADR-009-database-firebase-rtdb.md)). This is the permanent fix for the v3.8.2 silent-validation class (L-5; [`module-boundaries.md`](module-boundaries.md) `data/sync`).

The CI gate is a ship prerequisite: `tsc --noEmit`, ESLint (with the boundary check + lint floor below), Vitest (incl. the load-table snapshot test), and the rules-match assertion. No PR merges without all passing. The accepted cost is a ~17-minute push-to-prod loop vs. v3's ~15 ([ADR-007](../11-decisions/ADR-007-build-system-typescript-strict.md) consequences).

---

## TypeScript strict

**Strict from line one** ([ADR-007](../11-decisions/ADR-007-build-system-typescript-strict.md)): `strict`, `noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess` all on. ~30% of the v3 audit findings are the class a compiler catches at compile time — the `customRoles`-array assumption, inventory-item shape drift, role assignment to a deleted role, the null-guard hand-discipline v3 enforced site-by-site by eye. Strict TS moves that class from runtime + hand-discipline to compile time. JSX default-escaping plus a `react/no-danger` lint error retires the `escapeHtml`/`escapeAttr` discipline *entirely* — there is no `dangerouslySetInnerHTML` path, so there is no escaping to get wrong (L-3; [`module-boundaries.md`](module-boundaries.md)).

---

## How the stack fits as one whole

The component + state stack ([ADR-023](../11-decisions/ADR-023-component-state-stack.md)) fills the `ui/*` seams and bridges to `data/`. The whole, top to bottom:

| Layer | Library | What it owns | Lives in |
|---|---|---|---|
| Behavior + a11y | **Radix headless** | focus trap, roving tabindex, dismiss semantics — *behavior, not appearance* | `ui/*` primitives |
| Appearance | **Tailwind v4** consuming **design tokens** | every color/space/radius/type value, four themes, one gold accent | `ui/*` (tokens in `preview/tokens.css`) |
| Routing | **TanStack Router** | typed routes, route-level loaders, search-params-as-first-class (deep-link a shore point) | `ui/*` route tree in `src/app/routes/` |
| Server cache | **TanStack Query** | Firebase-as-server-cache: optimistic updates, invalidation, offline persistence paired with IndexedDB | the **repo hooks** at the `data/`→`ui/` boundary |
| App state | **Zustand** | active operation, current user, role assignments — device-local app state | `ui/*` / store hooks |
| Schema | **Zod** | one schema → TS type + form validator + generated `database.rules.json` | `core/` schema, consumed by `data/` |

The load-bearing call is **headless, not styled** ([ADR-023](../11-decisions/ADR-023-component-state-stack.md)): the design tokens own appearance, Radix owns behavior. The 15 Phase-E primitives are built *on* Radix behavior, not replaced by a pre-styled kit (Shadcn/MUI rejected). The tokens are the visual signal; the library disappears (Principle 11). **This doc mints no tokens** — the token system is [`color.md`](color.md) / [`spacing-grid.md`](spacing-grid.md) / [ADR-011](../11-decisions/ADR-011-color-token-system.md), not re-decided here.

---

## The data-flow story — one tap, end to end

This is the spine of the whole architecture. Every mutation is an **immutable append to an event log; current state is a projection of that log** ([ADR-009](../11-decisions/ADR-009-database-firebase-rtdb.md), [ADR-024](../11-decisions/ADR-024-d5-multi-device-build-a.md); the data class drives the seams, Principle 12). With that model, conflict resolution mostly evaporates and the backend is an append-and-fan-out pipe — which is why RTDB stays safe behind the `data/sync` seam.

A single tap — *advance a shore point to "Strut Set"*:

1. **User action** in `ui/operations` (a slide-to-advance control). The component calls a **repo hook**, never Firebase.
2. **`store.commit()`** — `operationStore.commit()` in `data/store` applies the change to in-memory state and writes it to **IndexedDB (Dexie)** *synchronously, before the UI re-renders* (the v3.5.3 local-first contract; a dropped phone loses nothing — L-4).
3. **Event append** — the same commit appends an immutable event (`ShorePointStatusChanged{spId, from, to, by, at}`) to the local append log in IndexedDB. The log is the device's source of truth; state is recomputed from it.
4. **`syncService.enqueue()`** — `data/sync` queues the event for Firebase and returns immediately. **The sync service is the only Firebase path; no UI component imports it** ([ADR-005](../11-decisions/ADR-005-single-package-pwa.md); L-4).
5. **Online:** the queued event flushes to RTDB (`events/{opId}/`), tagged with `appVersion`, retry count, timestamp; failures land in the `/diagnostics/sync/` ledger (L-5/L-8). **Offline:** it waits in the queue. The UI already updated in step 2 — connectivity never gates the interface.
6. **On reconnect:** the outgoing queue flushes and **incoming events from peer devices merge into the local log** (Build A accept-and-reconcile — [ADR-024](../11-decisions/ADR-024-d5-multi-device-build-a.md)). Merge is by the append log; the `STATUS_ORDER` progression guard prevents an out-of-order peer event from regressing a more-advanced state (L-7). The Accountability screen shows **per-row sync state** (synced / pending + freshness-on-tap), because a global sync dot is not enough where staleness is life-safety.

The audit log is this same log, filtered and formatted — not a second persistence path, so it cannot drift from reality. Build C (CP hub) is a v5 **transport variant** of this exact log, not a new application mode; v4.0 ships **no** Build-choice control ([ADR-024](../11-decisions/ADR-024-d5-multi-device-build-a.md) supersedes the essay's "visible-but-disabled toggle" and "v4.5 hub").

> **Translation note.** Essay 01 §7 framed Mode A / Mode C as a live Settings toggle and dated the hub to v4.5. [ADR-024](../11-decisions/ADR-024-d5-multi-device-build-a.md) fixes that: Build A only in v4.0, no toggle, Build C deferred to v5.0 with React Native (a PWA cannot bind a local IP to host the relay). The event-log *seam* is what keeps the v5 add cheap.

---

## The two guardrails — what they prevent

Two pieces of discipline exist for one reason each, and naming the failure they prevent is the whole point:

- **The 800-line file ceiling** ([ADR-007](../11-decisions/ADR-007-build-system-typescript-strict.md)). No file grows past 800 lines without an explicit seam decision. This prevents **another `app.js`** — the 8,800-line single mutable namespace that is the root cause of half the audit findings (race conditions, listener leaks, stale state all reduce to "a global namespace can't be reasoned about," essay 12 §1). Growth past 800 forces a seam decision instead of organic sprawl.
- **The CI boundary check** ([ADR-005](../11-decisions/ADR-005-single-package-pwa.md) negative consequence backstop). ESLint `no-restricted-imports` plus a CI assertion fail any PR that imports **Firebase into `ui/` or `core/`**, or **React into `core/`**. This prevents the slow rot where Firebase creeps into a UI component "just this once" until the `data/` seam no longer means anything — the discipline that, in one package, does the job separate `packages/` would, without the wiring.

Both are lint/CI errors, not conventions — a contributor *could* violate the boundary until the check trips, and the check is the backstop that makes the single-package bet safe (essay 01 rec 29; essay 12 §30).

---

## Surface & context notes

- **Four surfaces, one build.** Phone (team officer), tablet (CP), Toughbook (deep CP view), broadcast TV (read-only board) all render from `src/app/` — the PWA serves all four, which is why v4.0 stays PWA, not React Native ([ADR-005](../11-decisions/ADR-005-single-package-pwa.md); the phone is the floor for every workflow). Layout adapts by surface; the seams do not fork. The sanctioned mechanism for a *structural* surface choice (a different overlay primitive, not just styling) is the `useIsDesktop()` hook in `ui/primitives` — CSS handles styling adaptations, JS only the structural swap ([ADR-032](../11-decisions/ADR-032-surface-adaptive-pickers.md); first applied to make pickers anchored dropdowns on desktop via the `Popover` primitive).
- **Storage:** `localStorage` → **IndexedDB (Dexie)** in this cutover — the 5 MB localStorage cap is a real constraint at task-force scale ([ADR-024](../11-decisions/ADR-024-d5-multi-device-build-a.md)). Independent of the backend choice; ships in the same v4.0 cutover.
- **Backend:** RTDB stays for v4.0 behind the `data/sync` seam; a future swap is a transport change, with Supabase + PowerSync the named second choice if field tests surface conflict loss ([ADR-009](../11-decisions/ADR-009-database-firebase-rtdb.md)).

---

## Cite, don't restate

This map *places* the decisions; it does not re-derive them. For the decision and its rationale, go to the source:

- Single package / two entry points / the seam list / `data/` boundary → [ADR-005](../11-decisions/ADR-005-single-package-pwa.md).
- Vite + TS strict / 800-line ceiling / CI gate → [ADR-007](../11-decisions/ADR-007-build-system-typescript-strict.md).
- Radix + Tailwind + TanStack + Zustand + Zod → [ADR-023](../11-decisions/ADR-023-component-state-stack.md).
- Event log / current-state-as-projection / RTDB stays / `data/sync` seam → [ADR-009](../11-decisions/ADR-009-database-firebase-rtdb.md).
- Build A only / IndexedDB / per-row sync / no Build toggle → [ADR-024](../11-decisions/ADR-024-d5-multi-device-build-a.md).
- Seam-by-seam import contracts + the v3 lesson per seam → [`module-boundaries.md`](module-boundaries.md).
- The ten v3 lessons → [`LESSONS.md`](../LESSONS.md). The tokens → [`color.md`](color.md) / [`spacing-grid.md`](spacing-grid.md) / [`typography.md`](typography.md).

---

## Anti-patterns (do not do these)

- **A monorepo path.** No `packages/` or `apps/` anywhere in v4.0 — single package only, `src/core/*` / `src/data/*` / `src/app/` / `src/site/`. The monorepo is the v5.0 fork ([ADR-005](../11-decisions/ADR-005-single-package-pwa.md)).
- **Firebase imported outside `data/`.** The CI boundary check exists to fail exactly this. A "quick" Firebase call in a `ui/` component is the rot the seam prevents.
- **React imported inside `core/`.** `core/*` is pure domain — it must run in a Vitest unit test, a Cloud Function, and a future RN screen unchanged.
- **A file over 800 lines without a seam decision.** That is how `app.js` happened. The ceiling forces the decision; it is not a soft suggestion.
- **Hand-editing `database.rules.json`.** It is generated from the Zod schema; edit the schema. A hand edit drifts from the writer — the exact v3.8.2 silent-failure class.
- **Re-deciding a token here.** This is not a token doc. Color/space/radius/type live in their token files; this map references them.
- **Resurrecting demo mode, the marketing site, the v4.5 hub, or a Build-choice toggle.** All dropped/deferred by ADR; the essays that name them predate the ADRs.

---

## Open questions for the gate

None blocking. The six Phase H foundation ADRs ([005](../11-decisions/ADR-005-single-package-pwa.md), [007](../11-decisions/ADR-007-build-system-typescript-strict.md), [023](../11-decisions/ADR-023-component-state-stack.md), [024](../11-decisions/ADR-024-d5-multi-device-build-a.md), [009](../11-decisions/ADR-009-database-firebase-rtdb.md), [008](../11-decisions/ADR-008-nims-org-structure.md)) are accepted and are the locked spine this map draws; nothing here re-opens them. The Flatfile-style column-mapper library (Inventory import, [#36](../99-open-questions.md)) and Jotai-as-reserve are slice-time calls, not foundation decisions ([ADR-023](../11-decisions/ADR-023-component-state-stack.md) notes). If the vertical slice surfaces a genuine need to split or rename a seam, that opens an ADR — it is not resolved inline.
