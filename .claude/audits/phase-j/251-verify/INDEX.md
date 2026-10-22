# #251 — Verify every v4 workflow against its Phase G spec

Runbook node: Step 2 · P9 ([`v4-completion-runbook.md`](../../../plans/v4-completion-runbook.md)). Started 2026-10-13.

**Exit test:** every row below has a recorded verdict of PASS (or SPEC-DRIFT accepted per the ruling below), then `gh issue close 251`.

## Method (one pass per spec)

1. **Criteria brief** (`<NN>/BRIEF.md`) — the June spec reconciled against the Phase G gate review §10 deferrals, ADR-023…042, `.claude/rules/v4-phase-status.md` and Phase J rulings. Each criterion tagged **Testable / Superseded (ADR-N or issue) / Deferred**. Only Testable criteria are driven. Drafted by a delegated agent, reviewed by the orchestrator before dispatch.
2. **qa-driver pass** on the emulator harness (`npm run emulators` + `npm run dev:emu` → :5200), serial only (shared browser pane). Prior Stage A / TTX / Step 1 evidence may supply setup recipes but never counts as a #251 pass.
3. **Verdict per criterion:** PASS · FAIL (build bug) · SPEC-DRIFT (build follows a later decision the brief missed) · NOT-BUILT.
4. **Report** at `<NN>/REPORT.md`; findings filed as sub-issues of #251 on board 2 with Priority set.

## Ledger

| # | Spec | Phase G issue | Status | Report | Findings filed |
|---|------|---------------|--------|--------|----------------|
| 1 | `05-setting-up-inventory.md` | #218 | **PASS** — 31 PASS · 1 SPEC-DRIFT · 3 FAIL (minor, filed) | `05/REPORT.md` | #526 |
| 2 | `07-department-setup.md` | #231 | **PASS** — 26 PASS · 1 SPEC-DRIFT · 2 NOT-BUILT (07-29 superseded by #264; 07-07 → a11y batch) | `07/REPORT.md` | (a11y batch) |
| 3 | `06-signing-in-and-out.md` | #234 | **PASS** — 31 PASS · 2 FAIL (06-18 filed; 06-30 → a11y batch) · 3 NOT-BUILT (06-31/32 → a11y batch; 06-34 broadcast = Deferred #496) · 06-33 Deferred #493 | `06/REPORT.md` | #527 |
| 4 | `08-joining-by-invite-code.md` | #232 | **PASS (online path)** — 21 PASS · 1 SPEC-DRIFT · 3 FAIL (08-22/23 offline join hangs = existing #521, evidence added; 08-02 → spec batch) · 3 NOT-BUILT (08-14 → Q2; 08-26/27 → a11y batch) | `08/REPORT.md` | #521 (existing) |
| 5 | `10-starting-an-operation.md` | #219 | **PASS** — 27 PASS · 1 SPEC-DRIFT · 3 FAIL (10-31 filed; 10-03/10-25 → Q3) · 2 NOT-BUILT (10-17b multi-building default + tablet address → small-features list) | `10/REPORT.md` | #528 |
| 6 | `11-adding-a-shore-point.md` | #220 | **PASS** — 28 PASS · 4 SPEC-DRIFT · 1 FAIL (11-33 duplicate #N on concurrent add, filed) | `11/REPORT.md` | #529 |
| 7 | `12-deploying-a-strut.md` | #221 | **PASS** — 30 PASS · 3 SPEC-DRIFT · 1 FAIL (12-09 system Back, filed) · extra F1 (cross-rig 3-Post one-tap, filed) · 12-02 copy filed · 12-22 would-fit link NOT-BUILT (→ small-features) · probe recorded (2026-10-21, HEAD fb8204a) | `12/REPORT.md` | #539 #540 #541 |
| 8 | `13-cutting.md` | #222 | **PASS** — 33 PASS · 1 SPEC-DRIFT · 2 NOT-BUILT (13-34 Cutting-role gate, 13-35 actual-cut input → decisions list) · 13-10 copy-only FAIL → spec-correction (R4) · re-cut flag 13-36..38 verified (2026-10-21, HEAD 64bb0b3) | `13/REPORT.md` | (none) |
| 9 | `14-runner.md` | #223 | **PASS** — 28 PASS · 1 SPEC-DRIFT (14-22 no Runner role gate, ADR-017) · 1 NOT-BUILT (14-27 card accessible name → a11y batch) · 0 FAIL · 14-19 Deferred (#496) · re-cut 14-31/32 verified (2026-10-21, HEAD 183e111) | `14/REPORT.md` | (none) |
| 10 | `15-secured-returned.md` | #224 | **PASS** — 28 PASS · 1 SPEC-DRIFT (15-23 no position gate, ADR-017) · 0 FAIL · 15-24 Deferred (#493) · race/offline/re-cut-on-Secured verified (2026-10-21, HEAD 132001f) | `15/REPORT.md` | (none) |
| 11 | `16-end-of-operation.md` | #238 | **PASS** — 17 PASS · 11 SPEC-DRIFT (ADR-017/036/041) · 2 FAIL (16-08 focus + 16-11 copy → #542) · 2 NOT-BUILT (16-16 summary line → spec batch; 16-30 end announcement → a11y batch) · 16-33 Deferred (#495) (2026-10-21, HEAD 5a6f4e5) | `16/REPORT.md` | #542 #543 |
| 12 | `20-role-assignment-command-transfer.md` | #225 | **PASS** — 34 PASS · 0 SPEC-DRIFT · 4 FAIL (20-27 false Accept on initiator → #544; 20-18 tablet org chart → #545; 20-40 + 20-38 → #546) · 1 NOT-BUILT (20-08 role announcement → a11y batch) · mutual-aid Deferred (#493) (2026-10-21, HEAD aafe8d2) | `20/REPORT.md` | #544 #545 #546 |
| 13 | `21-hazard-log.md` | #226 | **PASS** — 28 PASS · 1 SPEC-DRIFT (21-18 chips not a header, #487/#490) · 1 FAIL (21-07 reporter names dead code → #547) · 1 NOT-BUILT (21-31 edit/delete → decisions) · ADR-042 §5 cap missing → #548 · export audit event NOT-BUILT → decisions · 4 Deferred (2026-10-21, HEAD 3f69446) | `21/REPORT.md` | #547 #548 |
| 14 | `22-ic-command-checklist.md` | #227 | **PASS** — 28 PASS · 1 SPEC-DRIFT (22-05) · 3 FAIL (22-06 focus + 22-09 Esc + tab width → #549; 22-26 per-status counts → decisions) · 3 NOT-BUILT (22-07 swipe = deferred in code; 22-11 non-IC read view → decisions; 22-31 announcements → a11y batch) (2026-10-21, HEAD 2e8bd28) | `22/REPORT.md` | #549 |
| 15 | `23-task-level-checklist.md` | #228 | **PASS (mechanics) / FAIL (scoping)** — 20 PASS · 2 FAIL + 2 NOT-BUILT with one root cause (instance = device uid → #550, gate M13 must-fix) · 23-07 all sections open, 23-26 no provenance cue → decisions · 23-19 → a11y batch (2026-10-21, HEAD af9321a) | `23/REPORT.md` | #550 |
| 16 | `24-tcrm-briefing.md` | #229 | **PASS** — 28 PASS · 1 SPEC-DRIFT (24-21 X keeps the session, R1) · 1 FAIL (24-23 concurrent Begin race → #551) · 3 NOT-BUILT (24-30 Add note, 24-31 per-Group sessions, 24-32 Safety/OSC indicator → decisions) · no RGS gate (ADR-017) (2026-10-21, HEAD cd55558) | `24/REPORT.md` | #551 |
| 17 | `25-customizing-checklists.md` | #230 | **PASS** — 22 PASS · 2 SPEC-DRIFT (25-07 inline field, 25-32 intro copy) · 3 FAIL (25-04 manageSettings gate → #552; 25-30 + 25-33 + 25-13 polish → #554) · 4 NOT-BUILT (25-29 audit rows → #553; 25-24 drawer provenance + 25-15 AT move buttons + 25-31 TCRM note → decisions) (2026-10-21, HEAD 5a8666e) | `25/REPORT.md` | #552 #553 #554 |
| 18 | `30-user-management.md` | #233 | **PASS** — 26 PASS · 1 SPEC-DRIFT (30-23 Reactivate) · 3 FAIL (30-17 role reassignment not live → #555; 30-25 offline revoke → #556; 30-30 + audit copy → #557) · 1 NOT-BUILT (30-03 side-by-side faces → decisions) · provisioning (#439) and last-Admin lockout verified (2026-10-21, HEAD 5cb1bbd) | `30/REPORT.md` | #555 #556 #557 |
| 19 | `31-audit-log-review.md` | #236 | brief drafted | — | — |
| 20 | `32-mutual-aid-invite-accept.md` | #235 | brief drafted | — | — |

`00-workflow-foundation.md`, `_TEMPLATE.md` and the two `_PHASE-G-GATE-*` files are method docs, not workflows — not verified here.

## Rulings

- **R1 (Alex, 2026-10-13):** SPEC-DRIFT counts as a pass — the build following a later decision passes; each drift is listed in the report so the June spec can be corrected in one batch later.
- **R2 (Alex, 2026-10-13):** a FAIL is filed as a sub-issue of #251 (board 2, Priority set) and verification keeps going; fixes are a separate batch afterward (per the runbook).
- **R3 (Alex, 2026-10-13):** run straight through the ledger in order; stop only for decisions that are Alex's.

- **R4 (orchestrator, 2026-10-13):** a FAIL that is only a spec-copy difference where the build meets the spec's intent goes to the spec-correction batch below, not to an issue (first case: 05-09, no "Done" on the Add equipment sheet — dismiss-only meets "no Save step"). A workflow's row reads **PASS** when no FAIL blocks its main path; minor FAILs are filed and listed.
- **R5 (orchestrator, 2026-10-13):** #251 findings go on board 2 as `[v4.0.x]` sub-issues of #251, Status Todo, Priority 12 (after the current P1–P11 order) until Alex re-ranks them.

## Spec-correction batch (R1/R4 — fix the June docs later in one pass)

- 05: no "Done" on Add equipment (dismiss-only); form modals ignore backdrop taps (`Modal.tsx`); CSV-only import, no orphan modal, result block (#514) — see `05/BRIEF.md` §3.
- 08-02: same dead Settings branch — "Join existing department" (`DepartmentPage.tsx:69`) never renders.
- 07: Settings → Department "not part of a department yet" branch is unreachable (RequireDepartment wraps all Settings, `router.tsx:101-110`) — spec + dead branch in `DepartmentPage.tsx`; no "Claim department" banner (#264 fresh-start).
- 32 + IA 52: still say "Ships v4.0"; ADR-022 amended 2026-08-17, deferred to #493.

- 12-03: card copy drops "at this load" (#432 mess-map #15); 12-12: truck source lives in Details, not the card face (card.md:62); 12-20: over-capacity is deployable after acknowledgment via "Deploy N of M anyway" (accepted mockup 2026-07-01) — rewrite spec 12 Step 2-W.
- 12-22: the spec's "would-fit → Quick Find" link does not exist (NOT-BUILT) — decide: drop from spec or small-features list.
- Probe (spec 12, 2026-10-21): editing a Pending 3-Post (6×6) to T-Shore clears the wood and blocks Save with "Pick header and footer wood" — consistent with the wood-required doctrine (2026-10-17); record in spec 11/12 as intended.

- 24-21: X on the briefing keeps the session open ("Open Briefing" resumes it, "Briefing started" stays logged) — rewrite spec 24 "no session recorded".
- 13-10: the too-small chip reads "Opening too small for this header and footer wood — verify measurement" (spec said "standard 6×6 wood"; wood is now picked, so the build wording is right) — rewrite spec 13 Step 2 / SME-3. Also the brief's "5′0⅞″ → 51½″" example is arithmetic-wrong (52⅜″).
- 13-36: the station hero shows the "was 47½″ on 6×6, now 51½″ on 4×4. Re-cut." sentence; the board card carries the "⚠ Re-cut: cut length changed after Cut Done" chip (accepted mockup 2026-10-20) — add both to spec 13 Step 3.

## Decisions for Alex (NOT-BUILT, not filed)

- 30-03 User manager on tablet/laptop still shows one face (Members OR Roles) with the segmented control, not both side by side. Keep single-face (rewrite spec) or build the two-column layout?

- 24-30 Briefing has no "Add note" field; 24-31 one op-wide briefing session, not per Group; 24-32 no "briefing in progress" indicator for the Safety Officer / Operations Chief. Drop from spec or small-features list (v4.1)?

- **#550 scope:** key the Task Level Checklist by account only (minimum, matches 552faca), or by Group/task with a selector and a Section-Chief read view (gate M13 as written)? The issue is filed; this is the size of the fix.
- 23-07 Task checklist opens with every section expanded (spec: one at a time; the IC checklist auto-collapses completed sections). Align or rewrite spec.
- 23-26 / 25-24 No "Customized by <dept>" cue on the IC, Task Level or briefing screens (only Settings shows it; the Settings intro copy promises crews see it). Add the marker to the three surfaces, or rewrite the intro copy and spec.
- 25-15 No Move up/down/under buttons in the checklist editor (arrow keys on the grip are the only keyboard path). Build for AT, or accept arrows + fix the focus drop (#554).
- 25-31 No "Content ships v4.1 · structure on" note on the TCRM card. Drop from spec.

- 22-11 No read-only IC Checklist view for the Operations Section Chief / Group Supervisors (data syncs, no surface). Build for v4.0.x, or IC-only by design?
- 22-26 The ICS-201 card shows "n set · total" only, not per-status counts (spec wireframe). Keep the condensed form (rewrite spec) or add the per-status row?

- 21-31 Hazards cannot be edited or deleted (only Mitigate / Reopen). Keep as append-only by design (ICS-208 register), or build Edit for typos?
- 21-29 Export ICS-208 CSV records no audit-log event. Add one, or drop the spec line.

- 16-16 The End Operation modal has no "N shore points · N personnel" summary line. Drop from spec or small-features list.

- **Fireground position gate (13-34 Cutting, 14-22 Runner, 15-23 Secured/Return):** no gate of any kind exists on the slides or Remove & Return. ADR-017 line 40 says a department ROLE never gates a fireground action, but line 39 says ICS POSITIONS do — the build implements neither. Decide: (a) v4.0 ships ungated (rewrite the three spec rows + amend ADR-017 line 39), or (b) build the ICS-position gate as a v4.0.x item. ("Cutting role required to advance…"): no role gate exists on the station slides; ADR-017 keeps the fireground ICS-position-gated, so decide: build for v4.0.x, or drop from spec 13 (any member may cut).
- 13-35 Optional actual-cut entry with expected↔actual diff badge: not built anywhere. Decide: small-features list (v4.1) or drop.
- 12-22 "would-fit → Quick Find" link on the no-match empty state: not built. Drop or small-features list.

## Accessibility batch (one issue at the end, not per spec)

- 07-07 Department name input has no `aria-invalid`/`aria-describedby`; error `<p>` not tied to the field.
- 07-12 / 07-26 No spoken "Invite code copied." / "<Dept> is ready" announcement (no live region in the sheet).
- 07-25 Sheet Close X is 40 px (other targets 48–56).
- 06-30 Password Show/Hide toggle is 61x36 px; auth segmented control segments 46 px (spec 48).
- 06-31 `/auth` has no opening announcement; 06-32 "Continue as guest" has no accessible description.
- 08-26 Join code field not focused on open; 08-27 Enter does not submit (no `<form>`); 08-24 Joined sheet Close X 40 px; 08-25 join error message has no live region.
- 10 Sunlight: disabled and enabled Start Operation look identical; only the caption tells them apart.
- 11-35 card "Capture location" chip 33 px, collapsed card head 42 px; shore-type segments 46 px. 11 location denial shows no message.
- 07 console: join with a revoked code shows its message outside an `aria-live` region.

## Small features not built (decide at the end: file, defer, or drop)

- 10-17b Turning Multi-building on mid-incident gives existing shore points no default building and shows no warning (spec left both to Phase H).
- 10 Address is never shown on tablet/laptop chrome.

## Notes to watch

- 11 safety (report-only): 3-Post with no opening shows "Required strut length −11″" until a measurement is entered; whether 6×6 deductions survive an Edit 3-Post → T-Shore was not checked → probe added to `12/BRIEF.md`. Adding a floor via the Division picker persists even when the form is cancelled. Empty board shows seven empty lanes, not the "No shore points yet" empty state.

- 07-16 a Default-role member sees the department invite QR + code in Settings (spec implies Admin view). Not filed; raise with Q-list if spec 08/30 shows it matters.
- 07-24 one `permission_denied` on `/orgs/<id>/deviceOwners/<uid>` on reconnect after an offline create; entry present in REST; not reproduced. Watch in 08/30.

## Cross-cutting questions (held for Alex, raised once QA confirms)

- **Q1 — fireground position gates.** Specs 13 (Cutting), 14 (Runner), 15 (Secured/Returned) say only the matching ICS position may advance a card; brief drafters found no such gate in `src/`. ADR-017 says "the fireground stays position-gated" (axis exists; per-card enforcement unclear). If QA confirms NOT-BUILT across 13–15, ask Alex once: required for v4.0, or anyone on the incident may advance? File one issue, not three.
- **Resolved — mutual aid:** incident-level mutual aid is Deferred by #493 (ADR-022 amended 2026-08-17); notes appended to briefs 06 and 20. Specs 32 and IA 52 still say "Ships v4.0" → one doc-correction item for the spec batch (R1).
- **Q2 — who sees the roster and the invite code.** 08-14: a Default member gets "Admin access only" on `/users`, so other members never see a new member (spec 08 says they do). 07-16 + 08 note: every Default member can read the department invite code and QR in Settings. Both are "who can see what" calls for Alex; check spec 30 results before asking.
- **Q3 — design divergences with no decision on record.** 10-03: form modals (Start/Edit Operation) are a centered card, not full-screen on phone as ADR-016 / `modal.md:114` say (`fs-modal--form` class has no CSS rule). 10-25: the op name is not in the persistent shell header on other tabs (`00-ia-foundation.md` §Persistent chrome). Ask Alex: keep the build (spec correction) or build the spec (mockup first).
- **Deferral cross-check.** Every NOT-BUILT is checked against `DEFERRALS.txt` and the board before filing (e.g. #495 after-action email send).
