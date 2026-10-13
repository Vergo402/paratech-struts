# #523 first bullet: installed launches skip the welcome redirect (plan items 1-4)

Plan: `/Users/alex/.claude/plans/an-ios-home-screen-install-inherited-axolotl.md`. Items 1-4 built; item 5 (comment on #523) and all live verification are the controller's. No git commands were run; nothing committed.

## What changed

| File | Change |
|---|---|
| `src/app/index.html` (inline script, lines 27-45) | Gate computes `installed = matchMedia('(display-mode: standalone)').matches \|\| navigator.standalone === true`. Bare root redirects to `/welcome.html` only when `!installed`; otherwise (deep link or installed launch) it sets `fieldshore_entered = '1'`. Deep-link rule, flag name and the `try/catch` (storage unavailable -> load the app) are unchanged. Comment updated with "installed (standalone) launches never redirect (Alex, 2026-10-13)". `const` (block-scoped), so no global leak (the theme script above uses `var t`, which leaks `window.t`). |
| `src/app/entryGate.test.ts` (new, 7 tests) | jsdom test. Reads `index.html` as text, takes the `<script>` body containing `fieldshore_entered`, runs it with `new Function('localStorage','location','matchMedia','navigator', body)` against stubs. `run` throws if no gate script is found, so a moved/renamed script can never make the "no redirect" cases pass vacuously. The `matchMedia` stub matches only the exact query `(display-mode: standalone)`. |
| `src/app/routes/settings/AboutPage.tsx` (lines 97-106) | New `SettingsGroup label="Welcome page"` after "App updates" with one `SettingsRow`: label "See what FieldShore does", description "The public welcome page — the tour an installed app skips", `href="/welcome.html"`, `trailing="external"`. Strings match the accepted mockup `00-mockup-about-welcome-row.{html,png}` (already in this folder; not regenerated). Primitives only, no styling added. |
| `src/app/routes/settings/AboutPage.test.tsx` | `within` import + 1 test: the "Welcome page" region contains the link "See what FieldShore does" with `href="/welcome.html"`. |
| `docs/v4-design/06-decision-tracking-matrix.md` line 264 | J-21 row: appended the amendment text on the same physical line (still 6 pipes, same as neighbours). |
| `vite.config.ts` lines 23-28 | Comment block now says every installed (standalone) launch also cold-opens straight into the app (Alex, 2026-10-13, #523). |

Login screen: untouched (`AuthScreen.tsx:296-310` already renders "New here? See what FieldShore does" -> `/welcome.html`).

## TDD evidence

### Gate test (`npx vitest run src/app/entryGate.test.ts`)

First run was a wrong RED (test bug, not the feature): `TypeError: The URL must be of scheme file` at `entryGate.test.ts:11` (under jsdom the global `URL` is jsdom's, which Node's `fileURLToPath` rejects as an object). Fixed the test to use the string form (`fileURLToPath(import.meta.url)` + `path.resolve`), re-ran.

Real RED, against the unchanged script (EXIT:1):
```
 ❯ src/app/entryGate.test.ts (7 tests | 2 failed)
   × ... > skips the welcome page for an installed launch (display-mode: standalone) and marks it entered
     → expected [ '/welcome.html' ] to deeply equal []
   × ... > skips the welcome page for an iOS home-screen launch (navigator.standalone) and marks it entered
     → expected [ '/welcome.html' ] to deeply equal []
 Tests  2 failed | 5 passed (7)
```
The 5 that passed immediately are guards for behaviour being preserved, not new behaviour, so they did not fail first by design: first browser visit on `/` redirects to `/welcome.html`; an iOS Safari tab (`navigator.standalone === false`) still redirects; a deep link (`/auth`) never redirects and sets the flag; an already-entered browser is left alone; unavailable storage (both `getItem` and `setItem` throw `SecurityError`) neither throws nor redirects.

GREEN after the script edit (EXIT:0): `Tests 7 passed (7)`, stderr 0 bytes.

Mutation check (temporary; restored and re-run green): changed the script to `matchMedia('(display-mode: browser)')... || navigator.standalone !== undefined`. Exactly the two predicted tests failed (the installed `display-mode` launch and the iOS-tab-still-redirects case). Also covered by construction: dropping the flag write fails both installed tests; dropping the `try/catch` fails the storage test; `location.assign` instead of `replace` fails the first-visit test (the stub has only `replace`).

### About row (`npx vitest run src/app/routes/settings/AboutPage.test.tsx`)

RED (EXIT:1, 1 failed | 3 passed): `Unable to find an accessible element with the role "region" and name "Welcome page"`.
GREEN (EXIT:0): `Tests 4 passed (4)`, stderr 0 bytes.

## Gates (state before the follow-up fix; superseded by "Follow-up gates" at the end; bare, output to files)

| Gate | Result |
|---|---|
| `npx vitest run` (full suite) | EXIT:0 — 176 files, 2128 tests passed |
| `npm run typecheck` | EXIT:0 |
| `npm run lint` | EXIT:0 (no output) |

Stderr: my two files print nothing (0 bytes in isolation; no stderr block names either file in the full-suite log). The full suite's own stderr (about 160 KB) is pre-existing noise from other files (mostly `OperationsBoard.test.tsx`), untouched.

Not run, on purpose: `smoke.sh` (it calls `git rev-parse`), `npm run build` (`emptyOutDir` would wipe the `dist/` the live verification uses), `npm run test:rules`. Those are the controller's.

## Patterns followed / deviations

- Followed: TDD with RED recorded; inline script kept (runs before the bundle); About row uses `SettingsGroup`/`SettingsRow` only (Tailwind spacing utilities not used); no storage/store/event-log change.
- Deviation 1 (small): the J-21 matrix row had no mention of the 2026-07-13 first-visit redirect (only `vite.config.ts` did), so the appended text records both amendments (#442 and #523) to read coherently. Trim to the 10-13 sentence if you prefer.
- Deviation 2 (none in behaviour): used `const installed` rather than `var`.

## Concerns

1. **RESOLVED by the follow-up fix below.** `SettingsRow` with `href` used to render `target="_blank" rel="noopener noreferrer"` for every link, which would have thrown an installed app out to the system browser. Same-origin paths now open in the same window; absolute URLs keep `_blank`.
2. **Group spacing.** About's wrapper is `flex flex-col gap-6` and every sibling Settings page uses the same wrapper. The project memory says spacing utilities are dead; the stale repo-root `dist/` CSS does contain `.gap-6{gap:calc(var(--spacing) * 6)}` with `--spacing:.25rem`. Only checked statically. If it is dead in the live preview, the new group sits flush under "App updates" (as on every multi-group Settings page), which would differ from the mockup. Compare the live page to `00-mockup-about-welcome-row.png`.
3. **Service worker.** `index.html` is precached, so an already-installed copy gets the new script only after its SW updates (the "two cold starts" rule). A fresh `--user-data-dir` Chrome `--app` window has no prior SW, so the live check there is unaffected.
4. **`new Function` in the test** trips the security-guidance hook warning. It evaluates our own `index.html` text read from disk (no interpolation of untrusted strings); kept as the plan specified.
5. **Fail-open on `matchMedia` errors.** If `matchMedia` is missing or throws, the existing `catch` swallows it and the app loads without a redirect, the same fail-open rule as unavailable storage.
6. **Untested other half of the contract.** `welcome.html`'s CTA click handler (sets `fieldshore_entered`) has no test; the same extraction technique would work. Out of scope here.
7. **Ruling carried from the plan:** an installed launch sets the flag, so a later browser visit on the same origin also skips the welcome page.
8. **CSP checked, none exists.** Editing the inline script's text cannot be refused by a script-hash policy: `firebase.json` hosting headers carry only Cache-Control, X-Content-Type-Options, Referrer-Policy, Permissions-Policy and X-Frame-Options; no `Content-Security-Policy`, `script-src`, `sha256-` or `unsafe-inline` appears in `firebase.json`, `src/app/index.html`, `src/app/welcome.html`, `vite.config.ts`, the untracked ADR-042 draft or the untracked `security-hardening/` audit folder (the only repo-wide hits are third-party files under `functions/node_modules`). If a CSP is added later (ADR-042 territory), the gate script's hash changes with this edit.

## Needs live verification (controller)

- Fresh origin, browser visit to `/` still lands on `/welcome.html`.
- Installed mode (Chrome `--app`): lands on Quick Find with no bounce and leaves `fieldshore_entered = '1'`; if `--app` does not report `display-mode: standalone`, the jsdom test is the proof.
- Settings -> About shows the "Welcome page" group matching the mockup; the row opens `/welcome.html`; welcome's "Open FieldShore" returns to Quick Find; signed-out login screen still shows "New here? See what FieldShore does".
- Item 5: comment on #523 that its first bullet is done.

---

# Follow-up fix (coordinator request): same-origin `SettingsRow` links open in the same window

Why: `SettingsRow` with `href` always rendered `target="_blank" rel="noopener noreferrer"`. For the welcome-page row that would open the system browser from an installed app (leaving the app shell), and welcome's "Open FieldShore" would then start a second instance. No git commands; nothing committed.

## What changed

| File | Change |
|---|---|
| `src/app/routes/settings/SettingsRows.tsx` | New private `isSameOriginPath(href)`: starts with `/`, but not `//` and not `/\`. In the `href` branch the `<a>` gets `target="_blank"` and `rel="noopener noreferrer"` only when the href is NOT a same-origin path; otherwise neither attribute is rendered (`undefined`, so React omits them). `href` prop gained a doc comment. Plain `<a>`, not the router `Link`, because `/welcome.html` is its own HTML entry, not a router route (same as the login screen's link). |
| `src/app/routes/settings/SettingsRows.test.tsx` (new, 6 tests) | Table-driven, real `SettingsRow` render: absolute `https://` and `http://` URLs keep `target="_blank"` and `rel="noopener noreferrer"`; `/welcome.html` and `/` have no `target` and no `rel`; `//example.com/...` and `/\example.com/...` (start with a slash but name another host) keep `_blank`. |
| `src/app/routes/settings/AboutPage.test.tsx` | The welcome-row test now also asserts the link has NO `target` attribute (same window). |

Help & reference rows (`HelpReferencePage.tsx:70,76`, both `https://`) are unchanged in behaviour: still `_blank` + `noopener noreferrer`; pinned by the `https://` cases above. They were the only other `href` callers.

Deviation (small, in the safe direction): the coordinator's rule was "starts with `/`". A bare prefix check would also treat protocol-relative `//host/...` (and `/\host/...`, which browsers read the same way) as in-app and drop `_blank`. Those are excluded, so anything that looks like another host still opens in a new tab.

## TDD evidence

RED, before touching `SettingsRows.tsx` (EXIT:1, 3 failed | 7 passed across the two files):
```
 × AboutPage > has a way back to the public welcome page, opened in this window ...
     → expect(element).not.toHaveAttribute("target")   (received target="_blank")
 × SettingsRow href > opens the same-origin page /welcome.html in this window
 × SettingsRow href > opens the same-origin page / in this window
     → expect(element).not.toHaveAttribute("target")   (received target="_blank")
```
The 4 external-link cases (2 absolute, 2 host-looking) passed immediately: they pin behaviour being kept, not new behaviour, so they cannot fail first against the old code.

GREEN after the fix (EXIT:0): AboutPage 4 passed + SettingsRows 6 passed = 10 passed, stderr 0 bytes.

Mutation checks (temporary; restored; final runs below confirm):
- A: `isSameOriginPath` reduced to `href.startsWith('/')` -> exactly the two host-looking cases failed (`//example.com/...`, `/\example.com/...`).
- B: `const external = false` (nothing ever opens a new tab) -> exactly the 4 external-link cases failed (this is what protects the Help & reference rows).

## Follow-up gates (final state, after the last edit; bare, output to files)

| Gate | Result |
|---|---|
| Focused: `AboutPage.test.tsx`, `SettingsRows.test.tsx`, `entryGate.test.ts` | EXIT:0 — 3 files, 17 tests passed, stderr 0 bytes |
| `npx vitest run` (full suite) | EXIT:0 — 177 files, 2134 tests passed (was 176 / 2128; +1 file, +6 tests) |
| `npm run typecheck` | EXIT:0 |
| `npm run lint` | EXIT:0 (no output) |

No stderr block in the full-suite log names any of my three test files.

## Concerns / for the live check

- The About row keeps the outward arrow (`trailing="external"`) from the accepted mockup even though it now navigates in this window. The arrow still reads correctly (it leaves the app screens for a separate page), but say so if you want a chevron instead.
- In an installed app there is no browser Back: the way back from `/welcome.html` is its "Open FieldShore" button (`href="/"`, which also sets `fieldshore_entered`). The live "way back" check should confirm it returns to Quick Find in the SAME window (no second instance).
- Group spacing vs the mockup PNG is still unchecked live (concern 2 above).
