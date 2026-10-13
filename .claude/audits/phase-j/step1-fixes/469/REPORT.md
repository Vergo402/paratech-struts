# #469 QA proof: blank-ID import rows merge with identical stock (Task 4)

Branch v4-redesign (read from .git/HEAD; no git command run). 2026-10-13, about 00:03 to 00:12 local.
Code under test = the working tree, fix uncommitted at the time. Confirmed by fetching the served module from the dev server: `/@fs/.../src/data/store/inventoryStore.ts` contained the identityKey / blankSums / carried logic.

## Harness (and one deviation from the recipe)
- The implementer recipe (task-4-report.md) says plain dev :5199 plus a guest/local department. `src/ui/dept/RequireDepartment.tsx` admits only `identity.kind === 'member'` with a department (guest => "Sign in to continue"), so Inventory is unreachable as a guest. The brief allows the emulator harness, so I used it.
- `preview_start fieldshore-emulators` (serverId 23339eba-519c-4c48-9dd9-aed374c29e3d, reused:false), then `preview_start fieldshore-v4-emu` (9a8de725-80a6-4af3-99a1-70d01524b1ec, reused:false). One tab, http://localhost:5200. Origin wiped first from /favicon.svg (it was already empty). Emulator RTDB root was null (pristine).
- Throwaway account qa469@example.test (display name "QA Driver 469"), department "QA Dept 469". The password was generated inside the page and never read, logged or stored. The account lived only in the in-memory Auth emulator.
- smoke.sh was not run (it starts its own server via Bash, which the brief forbids). I cite the orchestrator's gate lines in progress.md instead (smoke / build / rules EXIT:0 after the Task 4 fix round).
- Files were fed to the import dialog through javascript_tool: `new File([csvText])`, `DataTransfer`, `input.files = dt.files`, then a bubbling `change` event. The in-page SHA-256 equalled `shasum` on disk for all three CSVs (blank-ids.csv a1a18835fbc9bd34a4fa7dad6995809589ca1fa1a81450d792d2b59691cc522b, 215 bytes).

## Verdicts
| # | Criterion | Verdict | Proof |
|---|---|---|---|
| 1 | Baseline | PASS | Fresh dept: added rig "Rescue 9" plus LS 304 x1 by hand. Strip 1 on hand / 0 deployed / 1 models; row LS 304 1/1. IndexedDB: 1 row inv-5eb3c742-67e1-45c2-923e-1f04b9ae40fd, qty 1. Files: 01-baseline*.png, captured-text/01-* |
| 2 | Import 1 | PASS | Dialog: step 2 all 10 columns auto-matched; step 3 "4 will import"; result "3 rows imported." (no skipped text). Screen: 15 on hand / 0 deployed / 3 models; Struts 2 models: LS 203 5/5 (two rows, 2+3, ONE line), LS 304 4/4 (hand-added row SET 1 to 4 in place, same id, no second line); Base plates: 6" Rigid Base 6/6. IndexedDB 3 rows; roster still 1 rig; cloud REST shows the same 3 rows. Files: 02-*, 03-*, captured-text/03-* |
| 3 | Import 2 (same file) | PASS | Result "3 rows imported." Row list text before and after captured and `diff`ed: IDENTICAL (exit 0) for both get_page_text and read_page of main. Same lines, quantities (5 / 4 / 6) and strip (15 / 0 / 3). Files: 04-*, 05-*, captured-text/03-* vs 05-* |
| 4 | IndexedDB (db fieldshore-dept-b3df77df-5b42-485e-9ce1-82f8e57dfe1b, table inventory) | PASS | 3 rows before import 2, 3 rows after. Tuples identical (id / type / model-or-plateId / apparatusId / qty): inv-5eb3c742... / strut / LS 304 / app-156f3b66... / 4; inv-90776be2... / plate / rigid6 / app-156f3b66... / 6; inv-f280e3f7... / strut / LS 203 / app-156f3b66... / 5. Only lastWriteAt moved (1791864383653 to 1791864474295). File: captured-text/04-indexeddb-before-and-after-import2.json |
| 5 | Negative control | PASS | negctl-different-model.csv (blank ID, Rescue 9, Strut, LS 406, qty 2): "1 row imported."; NEW line LS 406 2/2 (new id inv-3ad29e6b...); strip 17 on hand / 4 models; IndexedDB 4 rows; the other 3 rows unchanged (ids, quantities, lastWriteAt). It can fail: a rig-only or first-match merge would have overwritten an existing row and shown no new line. Matched positive control = import 1's LS 304, same pipeline, matching identity, merged in place. Files: 06-*, 07-* |
| 5b | EXTRA control, not in brief | PASS | negctl2-same-model-different-rig.csv (blank ID, "Engine 12", Strut, LS 304, qty 3): "1 row imported."; new tab Engine 12 (3 items, LS 304 3/3, new id inv-4c63d5a0..., rig minted as type Other); Rescue 9's LS 304 stays 4/4 with the same id and lastWriteAt (no cross-rig merge). Files: 08-extra-* |
| 6 | Baseline note (old behaviour) | CITED, NOT RE-RUN | From task-4-report.md "Old behaviour": before the fix every blank-ID row was added as a fresh `inv-` row. Import 1 would leave 5 rows (LS 304 x1 and x4 separate, LS 203 x2 and x3 separate, plate x6; 16 on hand), and import 2 would add four more rows (9 rows, 31 on hand), growing with every re-import. Not reproduced live: no git and no source edits were allowed. |
| 7 | Stop servers | DONE | Origin wiped from /favicon.svg (5 IndexedDB dbs and 1 localStorage key removed). preview_stop on v4-emu and emulators both reported stopped. lsof shows nothing listening on 5200 / 9000 / 9099 / 4400 / 4500 / 4000. |

## Sync and console
- No rejected writes. RTDB emulator REST (`/orgs/<dept>/inventory`, owner auth) equalled IndexedDB after import 1 (3 rows), after import 2 (3 rows, lastWriteAt bumped) and at the end (5 rows, 20 qty, plus a 2-rig apparatus roster). Files: rest/*.json
- Console (onlyErrors) at every checkpoint: one "Failed to load resource ... 400 (Bad Request)" that was ALREADY present before import 1 (its request had dropped out of the network buffer; unidentified, not import-related), plus one "Uncaught (in promise) AbortError: Transition was skipped" per `location.assign` page load I issued (View Transitions, unrelated). Nothing new from any import.
- A full reload at the end kept the state (2 apparatus, 20 on hand, 5 models; Engine 12 3 items, Rescue 9 17 items).

## Surprises and notes (none is a FAIL)
1. The recipe's guest-department premise is stale (see Harness).
2. Count wording: step 3/4 say "4 will import" / "Import 4 rows", the result says "3 rows imported" (aggregates), and a no-op re-import also says "3 rows imported". progress.md already defers this wording to Task 5.
3. Re-import re-stamps and re-pushes every matched row (lastWriteAt bump). That matches the id path and the accepted SET ruling, but it is now reachable from hand-kept CSVs: under last-write-wins, re-importing a stale file overwrites newer peer counts.
4. The strip's "models" counts per-rig lines, not distinct models: it went 4 to 5 when Engine 12 got an LS 304 (design note only).
5. The pane has no file-upload tool. The dialog's `onFile` resets the input (`e.target.value = ''`, ImportFlow.tsx:171), so `files.length` reads 0 right after dispatch even though the dialog advanced. Suggested fix to run-fieldshore SKILL.md: its "file upload on the hidden input via the browser tools" line does not apply to the pane; document the File + DataTransfer + change-event recipe with the in-page SHA-256 check. I did not write to the shared observation log; the orchestrator can log it (obs 99 and 101 already cover the related emulator and origin gotchas, and obs 100 matches the matched-control approach used here).
6. Not exercised in the live UI: the held-guard skip on the merge path and the id-row + blank-row-in-one-file ruling (both unit-test covered; the recipe marks the held-guard check optional).
7. `*.csv` is gitignored (.gitignore:37): the three CSVs in the evidence folder need `git add -f`.
8. REPORT.md was not written to disk because my system rules forbid report .md files. This block is the report.

## Evidence index
/Users/alex/Developer/paratech-struts/fieldshore/.claude/audits/phase-j/step1-fixes/469/
- blank-ids.csv, negctl-different-model.csv, negctl2-same-model-different-rig.csv (exact files imported)
- 28 PNG screenshots: 00a-00c setup, 01 baseline, 02 import 1 (a to g), 03 after import 1, 04 import 2 (a to d), 05 after import 2, 06 negative control (a to d), 07 after negative control, 08 extra control (a to e), 09 final after reload
- captured-text/: get_page_text, read_page main, dialog text and IndexedDB JSON per state
- rest/: cloud inventory and apparatus JSON from the RTDB emulator
- commands.log: timestamped execution record
