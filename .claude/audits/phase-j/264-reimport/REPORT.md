# #264 fresh-start re-import — run report

Date: 2026-10-11 (emulator proof complete; beta run pending) · Scope: v3 hfd217 inventory → v4 CSV import · Operator: Claude (prover) + Alex (importer) · Gate owner: Alex (this report recommends; it does not close #264)

## 1. Scope and environment

| Item | Value |
|---|---|
| App under test | `v4-redesign` @ `6decde3` (no `src/` change in this gate; the tools live under `.claude/audits/phase-j/264-reimport/`) |
| v3 project | `paratech-c3ab4`, read-only (`firebase database:get` only). Source dump: `~/Documents/FieldShore-backups/paratech-c3ab4-2026-10-09.json`, `.departments.hfd217.inventory` (input sha256 `116954357cbbdf64320749b8d3008e860f8d993af9c53739c5d73a5d520ec297`) |
| v4 project | `fieldshore-database`, read-only for Claude (`firebase database:get` only). The one import is Alex's |
| Beta channel URL | pending (from the newest `deploy-v4-beta` run) |
| Emulator | Auth `127.0.0.1:9099`, RTDB `127.0.0.1:9000`, namespace `fieldshore-database-default-rtdb`, app `localhost:5200` (preview `fieldshore-v4-emu`), `npm run emulators` + `npm run dev:emu` |
| Emulator departments | original `5acf033a-001e-46cd-bffd-0fa03baaf142` ("Hartsdale Fire"); redo `8a20b42b-4f60-4590-bcdd-bf18d1288407` ("Hartsdale Fire (redo)", R9) |
| CSV | `hfd217-inventory.csv` (untracked), 1391 bytes, 32 rows, sha256 `62864603ec4d6f5c4f60cbe583f9b253b16eb82607ac99b851bf90b49602d0e5` |
| Rules parity | pending (R0b): `/.settings/rules` on `fieldshore-database` against `database.rules.json` |
| Gates at this report | typecheck 0 · lint 0 · 1949 tests / 171 files green (no `src/` edits) |

## 2. Coverage matrix

| # | Item | Evidence | Result |
|---|---|---|---|
| R1 | v3 live `hfd217` inventory/apparatus/customApparatusTypes == 2026-10-09 dump (minus `_meta`) | `evidence/v3-freshness.txt`: inventory IDENTICAL (32), apparatus IDENTICAL (7), customApparatusTypes IDENTICAL (9) | **PASS** |
| R2 | Converter self-check: 32 rows mapped, 0 flagged, 0 skipped, units 212 = 58/78/76 | `evidence/convert.json`: ok true, lossless true, lines 32, units 212, strut 10/58, extension 12/78, plate 10/76, Eng 169 6/12, Eng 170 5/10, Res 56 21/190, skipped 0, deployedUnits 6 (notes only) | **PASS** |
| R3 | CSV hygiene: 10 exact headers, all ID/Apparatus ID blank, no formula-trigger cell, re-run sha256 identical | `evidence/convert.json` + `evidence/convert-run2.json`: both sha256 `62864603…d0e5`; header row == `CSV_HEADERS`; self-check asserts blank ids and no trigger cells | **PASS** |
| R4 | Emulator: Deputy Chief type + 7 rigs created with types BEFORE import; roster snapshot (7 `app-` ids) + inventory 0 rows | `evidence/emu-roster-before-{apparatus,apparatusTypes,inventory}.json` (7 rigs typed Engine/Engine/Rescue/Ladder/Chief/Deputy Chief/Chief; types [Deputy Chief]; inventory null), `01-emu-rigs-before-import.jpg` | **PASS** |
| R5 | Emulator import: Step 2 auto-maps 10/10; Step 3 shows 32 ready / 0 flagged; result "32 rows imported" | `02-emu-import-step1-file-picked.jpg` (10 columns · 32 rows), `03-…step2-columns-automapped.jpg`, `04-…step3-32-will-import.jpg`, `05-…step4-32-ready.jpg`, `06-emu-import-complete-32-rows.jpg`, `07-emu-inventory-after-import.jpg` (212 on hand · 0 deployed · 32 models; Eng 169 12 · Eng 170 10 · Res 56 190) | **PASS** |
| R6 | Rigs resolved by name, none minted: roster after == before (same ids, types intact incl. Deputy Chief) | `evidence/emu-roster-diff.txt`: apparatus IDENTICAL (same `lastWriteAt` 1791737766432, 7 entries), apparatusTypes IDENTICAL; `emu-compare-rtdb.txt` ROSTER (0) | **PASS** |
| R7 | Dexie `inventory` == v3 (compare.py 0 diffs, 32 keys) | `evidence/emu-dexie-inventory.json`, `evidence/emu-compare-dexie.txt`: lines 32, units 212, rows 32, DIFFS: 0 with `--expect-* --roster` | **PASS** |
| R8 | Emulator RTDB `orgs/<id>/inventory` == Dexie rows (32 live, one shared `lastWriteAt`) + roster/types blobs pushed | `evidence/emu-rtdb-after-inventory.json` (32 live, 212 units, 1 distinct stamp), `evidence/emu-compare-rtdb.txt` DIFFS: 0, `evidence/emu-dexie-vs-rtdb.txt`: 32 vs 32 ids, 0 field differences, stamp 1791739301047 on both sides → IDENTICAL | **PASS** |
| R9 | Recovery rehearsal (revised, see F1): new department + redo → redo department == v3 with roster untouched; original department byte-identical | `evidence/emu-redo-before-*.json`, `emu-redo-after-*.json`, `emu-compare-redo.txt` (DIFFS: 0, 32/212, roster 7 rigs), `emu-redo-isolation.txt` (original inventory IDENTICAL 32 rows; redo roster/types IDENTICAL; distinct org ids), `08-emu-redo-import-complete-32-rows.jpg` | **PASS** |
| R0a | Beta build provenance: `gh run list --workflow deploy-v4-beta.yml -L 1` captured right before Alex imports = HEAD sha, success | `evidence/beta-build.txt` | pending |
| R0b | Rules parity: key-sorted `firebase database:get /.settings/rules --project fieldshore-database` == `database.rules.json` | `evidence/beta-rules-parity.txt` | pending |
| R10 | Beta department FRESH ("Hartsdale Fire", new id): roster 7 rigs w/ types, inventory 0 rows, snapshot before import | `evidence/beta-before-*.json` | pending |
| R11 | Beta import by Alex: his counts + screenshot of the result line | `10-…jpg` (Alex) | pending |
| R12 | Beta RTDB `orgs/<id>/inventory` == v3 (compare.py 0 diffs, 32 keys, 212 units, `--expect-*`, `--roster`) | `evidence/beta-inventory.json`, `evidence/beta-compare.txt` | pending |
| R13 | Beta roster/types unchanged by the import: same set of rig ids and types as R10 (set equality) | `evidence/beta-after-*.json`, `evidence/beta-roster-diff.txt` | pending |
| R14 | Docs/status updated (list in README Stage 6) | commit sha | pending |

## 3. External-dependency probes

Both probes are captured in Stage 5, right before Alex's import. An earlier check does not stand in for them.

| Probe | Command | Evidence | Result |
|---|---|---|---|
| Build provenance (R0a) | `gh run list --workflow deploy-v4-beta.yml -L 1`, captured right before the import; run commit must equal HEAD and must have succeeded | `evidence/beta-build.txt` | pending |
| Rules parity (R0b) | `firebase database:get /.settings/rules --project fieldshore-database`, key-sorted, compared with `database.rules.json` (the emulator loads the same file) | `evidence/beta-rules-parity.txt` | pending |

## 4. Per-probe evidence

Captures are `NN-<step>.jpg` in this folder; data dumps are in `evidence/`. The emulator run was one sitting on 2026-10-11 (16:50–17:30 UTC); the CSV was handed to the import screen's file input through the preview with the on-disk bytes (sha256 verified in-page before the change event).

- **R1**: `evidence/v3-freshness.txt` — three empty diffs against the live v3 project (reads landed in `fixtures/`, not committed).
- **R2/R3**: `evidence/convert.json`, `evidence/convert-run2.json` — identical sha256; terminal logs in the session scratchpad.
- **R4**: `evidence/emu-roster-before-apparatus.json`, `-apparatusTypes.json`, `-inventory.json` (null), `01-emu-rigs-before-import.jpg`.
- **R5**: `02-` … `07-` captures; the complete screen reads "Import complete — 32 rows imported."
- **R6**: `evidence/emu-roster-diff.txt`, `evidence/emu-rtdb-after-apparatus.json`, `-apparatusTypes.json`.
- **R7**: `evidence/emu-dexie-inventory.json` (read from IndexedDB `fieldshore-dept-5acf033a-…`, table `inventory`), `evidence/emu-compare-dexie.txt` / `.json`.
- **R8**: `evidence/emu-rtdb-after-inventory.json`, `evidence/emu-compare-rtdb.txt` / `.json`, `evidence/emu-dexie-vs-rtdb.txt`.
- **R9**: `evidence/emu-redo-before-*.json`, `evidence/emu-redo-after-*.json`, `evidence/emu-compare-redo.txt` / `.json`, `evidence/emu-redo-isolation.txt`, `evidence/emu-rtdb-after-redo-dept1-inventory.json`, `08-emu-redo-import-complete-32-rows.jpg`.
- **R0a–R14**: pending Stage 5/6.

## 5. Findings

| # | Severity | Blocks cutover? | Issue |
|---|---|---|---|
| F1 | Medium | No | **No in-app way to unwind a wrong import.** `Remove <rig>` renders only in the empty-rig branch (`src/ui/inventory/InventoryScreen.tsx`, empty state), and the Inventory screen has no per-line delete; the store's cascade (`apparatusStore.removeApparatus`) is unreachable for a stocked rig. The planned R9 (remove three stocked rigs → tombstones → re-import) could not be performed. Rehearsed and documented recovery = new department + redo. Follow-up: a board sub-issue to decide whether a stocked rig may be removed (with its lines) from the UI, or a per-line delete. |
| F2 | Low | No | **Console noise around the emulator start and the department switch.** The preview tab opened ~8 s before the emulators were listening, producing a burst of `ERR_CONNECTION_REFUSED` and WebSocket failures; creating a department triggered the known full-reload crash path (`removeChild NotFoundError`, main.tsx switch coordinator — memory `project-v4-firebase-naming-and-defer`). Eight HTTP 400 console lines predate the first import and their count did not change across both imports (8 before, 8 after); their URLs were lost from the tab's network buffer. No error was logged during either import; the cloud writes are proven by R8/R9. |
| F3 | Low | No | **`ImportFlow.doImport` has no try/catch and the cloud push swallows failures**, so a failed cloud push would look like success in the UI (map-sourced, `src/ui/inventory/ImportFlow.tsx:237`, `src/data/sync/syncService.ts:509`). Mitigated for this gate by R8/R12 read-only verification. Follow-up filed in §7. |

## 6. Recommendation

Emulator half: **PASS on R1–R9** — the converter is lossless on the real data, the CSV is accepted by the importer's own parser and by the import screen, the 32 rows land in both the browser store and the cloud with one write stamp, no rig is minted, and the recovery path works. The remaining rows (R0a, R0b, R10–R14) are the beta run and belong to Alex plus read-only verification; the recommendation becomes final after them. This report does not close #264; Alex decides the gate.

## 7. Follow-ups

1. F1: no stocked-rig removal / per-line delete in v4 Inventory — decide the doctrine (board sub-issue).
2. F3: `ImportFlow.doImport` has no try/catch and the cloud push swallows failures, so a failed import looks like success. (Also: the "would strand deployed stock" label is shown for re-type skips.)
3. Docs vs code drift: `40-inventory.md` §Excel and `05-setting-up-inventory.md` Path C still describe xlsx + Reference sheet, "unknown value imports with a warning", and an orphan confirm modal; the code is CSV-only, flags, and silently skips orphans.
4. Reconcile the imported 32 lines against the department asset register (`HFD Struts.csv`, 176 rows) — Alex.
5. (Alex) #492 what3words plan; if the beta channel rotates, re-add its host on both API keys.
