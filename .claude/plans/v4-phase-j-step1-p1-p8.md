# Phase J Step 1 — board-2 P1–P8 fixes (SDD plan)

Companion to `.claude/plans/v4-completion-runbook.md` Step 1. Eight independent tasks, one GitHub issue each, worked in board-2 Priority order. Spec authority per task = the GitHub issue body (+ comments) quoted in the task; pre-flight notes (current code locations, UI strings, test conventions) live in the scratchpad `preflight/<issue>.md` files named in each task.

## Global Constraints

- Branch `v4-redesign`, v4 app under `src/` only. Never touch the v3 root files (`index.html`, `app.js`, `style.css`, `sw.js`, root `manifest.json`).
- **TDD is mandatory** (`superpowers:test-driven-development`): write the failing test first, record the RED output, then the minimal fix, then refactor. Any existing test that pins the old behaviour moves in the same change — never leave a red test behind.
- **Implementers run NO git commands at all** (no stash/checkout/restore/reset/clean/commit/add). File tools + `npx vitest run <file>` / `npm run typecheck` only. Fable commits.
- Test conventions (from `vitest.config.ts`): node env by default, `// @vitest-environment jsdom` per DOM test file; Dexie tests `import 'fake-indexeddb/auto'`, a fresh `createDB(\`test-…-${newId()}\`)` per test and `afterEach(() => db.delete())`; no `vi.useFakeTimers` in fake-indexeddb files (inject timers instead); singletons reset via their setters. Test output must be pristine.
- No new npm dependencies. Do not edit `database.rules.json` / `src/core/schema/rules.ts` (rules deploy order is governed by ADR-041).
- UI copy: plain language, same voice as the surrounding strings (sync banner, import flow). v4 Tailwind spacing utilities (`mx-auto`, `gap-*`, `p-*`, `w-full`) are DEAD — layout via `fs-*` CSS classes or inline styles.
- Keep `src/core/load/struts.test.ts` + `plates.test.ts` green (catalog pins).
- Full suite baseline before this plan: 171 files / 1949 tests green; `npm run build` green; `npm run test:rules` 44 green.

## Delegation table

| Piece | Agent | Model / effort | Why |
|---|---|---|---|
| Task 1 #471 sync quarantine | devops-resilience | opus / high | sync queue + Dexie schema + banner wiring; safety-adjacent |
| Task 2 #466 boot-time join retry | devops-resilience | opus / high | auth-ready ordering + intent persistence hazards |
| Task 3 #464 deploy-after-delete guard | fullstack-engineer | opus / high | reducer fold semantics + ADR-041 identity witnesses |
| Task 4 #469 blank-id import merge | fullstack-engineer | sonnet / high | store logic with a clear identity key already in file |
| Task 5 #514 import failure path + accounting | fullstack-engineer | opus / high | spans UI, store return shape, sync setState contract |
| Task 6 #470 PWA precache + icons | devops-resilience | sonnet / high | build config + asset generation + build inspection |
| Task 7 #513 stocked-rig remove | mobile-ux | sonnet / high | UI control + destructive confirm; doctrine call by Alex first |
| Task 8 #475 second cut visible | fullstack-engineer | sonnet / high | pure function fix + one component test |
| Task review (each task) | skeptical-senior-engineer | opus / high for 1,2,3,5; sonnet / medium for 4,6,7,8 | adversarial spec + quality gate |
| qa-driver proof (each task) | qa-driver | sonnet / medium | drives the real preview / emulator harness |
| Gates, diff review, commits, board, issue close, mockups | Fable | not delegated | architecture, verification, credentials-adjacent |

## Task 1 — #471 Permanently-rejected queued event wedges the sync banner (dead-letter path)

**Issue text (spec):** "`flush()`'s catch logs and keeps the event in the queue; `notifyError(queue.length>0)` stays true forever, and first-merge re-enqueues the same event each boot. Needs a dead-letter/discard path after N terminal rejections." Severity Low (pre-Phase-J review), ranked P1 by Alex.

**Pre-flight notes (read first):** `/private/tmp/claude-501/-Users-alex-Developer-paratech-struts-fieldshore/6d41a814-86a9-44bb-a9f7-0c720f195253/scratchpad/preflight/471.md` — current locations (`syncService.ts:367-431`, `eventListener.ts:96-101`), banner states, diagnostics channel, test harness shapes.

**Design (ruled by Fable; ADR-042 P1 is the v4.1 design this fix must stay compatible with):**
1. Classify rejections in `syncService`: `isTerminalRejection(err)` is true when `String(err)` matches `/permission[_ ]denied/i`, or `/first argument contains/i` (SDK argument validation), or `/exceeds the maximum size|too large/i`. Everything else is transient and keeps today's behaviour exactly (strict order, backoff, banner "… haven't synced yet — retrying"). Export the predicate for tests.
2. `TERMINAL_REJECTIONS_BEFORE_QUARANTINE = 2`: after two consecutive terminal rejections of the same head (in-memory counter keyed by event id; reset when the head changes or uploads), the head is **quarantined**: removed from the upload queue, and the flush continues with the next event in the same pass.
3. Quarantine persistence: new Dexie table `quarantine` in the dept bucket DB (additive schema version bump, no data migration; row = the event plus `{ reason: string; quarantinedAt: number }`). The event row is deleted from the `events` table in the same transaction, so first-merge on the next boot does not re-enqueue it. Then rebuild the local fold via the existing rebuild path (the one `ingestRemote` uses), so the device converges to the cloud — same semantics as an ADR-041 "overridden" event.
4. Diagnostics: `logSyncEvent('write_rejected', { path, id, reason })` once per quarantined event (respect the closed detail type and caps; add the event name only).
5. Banner: `notifyError` reflects only *transient* stuck state. After quarantine with an otherwise-drained queue, `syncError` must return to false and `pendingCount` to 0 (the Command rail "pending sync" cell clears with it).
6. Tell the user once, through the EXISTING "Synced — N of your changes had no effect" surface (`SyncBanner.tsx` state 7, `useOverridden`): one row per quarantined event, title from the same describer the overridden rows use, line text exactly `Rejected by the department server — not shared with the team.`, time + who as the existing rows. `Got it` acknowledges them like overridden rows. No new banner state, no new component. Settings → Sync "discard / re-send" UI is OUT of scope (ADR-042, v4.1).

**Tests (TDD, in `src/data/sync/syncService.test.ts` unless noted):**
- two `permission_denied` rejections of head `b` → `b` is absent from the queue and from `db.events`, present in `db.quarantine` with the reason; `c` uploads in the same flush pass; the injected `notifyError` ends `false`; `logSpy` saw `write_rejected` once.
- one terminal rejection (1 of 2) → `b` still queued, nothing quarantined, `notifyError(true)`.
- a generic `Error('boom')` rejection keeps strict order (existing tests at :247-262 and :441-459 stay green as written).
- `eventListener.test.ts` or syncService: after quarantine, first-merge does not re-enqueue the quarantined id.
- `src/app/shell/SyncBanner.test.tsx`: a quarantined row renders the exact line text above under the "had no effect" toggle.
- `isTerminalRejection` table test (permission_denied / PERMISSION_DENIED / "first argument contains undefined" / "exceeds the maximum size" → true; "network error", "timeout", "boom" → false).

**Done when:** all of the above green, `npm run typecheck` clean, full `npx vitest run` green, report written.

## Task 2 — #466 Queued offline join never auto-completes when the app reopens already online

**Issue text (spec):** "`retryPendingJoin` fires only from the DOM `online` event; boot-time `restorePendingJoin()` only re-surfaces the banner. Killing the app offline and reopening it online leaves the join queued until the network flaps." Severity Medium.

**Pre-flight notes (read first):** `/private/tmp/claude-501/-Users-alex-Developer-paratech-struts-fieldshore/6d41a814-86a9-44bb-a9f7-0c720f195253/scratchpad/preflight/466.md` — `connectivity.ts:62-72`, `main.tsx:55-58`, `departmentService.ts:501-521`, the `fieldshore_pending_join` meta row, the four hazards, test harness shapes.

**Design:**
1. Retry the pending join on every authenticated boot while online — hook it where the dept-create outbox is already retried on auth-ready (`src/data/auth/authSession.ts:69-75`), not in `main.tsx` before auth restores. On `joined`, navigate to `/operations` the same way the online handler does; pass navigation in as an injectable dep so the test asserts it without touching `window.location`.
2. Hazard fixes that make a boot retry safe: (a) `retryPendingJoin` drops the stored intent only on definitive outcomes — success, "already a member", PERMISSION_DENIED; a not-signed-in / network / auth-not-ready failure keeps the intent and the banner; (b) a failed re-resolve must not overwrite a stored `deptName` with `null` (`queueJoin(code, null)` path) — preserve the existing name; (c) respect the single-flight `retrying` flag; (d) the existing DOM `online` path keeps working unchanged.
3. No banner copy change.

**Tests (TDD):** `src/data/dept/departmentService.test.ts` 'offline join queue' describe — boot-online retry joins, clears the intent, calls the navigate dep; retry while auth is not ready keeps the intent and `syncStatusStore.pendingJoin`; failed re-resolve keeps `deptName`. `src/data/auth/authSession.test.ts` — the auth-ready callback triggers the join retry when an intent exists and the connectivity dep says online, and not when offline. `connectivity.test.ts` unchanged and green.

**Done when:** green as above, typecheck clean, full suite green, report written.

## Task 3 — #464 Deploy-after-delete race — EquipmentDeployed never checks deletedAt

**Issue text (spec):** "the `EquipmentDeployed` case guards `status !== 'pending'` but never `deletedAt`. A deploy racing a soft delete lands on the deleted point, hiding live deployed stock under a deleted card." Severity Medium.

**Pre-flight notes (read first):** `/private/tmp/claude-501/-Users-alex-Developer-paratech-struts-fieldshore/6d41a814-86a9-44bb-a9f7-0c720f195253/scratchpad/preflight/464.md` — `shorepoint/reducer.ts:469-472` (+ legacy `StrutDeployed` :451-467 has the same hole), delete/restore cases, identity witness table, test harnesses.

**Design:** In `src/core/shorepoint/reducer.ts`, `EquipmentDeployed` AND legacy `StrutDeployed` return `sp` unchanged (same object identity) when `sp.deletedAt != null`, in addition to the existing status guard. Nothing else changes: the deploying device learns of the no-op through the existing ADR-041 "overridden" surface (`isTellWorthy` already includes EquipmentDeployed). No local-commit-guard change (deleted points are not offered for deploy in the UI). Do not touch other reducer cases.

**Tests (TDD):** `src/core/shorepoint/reducer.test.ts` — deploy on a soft-deleted pending point returns the same object (`toBe`), for both event types. `src/core/operation/reducer.test.ts` — sequence delete → deploy leaves the point deleted with no `deployedBom` and status unchanged. `src/core/operation/identity.test.ts` — add the witness "point is soft-deleted" for `EquipmentDeployed` (and `StrutDeployed` if the table carries it); extend the `rich` fixture with a soft-deleted point as needed. Confirm `src/data/store/convergence.test.ts` and `held.test.ts` stay green.

**Done when:** green, typecheck clean, full suite green, report written.

## Task 4 — #469 Blank-ID import rows never merge with identical existing stock

**Issue text (spec):** "the blank-id branch always `add`s a fresh `inv-` row with no lookup/merge against identical stock (type/model/system/plateId/length/apparatus). Re-importing a hand-maintained CSV silently duplicates the whole inventory." Severity Medium.

**Pre-flight notes (read first):** `/private/tmp/claude-501/-Users-alex-Developer-paratech-struts-fieldshore/6d41a814-86a9-44bb-a9f7-0c720f195253/scratchpad/preflight/469.md` — `inventoryStore.ts:334-337` inside `upsertImport` :274-358, the existing `sameIdentity` key :88-93 (keyed on resolved `apparatusId`), the id path's SET semantics + held guard, test helpers.

**Design (ruled):**
1. Inside the import transaction, blank-id rows are first **aggregated within the file** by identity (resolved `apparatusId` + `sameIdentity` fields): identical blank-id rows in one file SUM their quantities into one logical row (the file is the source of truth: total = sum).
2. Each aggregate is then matched against existing stock with `sameIdentity` on the resolved `apparatusId`. Match → same semantics as the id path: SET `quantity` to the file's value, held guard (`quantity < heldOf(existing.id)` → skip "would strand deployed stock"), `lastWriteAt: now`, counts as imported, cloud push via `onRow`. No match → `add` as today.
3. Net effect: importing the same blank-id CSV twice is idempotent (row count and quantities unchanged). Document the SET-vs-SUM rule in a code comment next to the aggregation.
4. `ImportResult` shape unchanged in this task (Task 5 changes it).

**Tests (TDD, `src/data/store/inventoryStore.test.ts`):** blank-id row matching an existing strut (same rig + model) → no new row, quantity set, `imported: 1`; same for an extension (length + system) and a plate (plateId); same model on a different rig → separate row; held guard on the merge path → `skipped: 1`, quantity untouched; two identical blank rows in one file → one row with the summed quantity; re-import of the same blank-id file → identical `db.inventory` contents (count + quantities).

**Done when:** green, typecheck clean, full suite green, report written.

## Task 5 — #514 ImportFlow: doImport has no try/catch, a failed cloud push looks like success (+ #474 accounting)

**Issue text (spec):** "`doImport` awaits `importRows` with no try/catch; `syncService.setState` swallows cloud failures into a `state-write-failed` log. The UI then shows 'N rows imported' even if the cloud never received them. Also: the result line's 'skipped (would strand deployed stock)' label is shown for every skip, including re-type skips. **Ask:** surface a write failure in the import result (Dexie saved / cloud pending), and give the skip label the right reason per row." Comment (folded-in #474): "flagged-but-unfixed rows are excluded from the commit yet appear in neither the imported nor the skipped count, and every store-side skip is labeled 'would strand deployed stock' even when the sameKind transmute guard caused it. Fix the accounting in the same pass as the failure path."

**Pre-flight notes (read first):** `/private/tmp/claude-501/-Users-alex-Developer-paratech-struts-fieldshore/6d41a814-86a9-44bb-a9f7-0c720f195253/scratchpad/preflight/514.md` — `ImportFlow.tsx:237-242, 272-282`, `syncService.ts:509-518`, `registry.ts:61`, count derivations in the component, test harness shapes. Task 4 has already landed in `upsertImport` (blank-id aggregation + merge) — read the current file, not the notes' line numbers.

**Design (ruled; exact strings below are the spec):**
1. **Failure path.** `doImport` wraps `importRows` in try/catch/finally: `setCommitting(false)` always runs. `upsertImport` must guarantee that everything after its transaction (boot, roster push, cloud pushes) never throws, so a rejection means the transaction rolled back. On rejection the result block shows heading `Import failed`, paragraph `Nothing was saved. {error message}`, and the `Done` button; the Import button must not stay stuck on "Importing…".
2. **Store result shape.** `ImportResult = { imported: number; skipped: { strand: number; retype: number }; cloud: { status: 'synced' | 'pending' | 'failed' | 'local'; failed: number } }`. `useInventoryActions.importRows` passes it through; update every mock/consumer the type change breaks.
3. **Cloud outcome plumbing.** `syncService.setState` returns `Promise<'ok' | 'failed' | 'skipped'>` and still never rejects (`'skipped'` = guest/no cloud; `'failed'` = caught error, still logged as `state-write-failed`). The registry's inventory `onRow` returns that promise; `hooks.onRow` may return `Promise<…> | void`. `upsertImport` collects the per-row outcomes: when the connectivity flag says offline → `cloud.status = 'pending'` without waiting; when online, wait for all pushes with a bounded settle (`CLOUD_SETTLE_MS = 4000`, injectable for tests): all `'ok'` → `'synced'`; any `'failed'` → `'failed'` with the count; any unsettled → `'pending'`; all `'skipped'` → `'local'`.
4. **Result block copy** (each line its own `<p>`, heading stays `Import complete`):
   - `{imported} rows imported.` / `1 row imported.` / `No rows imported.`
   - if `skipped.strand > 0`: `{n} skipped — would strand deployed stock.`
   - if `skipped.retype > 0`: `{n} skipped — type doesn't match the item already on the rig.`
   - if flagged rows were still unfixed at import time (`liveFlagged`): `{n} rows not imported — still flagged to fix.` (singular `1 row not imported — …`)
   - if the user chose "Skip this row instead" for rows: `{n} rows skipped by you.` (singular `1 row skipped by you.`)
   - if the parser dropped blank/template rows (outcomes with neither `row` nor `error`): `{n} blank rows ignored.`
   - cloud line, always last: synced → `Saved on this device and in the cloud.`; pending → `Saved on this device — will sync to the cloud when you reconnect.`; failed → `Saved on this device — {failed} rows didn't reach the cloud.` (singular `1 row didn't reach the cloud.`); local → `Saved on this device.`
5. Both mount points (Inventory sheet and Settings → Data management) share the flow; no other UI changes.

**Tests (TDD):** `src/ui/inventory/ImportFlow.test.tsx` — rejecting `importRows` → `Import failed` + `Nothing was saved.` and `Done` visible; each result line above with a fitting mock result (strand / retype / flagged / user-skipped / each cloud status). `src/data/sync/syncService.test.ts` — `setState` resolves `'failed'` and logs `state-write-failed` when `set` rejects; `'ok'` on success; `'skipped'` for guests. `src/data/store/inventoryStore.test.ts` — `skipped` object per guard; `cloud` aggregation for ok / failed / unsettled (injected settle) / offline. `src/data/store/registry.test.ts` — mocks updated for the new return.

**Done when:** green, typecheck clean, full suite green, report written.

## Task 6 — #470 Offline precache misses plate photos/fonts/icons; PWA manifest has no icons wired

**Issue text (spec):** "`VitePWA` has no `manifest` option and no `includeAssets`/`globPatterns` beyond js/css/html; built `dist/manifest.webmanifest` carries no `icons`, and the root `manifest.json` (which has icons) is an unwired stray. Offline, plate-ID photos and fonts 404; install prompt/icon degraded." Severity Medium. Pre-flight correction: the root `manifest.json` is v3's live manifest — do NOT delete or move it.

**Pre-flight notes (read first):** `/private/tmp/claude-501/-Users-alex-Developer-paratech-struts-fieldshore/6d41a814-86a9-44bb-a9f7-0c720f195253/scratchpad/preflight/470.md` — `vite.config.ts:58-77`, asset inventory (24 plate jpgs ≈ 210 KB, app fonts ≈ 288 KB emitted as hashed woff2, icons: `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png` 180 px; welcome media ≈ 4.5 MB must stay out), Workbox 2 MiB per-file cap, `src/app/index.html:10`.

**Design (ruled):**
1. Factor the PWA options into a plain testable module `src/app/pwa.config.ts` exporting `manifest` and `workboxPrecache` (`includeAssets`, `globPatterns`, `globIgnores`) that `vite.config.ts` spreads into `VitePWA({...})`. Keep the existing `registerType`, `navigateFallbackDenylist`, and the Firebase `NetworkOnly` runtime rule exactly as they are (Firebase realtime traffic is never cached).
2. Manifest: `name: 'FieldShore'`, `short_name: 'FieldShore'`, `description: 'Paratech rescue-strut selection, inventory, and shoring operations for USAR/FEMA teams'`, `start_url: '/'`, `scope: '/'`, `display: 'standalone'`, `lang: 'en'`, `theme_color` and `background_color` taken from the app's light-mode surface token (read `src/ui` theme CSS; report the hex you chose), `icons`: `/icon-192.png` 192×192 `any`, `/icon-512.png` 512×512 `any`, `/icon-512-maskable.png` 512×512 `maskable`.
3. Generate the three PNGs under `public/` from `public/favicon.svg` using headless Chrome (`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome --headless=new --screenshot=… --window-size=W,H` on a tiny HTML wrapper); the maskable one pads the glyph so it fits the 80 % safe zone. Verify each with `sips -g pixelWidth -g pixelHeight`.
4. Precache: `includeAssets: ['favicon.svg', 'favicon-32.png', 'apple-touch-icon.png', 'plates/*.jpg']`; `globPatterns: ['**/*.{js,css,html,woff2,svg,png,jpg,webmanifest}']`; `globIgnores: ['**/media/welcome/**']` (welcome video/posters are not needed offline and the mp4 exceeds the 2 MiB cap).
5. `src/app/index.html`: add `<meta name="theme-color" content="…">` (same hex) and `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`. The manifest link is injected by the plugin.

**Tests (TDD):** `src/app/pwa.config.test.ts` — manifest has the three icons with the sizes/purposes above and the required fields; `globPatterns` cover woff2/jpg/png; `globIgnores` cover welcome media; `includeAssets` covers `plates/*.jpg`; each manifest icon file exists under `public/` and its PNG IHDR width/height match the declared size (parse the 8-byte signature + IHDR, no new deps). Then build-inspect: `npm run build`, confirm `dist/manifest.webmanifest` lists the three icons and `dist/sw.js` precache includes 24 `plates/*.jpg`, the app woff2 files, the icons, and nothing under `media/welcome/`; put the counts and total precache bytes in the report.

**Done when:** test green, build green with the inspection numbers in the report, full suite green, typecheck clean.

## Task 7 — #513 A stocked rig cannot be removed; the only line delete is stepping the count to zero

**Issue text (spec):** "`Remove <rig>` renders only in the empty-rig branch; a rig with lines cannot be removed from the UI. The store's cascade (`apparatusStore.removeApparatus`, L-8 held-units guard, cloud tombstones) exists but is unreachable while the rig has lines. A line is deletable only by stepping its count to 0. **Consequence:** a wrong bulk import cannot be unwound in place. **Decide:** 1. Allow Remove on a stocked rig when no units are held, and/or 2. an explicit per-line Remove. Doctrine call for Alex; no change until decided."

**Pre-flight notes (read first):** `/private/tmp/claude-501/-Users-alex-Developer-paratech-struts-fieldshore/6d41a814-86a9-44bb-a9f7-0c720f195253/scratchpad/preflight/513.md` — `InventoryScreen.tsx:178-233`, header/scope-row/row anatomy, `removeApparatus` + L-8 guard, the `Modal` destructive pattern and precedents, test harness shapes.

**Doctrine decision:** recorded in the ledger before dispatch (`Ruling: #513 doctrine — …`). The accepted mockup (PNG beside the ledger) is the visual spec. Default design if Alex picks Option 1:
1. `Remove {rig}` (tertiary, destructive, `canManage` only) also renders at the bottom of the stocked-rig branch, after the kind groups.
2. On a stocked rig it opens a destructive `Modal`: title `Remove {rig}?`, body `{n} items ({u} units) stocked on {rig} will be removed from inventory. This cannot be undone.` (singular forms where needed), buttons `Cancel` (`data-modal-cancel`) and `Remove {rig}` (destructive). On an empty rig the button keeps today's immediate behaviour.
3. If any unit of that rig is deployed (`held > 0` on any line): the button is disabled, with the sub-line `Return deployed equipment first.` A store rejection (race) surfaces inside the modal as `role="alert"` text `Couldn't remove — equipment from this rig is still deployed.` (precedent `DeleteShorePointModal.tsx`).
4. Per-line Remove is NOT built here (Option 2 → `[v4.1]` idea).

**Tests (TDD, `src/ui/inventory/InventoryScreen.test.tsx`):** Remove renders on a stocked rig for `manageInventory` members and not for read-only members; pressing it opens the modal with the exact title/body; confirming calls `remove(activeId)`; the button is disabled with the sub-line when a line has `held > 0`; a rejected `remove` shows the alert text.

**Done when:** green, typecheck clean, full suite green, report written.

## Task 8 — #475 A second cut claimed by the same saw vanishes from hero and up-next

**Issue text (spec):** "`unclaimed` excludes any point whose `sawId` is on-roster, but only the first `.find()` match lands in `claimedSpIds`, so a second cut carrying the same sawId (e.g. after a runner→cutting step-back) appears in neither `heroBySaw` nor `unclaimed` — it disappears from the station." Severity Medium.

**Pre-flight notes (read first):** `/private/tmp/claude-501/-Users-alex-Developer-paratech-struts-fieldshore/6d41a814-86a9-44bb-a9f7-0c720f195253/scratchpad/preflight/475.md` — `saw.ts:66-73`, `assignSaws` contract, how the duplicate arises (runner→cutting step-back keeps `sawId`), `CuttingStation.tsx:141-162`, test files.

**Design:** In `assignSaws`, a roster saw's hero is still the first queue entry carrying its `sawId`; every further queue entry carrying that same `sawId` is **unclaimed** (listed under Up next in queue order) instead of hidden. Off-roster `sawId` handling and `pendingClaims` semantics are unchanged (a free saw may claim such a cut; the reducer already lets `CuttingClaimed` re-tag it). Invariant: every queue entry appears in exactly one of `heroBySaw` values or `unclaimed`.

**Tests (TDD):** `src/core/operation/saw.test.ts` — queue `[x{A}, y{A}]`, roster `[A]` → hero A = x, `unclaimed = [y]`, no pending claims; roster `[A, B]` → B gets a pending claim for y; invariant property over the existing fixtures. `src/ui/operations/CuttingStation.test.tsx` — the second A-tagged cut is listed under `Up next` and the count badge reads 1.

**Done when:** green, typecheck clean, full suite green, report written.
