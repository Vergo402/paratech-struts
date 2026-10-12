# #264 fresh-start re-import — runbook (v3 hfd217 → v4 CSV import)

The tools never decide PASS or FAIL. `convert.ts` and `compare.py` only report counts, diffs and exit codes. That call belongs to the main loop, and the gate belongs to Alex. The approved plan is `.claude/plans/v4-phase-j-264-reimport.md`; this runbook follows its Order of play.

What this does: turns Alex's v3 `hfd217` inventory (the 2026-10-09 backup) into v4's own 10-column CSV, proves that CSV on the local emulators, then checks the one real import on the beta against the v3 source.

## Roles

| Role | Who | Does |
|---|---|---|
| Claude (read-only prover) | Claude, as the main loop | Converts the backup, runs the emulator proof, runs every `firebase database:get` read, runs `compare.py`, writes the evidence. Never writes to either Firebase project. |
| Alex (importer + gate owner) | Alex, on this Mac, signed in on the beta | Creates the beta department "Hartsdale Fire", adds the Deputy Chief type and the 7 rigs, performs the ONE import, takes the result screenshot. Owns the gate and closes #264. |

## Run it

From the repo root:

```bash
# Two terminals: the emulators, then the app in emulator mode
npm run emulators      # Auth :9099 + Realtime Database :9000
npm run dev:emu        # the app on http://localhost:5200 (preview config fieldshore-v4-emu)

# Convert the v3 backup to the v4 CSV. On any importer-flagged row it exits 1, writes no CSV,
# moves an older CSV at --out to <out>.refused, and writes an ok:false summary.
npx vite-node .claude/audits/phase-j/264-reimport/convert.ts ~/Documents/FieldShore-backups/paratech-c3ab4-2026-10-09.json --dept hfd217
#   defaults: --out <this folder>/hfd217-inventory.csv  --summary <this folder>/evidence/convert.json
#   second run for R3: add --summary .claude/audits/phase-j/264-reimport/evidence/convert-run2.json

# Compare v3 with a v4 copy (type-aware join; exits 1 on any diff). The gate runs it with the
# expected totals and the pre-import roster so a minted rig or a double import cannot pass.
python3 -I .claude/audits/phase-j/264-reimport/compare.py --v3 ~/Documents/FieldShore-backups/paratech-c3ab4-2026-10-09.json --dept hfd217 \
  --v4 <rest-or-dexie.json> --expect-lines 32 --expect-units 212 --expect-rows 32 --roster <roster-before.json> --json <out.json>
```

Stage 0 proved that `vite-node` resolves the `@core` aliases from this folder (`SMOKE OK 10 14 25`); no fallback config is needed.

The emulators are in memory. Do the emulator run in one sitting.

## What it produces

| File | Role | Committed? |
|---|---|---|
| `convert.ts` | Maps each v3 record to an inventory item (apparatus = resolved rig name; strut → model + catalog system; extension → system + length; plate → plate id), writes the CSV through the app's own `toCsv()`, self-checks it with the app's own `parseCsv()`, prints counts and the sha256, and writes `evidence/convert.json` (with `lossless: true` only when nothing but zero-quantity lines was skipped). Accepts a full dump, a department node, or a bare inventory map plus `--apparatus`. A refusal moves an older CSV at `--out` to `<out>.refused` and writes an `ok:false` summary. | Yes |
| `compare.py` | Type-aware diff of v3 against a v4 copy (REST map or Dexie array). Prints missing, extra and quantity-diff lists plus totals; `--expect-lines/-units/-rows` and `--roster` (every v4 row must sit on a pre-existing rig with the same name) are extra diffs; an empty v3 side is a diff unless `--allow-empty`. Paths print `~`-relative. Exits 1 on any diff, 2 on usage. | Yes |
| `README.md`, `REPORT.md` | This runbook and the gate report. | Yes |
| `evidence/*.json`, `evidence/v3-freshness.txt` | Convert counts, emulator snapshots and rollback rehearsal, beta snapshots, and the R1 freshness diff. No PII: the v3 live reads stay in `fixtures/`; only the diff result is committed. | Yes |
| `NN-<step>.jpg` | Screenshots in run order. Alex's result-line screenshot starts with `10-`. | Yes |
| `hfd217-inventory.csv` | The v4 import file with v3's rig names (Eng 169 / Eng 170 / Res 56) — the emulator-proven artifact. The root `*.csv` ignore rule keeps it out of git; `evidence/convert.json` records its counts and sha256. | No (ignored) |
| `hfd217-inventory-hfdnames.csv` | The same 32 lines with the department's own rig names (E169 / E170 / R56), produced with `--apparatus fixtures/v3-apparatus-hfdnames.json` (a copy of the v3 apparatus map with the names changed). This is the file Alex imported on the beta; `evidence/convert-hfdnames.json` records its counts and sha256. | No (ignored) |
| `fixtures/` | The v3 live reads (`/inventory`, `/apparatus`, `/customApparatusTypes`), `accounts.json` (emulator test credentials) and the emulator department ids. Folder `.gitignore` covers `fixtures/`, `*.csv` and `*.csv.refused`. | No (ignored) |

## Order of play

**Stage 0 — read-only pre-checks (Claude).**
- Smoke `npx vite-node` on a throwaway three-line file that imports `toCsv` from `src/data/inventory/excel` (not committed). Choose the alias or the fallback command from Run it.
- R1 freshness: `firebase database:get /departments/hfd217/inventory --project paratech-c3ab4 > fixtures/v3-live-inventory.json`, plus `/apparatus` and `/customApparatusTypes`. Diff those against the same sub-trees from the dump, with `_meta` stripped and `jq -S` applied to both sides. If they differ, the live files become the converter input and REPORT §5 says so.

**Stage 1 — build the tools (before any run).** `convert.ts` and `compare.py` are built, with this runbook and REPORT drafted alongside. Both scripts then get a read-only adversarial review, and the main loop reviews every diff rather than trusting a worker's self-report.

**Stage 2 — convert (Claude).** Run `convert.ts` on the real backup. Expect 32 lines, 212 units (58 struts / 78 extensions / 76 plates), 3 rigs with lines (Eng 169, Eng 170, Res 56), and the informational "6 units deployed" note. Run it a second time: the sha256 must match the first run. (R2, R3)

**Stage 3 — emulator proof (Claude, one sitting, about 1.5 hours).**
1. On `localhost:5200`, create an account with a `*.test` email, then create the department "Hartsdale Fire".
2. At `/settings/apparatus-types`, add the custom type "Deputy Chief".
3. At `/inventory`, add the 7 rigs with their types (list in Checks). Snapshot the roster. (R4)
4. Import `hfd217-inventory.csv`: file → Step 2 (10 of 10 columns mapped) → Step 3 (32 ready, 0 flagged) → commit. Expect "32 rows imported · 0 skipped". (R5)
5. Snapshot the roster again; it must match the before-snapshot by id and type, with no new rigs. (R6)
6. Read the Dexie `inventory` table in the browser (javascript_tool) and the RTDB `orgs/<id>/inventory` over REST, then run `compare.py` on each. (R7, R8)
7. Recovery rehearsal (R9): the app only offers **Remove apparatus on an empty rig** and has no per-line delete, so a wrong import cannot be unwound in place. The realistic recovery for a fresh start is a **new department and a redo**: create a second department, add the Deputy Chief type and the 7 rigs again, import the same CSV once, then prove (a) the redo department matches v3 with 0 diffs and its roster is untouched, and (b) the original department's rows are byte-identical before and after (separate cloud buckets). Counts come from the script, not from reading a screen.

Captures are taken with `browser_batch` (resize plus screenshot in one batch) and copied into this folder as `NN-<step>.jpg`.

**Stage 4 — gates and commit 1 (at Alex's go; a commit is pushed in the same step).** Run `npm run typecheck`, `npm run lint` and `npm test`, each bare, with its output sent to a scratch file, then `echo EXIT:$?`. Expect typecheck 0, lint 0, and 1949 tests green, since no `src/` file changes. Commit `chore(v4-264): v3→v4 inventory converter, compare tool, runbook + emulator proof`. The push redeploys the beta (hosting only).

**Stage 5 — the real run (Alex about 15 minutes; Claude reads before and after).**

Before Alex starts, Claude captures:
- R0a: `gh run list --workflow deploy-v4-beta.yml -L 1`, right before the import. The run's commit must equal HEAD and must have succeeded.
- R0b: `firebase database:get /.settings/rules --project fieldshore-database`, key-sorted, compared with `database.rules.json`.
- `firebase database:get /orgs --shallow --project fieldshore-database`, to list the org ids.

Then Alex follows the checklist below. Claude takes the before-snapshot (R10) once the department and rigs exist, and before the import starts.

**Alex's checklist (on this Mac):**
1. Open the beta address from the newest `deploy-v4-beta` run (Claude can read it for you). Sign in, and make sure you are online.
2. Make sure no shoring operation is active.
3. Create a department named **Hartsdale Fire**. If you are already inside a department (the account `avergo@hartsdalefire.org` belongs to "Beta Department 1" from the June beta), Settings › Department shows no Create button; open the create screen by address instead: `<beta URL>/create-department`. Creating makes the new department your active one; the old one stays behind untouched.
4. Go to Settings → Apparatus types and add a custom type named **Deputy Chief**.
5. Go to Inventory and add your apparatus with their types. The three rigs that carry the imported stock must exist by name; everything else is your call. In the real run Alex built his actual roster (E169, E170, E171, TL15, R56, C2171, C2172, U-156, U-160) instead of v3's test names.
   The import matches rig names byte for byte. A name that is not on the roster quietly creates an extra rig typed "Other" — so if your rig names differ from v3's (Eng 169 / Eng 170 / Res 56), tell Claude the names and Claude regenerates the CSV with them (`--apparatus` override, no code change; the self-check runs again).
6. Tell Claude "rigs are in", and wait for Claude to confirm the before-snapshot (and the regenerated CSV, if names differ).
7. Go to Inventory → Import and pick the file Claude names (the real run used `.claude/audits/phase-j/264-reimport/hfd217-inventory-hfdnames.csv`).
8. Step 2 should show 10 of 10 columns mapped.
9. Step 3 should show 32 rows ready and 0 flagged.
10. Press Import. **Do this once, on this one device.** Do not run it again, and do not run it on another phone. Each run gives every line a new ID, so a second run doubles the inventory.
11. Screenshot the result line (expected: 32 rows imported, 0 skipped) and save the screenshot in this folder with a name starting `10-`.
12. Tell Claude "imported". Claude reads the cloud copy and runs the comparison.

**If fewer than 32 rows reach the cloud:**
- Your rows are still saved on this Mac. Force-close the app, reopen it while online, wait 10 seconds, and tell Claude. Claude re-reads the cloud copy.
- Do not import again.
- If it is still short, check that your role on the department includes permission to manage inventory (`manageInventory`), and tell Claude. Claude will then check the deployed rules.

**If it landed wrong** (wrong rig names, wrong counts, or stray rigs):
- The app cannot unwind it in place: Remove apparatus only appears on an empty rig, and there is no per-line delete (the ± stepper can only walk a count down one unit at a time).
- Create a new department (this switches your active department), add the Deputy Chief type and the 7 rigs again, and import the CSV once. That is the rehearsed path (R9); the old department stays behind in the cloud, unused.
- Tell Claude which department is the keeper; the report records both ids.

**Stage 6 — report, docs and commit 2 (at Alex's go).** Finalize REPORT.md (§5 findings, §6 recommendation). Update the docs, with each factual sentence paired with a `file:line` or a command output (claim ledger):
- `CLAUDE.md` phase-status paragraph (around line 392): replace the "#264 (migration validation)" wording, record the pass with its evidence path, and set NEXT to #265 and #263.
- `docs/v4-design/00-INDEX.md`, row J (line 32).
- `.claude/skills/plan-v4-phase-j/SKILL.md` (line 77): replace "Validate v3 → v4 data migration on prod fork" with the re-import gate, marked done.
- `docs/v4-design/12-parity/v3-feature-parity.md` (line 70): a one-line note that the v3 → v4 carry-over is the converter plus the CSV import, with no translator.
- The memory file `project-phase-j-stage-b.md`.

Essays 09 and 10 stay untouched; they are historical. Commit `docs(v4-264): fresh-start re-import gate report + status`. Alex comments the report path on #264 and closes it (v4 issues are closed by hand).

## Checks

**Type-aware join key (`compare.py`).**
- Strut = `rig|model`; extension = `rig|system|length`; plate = `rig|plateId`. Each key carries its quantity.
- Never use `//` on length: jq treats 0 as truthy, and six v3 plates carry `length: 0`.
- Stripped before comparing: v3 `_meta`, `available`, a plate's `system` and `model`. v4 tombstones are dropped.
- Exits 1 on any missing, extra or quantity-diff line.

**Converter self-check (`convert.ts`, through the app's own `parseCsv`).**
- 0 warnings; the row count equals the mapped count; the sum of quantities equals the source; every ID and Apparatus ID cell is blank; no cell starts with a spreadsheet formula trigger (`=`, `+`, `-`, `@`, tab).
- Any flagged row → exit 1, no CSV is written, an older CSV at `--out` is moved to `<out>.refused`, and the summary is rewritten with `ok: false`.
- Skips (zero quantity, unknown apparatus id, unknown type, bad quantity) are counted, so the totals reconcile. Any skip other than zero-quantity sets `lossless: false` and prints a WARNING line; the exit code stays 0 because `compare.py` is the gate for losses.
- A rig name that is not plain single-spaced ASCII gets a note (the importer matches names byte for byte).
- Notes never refuse: a v3 system that differs from the catalog, and `available` below quantity (reported as "n units deployed").
- The "6 units deployed" note is expected. It is the 6-unit gap between v3's `available` and `quantity` (gear out in test op "we"). Quantity is imported, so it is not a fault.

**Expected totals** (source: `.departments.hfd217.inventory` in the 2026-10-09 dump):
- 32 lines; 212 units = struts 58 · extensions 78 · plates 76.
- Lines per rig: Eng 169 = 6, Eng 170 = 5, Res 56 = 21 (6-5-21). These are lines, not units.
- The keep list is 7 rigs: Eng 169 (Engine), Eng 170 (Engine), Res 56 (Rescue), TL 15 (Ladder), C2171 (Chief), C2173 (Chief), C2172 (custom Deputy Chief). TL 15, C2171, C2172 and C2173 have no lines and are created empty by hand.

**Emulator and beta.**
- Dexie `inventory` equals v3 (32 keys).
- RTDB `orgs/<id>/inventory` equals the Dexie rows (32 live, one shared `lastWriteAt`). The roster and types blobs are pushed.
- The beta roster and types are unchanged by the import: the same set of rig ids and types as the before-snapshot (R10), checked as set equality, not as a count.
- The recovery rehearsal ends with a redo department at 32 live rows / 212 units / 0 diffs and the original department byte-identical.
- The emulator and the beta run the same path (`ImportFlow` → `upsertImport` → sync) against the same rules file. R0a and R0b record that as fact.
- Every count comes from `compare.py` or `jq` output, never from reading a screen.

## Read-only fence

- Claude runs only read commands against Firebase: `firebase database:get` on `paratech-c3ab4` (v3) and on `fieldshore-database` (v4). Claude never runs `set`, `remove`, `update` or `push` on either project.
- Other reads Claude runs: `gh run list --workflow deploy-v4-beta.yml -L 1` (R0a), and GET requests to the emulator REST endpoint.
- The emulator is the only place Claude writes: through the app on `localhost:5200`, which runs on the in-memory emulator.
- The one real import on the beta, and the beta department and rigs that come before it, are Alex's alone.
- Test credentials go only into `localhost:5200`. `fixtures/accounts.json` is gitignored.

## Regenerate

```bash
npx vite-node .claude/audits/phase-j/264-reimport/convert.ts ~/Documents/FieldShore-backups/paratech-c3ab4-2026-10-09.json --dept hfd217
```

The sha256 is printed and written to `evidence/convert.json`.

expected sha256: `62864603ec4d6f5c4f60cbe583f9b253b16eb82607ac99b851bf90b49602d0e5` (1391 bytes, 32 rows; recorded at Stage 2 on 2026-10-11 from input sha256 `116954357cbbdf64320749b8d3008e860f8d993af9c53739c5d73a5d520ec297`; two consecutive runs matched — `evidence/convert.json` and `evidence/convert-run2.json`)
