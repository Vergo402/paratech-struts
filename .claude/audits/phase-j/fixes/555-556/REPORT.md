# Fix proof — #555 live member role + #556 offline governance guard

- Date 2026-10-22. Branch `claude/member-role-sync-9c4c58` (fix commit `1776ea8` + follow-up hook fix in the PR). Emulators auth+database+functions, dev server on :5201 (5200 was held by a sibling session). Dept "QA 555"; accounts qa555-1..3@example.test (Cruz Admin, Dana, Lee). Driven by a qa-driver with Playwright over CDP, three Chrome profiles. Servers stopped after.
- Gates (bare, output in this folder): `gate-smoke.txt` EXIT:0 (2293 tests), `gate-build.txt` EXIT:0, `gate-rules.txt` EXIT:0 (46 rules tests); after the hook follow-up: `gate-test-2.txt` EXIT:0, `gate-build-2.txt`.
- Shots: `shots/` (01–36).

| # | Proof | Verdict | Evidence |
|---|---|---|---|
| 1 | #555 reassign Default → User Mgr reaches the signed-in device live, no reload | PASS | B's Settings label "QA 555 · User Mgr" in 116 ms; Administration row appeared; back to Default: label + row gone in 99 ms (shots 01–06). Negative control: editing a different member left B byte-identical after 3.5 s (07–09). |
| 2a | #555 demote Admin → Default live | PASS | Lee's open /users went to "Admin access only" in 59 ms, no reload (shot 16, earlier 13). |
| 2b | #555 promote → Admin while /users already open | FAIL → PASS | First run: screen un-gated live but own row/Roles face read the stale members snapshot (shot 11). Follow-up fix: `useUserManager` re-reads members when the viewer's own role changes. Re-run: own row "Lee · you / Admin" in 79 ms, "+ Create role" present (33–35); demote back → "Admin access only" in 56 ms (36). |
| 3 | #555 survives reload and sign-out → sign-in | PASS | Still User Mgr after reload (20) and after re-sign-in, Administration row present (21). |
| 4 | #556 offline Revoke access → confirm | PASS | Inline role=alert "You're offline — this change needs a connection." in 63 ms, modal open, buttons enabled (22–24). Cancel, reconnect 5 s, reload: Lee still Default; REST `members/<lee>/active` = null (25–26). Positive control online: Revoke → active=false (27), Reactivate → true (28). |
| 5a | #556 offline role assign | PASS | Same alert in 34 ms, badge unchanged; after reconnect REST role = "default" (29). |
| 5b | #556 offline Regenerate invite code | PASS | Same alert in 30 ms; code unchanged after Cancel + reconnect + reload; REST `inviteCodes` holds only the old code (30–32). |

## Before → after
- Before (30-17 / 25 setup note): reassignment never reached a signed-in device, even after reload; only a fresh sign-in. After: 60–120 ms, no reload; survives reload and re-sign-in.
- Before (30-25): offline revoke hung the modal with no alert and landed on reconnect after Cancel. After: refused up front with an inline reason; nothing lands.

## Console
No errors or warnings captured on any device during the proofs (listeners attached per driver script).

## Not driven
Role create/edit/delete, add member, reset password and change email offline (same `offlineReason()` guard, unit-tested in `departmentService.test.ts`).
