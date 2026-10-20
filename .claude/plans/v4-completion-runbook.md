# v4.0.0 completion runbook — commands and re-entry prompts

Companion to the flowchart shown 2026-10-12, in board-2 Priority order (Alex ranked the board the same day). One section per node. Each has: what it is, the commands, the prompt to paste if you have to circle back to it in a fresh session, and the exit test.

Board 2 IDs: project `PVT_kwHODy7CN84BYV37` · Status field `PVTSSF_lAHODy7CN84BYV37zhTcaGE` (Todo `f75ad846` / In Progress `47fc9ee4` / Done `98236657`) · Priority (number) field `PVTF_lAHODy7CN84BYV37zhV6mYY`.

```bash
# item id for an issue on board 2
gh project item-list 2 --owner Vergo402 --limit 400 --format json | jq -r '.items[] | select(.content.number == ISSUE) | .id'
```

---

## Every session

```bash
/v4
```
Task-observer loads itself. If resuming: `/cc:handoff resume`. End with `/cc:handoff save` (mid-work) or `/cc:close` (done for the day).

**Re-entry prompt:** `Continue v4 Phase J from the runbook at .claude/plans/v4-completion-runbook.md. Tell me which node we are on and what the exit test says.`

---

## Step 0 · Board triage — DONE 2026-10-12 (Alex ranked the board)

Priority order on board 2: P1 #471 · P2 #466 · P3 #464 · P4 #469 · P5 #514 · P6 #470 · P7 #513 · P8 #475 · P9 #251 · P10 #253 · P11 #254. Everything else is prefixed `[v4.0.x]` or `[v4.1]`. Still unranked and open: #442 (In Progress), #515 (folds into #263), epics #137/#138, gate tasks #263 #265 #267 #268, backlog #493–#496.

```bash
# current ranked list
gh project item-list 2 --owner Vergo402 --limit 400 --format json | jq -r '.items[] | select(.priority != null and .status != "Done") | "P\(.priority)\t#\(.content.number)\t\(.title)"' | sort -t P -k2 -n
```

---

## Step 1 · P1–P8 Phase J fixes (loop per issue)

Order: #471 sync banner wedge → #466 offline join → #464 deploy-after-delete → #469 blank-ID import → #514 doImport failure path → #470 offline precache → #513 stocked rig removal → #475 second cut vanishes.

Per issue: mark In Progress → fullstack-engineer (opus for #471/#466/#464, sonnet for the rest) with TDD → bare gates → qa-driver proof → close.
```bash
gh project item-edit --id ITEM --project-id PVT_kwHODy7CN84BYV37 --field-id PVTSSF_lAHODy7CN84BYV37zhTcaGE --single-select-option-id 47fc9ee4
bash .claude/skills/run-fieldshore/smoke.sh > /tmp/smoke.log 2>&1; echo EXIT:$?
npm run build > /tmp/build.log 2>&1; echo EXIT:$?
npm run test:rules > /tmp/rules.log 2>&1; echo EXIT:$?
gh issue close ISSUE --repo Vergo402/paratech-struts
```
Skills: `superpowers:test-driven-development`, `superpowers:systematic-debugging`, `/run-fieldshore`, `/code-review`. #466/#470/#471 need the emulator harness (`npm run emulators` + `npm run dev:emu`).

**Re-entry prompt:** `Step 1: list board-2 items P1–P8 still open, take the lowest P, and work it: TDD, bare gates with EXIT codes, qa-driver proof, close it.`

**Exit test (Gate 1):** #471 #466 #464 #469 #514 #470 #513 #475 all closed; three gates exit 0.

---

## Step 2 · P9 #251 verify every workflow against its Phase G spec

qa-driver drives each workflow in the real preview, one pass per spec, pass/fail recorded in `.claude/audits/phase-j/251-verify/`. Findings become board issues with Priority set.

**Re-entry prompt:** `Step 2 (#251): list the Phase G workflow specs, show which have a recorded pass, and verify the next unverified one with qa-driver.`

**Exit test:** every spec has a pass record; `gh issue close 251`.

---

## Step 3 · P10 and P11 simulations

```bash
/level-iv-sim      # P10 #253 — Hamden, 4 apparatus, 8 shore points
/level-iii-sim     # P11 #254 — Meadowville, 10 apparatus, command transfer
```
Both run on the emulator harness. Findings → board issues with Priority. Then close #253, #254 and epic #137.
```bash
gh issue close 137 --repo Vergo402/paratech-struts --comment "Phase I complete: #251, #253, #254 closed"
```
**Re-entry prompt:** `Step 3: report the last /level-iv-sim and /level-iii-sim results, rerun whichever has no passing report, then close #253, #254 and #137.`

**Exit test (Gate 2):** both sim reports pass, #251 #253 #254 #137 closed, parallel lane done.

---

## Parallel lane · #265 rollback, #263 manual (+#515), #442 welcome page

Runs alongside Steps 2–3. Sections below. #442: your phone feel test, then `gh issue close 442` or fold remaining work into a `[v4.0.x]` issue.

---

## #265 Rollback plan (Stage B, parallel with #263)

```bash
npm run emulators          # terminal 1
npm run dev:emu            # terminal 2, :5200
git tag -l 'v3-legacy*'    # the fallback target exists
```
Agents: migration-specialist (opus) drafts → devops-resilience (opus) reviews → Fable accepts. Doc goes under `docs/v4-design/`.

**Re-entry prompt:** `Resume #265: read the rollback plan draft under docs/v4-design, list which steps have dry-run evidence and which do not, then dry-run the missing ones on the emulator harness.`

**Exit test:** every step executed once, timed, evidence attached; `gh issue close 265 --repo Vergo402/paratech-struts`.

---

## #263 User manual (Stage B, parallel with #265)

```bash
python3 .claude/scripts/build-user-manual-docx.py
ls docs/manual-assets/
```
Six steps in `.claude/rules/user-manual.md`. Fold #515 (import docs say xlsx, code is CSV-only) into this rewrite and close it with #263. manual-writer (sonnet) text, qa-driver (sonnet) screenshots via `/run-fieldshore`. Both manuals and screenshots ship in one commit.

**Re-entry prompt:** `Resume #263: diff docs/USER-MANUAL.md against the v4 screens, list sections still describing v3 and screens with no screenshot in docs/manual-assets, then finish them per .claude/rules/user-manual.md.`

**Exit test:** build script exits 0, `.md` and `.docx` in the same commit, you read one chapter cold; `gh issue close 263`.

---

## Gate 2 (parallel-lane part) · Dry-run and docx pass?

**Prompt:** `Gate 2 lane check: show the #265 dry-run evidence, the last build-user-manual-docx.py run, and the #442 decision. Pass or fail each.`

Fail → back to #265, #263 or #442.

---

## Step 4 · Audits + battalion-chief approval

Agents: code-auditor (opus), skeptical-senior-engineer (opus), battalion-chief. Reports to `.claude/audits/phase-j/`. Also:
```bash
/security-review
```
**Re-entry prompt:** `Run the Phase J pre-release audits: code-auditor, skeptical-senior-engineer, battalion-chief. Write each report to .claude/audits/phase-j/ and give me one verdict line per reviewer.`

---

## Gate 3 · All GO?

**Prompt:** `Gate 3: read the three Phase J audit reports, confirm verdicts are GO, confirm board 2 has no open item with a Priority value, and tick the matching boxes on epic #138. Pass or fail.`

Fail → file the findings as issues with Priority set, back to Step 1.

---

## Step 5 · #267 Merge + cutover (Stage C)

Order is fixed: gates → merge → client build live → verify on phone → rules.
Before the merge: the T-0 prerequisites in `docs/v4-design/14-cutover/rollback-plan.md` (#265), including removing the root `index.html` localStorage block on `v4-redesign`.
Everything runs in the clean `fieldshore-main` worktree (main is checked out there, so `git checkout main` fails in `fieldshore/`, and `fieldshore/` may hold uncommitted work that must not ship).
```bash
cd ~/Developer/paratech-struts/fieldshore-main && git fetch origin && git merge --ff-only origin/main
git tag -a v3-legacy-final -m "v3 fallback (#265)" && git push origin refs/tags/v3-legacy-final   # fallback target; no v3-legacy* tag exists yet
git merge --no-ff origin/v4-redesign                  # local only until the gates pass
npm ci && cp ../fieldshore/.env.local .               # .env.local carries the Maps + w3w keys the build bakes in
bash .claude/skills/run-fieldshore/smoke.sh > /tmp/smoke.log 2>&1; echo EXIT:$?
npm run build > /tmp/build.log 2>&1; echo EXIT:$?
npm run test:rules > /tmp/rules.log 2>&1; echo EXIT:$?
git push origin main        # admin bypass of the protect-main ruleset; or merge through a PR
firebase deploy --only hosting --project fieldshore-database     # deploys this dist/; first time live hosting is on (live is disabled today)
# verify on the phone, two cold starts, THEN:
firebase deploy --only database --project fieldshore-database    # rules need receivedAt == now
gh issue close 267 --repo Vergo402/paratech-struts
```
Agents: release-manager (sonnet) mechanics, devops-resilience (opus) rules deploy, Fable runs the gates and makes the go call. Skill: `superpowers:finishing-a-development-branch`.

**Re-entry prompt:** `Resume #267: tell me which of these are done — gates green, merge pushed, hosting live, phone verified, rules deployed — and do the next one only.`

---

## Gate 4 · Live on the phone?

**Prompt:** `Gate 4: qa-driver drives the live v4 URL end to end; I confirm the PWA updated after two cold starts; confirm rules deployed. Pass or fail.`

Fail → Rollback.

---

## Rollback (from #265)

Execute the plan as written. Then:
```bash
gh issue create --repo Vergo402/paratech-struts --title "[Phase J] Cutover rollback: <what failed>" --body "Sub-issue of #138"
# set Priority 1 on the new item, back to Step 1
```
**Prompt:** `Execute the #265 rollback plan now, step by step, with evidence per step. Then open the blocker issue for what failed and set its Priority to 1.`

---

## Step 6 · #268 Tag v4.0.0 (Stage C)

```bash
git tag -a v4.0.0 -m "FieldShore v4.0.0" && git push origin v4.0.0
gh release create v4.0.0 --repo Vergo402/paratech-struts --title "FieldShore v4.0.0" --notes-file RELEASE-NOTES.md
gh issue close 268 --repo Vergo402/paratech-struts
gh issue close 138 --repo Vergo402/paratech-struts
```
Also update: `docs/v4-design/12-parity/v3-feature-parity.md`, `.claude/plans/CONSOLIDATED-STATUS.md`, `.claude/rules/v4-phase-status.md`. Then `/cc:close`.

**Re-entry prompt:** `Resume #268: check whether the v4.0.0 tag and release exist, whether #268 and #138 are closed, and whether the parity matrix, CONSOLIDATED-STATUS and v4-phase-status.md mention v4.0.0. Finish what is missing.`

---

## After v4.0

#512 security hardening (ADR-042) in order P1–P3 → R1–R3 → R4 (3 stages) → R5; #509, #498, #438, #383, #493–#496, and every `[v4.0.x]` / `[v4.1]` item from Step 0.

**Prompt:** `Open the v4.1 track: review the ADR-042 spec, file the #512 sub-issues on board 2, and triage the [v4.0.x] items into a first patch release.`
