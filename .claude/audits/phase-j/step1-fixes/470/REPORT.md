# QA #470 — PWA manifest icons + offline precache (production build, real service worker)

Branch: v4-redesign (taken from the session snapshot; I ran no git commands, per the brief).
Harness: `preview_start fieldshore-v4-preview` -> `vite preview` of `dist/` on http://localhost:5198, my own pane tab (tab-3); the other pane tabs (seed :9000, tab-1 :5200) were left alone. Pane viewport 1024x768, screenshots 800x600. The pane was hidden throughout but captured real pixels.

## Build under test (read this first)
- First pass was captured on **build A** (sw.js sha256 f396caba…, icons rendered from favicon.svg, precache 62 entries / 3,347,815 B — the figure quoted in the implementer's report).
- At **02:12 local, mid-run**, `dist/` was rebuilt (src/app/pwa.config.ts 02:11:49 and public/icon-*.png 02:11 changed; the icons are now rendered from docs/v4-design/07-design-system/assets/logo/app-icon.svg). **Build B**: sw.js sha256 72647bf71ed4e55b1dbc861cf01da93ec745db8c8f012f35c21492ad960a30d0, precache still 62 entries but 3,357,687 B (the 9,872 B difference is the three regenerated icons). Manifest fields unchanged.
- I told the coordinator, who confirmed B is final and froze rebuilds until this report. I then **redid the whole proof on B**. Build A's files are kept in `superseded-build-A/` and are NOT authoritative.
- I hashed 13 dist files at the start of the B re-run (`00-env-start-buildB.txt`, 06:13:27Z) and again at the end (`00-env-end-buildB.txt`, 06:22:08Z): identical. dist mtime stayed 02:12:17.
- I did not run `smoke.sh` / `npm run build` (the brief says the orchestrator's gate already built `dist/`; a rebuild would replace the build under test).

## Result per criterion (all on build B)
| # | Criterion | Result |
|---|---|---|
| 1 | After first load + reload: `caches.keys()` lists the Workbox precache, 62 entries | **PASS** |
| 2 | `/manifest.webmanifest` fields, `link[rel=manifest]`, theme-color meta, apple-touch-icon link | **PASS** |
| 3 | Cache hits for plates, a woff2, icons, favicon, apple-touch-icon, index.html | **PASS, with a method correction** (the brief's literal check fails as written, see below) |
| 4 | Negative controls: welcome media not cached; nothing Firebase in any cache | **PASS** |
| 5 | Visual: three icons rendered; Quick Find deduction picker with plate photos | **PASS** |
| 6 | State what is not drivable (installed-app icon/splash on a phone) | **Stated below** |
| 7 | No service-worker or console errors | **PASS with caveat**: 13 console errors, every one caused by QA itself; no app-caused error |

## Steps driven (numbers refer to files in the evidence folder)
1. Read the brief and the implementer recipe; hashed dist (00-env-*). No git, no smoke.sh.
2. `preview_start` -> server on :5198, tab-3. That open had already installed a SW and a 62-entry cache on the origin (captured in `01-wipe-before-after.json`).
3. Navigated to `/favicon.svg` (no app JS), wiped SW registrations, Cache Storage, localStorage, sessionStorage, IndexedDB (4 DBs). Separate eval confirmed 0 registrations, 0 caches, 0 IndexedDB, empty storage.
4. Set `localStorage.fieldshore_entered='1'`, loaded `/` (redirects to `/quickfind`). At the first poll the SW was `activated` with `controller` already non-null (skipWaiting + clientsClaim), and the cache already held 62 entries. Reloaded: controller non-null; the reloaded document itself and its 6 subresources (main js 1,771,366 B, main css, registerSW, preload-helper, geist + inter latin woff2) were answered by the SW with `transferSize 0` and `workerStart > 0` (`02-fresh-load-resource-timing.json`).
5. Criteria 1-4 evals (files 03-06), each followed by programmatic cross-checks of the pasted captures against `dist/` on disk (sizes, revisions, sha256, URL list order): no discrepancy.
6. Icons: navigated to `/icon-512-maskable.png`, `/icon-192.png`, `/icon-512.png` and screenshotted each; built a labelled QA-only DOM overlay (contact sheet) of the real served files with CSS circle/squircle mask simulations.
7. Quick Find: fresh navigation to `/quickfind`, clicked the Deductions toggle, then the Top plate button, screenshotted the grid, read DOM + resource timing (pure reads, no QA fetches in that document).
8. **Offline proof**: `preview_stop` (server 39a8ee71…), the SW-controlled tab left open; in-page fetches, cold navigation to `/quickfind`, Deductions -> Top plate again, `/welcome.html`; then `preview_start` again (recovery verified) and finally `preview_stop` (server 0e759390…).
9. Bonus: SW update path A -> B (see below). Final cleanup: wiped the :5198 origin, closed tab-3.

## Offline proof (server process stopped) — `08-offline-server-stopped.json`, PNGs 16-18
The pane has no network toggle, so the origin server was stopped instead.
- Controls that must fail did fail: `sw.js?dead=<ts>` and `manifest.webmanifest?dead=<ts>` (not precached URLs) -> `TypeError: Failed to fetch`. So the server really was dead.
- Negative controls that can fail did fail: `GET /media/welcome/poster.jpg`, `HEAD /media/welcome/ops-loop.mp4`, `GET /media/welcome/shot-quickfind.png` -> rejected.
- 12 precached URLs (4 plates, 3 icons, apple-touch-icon, favicon.svg, manifest, index.html, geist woff2) -> 200 with the exact byte sizes.
- Cold navigation to `/quickfind`: response 200, `transferSize 0`, 2,242 B = index.html served by the NavigationRoute; all 6 subresources `transferSize 0`; heading "Quick Find" rendered (PNG 16).
- Deductions -> Top plate grid: 48/48 `img.fs-swatch--photo` loaded (24 plates x Top and Bottom grids), 0 broken, only the two "None" swatches fall back to initials (by design), 24 plate requests all 200 / `transferSize 0`, no failed resource in the document (PNG 17).
- `/welcome.html` offline (expected trade-off, not a failure): shell, JS, CSS and two fonts load from the precache (`transferSize 0`), headline and CTA render; poster, loop video and product screenshots are refused because `media/welcome/**` is not precached, so the hero is text-only (PNG 18).
- After `preview_start`: poster 200 from the network, sw.js sha256 = build B, same registration, still 62 cache entries.

## Criterion 1 detail — `03-criterion1-precache-inventory.json`
- Cache name `workbox-precache-v2-http://localhost:5198/`, **62 entries, 3,357,687 B** (equals the on-disk sum of the 62 manifest files).
- By type: 24 `plates/*.jpg`, 18 woff2, 5 png (3 manifest icons, favicon-32, apple-touch-icon), 1 svg, 2 html (index, welcome), 9 js, 2 css, 1 manifest, **0 under `media/welcome/`**. 34 entries carry `?__WB_REVISION__=`, 28 (hashed `assets/*`) do not.
- The cache holds exactly the 62 paths in the served sw.js: none missing, none extra. Every entry is status 200 and its sha256 equals a cache-busted network copy; icon, rigid6, index.html and manifest hashes match the on-disk dist hashes. Cache count stayed 62 after every QA fetch.
- `controller` non-null after the first load and after the reload (see step 4). The brief's "reload so the SW controls the page" was not needed for control, but I did it and recorded both.

## Criterion 2 detail — `04-criterion2-manifest-and-head.json`
- `/manifest.webmanifest`: 200, `application/manifest+json`, identical via SW and network. `name` and `short_name` "FieldShore", `display` standalone, `start_url` "/", `scope` "/", `lang` en, `theme_color` and `background_color` **#101214**, 3 icons: 192x192 any, 512x512 any, 512x512 maskable.
- `link[rel=manifest]` -> `/manifest.webmanifest`; exactly one `meta[name=theme-color]` = **#101214** (html `data-theme="dark"`); `link[rel=apple-touch-icon]` -> `/apple-touch-icon.png` (200, decodes 180x180); `link[rel=icon]` -> `/favicon.svg`.
- All three icons fetch 200 `image/png` and decode to exactly their declared size (4,772 / 12,494 / 9,719 B). "any" icons have transparent rounded corners (~3% of pixels transparent, corner alpha 0). The maskable icon is fully opaque (0% transparent) and its emblem lies inside the W3C maskable safe circle (max radius 0.733 of the half-size, limit 0.80).

## Criterion 3 detail — `05-criterion3-cache-hits.json`
**The brief's literal check fails as written, and that is not a product defect.** Workbox stores each entry that has a revision under `<url>?__WB_REVISION__=<md5>`, so a plain `caches.match('/plates/rigid6.jpg')` returns `undefined` for all **33** revisioned targets (all plates, icons, favicon, apple-touch-icon, index.html, manifest). Only the hashed `assets/*` woff2 (2 checked) hit with a plain match. **Step 3 of the implementer's recipe in `.superpowers/sdd/v4-phase-j-step1-p1-p8/task-6-report.md` is wrong on this point; a later QA run following it literally would record a false FAIL.**
Hit methods used (35 targets: all 24 plates, 3 icons, favicon.svg, favicon-32, apple-touch-icon, index.html, `/`, manifest, 2 app woff2):
- `caches.match(url, {ignoreSearch:true})`: 34 of 35 -> 200 with the right content type and bytes. The one miss is `/`, which has no entry of its own (navigations to `/` get index.html from the NavigationRoute; `/index.html` is a hit).
- Exact revisioned cache key (`/plates/rigid6.jpg?__WB_REVISION__=102c2989…` etc.): the same 34 of 35 -> 200.
- Plain-URL `fetch()` from the controlled page (13 URLs, incl. rigid6 + 4 other plates, 3 icons, apple-touch-icon, favicon, index.html, 2 woff2): all 200, byte sizes equal the cache, `transferSize 0` (no network bytes). The brief's `only-if-cached` second signal also returned 200 for all 13, but it is a weak signal (the SW answers regardless).
- App woff2 found via `performance.getEntriesByType('resource')`: `geist-latin-wght-normal-BgDaEnEv.woff2` (29,400 B) and `inter-latin-wght-normal-Dx4kXJAl.woff2` (48,256 B), both css-initiated, `transferSize 0`.

## Criterion 4 detail — `06-criterion4-negative-controls.json`
- `caches.match` for `/media/welcome/ops-loop.mp4`, `poster.jpg`, the 6 `shot-*.png` and `SOURCES.md`: **undefined, plain and with `ignoreSearch:true`** (the ignoreSearch form is the non-vacuous one, because of the revision-key behaviour above).
- Meaningful because the files exist: HEAD on the server returned 200 for all 9 (mp4 3,829,151 B, poster 88,808 B). A GET of poster.jpg through the SW went over the network (`transferSize 89,108`) and afterwards the cache was still 62 entries with no `media/welcome` key, so nothing runtime-caches it. The offline run above shows the same files rejecting once the server is gone.
- Cache entry URLs listed (all 62) and grepped: 0 containing `firebaseio`, `fieldshore-database`, `googleapis`, `media/welcome` or `.mp4`; 0 cross-origin keys. (Same-origin by construction as well: every entry in the sw.js manifest is a relative path. I grepped request keys; I did not reinstall to inspect Response.url.)
- Firebase control that is not vacuous: the guest Quick Find app made no Firebase request on its own (network log filtered on `firebase` and `googleapis` returned none), so I issued one real GET to the project's own RTDB host (the sw.js NetworkOnly pattern `/firebaseio\.com$/` matches it): `https://fieldshore-database-default-rtdb.firebaseio.com/.json?shallow=true` -> 401 Permission denied. Caches before and after: identical URL list, still 62.
- Served sw.js still has the Firebase `NetworkOnly` rule (`/firebaseio\.com$/` or `wss:`, GET) and the NavigationRoute `denylist:[/^\/welcome\.html/]`; no CacheFirst / StaleWhileRevalidate / NetworkFirst anywhere.

## Criterion 5 — screenshots (800x600, converted to PNG with sips)
- 10-icon-512-maskable-rendered.png, 11-icon-192-rendered.png, 12-icon-512-rendered.png: the three files as served (strut-built "F" + timber-and-gusset "S" emblem on slate #1C1F23; "any" icons have rounded transparent corners, maskable is full-bleed).
- 13-icon-contact-sheet-with-launcher-mask-simulations.png: **QA-injected DOM overlay on an image document**, real served files with CSS circle/squircle masks. A simulation, not a real launcher; the emblem sits fully inside the circle crop.
- 09 Quick Find cold load; 14 Deductions expanded (Top/Bottom plate pickers closed); **15-quickfind-top-plate-grid-photos-loaded.png** (Top plate grid: "None" initial swatch, 6" Rigid Base, 6" Swivel Base under Available; 3"x4" Angle Base, 3/8" Chain Wedge, 4.3"x6" Channel Base Metric, 4" Rubber Base ... dimmed under Not in inventory, all with photos).
- DOM proof for 15 (`07-criterion5-quickfind-plate-photos.json`): 48 of 48 plate `<img>` complete with naturalWidth > 0, 0 broken, 24 `/plates/*.jpg` requests from the picker all `workerStart > 0` and `transferSize 0` with byte sizes equal to the cache.
- 16-18: the same screens with the server stopped (see the offline section). 19: apple-touch-icon (see surprises).

## Criterion 6 — what was NOT proven
The installed-app icon and splash on a phone are not drivable from the pane. Also not tested: Chrome's installability audit and install prompt, maskable cropping in a real launcher (only the CSS simulation in PNG 13), iOS Add to Home Screen, the Android splash colour. What was proven is the manifest, the head tags, the icon files, the Cache Storage contents and a real offline boot.

## Criterion 7 — console, network, service worker (`10-console-and-network.txt`)
Verbatim console log at the end of the run: 23 lines = **13 errors + 10 warns**.
- 3x `401 (Unauthorized)`: my deliberate RTDB control GETs (build A, build B, and one during the server-stopped phase).
- 1x `net::ERR_CACHE_MISS`: my `only-if-cached` probe of ops-loop.mp4.
- 9x `net::ERR_CONNECTION_REFUSED`: all inside the server-stopped phase (2 control fetches + 3 negative media fetches, then the 4 media requests of the offline `/welcome.html`). Expected.
- 3x Canvas2D `willReadFrequently` warnings: my pixel probe on the icons.
- 3x "A preload for …/assets/preload-helper-….js … cross-world service worker resource mismatch" + 4x "…preloaded using link preload but not used…": the only app/SW-attributable lines. They recur once per SW-controlled load, a few seconds after load; the file is requested twice, and the SW answers the duplicate from the precache (no network cost). Likely pre-existing (the SW already precached the JS chunks before #470) but **not verified** against a pre-#470 build; cause not confirmed.
- No 404/500, no uncaught exception, no "ServiceWorker script evaluation failed", no manifest or icon warning.
- Network (same-origin): all 200 except the deliberately failed requests while the server was stopped. Server log: only the Node DEP0205 deprecation notice.
- The service worker's own console is a separate context and **cannot be read from the page**. Instead: install -> activated in every run (never redundant, never stuck waiting/installing); Workbox fails the install if any precache fetch fails, so `activated` with 62 entries means all 62 landed; the SW answered every precached request, including a full offline cold boot.

## Bonus: update path A -> B (`captured-text/00-bonus-update-path-A-to-B.json`)
tab-3 still held build A's SW and precache when `dist/` became build B. One navigation to `/` made the browser pick up the new worker: still one cache, 62 entries, bytes 3,347,815 -> 3,357,687, the three old icon revisions pruned and the three new ones present, no waiting or installing worker left behind. So an already-installed device gets the new icons.

## Surprises and observations (all non-blocking; none changes a PASS)
1. **Mid-run rebuild** (above): the first pass was against a build that disappeared; the tell was a programmatic cross-check of the pasted cache-URL list against dist/sw.js (three icon revisions differed), not any browser symptom.
2. **`public/apple-touch-icon.png` still shows the OLD flat gold "FS" lettermark** on an opaque white square (180x180, 0% transparent, top-left pixel 255,255,255; file dated Jul 13, unchanged by #470), while the three manifest icons show the new full-colour emblem. iOS takes its home-screen icon from apple-touch-icon, so iOS installs will not match Android/desktop. Screenshot 19, `09-observation-apple-touch-icon.json`. Suggested fix area: regenerate `public/apple-touch-icon.png` from `docs/v4-design/07-design-system/assets/logo/app-icon.svg` as an opaque full-bleed square, if one brand mark is wanted.
3. **Welcome assets are precached; only welcome media is excluded**: `welcome.html`, `welcome-*.js` chunks, `three.module-8GGnFegg.js` (515,414 B) and `welcome-show` (143,235 B), plus all 18 font subsets (incl. cyrillic/greek/vietnamese and the welcome fonts) ride along, so the first install downloads 3.2 MiB. The implementer already noted the font breadth; the three.js chunk is new information. The welcome page therefore works offline but text-only.
4. **Measurement only, judgement left to you**: the emblem's bounding box runs from 22.7% to 85.2% horizontally (centre 54.0%) and 33.6% to 67.0% vertically (centre 50.3%) in the maskable icon, and looks the same in the "any" icons, so it sits slightly right of centre. Safe-circle check passes at 0.733 against 0.80.
5. A pane tab's console buffer persists across navigations and also showed my earlier build A lines; I attributed each line by order (see file 10).

## Disclosures
- I sent **three unauthenticated GETs to the live `fieldshore-database` RTDB** (`/.json?shallow=true`); all returned 401, none were writes, no credentials were used.
- QA-only DOM injection (the icon contact sheet, PNG 13) was done on an image document in the pane; no source or dist file was edited.
- I logged two skill observations (#105 Workbox revisioned keys / offline proof recipe, #106 shared-dist fingerprinting) in `~/.claude/skill-observations/log.md` per standing instructions.
- `superseded-build-A/` is not authoritative (it is labelled by `00-SUPERSEDED-NOTE.txt`).

## Evidence folder
`/Users/alex/Developer/paratech-struts/fieldshore/.claude/audits/phase-j/step1-fixes/470/`
- `00-env-start-buildB.txt`, `00-env-end-buildB.txt`: dist hashes at start and end of the B run.
- `captured-text/`: `00-bonus-update-path-A-to-B.json`, `01-wipe-before-after.json`, `02-fresh-load-resource-timing.json`, `03-criterion1-precache-inventory.json`, `04-criterion2-manifest-and-head.json`, `05-criterion3-cache-hits.json`, `06-criterion4-negative-controls.json`, `07-criterion5-quickfind-plate-photos.json`, `08-offline-server-stopped.json`, `09-observation-apple-touch-icon.json`, `10-console-and-network.txt`.
- PNGs: `09-quickfind-cold-load-deductions-collapsed`, `10-icon-512-maskable-rendered`, `11-icon-192-rendered`, `12-icon-512-rendered`, `13-icon-contact-sheet-with-launcher-mask-simulations`, `14-quickfind-deductions-expanded-plate-pickers-closed`, `15-quickfind-top-plate-grid-photos-loaded`, `16-OFFLINE-server-stopped-quickfind-cold-boot`, `17-OFFLINE-server-stopped-top-plate-grid-photos-loaded`, `18-OFFLINE-server-stopped-welcome-html-text-only-no-footage`, `19-apple-touch-icon-older-flat-lettermark-not-the-new-emblem`.
- `superseded-build-A/`: first pass on the replaced build, kept for the record only.

Final state: preview server stopped (serverId 0e759390-f2f3-49d3-ad63-bad9cb3472dc; the earlier 39a8ee71… was stopped for the offline test), the :5198 origin wiped (0 registrations, 0 caches, 0 IndexedDB), tab-3 closed. The gate rebuild can proceed.
