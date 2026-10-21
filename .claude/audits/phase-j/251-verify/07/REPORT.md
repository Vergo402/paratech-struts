# #251 verification, spec 07 (First-run / department setup)

- Date: 2026-10-13. HEAD: 903a68e (v4-redesign). No source edits and no state-changing git commands.
- Harness: emulators (Auth :9099, RTDB :9000) plus `npm run dev:emu` on :5200. Both were stopped at the end.
- Origins: device A = http://localhost:5200 (390x844 touch, Chrome via Playwright persistent profiles, one profile per account). Device B = http://127.0.0.1:5200 (founder recovery, crew gate). 192.168.x was not usable because it is a non-secure origin with no `caches`.
- Accounts: `qa251-07-1` to `qa251-07-19@example.test`. Passwords are not repeated here.
- Departments: "QA Dept 07" (main, founder `-1`), plus throwaways: "QA Dept 07 done", "QA Dept 07 esc", "QA Dept 07 scrim", "QA Dept 07 offline", "QA Dept 07 offline2", "QA Dept 07 sun", "QA Dept 07c", and one 100-character name.
- Screenshots: `/Users/alex/Developer/paratech-struts/fieldshore/.claude/audits/phase-j/251-verify/07/shots/` (01-27, some unnumbered variants).
- Drive scripts: `/private/tmp/claude-501/-Users-alex-Developer-paratech-struts-fieldshore/e3a5ad1b-080d-47ae-a256-05c55d148d62/scratchpad/` (`l7.mjs`, `a*.mjs`, `b*.mjs`, `c1.mjs`).
- Cold open: a clean origin lands on `/welcome.html` (ADR-034). "Open app" goes to `/quickfind`, not `/`. The brief's "lands on Quick Find, no overlay" is true only after tapping through the welcome page.
- The ADR-034 welcome tour did not appear after account creation. A first-run coach dialog ("Measure the opening", Skip/Next) appears on `/operations` after Done or dismiss (shot 13).
- Console baseline mark: 1 entry on the first clean load (`Failed to load resource: 404`). I could not reproduce the 404 with a response listener on a later clean load, so it stays unattributed. Console notes are at the end.

| # | Criterion | Verdict | Proof |
|---|---|---|---|
| 07-01 | Create Account with no dept forwards to `/create-department`, no shell, no bottom nav | PASS | Path `/create-department` after signup. `nav` count 0, no tablist. Shot 04. |
| 07-02 | Gate card for Operations/Inventory/Command | PASS | Direct loads and tab taps on all three give h1 "Set up your department" with buttons Create department / Join an existing department / Sign out and the caption "Quick Find works without a department." Create department routes to `/create-department`. All three buttons are 56 px tall. Shots 07-gate-*. Caveat: the card also shows "Signed in as <name> — pick a department to continue." |
| 07-03 | Settings -> Department shows "You're not part of a department yet." with Create new / Join existing | SPEC-DRIFT | `/settings` and `/settings/department` for a department-less member render the gate card, never the Department page. `src/app/router.tsx:101-110` says RequireDepartment wraps the whole Settings layout, so every sub-page inherits the gate. The "not part of a department" and "Create new department" copy in `DepartmentPage.tsx` is unreachable. The member can still reach Create and Join through the gate buttons. Shot 08. |
| 07-04 | Create screen heading, copy, exactly one input "Department name" | PASS | h1 "Create department". Copy matches exactly. One `<input>` (type text, placeholder "Hamden Fire Rescue", height 56). Accessible name "Department name". |
| 07-05 | Button disabled for blank/whitespace, enables on a real name, reason exposed | PASS | Disabled for "" and "   ", enabled for "QA Fire Rescue". "Enter a department name" is visible text beside the button. There is no `aria-disabled`/`aria-describedby`, but the native `disabled` is set. |
| 07-06 | Name over 100 chars gives inline polite error, no navigation, no dialog | PASS | 101 "x": the path stays `/create-department`, polite live region reads "Department name is too long (max 100).", 0 dialogs/alerts. Control: a 100-char name creates the department and the sheet shows. Shots 06, 12. |
| 07-07 | Blank-name copy "Department name is required." reachable; field `aria-invalid` | NOT-BUILT | The copy exists only in `departmentService.ts:352`, unreachable through the UI because the button is disabled. The input has no `aria-invalid` and no `aria-describedby`. The error is a separate polite `<p>`, not tied to the field. Not a Superseded item. |
| 07-08 | "Creating…" label, no double submit | PASS | A MutationObserver across a `dblclick` shows "Creating…" with disabled=true, then "Create department". Emulator REST: exactly one new org for that action. I could not build a positive control that makes a double create happen, so the proof is one org and a disabled button. |
| 07-09 | Sheet "<Name> is ready" over the form, no navigation | PASS | Sheet title "QA Dept 07 is ready". Path still `/create-department` and the h1 stays behind the scrim. Shot 10. |
| 07-10 | "You're the" + Admin badge; Settings and `/users` show Admin | PASS | Sheet text "You're the Admin". Settings -> Department shows "QA Dept 07" with Admin. `/users` lists "QA Founder · you" with Admin. Shot 19. |
| 07-11 | QR + `XXXX-XXXX` code from the allowed glyphs + Copy | PASS | Code AJ3M-47TJ matches `^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$`. The QR is a canvas with aria "QR code for invite code AJ3M-47TJ", 176 px wide. Copy button present. The code is stored at `/orgs/inviteCodes/<code>` with `active:true`. |
| 07-12 | Copy writes the clipboard and the label becomes "Copied" | PASS | `clipboard.readText()` = AJ3M-47TJ, label "Copied". Caveat: no live region announces "Invite code copied." The only polite region on the page is the empty error `<p>`, so the spoken string is not built. Shot 11. |
| 07-13 | Code is multi-use, case-insensitive | PASS | Three accounts (device B, a second profile, a third profile) joined with the code, typed lowercase. REST shows members Crew 10/11/12 with `viaCode`, code still `active:true` after all three. The 24 h expiry was not waited out. Shots 16, 17. |
| 07-14 | Done enters `/operations` on the new dept, full reload, no gate | PASS | Done gives `/operations`, the sheet is gone, no gate. A `window.__m` marker was lost, so it was a full reload (Sunlight run). Settings shows the name and Admin. Caveat: the first-run coach dialog overlays Operations (shot 13). |
| 07-15 | Scrim / Escape dismiss behave like Done | PASS | Escape: `/operations`, same department, same code in Settings. Scrim tap at y=40, which is the scrim in shot 12: identical result. The offline run's marker was also lost on Escape, so it reloads. The code is retrievable afterward. |
| 07-16 | Settings -> Department shows the same QR + code + Copy | PASS | Code AJ3M-47TJ equals the sheet's. QR present. Copy puts it on the clipboard. Shot 18. Caveat: a Default-role member sees the same QR and code in Settings (crew 10/11/12 screens), not only an Admin. |
| 07-17 | Skip for now exits to `/operations`, nothing created | PASS | Skip gives `/operations`, and Back gives `/operations`. No new org in REST. Quick Find loads for a signed-in member with no department. |
| 07-18 | "Join an existing department" routes to `/join-department` | PASS | Path `/join-department`. |
| 07-19 | Additive: reload keeps the department, no delete/undo/transfer control | PASS | After reload Settings -> Department still shows "QA Dept 07". A regex scan for delete/remove/undo/transfer/leave/dissolve over the Department page, the Settings index, `/users` Members and Roles, and Administration found no match. Positive control: after creating a custom role "Temp Role", the role editor matches the same regex ("Delete role", "Export / delete data"). |
| 07-20 | Sole Admin can't be demoted | PASS | Footnote "The last Admin can't be revoked or demoted" shown. The founder row is plain text, not a button, while the crew rows are buttons ("QA Crew 10 Default"). |
| 07-21 | Regenerate: confirm, new code, old code fails | PASS | "Regenerate invite code?" with copy "The current code AJ3M-47TJ stops working immediately…", Cancel and Regenerate (both 56 px). Cancel leaves the code. Confirm gives T89P-JM6N. The old code is `active:false` in REST. Joining with the old code gives "That code has expired. Ask your Admin for a new one." The new code joins. Copy note: a revoked code reads "expired". Shots 20-22. |
| 07-22 | Device B recovers the founder's dept as Admin | PASS | Clean 127.0.0.1 origin, signed in as the founder: lands on `/operations`, Settings shows "QA Dept 07" with Admin, `/users` lists the roster. No re-create (no new org). Shot 23. |
| 07-23 | A crew device with no department sees nothing when A creates one | PASS | Device B (account 17) stayed on the gate for 35 s while another account created "QA Dept 07c". The page-text log has one entry, no dialogs/alerts/status. Positive control: an injected `CONTROL-CHANGE` node was captured by the same observer. Shot 24. |
| 07-24 | Offline create is local-first | PASS | After `goOffline` plus the `offline` event, Create shows the sheet with a code (~4.1 s measured, with "Creating…" during the wait). Settings shows the department. After going online the org and code appear in the cloud. Shot 15. Caveat: ~4 s delay offline. One run logged `FIREBASE WARNING: set at /orgs/<id>/deviceOwners/<uid> failed: permission_denied` on reconnect, but the org's `deviceOwners` entry is present in REST. Not reproduced in the second offline run. |
| 07-25 | Tap targets at least 48 px | PASS | Create 56, Join 56, Skip 56, Back 48, Done 56, Copy 48, input 56. Caveat: the sheet's own "Close" X is 40 px (not on the criterion's list). |
| 07-26 | Focus moves into the sheet; dialog named | PASS | `activeElement` is the Close button inside the dialog. `aria-labelledby` resolves to "QA Dept 07 is ready". Caveat: no `aria-live`/status region in the sheet, so the single spoken announcement is not built. On close the page reloads. |
| 07-27 | h1 and field label present | PASS | h1 "Create department", textbox name "Department name". No dedicated route announcement (not expected). |
| 07-28 | Sunlight contrast | PASS | Computed ratios in Sunlight: error text 8.31, Create button 7.47, Done 7.47, Admin badge 19.09, code text 21, Copy 21. Visually legible in shots 25, 26. |
| 07-29 | "Claim department" banner | NOT-BUILT | `grep` for "Claim department" / "Department claimed" in `src/` is clean. No claim text on `/operations`, `/quickfind` or Settings -> Department. Superseded: #264 re-scoped the carry-over to a CSV re-import. |

## FAIL repro steps
None.

## SPEC-DRIFT list
- 07-03: `RequireDepartment` wraps the whole Settings layout (`src/app/router.tsx:101-110`), so a department-less member sees the gate card at `/settings/department`. The "You're not part of a department yet." branch in `DepartmentPage.tsx` is dead for that case.

## Deferred, not driven
Address/type/default Level at setup (Open Q 1), founding-Admin transfer (Open Q 3), multi-department switching (Open Q 4), #525 per-line Remove, #520 R1-R3 tamper rules, and admin provisioning (ADR-025 addendum).

## Console notes
- `pageerror: Transition was aborted because of invalid state. ViewTransition opt-in disabled`: every run, on route changes (dev build).
- One `404 Not Found` on the first clean load of each profile. Not attributed.
- The one `permission_denied` warning described under 07-24.
- Join with a revoked code shows its message in the page body, not in an `aria-live` region.
- Not used: `vite preview` prod build (the brief only suggested it for odd focus/double-create results).
