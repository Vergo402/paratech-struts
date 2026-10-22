# BRIEF 32 — Mutual-aid invite + accept (QR join + guest participation)

Spec: `docs/v4-design/09-workflows/32-mutual-aid-invite-accept.md` · Phase G issue #235 (closed) · drafted 2026-10-13 against HEAD 903a68e.

## 1. Summary and scope ruling (read first)

The spec describes a host IC generating a per-incident multi-use join QR + code, assisting officers (provisioned dept members or walk-up guests with a typed unit tag) joining one incident, a joined-units list, host revoke, read-only record at End Operation, and a merged multi-agency audit log.

**v4.0 ships none of the incident-level half.** Evidence chain:
- ADR-022 Status: "Implementation deferred past v4.0 — design decisions locked; v4.0 ships zero code; tracked in #493 (ruled 2026-08-17)"; line 18 "Amended 2026-08-17".
- #493 (OPEN, `[Backlog]` "Mutual aid / multi-agency join — deferred past v4.0 (ADR-022 amended)"): "ADR-022 committed mutual aid (join/guest/QR-incident) to v4.0 but zero code exists. Ruling (Alex, 2026-08-17): defer past v4.0."
- `.claude/audits/phase-j/261-review-findings-master.md` N8 and Q5 ("AMEND all four + backlog issues #493/#494/#495/#496"): grep-verified, no join/guest/QR-incident implementation.
- `.claude/rules/v4-phase-status.md` lists "Deferrals past v4.0: #493–#496".
- My own grep of `src/` (2026-10-13): no "Invite assisting unit", "Assisting units", unit-tag or incident-join code. The only mutual-aid-adjacent code is department-level: `QrImage.tsx`, `QrScannerSheet.tsx`, `JoinDepartmentScreen.tsx`, Settings -> Department invite block.
- Note: **spec 32 and IA spec 52 were NOT amended** — both still say "Ships v4.0". The ADR was amended; the specs were not. Treat that as a stale-spec finding, not a build bug.
- #511 is NOT relevant: it is the hazard-to-card building-scope gap (`[v4.0.x]`), unrelated to mutual aid. "Multi-building" there means multiple buildings in one operation, not multi-agency.
- Related closed issue #407 (QR camera scanner, OQ #42 resolved: join QR = plain web link scanned by phone camera, no install) shipped as the dept-level scanner only.

So almost every spec criterion is **Deferred (#493)**. The QA agent should NOT record these as NOT-BUILT or FAIL. The Testable criteria below are the v4.0 pieces of the same QR + code + guest-first philosophy that do exist (dept-level), plus negative checks that the deferred feature leaves no dead or half-built surface.

## 2. Setup

Per `251-verify/HARNESS.md` (emulators, `npm run dev:emu` :5200, phone viewport 390x844).
1. Device A `http://localhost:5200`, clean origin. Sign up via `/auth` -> Create Account (`qa251-32-1@example.test`), then `/create-department` (fresh dept). The creator becomes Admin.
2. Device B `http://127.0.0.1:5200`, clean origin, left as a guest (no account) for 32-04/32-05; second account `qa251-32-2@example.test` for 32-06..32-08.
3. Start one operation with one apparatus and one shore point on A (Operations tab) so "an active operation" exists for the negative checks.
Routes verified in `src/app/router.tsx`: `/settings/department`, `/join-department`, `/command`, `/operations`, `/audit-log`, `/settings/administration`. Labels verified in source: Settings -> Department shows "Invite your crew — they scan this or type the code", the QR, the code, a "Copy" button (becomes "Copied"), and "Join existing department"; `/join-department` shows h1 "Join department", "Invite code", "Scan QR code", "Enter it by hand" (placeholder `HAMD-4F2K`), "Paste", "Join department" (button reads "Joining…" while busy), a "Scan invite QR" sheet, and a role badge Admin/Default on success.

## 3. Criteria

| ID | Criterion (observable outcome) | Tag | Spec § | How to drive / what to read |
|---|---|---|---|---|
| 32-01 | Admin sees a QR plus the human-readable invite code together in Settings -> Department, with a Copy button; the code is shown as text beside the QR (QR is never the only path) | Testable | Step 1, Purpose, Accessibility | Device A, `/settings/department`. Read the QR canvas, the `<strong>` code text, the Copy button. Tap Copy: label becomes "Copied" |
| 32-02 | The displayed code uses unambiguous glyphs only (no `0`/`O`, `1`/`l`/`I`) | Testable | Step 1 | Read the code on 3 different departments (create 2 more via `/create-department`). Check characters. Format looks like `HAMD-4F2K` |
| 32-03 | The QR is dark-on-white, readable in dark theme too (not inverted) | Testable | Step 1 (QR image) | Settings -> Appearance: switch to a dark theme, return to Department, screenshot the QR. Optionally decode the screenshot |
| 32-04 | The QR encodes a code a phone can use; scanning is an accelerator and typing the code is the same result | Testable (Superseded by ADR-022 addendum 2026-07-02 for the "plain web link" part: see list) | Step 2 | On `/join-department` open "Scan QR code": the "Scan invite QR" sheet opens, closes cleanly, and a camera-denied or no-camera state shows a calm message, not an `alert()`. Then use "Enter it by hand" instead |
| 32-05 | A not-signed-in guest can use the app (calculator / Quick Find, Operations) with no account; no auth wall | Testable | Step 2-G ("guest-first", ADR-015) | Device B clean origin: load `/`, confirm Quick Find usable without sign-in; Settings -> Department shows "Sign in to create or join a department and sync with your crew." |
| 32-06 | Entering a valid code on `/join-department` joins the department; success sheet titled "Joined <dept name>" with a role badge ("Default") | Testable | Step 2 (provisioned path, dept-level analogue) | Device B signed in as qa251-32-2: `/join-department`, type or Paste the code from A, tap "Join department". Read sheet title and badge. Note this is a DEPARTMENT join, not incident-scoped |
| 32-07 | An invalid or unknown code shows a calm inline error on the page, never a browser `alert()`/`confirm()`, and the Join button recovers | Testable | Step 2 ("calm inline invalid/expired/used errors") | Type `ZZZZ-0000` style bad code, tap "Join department". Read the inline error text; confirm no native dialog (listen for dialogs via JS); button not stuck on "Joining…" (see risk R3) |
| 32-08 | Join button is disabled until the code looks complete, with a stated reason | Testable | Step 2 | `/join-department` with empty field: button disabled; reason text "Enter your invite code" |
| 32-09 | Joining produces no push, alert or toast to the host: the Admin device A receives no modal or notification when B joins; the new member shows up only in the quiet surfaces (Settings -> Administration / `/users` roster) | Testable | Step 3 ("not paged", Principle 10) | After 32-06, watch A for modals/toasts for ~10 s (`document.querySelectorAll('[role=dialog],[role=alert]')`), then open `/users` and confirm the new member listed |
| 32-10 | Code fallback accessibility: Copy and Paste buttons and the code field have accessible names; touch targets of the gateway buttons ("Scan QR code", "Join department") are at least 44 px | Testable | Role gates ("48pt non-operational targets"), Accessibility | Measure `getBoundingClientRect()` heights at 390x844; read accessible names via `read_page`. Spec says 48pt; record height and note whether it is under 48 but at or above 44 |
| 32-11 | Offline: a join attempted offline is held and shows a calm "will join on reconnect" state; reconnect completes it | Testable | Foundation convention (offline), related #466 closed | Device B: `goOffline` + `offline` event, submit a valid code, read the held-state text ("Keep working — your invite code is saved on this device…"), come back online, confirm join completes |
| 32-12 | The deferred feature leaves no dead or "coming soon" control: no "Invite assisting unit" entry on `/command` incident menu, in Settings -> Administration, or anywhere in the app shell | Testable | Step 1 entry points | Device A with active operation: open Command tab and its menus, Settings -> Administration, Operations. Search page text for "assisting", "Invite assisting unit", "mutual aid", "Cast to board". Expect zero hits |
| 32-13 | No "Assisting units" list, Guest badge, or "Join as a guest" sheet exists anywhere in the build | Testable | Step 2-G, Step 3 | Same sweep as 32-12 across Command, Operations, Accountability (if reachable), `/audit-log`. Expect zero hits |
| 32-14 | The operation-level join path does not leak: visiting `/join-department` while already in a department and entering your own dept's code does not corrupt state (record what happens; see #521 no already-in-a-department guard) | Testable | Step 2 | Device A (already Admin): `/join-department`, enter own code. Record outcome (error, no-op, or role downgrade). Downgrading the Admin is a FAIL; silent no-op or clear error is PASS |

## 4. Superseded / Deferred list

| Spec element | Tag | Citing decision / evidence |
|---|---|---|
| Host generates an incident-scoped join QR + code (sheet "Invite assisting unit", "Incident: <name>", expiry copy "Multi-use · expires when the op ends…") (Step 1) | Deferred (#493) | ADR-022 Status + "Amended 2026-08-17"; #493 body; 261 findings N8/Q5; 32-12 verifies absence |
| Copy / "Cast to board" of the join QR (Step 1, state `CodeLive`) | Deferred (#493, and #496 for the board) | #496 `[Backlog]` C-13 broadcast surface deferred past v4.0, "no broadcast surface exists in src/" |
| "Join an incident" sheet: Scan QR / paste code / "Join incident" (Step 2) | Deferred (#493) | Incident-level join is not built. The dept-level equivalent exists (`/join-department`) and is tested at 32-04..32-08 |
| Member join, incident-scoped role, "Joined … as a Member on this incident" SR announcement (Step 2) | Deferred (#493) | Same |
| Walk-up guest join: "Join as a guest" sheet, typed unit tag, per-incident guest identity, "Guest · Engine 7, Westfield FD" attribution, SR text (Step 2-G) | Deferred (#493) | Same. OQ #41 still says guests are attributed by unit tag at incident join; that attribution is part of the deferred half |
| Guest equipment shown as "External · <unit>" on Accountability and return-to-source (Step 2-G, 41-accountability) | Deferred (#493); related open #283 (deployed external equipment invisible on Quick View) | No external-equipment UI exists in `src/` for v4 |
| "Assisting units (N)" joined-units list with Member / Guest badges (Step 3) | Deferred (#493) | Same |
| Host revoke access destructive modal, default Cancel, focus trap (Step 3-R, states `Revoked`) | Deferred (#493) | Same. Dept-code revoke/regenerate (#423) is a department-level issue, closed, not this flow |
| Read-only record on End Operation, guest claim-later (Step 4, `ReadOnlyOnClose`) | Deferred (#493) | Same |
| Merged multi-agency audit-log roll-up (Step 4, OQ 5) | Deferred (#493); assembled ICS export separately deferred in #494 | #493, #494 |
| Host-granted role escalation for an assisting user (OQ 2) and unused-code idle-expiry value (OQ 1) | Deferred (#493); idle-expiry generally tracked in #512 (ADR-042 invite expiry, v4.1) | #493, #512 |
| Cross-dept command transfer riding the same handshake (ADR-021 reference) | Deferred (#493) | Depends on the incident-level join |
| Spec claim "Ships v4.0" in the spec header, "What ships v4.0", and IA spec 52 | Superseded (ADR-022 amended 2026-08-17 / #493) | Spec text was never amended. Stale paper, not a build defect |
| QR scanner "native camera scanner" / install-deep-link path (spec "only Phase-H deferral") | Superseded (ADR-022 addendum 2026-07-02 / OQ #42 / #407) | The QR is a plain web link scanned by the phone's own camera, no install; the in-app `BarcodeDetector` scanner (`QrScannerSheet`) is a convenience. Drivable part is 32-04 |
| Single active department at a time; cross-dept help rides the guest/QR path (OQ #31) | Superseded by deferral | The guest/QR cross-dept path is #493; today one account = one active dept |

## 5. Risks for the QA agent

- R1. **Do not report the missing incident join as FAIL or NOT-BUILT.** It is a recorded deferral (#493). The only valid findings are (a) any visible remnant of it (32-12, 32-13) or (b) dept-level join defects.
- R2. 32-06 joins a *department*, which grants the Default role across the whole department. It is not incident-scoped; do not grade it against the spec's "cannot administer the host department" line.
- R3. #521 (open, `[v4.0.x]`): the invite lookup has no timeout, so a weak connection can hang on "Joining…", and there is no already-in-a-department guard. A hang under throttling or the emulator is a known residue, not a new FAIL; record it and cite #521.
- R4. The dept code is created with the department; if the dept was created without cloud reachability, the code may be missing (#419, closed). Confirm the emulator is up before judging 32-01.
- R5. Camera cannot be exercised in a headless browser; for 32-04 only check the sheet opens/closes and the denied state is calm. Do not mark the scanner itself FAIL.
- R6. Sunlight/dark theme: the QR is intentionally white-card in all themes (comment in `QrImage.tsx`); not a theming bug.
- R7. Settings -> Administration and `/users` are Admin-gated. Check the viewer's role before calling a missing control a defect.
- R8. A second department can only be created via the direct `/create-department` address (phase-status note), so use that URL for 32-02.

## Orchestrator addendum (2026-10-21, HEAD 5cb1bbd)
- The scope ruling above stands: the incident-level half is Deferred (#493); drive only 32-01…32-14 as written.
- 32-11 offline join: existing issue #521 ("invite lookup has no timeout — offline join hangs") already carries evidence from spec 08. Drive it once; if it still hangs, record FAIL citing #521 and add the HEAD you saw it on in Proof — do not file a new issue.
- Spec 08's pass (08/REPORT.md) covers the join flow at 903a68e; do not reuse its evidence here.
