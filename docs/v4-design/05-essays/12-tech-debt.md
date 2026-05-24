# Tech Debt — Brainstorm Essay

> **Lens:** Tech debt inventory. What v3 patterns must NOT cross into v4, what patterns MUST cross verbatim because twenty patches paid for them, and what shape the seams take when an 8,890 line `app.js` finally modularizes.
>
> **Anchors:** `CLAUDE.md` shipped fix history v3.5.2 through v3.19.1, `.claude/audits/findings-ledger.md` (~100 unique findings), `.claude/plans/CONSOLIDATED-STATUS.md`, the production code at `app.js`, `index.html`, `sw.js`, `database.rules.json`.

---

## Executive Summary

v3 is a working tool with prototype skin. The bones the audit certified (load math, local first writes, listener teardown, SRI pins, XSS hardening) cost twenty patches and an interrupted Hartsdale field cycle to land. None of that work should be re inferred by a v4 build. None of the architectural shapes that produced the original bugs should survive either.

The pattern is simple. v3 wrote things into the DOM by interpolating strings and remembered to escape them ninety seven percent of the time. v4 picks a framework that escapes by default and forbids the three percent. v3 kept four hundred mutable module level bindings in one file. v4 splits the file at the natural seams (Quick Find, Operations, Inventory, Command, Settings, plus a pure load math engine and a Firebase service). v3 paid for the no build deploy in static analysis it could not run. v4 pays once for the toolchain and never pays again per release. v3 evolved the local first write architecture by removing a wrong fork that lived in forty four sites. v4 starts with one write path.

The conservative floor interpolation, the Paratech and LongShore tables transcribed row by row from the manufacturer datasheets, the per row Status state machine, the per device groupId entropy, the validate rule field discipline, the diagnostics sync ledger, the SRI pinned CDN scripts, and the per listener teardown pair all cross to v4 unchanged. A `LESSONS.md` next to the design system records why, so a future contributor cannot quietly retire any of them in the name of cleanup.

This essay enumerates each.

---

## Keep verbatim

These are the v3 patterns that paid in production for their existence. v4 inherits the values, the tables, the algorithms, and in some cases the literal data, with a footnote explaining why a future contributor cannot innocently delete them.

### The load tables

`ACME_LOAD_TABLE` at `app.js:51` and `LONGSHORE_LOAD_TABLE` at `app.js:77` are not derived from a formula. They are transcribed from the Paratech O&M Manual Table 2-7 and the LongShore datasheet (December 2019), row by row, after v3.5.2 caught a linear interpolation cliff that over reported the 11 foot ACME capacity by 17 percent and v3.9.0 caught the LongShore 13 foot row over reporting by 17.9 percent. The data lives in the code as constants because there is no other safe place to put it. A future contributor opening these tables and seeing the gaps between rows must not be allowed to "smooth them out" with interpolation. The header comments on both arrays make that clear in v3. v4 carries the same data plus a stronger comment plus, ideally, a snapshot test that compares every row against a checked in JSON fixture extracted from the manual PDF, so a single character edit breaks CI.

In a v4 codebase the tables move into a pure module, something like `core/load/tables.ts`. Type the rows, freeze the arrays, and export them. The engine that consumes them belongs in `core/load/engine.ts`. The presentation layer never touches these.

### The conservative floor interpolation

`getLoadCapacity()` at roughly `app.js:143` returns the longer row's capacity when a measurement falls between two rows. Always longer, never shorter. The rationale is the Euler 1/L^2 concavity that makes linear interpolation systemically over report. v3.7.2 audit closure (`findings-ledger.md` C1) verified the closure with twenty one probes against the table. v4 keeps the same function, the same name, and the same unit test corpus. It also adds a property test: for any pair of adjacent rows, the function returns the shorter capacity for any midpoint, period.

### The status state machine and progression guard

`STATUS_ORDER = ['pending', 'process', 'strutplaced', 'cutting', 'runner', 'secured', 'returned']` at `app.js:714` is more than a sort order. v3.9.0 used it to enforce the F-1C-1 guard: when a pre cutting transition fires on a grouped shore point, group members already past the target status are skipped. Without that guard, "Send Back" on one member regresses every group mate that has already advanced into cutting or runner or secured.

In v4 this becomes a real reducer. The state machine lives in `core/shorepoint/status.ts`. The seven states become a discriminated union. The legal transitions become a table. The reducer takes a current state and an event and returns the next state or rejects the transition. The group fan out lives in the operation reducer, which calls the per shore point reducer per member and applies the same guard. Replacing 300 lines of imperative `if (status === 'cutting' && ...)` with a 30 line reducer is the win; the doctrine those 300 lines encoded is preserved row for row.

### The local first write architecture (v3.5.3 work)

`firebaseSave()` at `app.js:1651`, `persistOperation()` at `app.js:1506`, and `persistInventory()` at `app.js:1511` are the three primitives that make v3 work offline. The forty four mutation sites that used to split on `if (db) { firebase } else { localStorage }` were collapsed to "always persist locally, then conditionally sync via firebaseSave." v4 inherits the discipline literally:

1. Every mutation lands in local state first.
2. The persistence layer writes to IndexedDB (or localStorage, scoped per dept).
3. The sync service queues a write and returns immediately.
4. The sync service flushes on reconnect, with the pendingWrites discipline below.

The naming changes (`persistOperation` becomes `operationStore.commit`, `firebaseSave` becomes `syncService.enqueue`), but the topology does not. The bug class v3.5.3 closed will reappear the day someone forks the write path on connectivity. v4's lint rule: any direct call to the sync service from a UI component is an error. The only legal callers are the stores. The stores are the only callers of the sync service.

### The pendingWrites flush with diagnostics

`flushPendingWrites()` at `app.js:1856` and `logSyncEvent()` at `app.js:1617` together are the v3.8.1 and v3.8.2 work that made sync failures observable. `flushPendingWrites` tags every queued op with appVersion, retries, and timestamp; on flush it discards stale (> 24h), version mismatched, or max retried entries with a `logSyncEvent` event so the drop is visible in `/diagnostics/sync/`. The retry pattern, the version filter (a v3.8.2 invariant: pending writes from an older app version are discarded rather than replayed), and the error capture in the flush event all cross to v4 unchanged. The ledger lives at `/diagnostics/sync/` in the database, with the rules at `database.rules.json:116`. The auth gated write, the validate rule, and the lack of read in production all stay.

### The SRI pinned CDN scripts

`index.html:753-760` pins Firebase SDK and SheetJS with SHA 384 integrity and crossorigin anonymous. `sw.js:13` precaches the SheetJS URL with `mode: cors` so the cached response still validates the SRI on subsequent loads. v3.9.0 closed F-5A-6 by adding these. v4 should never load a CDN script without SRI, and the rule belongs in CI: an HTML or JSX file that loads a remote `<script>` without an `integrity` attribute fails lint. If v4 moves to a bundler, this rule still matters for any progressive enhancement or analytics tag added later.

### The per row Firebase validate rules

`database.rules.json` validates `status` against the seven state regex (line 43), `requiredLength` against the 12 to 500 inch range (line 46), `estimatedLoad` against 0 to 500,000 lbs (line 49), and so on. v3.8.2 shipped a one character correction (the `inventory` rule required a `name` field but the code wrote `model`) after every inventory write had been silently failing validation for five releases. The lesson is not "write better rules." The lesson is that the rules and the writing code are two halves of one contract and they drift unless tested together.

v4 should generate the rules from a single TypeScript schema (Zod, ArkType, or a hand rolled discriminated union) that the client also uses to validate before write. One source of truth, two consumers. If the schema changes, both the rules and the writer change together, with a build step that fails if they diverge.

### The per device groupId entropy

`confirmCreateGroup()` at `app.js:2505`, `deployShorePoint()` cohort at the cutting workflow sites, and the F-1C-9b v3.9.0 hardening all generate IDs with `Date.now() + Math.random().toString(36).slice(2,6)`. Same millisecond collisions across devices on a busy multi team incident were a real failure mode. v4 uses real UUIDs (UUID v4 from crypto.randomUUID() in the browser, which is universally supported on the platforms we target). The discipline survives. The implementation gets less ad hoc.

### The teardownListeners and setupListeners pair

`teardownListeners()` at `app.js:2799` detaches inventoryRef, activeOpsQuery, archivedOpsQuery, apparatusRef, settingsRef, customTypesRef, and the connRef callback. `setupListeners()` at `app.js:2820` calls teardownListeners first, then reattaches with current deptId. The R1 finding from the v3.5.1 audit was that stale dept listeners were never `.off()`'d, so after a dept switch the old dept's listeners would overwrite the new dept's localStorage. The fix lives in 12 lines of code that look unremarkable. The reason they exist is documented inline.

The framework equivalent in React is `useEffect` returning a cleanup function. Every subscription, every event listener, every interval, every WebSocket handle returns its disposer from the effect. The lint rule that prevents this regression is `react-hooks/exhaustive-deps`. The architectural discipline is that every connection has a tear down path, period. v4 inherits the principle, not the file.

### The first fire guards on Firebase listeners

The S7 v3.5.2 fix in `setupListeners()` blocks the empty first snapshot wipe pattern. If a listener's first snapshot is empty but local state has data, push local up to Firebase rather than wiping local. This is one of the most expensive lessons in the audit because the bug is invisible until it strikes (user types the wrong deptId, listener fires empty, local data wiped silently). v4 keeps the guard. In a React Query or Apollo world this becomes a `keepPreviousData: true` + a deliberate reconciliation hook. The doctrine is "Firebase is not authoritative on first connect; the device's local state is, until a real snapshot arrives that overrides it."

### The audit trail discipline

Every fix in v3 has a comment that names the audit finding ID, the release that shipped it, and the rationale. `app.js:647` ("F-1B-01 (v3.10.0)"), `app.js:2851` ("S7 (v3.5.2)"), `app.js:1560` ("C2 (v3.11.3)"), and dozens more. This was not in the original code. It accrued. v4 should ship with the convention from day one: every non obvious branch carries the ticket ID or the doctrine source.

### Real product names under nominative fair use

ADR-001 relaxed the codename rule before Phase C. v4 inherits the discipline without the codename overhead. The reference teardowns name Tablet Command, First Due, RedNMX, IAMResponding, RapidSOS, and Fire Rescue Systems directly. That stays.

---

## Retire entirely

These are v3 patterns that should not survive the rebuild.

### The 8,890 line `app.js`

`wc -l app.js` returns 8,890. Three hundred seventy four module level declarations (`grep -cE "^const |^let |^var |^function " app.js` returns 374, with 62 `let` or `var` bindings). The file is a single shared mutable namespace. `db`, `deptId`, `inventoryRef`, `operationsRef`, `pendingWrites`, `isOnline`, `localInventory`, `activeOperation`, `localApparatus`, `selectedApparatus`, `spQuantity`, `archivedOperations`, `laneCollapsedState`, `editingShorePointId`, `currentView`, `drilldownPath`, `myRole`, and roughly forty more are all globally visible to every function. The audit findings about race conditions, listener leaks, and stale state are almost all consequences of one root cause: a global namespace cannot be reasoned about.

The natural seams when v4 modularizes:

- `core/load/` — pure functions over the strut tables. No DOM, no Firebase, no state. Inputs: measurement, load, inventory, deductions, system filter. Outputs: combinations array. Unit tested in isolation against the manufacturer datasheets.
- `core/shorepoint/` — the status state machine and the reducer. Pure.
- `core/operation/` — the operation model: shore points, apparatus assignments, role assignments, hazards, divisions. Pure reducer. Cross dispatches to `core/shorepoint/` for per SP transitions.
- `data/sync/` — the firebase service (or whatever backend v4 picks). Single write path. Pending queue. Reconciliation. Diagnostics ledger.
- `data/store/` — the local first persistence layer. IndexedDB or localStorage. Reads on boot, writes on every commit.
- `ui/quickfind/` — Quick Find route.
- `ui/operations/` — Operations route.
- `ui/inventory/` — Inventory route.
- `ui/command/` — Command route.
- `ui/settings/` — Settings route.
- `ui/checklists/` — the new D6 surface.
- `ui/picker/` — the four picker variants from the depth bar doctrine.

Each route is a folder. Each folder has its own state, its own tests, its own story. No file exceeds 800 lines. If it does, the seam was wrong.

### The no build deploy

GitHub Pages picks up `app.js` and serves it raw. There is no type checker, no linter (no `eslint` step in CI), no minifier, no tree shaking, no dead code elimination. The tradeoff in v3 was "edit, push, done" which served the prototype phase. The cost is that the static analysis the team needs to keep up with an 8,890 line file does not exist.

v4 picks Vite or esbuild (resolved at Phase H, open question #11). Either is fine. The dev loop is still fast. The production build emits a hashed bundle. The CI step runs `tsc --noEmit`, `eslint`, `vitest`, and the snapshot tests against the load tables. No PR merges without all four passing. The "edit, push, done" loop survives for designer level CSS tweaks via a Storybook style sandbox, but production code goes through CI.

### Inline `onclick=` HTML attribute construction

`grep -n "onclick=" app.js | wc -l` returns 94. Combined with 70 plus inline `onclick=` attributes in `index.html`, the total surface is roughly 160 sites where JavaScript identifiers are spliced into HTML strings via template literals. The X1, X2, X3 v3.5.2 audit fixes (drilldown XSS, inventory model XSS, Command Layout onclick XSS) all came from one root cause: when you build HTML by string concatenation and then interpolate user controlled data into both element text and attribute values, you have two escape budgets to spend correctly every time. `escapeHtml()` covers element text. `escapeAttr()` covers attribute values. Mixing them is a vulnerability.

The v3 escapeAttr discipline shipped in v3.9.0 and was hardened in v3.11.3 and v3.15.0. The discipline is correct. It is not the framework.

In v4 the rule is: JSX escapes element text and attribute values automatically. `dangerouslySetInnerHTML` is forbidden by lint rule (`react/no-danger` as error). The one or two legitimate cases (the undo link toast at `app.js:2312` is the canonical v3 example) get a `<UndoToast />` component with a typed `onUndo` callback, not an HTML string with an `onclick="..."` attribute inside. The escapeHtml/escapeAttr split disappears with the surface that needed it.

### The `escapeHtml()` versus `escapeAttr()` split

`escapeHtml()` at `app.js:745` returns `div.textContent = s; return div.innerHTML;`. This escapes `<`, `>`, `&` but not `"` or `'`. Safe for element text contexts only, not attribute values. `escapeAttr()` at `app.js:752` escapes the full set including `"` and `'` and is the only safe interpolation inside `attr="..."`. The split exists because innerHTML construction is a real surface in v3.

In v4 this surface goes away. The escapeHtml and escapeAttr functions disappear. The `LESSONS.md` next to the v4 design system records the rationale: "v3 had a 160 site interpolation surface and a two function escape contract. v3.5.2 through v3.15.0 audited and hardened every site. v4 forbids the surface; the contract is no longer needed. The audit history lives in `findings-ledger.md` under X1 through X12. If a v4 component ever introduces `dangerouslySetInnerHTML`, the reviewer reads this lesson before approving."

### `localStorage.getItem` and `safeParse` everywhere

`grep -n "safeParse\|localStorage.getItem" app.js` returns dozens of sites. The L1 v3.6.0 fix introduced `safeParse(json, fallback)` at `app.js:1589` to catch JSON.parse exceptions. The L2 fix made `safeSetItem` at `app.js:1596` swallow quota errors. The S4 v3.5.2 fix wrapped the `JSON.parse(sessionStorage.orgCollapsed)` call at module load in try/catch so a corrupt session storage entry would not brick the app. Each fix patched a specific call site. The architecture remained "every module reaches into localStorage by string key."

In v4 the persistence layer is one module. It owns IndexedDB. It exposes typed get/set/list per entity. It handles corruption, quota, and migrations. No other module calls `localStorage` or `IndexedDB` directly. The seam is enforced by the file structure (the API is the only export). The S4 brick failure mode goes away because there is one parse site, one fallback path, and one place to migrate when the schema changes.

### Native `confirm()` and `alert()` calls

The U3 v3.6.0 finding catalogued 10 native `confirm()` dialogs and 19 `alert()` calls in app.js. The fix path was to replace them with custom sheets per Principle 6 (doubt free escapes). v4 has the toast based undo pattern as a first class primitive and no `confirm()` or `alert()` ever ships. Lint rule: `no-alert` as error.

### The `selectApparatus(\'${app.id}\')` string splicing pattern

The X1, X2, X3 fixes replaced inline JS construction with `data-` attributes and a delegated click handler. The v3.5.2 work shipped `commandLayoutClick(this)` as the data attribute handler at `app.js:3779`. The pattern still appears in 50 plus sites that did not need an XSS fix because they used `escapeAttr` correctly. The pattern itself is a v3 idiom v4 should drop. JSX renders `<button onClick={() => selectApparatus(app.id)}>{app.name}</button>`. The closure captures the id; no string splicing happens.

### The mixed PWA + Firebase compat SDK shape

v3 loads Firebase 9.23.0 compat (`firebase-app-compat.js`, `firebase-database-compat.js`, `firebase-auth-compat.js`). Compat layer exists because the codebase predates the modular v9 API and was never migrated. The compat SDK is roughly 200 KB larger than the modular equivalents. v4 picks the modular SDK and trees shake what it does not import. If v4 picks a different backend (Supabase, PocketBase, or a roll your own Node hub for the C path of D5), the question is moot. Either way, the compat shim does not cross.

### The `capacityAll` array computed but unused

`app.js:290, 313, 344` — the `capacityAll` array on every strut combination result is computed but never read by any consumer. S-L4 in the findings ledger flagged it as low priority deferred. It is a real example of premature abstraction (someone thought downstream code would want the per system capacities, downstream code never asked, the field stays). v4 deletes it.

### The `debounce()` helper that has no callers

`app.js:737` defines a generic `debounce(fn, wait)` helper. The comment notes that the original audit concern (Quick Find inputs calling `findStrutCombinations` on every keystroke) was investigated and found not to apply. The helper sits there for "future input handlers that need it." No call sites exist. v4 deletes it. If a future input needs debouncing, lodash-es or a four line implementation does the job at the site that needs it.

### The `validateInput()` storage layer sanitizer that is partially redundant

`validateInput()` at `app.js:760` strips control chars and enforces length but intentionally preserves HTML metacharacters because escapeHtml handles them at render time. The function is correct for v3 because the render layer is HTML string concat. In v4 the render layer is JSX, the escape is automatic, and the only legitimate job of `validateInput` is the length and control char strip. That belongs in a schema validator (Zod's `.max(100)` and `.regex(/[\x00-\x1F\x7F]/, "no control chars")`). The function as it stands does not cross.

### The plate base64 thumbnails in `app.js`

`BASE_PLATES[]` carries 14 connector types with base64 encoded JPEG thumbnails inline in `app.js`. The data accounts for a meaningful share of the file size and parses as code on every page load. v4 ships the images as static assets under `public/plates/*.jpg`, references them by URL, and lets the service worker precache them on first install. The picker doctrine's "visual grid picker" pattern survives; the base64 strings do not.

### The `assignedResource` versus `group` dual write

v3.12.0 began the `group` to `assignedResource` rename with a dual write window. `getSPGroup(sp)` at `app.js:1539` chains the fallback (`sp.assignedResource ?? sp.group ?? sp.team`). The rename is the right doctrine fix (NIMS Group is a functional command unit, not a resource field), but the dual write doubles the storage cost of every shore point and the fallback chain is a small surface for confusion. v4 finishes the rename. The migration runs once on first launch against the existing dept data, writes `assignedResource` and removes `group`, and the fallback chain disappears. The Bucket 2 work in Section V of the plan calls this out explicitly.

---

## Carry forward in spirit only

These v3 patterns are correct in intent but the v4 implementation looks nothing like the v3 implementation.

### The drilldown navigation

v3's drilldown (`drilldownPath = [{level:'building',value:'A'}, ...]`) is a hand rolled router for one screen. The state is module level. The history is in memory only (a page refresh loses it). The navigation is by direct mutation of the array followed by a `renderOperations()` call.

v4 uses real client side routing. React Router or TanStack Router treats drilldown levels as URL segments: `/ops/active/buildings/A/divisions/3/areas/north`. The browser back button works. Deep links into a drilldown level work. The state is in the URL, not in a module level array. The seam serves the same purpose; the mechanism is standard.

### The `editingShorePointId` and `editingExternalId` and `editingIndividualId` module level edit pointers

Three sibling fields track "which thing is the user currently editing?" v3 manages them by hand and the R14 v3.6.0 audit found that closing a modal without a save would leave the pointer set, so the next save could land on the wrong record. v4 puts edit state inside the modal component. The modal owns its draft via local state and discards it on close. The pointer disappears.

### The `myRole` module level role pointer

v3's `myRole` is the device's self assigned role within an active operation. It is persisted to localStorage. It is read by view router code to decide what tab to land on. It is cleared on logout, but v3.8.3 had to add an explicit clear when the role was cleared via the org chart (was previously orphaned). The concept survives; in v4 it lives in a `useDeviceRole()` hook backed by the persistence layer, with the clear semantics defined in one place.

### The org chart drag and drop with three input modes

v3 supports tap to pick and place, HTML5 drag events, and a touch drag with floating clone. The L-M1 and L-M2 v3.6.0 audit findings caught the touch clone and the long press timer leaking on `touchcancel`. The orgSwapRoles function uses granular `update()` to avoid the R3 concurrent clobber. The mechanism is hard won and correct.

v4 uses `dnd-kit` or `react-dnd` for the drag layer; the touch + mouse + keyboard story is handled by the library, including `touchcancel` cleanup. The concurrent safety is solved by the same granular update pattern at the data layer (the only legal write is `update({ targetId: roleId })`). The behavior survives; the imperative input handling goes away.

### The `getApparatusName()` Map cache

The P1 v3.6.0 finding moved `getApparatusName()` from O(n) `find()` per call to a `Map<id, apparatus>` built once per render cycle. In a React app, this kind of derived data lives in `useMemo` or in a selector against the store. The pattern survives; the manual cache invalidation goes away.

---

## Lessons for the v4 framework choice

The framework choice (open question #8) is the gate at Phase H. The tech debt lens informs it.

**PWA + React (or Preact, or Solid) + Vite + TypeScript + Zustand or Jotai or Redux Toolkit + a typed Firebase wrapper.** This is the path of least disruption. It keeps the offline first contract intact (service worker survives), keeps Firebase Realtime Database (already paid for in audited security rules), and lets the design system primitives ship as a real component library. The cost is one toolchain decision per slot, and the team has to learn each pick.

**React Native + Expo.** The strategic roadmap memory notes Phase 1 of the v3 to v5 plan is React Native. The cost is high (port every single screen, lose the SW model, gain App Store distribution). The benefit is the native gesture, sensor, and offline storage story. For the v4 timeline this is too much. v4 stays PWA. v5 considers React Native.

The framework lessons that matter regardless of choice:

- **TypeScript is non negotiable.** Open question #12 should resolve yes at Phase H. The audit history is full of fixes that catch field name typos, status string mismatches, and shape drift. A type checker catches all of those at edit time.
- **The state machine library matters.** XState or a hand rolled discriminated union reducer both work. The doctrine is "states are an enum, transitions are a table." The v3 STATUS_ORDER pattern is the seed.
- **The component library is custom.** The reference teardowns showed that no existing emergency services library has the four surface story or the picker doctrine v4 needs. Radix Primitives or React Aria as a headless base, custom visuals on top. Tailwind for tokens. The decision should not block v4 (open question #13 resolves at Phase H).

### Listener leak prevention as a framework concern

In React this is `useEffect` returning a cleanup function and `react-hooks/exhaustive-deps` enforcing the dependency array. Every subscription, every event listener, every interval, every WebSocket handle returns its disposer from the effect. The R1, R2, L-M1, L-M2 findings all reduce to "v3 had no framework level lifecycle hook for subscriptions." React provides one. v4 uses it. The lint rule prevents regression.

### `AbortController` as the universal escape

For fetch calls, the AbortController + signal pattern lets a component cancel in flight requests on unmount. Any data fetching library v4 uses (TanStack Query is the obvious pick) handles this internally. v4 never writes a raw `fetch().then()` without an abort signal.

### The diagnostics ledger as a load bearing artifact

`/diagnostics/sync/` is not noise. It is how the team caught the v3.8.2 inventory write silent failure, the resync drift on apparatus checkouts, and the version mismatched pending writes. v4 keeps the path, the events, and the schema. It adds a Settings level surface (admin only, behind a feature flag) that shows the last N events in a table so a department can spot a problem without opening the Firebase console. The Excel export of the diagnostics ledger becomes a feedback artifact.

### The Excel import/export — what stays, what changes

SheetJS (`xlsx-0.20.3`) is precached at `sw.js:13` and SRI pinned at the dynamic loader. It is roughly 500 KB. The v4 question is whether SheetJS stays or whether a lighter library (`exceljs` for write, `papaparse` for CSV, `xlsx-js-style` if styled output matters) wins.

The v3 import/export does three things: ingest department inventory from a spreadsheet, export current inventory, and round trip preserve the IDs (v3.5.2 NEW-6 closure). The doctrine is right. v4 should keep the round trip preservation. The license question for SheetJS Community Edition is the deciding factor (Apache 2.0 for `xlsx`, fine). The library size is the secondary factor.

If v4 ships a CSV export as the primary format and the Excel format as an "advanced" option, the bundle savings are real and most use cases (a dept's inventory tracker, an after action artifact) are well served by CSV. The decision belongs in Phase H. The R5 v3.6.0 fix (per item Firebase `.update()` on import instead of `set` on `/inventory` root) is doctrine that crosses verbatim regardless of library.

---

## Picker doctrine depth

The depth bar set by `03-primitives/picker.md` is the standard every primitive carries. The picker is not changing in v4 at the doctrinal level (four variants, 8 option boundary, search at 7 plus, single select commits immediately, plate connector picker preserved as the visual grid pattern). The v3 plate picker code path — `openPlatePicker()`, `closePlatePickers()`, the `document.body` move pattern, the `touch-action: pan-y` + `transform: translateZ(0)` + visibility toggle iOS fix — all cross verbatim. The L-L5 finding (`_originalParent` reference on plate grid for potential stale parent) is a real bug deferred in v3. v4 closes it with a portal pattern (React `createPortal` to `document.body`) that does not need to remember the original parent because the portal owns the lifecycle.

The four picker variants become four components: `<InlineSegmentedPicker>`, `<BottomSheetPicker>`, `<FullScreenListPicker>`, `<NativeSelectFallback>`. Each is in `ui/picker/`. Each carries its own story in Storybook. The 8 option boundary is encoded by the choice of component, not by a runtime check (the developer picks the right one based on the count at the call site). The accessibility floor (WCAG 2.1 AA, VoiceOver scripts, Reduce Motion respect) is shared via a base hook (`usePickerA11y`). The plate picker pattern is its own `<VisualGridPicker>` component with the v3 doctrine encoded.

---

## Three named dead code candidates

1. `capacityAll` array in `findStrutCombinations()` results at `app.js:290, 313, 344`. Computed but no consumer. Findings ledger S-L4, deferred in v3. v4 deletes.
2. `debounce()` helper at `app.js:737`. Defined but never called. The audit comment explicitly notes the original concern did not apply. v4 deletes.
3. The `currentValue` legacy fallback in `renderAssignedResourceOption()` at roughly `app.js:3395`. The dropdown carries an explicit "(legacy)" option for shore points whose `group` value no longer matches a known apparatus. After the v4 cutover migration runs, no shore point will have a stale value, and the legacy option becomes dead. Delete after migration confirmed clean.

A fourth candidate worth naming: the `validateInput()` function as written. The control char strip and length enforcement belong in a schema layer in v4. The function survives as a one liner the schema calls; the wrapper goes.

---

## What v3 evolved into that v4 should adopt without restating

The audit trail comments are the institutional memory. v4 starts with the same convention: every non obvious branch, every defense in depth check, every doctrine source carries a comment naming the rationale. The `CLAUDE.md` history of v3.5.2 through v3.19.1 is the spine. v4 adds release notes per minor and patch and links them from the principles doc.

The "always write locally first, then sync" rule is the most important architectural decision in v3 and it took until v3.5.3 to land cleanly. v4 starts there. The store API is the only legal mutation entry. The sync service is downstream of the store. The store is the source of truth at the device level. Firebase (or whatever) is the source of truth at the department level, and the reconciliation discipline closes the gap.

The "every listener pair has a teardown call before reattach" rule survives as the React `useEffect` cleanup. The lint rule that enforces it is `react-hooks/exhaustive-deps`.

The "every Firebase write path validates against the same schema the rules validate" rule is new for v4. The v3 lesson is that drift between the writer and the rule is silent. The fix is a single source of truth schema.

The "every CDN script carries SRI" rule survives. The lint check is new.

The "every doctrine constant has a source comment naming the manual page" rule is new. v3 retrofitted it after the ACME load table fix. v4 starts with it.

---

## Recommendations

1. Codify the 8,890 line `app.js` seams in a `docs/v4-design/07-design-system/module-boundaries.md` doc before Phase H starts. Eleven modules per the list above. No file exceeds 800 lines.
2. Delete `escapeHtml()` (`app.js:745`) and `escapeAttr()` (`app.js:752`) from the v4 codebase. Replace with JSX default escaping. Lint rule `react/no-danger` as error.
3. Keep the v3.9.0 escapeAttr discipline as historical reference in `docs/v4-design/LESSONS.md` so a future contributor reading X1 through X12 in the findings ledger understands why the surface was retired rather than rebuilt.
4. Move `ACME_LOAD_TABLE` (`app.js:51`) and `LONGSHORE_LOAD_TABLE` (`app.js:77`) to `core/load/tables.ts` as frozen typed arrays. Ship a JSON fixture extracted from the Paratech manual PDFs and a snapshot test that fails CI on any row drift.
5. Move `getLoadCapacity()` and the conservative floor doctrine to `core/load/engine.ts`. Add a property test: for any adjacent table rows A and B and any measurement M between them, the function returns A.capacity (the shorter, higher capacity row).
6. Keep `STATUS_ORDER` (`app.js:714`) verbatim in `core/shorepoint/status.ts` as the seven state discriminated union. Implement the v3.9.0 F-1C-1 progression guard as a reducer level invariant: a transition is rejected if the target status is earlier in `STATUS_ORDER` than the current status for any group member.
7. Rename `firebaseSave()` (`app.js:1651`) to `syncService.enqueue()` in `data/sync/`. Keep the offline queue, the appVersion tag, the retry counter, the timestamp, and the diagnostics logging behavior verbatim. Lint rule: no UI component imports `syncService` directly.
8. Rename `persistOperation()` (`app.js:1506`) and `persistInventory()` (`app.js:1511`) to `operationStore.commit()` and `inventoryStore.commit()` in `data/store/`. Keep the local first contract. Add a CI assertion (a custom ESLint rule or a grep based pre commit) that no mutation site calls the sync service without first calling the store.
9. Keep `flushPendingWrites()` (`app.js:1856`) and `logSyncEvent()` (`app.js:1617`) behavior verbatim in `data/sync/flush.ts` and `data/sync/diagnostics.ts`. Retain the 24h stale drop, the version filter, the error capture in the flush event, and the 50 entry offline buffer.
10. Keep the SRI pins at `index.html:753-760` and the SheetJS precache at `sw.js:13`. Add a CI lint check that fails on any new `<script>` or dynamic import of a remote URL without an `integrity` attribute or hash check.
11. Generate `database.rules.json` from a single TypeScript schema (Zod). Client validates against the same schema before write. CI step asserts the generated rules match the committed file. Closes the v3.8.2 inventory rule drift class permanently.
12. Replace the `Date.now() + Math.random().toString(36).slice(2,6)` ID pattern with `crypto.randomUUID()` at every ID generation site. The doctrine (per device entropy) survives; the implementation is standard.
13. Replace 94 inline `onclick=` interpolations in `app.js` and 70 plus in `index.html` with JSX event handlers. The closure capture pattern (`<button onClick={() => fn(id)}>`) replaces the string splicing pattern. Lint rule `react/jsx-no-bind` informational only (closure creation per render is not a real perf concern at our scale).
14. Replace 10 `confirm()` and 19 `alert()` calls (per U3 and A12 findings) with the toast based undo pattern per Principle 6. Lint rule `no-alert` as error.
15. Replace `localStorage.getItem` and `safeParse` scatter (`app.js` dozens of sites) with a single `persistence/` module owning IndexedDB. Typed get/set/list per entity. No other module touches storage directly.
16. Delete `capacityAll` array fields (`app.js:290, 313, 344`) from the strut combination result type. Dead since shipped; S-L4 in findings ledger.
17. Delete the `debounce()` helper (`app.js:737`). Not called. If a future input needs it, write it at the call site or use lodash-es.
18. Inline plate connector base64 thumbnails (`BASE_PLATES[]`) become static assets under `public/plates/*.jpg`. Service worker precaches on first install. Bundle size drops, parse time drops.
19. Finish the `group` to `assignedResource` rename (Bucket 2 in plan Section V). One time migration on first launch. Delete the `getSPGroup(sp)` fallback chain (`app.js:1539`) after migration confirmed clean against a fork of prod data.
20. Adopt TypeScript strict mode for v4. Resolve open question #12 at Phase H as yes. The audit history justifies the cost.
21. Adopt React (or Preact, or Solid) for v4. PWA stays. React Native deferred to v5 per memory roadmap. Resolves open question #8 at Phase H as PWA.
22. Adopt Vite for build tooling. Resolves open question #11 at Phase H. The CI gate runs `tsc --noEmit`, `eslint`, `vitest`, and the load table snapshot test.
23. Write `docs/v4-design/LESSONS.md` capturing the institutional memory: the v3.5.2 ACME 11 foot over report, the v3.7.2 conservative floor switch, the v3.8.2 inventory rule field drift, the v3.5.3 local first cutover, the v3.9.0 status progression guard, the v3.9.0 SRI pinning, the v3.11.3 showToast XSS split, the v3.15.0 division migration. A future v4 contributor reads this before deleting any inherited verbatim code.
24. Adopt the v3 audit trail comment convention from day one in v4. Every non obvious branch carries the issue ID or doctrine source.
25. Keep the `/diagnostics/sync/` Firebase path, rules (`database.rules.json:116`), and writer behavior verbatim. Add a Settings level (admin only) read surface that paginates the last N events. Add an Excel or CSV export of the ledger for feedback artifacts.
26. Replace SheetJS with `papaparse` (CSV) as the primary import/export format. Keep SheetJS as an optional secondary format gated behind an "Advanced" toggle. The R5 v3.6.0 per item `.update()` discipline crosses verbatim regardless of library.
27. Replace the v3 hand rolled drilldown router (`drilldownPath` array at `app.js:670`) with a real client side router (TanStack Router or React Router). Drilldown levels become URL segments. Browser back button works. Deep links work.
28. Replace the three `editingShorePointId` / `editingExternalId` / `editingIndividualId` module level pointers with modal local state. The modal owns the draft and discards on close. The R14 v3.6.0 wrong save target class disappears.
29. Implement the four picker variants from `03-primitives/picker.md` as four components in `ui/picker/`. Keep the v3 plate picker behavior verbatim as a fifth component (`<VisualGridPicker>`). Use React `createPortal` to escape the modal stacking context instead of the v3 `document.body` move.
30. Encode the v4 lint floor in `eslint.config.js` from Phase H: `react/no-danger` error, `no-alert` error, `react-hooks/exhaustive-deps` error, `@typescript-eslint/no-floating-promises` error, custom rule "no `<script>` without `integrity`" error.
