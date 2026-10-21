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
| 7 | `12-deploying-a-strut.md` | #221 | **PAUSED** (Alex, 2026-10-13) — qa run stopped at start; re-run from scratch | — | — |
| 8 | `13-cutting.md` | #222 | brief drafted | — | — |
| 9 | `14-runner.md` | #223 | brief drafted | — | — |
| 10 | `15-secured-returned.md` | #224 | brief drafted | — | — |
| 11 | `16-end-of-operation.md` | #238 | brief drafted | — | — |
| 12 | `20-role-assignment-command-transfer.md` | #225 | brief drafted | — | — |
| 13 | `21-hazard-log.md` | #226 | brief drafted | — | — |
| 14 | `22-ic-command-checklist.md` | #227 | brief drafted | — | — |
| 15 | `23-task-level-checklist.md` | #228 | brief drafted | — | — |
| 16 | `24-tcrm-briefing.md` | #229 | brief drafted | — | — |
| 17 | `25-customizing-checklists.md` | #230 | brief drafted | — | — |
| 18 | `30-user-management.md` | #233 | brief drafted | — | — |
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
