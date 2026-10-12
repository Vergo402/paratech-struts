# #264 fresh-start re-import — run report

Date: 2026-10-11 · Scope: v3 hfd217 inventory → v4 CSV import · Operator: Claude (prover) + Alex (importer) · Gate owner: Alex (this report recommends; it does not close #264)

## 1. Scope and environment

| Item | Value |
|---|---|
| App under test | `v4-redesign` @ `01197c4` (tools commit; no `src/` change in this gate — the tools live under `.claude/audits/phase-j/264-reimport/`) |
| v3 project | `paratech-c3ab4`, read-only (`firebase database:get` only). Source dump: `~/Documents/FieldShore-backups/paratech-c3ab4-2026-10-09.json`, `.departments.hfd217.inventory` (input sha256 `116954357cbbdf64320749b8d3008e860f8d993af9c53739c5d73a5d520ec297`) |
| v4 project | `fieldshore-database`, read-only for Claude (`firebase database:get` only). The one import was Alex's |
| Beta channel | `https://fieldshore-database--beta-2rs8x80s.web.app`, run 38179192836 success 2026-10-11T22:10:59Z for `01197c4` (R0a) |
| Emulator | Auth `127.0.0.1:9099`, RTDB `127.0.0.1:9000`, namespace `fieldshore-database-default-rtdb`, app `localhost:5200` (preview `fieldshore-v4-emu`) |
| Emulator departments | original `5acf033a-001e-46cd-bffd-0fa03baaf142` ("Hartsdale Fire"); redo `8a20b42b-4f60-4590-bcdd-bf18d1288407` ("Hartsdale Fire (redo)", R9) |
| Beta department | `37142f9d-afa2-4b01-a57f-1e8ff2638a57` **"Hartsdale Fire Department"**, created by Alex 2026-10-11 (`createdAt` 1791768964003) under `avergo@hartsdalefire.org`; his June department "Beta Department 1" (`52334f3d…`) left untouched |
| CSVs | `hfd217-inventory.csv` (v3 rig names, emulator-proven; 1391 bytes, sha256 `62864603ec4d6f5c4f60cbe583f9b253b16eb82607ac99b851bf90b49602d0e5`) · `hfd217-inventory-hfdnames.csv` (department rig names E169/E170/R56 via `--apparatus fixtures/v3-apparatus-hfdnames.json`, imported on the beta; 1295 bytes, sha256 `59c3720a9189a96de519d82fa93dba396556cf1af189ae8344956df8750a19e7`, `evidence/convert-hfdnames.json`). Both untracked (`*.csv`) |
| Rules parity | IDENTICAL (R0b): deployed `/.settings/rules` == `database.rules.json` key-sorted, sha256 `d04d1dcb582d7c7b…`, last touched `3005e74` 2026-10-10; the emulator loads the same file |
| Gates at this report | typecheck 0 · lint 0 · 1949 tests / 171 files green (no `src/` edits) |

## 2. Coverage matrix

| # | Item | Evidence | Result |
|---|---|---|---|
| R1 | v3 live `hfd217` inventory/apparatus/customApparatusTypes == 2026-10-09 dump (minus `_meta`) | `evidence/v3-freshness.txt`: inventory IDENTICAL (32), apparatus IDENTICAL (7), customApparatusTypes IDENTICAL (9) | **PASS** |
| R2 | Converter self-check: 32 rows mapped, 0 flagged, 0 skipped, units 212 = 58/78/76 | `evidence/convert.json`: ok true, lossless true, lines 32, units 212, strut 10/58, extension 12/78, plate 10/76, Eng 169 6/12, Eng 170 5/10, Res 56 21/190, skipped 0, deployedUnits 6 (notes only). Same counts with the department names: `evidence/convert-hfdnames.json` | **PASS** |
| R3 | CSV hygiene: 10 exact headers, all ID/Apparatus ID blank, no formula-trigger cell, re-run sha256 identical | `evidence/convert.json` + `evidence/convert-run2.json`: both sha256 `62864603…d0e5`; header row == `CSV_HEADERS`; the self-check asserts blank ids and no trigger cells | **PASS** |
| R4 | Emulator: Deputy Chief type + 7 rigs created with types BEFORE import; roster snapshot (7 `app-` ids) + inventory 0 rows | `evidence/emu-roster-before-{apparatus,apparatusTypes,inventory}.json`, `01-emu-rigs-before-import.jpg` | **PASS** |
| R5 | Emulator import: Step 2 auto-maps 10/10; Step 3 shows 32 ready / 0 flagged; result "32 rows imported" | `02-` … `07-` captures (212 on hand · 0 deployed · 32 models; Eng 169 12 · Eng 170 10 · Res 56 190) | **PASS** |
| R6 | Rigs resolved by name, none minted: roster after == before (same ids, types intact incl. Deputy Chief) | `evidence/emu-roster-diff.txt`: apparatus IDENTICAL (same `lastWriteAt`, 7 entries), apparatusTypes IDENTICAL; `emu-compare-rtdb.txt` ROSTER (0) | **PASS** |
| R7 | Dexie `inventory` == v3 (compare.py 0 diffs, 32 keys) | `evidence/emu-dexie-inventory.json`, `evidence/emu-compare-dexie.txt`: 32 / 212 / 32, DIFFS: 0 with `--expect-* --roster` | **PASS** |
| R8 | Emulator RTDB == Dexie rows (32 live, one shared `lastWriteAt`) + roster/types blobs pushed | `evidence/emu-rtdb-after-inventory.json` (32 live, 212, 1 stamp), `emu-compare-rtdb.txt` DIFFS: 0, `emu-dexie-vs-rtdb.txt`: 32 vs 32 ids, 0 field differences, one stamp both sides → IDENTICAL | **PASS** |
| R9 | Recovery rehearsal (revised, see F1): new department + redo → redo department == v3 with roster untouched; original department byte-identical | `evidence/emu-redo-*.json`, `emu-compare-redo.txt` (DIFFS: 0, 32/212, roster 7 rigs), `emu-redo-isolation.txt` (original IDENTICAL 32 rows; redo roster/types IDENTICAL; distinct org ids), `08-emu-redo-import-complete-32-rows.jpg` | **PASS** |
| R0a | Beta build provenance captured before the import = HEAD, success | `evidence/beta-build.txt`: run 38179192836 completed/success 2026-10-11T22:10:59Z, sha `01197c46…` == HEAD, channel HTTP 200 | **PASS** |
| R0b | Rules parity: deployed rules == `database.rules.json` | `evidence/beta-rules-parity.txt`: IDENTICAL, captured 2026-10-11T23:27Z before the import | **PASS** |
| R10 | Beta department FRESH (new id), roster with types, inventory 0 rows, snapshot before import | `evidence/beta-before-{apparatus,apparatusTypes,inventory}.json`: new org `37142f9d…` (not in the 2026-10-09 export's seven), 9 rigs — C2171 Chief · C2172 Deputy Chief · E169 Engine · E170 Engine · E171 Engine · TL15 Engine · R56 Engine · U-156 Utility · U-160 Utility; custom types Deputy Chief / Tower Ladder / Utility; inventory null. Deviation from the plan's 7-rig keep list: Alex built his real roster (his call; see §5 N1) | **PASS** |
| R11 | Beta import by Alex: his counts + screenshot of the result line | Alex reported "imported"; no screenshot was filed. The cloud carries the proof instead: 32 rows under one write stamp 1791769503854 (31 live + 1 tombstoned 22 s later, `evidence/beta-inventory.json`) | **PASS (cloud-evidenced)** |
| R12 | Beta RTDB `orgs/<id>/inventory` == v3 (compare.py, `--expect-*`, `--roster`) | Import-stamp rows only: `evidence/beta-compare-import-stamp.txt` — 31 lines / 210 units, EXTRA 0, QUANTITY DIFFERS 0, ROSTER 0, MISSING 1 (E169 12" Swivel Base ×2 = the row Alex deleted at +22 s). Whole department: `evidence/beta-compare.txt` — 35 lines / 218 units, DIFFS 8 = that deletion + four E171 lines Alex added by hand (12" and 24" Gold extensions, AT 25-36, 12" Hinged Base, ×2 each; five distinct stamps). **Alex confirmed both edits were deliberate.** | **PASS (with deliberate post-import edits)** |
| R13 | Beta roster/types unchanged by the import (set equality with R10) | `evidence/beta-roster-diff.txt`: apparatus IDENTICAL (9 entries, same `lastWriteAt`), apparatusTypes IDENTICAL (3) | **PASS** |
| R14 | Docs/status updated (README Stage 6 list) | docs commit (sha recorded in CLAUDE.md phase status) | pending commit |

## 3. External-dependency probes

| Probe | Command | Evidence | Result |
|---|---|---|---|
| Build provenance (R0a) | `gh run list --workflow deploy-v4-beta.yml -L 1` captured 2026-10-11T23:27:17Z, before the import | `evidence/beta-build.txt` | **PASS** |
| Rules parity (R0b) | `firebase database:get /.settings/rules --project fieldshore-database`, key-sorted, vs `database.rules.json` | `evidence/beta-rules-parity.txt` | **PASS** |

## 4. Per-probe evidence

Captures are `NN-<step>.jpg` in this folder; data dumps are in `evidence/`; live reads that could carry personal data stayed in `fixtures/` (ignored). The emulator run was one sitting on 2026-10-11; the CSV was handed to the import screen's file input through the preview with the on-disk bytes (sha256 verified in-page before the change event). The beta run was Alex's, on this Mac, in the signed-in browser; Claude only read.

- **R1**: `evidence/v3-freshness.txt`.
- **R2/R3**: `evidence/convert.json`, `evidence/convert-run2.json`, `evidence/convert-hfdnames.json`.
- **R4–R8**: `evidence/emu-roster-before-*.json`, `02-`…`07-`, `evidence/emu-roster-diff.txt`, `evidence/emu-dexie-inventory.json`, `evidence/emu-compare-dexie.*`, `evidence/emu-rtdb-after-*.json`, `evidence/emu-compare-rtdb.*`, `evidence/emu-dexie-vs-rtdb.txt`.
- **R9**: `evidence/emu-redo-before-*.json`, `evidence/emu-redo-after-*.json`, `evidence/emu-compare-redo.*`, `evidence/emu-redo-isolation.txt`, `08-emu-redo-import-complete-32-rows.jpg`; stepper-to-zero test `evidence/emu-stepper-zero-delete.txt`, `evidence/emu-redo-after-stepper-zero-inventory.json`.
- **R0a/R0b**: `evidence/beta-build.txt`, `evidence/beta-rules-parity.txt`.
- **R10**: `evidence/beta-before-apparatus.json`, `-apparatusTypes.json`, `-inventory.json`.
- **R11/R12**: `evidence/beta-inventory.json` (= `beta-after-inventory.json`), `evidence/beta-inventory-import-stamp.json`, `evidence/beta-compare-import-stamp.*`, `evidence/beta-compare.*`.
- **R13**: `evidence/beta-after-apparatus.json`, `-apparatusTypes.json`, `evidence/beta-roster-diff.txt`.

## 5. Findings

| # | Severity | Blocks cutover? | Issue |
|---|---|---|---|
| F1 | Low | No | **A stocked rig cannot be removed in the UI, and the only line delete is the stepper.** `Remove <rig>` renders only in the empty-rig branch (`src/ui/inventory/InventoryScreen.tsx`, empty state); the store's cascade (`apparatusStore.removeApparatus`, L-8 guard) is unreachable while a rig has lines. A line IS deletable by stepping its count to 0 — the row disappears from the screen and a cloud tombstone is written (`evidence/emu-stepper-zero-delete.txt`; this is how Alex removed the E169 swivel base on the beta). The plan's cascade-based R9 was therefore replaced by the realistic recovery: new department + redo (rehearsed, R9). Follow-up issue filed. |
| F2 | Low | No | **Console noise around the emulator start and the department switch.** The preview tab opened ~8 s before the emulators listened (`ERR_CONNECTION_REFUSED`, WebSocket failures); creating a department ran the known full-reload crash path (`removeChild NotFoundError`, main.tsx switch coordinator). Eight HTTP 400 lines predate the first import and their count was unchanged after both emulator imports; URLs were lost from the tab's network buffer. No error was logged during any import; the cloud writes are proven by R8/R9/R12. |
| F3 | Low | No | **`ImportFlow.doImport` has no try/catch and the cloud push swallows failures**, so a failed push would look like success (`src/ui/inventory/ImportFlow.tsx:237`, `src/data/sync/syncService.ts:509`). Mitigated here by R8/R12 read-only verification. Follow-up issue filed. |
| F4 | Low | No | **Creating a second department from inside one is reachable only by address.** Settings › Department shows no Create button once the account is in a department (`src/app/routes/settings/DepartmentPage.tsx`, member branch); `/create-department` still works by direct URL and switches the active department (OQ#31). Alex's account was still in "Beta Department 1" from June; the runbook now gives the direct address. No issue filed: in-app department switching is a standing WON'T-FIX (Alex, 2026-07-01). |
| N1 | Note | No | **Alex built his real roster, not the plan's 7-rig keep list** (E169/E170/E171/TL15/R56/C2171/C2172/U-156/U-160, custom types Deputy Chief/Tower Ladder/Utility; no C2173; R56 and TL15 typed Engine). The CSV was regenerated with those names through the converter's `--apparatus` override (no code change, same self-check); every CSV rig name existed on the roster before import (ROSTER 0). The old v3 names were a test department's; the department's own names are the right keep. |

## 6. Recommendation

**PASS.** The converter is lossless on the real data (R2/R3), the CSV is accepted by the importer's own parser and by the import screen, the 32 rows land in both the browser store and the cloud with one write stamp and no rig minted (R5–R8), the recovery path is rehearsed (R9), and the real import into Alex's fresh v4 department landed all 32 rows under one stamp with the roster untouched (R10–R13); the two post-import differences are Alex's deliberate corrections of his department's stock. Nothing migrated from v3 except the inventory lines, as the re-scoped gate requires. This report does not close #264; Alex decides the gate.

## 7. Follow-ups

1. F1: decide whether a stocked rig may be removed from the UI (cascade + tombstones, with the held-units guard) and/or add an explicit per-line Remove — [#513](https://github.com/Vergo402/paratech-struts/issues/513).
2. F3: `ImportFlow.doImport` try/catch + surfaced cloud-push failure; the "would strand deployed stock" label is shown for re-type skips — [#514](https://github.com/Vergo402/paratech-struts/issues/514).
3. Docs vs code drift: `40-inventory.md` §Excel and `05-setting-up-inventory.md` Path C still describe xlsx + Reference sheet, "unknown value imports with a warning", and an orphan confirm modal; the code is CSV-only, flags, and silently skips orphans — [#515](https://github.com/Vergo402/paratech-struts/issues/515).
4. Reconcile the imported lines against the department asset register (`HFD Struts.csv`, 176 rows) — Alex; [#516](https://github.com/Vergo402/paratech-struts/issues/516).
5. (Alex) #492 what3words plan; if the beta channel rotates, re-add its host on both API keys.
