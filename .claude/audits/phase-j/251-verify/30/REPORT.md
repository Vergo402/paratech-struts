# #251 verification, spec 30 (User management, roles & members)

- Date 2026-10-21. HEAD 5cb1bbd (v4-redesign), no source edits, no state-changing git. Ports 5200/9000/9099/5001 free before; all stopped after.
- Emulators: auth+database+functions (functions :5001 up, provisioning worked). Origins: A http://localhost:5200 (Cruz, Admin, 390x844 touch), B/B2/B3/S/S2/J on http://127.0.0.1:5200 (Dana, Sam, Joiner), C/C2/P on localhost (Lee, Pat). Dept "QA Dept 30", accounts qa251-30-1..6@example.test.
- Console baseline 2 (vite debug) before first load. After the mark: no unexpected errors. Expected ones only: 400 signInWithPassword (wrong starter / old password controls), 400 accounts:lookup (token revoked after password reset), 403 provisionAccount (non-Admin granting Admin, denied), one known-noise "Transition was aborted".
- Screenshots: .claude/audits/phase-j/251-verify/30/shots/ (00-87+). Scripts: scratchpad qa-251-30/*.mjs.

| # | Criterion | Verdict | Proof |
|---|---|---|---|
| 30-01 | Reach via Settings > Administration > Users & roles; h1 "User manager"; back returns | PASS | Row click -> /users, h1 "User manager"; "Back to Settings" -> /settings/account (shot 02). |
| 30-02 | View segmented Members/Roles, Members default, AT state | PASS | radiogroup aria-label "View", Members aria-checked=true; Roles swaps list. Actual AT is radio "checked", not the spec's "Members, selected" (copy note). |
| 30-03 | Tablet/laptop: both faces side by side | NOT-BUILT | 1024x768 non-touch: still one face plus the View segmented; "built-in · editable" absent on Members face (shot 85). |
| 30-04 | Members rows: name, role badge, own "· you" non-tappable, creator Admin | PASS | "Cruz · you / Admin" is a DIV; others buttons with Default/custom badges. "Members (N)" count not built (noted in brief). Admin's name shows as plain "Cruz". |
| 30-05 | Roles list tags and summaries | PASS | Admin "Full access / built-in", Default "Read · field work / built-in · editable", customs untagged with summaries (shot 20). |
| 30-06 | Member sheet lists roles; current checked+disabled; reassign no confirm; badge updates | PASS | Dana: Default dis+cur; picked Crew Lead, no modal, badge "Crew Lead" (shots 21-22). |
| 30-07 | Reversible, no timed undo | PASS | Re-picked Default; badge returned; no toast/status. |
| 30-08 | Promote to Admin via assign sheet | PASS | Lee -> Admin via sheet, badge Admin (shot 44). Folded flow, note only. |
| 30-09 | Demote Admin via re-assign with second Admin | PASS | Cruz moved Lee Admin -> Default (shot 48). |
| 30-10 | Single-Admin anti-lockout with reason, not silent | PASS (copy differs) | Dana (User Mgr) opened sole Admin Cruz: role rows disabled "Only an Admin can change an Admin"; Revoke access disabled with "Promote another member to Admin first" (shot 28); footer "The last Admin can't be revoked or demoted". Admin-viewer variant unreachable in UI (needs 2 Admins, then target isn't last); LAST_ADMIN copy on role rows not reachable by a non-Admin viewer (non-Admin reason wins). |
| 30-11 | Admin cannot demote/revoke self; own row has no sheet | PASS | Own row DIV on A and on Lee's device (2 Admins) (shots 45). "Another Admin must make this change" copy not reachable via UI (own row has no sheet). Server also denies (30-12). |
| 30-12 | Server-side last-Admin enforcement | PASS | In-page SDK as sole Admin: demote self -> PERMISSION_DENIED; active=false self -> PERMISSION_DENIED; positive control Admin sets Pat role OK. Stale-Admin Lee (demoted) write denied with inline "You don't have permission for that change." |
| 30-13 | Create role sheet, 8 labelled toggles, summary | PASS (note) | Fields/labels as brief; NEW role is prefilled with Default perms (Read + Run field work ON), not all off. Crew Lead saved, summary "Read · field work · operations". Labels "Manage roster", "Export / delete data" = SPEC-DRIFT copy. |
| 30-14 | Toggles operable by keyboard/AT, visible state | PASS | role=switch with aria-checked, accessible names = labels; Space toggles on/off; thumb moves + gold fill (shot 17). |
| 30-15 | Edit role prefilled; Save updates; Cancel discards | PASS | Cancel after flipping Read: reopen shows Read false; Save: summary updated (shots 19-20). |
| 30-16 | Default editable w/ disabled name; Admin not tappable | PASS | Default name field disabled, no Delete role; Admin row DIV, no chevron. |
| 30-17 | Role change reaches the member's device silently | FAIL | Assigning a different role (Default -> User Mgr) did NOT reach Dana's already-signed-in device even after reload (still "Default", no Administration row; shots 23-24); fresh-device sign-in picked it up (B2, shot 25) - same as 25/REPORT.md, session role cached at sign-in. Positive path works: editing a role's PERMISSIONS propagates live, silently, hide-not-grey (J gained then lost "Users & roles" within 1.5 s, no alert/status nodes, shots 86-87). Related: Lee demoted from Admin kept Admin UI until reload; server denied writes. |
| 30-18 | Non-manageUsers: row hidden; /users "Admin access only" | PASS | Dana (Default): Administration shows only greyed Audit log; /users -> "Admin access only" + "Back to Settings" (shots 13-14). Control: A sees the row. |
| 30-19 | manageUsers custom role: add/revoke/assign non-Admins; Roles read-only; no Admin grant | PASS | Dana (User Mgr, fresh sign-in): added Sam, assigned Crew Lead, revoked Sam; Roles rows DIV with "Only an Admin can create or change roles"; Admin pick "Only an Admin can grant Admin"; no Reset/email controls; Add-member role picker still lists Admin, server returned 403 and inline alert "Only an Admin can add another Admin." (UI offers it then denies; minor). Cites #463/J257. |
| 30-20 | Revoke modal copy, Cancel default focus | PASS | Title "Revoke access?", body names member, loses access immediately, record stays; focus on Cancel; class fs-modal--destructive (shot 36). Title generic = copy drift. |
| 30-21 | Cancel no-op; Revoke marks Revoked, not deleted | PASS | Cancel: Sam row unchanged; Revoke: "Sam Park / Revoked / Reactivate" (shot 37); DB active=false. |
| 30-22 | Revoked member's device loses access; earlier actions remain in Audit Log | PASS (caveat) | Already-open device (S) was NOT signed out (even after reload, stale UI); its write was denied: "1 change haven't synced yet - retrying", cloud lacks it, direct SDK write PERMISSION_DENIED (shot 40). Fresh sign-in as revoked member lands on "Set up your department"; reads denied (shot 41). Audit Log (Administrative, By person) still lists revoked Dana's earlier rows under DANA REYES (shot 83). No explicit "your access was revoked" message. |
| 30-23 | Reactivate | SPEC-DRIFT | Superseded table names it. Reactivate restores the active row (Sam, Pat); Sam signed in and worked afterwards (shots 32-33). |
| 30-24 | Delete custom role: modal, Cancel default, holders -> Default | PASS | "Delete role?" body "Anyone holding Temp moves to the Default role"; focus Cancel; Cancel keeps; confirm removes; Lee badge Default; no Delete for Admin/Default (shots 50-51). Audit log shows raw role id for one entry (see notes). |
| 30-25 | Failed governance write shows inline alert, no false success | FAIL | Denied writes DO show inline alerts (Lee stale-Admin, Dana->Admin). Offline: Revoke confirm leaves modal open with button disabled and NO alert for 8+ s (shot 56-58); the write stays queued: after Cancel and reconnect the revoke LANDED (Pat revoked in DB and UI) though the admin cancelled the modal. Repro below. |
| 30-26 | Add member + hand-over panel + starter badge | PASS | Create account disabled with reason "Enter at least a name and email"; starter shown live (reyes123!); "Account created" panel with email + starter; row shows "starter" key badge (shots 04-07). |
| 30-27 | Set-your-password gate | PASS | Gate fields Starter/New/Confirm, "Save and continue"; errors: mismatch "Those new passwords don't match.", same "Pick a password different from the starter.", short, wrong starter; success reaches app; Admin list badge gone (shots 08-12). |
| 30-28 | Reset password to starter | PASS (caveat) | Modal "Reset Dana Reyes's password?" showing starter, Cancel focused; Cancel no-op; confirm returns "starter" badge; old password rejected, starter works then gate. Open device not signed out within 6 s, signed out (400 lookup, "Sign in to continue") on reload (shots 52-55, 82). |
| 30-29 | Invite code regenerate | PASS | Modal names old code, Cancel focused; Cancel keeps; confirm issues new code; join with old code: "That code has expired. Ask your Admin for a new one."; new code joins (control) (shots 59-62). |
| 30-30 | Touch targets >= 44px | FAIL | 390x844: back 40x40, Reactivate 73x24, sheet Close 388x40; OK: segmented 46, rows 48+, picks 48, buttons 48, toggle rows 48 (switch 52x32), modal buttons 56. |
| 30-31 | Screen never alters ICS gating (Read-only member as IC) | PASS | Pat (Read Only) was handed command by Cruz (coded transfer), accepted, showed as IC with Transfer and org-edit controls, initiated a transfer back to Cruz that Cruz accepted; cloud has CommandTransferInitiated/Accepted (shots 72-81). Settings still reads "Read Only". |
| 30-32 | Governance changes in Audit Log attributed to acting Admin | PASS | Administrative face lists role/member/password/revoke events "Cruz . time", By person groups (shot 42, 83). Row text "Incident and governance record". Copy defects: raw "Governance action: inviteCodeRegenerated" and "Lee Cho assigned role: <raw role id>" after the role was deleted. |
| 30-33 | Second Admin device shows updated lists | PASS (caveat) | Lee (Admin, device C2) did not update live in 6 s after Cruz changed Pat; after revisiting the screen it showed Read Only (shots 47). |

## FAIL repro steps
- 30-17: Cruz assigns Dana a different role while Dana is signed in on another profile; Dana reloads: Settings still shows old role, no Administration row. Only a new sign-in refreshes it. (Role-permission edits do propagate live.)
- 30-25: Cruz on /users, goOffline(rtdb) + `offline` event; Pat sheet > Revoke access > confirm. Modal stays open with disabled button and no `role=alert`; tap Cancel, go online: Pat becomes Revoked.
- 30-30: measure `.fs-um-reactivate` (73x24), `.fs-um-back` (40x40), sheet Close (40 high).

## SPEC-DRIFT list
30-23 (Reactivate, Superseded table); copy: toggle labels "Manage roster"/"Export / delete data", generic revoke title, radio vs "selected" AT phrase, 30-10 reason copy by viewer.

## Other observations (not filed)
- New role starts with Read + Run field work on.
- Add-member role picker lists Admin to non-Admin managers (server denies with inline message).
- Audit log defaults to the Incident face when an op is active; governance entries are under Administrative.
- Revoked or reset members' already-open devices stay signed in until reload/token refresh.
- #552 class (custom role reaching Admin-only screens) not seen here: User Mgr correctly blocked from role authoring and credentials.

## Deferred, not driven
2FA org policy (OQ5), member CSV export (OQ4, not built; Import CSV only presence-checked), tamper-proof rules (#512/ADR-042, #520), #509, broadcast surface (#496).
