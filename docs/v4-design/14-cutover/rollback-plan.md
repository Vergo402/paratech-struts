# Cutover rollback plan: Phase J gate #265

**Status:** Revised after the devops-resilience review (all 22 findings have a disposition in §7). Local dry run complete (§5). · **Date:** 2026-10-17 · **Author:** migration-specialist (for Fable) · **Reviewers:** devops-resilience, Alex (go/no-go)
**Covers:** runbook Step 5 (#267 merge + cutover) and the Rollback node (`.claude/plans/v4-completion-runbook.md`). **Constraints:** ADR-009; ADR-041 (rules require `receivedAt == now`, and rules deploy only after the client build); ADR-042 (a rejected upload halts the queue and retries forever).
**Deployment context:** beta only, no fielded users. No cutover or rollback step writes to `paratech-c3ab4`, the v3 data project, but **only after T-0 gate SERVED-SAME passes** (§3.0). Without that gate, the merge ships a localStorage block that can make an old v3 device write a stale operation back into `paratech-c3ab4` (§1).
**Kit:** `.claude/audits/phase-j/265-rollback/kit/`, to be committed by the orchestrator to `docs/v4-design/14-cutover/rollback/`. Paths below write it as `kit/`. It holds three folders:
- `killswitch/`
- `rules/` (the lockdown generator plus the L1 and L2 sets)
- `scripts/`: one script per step, each with `set -euo pipefail`. Running a script with `DRY_RUN=1` prints every live command instead of running it.

Every script finds the rollback bundle `$B` through a fixed symlink, `~/Documents/FieldShore-backups/cutover-current`, which `t0-capture.sh` writes. A rollback on a later day therefore finds the same files. `REPO` defaults to `~/Developer/paratech-struts/fieldshore-main`. Any clone whose `origin` is GitHub works, and no git step needs a checkout.

---

## 1. Starting state (verified 2026-10-16 and 2026-10-17; functions row re-verified 2026-10-20)

| Surface | Before cutover | After cutover (Step 5) | Rollback end state |
|---|---|---|---|
| `main` / GitHub Pages (legacy Jekyll build, source `main` `/`) | `d005f537` (merge of #518). Pages `built` at `d005f537`. v3.22.3. `Cache-Control: max-age=600` | A `--no-ff` merge of `v4-redesign`, as a PR (P8). Tree == `v4-redesign` | The tree of tag `v3-legacy-final` (= `d005f537`), restored by one fast-forward commit (§3.4) |
| Live hosting `fieldshore-database.web.app` | Disabled since 2026-10-09 (404). Older live versions are July v4 builds | First v4.0 build live, as a clone of the CI-built beta version (P9) | **The kill switch, left live** until the next attempt (§3.3) |
| Beta channel | `fieldshore-database--beta-2rs8x80s.web.app`, version `d46681f4373783e3`, CI run `38420545115` at `903a68e` (2026-10-13). **Expires 2026-11-12** | Unchanged | Unchanged, **but not a stable fallback** (see the facts below) |
| RTDB rules (`fieldshore-database-default-rtdb`) | Live == `database.rules.json` at `3005e74` == HEAD `903a68e` | Rules from the merge commit, deployed after the phone check | The T-0 snapshot (R1 restore), or a lockdown set for T5 (§3.2) |
| Cloud Functions (us-central1, v2, nodejs22) | `provisionAccount`, `adminUpdateAccount`, `deleteOwnAccount`. `firebase-functions` 7.4. All three carry `firebase-functions-hash` `1ff9b314…`. Source generations are `1792465496214594`, `1792465598322544` and `1792465597116754`, uploaded 2026-10-20 between 03:04 and 03:07Z by `firebase deploy --only functions` from a clean `fieldshore/` checkout at `427b67c` (the PR #534 merge; `functions/` there == `22cad22`). This replaced the 2026-10-09 deploy of `54a4a0c` | None deployed, if gate FUNCTIONS-UNCHANGED passes | Checked against the T-0 hash-and-generation baseline (§3.6) |
| Data | v3 in `paratech-c3ab4`. v4 in `fieldshore-database` (fresh-start re-import, #264) | No data step | Verify only. Restores are path-scoped (§3.7) |

**Facts that shape the plan:**
- **An as-is merge is not harmless to v3** (review High 1, reproduced in drill 04 and 05). The merge changes exactly one served file, root `index.html`. It adds 26 lines that copy every orphaned `fieldstruts_*` localStorage key into the matching `fieldshore_*` key whenever that key is null.
  - v3 renamed its keys at v3.11.1 (`ae78512`) and never migrated them, so a device that last ran v3.11.0 or earlier still holds the old ones.
  - v3 removes `fieldshore_operation` when an operation ends (`app.js` ~8339), and `init()` restores it with no staleness check (~9370).
  - The active-ops first-fire guard (~3102) then `set`s that stale operation into `paratech-c3ab4` as active.
  - **Fix:** P1 removes the block on `v4-redesign` before the merge. v4 is served from a different origin, so on Pages the block can only ever act on v3. Gate SERVED-SAME then proves the merge leaves `index.html`, `app.js`, `style.css`, `sw.js` and `manifest.json` byte-identical (drill 07, 08).
  - **Insurance:** T-0 also exports `paratech-c3ab4`.
- **The v3 root files are not behind.** Both branches carry v3.22.3 in the version label, `APP_VERSION` and `CACHE_NAME`. `merge-base` = `d005f537` = `origin/main`, and the merge has no conflicts (drill 05).
- **The merge removes main's tracked `.firebaserc`** (default project `paratech-c3ab4`) and replaces `firebase.json` and `database.rules.json` with v4's. A rollback brings them back. Kit scripts always pass `--project` and `--config`.
- **`fieldshore/` is not a place to run git steps.** `main` is checked out in the `fieldshore-main/` worktree, and `fieldshore/` holds another session's uncommitted work. The kit builds commits with `commit-tree` and pushes them, so it never needs a checkout.
- **Beta CI deploys hosting only.** `deploy-v4-beta.yml` runs lint, test and build, then `FirebaseExtended/action-hosting-deploy` to channel `beta`. It never deploys RTDB rules or functions. A push to `v4-redesign` (P1, P6, R3b) or a re-run therefore cannot undo an R1 restore or lockdown. Rules change only through `r1-rules.sh` or a manual deploy.
- **Every direct push to `main` is an admin bypass** of the ruleset `protect-main`, which requires a PR (0 approvals) and blocks deletion and non-fast-forward updates. A push to `main` fires only `pages-build-deployment`. `deploy-v4-beta.yml` fires only on `v4-redesign`.
- **Beta is not a stable fallback.**
  - The channel expires 2026-11-12. Only a push to `v4-redesign`, or a re-run of its deploy, resets the clock.
  - The hostname has rotated on expiry twice (`go29zg4q`, `hwdkojxb`, now `2rs8x80s`). Each rotation is a new origin with an empty IndexedDB. Cloud data comes back on sign-in, but unsynced local data on the old origin is stranded.
  - Once Gate 4 passes, Alex's daily driver becomes the live origin (§3.8).
- **Auth links.**
  - `/__/auth/action` and `/__/auth/handler` still return 200 on a disabled site, so password-reset links survive.
  - Magic links sent from the live origin during the cutover window continue to `fieldshore-database.web.app/auth` and land on the kill page. That page tells the user to request a new link from beta.

## 2. Triggers and execution order

| Trigger (R0, §3.1) | R1 rules | Drain gate (§3.3) | R2 hosting | R3 + R3b git | Also |
|---|---|---|---|---|---|
| **T1** Gate 4 fails before the rules deploy | none | yes | R2a kill switch | yes | |
| **T1/T2** after the rules deploy | Restore first, if the cutover changed the rules | yes, after R1 | R2a | yes | |
| **T3** v3 site or Pages broken by the merge | none | none | none | yes | Live v4 hosting can stay |
| **T4** data | Restore, if rules are involved | **no drain** | R2a immediately | yes | List stranded devices; R6 assessment |
| **T5** exposure | **Lockdown L1** (L2 if the exposure path is unknown) | Under L1, yes. Under L2, impossible | R2a | yes | Proper rules fix as a follow-up. Functions bypass rules (§3.2) |

Order: **R0 decide → R1 rules → drain gate → R2 hosting → R3 git → R3b record → R4 tag (keep) → R5 functions → R6 data → R7 tracking.** Reverting the merge whenever the cutover aborts keeps `v4.0.0` (#268) off a merge that never went live.

## 3. Steps

### 3.0 T-0: prerequisites, captures, gates (all before the Step 5 merge)

| # | Action | Who | Command | Gate |
|---|---|---|---|---|
| P1 | Remove the root `index.html` localStorage block on `v4-redesign` with one commit that sets the file to `origin/main:index.html` | Orchestrator. The push triggers a beta CI redeploy, which also extends beta (P6) | In a clean `v4-redesign` worktree: `git show origin/main:index.html > index.html`, then commit and push | SERVED-SAME in P4. **Done 2026-10-17:** `20fafb4` ([#530](https://github.com/Vergo402/paratech-struts/issues/530)); SERVED-SAME OK against origin |
| P2 | Fallback tag on the main tip | Fable | `kit/scripts/t0-tag.sh` | Peeled tag on `origin` == `origin/main` (checked by the script) |
| P3 | Captures into a fresh bundle `$B`, plus the symlink. The bundle holds: the refs; `firebase projects:list` and `gh auth status` (authority gates); the live rules; the RTDB export; the `paratech-c3ab4` export; `functions:list --json`; `hosting:channel:list --json --config kit/killswitch/firebase.json`; the Pages build; the last beta run | Fable (reads only) | `kit/scripts/t0-capture.sh` | `extract.py` stops unless the beta version, URL and expiry are all present, the functions baseline has a hash and a generation per function, and the live rules have a `rules` key |
| P4 | Git gates | Fable | `kit/scripts/t0-gates.sh` | All must print OK: MERGE-CLEAN, SERVED-SAME, FUNCTIONS-UNCHANGED (since `427b67c`, the last functions deploy; a FLAG instead sends you to P10), TAG |
| P5 | Kill-switch preview channel, holding the exact bytes R2a will clone | Alex's go | `cd kit/killswitch && firebase hosting:channel:deploy killswitch --expires 30d --project fieldshore-database --config ./firebase.json`. Then refresh `$B/channels.json` (same command as P3) and run `python3 kit/scripts/extract.py "$B"` | `$B/killswitch-version.txt` is non-empty, and `curl -s <channel URL>/sw.js \| grep -c registration.unregister` returns 1 |
| P6 | Extend beta and record its URL | Fable | Any push to `v4-redesign` (P1 does it), or `gh run rerun <databaseId from $B/beta-run.json> --repo Vergo402/paratech-struts` | A fresh channel list shows `expireTime` at least 30 days out |
| P7 | Add `https://fieldshore-database.web.app/*` to the Maps key's referrer allowlist | Alex (Google Cloud console) | none | Address autocomplete works on the live origin at Gate 4 |
| P8 | Do the forward merge as a PR, not a direct push (recommendation for the runbook) | Fable | `gh pr create --repo Vergo402/paratech-struts --base main --head v4-redesign --title "v4.0 cutover (#267)" --body "<gates passed>"`, then `gh pr merge <n> --repo Vergo402/paratech-struts --merge` | R3 gains a phone route (GitHub's Revert button) |
| P9 | Go live by cloning the CI-built beta version (recommendation for the runbook). Order per ADR-041: client first, rules last | Fable, on Alex's go | (1) Client: `firebase hosting:clone fieldshore-database@$(cat "$B/beta-version.txt") fieldshore-database:live`. (2) Wait for the Gate 4 phone check to pass on the live client. (3) Only then deploy rules: `git -C "$REPO" show <M>:database.rules.json > "$B/cutover-rules.json" && kit/scripts/r1-rules.sh "$B/cutover-rules.json"` | The live bundle is byte-identical to what beta tested and carries the CI secrets. A local build of the merge commit lacks the gitignored `.env.local` (Maps and what3words keys) |
| P10 | Only if P4 flagged functions. If functions are instead deployed before T-0 (as on 2026-10-20), move the baseline (`FN` in `t0-gates.sh`, and §1) to the deployed commit, proven by the `functions:list` generations | Fable | Deploy functions by name from a clean checkout **before** hosting: `git -C "$REPO" worktree add --detach /tmp/fn origin/v4-redesign && npm --prefix /tmp/fn/functions ci && firebase deploy --only functions:provisionAccount,functions:adminUpdateAccount,functions:deleteOwnAccount --project fieldshore-database --config /tmp/fn/firebase.json` | R5 becomes an active step |
| T+0 | Right after the merge lands | Fable | `kit/scripts/t1-record-merge.sh` | M^1 == tag and M's tree == `v4-redesign`. M is saved to `$B/M.txt` |

**Optional, recommended now (Alex's call): make the kill switch the live release before the cutover** with `firebase hosting:clone fieldshore-database:killswitch fieldshore-database:live`. It does two things:
- It retires any July-era install of the live origin, which would otherwise run forever as a zombie that writes to RTDB.
- It makes the release just before go-live the kill switch. The Firebase console's release-history "roll back" then becomes a phone path for R2a. This is unverified and LIVE-ONLY.

**Time:** 15 min plus one beta CI run.

### 3.1 R0: decide (triggers, authority, budget)

- **T1 Gate 4 fails:** qa-driver cannot complete the live end-to-end drive, the PWA has not updated after two cold starts, or the console shows an error loop.
- **T2 rules:** the deploy fails, or writes stop syncing after it (the indicator is stuck, or there is an unexplained "had no effect").
- **T3 v3 site:** the Pages build errors, or v3 fails to load or does not read v3.22.3.
- **T4 data:** two devices disagree after sync (ADR-041 convergence), or RTDB is missing records that are in `$B/rtdb-pre-cutover.json`.
- **T5 exposure:** non-members can read department data.

**Who decides:** Alex. Fable recommends, and runs R1, R2, R3b and R5 on Alex's go. R3's push to `main` (an admin bypass) and any R6 `database:set` are done by Alex himself.

**Budget:** decide within 30 min of a trigger. Fix-forward is allowed only if it touches neither rules nor data, and it passes smoke, build, `test:rules` and the phone check within 60 min. A full rollback takes about 15 min hands-on, plus the drain window.

**Where it can run:**
- R1, R2, R3b and R5 need the Mac with the logged-in `firebase` and `gh` CLIs. P3 checks both before the cutover.
- From a phone: R3 through GitHub's Revert on the cutover PR (P8), and possibly R2a through the console roll back (§3.0).
- Beta keeps serving throughout, because it is a separate origin. The field has the app while Alex gets to the laptop.

### 3.2 R1: rules

**Restore (T1, T2, T4).** Run `kit/scripts/r1-rules.sh "$B/live-rules.json"`.
- It deploys the T-0 snapshot from a standalone folder (`firebase deploy --only database --project fieldshore-database --config ./firebase.json`), reads it back, and gates on RULES-PARITY.
- Today the snapshot, HEAD and the cutover rules are identical, so the restore changes nothing unless the cutover changed the rules.

**Lockdown (T5).** A restore cannot contain T5. A rules flaw found at cutover already existed on beta, and both origins share one RTDB.
- **L1, membership freeze:** deploy `kit/rules/rules-lockdown-L1.json` with the same script. Nobody can join, create a department, read or write invite codes, or change the roster. Members keep reading and syncing.
- **L2, deny-all:** use `rules-lockdown-L2.json` if the exposure path is unknown. Nothing reads or writes. Every device keeps working on local data, and nothing syncs.
- **Then** fix the rules properly and deploy the fix through the normal gate.
- **Regenerating L1:** `kit/rules/make-lockdown.py <rules.json> <out-dir>` rebuilds L1 from any rules file, and it stops if the rules shape has changed.
- **Roster changes during L1** go through the console or `firebase database:update /orgs/<deptId>/members/<uid> '{"active":false}' --project fieldshore-database`; admin writes bypass rules.
- **Cloud Functions write with admin rights.** If the exposure runs through a callable, delete it with `firebase functions:delete <name> --region us-central1 --project fieldshore-database`.

**Order: rules first, then hosting.**
- Drill 22 shows the v4.0 client's write (a server-stamped `receivedAt`) passing under the T-0 snapshot, and even under the pre-ADR-041 `dc6d322` rules. So restoring rules first never strands the current client.
- A July client's write (no `receivedAt`) fails under the current rules. That is why July builds are never cloned (§3.3).
- **Never restore rules older than `3005e74`.** Under `dc6d322` a forged `receivedAt` is accepted (drill 22, W3), so any writer could forge the canonical order.

**Time:** 3 min. **Reversible:** yes (deploy the other file). **Dry run: LOCAL.** Drill 22 ran 9 rule loads, each 104 ms or less with read-back parity IDENTICAL, and passed 15 of 15 gates. Drill 34 repeated the matrix with the restore target loaded from the git ref this plan names (`git show 3005e74:database.rules.json`) in both orders, and passed 19 of 19 gates. The sha256 of every loaded file is logged. The live deploy is **LIVE-ONLY**.

### 3.3 R2: hosting (drain gate, then the kill switch as the end state)

**The end state is the kill switch, left live until the next cutover attempt.** Disabled is never an end state. Drill 24 P2 shows why:
- An installed v4 app on a disabled site still opens from its precache (a 200 served by the service worker).
- It keeps talking to RTDB, because the websocket never goes through Hosting.
- Its update check gets a 404, so it can never receive the kill switch.

That device is a permanent zombie writer.

**Drain gate, by trigger:**
- **T1/T2, and T5 under L1:**
  1. After R1, each live-origin device opens the app and must read "Synced". If every device does, run R2a.
  2. If a device cannot reach Synced, enter **drain mode** with `kit/scripts/r2-drain-disable.sh`. It disables live hosting, so new visits get a 404, while installed apps keep running from their precache and drain over RTDB. In drill 25 a queued `OperationCreated` uploaded 1.6 s after relaunch while Hosting returned 404.
  3. When every device reads Synced, or 2 hours have passed, run R2a. List any device still not Synced as stranded (R7).
- **T4:** do **not** drain, because draining would upload the bad events into an append-only log. Run R2a immediately. List the devices whose local events are knowingly stranded, and keep them offline (airplane mode, app not opened) for a later forensic export (R7).
- **T5 under L2:** nothing can sync. Run R2a immediately. Devices keep their local data.

Unsynced IndexedDB is **stranded, with no guarantee that it is kept**. `src` never calls `navigator.storage.persist()`, so Safari and Chrome may evict it under storage pressure.

**R2a: kill switch** (`kit/scripts/r2a-killswitch.sh`).
- **Route 1:** `firebase hosting:clone fieldshore-database@<killswitch-version> fieldshore-database:live`. These are the bytes rehearsed on the P5 channel.
- **Route 2,** when no version was recorded or the channel has expired: `cd kit/killswitch && firebase deploy --only hosting --project fieldshore-database --config ./firebase.json -m "v4 kill switch (#265)"`.
  - **Carve-out to the standing ban:** this is the one sanctioned `firebase deploy --only hosting` in the project. The ban protects live from the main `firebase.json`. This deploy uses the kit's own folder and config, and changing live is its purpose. It also re-enables a disabled site.
- **Kit files:**
  - `sw.js`: calls skipWaiting. On activate it deletes all caches, unregisters, and navigates each open window.
  - `index.html`: the offline notice. It tells users to use beta and to request a new sign-in link from beta.
  - `firebase.json`: `public "."`, `ignore ["firebase.json","**/.*"]`, a rewrite of `**` to `/index.html`, and `Cache-Control: no-cache`.

**Expected:** `release complete` / `Deploy complete!`.

**Verify:**
1. The script curls `/sw.js`, which must contain `registration.unregister`, and a deep link, which must return the offline page.
2. On each known device: open the app, wait 10 s, force-quit, reopen, and repeat once. Success means the offline page with no controlling service worker.
3. If a sign-in link was in flight, request a new one from beta.

**Time:** 3 min plus two launches per device.

**Dry run: LOCAL.**
- Drills 24 (production bundle) and 25 (emulator bundle, signed in): the kill switch retired the app on the first cold start, within 11.8 s including the 10 s wait. Afterwards there was no SW and no caches, and IndexedDB was kept. Fresh visitors and deep links got the offline page.
- Drill 27: the real Hosting emulator served the kit with `/sw.js` as JavaScript and no-cache. The upload list was `sw.js` and `index.html` only.

**LIVE-ONLY:**
- The deploy or clone itself.
- iOS standalone behaviour, meaning whether `WindowClient.navigate()` works there. This stays LIVE-ONLY until the iPhone rehearsal in §6 passes.

**R2c: roll forward instead,** for a bad build provenance with sound code: `firebase hosting:clone fieldshore-database@$(cat "$B/beta-version.txt") fieldshore-database:live`. **Never** clone a version that went live before 2026-10-09. Those are July builds that predate ADR-041, so their uploads are rejected and retried forever.

### 3.4 R3: git (restore commit), then R3b

**R3.** Run `PUSH=direct kit/scripts/r3-rollback-git.sh`. The push is Alex's.
- **Gates:** `M^1 == v3-legacy-final` on the recorded M, and M is on `origin/main`.
- **The commit:** one restore commit, `commit-tree v3-legacy-final^{tree} -p origin/main`. Its tree is correct by construction, even when commits landed after M. Drill 20 shows that `git revert -m 1 M` leaves those later commits behind.
- **The push:** a fast-forward. It bypasses the PR rule, and nothing is forced.

**No-bypass route:** run with `PUSH=pr`. That pushes to `rollback/v4-cutover`, then runs `gh pr create --repo Vergo402/paratech-struts --base main --head rollback/v4-cutover --title "Roll back the v4 cutover (#265)" --body "..."` and `gh pr merge rollback/v4-cutover --repo Vergo402/paratech-struts --merge`. Pages then builds the PR's merge SHA.

**Phone route:** GitHub's Revert on the cutover PR (P8). It is equivalent to `git revert -m 1 M`, which is correct only when nothing landed after M (drill 20a). The laptop then runs R3b and the tree gate.

**Verify on Pages:**
- `gh api repos/Vergo402/paratech-struts/pages/builds/latest --jq '.status,.commit'` returns `built` and the pushed SHA.
- `curl -s -o /dev/null -w '%{http_code}' "https://vergo402.github.io/paratech-struts/package.json?rb=$(date +%s)"` returns 404. It returns 200 while v4's tree is served.
- `curl -s "https://vergo402.github.io/paratech-struts/?rb=$(date +%s)" | git hash-object --stdin` equals `git rev-parse v3-legacy-final:index.html`. Drill 32 recorded today's baseline.
- Pages sends `max-age=600`, and v3's own service worker revalidates every 5 min. A phone can show the old page for about 15 min and needs two launches.
- If a Pages build errors, Pages keeps serving the previous successful build.

**R3b, in the same session.** Run `kit/scripts/r3b-record-ours.sh`.
- **What it does:** it records the rollback on `v4-redesign` as merged without applying it. The commit is `commit-tree origin/v4-redesign^{tree} -p origin/v4-redesign -p origin/main`, identical to `git merge -s ours` (drill 14b).
- **How it lands:** a fast-forward push to `v4-redesign`. It never checks out the dirty worktree, and beta CI rebuilds the same tree.
- **Why it matters:** without it, the next routine "merge main into v4-redesign" applies the rollback. Drill 13: `src` dropped from 537 files to 0, `package.json` disappeared, and `.firebaserc` pointed at `paratech-c3ab4`. Beta CI would then fail at `npm ci`.
- **Until R3b lands, nobody merges main into `v4-redesign`.**

**Retry:**
1. Run `kit/scripts/retry-gate.sh before`. It must print RETRY-SAFE, meaning main is an ancestor of `v4-redesign`.
2. Do a plain `--no-ff` merge or PR of `v4-redesign`.
3. Run `kit/scripts/retry-gate.sh after`. It must print TREE-OK.

Drills 16 to 18 covered this with a fix commit.

**If R3b was skipped:**
1. Revert the restore commit.
2. `git merge --no-ff origin/v4-redesign`.
3. `git diff --quiet origin/v4-redesign HEAD && echo TREE-OK`.

Never merge `v4-redesign` onto the rolled-back main without one of these two paths. Drill 19 hit a modify/delete conflict and then a mixed tree (2 `src` files, no `package.json`).

**Time:** 2 min plus 1–2 min of Pages build. **Dry run: LOCAL.** Drills 08 to 20 ran against a bare stand-in remote. Drill 12 served the v3 root on :8095 and screenshotted it. The pushes are **LIVE-ONLY**.

**Force alternative (Alex only, not recommended):** `git push --force-with-lease=main:$M origin 'v3-legacy-final^{commit}:refs/heads/main'`. It rewrites public history and needs the `non_fast_forward` bypass.

### 3.5 R4: tag

Keep `v3-legacy-final`. To retire it later: `git push origin :refs/tags/v3-legacy-final`. Tags are outside `protect-main`.

### 3.6 R5: Cloud Functions

**If T-0 gate FUNCTIONS-UNCHANGED passed,** the cutover deploys no functions, and R5 is `kit/scripts/r5-functions-verify.sh`. It compares `functions:list --json` with the T-0 baseline on hash **and** source generation; drill 29 returned FUNCTIONS-SAME against the 2026-10-17 baseline. Only a fresh P3 bundle is valid: `cutover-current` still points at the 2026-10-17 rehearsal bundle, which holds the old `39b237dc` baseline, so R5 run against it would STOP. The table output can't show a code change.

**If P10 ran,** R5 is active: redeploy by name from a clean checkout of the T-0 `origin/v4-redesign` commit (recorded in `$B/refs.txt`). **Never roll functions back below what the beta client calls** (today `427b67c`: beta at `c13c7b0` ships 2f0625e's ChangePasswordGate, which needs its server half).

**Ban a bare `firebase deploy`.** It deploys functions from the working tree, including another session's uncommitted `functions/` edits.

A function that did not exist before is removed with `firebase functions:delete <name> --region us-central1 --project fieldshore-database`.

### 3.7 R6: data (verify; restore is the last resort)

- **Preserved:**
  - `paratech-c3ab4`, given SERVED-SAME.
  - All v4 RTDB data, since no forward or rollback step writes data.
  - Everything on the beta origin.
- **At risk (stranded):** events or guest-mode data held only in a live-origin IndexedDB when R2a lands. They stay unreachable until v4 returns to that origin, and they can be evicted, because nothing calls `storage.persist()`. The mitigation is the drain gate (§3.3).
- **Not lost:** uploads rejected while a client and the rules disagree stay queued on the device. They go up once the rules accept them.
- **Last resort, Alex only:** `kit/scripts/r6-restore-path.sh /orgs/<deptId>/<child> <extract.json>`, which runs `firebase database:set <path> <extract> --project fieldshore-database -f`.
  - **Refused paths:** the root; a whole department; any `/orgs/<id>/events*` path. The event log is append-only, so a restore there erases events that devices already hold as uploaded, and nothing re-sends them until #520. In drill 23 the root restore erased the post-export event.
  - **Prefer compensating events.**
  - **After any restore,** every device that synced the department signs out, clears site data, and signs in again.
  - **Dry run: LOCAL.** Drill 23 restored through REST PUT, and drill 28 checked the refusals.
  - **LIVE-ONLY:** the CLI call itself, because the CLI cannot target the emulator here (drill 23a).

### 3.8 Post-acceptance variant (after Gate 4, when live is Alex's daily driver)

A later T4 or T5 rollback strands his own install. Order:
1. Run the drain gate on live (T1, T2, or T5 under L1).
2. R2a.
3. Refresh the beta URL from the latest `deploy-v4-beta.yml` run.
4. Reinstall from beta and sign in. Cloud data returns through sync.

### 3.9 R7: tracking

1. File the blocker: `gh issue create --repo Vergo402/paratech-struts --title "[Phase J] Cutover rollback: <what failed>" --body "<trigger, steps run, stranded devices>"`. Priority 1, v4 board, as a sub-issue under #138.
2. Reopen what the cutover closed: `gh issue reopen 267 --repo Vergo402/paratech-struts`, and 268 and 138 if they are closed.
3. If `v4.0.0` was released: `gh release edit v4.0.0 --repo Vergo402/paratech-struts --prerelease`, or `gh release delete v4.0.0 --repo Vergo402/paratech-struts --yes` (this keeps the tag).
4. Re-run P6 to extend beta.

## 4. Failure modes during the rollback

| Failure | Mitigation |
|---|---|
| Re-merging after R3 is a silent no-op, conflicts, or produces a mixed tree | R3b, then a plain merge. Or revert the restore commit, then merge. The tree gate applies either way (drills 16–19) |
| Someone pushed to `main` after M | The restore commit is still TREE-OK (drill 20). The GitHub Revert route is not; use the laptop route |
| Merging main into `v4-redesign` after R3 wipes v4 from that branch | R3b in the same session, and no such merge until it lands (drills 13–15) |
| `firebase` run in `fieldshore-main/` after R3 hits `paratech-c3ab4` | Kit scripts always run from a standalone folder with `--project` and `--config` |
| v4 rules pushed to `paratech-c3ab4` | v3 rules come only from `v3-legacy-final` |
| An old live version gets cloned | Clone only the recorded killswitch or beta version |
| A device never relaunches after R2a | It is not running, so it does no harm. Live stays on the kill switch, so whenever it next launches online, the switch retires it on the first cold start (drills 24, 25) |
| A device relaunches while live is disabled (drain mode) | It runs from its precache and syncs, which is intended. R2a must follow; the script prints NEXT |
| Drain never completes | 2-hour cap, then R2a and a list of stranded devices (R7) |
| The kill-switch channel version has expired (30 days) | `r2a-killswitch.sh` falls back to the folder deploy |
| `hosting:disable` prompts in a non-interactive shell | The script passes `-f` |
| `hosting:channel:list` finds no firebase.json | The script passes `--config kit/killswitch/firebase.json` (drill 01) |
| An agent refuses `deploy --only hosting` partway through the rollback | The carve-out in §3.3; prefer the clone route |
| Beta expired during an incident | P6 at T-0 and after any rollback; refresh the URL from the latest deploy run |
| No laptop at hand | Beta keeps serving. R3 via GitHub Revert from a phone. R2a via the console roll back (unverified) |
| A root, whole-department or events restore gets attempted | `r6-restore-path.sh` refuses it (drill 28) |

## 5. Evidence (LOCAL dry run, 2026-10-17)

Folder: `.claude/audits/phase-j/265-rollback/`. The table below is copied unchanged from `REPORT.md`. Each log records the exact command, cwd, start and end epoch, exit code and duration. The full narrative is in `REPORT.md`. Inputs: `main` `d005f537`, `v4-redesign` `903a68e`.
- Git steps ran against a local bare stand-in remote with no GitHub remote (drill 02).
- Emulator steps used ports 9000 and 9099.
- Browser steps used :4173 for `vite preview`, a 404 server, and the kit; :8095 served v3.
- Kit checks used :5200 on the Hosting emulator.

| # | Step (plan §) | Method | Duration s | Exit | Evidence | Result |
|---|---|---|---|---|---|---|
| 01 | T-0 list captures and value extraction (§3.0) | Real projects, read-only: `firebase projects:list`, `gh auth status`, `functions:list --json`, `hosting:channel:list --json` with and without `--config`, Pages build, last beta run, tag `ls-remote`, `extract.py` | 26 | 0 | `01-t0-live-lists.log` | pass. channel:list without a firebase.json is refused, as the review said. Extracted beta version `d46681f4373783e3`, beta expiry 2026-11-12, and the functions hash and generation per function |
| 02 | Drill stand-in for GitHub | `git clone --bare`, `update-ref` main/v4-redesign, clone, `remote -v` | 6 | 0 | `02-git-setup.log` | pass (NO-GITHUB-REMOTES) |
| 03 | T-0 tag (§3.0 P2) | `kit/scripts/t0-tag.sh` | 1 | 0 | `03-git-t0-tag.log` | pass |
| 04 | T-0 gates, v4-redesign as it is today | `kit/scripts/t0-gates.sh` | 1 | 1 | `04-git-t0-gates-asis.log` | pass. Non-zero is the intended result: the gate blocks because `index.html` CHANGED |
| 05 | As-is merge: conflicts, served-file diff, version strings | throwaway clone, `merge --no-ff` | 9 | 0 | `05-git-asis-merge-diff.log` | pass. No conflicts. The only served change is `index.html` +26 lines (the block). All three version strings read v3.22.3. `.firebaserc` is deleted |
| 06 | T-0 prerequisite P1: remove the root `index.html` block (stand-in commit) | `drill/git-fix-block.sh` | 13 | 0 | `06-git-fix-block.log` | pass |
| 07 | T-0 gates after P1 | `kit/scripts/t0-gates.sh` | 1 | 0 | `07-git-t0-gates-fixed.log` | pass: MERGE-CLEAN, SERVED-SAME, FUNCTIONS-UNCHANGED, TAG |
| 08 | Cutover merge and push (forward) | `drill/git-cutover.sh` | 3 | 0 | `08-git-cutover-merge.log` | pass. No conflicts and zero served-file changes |
| 09 | Record M and gate its shape (§3.0 T+0) | `kit/scripts/t1-record-merge.sh` | 0 | 0 | `09-git-t1-record-merge.log` | pass |
| 10 | R3: restore commit, fast-forward push | `PUSH=direct kit/scripts/r3-rollback-git.sh` | 3 | 0 | `10-git-r3-rollback.log` | pass (TREE-OK, no force) |
| 11 | Served v3 files equal pre-merge main | `git diff --stat v3-legacy-final origin/main -- index.html app.js style.css sw.js manifest.json` | 2 | 0 | `11-git-verify-v3-served.log` | pass. Diff empty, whole tree equal, `.firebaserc` back to `paratech-c3ab4`, v3.22.3 |
| 12 | Serve the rolled-back root and screenshot it | `npx serve -l 8095`, headless Playwright, Firebase hosts aborted | 24 | 0 | `12-serve-v3-screenshot.log`, `12-v3-rolled-back.png` | pass. 200; `.version-label` v3.22.3; no migration marker; no page errors |
| 13 | Hazard: merging main into v4-redesign without R3b | throwaway branch | 3 | 0 | `13-git-hazard-merge-main.log` | pass, hazard reproduced: `src` 537 → 0 files, no `package.json`, `.firebaserc` = `paratech-c3ab4` |
| 14 | R3b: record the rollback as merged (`-s ours`) | `kit/scripts/r3b-record-ours.sh` | 1 | 0 | `14-git-r3b-record-ours.log` | pass |
| 14b | The R3b commit equals `git merge -s ours` | tree and parent comparison | 1 | 0 | `14b-git-ours-equivalence.log` | pass |
| 15 | Routine merge of main after R3b | `git merge origin/main` | 1 | 0 | `15-git-routine-merge-safe.log` | pass ("Already up to date", tree intact) |
| 16 | Retry gate, before | `kit/scripts/retry-gate.sh before` | 1 | 0 | `16-git-retry-gate-before.log` | pass (RETRY-SAFE) |
| 17 | Retry carrying a fix: plain `--no-ff` merge | `drill/git-retry-plain.sh` | 3 | 0 | `17-git-retry-plain-merge.log` | pass (fix on main) |
| 18 | Retry gate, after | `kit/scripts/retry-gate.sh after` | 0 | 0 | `18-git-retry-gate-after.log` | pass (TREE-OK) |
| 19a | Variant A (no R3b), attempt 1 | `drill/git-retry-variantA.sh` | 0 | 1 | `19a-git-retry-variantA-attempt1.log` | fail. The drill script did not handle the naive merge's modify/delete conflict |
| 19b | Variant A, attempt 2 | same | 1 | 129 | `19b-git-retry-variantA-attempt2.log` | fail. Drill-script bug: `git revert -q` is not a valid flag |
| 19 | Variant A, final | same | 4 | 0 | `19-git-retry-variantA.log` | pass. The naive merge conflicts, then leaves a MIXED tree (2 `src` files, no `package.json`). Revert-of-rollback plus merge gives TREE-OK |
| 20 | R3 routes compared | revert `-m 1` against the kit's restore commit | 4 | 0 | `20-git-r3-route-compare.log` | pass. With nothing after M, `revert -m 1` (GitHub's Revert button) is OK. With one commit after M, revert leaves that commit's file behind, while the kit's restore commit is TREE-OK |
| 21 | Emulators start | `npm run emulators` (background) | 11 to ready | 0 | `21-emulators-start.log` | pass |
| 22 | R1: rules load order and lockdown matrix | REST `PUT /.settings/rules.json` (owner). Test reads and writes use Auth-emulator ID tokens. 8 probes × 9 loads | 1 | 0 | `22-emu-rules-matrix.log` | pass (15/15 gates) |
| 23 | R6: path-scoped restore vs root restore | REST `PUT` (= `database:set`) | 0 | 0 | `23-emu-data-restore.log` | pass. The path restore repairs inventory and keeps the later event. The root restore erases it |
| 23a | `firebase database:*` against the emulator | CLI with `FIREBASE_DATABASE_EMULATOR_HOST`, demo project | 3 | 2 | `23a-emu-cli-database-probe.log` | fail. The CLI looks up the instance through the management API first, so it cannot target the emulator here. R6's CLI form stays LIVE-ONLY; REST is the drilled equivalent |
| 24 | R2, production bundle: install → disabled → kill switch → fresh visitor | `vite preview :4173`, a 404 server for "disabled", the kit kill switch, Playwright persistent profile, two cold starts | 35 | 0 | `24-sw-killswitch-prod-bundle.log`, `24-p1-installed.png`, `24-p2-disabled-zombie.png`, `24-p4-killswitch-cold2.png` | pass. Disabled = zombie (200 from the SW, update 404, SW kept). The kill switch retired it on the first cold start (11.8 s including the 10 s wait). Second launch: no SW, no caches, IndexedDB kept. A fresh visitor gets the offline page |
| 25a | Drain mode, attempt 1 | `drill/sw-drain.mjs` | 124 | 1 | `25a-sw-drain-mode-emu-attempt1.log`, `25a-*.png` | fail. Drill-script bug: the department lookup returned nothing, so the cloud checks were void |
| 25 | R2 drain mode, emulator bundle (signed in) | sign up and create a department; block RTDB and start an operation (queued, 0 in cloud after about 10 s); disable hosting; relaunch; kill switch with two cold starts | 38 | 0 | `25-sw-drain-mode-emu.log`, `25-d2-queued-offline.png`, `25-d3-drain-synced.png`, `25-d5-killswitch-cold2.png` | pass. With hosting at 404 the precached app opened and uploaded the queued `OperationCreated` (server-stamped) in 1.6 s. The kill switch then retired it, and the department's IndexedDB was kept |
| 26 | Emulators stop | SIGINT to our firebase process | 2 | 0 | `26-emulators-stop.log` | pass |
| 27 | Kit kill switch on the real Hosting emulator, plus the upload list | `firebase emulators:exec --only hosting` (:5200, demo project); firebase-tools `listFiles` | 2 | 0 | `27-kit-hosting-emulator.log` | pass. `/sw.js` is JS with no-cache; deep links return the offline page. The kit ignore list uploads `sw.js` and `index.html` only; the old list would also upload `.DS_Store` |
| 28 | Kit dry run plus guard rails | `DRY_RUN=1` on every live-facing script; r6 refuses `/`, `/orgs/<id>` and `/orgs/<id>/events*`; lockdown files regenerate byte-identical | 0 | 0 | `28-kit-dryrun.log` | pass |
| 29 | R5: functions verify | `kit/scripts/r5-functions-verify.sh` (live `functions:list --json`, read-only) | 3 | 0 | `29-r5-functions-verify-live-read.log` | pass (FUNCTIONS-SAME on hash and generation) |
| 30 | `npm run build` (gate) | wt-903a68e | 69 | 0 | `30-build.log` | pass |
| 31 | Emulator-mode build for step 25 | `vite build --mode emulators --outDir dist-emu` | 12 | 0 | `31-build-emu.log` | pass |
| 32 | Pages verify probe, baseline | public GETs (read-only) | 2 | 0 | `32-pages-probe-live-read.log` | pass. `max-age=600`; `package.json` 404; served `index.html` blob == tag blob |
| 33 | Emulators start, second session (for the git-ref rules load) | `npm run emulators` (background) | 7 to ready | 0 | `33-emulators-start-2.log` | pass |
| 34 | R1 matrix with the restore target loaded from the git ref the plan names (`3005e74`) | Same as 22, plus `rules-3005e74.json` (`git show 3005e74:database.rules.json`, sha256 `07745418…` == HEAD). The sha256 of every loaded rules file is logged | 1 | 0 | `34-emu-rules-matrix-gitref.log`, `inputs/` | pass (19/19 gates). `3005e74` behaves like the T-0 snapshot in both orders |
| 35 | Emulators stop, second session | SIGINT to our firebase process | 0 | 0 | `35-emulators-stop-2.log` | pass |
| L* | Every live action (plan §6) | none | – | – | – | not-run (live-only) |

### Live rehearsals (2026-10-17)

| L | Rehearsal | Duration (s) | Exit | Evidence | Result |
|---|---|---|---|---|---|
| L1–L3 | `kit/scripts/t0-capture.sh` against live: rules, v4 and v3 exports, functions/channels/Pages lists; bundle `~/Documents/FieldShore-backups/cutover-rehearsal-2026-10-17-0653` (data stays outside the repo) | 12 | 0 | `L01-L03-t0-capture-live.log` | pass; live rules IDENTICAL to `903a68e:database.rules.json` |
| L11 + gap 4 | Throwaway site `fs-rb-drill-234439`: deploy, disable, clone `beta` channel onto the disabled site, disable, clone `@d46681f4373783e3` version onto the disabled site, disable, folder deploy onto the disabled site, delete | 22 | 0 | `L11-throwaway-site-disable-clone-live.log` | pass; every route re-enables a disabled site (404 → 200 within 1 s); site deleted, not listed |
| L6 + L10 | Kill-switch preview channel deployed (`killswitch-my72tf2h`, expires 2026-11-16); beta copied to throwaway `rehearsal` channel; Alex installed it on his iPhone home screen and opened it twice; rehearsal switched to the kill switch by `hosting:clone`; Alex reopened; rehearsal channel deleted | 5 + 2 + 2 + 2 (CLI); iPhone retired on the first open after the switch | 0 | `L06-L10-killswitch-iphone-live.log` | pass; iOS home-screen app showed "FieldShore v4 is offline" on open 1 and Firebase "Site Not Found" on open 3 after the channel was deleted (no saved copy left); root page lagged the clone by under 10 s at the CDN, `/sw.js` did not |
| L19 | Real `kit/scripts/r6-restore-path.sh` on `/orgs/zz-drill-265/scratch`: seed, extract, damage, guard refusals (root, events), restore, verify, remove | 17 | 0 | `L19-scratch-path-restore-live.log` | pass; restored == extract IDENTICAL; guards refused before any write; scratch path removed (null) |

Gap 4 is closed: `hosting:clone` (in both channel and version form) and a folder deploy each re-enable a site disabled with `hosting:disable`, so the clone-based go-live (P9) and R2a both work while live is disabled.

## 6. LIVE-ONLY steps awaiting Alex's approval

`$B` is `~/Documents/FieldShore-backups/cutover-current`. Steps marked T-0 are part of the cutover. The rest run only in a rollback, or as an explicit rehearsal.

1. **L1, T-0 export of the live rules:** *(rehearsed live 2026-10-17, see §5 Live rehearsals: L01-L03)* `firebase database:get /.settings/rules --project fieldshore-database -o "$B/live-rules.json"`. This runs inside `kit/scripts/t0-capture.sh`, together with L2 and L3.
2. **L2, T-0 export of v4 data:** *(rehearsed live 2026-10-17, see §5 Live rehearsals: L01-L03)* `firebase database:get / --project fieldshore-database -o "$B/rtdb-pre-cutover.json"`.
3. **L3, T-0 export of v3 data (insurance):** *(rehearsed live 2026-10-17, see §5 Live rehearsals: L01-L03)* `firebase database:get / --project paratech-c3ab4 -o "$B/v3-pre-cutover.json"`.
4. **L4, P1:** *(done: `20fafb4`, #530)* commit the root `index.html` block removal on `v4-redesign` and push. This triggers the beta redeploy.
5. **L5, P2:** *(done 2026-10-17: tag `v3-legacy-final` on GitHub → `d005f537`)* `REPO=~/Developer/paratech-struts/fieldshore-main kit/scripts/t0-tag.sh`, which runs `git push origin refs/tags/v3-legacy-final`.
6. **L6, P5:** *(done 2026-10-17: channel `killswitch-my72tf2h`, expires 2026-11-16; re-run t0-capture.sh at T-0 so the bundle records its version)* `cd kit/killswitch && firebase hosting:channel:deploy killswitch --expires 30d --project fieldshore-database --config ./firebase.json`.
7. **L7, optional now:** put the kill switch on live with `firebase hosting:clone fieldshore-database:killswitch fieldshore-database:live`.
8. **L8, P6:** *(done 2026-10-17: beta redeployed 06:56, expires 2026-11-16)* `gh run rerun 38420545115 --repo Vergo402/paratech-struts`, or any push to `v4-redesign`.
9. **L9, P7:** add `https://fieldshore-database.web.app/*` to the Maps key's referrer allowlist in the Google Cloud console.
10. **L10, iPhone rehearsal of R2a.** *(rehearsed live 2026-10-17: pass on the first open, see §5 Live rehearsals)* Rehearse on a throwaway channel:
    1. `firebase hosting:clone fieldshore-database@$(cat "$B/beta-version.txt") fieldshore-database:rehearsal`.
    2. Install that URL on the iPhone home screen and open it twice.
    3. `firebase hosting:clone fieldshore-database:killswitch fieldshore-database:rehearsal`.
    4. Open, wait 10 s, force-quit, reopen, and repeat once. Expect the offline page.
    5. `firebase hosting:channel:delete rehearsal --project fieldshore-database --force`.
11. **L11, disable rehearsal on a throwaway site** *(rehearsed live 2026-10-17, see §5 Live rehearsals: L11)* (Alex's call): `firebase hosting:sites:create fieldshore-rb-drill --project fieldshore-database`, deploy any folder to it, then `firebase hosting:disable --site fieldshore-rb-drill --project fieldshore-database -f`, then `firebase hosting:sites:delete fieldshore-rb-drill --project fieldshore-database`.
12. **L12, R1:** `kit/scripts/r1-rules.sh "$B/live-rules.json"`, or with `kit/rules/rules-lockdown-L1.json` or `-L2.json`. It runs `firebase deploy --only database --project fieldshore-database --config ./firebase.json`.
13. **L13, R2 drain:** `kit/scripts/r2-drain-disable.sh`, which runs `firebase hosting:disable --site fieldshore-database --project fieldshore-database -f`.
14. **L14, R2a:** `kit/scripts/r2a-killswitch.sh`. It runs `firebase hosting:clone fieldshore-database@<killswitch-version> fieldshore-database:live`, or the folder deploy (§3.3).
15. **L15, R2c, or the P9 go-live:** `firebase hosting:clone fieldshore-database@d46681f4373783e3 fieldshore-database:live`, using whichever beta version is current at T-0.
16. **L16, R3, Alex's push:** `PUSH=direct kit/scripts/r3-rollback-git.sh` (it runs `git push origin <restore>:refs/heads/main`), or `PUSH=pr`, or GitHub's Revert on the cutover PR. Then the Pages verification in §3.4.
17. **L17, R3b:** `kit/scripts/r3b-record-ours.sh`, which runs `git push origin <ours>:refs/heads/v4-redesign`.
18. **L18, R5, only if P10 ran:** the by-name functions redeploy in §3.6.
19. **L19, R6, Alex only:** *(rehearsed live 2026-10-17, see §5 Live rehearsals: L19)* `kit/scripts/r6-restore-path.sh /orgs/<deptId>/<child> <extract.json>`, which runs `firebase database:set … -f`.
20. **L20, R7:** the `gh issue create`, `gh issue reopen` and `gh release edit` commands in §3.9.

## 7. Review dispositions (devops-resilience, 2026-10-17)

| # | Sev | Finding (short) | Disposition | Where / evidence |
|---|---|---|---|---|
| 1 | High | The merge's localStorage block can write a stale v3 operation into `paratech-c3ab4`; "no step touches paratech-c3ab4" was false | **Fixed.** P1 removes the block before the merge; gate SERVED-SAME blocks the merge until it lands; P3 exports `paratech-c3ab4`; the header statement is now conditional on the gate | §1, §3.0 P1/P3/P4; drills 04–08, 11 |
| 2 | High | Leaving the site disabled turns every relaunched install into a permanent zombie | **Fixed.** The kill switch is the end state and stays live. Disable is only the temporary drain mode and is always followed by R2a. Kill switch to live now is offered as L7 | §3.3, §4; drills 24 (P2 zombie), 25 |
| 3 | High | "Show Synced first" may be impossible, harmful under T4, and eviction is possible | **Fixed.** A trigger-dependent drain gate with drain mode and a 2-hour cap; T4 kills immediately and lists stranded devices; "not deleted" is gone; the missing `persist()` call is stated | §3.3, §3.7; drill 25 |
| 4 | High | For T5, R1 restores identical rules, so the exposure continues | **Fixed.** Lockdown sets L1 (membership freeze) and L2 (deny-all) with a generator, tested on the emulator; T5 row changed; functions bypass noted. Beta CI deploys hosting only, so pushes to `v4-redesign` cannot overwrite a lockdown (§1) | §2, §3.2; drills 22, 28, 34 |
| 5 | High | After R3, a routine merge of main into `v4-redesign` wipes v4 | **Fixed.** R3b (`-s ours` through `commit-tree`, no checkout) in the same session; such merges banned until it lands; §4 row added | §3.4, §4; drills 13, 14, 14b, 15 |
| 6 | High | The retry instruction breaks when v4 carries fixes | **Fixed.** The retry is a gate, a plain merge after R3b, then TREE-OK. Without R3b: revert the restore, merge, then the TREE gate | §3.4; drills 16–19 |
| 7 | Med | `channel:list` needs a firebase.json; the beta version ID was never captured | **Fixed.** `--json --config kit/killswitch/firebase.json`; `extract.py` gates on a non-empty version, URL and expiry; R2c and P9 clone by version | §3.0 P3; drill 01 |
| 8 | Med | The functions table can't show code changes; uncommitted `functions/` edits | **Fixed.** The T-0 baseline holds hash and generation; FUNCTIONS-UNCHANGED gate with a P10 branch; R5 rule against rolling below beta. Open question 3: the reviewer's timing evidence is accepted; byte-level proof stays open (§8) | §1, §3.0, §3.6; drills 01, 07, 29 |
| 9 | Med | Beta is not a stable fallback (expiry, rotation, Alex's daily driver) | **Fixed.** §1 fact, P6 extension at T-0 and in R7, post-acceptance variant | §1, §3.0 P6, §3.8, §3.9; drill 01 (expiry 2026-11-12) |
| 10 | Med | "Open once" contradicts the two-cold-start rule; iOS unproven | **Fixed.** Verify is open, wait 10 s, force-quit, reopen, twice. iOS stays LIVE-ONLY (L10) | §3.3; drills 24, 25 |
| 11 | Med | `$B` and helpers lived only in the T-0 shell; the heredoc was not the drilled file; evidence sat in the scratchpad | **Fixed, staged.** Kit with one strict script per step and the fixed `cutover-current` symlink; the kill switch is drilled byte-for-byte on the real Hosting emulator; route 1 clones the rehearsed channel version. The kit and evidence are in `.claude/audits/phase-j/265-rollback/`; the orchestrator commits the kit to `docs/v4-design/14-cutover/rollback/` | Header, §3.0 P3/P5, §3.3; drills 27, 28 |
| 12 | Med | No phone path; no auth check; a direct push has no Revert button | **Fixed.** P3 checks `projects:list` and `gh auth status`; P8 does the forward merge as a PR; phone routes stated (GitHub Revert; console roll back, unverified); beta keeps serving | §3.0, §3.1, §3.4; drill 01 |
| 13 | Med | The clean-checkout live build lacks `.env.local`; the Maps key referrer | **Adopted as runbook recommendations.** P9 clones the beta version to live, with rules through `r1-rules.sh` from `git show <M>`; P7 updates the Maps allowlist. Runbook Step 5 belongs to the orchestrator | §3.0 P7/P9; L9, L15 |
| 14 | Med | A root `database:set` causes the T4 condition it is meant to fix | **Fixed.** Path-scoped only; root, whole-department and events paths refused; a re-sync instruction after every restore; compensating events preferred | §3.7; drills 23, 28 |
| 15 | Low | Pages caching and v3's SW delay what a phone sees | **Fixed.** Cache-busted probes; expect about 15 min and two launches. Because P1 removes the marker string, the probes are now `package.json` 200/404 and served-blob equality | §3.4; drill 32 |
| 16 | Low | M was checked by eye; HEAD may not be M | **Fixed.** `t1-record-merge.sh` records M with the `M^1` gate; R3 uses the `commit-tree` restore, which is TREE-OK regardless of later commits | §3.0 T+0, §3.4; drills 09, 10, 20 |
| 17 | Low | Tag creation was not a T-0 gate; the runbook's `git tag -l` check fails | **Fixed.** P2 creates it and gate TAG checks it with `ls-remote`. The runbook's `git tag -l` check should become `git ls-remote origin 'refs/tags/v3-legacy-final^{}'` (orchestrator) | §3.0; drills 03, 07 |
| 18 | Low | `gh pr create` prompts without flags | **Fixed** in `r3-rollback-git.sh` `PUSH=pr` with `--repo/--base/--head/--title/--body` and `gh pr merge … --merge`; Pages is verified against the merge SHA | §3.4 |
| 19 | Low | The kill switch's ignore list uploads dotfiles | **Fixed.** `"ignore": ["firebase.json", "**/.*"]`; the upload list was proven with firebase-tools `listFiles` | §3.3; drill 27 |
| 20 | Low | R2a contradicts the standing "never deploy --only hosting" rule | **Fixed.** The clone route is preferred, and the carve-out is explicit for the folder route | §3.3 |
| 21 | Low | The rollback resets neither #267/#268 nor a v4.0.0 release | **Fixed.** R7 reopens the issues and edits or deletes the release | §3.9 |
| 22 | Low | Magic links from the live origin land on the kill page | **Fixed.** The kill page and R2a's verify step both say to request a new sign-in link from beta | §1, §3.3; `kit/killswitch/index.html` |

## 8. Open items

1. Alex's acceptance of this revision, and his approvals for §6. P5 (L6) and the iPhone rehearsal (L10) should run before the cutover.
2. Orchestrator tasks:
   - Commit the kit to `docs/v4-design/14-cutover/rollback/` and the evidence folder under `.claude/audits/phase-j/265-rollback/`.
   - Update runbook Step 5 with P7, P8, P9, T+0, and the `ls-remote` tag check.
   - The earlier scratchpad drills (`rb265/`, `rv265/`) are superseded by this run and can be archived alongside it.
3. Byte-level proof that the deployed functions equal `functions/` at `427b67c` (== `22cad22`): download a source zip or check the Cloud console. The deploy log (clean tree at `427b67c`, `npm ci` with firebase-functions 7.4.0, no outdated-SDK warning) and uploads 53 s to 2.6 min after the merge are strong evidence, but they are not byte-level. Not blocking while beta-only.
4. Follow-up candidates:
   - v4 calls `navigator.storage.persist()`, so stranded data survives storage pressure (v4.0.x).
   - #520's re-send path would let R6 relax its events ban.
   - A forensic export of a device's unsynced events (T4).
