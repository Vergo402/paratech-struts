# #251 verification, spec 10 (Starting an operation)

- Date: 2026-10-13
- HEAD: 903a68e (branch v4-redesign). No source edits and no state-changing git commands.
- Harness: emulators (Auth :9099, RTDB :9000) plus `npm run dev:emu` on :5200. Both stopped at the end (ports verified free).
- Origins: device A = http://localhost:5200 (founder and Admin, 390x844 touch, Playwright persistent profile). Device B = http://127.0.0.1:5200 (second member, Default role, same dept "QA Dept 10"). A 1024x768 viewport was used once, for the tablet address check.
- Accounts: `qa251-10-1@example.test` (Admin) and `qa251-10-2@example.test` (Default). Passwords are not repeated here.
- Shots: `/Users/alex/Developer/paratech-struts/fieldshore/.claude/audits/phase-j/251-verify/10/shots/` (36 files, 01-34).
- Drive scripts (`t1`-`t18.mjs`, `t10.mjs` lib): `/private/tmp/claude-501/-Users-alex-Developer-paratech-struts-fieldshore/e3a5ad1b-080d-47ae-a256-05c55d148d62/scratchpad/`.
- Console baseline: marked after each page load. No new console errors in any flow except two external items (see Console notes).
- Positive controls:
  - The observer saw the EMPTY text in the start sequence and "Shore point added" as a role=status, so a flash or a toast would have been caught.
  - Admin A sees Start Operation on the same page where Default-role B does not.
  - The Start button is present whenever no op is active, so "no second Start button" could have failed.
- Brief says Admin-only gating; I confirmed it from both devices.

| # | Criterion | Verdict | Proof |
|---|---|---|---|
| 10-01 | Empty state, headline and primary button | PASS | Page text: "No active operation", "Start a shoring operation to begin tracking shore points", one button "Start Operation". Shot 01. |
| 10-02 | Start button >= 44px, on screen, no scroll | PASS | Bounding box 132.75 x 56 at y=189. scrollHeight 844 = viewport 844. |
| 10-03 | Opens a full-screen form dialog | FAIL (copy/minor) | role=dialog named "Start Operation", a modal and not a sheet. But it is a centered card, 358x581 at (16,131), not full-screen, and the empty state shows behind it (shot 02). `modal.md:114` and ADR-016 say the form variant "fills the screen". `.fs-modal` in `primitives.css:526` is `width:min(100vw-32px,480px); max-height:85vh`. No ADR or code comment names the change. |
| 10-04 | Name, address and Multi-building fields | PASS | Name placeholder "e.g. Cascade Building Fire". Address is a combobox with placeholder "Optional". Multi-building `aria-checked=false`. Labels are tied via for/id. |
| 10-05 | Start disabled for blank or whitespace name, no toast | PASS | Disabled for "" and "   ". 0 role=alert or role=status elements. The reason text "Enter an operation name" is always shown under the button, and tapping the disabled button changes nothing. Enabled with "QA Fire One". Shot 03. |
| 10-06 | Close dismisses with no state change | PASS | Typed a name, Close, empty state still shown, no op. Reopened with a blank name field. Focus returned to the Start button. |
| 10-07 | Confirm creates the op, h1 shows the name | PASS | The h1 reads "Trim Test" after Start. Shot 04. |
| 10-08 | Name trimmed | PASS | Entered "  Trim Test  "; the h1 is "Trim Test". |
| 10-09 | Empty state gone, Add Shore Point present | PASS | 0 Start Operation buttons. Floating pill "+ Add Shore Point", 159x52. |
| 10-10 | Empty board says so; lanes vs empty-state | PASS | The lanes appear, not the empty state: "Pending Equipment 0", "Equipment Assigned 0", "Strut Set 0", Cutting, Runner and so on. "No shore points yet" is not shown. This matches the spec wording, not the brief's expectation. Shot 04. |
| 10-11 | End Operation control, destructive modal, Cancel first | PASS | A button "End Operation" at the board foot opens "End Operation?" with buttons in order Cancel, End Operation, Close. Focus starts on Cancel. Cancel returns to the board with the h1 unchanged and focus back on the End button. Shot 06. |
| 10-12 | Address saved and pre-populated | PASS | "Addr Op" started with "123 Main St". The Edit form holds "123 Main St". It is not shown on the phone board (the spec allows that). The tablet display is covered by the NOT-BUILT row below. |
| 10-13 | Pencil opens "Edit Operation", pre-populated, Save | PASS | The "Edit operation" button is 44x44 beside the h1. The dialog is titled "Edit Operation" with the footer button "Save". Name, both switches and address were pre-populated (shots 07, 25). |
| 10-14 | Rename updates the h1 at once | PASS | The h1 read "Renamed Op" 200 ms after Save, with no intermediate value. Reopening Edit shows the new name. |
| 10-15 | Close without saving changes nothing | PASS | Typed "Should Not Save", Close. The h1 is unchanged and the reopened field holds the old name. No event was logged. |
| 10-16 | Save with no changes creates no change | PASS | The dialog closed and the h1 is unchanged. The IndexedDB event log has no OperationEdited between the creation and the first real rename. |
| 10-17a | Multi-building toggles after start and persists; Building field shows and hides | PASS | Off to on: the Add Shore Point form gains a required "Building" selector (shot 15). On to off: the field is gone. The setting survived a reload. |
| 10-17b | Default building for existing points; non-blocking inline warning | NOT-BUILT | With one shore point present, toggling on emitted only `OperationEdited{multiBuilding:true}`. No event touched the point, and the Edit form shows no warning or note (shot 13). The spec leaves both to Phase H. |
| 10-18 | Permission gate | PASS | B (Default role) on an empty board sees "No operation is active. An operations manager starts one." and 0 Start buttons (shot 27). With an active op B sees no pencil and no End Operation. A (Admin) sees all of them. |
| 10-19 | "Utilize Pending Card" toggle above Multi-building, with helper | PASS | The switch is `aria-checked=false` and sits above Multi-building. Helper: "On: save a Pending card... Off: find and deploy struts right in the form...". |
| 10-20 | Flip mid-incident; the Add Shore Point form follows | PASS | The Edit switch persists after reload. With stock (LS 406 x2): OFF shows "Find Available Struts" and "Save as Pending". After Find: "Deploy LS 406 ... from Engine 10", with rated capacity shown. ON shows no Find Available Struts and the footer button is "Add Shore Point". With no stock and OFF the form says "No stock available to deploy — this will be added to Pending". Shots 17-21. |
| 10-21 | Cross-device: start appears on B | PASS | B's empty state was replaced by "Sync Op" in about 90 ms (measured by a MutationObserver on B). Shot 28. |
| 10-22 | Cross-device: rename appears on B | PASS | B's h1 changed to "Sync Op Renamed" in about 78 ms. B also saw the End in 111 ms. |
| 10-23 | Offline start, then sync | PASS | With A offline, "Offline Op" started with no blocking error. The h1 appeared at 53 ms and the dialog was gone by 262 ms. B still showed "No active operation" during the offline period. On reconnect B showed "Offline Op" in about 103 ms. Shots 30, 31. |
| 10-24 | Offline indicator ("sync dot") | SPEC-DRIFT | Offline shows the banner "Offline — will sync when you reconnect"; after the offline start it reads "Offline — 1 change saved on this device — will sync when you reconnect". Nothing shows when healthy, and there is no always-on dot. `SyncBanner.tsx` header comment cites ADR-024 ("quiet when synced"). |
| 10-25 | Op name in persistent chrome | FAIL (copy/minor) | The shell header on Quick Find reads "FieldShore" and on Inventory reads "Inventory"; neither carries the op name. The name appears on Operations (h1) and in body text on the Command tab, not in the shell header. No ADR or comment drops it; `00-ia-foundation.md` §Persistent chrome still holds. Shot 29. |
| 10-26 | Dialog announced, focus in, Escape closes, focus returns | PASS | `dialog "Start Operation"` is announced. On open, focus lands on the name input (inside the dialog). Escape and Close both closed it and focus returned to the Start Operation button. |
| 10-27 | Accessible names | PASS | The label "Operation name" is bound via for/id and the snapshot reads `textbox "Operation name"`. The pencil is named "Edit operation" and the close control is named "Close". |
| 10-28 | After commit the board is the focus context | PASS | The first heading in main is the h1 with the op name. Caveat: `document.activeElement` is BODY after commit (the Start button unmounted). The snapshot reads: heading "Trim Test", button "Edit operation", then elapsed, period and points. |
| 10-29 | Only one op at a time | PASS | With an op active there are 0 Start Operation buttons. The only entry is the Edit pencil. |
| 10-30 | Persistence | PASS | A fresh browser context and a reload both show the op and its settings. Reload sequence: shell h1 at 233 ms, op name at 313 ms. There was no EMPTY flash and no spinner. |
| 10-31 | Long name at 390px | FAIL | See repro. `document.documentElement.scrollWidth` stays 390, but the layout breaks. |
| Deferred row (not a numbered criterion) | Address on tablet/laptop chrome | NOT-BUILT | On a 1024x768 viewport, "Tablet Op" with address "9 Elm Ave" never shows the address on the board (shot 34). |

## FAIL repro steps

- **10-31 (real bug):** Start any op, then Edit and set a name of 120 chars (60 L, a space, 59 W) or 120 X with no spaces. Save, on a 390x844 viewport.
  - The `h1` is `white-space:nowrap`, `flex:1 0 auto` (never shrinks), so the ellipsis never applies.
  - The board container (`.fs-ops-board`) becomes 374 wide but starts at x=-1564, so the name is clipped on the left and unreadable. For the no-space name the h1 is x=-1564, width 1902.
  - The lanes and the rest of the board drop out of view; only the pencil and the floating pill remain (shots 09, 10).
  - `.fs-ops-name` in `src/ui/operations/operations.css:112-124` and `OperationsBoard.tsx:1294`. The comment there says the name should stay whole.
  - No character-count indicator exists and the input has no `maxlength`. The page scrollWidth stays 390, so the check as worded passes while the board is unusable. Fix area: let the name wrap or ellipsize with `min-width:0`, `flex-shrink:1`, and a min-width of 0 on the board.
- **10-03 (copy/minor):** Tap Start Operation on /operations at 390x844. The form is a card inset 16px with a 131px top gap and a 581px height, not full-screen. `primitives.css:526-548` has no `--form` variant rule, although `Modal.tsx:62` adds the `fs-modal--form` class.
- **10-25 (copy/minor):** Start an op, open Quick Find or Inventory. The shell header shows only "FieldShore" or the tab name.

## SPEC-DRIFT list

- 10-24: the "sync dot" became a banner shown only when offline or queued (ADR-024, `SyncBanner.tsx` comment). It works as described.

## Deferred, not driven

- The End Operation full choreography and the equipment-deployed question (spec 16).
- Past-operations drill-in and re-open.
- Broadcast and cast surfaces (Deferred, #496).
- Google Places autocomplete (address typed by hand).

## Console notes

- One unattributed 404 on the first clean load of each profile (known noise). One `Transition was aborted because of invalid state` page error on B's first route change (known noise).
- Google Places 403 on A: `[AddressField] lookup failed: RpcError: Requests from referer http://localhost:5200/ are blocked`. It occurred only when text was typed into the address field. It is an external API key restriction and degraded gracefully, since hand-typed addresses saved.
- Sunlight and Light contrast of the form: the disabled Start button and the helper text measured 21:1 in Sunlight and 6.69:1 in Light. In Sunlight the disabled and enabled Start buttons look the same (black outline on white); only the "Enter an operation name" caption distinguishes them. Shots 32, 33.
