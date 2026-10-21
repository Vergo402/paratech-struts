# #251 verification, spec 25 (Customizing checklists, department editor)

- Date: 2026-10-21. HEAD 5a8666e (v4-redesign), no source edits, no state-changing git. Ports 5200/9000/9099 free before; servers stopped after.
- Origins: A http://localhost:5200 (Reyes, Admin/IC, 390x844 touch), B http://127.0.0.1:5200 (Okafor, Default role), profile C/C2 on localhost (Lite, custom role "Settings Lite" = Read + Run field work + Manage department settings).
- Dept "QA Dept 25", accounts qa251-25-1/-2/-3 @example.test. Op "Warehouse Collapse" started. Console baseline 2 (vite debug) before first load. After the mark: 0 error-level messages and 0 failed (>=400) responses in every online script on A and B; the only errors were 3x "Failed to load resource: net::ERR_FAILED" in the deliberately offline run (aborted Auth requests, expected) and one known-noise "Transition was aborted" on C2.
- Screenshots: .claude/audits/phase-j/251-verify/25/shots/ (00-34). Scripts: scratchpad qa-251-25/*.mjs.

| # | Criterion | Verdict | Proof |
|---|---|---|---|
| 25-01 | Checklists section, exactly three cards with badges | PASS | /settings/administration: section "Checklists" with IC Command Checklist, Task Level Checklist, Risk briefing (ORM/TCRM), each with a `.fs-cke-badge` (shot 01). |
| 25-02 | Never-edited badge "FieldShore baseline" | PASS | All three read "FieldShore baseline" on the fresh dept (shot 01). |
| 25-03 | Non-Admin: section absent | PASS | B (Default) /settings has no Administration row; direct /settings/administration shows only Audit log (greyed, "Requires Incident Commander..."): 0 `.fs-cke-card`, no "Checklists" text, 0 Edit buttons (shots 19, 20). Positive control: A sees 3 cards. |
| 25-04 | Custom role with only manageSettings must NOT edit | FAIL | C2 ("Settings Lite", manageSettings only) sees all 3 cards, edited Task Level (badge flipped, cloud `orgs/<dept>/checklists` contains the step), then reset (shot 33). Gate is `perms.manageSettings` in AdministrationPage.tsx:87 and the RTDB rule on `checklists`; ADR-020 point 2 says Admin-only, no new toggle. Code comment in ChecklistEditor.tsx header: "Admin-gating is deferred to the RBAC session (ADR-017)" - deferral only, no ruling. Orchestrator may prefer SPEC-DRIFT. Setup note: a role assigned on A did not reach the already-signed-in device (session role is cached; only a fresh-device sign-in, profile C2, picked up the new role). |
| 25-05 | Edit opens in place, Done closes | PASS | Edit flips to "Done", tree rows appear in the card; Done returns to "Edit", 0 rows. |
| 25-06 | Sections with steps, per-section + Add step, footer + Add section | PASS | IC editor: 6 sections, 6 "+ Add step", 1 "+ Add section" (shot 02). Note the baseline IC tree nests sections (Phase I > Primary assessment, Establish command). |
| 25-07 | + Add step inline field, Save/Cancel | SPEC-DRIFT | Inline input aria-label/placeholder "New step", autofocused, Save (64x48) and Cancel (78x48); Enter and Save append at end of the section; Cancel and Escape discard (badge stayed baseline); empty Save closes without adding (shot 03). Spec's sheet + text-area is named in the brief's Superseded table. |
| 25-08 | + Add section | PASS | Field "New section"; Save adds an empty root section with its own "+ Add step" (shot 05). |
| 25-09 | Edit prefilled, Save renames, empty ignored | PASS | Field aria-label "Step label" prefilled with current text; rename applied; empty Save closes and keeps the original (shot 06). |
| 25-10 | Baseline step wording editable | PASS | "Final PAR" renamed to "Final PAR (renamed)", survives reload. |
| 25-11 | First edit flips badge, shows Reset | PASS | Before: badge "FieldShore baseline", no Reset link. After one add: "Customized by QA Dept 25" (exact dept name) and "Reset to FieldShore baseline" (shot 04). Stale-frame probe: badge and Reset flip together on the first frame after Save (no flicker back). |
| 25-12 | Other checklists unaffected | PASS | After the IC edit, Task and TCRM badges stayed "FieldShore baseline" (matched control). |
| 25-13 | Keyboard reorder, crossing sections | PASS (caveat) | Grip ArrowUp/Down moves a step within a section with focus kept; at a section end ArrowDown moved "Estimate victim count" into the next section; ArrowUp at a section start moved it back to the previous section; a section moves past its sibling and carries its steps. Caveat: after a boundary-crossing move focus drops to BODY (row remounts under a new parent), so a second arrow press does nothing until the grip is re-focused. |
| 25-14 | Drag reorder, drop indicator | PASS | Real mouse events with pointer capture: step dragged into another section (before a row; `.fs-cke-drop` indicator count 1 during drag), step dropped INTO a section by hovering its header (`.is-droptarget` 1), section dragged to root with its two steps (shots 08, 09). |
| 25-15 | Move up/down/under buttons for AT | NOT-BUILT | 0 buttons matching Move up/down/under at 390x844 and in the accessibility tree; arrow keys on the grip (`aria-keyshortcuts` "ArrowUp ArrowDown", `aria-roledescription` "Drag handle") are the only non-pointer path. |
| 25-16 | Remove step modal | PASS | Dialog title `Remove "Schedule after-action review"?` (curly quotes), body "This removes the step for your whole department.", buttons Cancel / Remove, class fs-modal--destructive (shot 10). |
| 25-17 | Remove section copy | PASS | Body "This removes the section and every step under it. This affects the whole department." for an empty and a non-empty section (shot 11). |
| 25-18 | Cancel keeps; focus on Cancel; Remove deletes | PASS | activeElement = Cancel inside the dialog on open; Cancel left step and section; Remove deleted the step (24 to 23 rows) and the section. Cosmetic probe: during the fade-out the title blanks at +67 ms while the body stays (title derives from the cleared target). |
| 25-19 | Reset modal copy, default Cancel | PASS | Title "Reset IC Command Checklist?", body "This discards your department's customizations and restores the shipped FieldShore version.", Cancel / "Reset to baseline", focus on Cancel (shot 17). |
| 25-20 | Reset restores baseline, badge back, link gone | PASS | IC tree 22 rows back to the original 21-row baseline, identical order and depth to the fresh capture; badge "FieldShore baseline"; Reset link gone (shot 18). |
| 25-21 | Cancel on Reset keeps customization | PASS | Cancel: badge still "Customized by QA Dept 25", 22 rows, custom step present. |
| 25-22 | Edits persist across reload and offline | PASS | Reload: badge and edits persist (card closed, Reset link only while editor open). Offline cold load (Auth aborted, :9000 WS closed, onLine=false): customized badges and edited tree shown; an edit made offline applied, survived an offline reload and showed in the Task drawer; back online it reached the cloud blob and device B's drawer. |
| 25-23 | Crews see the dept tree, live | PASS | Same page session, client-nav Settings to Command/Operations: IC drawer shows added/renamed/removed steps; Task drawer and TCRM modal show renamed wording at once (shots 13-15). |
| 25-24 | Provenance marker on IC / Task / TCRM screens | NOT-BUILT | After forking all three, no "Customized by", "baseline" or dept name in any of the three surfaces nor page-wide on /operations and /command; `grep "Customized by" src` hits only ChecklistEditor.tsx. Matches the addendum (drawers show no cue). |
| 25-25 | B sees A's edit, no push | PASS | B (Default, no reload) Task drawer showed A's new step within the first poll (<0.5 s) and TCRM wording "(renamed)" (shot 28, 30); MutationObserver on B recorded 0 alert/status/toast nodes; positive control: the same observer caught "Offline - will sync when you reconnect" when B went offline. Caveat: B has no IC Checklist tab (0 `.fs-checklist-tab`; IC drawer is position-gated), so IC was not visible on B. |
| 25-26 | B keeps editor hidden while receiving fork | PASS | Same B session: 0 editor cards and no "Checklists" text while the Task drawer carried A's edit. |
| 25-27 | Reset on A reverts B | PASS | A Reset on Task: B's open drawer dropped the added step without reload (<1 s), badge on A back to baseline; reload on B confirms 11 leaves (shot 29). |
| 25-28 | Attestations survive a rename | PASS | Task, IC and TCRM each: attested a step ("Incident Commander . 15:4x"), renamed it in Settings, reopened: new label, check mark and signature intact (shots 12, 13). |
| 25-29 | Template edits audited | NOT-BUILT | After ~20 template edits/resets the Audit log lists only op start, attestations and briefing start (shot 16). checklistTemplateStore.ts header: audited-surfacing "deferred to the audit-log build". ADR-020 line 58 and line 97 still require it; no issue defers it, so file it. |
| 25-30 | 48pt tap targets | FAIL | Measured at 390x844: Edit/Done card button 66x48 OK, Save 64x48 and Cancel 78x48 OK; grip 28x40, row Edit 37x24, row Remove 60x24, "+ Add step" 141x28, "+ Add section" 159x28, "Reset to FieldShore baseline" 173x24, input 40 high. Edit/Remove/Add/Reset links are far under 48. |
| 25-31 | TCRM row note "Content ships v4.1 . structure on" | NOT-BUILT | TCRM card is just name + badge + Edit; string absent from src. |
| 25-32 | Section intro copy | SPEC-DRIFT | Build copy: "Tailor the IC Command, Task Level, and risk-briefing checklists for your department. Editing one forks it from the FieldShore baseline - crews see "Customized by QA Dept 25" so a tailored step never reads as FieldShore doctrine." Note it promises a marker crews never see (25-24). Recorded for the drift list. |
| 25-33 | Screen-reader names | FAIL (copy/minor) | Literals: grip button "Reorder <label>" (roledescription "Drag handle", keyshortcuts ArrowUp ArrowDown); inputs "New step", "Step label", "New section"; badge is plain adjacent text in the card; Edit/Done button "Edit"/"Done"; no editor title/heading or region per card; no "Edit step. <text>" announcement (inline input, sheet drift). Not named by the Superseded table: every row's Edit/Remove and each "+ Add step" expose identical accessible names ("Edit", "Remove", "+ Add step") with no row context, so a screen-reader user cannot tell which row they act on. |

## FAIL repro steps
- 25-04: Users & roles > Roles > Create role "Settings Lite", leave only Read, Run field work and Manage department settings on; assign it to a member; sign that member in on a fresh profile (cached role is not refreshed on an already-signed-in device). Settings > Administration shows the Checklists editor; Edit Task Level, add a step: badge flips to Customized and `/orgs/<dept>/checklists` holds the step.
- 25-30: Settings > Administration > Edit any checklist at 390x844; measure `.fs-cke-text`, `.fs-cke-add`, `.fs-cke-handle` bounding boxes (24-40 px high).
- 25-33: open the accessibility tree of an open editor: repeated nameless "Edit"/"Remove"/"+ Add step" buttons.

## SPEC-DRIFT
- 25-07 (inline field instead of sheet, Superseded table); 25-32 (section copy). 
- Observed, not rowed: Remove titles use curly quotes; Edit/Done sits on the card header and the editor has no title.

## Other observations
- 25-13 focus loss after boundary-crossing keyboard move (see above).
- Remove modal title blanks during the fade-out; for a section the body briefly falls back to the step copy.
- A role change made on A did not reach the assignee's signed-in device (Settings still read "Default"); only a fresh device recovered it. Relevant to any permission change taking effect (not filed).
- Already filed, not re-filed: #504 (LWW, not exercised concurrently), #549, #550, #551 not hit.
- Sunlight theme: "Customized by QA Dept 25" badge dark amber (110,80,0) on a tinted-white pill, about 6:1, legible (shot 31).

## Deferred, not driven
- Per-step provenance (OQ3), delegated checklist-author role (OQ4), baseline-update propagation / re-merge (OQ1, OQ5), LWW overwrite from a reconnecting phone (#504). Baseline wording is placeholder (CONTENT-PASS), not judged.

## Console notes
No errors or failed responses after the baseline mark on A/B online. Offline run: 3x net::ERR_FAILED (aborted Auth). C2: one "Transition was aborted because of invalid state".
