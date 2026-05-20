# Army AAR — Moderator `mod-ux`

## Subject identification

- **Subject ID:** `mod-ux`
- **Role / Persona:** Moderator — Field UX / Mobile Ergonomics (silent observation per WCAG 2.2 Quickref + F1–F10 interactive-findings baseline)
- **Active window:** E+0:00 → E+36:00 (full event)
- **Submission date / wall-clock:** 2026-05-17

## Operational period(s) covered

All four operational periods. UX-surface and accessibility observations across OP1 (14 SPs, first contact with Add-SP modal Save Changes bug, guardClick swallow), OP2 (35 SPs, mass deploy via programmatic bypass, dashboard refresh debounce), OP3 (34 SPs, no demob UI, no stop-work UI, multi-assignment ambiguity), OP4 (17 SPs, cribbing audit + 5th Section UI standup).

---

## Question 1 — What was supposed to happen?

My observation framework was the 12-item mod-ux checklist grounded in WCAG 2.2 (with explicit calibration to 24×24px AA / 44×44px AAA touch targets, 4.5:1 AA text contrast, 3:1 non-text contrast) and the F1–F10 interactive-findings baseline from `.claude/audits/interactive-findings.md`. The v4.0.0 hypothesis I was specifically there to stress was that the cumulative effect of (a) the unfixed F1–F10 friction items, (b) accumulated post-v3.5.2 audit findings, and (c) net-new ergonomics gaps under operational load would render FieldShore *operationally degraded but not blocking* for a Type II 36-hour event — and to catalogue where the line falls between *degraded* and *blocking*.

The plan was:

1. **F-regression checks** — F2 (section button dead-ends), F3 (offline status update lag), F4 (Operations render scaling), F7 (Add SP reachability), F10 (headcount reads "X apparatus, Y personnel") — verify v3.5.2/v3.5.3/v3.6.0 fixes held and identify new regressions.
2. **WCAG audit** — text contrast on all 7 status pills in both dark and light mode (1.4.3 AA = 4.5:1); touch-target audit on cut-table buttons + Quick Find fraction select (2.5.5 AAA = 44×44px); 375px iPhone SE viewport check for horizontal scroll and legibility.
3. **First-contact ergonomics** — capture taps-to-Add-SP from cold start; capture inventory quick-view FAB availability across tabs; capture plate picker scroll reliability under rapid use.
4. **Operational-friction watch** — track every participant-logged friction item across all 4 OPs against an F-finding catalogue and flag any item that bypassed a UI surface entirely (i.e., participant resorted to programmatic injection or paper workaround).

My tools were silent preview_snapshot, preview_eval (read-only DOM and computed-style inspection), preview_resize (to test 375px viewport), and the participant-visible event log. I added 12 baseline notes during T-15 capturing viewport metrics, fraction-select touch-target violation, status-pill contrast measurements in both modes, and the Add SP reachability path.

---

## Question 2 — What actually happened?

**The Add-SP modal "Save Changes" hidden bug bypassed four OPs running.** This is the headline operational finding. The friction log captures the bug verbatim across all four operational periods (`ui_friction_logged_by_participants` lines 10 + op2/op3/op4 sp_creation_method_friction):

- OP1: *"Modal Save Changes button hidden in Add path until find-struts flow runs"*
- OP2: *"Add-SP modal Save Changes button hidden in Add path; bypassed via programmatic db.ref().push() + persistOperation()"*
- OP3: *"Same as OP1+OP2 — programmatic bypass used; no v3.x patch shipped between OP2 and OP3"*
- OP4: *"Same as OP1+OP2+OP3 — programmatic bypass used for 4th OP running"*

Every one of the 66 SPs created in this event was created via programmatic injection — *not a single SP came through the Add-SP modal's intended Save Changes path*. The Add-SP UI flow was non-functional for the entire 36 hours. OP4 even added a *new* layered finding on top: *"estimatedLoad field MUST be numeric (validate rule undocumented in API contract)"* — first SP creation in OP4 hit PERMISSION_DENIED until the participant switched the value from string `'medium'`/`'heavy'` to numeric. The undocumented API contract between the UI's dropdown labels and the validate rule is a second-order bug compounding the first.

**guardClick swallowed first submit silently (OP1).** Friction log line 2. This is the v3.5.2 baseline finding still active in v3.11.1 — `guardClick()` returns false on first submit attempt and the participant must click twice. Compounded by the Save Changes hidden bug, OP1's first SP creation attempt was a triple-failure cascade (guardClick swallow → Save Changes hidden → modal stuck open) that ended with the programmatic workaround.

**WCAG status-pill contrast violations: 2 of 7 dark-mode pills FAIL, 4 of 7 light-mode pills FAIL.** From mod-ux notes lines 6–7:

- Dark mode: cutting 8.75:1 ✓, pending 6.22:1 ✓, runner 6.11:1 ✓, secured 5.34:1 ✓, strutplaced 5.01:1 ✓, **process 4.14:1 ✗**, **returned 4.05:1 ✗**.
- Light mode: cutting 6.76:1 ✓, runner 5.56:1 ✓, pending 4.97:1 ✓, **returned 4.23:1 ✗**, **strutplaced 4.09:1 ✗**, **process 3.54:1 ✗**, **secured 3.06:1 ✗**.

The v3.5.2 A2 fix (cutting/runner contrast) held in *both* modes — that work is durable. But the *other 5 pills* were never audited at the same time. Process and Returned fail in both modes; Strutplaced and Secured fail in light mode only. The light-mode state is meaningfully worse than dark — the opposite of typical web-app accessibility patterns. **Severity: high** for both notes, linked finding `F-A2`.

**Touch-target violation on Quick Find fraction select** — 127×37px (notes line 3) fails WCAG 2.5.5 AAA 44px minimum by 7px in height. Bottom-nav buttons and main CTAs all pass 44px AAA (notes line 4). Cut-table buttons (Send to Runner / Mark Secured / Return Equipment) — checklist item §11 — were a planned probe but the cutting workflow never operated at sufficient scale to capture the live touch sizing across all 3 buttons; this remains an open observation gap.

**Dashboard count cards refresh debounce (~30s).** Friction log line 11 (OP2). After programmatic mutation the Operations tab summary count cards did not refresh until a full reload or a ~30s debounce window passed. Participants worked around by manually re-tapping the Operations tab. This compounded with the Add-SP bypass — the participant could not visually confirm SP-creation success without refreshing, slowing the OP2 mass-deploy phase materially.

**No demob UI surface anywhere.** Friction log line 14 (OP3). Demob discussion at E+30:00 was held entirely on paper (4 participants, ~30 minutes per `conductor-state.op4_closed.demob_discussion`). The proposed TF-State release sequence (Search → Rescue Squad Alpha → Wood Spec → Heavy Rigging hold → Cache Decon → PSC + Sit Specs last out) and the 8 personnel-hr cache-decon load calculation lived in the IAP and IST plans, not in the app.

**No stop-work UI feature.** Friction log line 17 (OP3). Wind gust at E+22:00 (28 mph) and brief rain at E+24:30 (15 min) were handled by radio only. There is no operation-level safety-state field and no SP-level `paused` status. ICS doctrine expects stop-work as a *visible system state*; the app provides no way to express it.

**Multi-assignment ambiguity at Group Sup tier.** Friction log line 18 (OP3). When both an apparatus chip and a new individual chair were attached to the same role (e.g., Heavy Rigging Group Sup), the UI rendered only the first. The data layer accepted both; the render path silently truncated.

**Orphan custom roles after escalation.** Friction log line 19 (OP3). Patel escalated from Medical Unit Leader to Medical Branch Director, leaving the `custom_medical_unit` role node in the org chart with no holder and no cleanup prompt.

**Add SP reachability** — from cold start with no active operation, requires 4+ taps (Ops tab → Start New Operation → fill modal → Confirm → Add SP visible); fails the ≤2 target. With operation active, 2 taps (Ops tab → Add SP) — passes. F7 finding from the prior baseline still active. (Notes line 8.)

**Inventory quick-view FAB gated to Operations tab + activeOperation only** (notes line 9). Cannot peek inventory while typing measurement in Quick Find — fails Item 12.

**Accessibility wins observed and durable:** v3.5.2 cutting/runner contrast fix held in both modes. v3.6.0 23 interactive `<div onclick>` → `role="button" tabindex="0"` migration held — keyboard-Enter handler still works via delegated listener. Plate picker bottom sheet (v3.5.1 fix) survived rapid scroll without iOS regression. 375px iPhone SE viewport had no horizontal scroll across any tab (notes lines 2, 4).

**Net-new gaps surfaced at OP4 with cribbing audit + 5th Section standup:** CISM coordination has no in-app surface (friction log line 25); cribbing-decay tracking has no in-app field (line 26); heat-mitigation discipline has no in-app surface (line 27); cost capture (line 28) and time-unit (line 29) have no in-app surfaces. These are all "UX surfaces that should exist and don't" — operational doctrine being practiced outside the app.

---

## Question 3 — Why was there a difference?

Three root causes, in priority order.

**1. The Add-SP modal Save Changes hidden bug is a 4-OP-running regression that should have blocked any subsequent release.** The bug was *known* (in the friction log from OP1) yet *not patched* before OP2. The same bug is then logged in OP2, OP3, and OP4 with the same workaround. This is a release-process failure as much as a UI failure — the conductor noted explicitly in OP3 friction log line 14 that *"no v3.x patch shipped between OP2 and OP3"*. The Modal Save Changes hidden state appears to be conditional on which path opens the modal (the "Add" path vs the "find-struts-then-edit" path), per the friction log wording — meaning the fix is small (always show Save Changes in Add path) but was deferred under simulation pressure. **Severity: critical** — this single bug forced 66 programmatic-injection workarounds and prevented any UI-side throughput measurement of OP2's planned 110-SP and OP3's 80-SP budgets. The 220-card mass-deploy friction projection cannot be falsified until this is fixed.

**2. Accessibility audit coverage was partial in v3.5.2.** The A2 finding fixed cutting and runner pills only — the other 5 status pills (pending, process, strutplaced, secured, returned) were not audited at the same time. The result is uneven contrast across 7 visually-similar UI elements, with the *failing* pills (process, returned, strutplaced, secured in light mode; process, returned in dark mode) being the *more common* operational states. A2 needs a sweep across all 7 pills in both modes.

**3. Operational doctrine outpaced UI design.** Demob, stop-work, CISM activation, cribbing audit, heat-mitigation, cost capture, time-unit check-in — these are all standard ICS / USAR operational concepts that the app does not surface. They were not "missed UI work" — they are *categories* of operational state that the app simply doesn't model. The 5th-Section + late-OP4 finding cascade is the canonical example: at hour 28+, the app surfaces the data side of a Type II command structure but the human work (cost tracking, time tracking, demob lifecycle, cribbing audit) happens externally. v4.0.0 needs at minimum a *plan* for each of these surfaces, even if not all ship in 4.0.

Coordination model: the silent-moderator constraint worked correctly — I did not interrupt participants. The mass-bypass workaround was a participant decision, not a moderator nudge. The friction log captured the chosen workaround in real time, which is the right behavior under the framework.

---

## Question 4 — What can we learn from it / what should change?

**v4.0.0 (must-ship, critical):**

- **NEW (release-blocking)** — Fix Add-SP modal Save Changes button visibility in Add path. This is the single highest-priority UI fix for v4.0.0 and gates any subsequent UI-throughput measurement. The fix is small (CSS / display logic on the modal's submit button based on entry path) and the impact is enormous (unblocks all participant SP-creation flows). Add an integration test that opens the modal via Add path and asserts `submit.offsetParent !== null && getComputedStyle(submit).display !== 'none'`.
- **NEW (release-blocking)** — Document the estimatedLoad numeric contract in the API and either: (a) ship a numeric dropdown with hidden labels (recommended), or (b) coerce string → numeric in `addShorePoint()` before the database write. The first-SP-creation PERMISSION_DENIED in OP4 is unacceptable participant friction.
- **NEW (release-blocking)** — Fix guardClick first-submit swallow regression. Should not require a second click.
- **F-A2 sweep** — Audit all 7 status pills (not just cutting/runner) in both dark and light modes. Bring process, returned, strutplaced, secured all to ≥4.5:1 WCAG AA in both modes. Light mode is currently worse than dark.
- **NEW** — Fix Quick Find fraction select to 44×44px minimum (height short by 7px today).
- **NEW** — Dashboard count cards must refresh immediately after any mutation (eliminate the ~30s debounce). Subscribe count-card updates to the same local-first state stream as SP cards.

**v4.0.0 (must-ship, operational-coverage):**

- **NEW + Phase 3C.4** — Demob UI surface. Per-apparatus and per-individual demob lifecycle with timestamps and a "Released" terminal state. Surface the TF-State release sequence (Search → Rescue Squad → Wood Spec → Heavy Rigging hold → Cache Decon → PSC + Sit Specs) as a *plan* in the app, not just an IAP narrative.
- **NEW** — Stop-work UI. Operation-level safety state (`operating | paused-weather | paused-hazard | paused-PAR`) AND per-SP `paused` status with reason. Should surface a banner across all tabs.
- **NEW** — Multi-assignment at any role node: surface ALL holders, not just the first, with explicit "multi-holder" badge. Fix at the render path, not the data path.
- **NEW** — Orphan custom-role cleanup prompt on escalation: when an individual moves from `role-A` to `role-B` and `role-A` has no other holder, prompt to delete or retain `role-A`.

**v4.0.0 (must-ship, F-baseline regression closure):**

- **F7** — Add SP reachable in ≤2 taps from cold start. Either a quick-action FAB or a "Start Operation + Add First SP" combined modal.
- **F10 / Phase 3C.6** — Command page header reads "X apparatus, Y personnel" not just apparatus count. Will require Phase 3C.6 personnel + PAR tracking.
- **Item 12** — Make inventory quick-view FAB available on Quick Find tab (currently gated to Operations + activeOperation).

**v4.x (next minor):**

- **NEW** — CISM coordination surface: per-individual flag, session log, defused timestamp. OP4 CISM activation at E+33:00 with 3 specialists defused by E+35:00 is the calibration case.
- **NEW** — Cribbing audit UI (mod-struct overlap): cribbing-status badge on SP cards, audit-time-since-inspection sort, audit-history viewer.
- **NEW** — Heat-mitigation / rehab tracking: `last_rehab_at` on apparatus and individuals; `rehab_required_at` threshold with banner. OP4 NWS heat advisory at E+28:00 is the calibration case.
- **NEW** — Time-Unit check-in/check-out with shift-tracking.
- **NEW** — Cost-capture surface for Finance/Admin Cost UL.
- **NEW** — Bulk-deploy mode (mod-struct overlap) for mass-deploy phase. 45-60s per-SP friction estimate must drop to <15s.

**Doctrine / scenario design changes:**

- TTX-3 (or whatever the next sim is) must run AFTER the Add-SP Save Changes fix ships — otherwise the entire mass-deploy + Add-SP-modal-UI hypothesis remains untested.
- Add an explicit "stop-work" injection (weather or hazard) in OP2 to force the participant to surface that state in the app — currently the app has no stop-work UI so the OP3 wind gust + rain was handled by radio only and the gap was not stress-tested.
- Add a "CISM-needed" inject early enough (OP2 or OP3) to test the CISM UI surface once shipped — OP4 timing meant the gap surfaced but the workaround was not stress-tested.

---

## Cross-reference

- **Linked notes:** `notes/moderator-mod-ux-notes.jsonl` lines 2–12 (T-15 baseline: 375px viewport pass; fraction-select 44px AAA fail; bottom-nav 44px AAA pass; status-pill contrast in both modes — 2 fail dark, 4 fail light; Add SP reachability 4+ taps from cold start; inventory quick-view FAB gated)
- **Linked IAPs:** all four (`iap-op1.md` through `iap-op4.md`) — the IAPs are the *primary* system of record for everything the app's UX surfaces failed to capture (demob, stop-work, CISM, cribbing audit)
- **Linked friction log entries (conductor-state.ui_friction_logged_by_participants):** lines 2 (guardClick), 10 (Add-SP Save Changes 4-OP regression), 11 (dashboard refresh debounce), 14 (no demob UI), 17 (no stop-work UI), 18 (multi-assignment ambiguity), 19 (orphan custom roles), 20 (estimatedLoad numeric contract), 25 (no CISM surface), 26 (no cribbing-decay surface), 27 (no heat-mitigation surface), 28 (no cost-capture surface), 29 (no time-unit surface)

---

## Synthesis tags (for the Phase 2 merge)

```
tag: Fix Add-SP modal Save Changes button visibility in Add path with integration test asserting offsetParent !== null | phase: NEW | severity: critical
tag: Fix guardClick first-submit swallow regression on Add-SP modal | phase: NEW | severity: critical
tag: Coerce or document estimatedLoad numeric contract to eliminate first-SP-creation PERMISSION_DENIED | phase: NEW | severity: critical
tag: WCAG 1.4.3 sweep across all 7 status pills in both light and dark modes to ≥4.5:1 AA | phase: NEW | severity: high
tag: Dashboard count cards refresh immediately on any mutation — eliminate ~30s debounce | phase: NEW | severity: high
tag: Demob UI surface — per-apparatus + per-individual lifecycle with Released terminal state | phase: 3C.4 | severity: high
tag: Stop-work UI — operation-level safety state + per-SP paused status with reason | phase: NEW | severity: high
tag: Render all holders at multi-assigned role nodes — not just first — with multi-holder badge | phase: NEW | severity: med
```
