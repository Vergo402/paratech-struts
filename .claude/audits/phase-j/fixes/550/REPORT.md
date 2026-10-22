# #550 fix verification — Task Level Checklist keyed by the signed-in account

- Date: 2026-10-22. HEAD a54dcc9 (branch `claude/task-checklist-account-74c30b`, PR #568). Ruling R7 (Alex, 2026-10-21): account-only.
- Harness: `npm run emulators` (:9000/:9099) + `npm run dev:emu` (:5200); Playwright, system Chrome 390x844, one persistent profile per account/origin. Ports verified free before and after.
- Origins: device A `http://localhost:5200`, device B `http://127.0.0.1:5200`. Dept "QA Dept 550", op "Warehouse Collapse". Accounts qa550-1 ("Reyes", admin/IC) and qa550-2 ("Okafor", joined by invite code).
- Before (spec 23, `.claude/audits/phase-j/251-verify/23/REPORT.md` rows 23-22/23-23): instanceId = device uid; same account on a second origin showed 0 / 11.
- Gates (logs beside this file): `smoke.sh`, `npm run build`, `npm run test:rules` — all EXIT:0. Unit: `src/ui/operations/TaskLevelChecklist.test.tsx` 3/3 (member case failed before the fix).

| # | Check | Verdict | Proof |
|---|---|---|---|
| 1 | A: Reyes attests "Survey the work area" + "Primary search" | PASS | shots/01: Assessment 1/2, Search 1/3, captions "Incident Commander · 08:34". |
| 2 | Same account on B shows the same checks (was 0 / 11) | PASS | shots/02: identical leaves and captions on B. |
| 2b | Leaf attested on B appears on A live | PASS | shots/03 (B attests "Secondary search"), shots/04 (A shows Search 2/3 within 10 s). |
| 3 | Second account is independent | PASS | shots/05 Okafor 0 checked; shots/06 Okafor attests "Stabilize the patient" ("Unassigned · 08:39"); shots/07 A unchanged (3 leaves, no Okafor leaf). Confirmed again after reload on both. |
| 4 | Event keying (emulator REST, `?ns=fieldshore-database-default-rtdb`) | PASS | 4 ChecklistItemChecked events: Reyes's three share instanceId `7mVD…51Dt` = qa550-1 Auth localId, with `by` `7a5ba6f8…` on A and `2659de74…` on B (device uid still); Okafor's has instanceId `Gt2p…1KV` = qa550-2 localId. |
| 5 | Console | PASS | 0 error-level messages after the baseline on A, B and the second-account profile; no "Transition was aborted" noise this run. |

## FAIL repro
None.

## Observation (not #550)
Signing up a new account on a B profile right after Reyes logged out came up as "QA Dept 550 · admin" without the join flow — the device's department session carried over after logout. Step 3 was redone on a clean profile with a real invite-code join, so this report is unaffected. Filed separately if not already known.
