# #251 verification, spec 08 (Joining a department by invite code)

- Date: 2026-10-13. HEAD 903a68e (branch v4-redesign). No source edits and no state-changing git commands. Emulators and `dev:emu` were started by me and stopped at the end.
- Origins: device A (Admin) = http://localhost:5200. Joiners = http://127.0.0.1:5200, each in its own Playwright persistent profile. Phone viewport 390x844, except 08-27, which ran at 1280x800.
- Department: "QA Dept 08". Accounts qa251-08-1 to qa251-08-7@example.test (passwords not repeated). The first code (XBJD-39DL) was killed with Regenerate. The live code was FWVV-RP6F.
- Console baseline: 1 message at first load, the known first-load 404. Observed after that: only the known 404 and "Transition was aborted because of invalid state", plus ERR_FAILED lines I caused by blocking :9000 and :9099 in the offline tests. No unexpected errors.
- Screenshots: `/Users/alex/Developer/paratech-struts/fieldshore/.claude/audits/phase-j/251-verify/08/shots/` (01 to 45; 10, 11, 14, 15, 20 to 22 and 30-F to 32-H are the key ones). Drive scripts are in the session scratchpad (`l8.mjs`, `s*.mjs`, `b*.mjs`, `f1.mjs`, and others).
- Positive controls: a synthetic `role=status` element was caught by the A-side observer. A native `alert('control')` was caught by the dialog listener. A control click produced the same invalid-code message that Enter did not (08-27).

| # | Criterion | Verdict | Proof |
|---|---|---|---|
| 08-01 | Gate button reaches the join route | PASS | Signed in with no department, `/operations` shows "Set up your department". Tapping "Join an existing department" gives `/join-department`. Shot 07. |
| 08-02 | Settings → Department offers "Join existing department" | FAIL (copy/minor) | `/settings/department` and all of `/settings` show the gate for a department-less member. The gate's button is labelled "Join an existing department" and reaches `/join-department`. The literal "Join existing department" button in `DepartmentPage.tsx:69-70` never renders. `router.tsx:102-111` wraps every settings page in RequireDepartment, so that branch is dead code. Shots 06, 08. |
| 08-03 | Pre-shell page | PASS | Header has Back plus the FieldShore wordmark, H1 "Join department", and 0 nav or tablist elements. Shot 10. |
| 08-04 | Labels present | SPEC-DRIFT (copy) | "Invite code", "Scan QR code", an "or" divider, field "Enter it by hand" with placeholder HAMD-4F2K, "Paste", the helper line, "Join department" and "Continue as guest" are all present. "Scan QR code" and "Enter it by hand" are named in the brief as copy drift. |
| 08-05 | Join disabled until 8+ alphanumerics | PASS | Empty field: disabled, with visible text "Enter your invite code". `ABCD` and `ABCD-EF` stay disabled. `ABCD-EFGH` enables. The reason text is a sibling element, not `aria-describedby`. |
| 08-06 | Scan sheet | PASS | Sheet "Scan invite QR" with Close and Cancel. After about 3 to 5 s with no camera: "Camera unavailable. Type or paste the code instead." (`aria-live=polite`). A stubbed NotAllowedError gave the same message. Typing still works, and Cancel and Close both dismiss. Shots 11, 12, 13. A black video frame shows for the first 1 to 2 s. |
| 08-07 | Paste | PASS | With clipboard `ABCD-EFGH`, Paste fills the field. With `readText` rejecting, the field keeps "keep", no dialog or alert appears, and typing still works. Denial was a stub, not a real permission block. |
| 08-08 | Typed join | PASS | A poller logged "Joining…" and then "Joined QA Dept 08" within 60 ms. Sheet title "Joined QA Dept 08". Shots 30-F-*. |
| 08-09 | Case, hyphen and space variants | PASS | `fwvv rp6f` and `fwvvrp6f` both joined (accounts G and H). |
| 08-10 | Role badge and copy | PASS | "Your role", a badge reading "Default", and the full "You can read everything and run field work. Your Admin can change your role anytime." text. The sheet is a Sheet with Continue, as the brief expects. |
| 08-11 | Continue enters the shell | PASS | `/operations` renders with no gate. The gate never flashed (poller). `/settings/department` shows "QA Dept 08". |
| 08-12 | Default role and no org-chart slot | PASS | No Admin badge on the joiner's department page. A's Members list shows each joiner as "Default". With an active operation "QA Op 08", the org chart reads "7 positions · 1 assigned" (the IC only). Shots 39, 42. |
| 08-13 | Admin's Members list shows joiners, no notification | PASS (caveat) | A's observer (control caught) recorded 0 dialog, alert, status or toast events while 5 accounts joined. The list does NOT update on an already-open `/users`. It is a cold read (`departmentService.ts` ~line 98: "not a live store"). After reopening, all 5 joiners show with "Default". Shots 33, 33-A. |
| 08-14 | Other members see the new member in their roster | NOT-BUILT | A Default member opening `/users` sees "Admin access only". The member-readable roster (`readRoster`) only feeds the assign and transfer pickers in `NodeSheet` and `TransferCommand`. A Default member's node sheet showed no assign control, so I could not surface it. Shots 37, 43. |
| 08-15 | Invalid code | PASS | `ABCD-EFGH` and `0O1I-0O1I` both give "That code isn't valid. Check it and try again." under the field. Input `aria-invalid=true`, Join re-enabled, 0 native or DOM dialogs. Shot 14. |
| 08-16 | Regenerated code | PASS | `XBJD-39DL` gives "That code has expired. Ask your Admin for a new one." Shot 15. |
| 08-17 | Editing clears the error | PASS | After typing one more character, the message is gone and `aria-invalid` is cleared. |
| 08-18 | Multi-use code | PASS | Accounts B, B2 (D), F, G and H all joined with the same live code, and all 5 show in A's list. |
| 08-19 | Admin re-join | PASS | A submits its own live code. The sheet reads "Admin", not "Default", and the Members list is unchanged. Shot 35. |
| 08-20 | Guest and Back leave without joining | PASS | Both go to `/operations`, which shows the gate. A's list had only the Admin at that point. No state was written (`localStorage` held only `fieldshore_entered`). |
| 08-21 | Signed-out join | PASS | Inline "Sign in before joining a department.", no dialog, still on the route. Shot 17. |
| 08-22 | Offline join queues | FAIL | Offline Join stays on "Joining…" indefinitely and the "You're offline" sheet never appears. Tried: `goOffline` plus the offline event (hung more than 30 s); Playwright `setOffline` (hung 24 s); cold load with :9000 and :9099 blocked, HTTP and WebSocket (hung 20 s). No banner "Will join…" was ever raised. Root cause: `departmentService.ts:451-468` awaits `get()` with no timeout, so the `catch` that calls `queueJoin` is unreachable. The same file at lines ~201-218 states offline `get()` never rejects and wraps other reads in `timeoutMs`. LEDGER already lists "invite lookup has no timeout" as a follow-up. Shots 20, 22, 24. |
| 08-23 | Queued join completes on reconnect | FAIL | No queued join exists. If the page stays open on the hung "Joining…" and the network returns, the held `get()` resolves and the join completes (account D, shot 25). If the user leaves mid-join (Continue as guest), the join is lost. Account E showed the gate after coming back online (shots 26, 27). |
| 08-24 | Tap targets | PASS (minor note) | Back 48, Scan QR code 56, Paste 80, Join 56, Continue as guest 56, sheet Continue 56. The Joined sheet's Close X is 40 px, below 44, minor. |
| 08-25 | Accessibility | PASS | Visible label "Enter it by hand" tied to the input. Paste has a text label. On error the input has `aria-invalid=true` and `aria-describedby` pointing at the message. The message itself has no `aria-live` or role. The Joined sheet is a dialog labelled by its title, "Joined QA Dept 08". The spec's exact screen-reader strings are not present, which is wording drift only. |
| 08-26 | Focus on the code field at open | NOT-BUILT | `document.activeElement` is BODY on route open. There is no autofocus in `JoinDepartmentScreen.tsx`. |
| 08-27 | Enter submits (laptop) | NOT-BUILT | At 1280x800 pressing Enter in the field did nothing: no message, no join, and no `<form>` on the page. A click on Join with a different bad code did show the error (control). Shot 16. |
| 08-28 | Admin side supplies code and QR | PASS | `/settings/department` shows "Invite your crew — they scan this or type the code", a canvas `role=img` labelled "QR code for invite code FWVV-RP6F", and the code. Copy changes to "Copied" and the clipboard holds FWVV-RP6F. I decoded the QR image with jsQR and it returns FWVV-RP6F, the same code the joiners typed. Shot 45. |
| 08-29 | No post-join prompts, welcome toast or push | PASS | After Continue there are 0 status, alert or dialog nodes on the joiner. A's observer saw 0 events (control caught). No second sign-in or department prompt appeared. |

## Deferred, not driven
08-S1 (single-use "already used"), 08-S2 (Leave and always-on Join; the Settings Join button is covered by 08-02), 08-S3 (clock expiry), 08-S5 (auto clipboard detect), 08-S6 (display name on the join route), 08-S7 (incident-join QR link), 08-S8 (trainer view). 08-S4 (alphabet) was exercised via 08-15 and passed.

## FAIL repro steps
- 08-02 (copy/minor): sign up with no department, open `/settings/department`. The only join control is the gate's "Join an existing department". Fix area: `DepartmentPage.tsx:69` is dead code behind `router.tsx:102-111`.
- 08-22: sign up as a department-less member, open `/join-department`, cut the network to :9000 and :9099 (HTTP and WebSocket) or call `goOffline`. Type FWVV-RP6F and tap Join. The button stays "Joining…" and no sheet or banner ever appears. Fix area: add the `timeoutMs` race around `get(ref(rtdb, orgs/inviteCodes/…))` in `joinByCode` (`departmentService.ts:451-468`), treating a timeout like the existing offline `catch` and calling `queueJoin`.
- 08-23: a consequence of 08-22. Start an offline join, then tap Continue as guest. The join is never queued and the user is still department-less once back online.

## SPEC-DRIFT list
- 08-04: copy only ("Scan QR code", "Enter it by hand"), as named in the brief.

## Other notes
- A Default member can read the department invite code and QR on `/settings/department` (shot 45). Not in the criteria; worth a security-model check.
- The brief's offline expectations assumed the queued sheet is reachable; it is not in a real browser.
