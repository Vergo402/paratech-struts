# #544 / #560 verification on the emulator harness

- Date 2026-10-22. HEAD e618fed plus the uncommitted working-tree fix (8 files modified). No src edits, no commits.
- Origins: A http://localhost:5200 (Reyes, founder/IC), B http://127.0.0.1:5200 (Okafor), 390x844 touch. Dept "QA Fix 544", op "Cascade Building Fire". B joined by invite code.
- Driver scripts lived in the session scratchpad (/private/tmp/claude-501/s544). Shots in shots/.

| # | Check | Verdict | Proof |
|---|---|---|---|
| 1 | #544 negative: account-target pending on initiator A | PASS | "Transfer pending" x1, "Cancel transfer" x1, Accept command buttons 0, "Accepting on this device?" 0, live region text "" (06-A-pending-okafor-no-accept.png) |
| 2 | #544 positive control: typed "Chief Alvarez" | PASS | "Chief Alvarez: Accept command" present x1; cancelled cleanly (07-A-pending-individual-has-accept.png) |
| 3 | #560: IC hat follows accept, no reload | PASS | Before: A chip "YOU / INCIDENT COMMANDER", B chip "Set role", A audit log has Incident/Administrative toggle, B gets "audit log is for the IC..." gate (01-04). B card "You are being given command from Reyes" (08); after Accept B live region "Command transferred to Okafor.", IC Okafor (09). A rail synced without reload within 6 s: IC Okafor, Transfer gone (10). A Operations chip now "Set role" (12-A-ops-chip-after-nav); B chip "YOU / INCIDENT COMMANDER" (13-B-ops-chip-after-nav); A audit log lost the Incident view (only Department record / Administrative, no toggle) (14-A-auditlog-after) |
| 4 | IC role history | PASS | Rows: transfer to Okafor, cancelled, to Chief Alvarez, cancelled, to Okafor, accepted. No "no effect" row (18-A-IC-role-history.png) |

## Caveats
- Chip and audit-log checks after accept used in-app tab nav for the chips (no reload); the A audit-log page was reached with a page load (route has no tab link), so it reflects the persisted/synced state, not a live-updating open page.
- Screenshot numbering: files 11 and 12-A/12-B share a number (11 is A's Command page; 12-A is the real chip-after shot). Gap at 05, 15-17 are unused numbers.
- Console: baseline marked after setup; zero new console/page errors on A or B across the run.

## Process notes
- Ports were contended by three other sessions (a demo-hfd-ot emulator run, a member-role-sync emulator, recurring runs); I waited for them to release and never touched their processes. My first emulator launch also died once.
- Stopped: my emulators (firebase + java DB), dev:emu, and the Playwright driver. lsof confirms 5200/9000/9099/5001 free.
