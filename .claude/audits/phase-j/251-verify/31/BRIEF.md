# #251 QA brief — 31 Audit log review

**Spec:** `docs/v4-design/09-workflows/31-audit-log-review.md` · **Phase G issue:** #236 (sub of #135) · **Built screen:** `AuditLogScreen` (`src/ui/admin/AuditLogScreen.tsx`), route `/audit-log`.

**Summary.** The IC or Operations Section Chief opens a read-only, newest-first record of everything that happened in an operation (who, what, when), narrows it by scope and text filter, taps a row to see its detail, and exports it. Nothing on the screen can edit or delete a log entry. The June spec had one position-gated log, a before-to-after detail panel, assembled ICS-201/208/PAR/PDF export, an after-action email, and a merged multi-agency roll-up. The build differs: two "views" (Incident = IC/Ops; Administrative = department admins), raw CSV only, no email sender, no mutual-aid guests. See section 4.

## 1. Setup (fresh department per HARNESS.md; two origins A = `localhost:5200`, B = `127.0.0.1:5200`)

1. Device A: `/auth` -> Create Account (display name e.g. "Capt Reyes", email `qa251-31-1@example.test`) -> Create department. Creator = first Admin (ADR-017), so A holds manageUsers (Administrative view).
2. Add apparatus (Inventory tab) so deploys have stock; start an operation from Operations tab (name it "QA Audit Op"). Make A the Incident Commander: Command tab -> set own ICS position (event text "Set own ICS position: Incident Commander"), or accept the default tree assignment. Verify the position via the Command rail.
3. Generate varied history so every badge appears: add 3+ shore points (Operations), advance one status, deploy a strut, log a hazard (Command/Hazards), rename or add an ICS position, tick a checklist item, start a new operational period (OP clock in Command header), add a Division. For the By-period test, roll the OP at least once with entries on both sides.
4. Device B (origin B): sign up a second member (`qa251-31-2@example.test`, "FF Okafor"), Join department via invite code from A (Settings -> Administration -> Users & roles), no admin permission, no IC/Ops position. Assign B a non-command position (e.g. Runner) from A so B's events carry a roster label.
5. Optional third account C with a custom role holding manageUsers but no ICS position (Administrative-only case): create role in Users & roles, assign to C.
6. Phone viewport 390x844 unless noted. Desktop (>=1024) for the rail-nav criterion.

Routes and labels (verified in `src/`): Settings tab -> **Administration** row (`/settings/administration`; phone Settings index lists it) -> **Audit log** row (`/audit-log`; description "Incident and governance record"). Screen: title **Audit log**, back button aria-label **Back to Settings**, **View** segmented (Incident / Administrative), lock line, filter input aria-label **Filter the log** (placeholder "Filter by person, action, time..."), **Scope** segmented (All / By action / By person / By period), export button aria-label **Export this view as CSV** (visible text "CSV").

## 2. Criteria

| ID | Criterion (observable outcome) | Tag | Spec § | How to drive / what to read |
|---|---|---|---|---|
| 31-01 | IC on A: Settings -> Administration shows an enabled **Audit log** row; tapping it opens `/audit-log` titled **Audit log** | Testable | Actors; Step 1 | Phone viewport. Read row description "Incident and governance record" |
| 31-02 | Reach path: from the Audit log screen the back button (aria-label "Back to Settings") returns to Settings | Testable | Step 1 mock `< Settings` | Tap back; URL becomes `/settings/account` |
| 31-03 | Position gate: B (no IC/Ops position, no manageUsers, so no Administration audit entitlement) cannot read the log. Either Administration/Audit log row is absent or disabled with the text "Requires Incident Commander or Operations assignment in an active operation, or user-management permission" | Testable | Cross-surface (non-IC/Ops) | On B open Settings; if Administration is hidden, navigate `location.assign('/audit-log')` directly |
| 31-04 | Direct URL `/audit-log` on B shows the locked state: headline **Command record**, reason "The audit log is for the Incident Commander, the Operations Section Chief, or a department admin.", action **Back to Settings**; no log rows rendered | Testable | Cross-surface; SR script | Read DOM; confirm zero `.fs-al-row` |
| 31-05 | Gate is position-based, not role-based: after A gives B the Incident Commander (or Operations Section Chief) position via command transfer / role assignment, B's Audit log row enables and the Incident view opens. Reverting the position re-locks it | Testable | Role gate (#217 / CH-8) | A assigns B in Command tab; reload B. Note: #217 on the board is only the Phase F gate notification, CH-8 text is not in the issue; the rule is carried in the specs and `useAuditAccess` |
| 31-06 | Admin without a position (C, or A with no IC position) sees only the **Administrative** view; no View segmented is shown when only one face is allowed | Testable | Role gate | Read DOM for the "View" segmented absence; lock line reads "Department record / Admins only" |
| 31-07 | A holder of both entitlements sees a **View** segmented (Incident / Administrative); switching resets filter text, scope = All and collapses any expanded row | Testable | Step 1 (partial) | Tap each segment; check filter input empty |
| 31-08 | Incident view lock line shows the operation name and "IC / Operations" with a lock icon | Testable | Actors | Read `.fs-al-lock` text: "QA Audit Op" + "IC / Operations" |
| 31-09 | Rows are newest-first: the last action performed appears at the top; each row shows one action line, a text **badge** (e.g. Status, Operation, Org, Hazard, Checklist, Command), and "actor . HH:MM" meta | Testable | Step 1 | Do a fresh action, reopen; compare top row. Badge is text, not color alone |
| 31-10 | Actor attribution: A's own rows show "You"; rows by a device with a roster label show that name; rows by an unlabelled device show "A device" (not a raw uid) | Testable | Step 1 (role-at-time) | Compare A and B rows. Spec says "role-at-time"; build shows name only (see 31-26) |
| 31-11 | The log is read-only: no edit, delete, or clear control exists on any row, header, or in the expanded detail | Testable | State diagram note; Reversibility | Inspect DOM for buttons beyond back, CSV, segmenteds, filter, rows |
| 31-12 | Tapping a row that has detail expands it inline (not a sheet or modal) showing the detail text and the full date-time; tapping again collapses it; `aria-expanded` toggles | Testable | Step 2 | Tap a HazardLogged row (detail "type . severity . notes") and a ComponentResourced row; confirm no dialog role in DOM |
| 31-13 | Rows with no detail are static (no `aria-expanded`, tap does nothing) | Testable | Step 2 | Tap an "Operation ended"/"Checklist" row without detail |
| 31-14 | Entry detail in the build is a description line, not a literal "Before ... now ..." state diff | Superseded (build design, see section 3) | Step 2, SR script | Record what detail shows; do not fail for missing before->after |
| 31-15 | Scope **All** shows the flat newest-first list; **By action** groups under badge headers (e.g. "Hazard", "Org"); **By person** groups under actor labels; **By period** groups under "OP n" headers ascending, newest-first within | Testable | Step 1 scope; state diagram | Tap each Scope option; read `.fs-al-group` headers |
| 31-16 | **By period** appears only on the Incident view; it is absent on the Administrative view | Testable | Step 1 (M12, ADR-039) | Switch View, read Scope options |
| 31-17 | Period grouping is correct: entries made before and after an OP rollover appear under the matching "OP 1" / "OP 2" headers | Testable | Step 1 (M12), ADR-039 | Compare timestamps with the OP clock rollover |
| 31-18 | Text filter narrows rows live by action text, detail, actor, or badge; clearing restores | Testable | Step 1 filter | Type "hazard", "You", a position name |
| 31-19 | Filter with no match shows the filtered empty state: headline "No matching entries", reason "No log entries match your filter.", action **Clear filter** that empties the input | Testable | Empty states | Type "zzzz"; tap Clear filter |
| 31-20 | Date-range filter exists | Testable (expect NOT-BUILT) | Step 1 "search / date-range" | Filter is free text only, placeholder says "time" but no date control; record NOT-BUILT, and whether typing a time like "14:" matches |
| 31-21 | Operation with no events/log (fresh dept with no operation yet and admin-only access) shows "Nothing logged yet / The log fills as work happens." | Testable | Empty states | Administrative view on a brand-new dept before any admin action is hard (create dept may log); otherwise skip with reason |
| 31-22 | Administrative view lists governance entries (member invited, role created/changed, rank/title set, member revoked) with the actor's display name, written by Users & roles actions | Testable | Step 1 (record shape; not in June spec) | On A in Users & roles create a custom role, then open Administrative view; expect a new top row |
| 31-23 | Export: with at least one visible row a **CSV** button (aria-label "Export this view as CSV") is shown; tapping downloads `fieldshore-audit-incident.csv` (or `-administrative`) with header `When,Type,Action,Detail,By` and one line per currently filtered row | Testable | Step 3 (raw CSV) | Intercept the anchor download / Blob in the page (`download` util); read the content. Apply a filter first and confirm only filtered rows export |
| 31-24 | CSV hygiene: a shore point/position named `=1+1` exports with a leading apostrophe; the "By" column falls back to the raw device uid when no name resolves | Testable | Step 3 | Create a position titled `=cmd`; export; read cell |
| 31-25 | No export button when zero rows (empty or filtered-to-nothing) | Testable | Empty states | Filter to nothing, confirm CSV button disappears |
| 31-26 | Role-at-time badges beside the actor (e.g. "Lt. Cho (Rescue Group Supervisor)") on each row | Testable (expect NOT-BUILT) | Step 1; SR script | Events store `by` + `at` only (`describe.ts` header comment: role-at-time not persisted). Record NOT-BUILT unless a role appears next to the actor |
| 31-27 | Cross-device: an action performed on B (e.g. B advances a shore point) shows in A's Incident log on A without manual refresh once synced, attributed to B's roster label | Testable | Cross-surface | Perform on B; watch A (live listener) or reload A |
| 31-28 | Offline: with A offline the Incident log still opens and shows locally held events (log is local); on reconnect, events from B appear and the order is the canonical cloud-receipt order | Testable | Reversibility; ADR-041 | HARNESS offline recipe; no "Loading..." spinner stuck on Incident view |
| 31-29 | Race-lost changes stay in the log, annotated: a change that lost an offline race shows its text ending " - no effect" (em dash) and muted styling | Testable (replacement for spec silence) | n/a (ADR-041 D3, #499) | Two-device offline edit of the same field (e.g. rename same position), reconnect, read the loser's row text |
| 31-30 | After End Operation, the ended operation's log remains readable: Audit log opens for the ex-IC and shows the final "Operation ended" row; lock line shows that operation's name | Testable | Goal ("after the incident") | End op on A (Operations -> End Operation -> confirm "End Operation?"); open Audit log |
| 31-31 | Re-opening an ended operation (ADR-036) adds an "Operation re-opened" row; the log is append-only (earlier rows unchanged) | Testable | Reversibility; ADR-036 | Reopen from past operations; compare |
| 31-32 | Accessibility: back, CSV, filter, scope/view segmented options and rows are keyboard-focusable with a visible focus ring; row tap target height >= 44px (build uses 48px); filter has aria-label "Filter the log" | Testable | Accessibility; "48pt targets" | Measure `getBoundingClientRect` on rows/buttons; Tab through |
| 31-33 | Screen-reader script "Audit Log. Read only. Scope and filter the incident record." and "All, selected" style announcements | Testable (expect NOT-BUILT) | Accessibility | Search DOM for that string/aria-live; record absent unless found |
| 31-34 | Desktop: Settings side rail lists Administration only for users with the entitlement; Audit log still reached through Administration (no separate rail entry); no broadcast render of the log | Testable | Four-surface table | Viewport >=1024; check rail; Broadcast view must not contain the log |
| 31-35 | Position-gate edge: an IC who is not admin sees the Administration row/page (visible via `canIncident`) | Testable | Role gate | Check B after 31-05 shows Administration in Settings |

## 3. Superseded / Deferred / out-of-scope

| Spec item | Tag | Citing decision |
|---|---|---|
| Assembled **ICS-201, ICS-208, PAR snapshot** export, **PDF** export, **Export PDF** button, "Export CSV / Export PDF" pair | Deferred (#494, ruled by Alex 2026-08-17; spec Step 3 amended in `53-audit-log.md`) | Build has one **CSV** button, raw only. `53-audit-log.md` "Amended 2026-08-17" |
| ICS-203/207/209 formatted forms | Deferred (v4.1, spec Step 3 / #494) | n/a |
| **After-action auto-email** actually sent on End Operation (spec Step 4) | Deferred (#495, ADR-018 amended) | Only the department policy toggle exists: Settings -> Administration -> "Send after-action record by email" (default on). Test the toggle only: on by default, persists across reload (Testable, see below) |
| "Audit Log and email draw from the same assembled packet" | Deferred (#494/#495) | n/a |
| Merged multi-agency roll-up, guests attributed "Guest . unit tag" (Open Q5) | Deferred (#493, ADR-022 amended) | Not drivable |
| Single position-gated log for IC/Ops only | Superseded (#429 and Administration gateway) | Build adds an **Administrative** view for manageUsers admins who hold no ICS position; entry is enabled by either entitlement (31-06). `AdministrationPage.test.tsx` "Audit log gateway (#429)" |
| Entry visible-but-locked in Settings for non-IC (spec "documented exception to hide-not-grey") | Superseded | Row is disabled with an explanatory description; deep link shows the "Command record" locked state (31-03/04) |
| Inline panel as a side panel on tablet/laptop, filter rail on tablet | Superseded | Build uses one inline expansion layout at all widths (no filter rail); record rather than fail |
| Before -> after state diff in detail (31-14) | Superseded (event shape) | Events have no stored before/after; `describe.ts` renders text plus optional detail line |
| Role-at-time on events (D7.5) | not stored; see 31-26 tag | `describe.ts` header comment |
| Export "records an export event" | Not testable as stated | No export event exists in the event schema; confirm by checking no new row appears after CSV export (Testable, add as observation to 31-23) |
| Laptop ICS assembly region | Deferred (#494) | n/a |
| Virtualized list for 1000+ events (K-15) | Testable only via seeding; low priority, not included. QA may bulk-seed events and record scroll responsiveness as an observation | n/a |
| `99-open-questions.md` #32 review UI v4.0 vs v4.1 | Resolved by build: ships v4.0 | n/a |
| ADR-018 policy toggle | Testable (extra): the toggle "Send after-action record by email" defaults on, flips off/on, persists after reload; no email is sent either way | Not in the spec's criteria; add as 31-36 verdict note |

## 4. Risks for the QA agent

- "#217 CH-8" text is not in the GitHub issue (#217 is just the Phase F gate notification). The gate rule comes from the specs; do not call a missing issue body a bug.
- The CSV button lives in the header and only appears when there are rows; the download is a Blob/anchor click, so capture it with a page hook rather than looking for a file.
- Actor names depend on the roster: events store only a device uid, so rows from a device never assigned to a position show "A device". That is expected.
- The By-person grouping uses `You` / name / `A device` labels, the By-action grouping uses the badge word; group headers are `<p>` not headings.
- The ex-IC read of an ended operation depends on past-operation loading; allow a moment for "Loading..." on the Incident view.
- After End Operation or a role change, reload the other device; `useAuditAccess` reads the live org, so stale permissions can briefly show the old state.
- TanStack `<Link>` / Settings navigation may ignore synthetic clicks (HARNESS); use `location.assign('/audit-log')` or `/settings/administration`.
- Governance entries are fire-and-forget: a just-made admin change may take a moment to appear; the Administrative view has a Retry action when the read fails.
- Search the filter string against the displayed text, not the badge color. Timestamps use local time in `HH:MM` 12/24h per browser locale.

## Orchestrator addendum (2026-10-21, HEAD 5cb1bbd)
- Positions follow the ACCOUNT (552faca): IC/Operations Section Chief gating of the audit log is judged by the signed-in account (spec 24 saw a non-admin Safety Officer blocked with "Requires Incident Commander…" — ADR-017 line 39).
- Known from today's passes (cite, do not re-file): audit rows for another device's events render the actor as "A device" and own events as "You" (specs 22/24); checklist TEMPLATE edits are not audited (#553); hazard CSV export is not audited (decisions list); the Audit log page did not update live while open in spec 22 (rows appeared after reload) — if you see that again, record it as a FAIL with repro (it has no issue yet).
- Wood is required at Add Shore Point (2026-10-17). After-action email send Deferred (#495); broadcast Deferred (#496).
