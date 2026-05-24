# Implementation — Brainstorm Essay

> Lens: implementation feasibility for v4. What does `npm run dev` actually feel like at 7:30am on a Saturday when a Hartsdale captain hits Send on a feedback note. How do we get from 8,890 lines of vanilla JS to a real product without losing the property that v3 has, which is that a typo to a button label ships to production fifteen minutes after Alex notices it.

---

## Executive Summary

The v4 implementation stack should be Vite plus React plus TypeScript plus Tailwind v4 plus TanStack Router, deployed from GitHub Actions to the existing GitHub Pages origin, with the entire app and the marketing site living under one Vite config in a single repo and two source folders. The toolchain is the boring, well documented intersection of what a one person dev team with agent help can ship in five to six weeks of essay synthesis time, then iterate on at v3's release cadence.

No monorepo until Phase 1 of the long roadmap. The Turborepo plan in `v4.0-to-v5.0-roadmap.md` is correct for the React Native fork later, but pulling it into v4.0 buys nothing the web app needs and costs a week of wiring. One package, two entry points.

TypeScript runs in strict mode from line one. Not gradual. The strut algorithm and the load tables are life safety critical and the cost of a wrong number anywhere in the pipeline is unacceptable. Strict TS catches it at compile time. The cost is a week of typing the core domain. The benefit is permanent.

Component primitives are custom on top of Radix headless plus Tailwind tokens. No Shadcn copy paste, no Material. The picker doctrine and the twelve principles need a tighter aesthetic than any library ships with. Radix gives us accessibility plumbing for free without dictating visuals.

v4 deploys to GitHub Pages at `/v4/` while v3 stays at the root. A feature flag in the v3 PWA service worker can route real users to v4 once it earns the field. No cutover deadline.

Sentry free tier, GitHub Actions free tier, Firebase Spark for as long as it holds, then Blaze. Annual cost ceiling at Hartsdale scale: zero dollars. At hundred dept scale: roughly forty dollars a month.

---

## What v3 actually feels like to ship

Before deciding what v4 looks like under the hood, name what we are protecting.

v3 ships like this. Alex notices a bug or a label that reads wrong. He edits one of three files. He pushes to `main`. GitHub Pages picks it up. The service worker cache busts because the `CACHE_NAME` got bumped. The fix is live in fifteen minutes, often less. Most patches are one commit. The whole loop from "noticed" to "shipped" usually runs under twenty minutes.

That cadence is the property of vanilla JS plus GitHub Pages. It is also the property of having no build step. There is no Webpack config, no Babel preset, no tsconfig, no PostCSS chain, no node_modules to install, no lock file conflict to resolve, no Vercel deploy to wait on. The file you save is the file the browser runs.

The cost of that cadence is everything the audits have surfaced. `app.js` is now 8,890 lines in one file. Tab completion is unreliable. The XSS surface has to be hand audited because there is no compile time type system to enforce `escapeHtml` vs `escapeAttr`. The CSS is 2,239 lines in one file. There is no module boundary anywhere except the function scope. New contributors (or new agent sessions) have to grep their way around.

The v4 implementation question is therefore narrower than it looks. It is not "should we use Vite, should we use React." It is: **how do we preserve the fifteen minute push to prod feel while adding the structural affordances that get us out of the 8,890 line file**. The answer has to be evaluated against both halves.

## The framework decision

React. Not Svelte, not Vue, not Solid, not vanilla with hand rolled web components.

The reasoning is not that React is the best framework. It is that React is the framework with the deepest agent training corpus, the longest list of mature ecosystem libraries (Radix, TanStack, react-aria, react-hook-form, react-dnd), and a known eventual React Native fork at Phase 1 of the long roadmap. Picking Svelte for v4 means rebuilding the entire UI layer in JSX twelve months from now when Expo is the target. Picking Vue means agents help less effectively for the same reason React wins (volume of training data).

Solid would be technically excellent and probably faster in the browser. Solid would also leave us without a native story and would burn weeks teaching agents the almost JSX ergonomics.

Vanilla web components with lit-html or stencil is the romantic answer. It also requires us to hand build a router, a state container, a form library, and an icon registry. That is two months of plumbing before any picker renders.

The React decision is durable across v4, the React Native phase, and the web command module phase. The picker doctrine and the four surface model both compose more naturally in React than in any of the alternatives because they are conceptually about props passing through a tree of components, which is what JSX is for.

### Which router

TanStack Router. Not React Router, not Next.js routing, not file system routing in a vanilla form.

TanStack Router has typed routes, typed search params, typed loaders. The IC's drilldown from incident to division to shore point is a route hierarchy. The cutting table foreman's filtered cut queue is a typed search param state. Typed routes mean a misspelled route key fails at build time, not at 3am when a captain taps a stale link.

Next.js routing is overkill and brings the rest of Next.js with it. We do not need server components. We do not need ISR. We are a fully client side PWA. Adopting Next would add a deploy target (Vercel or a self hosted Node server) and a rendering paradigm we do not use, and it would make the GitHub Pages path harder.

React Router works fine but loses the typed search params and the typed loaders, and the loader pattern is exactly how an IC's drilldown from "all incidents" to "this incident, this division, this shore point" should be coded.

### Which state container

Zustand for global UI state. TanStack Query for Firebase data. No Redux.

The reasoning is that v3 already split mutation handling between in memory state, localStorage, and Firebase via `persistOperation()` and `persistInventory()`. That is the local first pattern Principle 8 names. TanStack Query is the React idiom for that exact split: optimistic mutate plus background sync. We get the local first contract for free.

Zustand handles the picker open/close, the drawer state, the theme, the sunlight mode toggle. Things that are pure UI and do not need Firebase round trips. Zustand is roughly 1.5 KB and has no provider boilerplate.

Redux is overkill for an app this size and introduces a level of indirection (actions, reducers, middleware) that does not pay back when the team is one person plus agents.

### Which CSS strategy

Tailwind v4 with custom design tokens. Not CSS modules, not styled components, not vanilla CSS files.

Tailwind v4 is the version with the Lightning CSS engine and the at-import config, which lets us define the entire FieldShore design system (color, type ramp, spacing scale, radius scale, motion durations) as CSS custom properties consumed by Tailwind. The Phase E design system tokens land directly in `tokens.css` and Tailwind exposes them as `bg-fs-gold`, `text-fs-amber-rest`, `rounded-fs-card`. The token file is the design system spec, executable.

Tailwind also keeps the bundle small because unused classes are tree shaken at build time. v3's 2,239 line `style.css` would compress to roughly 30 KB of utility classes that ship with the page.

The argument against Tailwind is "class soup in JSX." That argument is real for component libraries that expose Tailwind as the styling primitive (Shadcn). It does not apply when you compose components at the picker doctrine level, because each primitive component encapsulates its own utility classes and consumers only see semantic props. A consumer writes `<Picker variant="bottom-sheet" value={plate} onChange={setPlate} />`, not class soup.

### Which component library

Custom primitives on top of Radix headless. Not Shadcn, not Material UI, not Chakra, not commission from scratch.

Radix gives us the accessibility plumbing for the bottom sheet, the dialog, the popover, the dropdown, the toggle, the radio group, the checkbox, the tabs. These are the primitives the picker doctrine relies on. Radix has done the WCAG 2.1 AA work, the focus trap work, the keyboard navigation work, the screen reader announcement work. We do not have time to redo that in five to six weeks and we would do it worse.

The visual layer sits on top. Every Radix primitive gets a thin FieldShore wrapper that applies the design system tokens, the sunlight mode adaptations, the broadcast TV rendering. The picker doctrine names the four picker variants; each variant is a wrapper around a Radix primitive (inline-segmented over `RadioGroup`, bottom-sheet over `Dialog` with the Radix Drawer pattern, full-screen-list over `Dialog` with a custom virtual list, power-select over the native `<select>`).

Shadcn is the wrong tier because Shadcn copy pastes opinionated visuals into our codebase that we then have to undo. Material brings the Material visual language, which is Google's, not ours. Chakra ships a runtime theming engine and pulls Emotion in.

Commissioning the primitives from scratch (no Radix, no headless library at all) is what every essay agent in Phase C should challenge. The answer is timeline: five to six weeks does not let us build a focus trap implementation that survives a battalion chief on an iPad with VoiceOver and a dust covered glove.

### Which icon set

Lucide. Not Heroicons, not Font Awesome, not a commission.

Lucide is the fork of Feather, MIT licensed, ships as React components, tree shakes per icon, and has 1,400 icons covering the operational set we need (chevrons, status dots, alerts, search, settings, role markers, apparatus glyphs). The custom icons for shore type silhouettes (T-Shore, Double-T, 3-Post) are designed in Figma in Phase E and dropped into a `packages/icons` folder alongside the Lucide imports.

The argument for a commissioned set is in Phase E. The implementation argument here is just "do not block on it." Lucide is good enough to ship v4.0 and the custom shore type silhouettes are the marginal pixels.

## TypeScript adoption

Strict mode. From line one. No gradual migration. No `any` escape hatch.

The reasoning is asymmetric. v3 carries a known XSS surface where `escapeHtml()` is the wrong function for attribute contexts. The CLAUDE.md gotcha is explicit: "Use `escapeAttr()` inside `attr="..."` interpolations." The reason that gotcha exists is JavaScript does not know the difference between an attribute context and a text context, and the codebase relies on the engineer to call the right function. A TypeScript type system that exposes `EscapedText` and `EscapedAttr` as branded types makes that distinction load bearing. The compiler refuses the wrong assignment.

The strut algorithm is the second asymmetric case. `findStrutCombinations()` consumes a measurement, a load, a base plate, an extension set, a wood deduction, and a system. Every one of those is a unit (inches, pounds, lookup key, count). TypeScript can encode units as branded primitives. A `Pounds` cannot be passed where `Inches` is expected. The cost of that level of typing is a few hours per domain module. The benefit is that the algorithm cannot be miscalled by a future module or a future agent session.

The argument against strict TS is that it slows the initial code by maybe 20%. That cost is real for week one. By week three the autocomplete in any IDE is doing more work than the developer is.

The pragmatic baseline: every file is `.ts` or `.tsx` from the start; `strict: true` in tsconfig; `noUncheckedIndexedAccess: true`; `exactOptionalPropertyTypes: true`. Zod for runtime validation at every boundary (Firebase reads, Excel imports, URL search params). The Zod schema doubles as the TypeScript type via `z.infer<>`. The boundary check is one line per surface.

## Build tooling

Vite. Not esbuild raw, not Webpack, not Rollup, not stay no build.

Vite gives us instant hot module replacement under 50 milliseconds for component edits. The dev experience is "save the file, see the change in the browser before your finger lifts." That preserves the v3 push to prod feel at the inner loop level. Production builds use Rollup under the hood for tree shaking and code splitting.

Esbuild raw is faster but requires hand wiring HMR, asset handling, the dev server, the SW integration, the PWA plugin. That is rebuilding Vite badly.

Webpack is the alternative for teams that need legacy support. We do not. v4 ships to evergreen mobile Safari and Chrome only. iOS 15+, Android Chrome 100+.

The stay no build option is what v3 is doing. The cost is exactly what surfaces in the 8,890 line `app.js`. There is no module boundary because the browser does not need one. We are choosing the build cost (a few seconds per push) in exchange for the structural cost we are paying now (hand auditing a one file codebase).

The Vite config is one file. The dev server is `vite`. The production build is `vite build`. The PWA plugin is `vite-plugin-pwa`. No further wiring needed.

## The marketing site

Same Vite config, separate entry point. Not a separate Next.js site, not Astro, not plain HTML.

The structure is:

```
fieldshore/
├── src/
│   ├── app/                  ← the PWA
│   │   ├── routes/           ← TanStack Router routes
│   │   ├── primitives/       ← Radix + Tailwind wrappers
│   │   ├── domain/           ← strut algorithm, load tables
│   │   └── main.tsx          ← app entry point
│   └── site/                 ← the marketing site
│       ├── pages/            ← landing, pricing, manual, blog
│       └── main.tsx          ← site entry point
├── vite.config.ts            ← multi page config, two entries
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

Vite supports multi page apps natively. The app entry produces `/app/index.html`, the site entry produces `/index.html`. Both share the same tokens file, the same component primitives, the same Tailwind config. The marketing site reuses the typography and the design language, which is the whole point of having a design system.

A separate Next.js site would mean two deploy pipelines, two type configs, two dependency trees, and a duplicated design system. Astro is the right answer if SSR for SEO mattered at v4.0, which it does not (the marketing site is mostly static content the SEO crawler can read from rendered HTML if we set the meta tags right and ship a sitemap).

Plain HTML for marketing is what v3 effectively does. The cost is we cannot reuse the FieldShore type ramp, the gold accent, the picker affordance in marketing screenshots without redoing them. The same React primitives that render the app also render the marketing screenshots, which means the screenshots are always current.

The marketing site SEO basics ship with the build:
- `vite-plugin-sitemap` generates the sitemap automatically.
- Each route exports its `<title>`, `<meta description>`, and Open Graph tags via a route level head component.
- Static pages are prerendered at build time via `vite-plugin-prerender` so the crawler sees real HTML, not a JS shell.

## The migration ramp

v3 stays at `https://vergo402.github.io/paratech-struts/`. v4 deploys to `https://vergo402.github.io/paratech-struts/v4/`. The same repo, the same Pages site, the same auth context. Both are reachable simultaneously.

The implementation: GitHub Actions runs on every push to `v4-redesign`. It runs `npm run build` which outputs `dist/`. It copies `dist/*` to `/v4/` in the `gh-pages` branch alongside the v3 files at root. v3 commits to `main` continue deploying the root unchanged.

Field testers reach v4 by typing `/v4/` in the URL or scanning a QR code printed at the back of the truck. They reach v3 by going to the root. The two apps share zero JavaScript. They share the Firebase database (a real concern handled below).

The Firebase database sharing is the load bearing risk. v3 and v4 both write to `/departments/{deptId}/...`. v4 writes break v3 if the schema changes. The mitigation:

1. v4 reads the v3 schema unchanged for the first month. Every write v4 does follows the v3 shape.
2. v4 adds new top level keys (`/v4-meta/{deptId}/...`) for v4-only state (sunlight mode preference, picker selection history, role assignment animations).
3. The Bucket 2 renames from `keen-whistling-pancake.md` Section V (`group` → `assignedResource`, `Strut Placed` → `Strut Set`) ship as dual writes. v3 reads both. v4 reads both. After three months of dual writing, v3 patches up to read only the new key, then v4 stops writing the old key.

This is the local first reconciliation pattern Principle 8 names, applied to the v3-to-v4 split. The same pattern handles the multi device no comms case described in D5.

Zero field data is lost because zero writes cross the v3-to-v4 boundary destructively. A captain who runs v4 on Tuesday and v3 on Wednesday sees the same shore points on both screens.

The cutover, when it comes, is one PR to `main`: delete the v3 files, move `/v4/*` to root, update the service worker `CACHE_NAME` one last time. v3 lives forever at the `v3-legacy` GitHub Pages branch for six months as the rollback target.

## CI/CD

GitHub Actions. Not Vercel, not Netlify, not stay on GitHub Pages without a build step.

The reasoning is the same as the framework decision: durable, free, no new vendor relationship, no credit card on file for a third party. GitHub Actions is already wired to the repo via implicit auth.

The pipeline:

1. `push` to `v4-redesign` triggers the build workflow.
2. Workflow runs `npm ci`, `npm run typecheck`, `npm run test`, `npm run build`.
3. On success, the `dist/` folder is committed to the `gh-pages` branch under `/v4/`.
4. GitHub Pages serves it within 90 seconds.

The whole pipeline runs in under three minutes on the free tier. Alex pushes, gets coffee, refreshes, sees the change. That is the v3 cadence preserved.

Vercel and Netlify both work and both are slightly faster (90 seconds end to end vs three minutes). Both also introduce a vendor relationship, a separate dashboard, a separate billing surface, and a hosting target that is not the same as v3. The marginal speed is not worth the vendor split. If v4 needs the speed later (which it will not at the volume we are projecting), the migration to Vercel is a half hour PR.

The `npm run typecheck` and `npm run test` gates fail the build on a type error or a failed unit test. The strut algorithm has full unit test coverage (per the Phase 1B note in the roadmap: "200+ unit tests for `findStrutCombinations()`"). Those tests run on every PR. A regression in the load table cannot ship.

## Testing strategy

Three layers, each justified.

**Unit tests on the domain layer.** Vitest. Every function in `src/app/domain/` has a unit test. The strut algorithm, the deduction math, the cut length math, the load table interpolation, the status order guard, the group transition rules. These are pure functions. They are also life safety critical. The cost of unit testing them is two hours per function and the benefit is permanent.

**Integration tests on the data layer.** Vitest plus `firebase-tools` emulator. The `firebaseSave()` wrapper, the offline queue, the listener teardown, the dual write path. These tests start a Firebase emulator in CI, run a sequence of writes and reads, and verify the round trip behavior. The audit findings R1 (listener leak), C2 (rules permit too much), C5 (last write wins) all fall in this layer.

**Real UI verification.** No spy tests, no eval tests, no `react-testing-library` for verification of changed user flows. The `feedback_verification_standard` memory is explicit: "eval/spy tests are NOT verification for this app." Every changed user flow gets driven through the real preview UI by the `qa-driver` agent before it ships. The Vite dev server runs at a known port; the preview MCP drives it; screenshots and console logs are the artifact.

What we explicitly do not do: Cypress, Playwright e2e suites against staging. These are heavy infrastructure for the wrong return. They catch regressions the real preview driven QA already catches, at the cost of a separate test runner, a separate config, and a layer of fragility (selector brittleness, timing flakes). The qa-driver workflow Alex has codified already does the e2e work better.

## Observability

Sentry on the free tier. Not Datadog, not LogRocket, not roll our own.

Sentry's free tier (Developer plan) is 5,000 errors per month, one user, one project. At Hartsdale scale (one dept, 5-20 active users) that is roughly 200x headroom. At hundred dept scale (rough projection: 5,000 active users) the free tier still covers if the app does not throw constantly, which is the goal.

Sentry catches:
- Uncaught exceptions in the React tree (via Error Boundary plus Sentry's React integration).
- Failed Firebase writes (caught explicitly, sent as a logged event, not an exception).
- Performance traces on the slow flows (route transitions over 500ms, slow Firebase reads).
- Source maps unminified so the stack traces are readable.

Sentry's SDK is roughly 20 KB gzipped. It loads async. It does not block the first paint.

Performance monitoring beyond Sentry is `web-vitals` reporting LCP, CLS, INP to a simple Firebase Function (or directly to Sentry). The thresholds are the Google Core Web Vitals defaults. We watch them on the marketing site (SEO impact) and on the app (UX impact).

The cost ceiling: zero dollars per month at Hartsdale scale, under $30/month at hundred dept scale.

## Cost ceiling and dependency hygiene

v3 cost: $0 to run. GitHub Pages free, Firebase Spark free, no paid SDKs.

v4 cost at Hartsdale scale (Alex's dept):
- GitHub Pages: $0
- GitHub Actions: $0 (free tier is 2,000 minutes; v4 builds use under 200/month)
- Firebase Spark: $0 (Spark covers 100 simultaneous connections and 1 GB storage)
- Sentry Developer: $0
- Domain: ~$12/year (`fieldshore.app` or similar; deferred to Phase I)
- **Total: ~$1/month.**

v4 cost at 100 dept scale (rough projection):
- GitHub Pages: $0 (still under bandwidth cap)
- GitHub Actions: $0 (still under free tier)
- Firebase Blaze: ~$25/month (5,000 simultaneous connections, 10 GB storage, modest egress)
- Sentry Team: $26/month (50K errors)
- Domain: $1/month
- **Total: ~$52/month.** Cheaper than a Hartsdale parking ticket.

The dependency tree:

| Package | Purpose | Maintainer | Risk |
|---|---|---|---|
| react, react-dom | UI | Meta | None |
| typescript | Types | Microsoft | None |
| vite | Build | Vite team (Evan You) | Low |
| @tanstack/react-router | Routing | Tanner Linsley | Low |
| @tanstack/react-query | Data | Tanner Linsley | Low |
| zustand | UI state | Poimandres | Low |
| tailwindcss | CSS | Tailwind Labs | Low |
| @radix-ui/* | Headless primitives | WorkOS | Low |
| zod | Validation | Colin McDonnell | Low |
| lucide-react | Icons | Lucide team | Low |
| firebase | Backend SDK | Google | None |
| @sentry/react | Error tracking | Sentry | None |
| vitest | Test runner | Vite team | Low |
| vite-plugin-pwa | Service worker | Vite community | Low |

Roughly 14 production dependencies. All are well maintained, all are MIT or Apache 2 licensed, all have active issue trackers. The risk profile is low because every one of these is a foundation in a thousand other apps. They will not disappear.

What is not in the tree, deliberately:
- No lodash. The few utilities we need are standard library calls now.
- No moment.js or date-fns. `Intl.DateTimeFormat` and `Temporal` (when stable) cover us.
- No CSS-in-JS runtime. Tailwind is compile time.
- No state machine library. `useReducer` plus Zustand cover us.

## Release cadence

The Apache benchmark question: does the v3 fifteen minute push to prod survive a build system?

Answer: yes, plus 90 seconds.

The v3 loop: edit file, push, GitHub Pages picks it up in 90 seconds, service worker cache busts on next visit. End to end: roughly fifteen minutes including the time to bump three version numbers and write a release note.

The v4 loop: edit file, push, GitHub Actions runs typecheck plus build (three minutes), commits `dist/` to `gh-pages`, GitHub Pages picks it up in 90 seconds, service worker cache busts on next visit. End to end: roughly seventeen minutes.

The two minute difference is the build cost. It buys:
- Type errors caught before deploy.
- Unit test regressions caught before deploy.
- A bundle that is 30% smaller than v3 (Vite tree shakes, v3 ships everything in `app.js`).
- A dev server with 50ms HMR for the inner loop.

That trade is net positive every working day of the v4 lifetime.

The version bump remains in three places (`index.html`, `src/app/version.ts`, `sw.js` for `CACHE_NAME`). The `release-manager` agent already handles that. The new third place changes from `app.js` line 1989 to `src/app/version.ts` line one, which is the only edit to the version bump workflow.

The release notes workflow does not change. `gh release create` from a commit on `main`. The user manual at `docs/USER-MANUAL.md` continues to update on MINOR/MAJOR.

## What this means for the v4.0 timeline

The roadmap calls Phase 0 (v4.0 PWA) five to six weeks. The implementation lens question: is that achievable with this stack?

Yes, with the explicit assumption that the design system phase (E) and the IA phase (F) ship usable specs by the end of week two. The build phase (H plus I) is then four weeks for the vertical slice plus four weeks for the whole app build, with weeks running in parallel where the agent dispatch model permits.

The week breakdown, rough:

- **Week 1.** Scaffold the Vite repo. Wire Tailwind, Radix, TanStack Router, TanStack Query. Port the design tokens from Phase E. Build the four picker variants as primitives. Set up GitHub Actions deploying to `/v4/`. Wire Sentry.
- **Week 2.** Port the strut algorithm and load tables to TypeScript. Full unit test coverage. Port `findStrutCombinations()`, `getLoadCapacity()`, the deduction math. Verify identical outputs to v3 via a side by side test harness.
- **Week 3.** Build the Quick Find screen end to end. Drive the preview through the qa-driver agent. First field testable surface.
- **Week 4.** Build the Operations screen. Shore point card, status transitions, group transitions, cutting workflow.
- **Week 5.** Build the Command screen (org chart) and the Inventory screen. Auth flow.
- **Week 6.** Settings, checklist UI, polish. Beta to Hartsdale.

That sequence assumes the Phase E design system specs land on time. If they slip a week, Phase 0 slips a week. There is no recovery path that does not compromise the picker doctrine depth or the field readiness of the build.

The dependency tree on the agent side is: `architect` lands the scaffold; `mobile-ux` informs the primitives; `release-manager` handles version bumps and CI; `qa-driver` verifies each surface end to end; `code-auditor` audits the deployed bundle. The implementer (this lens) does the wiring.

## What I am explicitly not recommending

A monorepo. Phase 1 of the long roadmap is the right time for Turborepo. For v4.0 we are one app and one marketing site, both shipping the same React tree. A monorepo adds Turborepo config, workspace plumbing, a `packages/core` extraction step, and a Phase 1 sized engineering investment to a Phase 0 sized timeline. Single package, two entry points.

A custom typeface. Phase E open question. The implementation default is Inter (`@fontsource-variable/inter`) until Phase E says otherwise. Inter loads in under 30 KB and renders cleanly at every size we care about. A commissioned typeface is a $5,000 to $15,000 line item we are not budgeting for v4.0.

A separate auth provider. Firebase Auth covers email plus password plus magic link plus anonymous (carryover for v3 users). Auth0, Clerk, Supabase Auth are all answers to questions we do not have.

A Storybook setup. The picker doctrine is its own documentation. Storybook is a primitive showcase for teams of 5+ designers and engineers. We are one engineer plus agents. The agents read the source code faster than they navigate Storybook.

Electron for any desktop story. The four surface model treats laptop as a browser context, not as a packaged app. Tablet Command's iPad app and the various Electron MDT clients in the reference corpus are the wrong reference here. A PWA installed to the home screen on iPad covers the tablet role. A bookmarked web app on a Toughbook covers the laptop role.

React Native, React Native Web, Expo Router. All correct for Phase 1. None correct for Phase 0. Pulling them in now means dual building (web bundle plus native bundle) for surfaces we do not need yet.

A switch to Firestore. RTDB is what v3 uses, what v4 will use, and what Phase 1's React Native Firebase will use. The schema migration argument in the roadmap is unchanged.

## What I am recommending in summary

The stack is intentionally boring. Boring is the property that lets a one person team ship at the v3 cadence and that lets agent sessions land code without a week of orientation. The interesting work in v4 is the picker doctrine, the design system, the workflow design, the NIMS terminology overhaul, the auth model, the checklist UX. The toolchain is plumbing. Pick the plumbing that fades into the background and let the design work be where the eyes go.

The recommendations below are the implementation decisions Phase H needs to make before the vertical slice prototype starts. Each is one specific tooling, framework, or process call. Each is shippable in the five to six week window. Each preserves what v3 does well and adds what v3 lacks.

---

## Recommendations

1. **Adopt Vite as the build tool.** Single `vite.config.ts`. Use `vite-plugin-pwa` for service worker generation. Dev server runs at 5173; HMR under 50ms on component edits.

2. **Adopt React 18 as the UI framework.** Not Svelte, not Vue, not Solid. The decision is durable across the React Native Phase 1 plan and matches the deepest agent training corpus.

3. **Adopt TypeScript in strict mode from line one.** `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`. No gradual migration. Brand the safety critical primitives (`Inches`, `Pounds`, `EscapedText`, `EscapedAttr`) as nominal types via Zod.

4. **Adopt TanStack Router for client routing.** Typed routes, typed search params, typed loaders. The IC drilldown from incident to division to shore point is a typed route hierarchy.

5. **Adopt TanStack Query for Firebase data.** Optimistic mutations, background sync, local first. Replaces the manual `pendingWrites` queue v3 hand maintains.

6. **Adopt Zustand for UI state.** Picker open/close, drawer state, theme, sunlight mode toggle. No Redux, no provider tree boilerplate.

7. **Adopt Tailwind v4 with custom design tokens.** Tokens live in `tokens.css` as CSS custom properties consumed by Tailwind v4's at-import config. The Phase E design system spec is executable.

8. **Build custom primitives on Radix headless.** Every picker variant in the doctrine wraps a Radix primitive. Accessibility plumbing is free; visual layer is ours. No Shadcn copy paste.

9. **Adopt Lucide for icons.** Tree shakes per icon, MIT, 1,400 icons cover the operational set. Custom shore type silhouettes live in a separate `packages/icons` folder.

10. **Adopt Zod for runtime validation at every boundary.** Firebase reads, Excel imports, URL search params, form inputs. The schema is the TypeScript type via `z.infer<>`.

11. **Adopt Sentry on the free Developer tier.** Wrap the React tree in Sentry's Error Boundary, capture failed Firebase writes explicitly, ship unminified source maps to production.

12. **One repo, two source folders, one Vite config.** `src/app/` for the PWA, `src/site/` for the marketing site. Both share the same tokens, primitives, and Tailwind config. Vite multi page build outputs both.

13. **Deploy v4 to GitHub Pages at the `/v4/` subpath.** Same Pages site as v3 root. GitHub Actions builds on push to `v4-redesign`, commits `dist/` to `gh-pages` under `/v4/`. No vendor switch.

14. **Stay on GitHub Actions for CI/CD.** Three minute pipeline (`npm ci` plus typecheck plus test plus build plus deploy). Free tier covers v4.0 plus 100 dept scale.

15. **Run Vitest for unit and integration tests; do not adopt Cypress or Playwright.** Real UI verification is the qa-driver agent driving the preview, per the `feedback_verification_standard` memory.

16. **Adopt the Firebase emulator for integration tests in CI.** Tests the `firebaseSave()` wrapper, the offline queue, the listener teardown, the dual write path against a real database, not a mock.

17. **Migrate v3's schema additively, not destructively.** v4 reads the v3 shape unchanged for the first month, adds new keys under `/v4-meta/` for v4-only state, and dual writes the Bucket 2 renames (`group` → `assignedResource`, `Strut Placed` → `Strut Set`) for three months before either side drops the old key.

18. **Use Inter Variable as the v4.0 default typeface.** Loads via `@fontsource-variable/inter`. Phase E may override later; do not block v4.0 on the typography decision.

19. **Do not adopt Turborepo or any monorepo tooling in v4.0.** Single package. Monorepo wiring lands in Phase 1 when the React Native fork begins.

20. **Do not adopt Storybook.** Agents read the source faster than they navigate Storybook. The picker doctrine and the primitive specs are the documentation.

21. **Do not build a Next.js or Astro marketing site.** Vite multi page covers it. Pre-render static pages with `vite-plugin-prerender`. Sitemap via `vite-plugin-sitemap`. Open Graph tags via a route level head component.

22. **Maintain the three location version bump.** `index.html`, `src/app/version.ts`, `sw.js` `CACHE_NAME`. The release-manager agent's workflow updates the third location from `app.js` line 1989 to `src/app/version.ts` line one.

23. **Cap the production dependency tree at roughly 15 packages.** Every addition is an ADR. Lodash, moment, date-fns, runtime CSS-in-JS, state machine libraries, and form libraries beyond `react-hook-form` are all rejected by default.

24. **Plan the cutover as a single PR to `main`.** Delete v3 files, move `/v4/*` to root, bump `CACHE_NAME` one last time, archive v3 to a `v3-legacy` GitHub Pages branch retained for six months as the rollback target.

25. **Hold the v4.0 timeline at five to six implementation weeks.** Weeks 1 and 2 are scaffold plus domain port. Weeks 3 through 5 are the four primary screens. Week 6 is auth plus checklists plus polish plus the Hartsdale beta. Anything else slips Phase 0; no in scope feature added at week 4 is allowed.
