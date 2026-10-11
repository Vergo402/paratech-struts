# #264 — v4 fresh start: re-import Alex's inventory (Phase J Stage B)

**Issue:** [Vergo402/paratech-struts#264](https://github.com/Vergo402/paratech-struts/issues/264) · board 2 → In Progress · branch `v4-redesign` @ `6decde3` (== origin, clean, fetched 2026-10-11)
**First build step:** copy this file to `.claude/plans/v4-phase-j-264-reimport.md` (the `~/.claude/plans` folder purges).
**Mockup gate:** not applicable — no app UI changes; every app file stays untouched.

## Context

v4 starts clean. No department other than Alex's own test department (`hfd217`, "Hartsdale Fire", in the v3 project `paratech-c3ab4`) ever used v3, so the old "validate v3 → v4 data migration on a prod fork" gate was re-scoped on 2026-10-09 to: (1) confirm the 2026-10-09 v3 export holds everything Alex wants to keep; (2) re-import his inventory into v4 through the existing CSV import, extending the importer only if the round trip loses data; (3) no translator, no event-log back-fill; a runbook replaces the fork validation.

**Decisions (Alex, 2026-10-11, plan mode):**
- **Source** = the v3 app data: `~/Documents/FieldShore-backups/paratech-c3ab4-2026-10-09.json` → `.departments.hfd217.inventory` (32 lines, 212 pieces: struts 58 / extensions 78 / plates 76, on Eng 169 (6 lines), Eng 170 (5), Res 56 (21)). The asset register `_local-2026-10-09/HFD Struts.csv` is NOT the source; reconciling against it is a follow-up.
- **Keep list** = inventory + the 7 rigs with types: Eng 169, Eng 170 = Engine · Res 56 = Rescue · TL 15 = Ladder · C2171, C2173 = Chief · C2172 = custom **Deputy Chief** (only custom type a rig uses; Battalion Chief / Task Force are not recreated). Members cannot carry over (separate Firebase project; they re-join by invite code). Test op "we", `_backups`, `diagnostics` = archive only.
- **Approach** = one converter script turns the backup JSON into v4's own 10-column CSV and self-validates it with the importer's own code. Importer untouched.
- **Real run** = Alex on the beta channel (`fieldshore-database`), on this Mac, with his real account. Creating a department switches his active department (OQ#31), so no second account is needed. Claude proves the CSV on the local emulators first and verifies the cloud copy read-only afterwards. **Claude never writes to either Firebase project** — CLI reads only.

**Why the round trip is lossless:** every v3 strut model (AT 12-15/19-25/25-36/37-58/56-88, LK 25-36, LS 203/610) is exact in v4 `STRUTS`; all 7 plate ids (channel4x4, channel6x6, hinged12ring, multi, rigid6, swivel12, swivel6) are in `BASE_PLATES`; lengths are integers; systems are AcmeThread/LongShore/LockStroke; rig names carry no stray whitespace; zero duplicate (rig, kind) lines. What has no v4 home is derived or roster state only: `available` (v4 derives quantity − held, ADR-041; v3's 6-unit shortfall is gear deployed in test op "we", so **quantity** is imported), apparatus *type* (no CSV column → rigs created in the app first, matched by exact name), the 4 empty rigs (created by hand), `_meta.lastVerifiedAt` on 2 rows (dropped).

## Established facts (do not re-derive)

- **CSV contract** `src/data/inventory/excel.ts`: `CSV_HEADERS` = ID, Apparatus, Apparatus ID, Type, Model, System, Plate ID, Plate Name, Extension Length (in), Quantity. `toCsv()` (~:106) writes System as Gold/Grey/LockStroke, Plate Name from the catalog, `formulaSafe()` on Apparatus/Model, blank Model for non-struts, the spec sort. `parseCsv()` (~:333) = `parseRecords` + `autoMap` (exact case-insensitive header match) + `validateRows`; `validateRow()` (~:245) requires Type/Apparatus/Quantity, strut Model exact in `STRUTS` (system from the catalog, "catalog wins"), extension digit-only length + System ∈ Gold|LongShore|Grey|Gray|AcmeThread|LockStroke, plate a `BASE_PLATES` id, Quantity digit-only > 0; anything else **flags** the row.
- **Upsert** `src/data/store/inventoryStore.ts:274` `upsertImport()`: blank ID → mints `inv-<id>` every run (**import ONCE, on ONE device**; nothing merges by rig+kind); blank Apparatus ID → resolved by **byte-exact** name against the roster (:283-293), then stock, else a new rig typed 'Other'; non-blank Apparatus ID used as-is, never added to the roster. One Dexie transaction, then best-effort LWW push to `orgs/{dept}/inventory/{id}` + roster blob (`src/data/sync/syncService.ts:509`, swallows failures). `ImportFlow.doImport` (`src/ui/inventory/ImportFlow.tsx:237`) has no try/catch → a cloud failure is silent. Recovery: on the listener's **first** snapshot (app reopen online) local rows newer-or-absent in cloud are re-pushed (`src/data/sync/stateListener.ts:99-103`; roster blob :112-121).
- **Rigs & types**: `AddApparatusModal` (`/inventory`) lists built-ins Chief/Engine/Ladder/Rescue/Squad/Other + custom types; custom types are added at `/settings/apparatus-types` (`src/app/routes/settings/ApparatusTypesPage.tsx:91`, hook `useApparatusTypes.add`). Remove-apparatus cascades its rows and pushes tombstones `{id, deleted:true, lastWriteAt}` (`src/data/store/apparatusStore.ts:91-113`).
- **v3 record shape** `.departments.hfd217.inventory.{pushKey}`: model, quantity, available, type, apparatus (= apparatus PUSH-ID → name via `.departments.hfd217.apparatus[id].name`), system ('' / absent on some plates), length (extensions; 6 push-id plates carry `length: 0`), plateId (a plate's `model` holds a display name). Push-ids start with `-` (spreadsheet formula trigger) → ID and Apparatus ID are left blank.
- **Script convention**: `scripts/gen-rules.ts` runs via `vite-node` with relative imports; `@core/*` alias resolution under vite-node is **unproven** (smoke it first; fallback `npx vite-node --config vitest.config.ts`). `scripts/**` and the audit folder are outside tsconfig/eslint — the run is the check.
- **Repo hygiene**: root `.gitignore` ignores `*.csv` ("real inventory — do not commit"); `.json` under the audit folder is NOT ignored (`git check-ignore` confirmed). The beta workflow `.github/workflows/deploy-v4-beta.yml` deploys **hosting only** (never rules) on every push; `APP_VERSION` is static (`v4.0.0-slice.1`), so build provenance = the workflow run id, not the About page. Rules parity was verified identical today (`firebase database:get /.settings/rules --project fieldshore-database` vs `database.rules.json`). CLI is logged in with both projects.
- **Emulators**: `npm run emulators` (Auth :9099, RTDB :9000) + `npm run dev:emu` (:5200; preview config `fieldshore-v4-emu`). In-memory — do the run in one sitting. REST read: `curl -H 'Authorization: Bearer owner' 'http://127.0.0.1:9000/orgs/<id>/inventory.json?ns=fieldshore-database-default-rtdb'` (pattern: `262-ttx/driver.mjs:141-160`). Dexie names: `fieldshore-dept-<id>` (`inventory` table; `meta` keys `fieldshore_apparatus_roster`, `fieldshore_apparatus_types`), deptId at `fieldshore-global/meta/fieldshore_session`.
- **Gate evidence shape** = `262-ttx/` (README.md runbook "never decides PASS or FAIL"; REPORT.md §1 Scope and environment · §2 Coverage matrix with bold **PASS**/**FAIL** per row · §4 Per-probe evidence · §5 Findings · §6 Recommendation · §7 Follow-ups). Alex closes the gate.

## Deliverables (all under `.claude/audits/phase-j/264-reimport/`)

| File | Role |
|---|---|
| `convert.ts` | One file (like 262's `driver.mjs`). `npx vite-node .claude/audits/phase-j/264-reimport/convert.ts <backup.json> [--dept hfd217] [--out hfd217-inventory.csv]`. Accepts both root shapes (full dump `.departments.<id>` or a live `database:get` sub-tree). Maps each v3 record → `InventoryItem` (`id:''`, `apparatusId:''`, apparatus = resolved name, strut → model + catalog system, extension → system + length, plate → plateId only) → the **real** `toCsv()`. Pre-sorts by rig/type/model/system/length/plateId/v3-key so a re-run is byte-identical. Self-check with the **real** `parseCsv()`: 0 warnings, row count == mapped count, Σquantity equal, every ID/Apparatus ID blank, no cell starts with `-`. **Refuses (exit 1, writes no CSV) on any flagged row; informational notes (v3 system ≠ catalog, `available` < quantity = "n units deployed") never refuse.** Skips with a reason (zero quantity, unknown apparatus id, unknown type) are counted so 32 reconciles. Prints counts (lines/units, per type, per rig quoted) + sha256; writes the same to `evidence/convert.json`. |
| `compare.py` | `python3 -I compare.py --v3 <dump-or-live.json> [--dept hfd217] --v4 <rest-or-dexie.json>` → **type-aware** join key (strut = rig|model; extension = rig|system|length; plate = rig|plateId; never `//` on length — jq treats 0 as truthy) → quantity; strips v3 `_meta`/`available`/plate `system`/`model`, v4 tombstones. Prints missing / extra / quantity-diff lists and totals (lines, units, per type); exit 1 on any diff. |
| `README.md` | Runbook in the 262 shape: roles (Claude = read-only prover; Alex = importer + gate owner), Run it, What it produces, Order of play (§ below), Checks, Read-only fence (`database:get` only, both projects), the regenerate command + expected sha256. |
| `REPORT.md` | §1–§7 as 262; matrix rows R0a–R14 below. |
| `evidence/*.json`, `evidence/v3-freshness.txt`, `NN-<step>.jpg` | Committed. **No PII**: the v3 live reads fetch only `/inventory`, `/apparatus`, `/customApparatusTypes` sub-paths and land in `fixtures/` (folder `.gitignore`: `fixtures/`, `*.csv`); only the diff result is committed. |
| `hfd217-inventory.csv` | **Untracked** (root `*.csv`); evidence = `convert.json` counts + sha256 + the regenerate command. |
| `fixtures/accounts.json` | Emulator test credentials (ignored). Test credentials only ever go into `localhost:5200`. |

No vitest test, no `vitest.config.ts` / `package.json` edits (skeptic cut): the real data is fully enumerable and the self-check runs the importer's own parser over the script's own output.

## Coverage matrix (REPORT.md §2; each row bold PASS/FAIL with evidence)

| # | Item | Evidence |
|---|---|---|
| R1 | v3 live `hfd217` inventory/apparatus/customApparatusTypes == 2026-10-09 dump (minus `_meta`) | `evidence/v3-freshness.txt` (empty diff) |
| R2 | Converter self-check: 32 rows mapped, 0 flagged, 0 skipped, units 212 = 58/78/76 | `evidence/convert.json` |
| R3 | CSV hygiene: 10 exact headers, all ID/Apparatus ID blank, no `-`-leading cell, re-run sha256 identical | `convert.json` ×2 |
| R4 | Emulator: Deputy Chief type + 7 rigs created with types BEFORE import; roster snapshot (7 `app-` ids) + inventory 0 rows | `evidence/emu-roster-before.json`, `01-…jpg` |
| R5 | Emulator import: Step 2 auto-maps 10/10; Step 3 shows 32 ready / 0 flagged; result "32 rows imported · 0 skipped" | `02-…04-…jpg` |
| R6 | Rigs resolved by name, none minted: roster after == before (same ids, types intact incl. Deputy Chief) | `evidence/emu-roster-after.json` |
| R7 | Dexie `inventory` == v3 (compare.py 0 diffs, 32 keys) | `evidence/emu-dexie-inventory.json`, `emu-compare-dexie.txt` |
| R8 | Emulator RTDB `orgs/<id>/inventory` == Dexie rows (32 live, one shared `lastWriteAt`) + roster/types blobs pushed | `evidence/emu-rtdb-*.json` |
| R9 | Recovery rehearsal (**revised during Stage 3**: the app offers Remove apparatus only on an EMPTY rig and has no per-line delete, so the planned cascade path does not exist in the UI): new department + redo → the redo department matches v3 with 0 diffs and an untouched roster, and the original department's rows are byte-identical before/after | `evidence/emu-redo-*.json`, `emu-compare-redo.txt`, `emu-redo-isolation.txt` |
| R0a | Beta build provenance: `gh run list --workflow deploy-v4-beta.yml -L 1` captured right before Alex imports = HEAD sha, success | `evidence/beta-build.txt` |
| R0b | Rules parity: key-sorted `database:get /.settings/rules --project fieldshore-database` == `database.rules.json` (the emulator loads the same file) | `evidence/beta-rules-parity.txt` |
| R10 | Beta department is FRESH ("Hartsdale Fire", new id): roster 7 rigs w/ types, inventory 0 rows, snapshot before import | `evidence/beta-before.json` |
| R11 | Beta import by Alex: his counts + a screenshot of the result line | `10-…jpg` (Alex) |
| R12 | Beta RTDB `orgs/<id>/inventory` == v3 (compare.py 0 diffs, 32 keys, 212 units) | `evidence/beta-inventory.json`, `beta-compare.txt` |
| R13 | Beta roster/types unchanged by the import (7 rigs, Deputy Chief present) | `evidence/beta-after-roster.json` |
| R14 | Docs/status updated (list in Stage 6) | commit sha |

## Order of play

**Stage 0 — read-only pre-checks (Fable).** (a) Smoke `npx vite-node` on a 3-line file importing `toCsv` from `../../../../src/data/inventory/excel` (alias path proven or fallback chosen). (b) R1 freshness: `firebase database:get /departments/hfd217/inventory --project paratech-c3ab4 > fixtures/v3-live-inventory.json` (+ `/apparatus`, `/customApparatusTypes`); `diff` against the same sub-trees `jq -S`'d out of the dump with `_meta` stripped. If they differ, the live files become the converter input and the report says so.

**Stage 1 — build the tools (delegated, parallel; shared tree, agents get "no git commands").** convert.ts · compare.py · README/REPORT skeleton. Then the skeptic reviews the two scripts read-only; Fable reviews every diff (`git diff`), not self-reports.

**Stage 2 — convert (Fable).** Run on the real backup → `hfd217-inventory.csv` + `evidence/convert.json`; confirm 32/212/58/78/76, 3 rigs, "6 units deployed" note; run twice → same sha256 (R2, R3).

**Stage 3 — emulator proof (Fable, one sitting, ≈1.5 h).** `npm run emulators` + `preview_start fieldshore-v4-emu`. `/auth` Create Account (`*.test` email) → Create department "Hartsdale Fire" → `/settings/apparatus-types` add "Deputy Chief" → `/inventory` Add apparatus ×7 with types → snapshot roster (R4) → Import → file → Step 2 → Step 3 → commit (R5) → roster after (R6) → Dexie via `javascript_tool` + REST via curl → compare.py (R7, R8) → rollback rehearsal (R9). Captures via `browser_batch` (resize + screenshot in one batch), copied into the folder.

**Stage 4 — gates + commit 1 (at Alex's go; commit implies push).** `npm run typecheck`, `npm run lint`, `npm test` (bare, output to file, `echo EXIT:$?`) — expected unchanged (1949 tests; no `src/` edits). Commit `chore(v4-264): v3→v4 inventory converter, compare tool, runbook + emulator proof`. The push redeploys the beta (hosting only).

**Stage 5 — real run (Alex ≈15 min + Fable reads).** Fable: R0a run id for HEAD, R0b rules parity, `firebase database:get /orgs --shallow --project fieldshore-database` to list org ids (read-only). Alex on this Mac, beta URL from the latest workflow run, signed in, online, no active op: Create department "Hartsdale Fire" (switches his active dept) → add Deputy Chief → add the 7 rigs with types → tell Fable. Fable: R10 snapshot. Alex: `/inventory` → Import → pick `.claude/audits/phase-j/264-reimport/hfd217-inventory.csv` → Step 2 (10/10 mapped) → Step 3 (32 ready, 0 flagged) → Import — **once, one device** → screenshot the result line (R11). Fable: R12/R13 reads + compare.py. **If fewer than 32 rows in the cloud:** rows are durable in Dexie; Alex force-closes and reopens the PWA online (first-snapshot re-push), re-read after 10 s; still short → check his role has `manageInventory` and the deployed rules. **If it landed wrong:** the app cannot unwind it in place (Remove apparatus renders only on an empty rig, `src/ui/inventory/InventoryScreen.tsx` empty-state branch; no per-line delete) → create a new department, redo type + rigs + the one import (the rehearsed R9 path); the old department stays behind unused. Claude never runs `database:remove`/`set` on either project.

**Stage 6 — report + docs + commit 2 (at Alex's go).** REPORT.md final (§5 findings, §6 recommendation). Docs (haiku, **claim ledger**): `CLAUDE.md` phase-status paragraph (~:392; replace "#264 (migration validation)" wording, record the pass + evidence path, NEXT → #265, #263); `docs/v4-design/00-INDEX.md:32` row J; `.claude/skills/plan-v4-phase-j/SKILL.md:77` ("Validate v3 → v4 data migration on prod fork" → re-import gate, done); `docs/v4-design/12-parity/v3-feature-parity.md:70` one-line note (v3 → v4 carry-over = converter + CSV import, no translator); memory `project-phase-j-stage-b.md`. Essays 09/10 untouched (historical). Commit `docs(v4-264): fresh-start re-import gate report + status`. Alex comments the report path on #264 and closes it (v4 issues close manually).

## Delegation table

| Piece | Model | Effort | Why |
|---|---|---|---|
| `convert.ts` (map → real `toCsv`, self-check via real `parseCsv`, refuse/skip/note semantics, counts + sha256) | sonnet | medium | catalog-wins / refuse logic and reuse of `excel.ts` helpers need care; not mechanical |
| `compare.py` (type-aware key, v3 dump/live + v4 REST/Dexie shapes, diff + totals) | sonnet | medium | the join key is where false diffs hide (plate `length: 0`) |
| `README.md` + `REPORT.md` skeletons in the 262 shape, rows R0a–R14 blank | haiku | low | mechanical copy of a known structure |
| Adversarial read-only review of `convert.ts` + `compare.py` | skeptical-senior-engineer (opus) | high | the gate's evidence tools must not be wrong; counterweight to self-reports |
| vite-node smoke, real conversion, emulator run, Dexie/REST evidence, rollback rehearsal, all diff reviews | Fable — not delegated | — | verification + Alex's data; standing rule |
| v3 freshness read, beta pre-checks (run id, rules parity, fresh-dept snapshot), post-verify reads | Fable — not delegated | — | credentials-adjacent reads on both Firebase projects |
| Stage 6 doc/status edits | haiku | low | mechanical; every factual sentence paired with `file:line` or command output in a claim ledger |
| Beta department + rigs + the one import; #264 comment + close | Alex | ≈15 min | gate owner; real account |

## Verification (how "done" is proven)

- Every row R1–R14 has a file or capture in the folder; counts come from `compare.py` / `jq` output, never from reading a screen.
- The emulator exercises the identical path the beta runs (`ImportFlow` → `upsertImport` → `syncService.setState`) on the same rules file; R0a/R0b make that a recorded fact, not an assumption.
- Real-UI driving per the project standard: the import is clicked through the preview on :5200, not simulated.
- Gates unchanged (no `src/` edits): typecheck 0, lint 0, tests 1949 green, run bare with `EXIT:$?`.

## Follow-ups to file as board sub-issues (not this gate)

1. `ImportFlow.doImport` has no try/catch and the cloud push swallows failures → a failed import looks like success. (Also: the "would strand deployed stock" label is shown for re-type skips.)
2. Docs vs code drift: `40-inventory.md` §Excel and `05-setting-up-inventory.md` Path C still describe xlsx + Reference sheet, "unknown value imports with a warning", and an orphan confirm modal; code is CSV-only, flags, and silently skips orphans.
3. Reconcile the imported 32 lines against the department asset register (`HFD Struts.csv`, 176 rows) — Alex.
4. (Alex) #492 what3words plan; if the beta channel rotates, re-add its host on both API keys.
