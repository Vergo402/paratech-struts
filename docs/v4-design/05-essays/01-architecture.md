# Architecture — Brainstorm Essay

> Phase C, essay 1 of 12. Lens: code architecture. What v4 is built on, where the seams are, how the marketing site and the app share a chassis, and how the v3 prototype migrates without flushing the doctrine the prototype already encodes.

---

## Executive Summary

v4 stays a PWA at first launch and ships from a Vite monorepo with TypeScript, a shared core package, and three thin shells: web app, marketing site, and a React Native app that comes online in Phase 2. The 8,800 line app.js breaks apart along the seams the v3 audits already exposed: a pure domain core (struts, load tables, USACE shore types, NIMS roles, deduction math), an offline first persistence layer that owns Firebase and the write queue behind one interface, a state store that the React tree consumes, and a presentation layer that is a real component library, not inline templates. The marketing site uses the same tokens, the same primitives, the same type ramp. One design system, two front doors.

The D5 multi device no comms problem (Build A accept and reconcile, Build C CP hub) is solved at the persistence layer behind a Settings toggle. Both share a CRDT shaped event log; A reconciles through Firebase when WAN returns, C reconciles through a local relay on the same SSID. The app code above the persistence layer does not know which mode is on. Migration ramp: v3.19.x keeps shipping to main as the production PWA, v4 deploys to vergo402.github.io/fieldshore as the public alpha, then to fieldshore.app at beta, then App Store and Play Store once the RN shell is real. Nothing breaks for current users on any step.

The bar is FAANG. Linear keyboard ergonomics, Stripe documentation, Figma primitive system, Apple typographic restraint. The architecture has to be invisible enough that none of it shows on the surface.

---

## 1. Where v3 actually is, and what is worth keeping

The bones of v3 are not the problem. The load engine is audited and conservative, the deduction math matches Paratech and USACE, the offline write path works, the NIMS aware org chart is real, and the Hartsdale and Surfside drills proved the data model survives at both ends of the scale ladder. The problem is everything that sits on top: a single 8,800 line app.js, no module boundaries, no type checking, inline templates that build HTML through string concatenation, and a styling layer that is one CSS file with 2,200 lines of organic growth.

The audits make the structural verdict clear. Round 2 found roughly one hundred unique issues. v3.5.2 through v3.17.x closed most of the safety critical ones. What remains is paradigm scale: per device UID, NIMS terminology overhaul, role based permissions, listener leak hardening, the customRoles array to keyed object migration, the recommendation deduplication problem at task force scale (220 cards for 11 configs), and the move of the Apparatus / External / Individuals / My Role surfaces off the Operations page onto a real Roster tab. Those are not patches. They are a rebuild.

What survives the rebuild verbatim, ported into a domain package:

- The STRUTS, BASE_PLATES, WOOD_SIZES, SHORE_TYPES, APPARATUS_TYPES_DEFAULT, and ICS_ROLES_DEFAULT data tables. These are pure data and they are correct.
- The ACME_LOAD_TABLE and the LongShore load table after the v3.5.2 corrections. Conservative floor interpolation stays.
- findStrutCombinations and the deduction math. The wedge versus plate distinction is intentional doctrine and must not be refactored away.
- The grouped shore point phase split (pre cutting transitions are group wide, cutting workflow is per piece). The v3.8.0 work here is correct.
- The Firebase data tree under /departments/{deptId}. The shape is sound. What changes is the auth model and the security rules, not the tree.
- The role history event log added late in v3.x. It becomes the foundation for the audit log in D7.5.
- The plate connector picker. Alex's instruction is explicit. It is a visual grid picker pattern, iOS hardened, and v4 reskins it but does not redesign the interaction.

What does not survive:

- app.js as a file. It becomes a package with internal modules.
- index.html as the shell. The shell becomes a React tree rendered into one mount node.
- The inline HTML string concatenation in render functions (renderShorePointCards, renderInventory, the org chart render). Every one of those is an XSS vector that v3 patched site by site. v4 replaces all of them with components that take typed props.
- The "if db then firebase else localStorage" pattern. v3.5.3 already centralized this through persistOperation, persistInventory, and firebaseSave. v4 makes the wrapper the only path.
- The setupListeners and teardownListeners pair. v4 uses a single subscription manager that owns lifecycle and cannot leak.
- Inline onclick handlers in HTML strings. All event handling goes through React.
- The "P" in a square mark. New identity in Phase E.

The bones stay. The skin and the structural framing are new.

## 2. PWA or React Native at launch

The roadmap memory says Phase 0 stays PWA and Phase 1+ moves to React Native through a monorepo with a shared TypeScript core. That sequencing is right and the essay confirms it for one specific reason: the audience FieldShore is for is in a department that is not going to mandate iOS or Android. They are going to use whatever phone they have, whatever tablet the chief brought, and whatever Toughbook the rescue squad already owns. A PWA serves all four surfaces from one codebase on day one. React Native serves the two phone OSes well, but the Toughbook and the broadcast TV still need a web target, and shipping native first means writing a web target twice.

The other reason is reach. The free PWA at a public URL is how the product gets into a volunteer department's hands at 2 a.m. on a Tuesday when a chief reads about it on Statter911. No App Store account, no IT department approval, no $99 a year developer program. IAMResponding and RapidSOS earned their reach the same way (free download, low friction, viral install across a station). The positioning doc names that as lucky and worth keeping. The architecture has to preserve it.

The phased ramp:

- **v4.0 (Phase 0 in the long roadmap).** PWA. Same hosting model as v3 (GitHub Pages, then likely Cloudflare Pages or Vercel once the marketing site is live). All four surfaces (phone, tablet, Toughbook, broadcast TV) targeted from one build. The RN code does not exist yet, but the shared core package is structured so RN can consume it without rework.
- **v4.5 (still Phase 0).** Local mutual aid ships. Still PWA. The CP hub mode (Build C) ships here because mutual aid is when multiple departments need to coordinate over a portable router at the scene.
- **v5.0 (Phase 1).** React Native shell ships to iOS and Android using the same shared core. The web PWA stays live for the surfaces that are not phones. App Store presence unlocks the credibility tier the product needs to be quoted in a department's IT review.
- **v5.x (Phase 2).** The React web command module (the Toughbook deep data CP view) splits into its own thin shell so the marketing site, the field app, the mobile app, and the command station can each ship at their own cadence behind one design system.

The PWA first decision means iOS install limitations apply. No background sync past Apple's window, no full offline file system, push notifications via APNs require a workaround. Principle 10 (respect the radio) makes push notifications a non goal anyway. Background sync gets handled by the service worker write queue and Firebase resync on next foreground. The iOS limitations are real but they are not blockers for the PWA contract this app makes.

## 3. The monorepo and the package boundaries

The repo becomes a pnpm workspace at v4. The reason is pnpm: it handles hoisting and peer dependencies in a way that matches what a monorepo with a shared core actually needs, the disk footprint stays small, and the lockfile is deterministic in a way npm's still is not. Turborepo on top of pnpm handles the build graph, caches the marketing site builds, and lets the field app and the marketing site share a CI lane without rebuilding tokens twice.

The package layout:

```
fieldshore/
├── apps/
│   ├── field/                  # the PWA, v4.0 default deploy
│   ├── marketing/              # fieldshore.app marketing site
│   ├── command/                # v5.x split: Toughbook deep CP view
│   └── mobile/                 # v5.0 React Native shell
├── packages/
│   ├── core/                   # pure domain: struts, load tables, NIMS roles, math
│   ├── data/                   # persistence: Firebase, local store, sync queue, CRDT log
│   ├── ui/                     # the component library and primitives
│   ├── tokens/                 # design tokens (colors, type, spacing, motion)
│   ├── icons/                  # custom SVG set
│   ├── checklists/             # IC Command, Task Level, ORM content + types
│   └── config/                 # eslint, tsconfig, prettier, vitest shared configs
└── tools/
    ├── migrate/                # v3 to v4 data migration scripts
    └── simulate/               # the existing Level I to V simulation infra, refactored
```

Each package has its own package.json, its own tsconfig that extends the shared one, and exports types. The field app depends on core, data, ui, tokens, icons, and checklists. The marketing site depends on tokens, ui, and icons. The mobile app depends on core, data, and a parallel ui-native package that ships the same primitive surface using React Native components. The command app depends on the same set as field with a denser composition.

The package boundaries are load bearing. core has zero React. core has zero Firebase. core takes typed inputs and returns typed outputs. That is what lets the same load math run inside a Vitest unit test, inside a React component, inside a React Native screen, inside a Cloud Function, and inside a future CLI. It is also what lets a structural collapse SME read the math and trust it, because the math is not interleaved with rendering concerns.

data is the only package that knows Firebase exists. It exports a typed repository per resource (DepartmentRepo, OperationRepo, ShorePointRepo, InventoryRepo, RoleRepo, ChecklistRepo, AuditLogRepo). Each repo handles the local first contract internally: write to in memory state, write to IndexedDB, append to the CRDT event log, then conditionally sync to Firebase. The rest of the app calls repo.update(id, patch) and never touches a Firebase reference directly.

ui is the component library. Every primitive in 03-primitives/ has a corresponding ui component with strict prop types, no any, no implicit children rendering. The picker primitive in the doctrine ships as four named exports (InlineSegmentedPicker, BottomSheetPicker, FullScreenListPicker, VisualGridPicker) plus a PowerSelectFallback. The same applies to Sheet, Modal, Card, Badge, Button, List, Input, Toggle, Segmented, Slider, Toast, EmptyState, LoadingState, and NestedChecklist.

tokens is generated. The source of truth is a TypeScript file with named constants (colorGold500, spacing4, typeBodyLarge, motionSheetOpen). Style Dictionary (or a thin custom generator) produces three outputs: CSS variables for the web apps, a JS object for the mobile app, and a JSON file for Figma. Same tokens, three transports.

## 4. Build system and runtime

Vite. Not esbuild raw, not Webpack, not Parcel, not no build. The reasons:

- Vite's dev server is what makes the FAANG bar reachable. Hot module reload in single digit milliseconds is the floor that makes the design iteration loop work. v3's "edit, push, wait for GitHub Pages" loop is not what produces Stripe quality work.
- Vite handles TypeScript natively in dev (via esbuild under the hood) and ships a Rollup based production build with proper code splitting and tree shaking. The output bundle for the field app should land well under 200KB gzipped for the critical path.
- Vite plugins exist for everything in this stack: vite-plugin-pwa (for the service worker, replacing the hand maintained sw.js), vite-plugin-react, vite-plugin-svgr (for the icon set as React components), vite-plugin-checker (for type checking in the dev server).
- The marketing site, the field app, and the command app all use Vite with the same plugin set. The mobile app uses Metro because React Native requires it; that is the one inconsistency the monorepo accepts.

The service worker becomes vite-plugin-pwa generated with a Workbox config. The hand maintained CACHE_NAME bump per release goes away. Cache invalidation becomes automatic on every build through the manifest hash. The Firebase WebSocket exclusion stays (it is a runtime route exclusion in Workbox).

TypeScript strict mode from day one. noImplicitAny, strictNullChecks, strict, noUncheckedIndexedAccess. The v3 audits found a meaningful number of bugs that are exactly the class TypeScript catches at compile time (the customRoles array assumption, the inventory item shape drift, the role assignment to deleted role). Paying the TypeScript tax up front is cheaper than paying the audit tax forever.

Testing: Vitest for unit tests on core and data, Playwright for end to end on the web apps, Maestro for the mobile app once it exists. The Level I through V simulation infrastructure that already exists gets ported into tools/simulate and run from CI on every PR. A simulation regression fails the build the same way a unit test does.

## 5. State, routing, and the React tree

State management: Zustand for app state, TanStack Query for server state, Jotai for one off atoms when a component needs cheap reactive primitives. The reason for three small libraries instead of one big one (Redux, Recoil, MobX):

- Zustand handles the persistent app state (active operation, current user, selected apparatus, role assignments) with a tiny API and good DevTools. It does not pretend to be a server cache.
- TanStack Query handles Firebase as a server cache the way it is meant to be handled, with optimistic updates, query invalidation, and the offline persistence story that pairs with the IndexedDB layer. The data package's repos return TanStack Query hooks at the React boundary; the rest of the app calls useOperation(id) and gets cached, refreshed, optimistic data without thinking about it.
- Jotai stays in reserve for the cases where a primitive like a controlled picker needs to share state with a sibling without prop drilling and Zustand is overkill.

This is the Linear stack, roughly. It is also what Vercel ships. The combination is well understood, well documented, and avoids the Redux complexity tax that does not pay off at this scale.

Routing: TanStack Router. The reasons are typed routes (a route parameter is a typed object, not a string), built in pending and error boundaries, search params as first class (which matters for sharing a link to a specific operation or shore point), and data loaders at the route level (which pairs with TanStack Query in a way React Router does not). The alternative, React Router v7, would work, but TanStack Router's type ergonomics fit the FAANG bar better.

The React tree itself is shallow on purpose. Layout components own grid and surface adaptation; primitive components own behavior; screens compose primitives. No deep prop drilling, no provider tree more than three levels deep, no HOCs. Suspense boundaries at the route level handle loading states. Error boundaries at the route level catch crashes and surface them through the Toast primitive without taking the whole app down.

Forms: React Hook Form with Zod schemas. The Zod schemas live in core (or in checklists for the checklist content) and are the same schemas the data package validates against before write. One schema, three uses (TS type, form validator, Firebase write validator).

## 6. The marketing site and the app share one chassis

This is the part most products get wrong. Stripe is the exception that proves the rule: stripe.com and the Stripe Dashboard share a design system, share components, share tokens, and feel like one product. Most companies have a marketing site built by an agency in Webflow and a product built by engineers in React, and the two feel like different companies. v4 cannot afford that gap because the product is the marketing.

The marketing site (fieldshore.app) ships from apps/marketing as a Next.js app (or Astro if the static output bar is high enough; Next.js with the App Router and ISR is the safer call for the kind of long form documentation Stripe sets the bar on). It depends on the same tokens package, the same icons package, the same ui package. The Button on the marketing site is the same Button in the app. The type ramp is the same. The color palette is the same. The motion language is the same.

What lives on the marketing site:

- The pitch (the structural collapse tool for the rescuers inside the building).
- The product tour (interactive screenshots that are actually live components running with seeded demo data).
- The documentation (the user manual, currently at docs/USER-MANUAL.md, ported into MDX and rendered with the same type ramp as the app).
- The pricing (free for now, freemium later, dept license, manufacturer acquisition path).
- The changelog (auto generated from GitHub Releases, formatted with the same primitives the app uses).
- The status page (a thin Cloudflare worker that pings Firebase and a few canaries; rendered with the same dashboard primitives).
- The brand assets and the press kit.

The discipline that makes this work: every component the marketing site uses is exported from ui. If the marketing site needs something the app does not have (a hero block, a feature grid, a testimonial card), it goes into ui under a marketing/ namespace and is reusable. No site only code lives outside the design system. That is the rule that prevents the gap from opening over time.

The product tour deserves a specific note. Stripe and Linear both ship product tours that are real interactive components, not video or screenshots. v4 does the same by exporting a "demo mode" build of the field app that runs against seeded in memory data with no Firebase connection. The marketing site embeds the demo mode in iframes (or as direct routes under /demo) and visitors can click through a real shore point workflow. The demo mode is also what ships as the v3.20.0 Bucket 1 demo department. One implementation, two surfaces.

## 7. The D5 multi device no comms architecture

This is where the architecture has to be most careful. Alex's framing is that the field will choose between Build A (accept and reconcile through Firebase when comms return) and Build C (CP hub on the local network) per department, via Settings. The architecture lets both run on the same code path because both are persistence modes, not application modes.

The persistence model:

Every mutation in the app becomes an event. Not a state diff, an event. "ShorePointStatusChanged{spId, from, to, by, at}". "InventoryItemDeployed{itemId, quantity, opId, spId, by, at}". "RoleAssigned{roleId, targetId, by, at}". The data package owns the event types, the event log, and the reducers that turn the event log into current state.

Each device maintains its own append only event log in IndexedDB. The log is the source of truth on the device. State is a projection of the log, recomputed on load and updated incrementally as new events append.

Mode A (accept and reconcile, default for most departments):

- On every event, the device appends locally and queues for Firebase write.
- Firebase mirrors the event log as a child collection under each operation.
- On reconnect, the device's outgoing queue flushes; incoming events from other devices are merged into the local log by timestamp.
- Conflicts are resolved by a doctrine aware merge. Inventory deployments are commutative (two devices deploying different items both succeed; deploying the same item past available count requires a reconciliation prompt). Status transitions follow the v3.9.0 STATUS_ORDER (a regression is rejected silently in favor of the more advanced state). Role assignments use last write wins by timestamp, with the audit log showing the conflict.
- The user surface is one quiet indicator (the sync dot, today in v3) plus a "Sync state" detail screen that shows pending writes and recent conflicts. Per Principle 8, never a blocking modal.

Mode C (CP hub, for the connectivity poor or large incident case):

- A tablet or Toughbook at the CP runs the same field app with a Settings toggle set to "Host this incident's local hub." The app starts a small WebSocket relay (a worker thread that binds to the device's local IP on the SSID).
- Other devices on the same SSID discover the host via mDNS (Bonjour on iOS, Avahi on Android via the React Native shell; the PWA version uses a manually entered IP or QR code from the host's Settings screen).
- Events flow through the host instead of Firebase. The host is the device that talks to Firebase when WAN returns. Other devices stay air gapped against Firebase as long as they are talking to the host.
- The host's event log is the canonical log for the incident. Other devices' logs are subsets that resync on hub connection.
- If the host goes down (battery, drop, leaves the scene), any device with the highest event count can be promoted to host through a Settings prompt. The CRDT shape of the event log makes this safe; the promotion is a UI ceremony, not a data merge.

Both modes share the event log, the reducers, the conflict resolution rules. The only difference is the transport. The application code above the data package does not know which mode is on. The Settings UI is the only place the modes diverge.

The CP hub for the PWA is the hard part. PWAs cannot bind to a local IP and serve WebSockets directly. Two options:

1. The CP hub mode is React Native only. The PWA can be a client to a hub, but not host one. This is the simpler answer and it forces the v5.0 RN ramp at the same time as v4.5 mutual aid, which has a natural product alignment.
2. The CP hub mode runs as a separate companion app shipped via Electron for the host case only (a Toughbook or laptop installs a small "FieldShore Hub" app, the PWA on every other device connects to it). This is more engineering but it ships v4.5 hub without waiting for RN.

The recommendation is (1). It lines up with the roadmap, it avoids the Electron tax, and it gives the v5.0 launch a real reason to exist beyond App Store presence. Until then, v4.0 ships Mode A as the only mode, with the Settings toggle disabled and labeled "Mode C (CP hub) coming v4.5."

The audit log feature from D7.5 falls out of this naturally. The event log is the audit log. The audit log UI is a filtered, formatted view over the event log. No second persistence path, no risk of the audit drifting from reality.

## 8. The 8,800 line app.js migration

The decomposition has to be honest about what app.js actually is. It is not one file's worth of complexity packed badly. It is a small framework, a medium domain model, several screens, several render functions, an offline queue, a Firebase integration, a service worker boot, and a feedback subsystem all glued together because there was nowhere else to put them.

The decomposition map:

| v3 location | v4 destination |
|---|---|
| STRUTS, BASE_PLATES, WOOD_SIZES, SHORE_TYPES constants | `packages/core/src/data/` (typed const arrays) |
| APPARATUS_TYPES_DEFAULT, ICS_ROLES_DEFAULT | `packages/core/src/doctrine/` |
| ACME_LOAD_TABLE, LongShore load table | `packages/core/src/loads/` (with Vitest tests for every datasheet row) |
| findStrutCombinations | `packages/core/src/strut/findCombinations.ts` (pure function, exhaustive tests) |
| escapeHtml, escapeAttr | gone (React handles it) |
| firebaseSave, persistOperation, persistInventory | `packages/data/src/repos/` (one repo per resource) |
| safeSetItem and the localStorage wrappers | `packages/data/src/storage/indexedDB.ts` (IndexedDB via Dexie, not localStorage; the 5MB localStorage cap is a real constraint at TF scale) |
| setupListeners / teardownListeners | `packages/data/src/sync/subscriptionManager.ts` |
| Render functions (renderShorePointCards, renderInventory, renderOrgChart, etc.) | `apps/field/src/screens/` and `packages/ui/src/components/` |
| Status transition logic (updateShoreStatus, markCutDone, sendToRunner, returnEquipment) | `packages/core/src/workflow/` (pure state machines) with the v3.9.0 STATUS_ORDER preserved |
| Org chart drag and drop | `packages/ui/src/components/OrgChart/` with dnd-kit for the three input methods |
| Feedback submission | `apps/field/src/features/feedback/` |
| Service worker (sw.js) | `vite-plugin-pwa` config in `apps/field/vite.config.ts` |
| Inline event handlers | gone (React props) |

The migration order matters. The fastest path to a credible v4 is not a big bang rewrite; it is to build core and data first against v3's Firebase tree (so the data shape stays compatible), then build the field app's first screen end to end (the vertical slice in Phase H), then iterate one screen at a time. v3 keeps running the field. v4 reads the same Firebase tree (with the security rule expansion for the new auth model gated behind a feature flag) until the cutover.

That is what makes the dual track sustainable. The data tree is the bridge. v3 writes, v4 reads, and once v4 is the production target the security rules tighten and v3 becomes the legacy reader.

## 9. The marketing site to app migration ramp

The deploy story has four stages, each a real public URL, each a real product:

1. **v3.19.x → today.** vergo402.github.io/paratech-struts. GitHub Pages, the v3 PWA. Nothing changes through Phase A through G.
2. **v4 alpha.** vergo402.github.io/fieldshore. New repo subdirectory, new service worker scope, isolated from v3 users. Phase H ships here. Field testers opt in by URL.
3. **v4 beta.** fieldshore.app. Custom domain, Cloudflare Pages or Vercel hosting, the marketing site at the root and the app at /app. CNAME from the GH Pages alpha redirects opt in users.
4. **v5 mobile.** App Store and Play Store. The PWA at fieldshore.app stays live. The mobile app is one more shell against the same shared core.

Each stage is reversible. If the alpha breaks, the v3 PWA at the old URL is untouched. If the beta breaks, the alpha URL is still live. If the mobile app gets rejected by Apple review on the first pass, the PWA is the fallback for iOS users. The fallbacks are not theoretical; they are how Hartsdale stays running through any deploy mistake on the v4 side.

The cutover from v3 to v4 (Phase J) is a DNS swap, not a code swap. The old PWA stays at its old URL as a v3-legacy deploy for six months minimum per the plan. Users with the v3 PWA installed keep using v3 until they manually install v4 from the new URL. There is no forced migration moment.

## 10. Where this lands FieldShore among the FAANG references

The positioning doc says we are the structural collapse tool for the rescuers inside the building and the technicians in the street, not the records officer at the desk. The architecture has to back that with a runtime that feels like Linear when the IC is keyboard driving the CP, like Apple Notes when the team officer is one tapping a shore point status in the rubble, like Stripe when a department admin is reading the documentation at 11 p.m., and like Figma when the cutting table foreman is dragging cut tasks across the queue.

That is the bar. The architecture above does not get us there alone (the design system in Phase E does most of the perceived work), but the architecture is what makes the design system possible. A 200KB initial bundle is what lets the type ramp render at sixty frames per second on a Toughbook over a hotspot. A typed core is what lets a structural collapse SME read findCombinations.ts and trust it. A real component library is what lets the marketing site embed a working product tour. A Settings toggle that flips persistence modes without the rest of the app noticing is what lets the field choose Mode A or Mode C without two products diverging.

The architecture's job is to disappear. Every load bearing call below is a choice about which thing disappears in service of the work the firefighter and the IC are actually doing.

---

## Recommendations

1. Adopt pnpm + Turborepo monorepo at the v4-redesign branch, with the package layout (apps/field, apps/marketing, apps/command, apps/mobile; packages/core, data, ui, tokens, icons, checklists, config; tools/migrate, simulate) committed in Phase H1.

2. Stay PWA for v4.0 and v4.5. Ship React Native (apps/mobile) at v5.0 against the same shared core. Do not split native first.

3. Build with Vite + vite-plugin-pwa across all web apps (field, marketing, command). Metro for mobile only.

4. TypeScript strict mode from day one across every package. noImplicitAny, strictNullChecks, noUncheckedIndexedAccess all on.

5. Extract a pure domain core package (packages/core) with zero React, zero Firebase, full Vitest coverage on findCombinations, load tables (every datasheet row tested), deduction math, and the STATUS_ORDER state machines.

6. Centralize persistence in packages/data behind typed repositories (DepartmentRepo, OperationRepo, ShorePointRepo, InventoryRepo, RoleRepo, ChecklistRepo, AuditLogRepo). No other package touches Firebase or IndexedDB directly.

7. Move offline storage from localStorage to IndexedDB via Dexie. localStorage's 5MB cap is a real constraint at task force scale.

8. Implement the persistence layer as an event sourced append only log. State is a projection of the log. Both Mode A (Firebase reconcile) and Mode C (CP hub) are transport variants of the same log.

9. Ship Mode A as v4.0 default. Settings toggle for Mode C is visible but disabled, labeled "coming v4.5." Ship Mode C with React Native at v5.0 since PWAs cannot host a local WebSocket relay.

10. Use Zustand for app state, TanStack Query for server state, Jotai in reserve. No Redux.

11. Use TanStack Router for typed routes, route level loaders, and search params as first class.

12. Use React Hook Form + Zod schemas. The Zod schemas live in core and validate at the form layer and the data repository layer (one schema, both uses).

13. Build a real component library in packages/ui. Every primitive in docs/v4-design/03-primitives/ has a corresponding typed component. The plate connector picker ships as VisualGridPicker; per Alex, behavior unchanged.

14. Generate tokens from a TypeScript source of truth (packages/tokens). Output CSS variables for web, JS objects for RN, JSON for Figma. Style Dictionary or a thin custom generator.

15. Ship the marketing site (fieldshore.app) from apps/marketing as Next.js with the App Router. Same tokens, same ui components, same icons as the field app. No marketing only component lives outside packages/ui.

16. Ship the demo mode (Bucket 1 v3.20.0 demo department) as a shared build artifact embedded in the marketing site's product tour. One implementation, two surfaces.

17. Replace the hand maintained sw.js with vite-plugin-pwa generated service worker. Workbox config preserves the Firebase WebSocket exclusion.

18. Use Vitest for unit tests on core and data, Playwright for end to end on web apps, Maestro for mobile. Wire the existing Level I through V simulation infrastructure (tools/simulate) into CI on every PR.

19. Use TanStack Query's optimistic updates plus the audit log event for every mutation. The audit log feature (D7.5) is a filtered view of the event log, not a parallel persistence path.

20. Migrate the app.js modules in dependency order: core (data + math), then data (repos against the existing v3 Firebase tree), then the first vertical slice screen end to end (Phase H), then one screen at a time. No big bang.

21. Stage deploys: v3 stays at the current GH Pages URL; v4 alpha ships to a new GH Pages subpath; v4 beta ships to fieldshore.app on Cloudflare Pages or Vercel; v5 mobile ships to App Store + Play Store. Each stage reversible.

22. Adopt dnd-kit for the org chart drag and drop (replaces the v3 hand rolled three input method handler). dnd-kit handles pointer, touch, and keyboard inputs with one API.

23. Replace every inline HTML string concatenation (renderShorePointCards, renderInventory, viewArchivedOp, the org chart) with typed React components. Every one was an XSS site in v3.

24. Replace setupListeners / teardownListeners with a single SubscriptionManager class in packages/data/src/sync. Subscriptions track lifecycle and cannot leak.

25. Use Suspense + ErrorBoundary at the route level. Errors surface through the Toast primitive and never take the whole app down.

26. Lock the v3 to v4 Firebase data tree shape. v4 reads the same /departments/{deptId} tree v3 writes. Security rule expansion for the new auth model ships behind a feature flag and tightens at Phase J cutover.

27. Build the v3 to v4 data migration script (tools/migrate) early in Phase H. Run it against a fork of real prod data at the start of Phase I. Never write the migration script at the end.

28. Keep the v3 PWA alive at /v3-legacy for six months minimum after Phase J cutover. Document the rollback. The product the field uses today does not get pulled out from under it.

29. Add a CI check that fails any PR introducing a new package dependency on Firebase outside packages/data, or a new React dependency in packages/core. The package boundary discipline is what keeps the architecture honest two years from now.

30. Document the architecture at the picker doctrine's depth in docs/v4-design/07-design-system/architecture.md before Phase H code starts. The doc is what onboards future contributors (and future Claude sessions) without re reading every essay.
