
# QA proof: #466 queued offline join completes on an already-online reopen

Driver: qa-driver (Sonnet 5.5). Branch `v4-redesign`, working tree as served by Vite on 2026-10-12, 22:30 to 22:58 EDT. Brief: `.superpowers/sdd/v4-phase-j-step1-p1-p8/qa-466-brief.md`. Recipe source: `task-2-report.md` ("How to prove it" + "Pre-review fix" + "Fix round 1").

## Verdict

Every criterion in the brief PASSES. One planned extra (an app-written queued row produced through the real offline join) was not reproducible in this build and is recorded as BLOCKED in section 7.

| # | Criterion (brief step) | Result | Where to look |
|---|---|---|---|
| 1 | 4a. Reload while online: the app finishes the join itself, lands on `/operations` of QA Dept 466 A, banner not shown afterwards | PASS | shots 04, 05, 06; session JSON; `navigationType:"navigate"`; join landed +458 ms after the plant |
| 2 | 4b. Emulator REST shows B's member row under A | PASS | `rest/step3-as-captured.txt` |
| 3 | 4c. `fieldshore_pending_join` meta row is gone | PASS | meta read after the join: row `null` |
| 4 | 4d. No sync-layer console errors | PASS (caveat: 4 view-transition AbortErrors, none in any fix window) | section 4 |
| 5 | Step 5. Shared-device control (B's row, another account signed in) | PASS (run with a decoy dept so it can actually fail, see 3.2) | shot 07; `rest/step5-*`; matched positive control `rest/stepE-*` |
| 6 | Step 6. Legacy row without `uid` | PASS (A and B variants) | `rest/step6a-*`, `rest/step6b-*` |
| 7 | Step 7. Baseline note | stated in section 6 | |
| 8 | Step 8. Stop both preview servers | done, ports verified free | section 8 |

Extras that also PASS: owner signs out and back in (the join survives the guest period and completes on sign-in); department-less cross-account control; banner positive control (banner painted, then cleared by the fix); ordinary online join through the Join screen (adjacent-flow regression).

## 1. Harness and deviations (read these)

- Servers: `preview_start fieldshore-emulators` (Auth 127.0.0.1:9099, RTDB 127.0.0.1:9000, `reused:false`), then `preview_start fieldshore-v4-emu` (Vite 6.4.3 on :5200, `reused:false`). Firebase SDK 12.15.0 (`@firebase/database` 1.1.3).
- **Origin deviation.** I tested at `http://127.0.0.1:5200`, not `http://localhost:5200`. The browser pane keeps a persistent profile, and `localhost:5200` already held stale emulator state from earlier runs (6 `fieldshore-dept-*` Dexie buckets plus a persisted session in "QA Dept 471"). The moment `preview_start` opened it, that stale tab wrote `userDepts/nqqh…` ("QA Dept 471") into my fresh emulator and hit `permission_denied` on a `deviceOwners` write, before I had created anything. That stray row is still in `rest/final-state.txt`; it is not from this run. I closed that tab and used a clean origin in a new tab. I did not touch the `localhost:5200` storage. Same app, same dev server, same emulators; only the browser storage partition differs.
- **The served code is the fixed code.** An in-page `fetch('/@fs/…/src/data/auth/authSession.ts')` contains the boot gate `!rebooting && isOnline()`; `departmentService.ts` contains `ownIntent` and `attemptPendingJoin`; the page loaded both from `/@fs/…`; no service worker, no `caches` entries, no controller on the origin.
- The pane was hidden the whole run (`document.hidden === true`). Screenshots still painted real pixels (checked); see the console note in section 4. Viewport 1024x768; screenshots are the pane's JPEG captures converted to PNG with `sips` (valid PNGs, 800x600 or smaller).
- Test accounts (emails only; one throwaway password, generated at run time, not recorded here or in the evidence, and deleted from the scratchpad): `qa466a@example.test` (A), `qa466b@example.test` (B), `qa466c@example.test` (C), `qa466d@example.test` (D), `qa466e@example.test` (E), `qa466f@example.test` (F). All emulator-only.
- Git: two read-only git commands (`git branch --show-current`, which my role prompt requires, and one unneeded `git check-ignore`). No state-changing git, no source edits, no subagents.

IDs used (all emulator):

| Who | uid | Role in this run |
|---|---|---|
| A | `YR8RtoG5xHXRxip1PFtjmlYXuhjj` | creates QA Dept 466 A, dept id `d90feeda-c313-4c3a-b6f0-d52a206e4921`, invite code `Y47T-QGKF` (matches REST `orgs/inviteCodes` and the on-screen sheet) |
| B | `0epa2KmMkSZ80rFG8kIjd8xWtMor` | the account whose join is "queued" (step 3) |
| C | `74PXgMFQ8GrYEMtwZN3O94aRoKxe` | creates decoy QA Dept 466 C, dept id `5a17b03e-e6aa-4c15-9536-66d7979d29ca`, code `QGFQ-DS4V` |
| D | `tVHCTptDaGjSsPb1RgnN542V70oL` | department-less owner variant, then matched positive control |
| E | `VSsTGoPzNsic5GgY8VaJ6Ixu5lxe` | department-less cross-account control, then banner positive control |
| F | `wks11SK8zi2OqhEJuy6NFmyCDBVk` | ordinary online join (regression) |

## 2. Step 3 (the fix): queued join completes on an already-online reopen

State before: A signed up, created QA Dept 466 A, logged out (Settings > Account > Log out > Log Out). B signed up through `/auth` > Create Account, tapped "Skip for now", and sat on the "Set up your department" gate at `/operations` (shot 04). B's session row: `member`, `departmentId` null, no `fieldshore_pending_join` row, no banner, `navigator.onLine` true. REST: dept A members = A only.

Action: with B signed in, I planted the row in `fieldshore-global` > `meta` and reloaded while online (no offline toggle, no network flap; `navigator.onLine === true` the whole time). Plant at `02:37:34.323Z`:

```
{"uid":"0epa2KmMkSZ80rFG8kIjd8xWtMor","code":"Y47T-QGKF","deptName":null}
```

Result (read about 14 s later):

- Landed on `http://127.0.0.1:5200/operations`, the department-scoped screen (shot 05: "No active operation", no gate, no banner). `performance.getEntriesByType('navigation')[0].type` is `navigate`, not `reload`: that is the app's own `window.location.assign('/operations')` firing after my `location.reload()`, i.e. the second boot was the join's reboot.
- B's session row: `kind:member`, `departmentId:d90feeda-…`, `departmentName:"QA Dept 466 A"`, `role:default`, `inviteCode:Y47T-QGKF`.
- `fieldshore_pending_join` row: `null` (meta keys left: `fieldshore_auth_uid`, `fieldshore_dept_memberships`, `fieldshore_legacy_db_deleted_v1`, `fieldshore_migrated_buckets_v1`, `fieldshore_onboarding_progress`, `fieldshore_session`).
- Banner: `.fs-sync-banner` count 0 and no "Will join" text in `document.body.innerText`.
- REST (owner auth): `orgs/d90feeda-…/members/0epa2KmMkSZ80rFG8kIjd8xWtMor` = `{"displayName":"QA466 Member B","joinedAt":1791859054781,"role":"default","viaCode":"Y47T-QGKF"}`. `joinedAt` is `02:37:34.781Z`, +458 ms after the plant. `userDepts/<B>` now points at dept A.
- "Header/department name" in the brief: `AppHeader` renders only the screen title (its doc comment says the department subtitle slot stays empty), so the department name is not on `/operations`. Shot 06 (B on Settings > Department, titled "QA Dept 466 A") plus the session JSON is the visual and machine evidence of the department.

Banner positive control (so "banner absent" is not vacuous): with E signed in and department-less, I planted `{"uid":E,"code":"Y47T-QGKF","deptName":"QA Dept 466 A"}`, called the app's own `departmentService.restorePendingJoin()` (what `main.tsx` does at boot; same module URL, so the same singleton), and went back client-side to the shell gate. Shot 09 shows the banner "Will join “QA Dept 466 A” when you reconnect" painted while `navigator.onLine` is true. Then `location.reload()` while online: E joined by itself (`joinedAt` `02:51:54.839Z`, about 0.4 s after the reload call), landed on `/operations`, `navigationType:"navigate"`, row `null`, banner count 0 (shot 10). Honest limit: that row was planted and the banner repainted by calling `restorePendingJoin()`; it is not an old-build run.

## 3. Account binding

### 3.1 Owner variant (the positive half of "bound to the account that queued it")
D signed up, skipped department creation, planted `{"uid":D,"code":"Y47T-QGKF","deptName":null}` while signed in, then used the gate's own Sign out button. In the guest period the row was kept (still present, no banner, identity `guest`). D then signed back in on `/auth` with no reload by me: the join completed by itself, D's member row appeared under dept A (`viaCode` `Y47T-QGKF`, `joinedAt` `02:45:48.184Z`), `navigationType:"navigate"`, row `null`, no banner (shot 08).

### 3.2 Step 5 and Step 6, and why I changed the code used
The literal Step 5/6 cannot fail: A and B are already members of QA Dept 466 A, so a regressed guard would hit "already a member", drop the row, and look identical to PASS. I created decoy dept C (valid, active code `QGFQ-DS4V`; neither A nor B is a member) so a guard failure would show as a new member row under C and the account's session flipping to C. Every check was read at T+2 s and again at T+8 s after the reload (a late retry would show at T+8 s). The rows are in `rest/`.

| Run | Signed in | Planted row | Reload online; result at T+2 s and T+8 s |
|---|---|---|---|
| Step 5 | A (admin of A) | `{uid:B, code:C's code, deptName:"X"}` | row cleared, no banner, `navigationType:"reload"` (no self-navigation), A still in dept A, `orgs/<C>/members` still only C, dept A members unchanged, `userDepts` unchanged. PASS (shot 07) |
| Step 6a | A | legacy `{code:C's code, deptName:null}`, no uid | row cleared, no banner, no join, nothing changed in A or C. PASS |
| Step 6b | B (member of A) | same legacy row | row cleared, no banner, no join, nothing changed in A or C. PASS |
| Extra G | E (department-less) | `{uid:D, code:A's code, deptName:"X"}` | row cleared, E stays department-less on `/join-department`, E not added to dept A, no navigation. PASS |
| Matched positive control | D (member of A) | `{uid:D, code:C's code, deptName:null}` (same decoy code, uid now matches) | D did join C (`orgs/<C>/members/<D>`, `viaCode QGFQ-DS4V`, `joinedAt 02:46:59.461Z`, +451 ms after the plant), session flipped to C, `navigationType:"navigate"`. This proves the decoy code is joinable, so the "no join" rows above are the ownership guard working, not a dead code. |

## 4. Console and network

- `read_console_messages` was read after every control, with `console.info('QA466-MARK …')` markers placed immediately before each plant-and-reload, so each message is tied to a window.
- Whole-tab errors: 4 identical entries, `Uncaught (in promise) AbortError: Transition was skipped`. Placement: #1 and #2 occurred before step 3 (A's flow and B's sign-up; my pre-plant read at 22:37 already showed exactly those 2 and my post-join read showed the same 2, so none inside the step-3 window); #3 occurred after my `MARK step3b` marker, during my own `location.assign('/settings/department')`; #4 occurred after the `stepR-prep` marker, somewhere in F's flow (E log out, F sign-up, join, continue). None inside any plant-to-settle window (steps 3, 5, 6a, 6b, D, E, G, H).
- Source of those 4: the only View Transitions use in the app is the CSS rule `@view-transition` at `src/app/styles.css:686`; no app JS calls `startViewTransition`. Most likely the browser skipping a cross-document transition on a hidden pane. I did not re-run with the pane visible, so "harness artifact" is likely, not proven. Not sync-layer.
- Console searches for `FIREBASE` and for `permission` across the whole tab: no matches. No warnings at all in the tab. No `permission_denied`, no sync-layer message.
- Network: I could only read the last 8 Auth-emulator requests (F's flow: sign-up, lookup, update, all 200/204); about 15,000 earlier requests had already been dropped from the pane's buffer, so earlier network traffic was not inspected. RTDB uses long-poll here, so a rejected write would not show as an HTTP error. Proof of write success is the server state (REST rows above) plus: `/diagnostics` is `null` (the write-only sync ledger logged nothing), no `permission_denied` warning, and no unsynced/offline banner anywhere.

## 5. Adjacent-flow regression: ordinary online join
F signed up, tapped "Join an existing department", typed `Y47T-QGKF`, "Join department": sheet "Joined QA Dept 466 A / Your role Default" (shot 11); "Continue" landed on `/operations`. Session `departmentId d90feeda-…`, `role default`, no pending row, no banner. REST: F under dept A with `viaCode`. Sign-up, create department, invite-code sheet, Settings > Department, log out and sign in all behaved normally through the run.

## 6. Baseline note (brief step 7)
No pre-fix A/B is possible in this tree. Before this fix a queued join was retried only from the DOM `online` event handler (`src/data/sync/connectivity.ts` lines 62 to 72: `window.addEventListener('online', …)`, then `retryPendingJoin()`, then `window.location.assign('/operations')`). The reload-while-online of step 3 fires no `online` event, so before this fix the banner would have stayed on "Will join … when you reconnect" with nothing to retry it. Shot 09 shows what that stuck state looks like (banner painted for a queued row, device online, nothing running the retry; produced by calling `restorePendingJoin()`, not by running old code); shot 10 is the same account after the online reload with the fix.

## 7. Surprises and limits (none changes a verdict)

1. BLOCKED: app-written queued row. I could not make the app queue a join through the real UI. I forced the app's own RTDB client offline with `goOffline(rtdb)` (the dev build re-exports it from `src/data/sync/firebase.ts`): `.info/connected` went false while `navigator.onLine` stayed true. The Join screen then sat on "Joining…" for 30 s+ with no row written, and a raw `get()` of the invite-code node stayed pending past 8 s. With `@firebase/database` 1.1.3 an offline `get()` does not reject here, so `joinByCode`'s queue branch was not reached under these conditions; this matches the implementer's concern 3 (the resolve `get()` in `joinByCode` is unbounded; other reads race `READ_TIMEOUT_MS`). I drove only the manual `goOffline` case: a real network drop, and the member-write rejection branch, were not driven. Pre-existing, outside #466. Consequence: the planted row shape is established by the code (`queueJoin` writes `{uid, code, deptName}`) and by the app consuming my planted rows correctly, not by observing an app-written row. Worth a board note: a join attempted with a weak connection may sit on "Joining…" instead of queuing.
2. Not driven: the offline-boot negative check (needs a real network toggle; this pane has none). It is unit-tested (`reopened offline → does not attempt the join`).
3. The matched positive control left D as a member of two departments (A and C) with the local session flipped to C. `joinByCode` has no "already in a department" guard, so an owner-matched row for a different dept switches a dept-holding member. It is the same function the Join screen uses; not a #466 defect, noted only.
4. The first-run onboarding tour modal ("Measure the opening", Skip/Next) overlays `/operations` the first time an account lands there on a fresh origin; I skipped it once for A. It did not appear in the later screenshots (04, 05, 08, 10).
5. The stale `localhost:5200` profile state (section 1) will affect the next QA run that opens that origin against a fresh emulator. Suggest clearing that origin's storage, or using `127.0.0.1` for emulator QA.

## 8. Cleanup (actual results)
- I closed the live app tab (signed in as F) first, so nothing keeps retrying 127.0.0.1:9000. `preview_stop` on both serverIds (`685a9517-…` dev server, `bb844952-…` emulators): both reported stopped.
- `lsof -nP -iTCP -sTCP:LISTEN | grep -E ':(9000|9099|4400|4500|5200)\b'` returned none, and `ps` for emulator, vite and java processes returned none (checked 22:58 EDT). Port 9000 is free for the next gate run.
- Closed the remaining `seed` tab; that closed the browser pane.
- Not done on purpose: I did not wipe the IndexedDB for `127.0.0.1:5200` (nobody asked, it is a deletion, and closing the tab removes the live hazard). Test residue (sessions for A to F pointing at the now-dead emulator) remains in the pane profile under `127.0.0.1:5200`; the stale `localhost:5200` state I found is also untouched.
- The emulator wrote `database-debug.log` at the repo root (matches the gitignored `*.log`).

## Evidence index (folder `.claude/audits/phase-j/step1-fixes/466/`)

| File | What it shows |
|---|---|
| `01-A-signup-form-filled.png` | A's Create Account form before submit |
| `02-A-dept-created-invite-code.png` | "QA Dept 466 A is ready", code `Y47T-QGKF` |
| `03-A-settings-department-invite-code.png` | Settings > Department as A (Admin), same code |
| `04-B-signed-in-no-department-before-plant.png` | B on the "Set up your department" gate, no banner (state before step 3) |
| `05-B-after-online-reload-operations-no-banner.png` | B after the online reload: `/operations`, department-scoped, no banner |
| `06-B-settings-department-shows-QA-Dept-466-A.png` | B on Settings > Department: "QA Dept 466 A" |
| `07-step5-A-after-reload-no-banner-no-navigation.png` | A after step 5's reload: no banner, no navigation |
| `08-stepD-owner-signed-back-in-lands-operations-no-banner.png` | D after signing back in: joined, on `/operations`, no banner |
| `09-banner-POSITIVE-CONTROL-queued-state-before-online-reload.png` | The banner as it looks when a queued row is waiting (E, online) |
| `10-banner-GONE-after-online-reload-E-joined-QA-Dept-466-A.png` | E after the online reload: joined, banner gone |
| `11-regression-F-ordinary-online-join-Joined-sheet.png` | Ordinary online join sheet |
| `rest/` | emulator REST reads around each control (`snap.sh`, `step3-as-captured.txt`, `step5-*`, `step6a-*`, `step6b-*`, `stepD-*`, `stepE-*`, `stepG-*`, `stepH-*`, `stepR-*`, `final-state.txt`, `README.txt`). Some files lost their trailing `userDepts` lines to a `head` in my own pipeline; the dept A and dept C member lines are complete in every file. |

## Commands I ran (exact)

Servers and environment (preview tools, not Bash): `preview_start {name:"fieldshore-emulators"}`, `preview_start {name:"fieldshore-v4-emu"}`, a new tab via `tabs_create` then `navigate http://127.0.0.1:5200/auth`, `preview_logs` for both servers, `preview_stop` for both at the end.

Read the app's global meta rows (used at every check; run in the page via `javascript_tool`):
```js
const rows = await new Promise((res, rej) => { const r = indexedDB.open('fieldshore-global'); r.onerror = () => rej(r.error);
  r.onsuccess = () => { const db = r.result; const g = db.transaction('meta', 'readonly').objectStore('meta').getAll(); g.onsuccess = () => { db.close(); res(g.result); }; }; });
const byKey = Object.fromEntries(rows.map(r => [r.key, r.value]));
const sess = JSON.parse(byKey.fieldshore_session);   // .identity.accountId, .departmentId, .departmentName, .role
byKey.fieldshore_pending_join ?? null;               // the queued-join row
/Will join/.test(document.body.innerText); document.querySelectorAll('.fs-sync-banner').length;
performance.getEntriesByType('navigation')[0].type;  // 'reload' = no self-navigation; 'navigate' = the app's location.assign('/operations')
```

Plant a queued-join row, then reload while online (values per run in sections 2 and 3):
```js
console.info('QA466-MARK <label>');
const open = () => new Promise((res, rej) => { const r = indexedDB.open('fieldshore-global'); r.onerror = () => rej(r.error); r.onsuccess = () => res(r.result); });
const db = await open();
await new Promise((res, rej) => { const tx = db.transaction('meta', 'readwrite');
  tx.objectStore('meta').put({ key: 'fieldshore_pending_join', value: JSON.stringify({ uid: '<uid, omitted for the legacy row>', code: '<invite code>', deptName: null /* or "X" */ }) });
  tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
db.close();
setTimeout(() => location.reload(), 50);   // reload while online
```

Served-code check: `await (await fetch('/@fs/Users/alex/Developer/paratech-struts/fieldshore/src/data/auth/authSession.ts')).text()` and the same for `…/dept/departmentService.ts`, then regex for `!rebooting && isOnline()`, `ownIntent`, `attemptPendingJoin`; `navigator.serviceWorker.getRegistrations()` and `caches.keys()` both empty.

RTDB forced offline (the BLOCKED attempt, section 7.1): `const m = await import('/@fs/Users/alex/Developer/paratech-struts/fieldshore/src/data/sync/firebase.ts'); m.goOffline(m.rtdb);`

Banner repaint (positive control): `const { departmentService } = await import('/@fs/Users/alex/Developer/paratech-struts/fieldshore/src/data/dept/departmentService.ts'); await departmentService.restorePendingJoin();`

Emulator REST (owner auth; `NS=fieldshore-database-default-rtdb`):
```
curl -s -H 'Authorization: Bearer owner' "http://127.0.0.1:9000/orgs/inviteCodes.json?ns=$NS"
curl -s -H 'Authorization: Bearer owner' "http://127.0.0.1:9000/orgs/<deptId>/members.json?ns=$NS"
curl -s -H 'Authorization: Bearer owner' "http://127.0.0.1:9000/userDepts/<uid>.json?ns=$NS"
curl -s -H 'Authorization: Bearer owner' "http://127.0.0.1:9000/diagnostics.json?ns=$NS"
```
`rest/snap.sh <label>` wraps the member and `userDepts` reads and writes `rest/<label>.txt`. Screenshots: the pane's `computer screenshot` JPEGs converted with `sips -s format png <jpg> --out <png>`.

UI driving (by accessibility label; refs re-read per page): `/auth` > "Create Account" radio > Display name / email / Password fields (`form_input`) > "Create Account"; `/create-department` > "Department name" > "Create department" > "Done"; "Skip for now"; Settings > Account > "Log out" > "Log Out"; `/auth` Sign In; `/join-department` > code field > "Join department" > "Continue".

## Observation candidates for the task-observer log (not written by me)
1. `run-fieldshore` SKILL.md, "Two devices / Firebase emulators" (repo fieldshore): emulator QA in the shared browser pane should use `127.0.0.1:5200` or clear `localhost:5200` storage first; a stale persisted session wrote into a fresh emulator. Also note: `goOffline(rtdb)` leaves RTDB `get()` pending (Firebase 12.15), so the "queued join" can only be produced by planting the meta row.
2. QA brief template / qa-driver: negative controls must use a valid code for a department the signed-in account is NOT in, plus a matched positive control; otherwise a regressed guard looks identical to PASS.
3. Orchestrator briefs: subagents cannot write report `.md` files (the harness rejects the Write); ask for the report in the final message, or name a non-report evidence file.

