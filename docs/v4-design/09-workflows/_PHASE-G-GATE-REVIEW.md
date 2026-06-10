# Phase G — Workflow Design — First-Impression Gate Review

**Panel:** 8 reviewers — 3 Chiefs (command tier), 4 line officers (trench tier), 1 doctrine-aware battalion-chief gate lens.
**Method:** Every reviewer except the gate lens opened the design **cold** — zero prior experience with the app, deliberately kept from the design rationale. Their confusion is signal about the real flow, not a knowledge gap to be argued with.
**Scope reviewed:** the 13 Phase G workflow specs (cold open / Quick Find, add shore point, deploy strut, cutting, runner, secured/returned, end of operation, role assignment & command transfer, hazard log, IC + task checklists, TCRM briefing, customizing checklists, sign-in, department setup, join-by-code, user management, audit log review).

---

## 1. Executive Summary

The panel's verdict is unanimous and consistent: **the design clearly had a firefighter's hands on it, and it gets the hardest doctrine calls right — but two specific decisions have to be answered before the next phase builds on them.**

Everyone — chief and field — trusts the philosophy. The app **records, it never blocks**: no countdown timers, no "safety hold" that freezes a shore point, no nagging alerts. Hazards are visible to everyone and blocking to no one. The lightest gesture (a tap) commits a reversible checklist step; the deliberate gesture (a slide) commits a consequential status change. Command transfer is a real, recorded ceremony for the first time. The after-action record assembles itself. Every reviewer called these out as worth protecting.

The one thing that draws a hard line from **three** reviewers — both chiefs and the gate — is **command transfer**. As written, when an Incident Commander hands off command, the incoming commander is *not* told. The handoff only appears "on their next sync," and the design itself admits it hasn't decided whether the incoming chief even has to accept. On a fireground, passing command is a closed-loop, spoken handshake — "you have command," "I have command." An app that moves command silently and hopes the other phone catches up can leave an incident with two people thinking they're in charge, or nobody. That is the load-bearing fix.

The second blocker is narrower but real: the **command-transfer briefing** (the ICS-201 the incoming IC receives) ships as an empty shell in v4.0 with its actual content held to v4.1 — so the receiving chief gets a professional-looking form with nothing in it, which is worse than no form at all.

Below those two, the field officers and the training chief surface a cluster of practical gaps that don't sink the design but will bite under real conditions: **gloved/wet operation of the slide gesture** (the cutter and two officers want a plain button, not a swipe), the **measurement entry control still being undecided** (the single most safety-critical number in the app), and a **rollout problem** — a one-time 24-hour invite code can't onboard a 40-person department, and the checklist editor that lets a department match its own SOPs is held to v4.1.

The recommendation is **pass-with-changes**: the foundation and format are right, the doctrine is right, and the gaps are specific decision points — not structural flaws.

---

## 2. Verdict Table

| Reviewer | Tier | One-line verdict |
|---|---|---|
| BC Marcus Reyes — combination-dept IC | Command | With changes, and one hard fix first: command transfer must close the loop before he'd trust it. |
| DC Angela Okonkwo — US&R / MCI / mutual-aid | Command | With changes — and **not yet for the multi-agency incident she runs**; transfer handshake + cross-agency record are deferred. |
| AC Dale Brunner — Training & Safety, dept-wide rollout | Command | With changes — governance bones excellent, but **can't train 40 people in one shift** as specified (invite code + checklist editor + user-manager UI). |
| Capt. Tony Marchetti — Rescue captain, shoring supervisor | Trench | With changes — bones are right, but won't put gloved slide-gestures + undecided measurement entry on the critical path of a real shore. |
| Lt. Dana Whitfield — saw operator, Cutting role | Trench | With changes — the saw screen was built by someone who watched a saw operator, but the step-back slide riding under the advance slide is a dealbreaker on a vibrating deck. |
| Lt. Kevin Soto — newer Engine LT | Trench | With changes — trusts the calculator completely; the slide-only lifecycle + cutting group/individual split is where a new officer fat-fingers under stress. |
| Lt. Priya Nair — Rescue LT, briefing/checklist officer | Trench | With changes — philosophy is exactly right; won't lean on the TCRM briefing because **it ships as an empty shell** (content deferred to v4.1). |
| BC gate reviewer — ICS-300/400, ran Type 2 | Gate | **Yes, with changes** — two specific blockers (transfer handshake, empty ICS-201); the rest are Phase H details that don't threaten the design. |

**Tally:** 0 reject, 0 unconditional pass, **8 of 8 = "yes/trust *with changes*."** No reviewer would run it as drawn; no reviewer rejected the design.

---

## 3. Blockers

De-duplicated. Each notes who raised it, the workflow, and whether it's a **design problem** (must change the spec/data model) or an **onboarding gap** (real, but "teach it once" / configuration rather than redesign).

### B1 — Command transfer has no closed-loop acknowledgment *(DESIGN — and the headline fix)*
**Raised by 3:** BC Reyes (command), DC Okonkwo (command), BC gate reviewer (gate). Workflow **#20**.
The outgoing IC confirms the handoff, but Principle 10 forbids a push, so the incoming IC is **not paged** — the transfer "appears on their next sync," and the spec admits it hasn't decided whether the incoming IC must explicitly accept. The gate reviewer is most precise about *why this is a Phase G problem, not a later one*: if the incoming IC is offline and the design requires their accept, **the incident has no recognized IC in the app** — and because End Operation is IC-gated, the operation literally cannot be closed. Reyes: *"a silent sync-based handoff is a safety gap and the one thing I cannot trust as written."* Okonkwo: *"No-push is fine for chatter; command transfer is not chatter."*
**This is a data-model question that shapes Phase H.** The gate's ask is concrete and small: state a working assumption with a fallback now — even *"command moves on the outgoing IC's confirm; the incoming IC receives a passive sync notification"* is enough to unblock.

### B2 — ICS-201 transfer briefing ships empty in v4.0 *(DESIGN)*
**Raised by:** BC gate reviewer (gate); echoed by AC Brunner / Lt. Nair on the same "empty shell" pattern elsewhere. Workflow **#20/#22**.
The briefing card the incoming IC receives has its structure in v4.0 but its content gated to v4.1 behind a flag. The gate reviewer: it *"looks complete but is empty of the most critical transfer datum… worse than no briefing card."* **Fix:** either populate it with the minimum-viable six SitStat datums (op name, elapsed, Safety Officer, open hazards, shore-point counts) in v4.0, or label it honestly as *"structure preview — not a transfer-ready brief."*

### B3 — Multi-agency is not actually supported at v4.0 *(DESIGN / scope — blocker for the scale Okonkwo runs)*
**Raised by:** DC Okonkwo (command). Workflows **#20, #31, #06/#08**.
Cross-department incident invite, command transfer to an out-of-department (federal TF) commander, and multi-agency audit-log roll-up are **all deferred to v4.5**. *"The unified, defensible Surfside-scale after-action that is the entire reason I'd adopt this doesn't exist at v4.0."* This is a known, decided deferral rather than an oversight — but it is a true blocker for the MCI lens and should be **named explicitly** so a deputy chief isn't surprised.

### B4 — A one-time, 24-hour invite code can't onboard a department *(ONBOARDING / DESIGN gap)*
**Raised by:** AC Brunner (command, Training). Workflow **#07/#08**.
*"I have 40 people to onboard across three shifts and I am NOT getting all 40 phones signed in within 24 hours."* A single-use code means one person joins and the code is dead; no reusable/regenerable/QR path is documented in any onboarding spec. **This is the exact thing the rollout lens exists to catch.** Borderline between design and onboarding — the *capability* (a reusable code) doesn't exist yet, so it's a spec gap, not just a training note.

### B5 — Checklist editor AND baseline content both deferred to v4.1 *(DESIGN deferral — kills the rollout's headline capability)*
**Raised by:** AC Brunner (command); Lt. Nair independently hit the same empty-shell wall on the TCRM briefing. Workflows **#25, #22, #24**.
The whole point of the checklist feature — tailor it to *our* SOPs — and even the generic baseline step *text* are both v4.1. *"A briefing checklist with no questions in it is a clipboard with no form on it — I can't use it to brief, only to pretend I did"* (Nair). For Training & Safety, the headline capability arrives a release late, and crews must be told that up front.

### B6 — Step-back slide sits directly under the advance slide on the same card *(DESIGN)*
**Raised by:** Lt. Whitfield (trench, saw) as a blocker; Capt. Marchetti, Lt. Soto raised the same gloved-slide risk at major severity. Workflow **#13 / slide-to-advance**.
Forward-done and backward-undo are opposite-consequence actions a thumb-width apart on a vibrating deck. *"Mis-swipe under saw vibration and you reverse a finished cut or kick it out of the queue."* The fix the field wants: make undo **deliberate and off-axis** (long-press / behind a confirm / not a parallel swipe lane), and give every slide a plain labeled button — *"give ME the buttons too,"* not just screen-reader users.

> **Note on the two trench officers who logged *zero* blockers** (Marchetti, Soto, Nair): all three still said "with changes." Their "no formal blocker" means *the cold-open self-serves and nothing makes them abandon the app* — but each named the gloved-slide gesture as the thing that would make the operational side untrustworthy under stress. Treat B6 as effectively a 4-reviewer concern.

---

## 4. Major Issues

De-duplicated; grouped by theme. (Severity = "major" across reviewers.)

### M1 — No PAR / accountability roll-up on the command picture
**Raised by 3:** Reyes, Okonkwo, gate. SitStat shows a personnel *count*, but *"a personnel COUNT is not a PAR."* The IC's recurring obligation — the every-30-minute PAR clock and who's accounted for — isn't on the command home, and accountability is exiled to a separate screen **under Inventory** ("the wrong mental home for a chief"). Gate's minimum ask: a PAR shortcut or a "pending rows" badge in the persistent chrome so the IC never tab-switches mid-PAR.

### M2 — No per-Division / per-Group roll-up at scale
**Raised by:** Okonkwo (and gate, via the Task-Checklist attach-target question). *"'Returned 12 · Secured 0' aggregated across the whole incident tells me nothing about WHICH division is behind."* SitStat scales in event volume but **flattens the geography** — at Surfside scale the IC is back to a paper T-card board to find the problem floor.

### M3 — End Operation is a terminal foot-gun
**Raised by 3:** Reyes, Okonkwo, gate. No re-open ("start a new operation" is the only remedy), **no warning if shore points are still deployed / equipment not returned.** The gate makes the consequence concrete: *"Rescue 2 leaves the scene with 3 fewer struts in its available count than it physically has — the count is wrong for the next incident."* The fix is one sentence in a modal that already shows a shore-point count; deferring it to Phase H "copy" risks it slipping to v4.1.

### M4 — Measurement / Division entry controls still undecided — the most safety-critical inputs
**Raised by 2:** Marchetti, Soto (echoed by Whitfield). The 1/8" fraction control ("inline strip vs. picker-sheet") and the Division control ("scroll wheel vs. segmented vs. dropdown") are both open questions. *"The single most safety-critical number… is still undecided"* (Marchetti). A scroll wheel is *"the worst possible gloved control — they overshoot."* Lock these as big tap targets, no spinners, no tiny fraction strips.

### M5 — Briefing / checklist screens ship as empty shells
**Raised by 2:** Nair, Brunner (gate flagged the same on the ICS-201). The TCRM four steps and five crew questions are placeholders until v4.1; the v4.0 surface can only *timestamp* that a briefing happened, not drive one. See B2/B5 — this is the same pattern surfacing across three screens.

### M6 — Gloved single-action vs. multi-slide friction at the saw
**Raised by 2:** Whitfield, Marchetti. Clearing one cut takes **two precise drags** (Mark Cut Done → Send to Runner) plus the step-back lane. *"I expected one decisive action per finished cut — a fat button I can hit with a gloved knuckle."* Distinct from B6 (which is about the *direction-confusion danger*); M6 is about *speed at the worst moment*.

### M7 — Over-capacity Deploy card looks like a safe one
**Raised by:** Marchetti (major), Soto (noted the gate is good but the visual sameness is the risk). The warning card is the same shape with a small ⚠ and the Deploy button in the same spot. *"The gate catches me, but only after I've already committed the tap."* Make the dangerous option visually unmistakable, not a same-shaped card with a triangle.

### M8 — Display-name capture is an unresolved TBD across three specs
**Raised by:** Brunner. If a captain joins and never sets a name, *"my audit log and command checklist sign 'FF (device-abc123)' instead of a human. That guts accountability."* Every signed-attestation win downstream depends on this being a settled, mandatory onboarding step.

### M9 — User Manager UI may not ship in v4.0
**Raised by:** Brunner. If the security rules ship but the management screen doesn't, *"I can't create a second Admin or custom roles — the department is ungovernable at rollout."* A go/no-go question for the whole training plan.

### M10 — Cutting-Station discoverability + "which cut is NEXT"
**Raised by 2:** Whitfield, Soto. The saw operator's screen is buried two levels into a tab named for someone else's job (Operations sub-nav), with no one-tap landing if not pre-assigned. And three identical "48-1/2"" cards stack with no explicit **NEXT/#1** flag — "it's the top one" fails when the list scrolled.

### M11 — Sync-only with no attention-grab forces phone-babysitting
**Raised by:** Whitfield. New cuts and pulled cards appear only on sync with nothing that visibly ticks — *"I have to keep glancing at the phone instead of working the saw."* The ask is modest and respects no-push: a count badge that visibly increments, and a pulled-card red-slash that **stays until tap-dismissed** rather than racing a background render.

### M12 — Audit-log gaps at scale
**Raised by:** Okonkwo. Which ICS forms actually render in v4.0 is unresolved; OP-period isn't a first-class filter for multi-day review; multi-agency log roll-up is deferred. *"'We captured it but you may not be able to export the form yet' is a real gap."*

### M13 — Task-Level-Checklist attach-target undecided for multi-Group ops
**Raised by:** gate. If the checklist attaches at operation level there's one instance for the whole op and two Group Supervisors attest the same thing; the current lean (one-per-op) *"collapses multi-Group visibility."* A directional answer is needed in Phase G because it drives the Phase H data model.

### M14 — "Phone is the floor" fights the saw deck
**Raised by:** Whitfield. Both hands are on a saw and a strut; the phone is in a chest pocket. *"The cut table should assume a propped tablet as primary, phone as fallback"* — priority drag-reorder is already tablet-only, so the posture is half-acknowledged.

---

## 5. Cross-Cutting Themes (raised by 2+ reviewers — these matter most)

1. **Command transfer must close its loop.** (Reyes, Okonkwo, gate.) The single most-agreed problem in the panel. Three reviewers independently called a silent sync-based handoff a safety gap.
2. **The gloved/wet slide gesture needs a plain-button equivalent on the phone.** (Marchetti, Whitfield, Soto, Nair-adjacent.) Four trench voices distrust a precise horizontal drag as the *primary* commit for the safety-consequential lifecycle. The spec already promises slide-alternatives for assistive tech — *"give ME the buttons too."*
3. **PAR / accountability belongs on the command picture, not under Inventory.** (Reyes, Okonkwo, gate.) A headcount is not a PAR; the IC shouldn't tab-switch mid-accountability.
4. **End Operation needs a guard rail.** (Reyes, Okonkwo, gate.) Warn on unreturned equipment; give some recovery for a mis-tap/reflare. The inventory consequence makes this command accountability, not cosmetics.
5. **"Empty shell" screens.** (Brunner, Nair, gate.) The same pattern across the ICS-201 brief, the TCRM briefing, and the checklist content: structure ships v4.0, the *words that are the actual deliverable* slip to v4.1. Crews must be told which surfaces are decorative at launch.
6. **The most safety-critical *inputs* are still undecided.** (Marchetti, Soto, Whitfield.) Measurement (1/8" fraction) and Division entry are open questions — the two numbers that drive every cut.
7. **Free-text hazard location can't reliably badge the right shore-point cards.** (Reyes, Nair, gate.) Everyone praises the no-safety-hold hazard doctrine, and everyone flags that without a structured area binding (deferred to Phase H) the badge may land on the wrong cards or none. The gate's ask: state a conservative v4.0 fallback (Division-level match) so a coder doesn't silently pick one.
8. **Guest-first cold-open is loved for speed but creates a "what is this?" gap for first-timers** — and a guest IC silently loses the after-action email. (Brunner, Soto, Reyes.)

---

## 6. Command Tier vs. Trench Tier — Where They Agreed and Diverged

**This contrast is the point of the panel.**

### Where both halves AGREED
- **The no-block / records-not-gate philosophy is right.** Universal. The chief wants it because the app must inform his go/no-go, not make it; the saw operator wants it because *"an app should never freeze my shore because someone logged a hazard."* Same doctrine, both ends of the org chart.
- **Terminal/irreversible actions correctly use buttons + confirm, not swipes.** Marchetti and the gate both singled out Remove & Return / End Operation as *"gated properly… good judgment."*
- **Severity-as-word-not-color, source-of-strut on the card, the promoted cut length** — praised top to bottom.

### Where they DIVERGED — the revealing contrasts

- **The slide gesture: chiefs barely noticed it; the field nearly revolted.**
  The command tier is largely silent on slide-to-advance (they live on SitStat, not the cards). The **trench tier flagged it from four directions** as the thing that fails with gloves on a wet screen. A chief reading only the command specs would sign off on a gesture the people actually committing the lifecycle don't trust. *This is the classic command-vs-trench blind spot the panel was designed to catch.*

- **Command transfer: the chiefs' favorite screen is also where they draw the hard line; the field shrugged.**
  Every chief called transfer the **best-designed piece in the set** — *and* the one blocker. Marchetti skimmed it and said *"not my hole-work… looks sane for the CP."* The danger lives entirely at the command tier; the field never touches it. The reverse of the slide divergence.

- **"Phone is the floor": a clean design principle to command, a fight-with-physics to the saw operator.**
  Whitfield: designing the cutter's primary as a phone he must *"pick up, wake, and precisely swipe twice per strut fights the physical reality of the job"* — he wants a propped tablet as primary. No chief raised this; they don't run the saw.

- **The cutting group-vs-individual split: invisible to chiefs, a stress-trap to a new officer.**
  Soto (newer LT) can't hold "group-wide pre-cutting vs. individual cutting-onward, across two screens" in his head under stress. The doctrine-aware tier understands *why* the split exists; the cold field officer just advances the wrong thing.

- **Onboarding: a non-issue at the fireground, a rollout-killer for the trainer.**
  The invite-code / checklist-editor / user-manager gaps don't appear in a single trench review — they never see them. For AC Brunner they're the whole ballgame: *"a rollout I literally cannot govern."* The command tier itself splits: the IC and DC care about the incident; the Training chief cares about the 40 phones before the incident.

**Net:** the two halves validate *different* parts of the design and are blind to each other's. The command tier guards the command picture, the transfer, the record, the scale story. The trench tier guards the gloved gesture, the input controls, the saw-deck reality, the new-officer mental model. Neither alone would have caught both the silent command handoff **and** the wrong-lane swipe.

---

## 7. What Genuinely Works (wins worth protecting)

These drew praise from multiple reviewers and should be defended against any "simplification" in Phase H.

- **No-push / no-safety-hold honored throughout, zero violations.** The gate audited all 13 workflows and found every cross-surface story correctly says "on next sync," and every hazard badge informs the slide without gating it. *"That alone puts this ahead of 90% of the tools I've evaluated."*
- **Slide-vs-tap gesture mapping** — light gesture (tap) for a reversible doctrine check, deliberate slide for the consequential status change. *"Shows field experience"* (gate); *"my crew won't confuse 'I attest' with 'I advanced'"* (Nair).
- **Command-transfer ceremony itself** — full-screen takeover, current IC shown, append-only role history, gold accent tracking who's in command. The strongest screen in the set for every chief; *"a real, auditable transfer of command"* where v3 moved it implicitly.
- **The six SitStat datums + persistent Safety Officer + broadcast C-13 board** — *"the right six,"* *"exactly what I'd throw on the CP monitor."*
- **No countdown timer on the briefing.** *"A countdown timer IS a safety-hold."* Doctrinally correct and universally praised.
- **Cutting Station: one promoted cut-length number, capacity hidden, two-step Cut-Done/Send-to-Runner, red-slash on pulled cards, cut-done flag preserved on step-back.** *"A saw operator's screen built by someone who watched a saw operator."*
- **Terminal actions are buttons + confirm, never swipes.** Remove & Return, End Operation, Delete.
- **Always-reversible, no timed undo.** *"I never race a 5-second countdown with my hands full."*
- **Audit log as the immutable event stream and the single export convergence point** (ICS-201/203/207/208/209 + PAR snapshot + CSV), with **role-at-time** captured. *"The after-action backbone most tools fail to keep."*
- **Governance bones:** anti-lockout enforced in security rules (not just UI), back-office role and ICS command position kept as two orthogonal axes (*"app-admin does NOT outrank the IC"*), sub-two-minute one-field department setup, paste-a-code join with plain-English errors.
- **Guest-first cold-open with offline auth queueing** — calculator-first, no auth wall, usable in ten seconds, won't strand a crew in a no-signal basement. Loved by every trench reviewer as the reason they didn't quit.
- **Plain-language "why nothing fits" messages** on the Pending card.
- **Spelled-out NIMS titles** (no IC/SO/Ops acronyms) and the **informational, never-blocking span-of-control badge.**

---

## 8. Gaps / Expected-but-Absent

Things reviewers expected to find and didn't (beyond the blockers/majors above):

- **An "establish/take command" action at cold open.** As IC, you land on the strut calculator, not command; command is silently auto-granted to whatever phone opened the op. (Reyes, Okonkwo.)
- **A reusable / multi-use / regenerable / QR department join code** for bulk onboarding. (Brunner.)
- **An onboarding-status / who-has-joined view** for the trainer to see who's still not in the department. (Brunner.)
- **Glove-and-radio-safe invite-code format** (ambiguous-glyph 0/O, 1/l avoidance still unresolved). (Brunner.)
- **A defined role gate for who can Start/End an operation** — currently "by convention," an admitted open question. (Reyes.)
- **A fast-path Add Shore Point** (measurement + shore type now, location/label later) instead of a full multi-field form completed kneeling in mud. (Marchetti, Soto.)
- **Spelled-out shore-type names or thumbnails** — "Lp Shore," "3-Post" are abbreviations a first-timer can't decode, while the strut result cards *do* carry system identity. (Soto.)
- **Crew/roster binding to the briefing** — the five questions are "per crew member," but who-got-briefed is deferred; the accountability officer needs the *names*, not just a timestamp. (Nair.)
- **A discard-guard on the briefing** — dismissing with ✕ "creates nothing" with no prompt; a fat-finger silently destroys the briefing just delivered. (Nair.)
- **Clarity on "Speak up authority confirmed"** so command can't misread a green check as the app providing a stop-work function it explicitly does not. (Nair.)
- **A tiebreaker for My-Role vs. org-chart-assignment collision** — "Accountability reconciles" has no mechanism; affects deploy/return role gates during sync windows. (gate.)
- **Confirmation that the in-app audit record persists independent of after-action email success.** (gate.)
- **Span-of-control scope** — whether the 6/7 badge counts org-chart sub-positions only or also individual resource rows (it would fire wrongly for a Group Supervisor with 6 resources). (gate.)

---

## 9. Gate Recommendation

### Recommendation: **PASS-WITH-CHANGES**

**Reasoning.** Eight of eight reviewers landed on "trust it / yes — *with changes*." None rejected the design; none passed it clean. The foundation, format, and doctrine are right — the gate reviewer's words: *"a well-disciplined Phase G set. The foundation and format are exactly right. The gaps are not structural — they are specific decision points that ran out of road at Phase G and need a position before Phase H builds on them."* The two true blockers are both **decisions, not redesigns**, and each has a concrete, low-cost fix already named by the panel. Holding the entire phase for them would be disproportionate; shipping Phase H without resolving them would build on sand.

### Must-fix BEFORE Phase H begins implementation

These are the items that **shape the data model or mislead a commander** — they cannot be deferred into Phase H as "details":

1. **B1 — State a working assumption + fallback for the command-transfer handshake.** Even *"command moves on the outgoing IC's confirm; incoming IC gets a passive sync notification; never-accepts case = command stays validly transferred"* unblocks the data model. This is the headline fix; three reviewers gate on it.
2. **B2 — Either populate the ICS-201 transfer brief with the minimum-viable six SitStat datums in v4.0, or label it honestly as "structure preview — not transfer-ready."** Don't hand a commander an empty form that looks complete.
3. **M3 — Add the unreturned-equipment warning to the End Operation confirm modal** (one sentence in a modal that already shows the count), and state a position on mis-tap/reflare recovery. Inventory accuracy at close is a command issue.
4. **Cross-cutting #7 — State a conservative v4.0 hazard→shore-point matching fallback** (Division-level match), so the badge behavior isn't silently chosen by whoever codes it.
5. **M13 — Give a directional answer on the Task-Level-Checklist attach-target** for multi-Group ops; it drives every Phase H binding.

### Should-fix in Phase H (high-priority, but don't block the gate)

- **B6 / Theme 2 — Add a plain labeled Advance / Step-back button alongside every slide *on the phone* (not just for assistive tech), and make undo off-axis/deliberate.** This is the most-raised trench concern; treat it as near-must.
- **M4 — Lock the measurement (1/8") and Division entry as big tap targets** — no spinners, no tiny fraction strips.
- **M1 — Put a PAR / pending-rows indicator (or shortcut) in the command chrome.**
- **M7 — Make the over-capacity Deploy card visually unmistakable.**
- **M8 / M9 — Settle mandatory display-name capture and confirm whether the User-Manager UI ships in v4.0.**

### Must be honestly disclosed (scope, not defect)

- **B3 — Multi-agency (cross-dept incident invite, out-of-dept command transfer, multi-agency log roll-up) is v4.5.** Name it plainly so the MCI lens isn't surprised mid-incident.
- **B4 / B5 — The bulk-onboarding invite path and the checklist editor + baseline content land in v4.1.** Training & Safety must be able to plan around this; *"my crews need to be told that up front."*

**Bottom line:** the design earns the gate. Lock the five must-fix decisions, schedule the should-fix list into Phase H with the gloved-button work near the top, and put the v4.1/v4.5 deferrals in writing where a chief will see them. Then Phase H can build with confidence.

---

## 10. Resolutions Applied (2026-06-09)

Alex's gate decisions, applied to the specs. The panel findings above are left intact.

### The five must-fix decisions (Workstream A) — all encoded
| # | Gate item | Resolution | Where |
|---|---|---|---|
| B1 | Command transfer silent handoff | **[ADR-021](../11-decisions/ADR-021-command-transfer-handshake.md)** — two-party handshake; the **outgoing IC retains command until the incoming accepts**, so there is always exactly one IC of record and End-Op is always reachable (removes the offline-stranding failure). Alex chose "requires accept"; the retain-until-accept invariant makes it safe. | `20`, `30`, `16` |
| B2 | ICS-201 brief ships empty | v4.0 ships a **real auto-assembled six-datum SitStat snapshot brief** (op name, elapsed, current IC, Safety Officer, open-hazard count, shore-point counts) — never a complete-looking blank; doctrine-expanded fields v4.1. | `20`, `22`, `33` |
| M3 | End-Op foot-gun | **Unreturned-equipment warning ships v4.0** in the confirm modal (count + inventory-shortfall consequence); informs, doesn't block. | `16` |
| #7 | Hazard→SP matching | **v4.0 Division-level fallback** decided — badge every SP in the resolved Division; if unresolvable, log + header only, **never the wrong card**. | `21`, `32` |
| M13 | Task-checklist attach-target | **Decided: per-Group/per-task instance, not one op-wide shared tree** (so two Group Supervisors never attest the same instance). | `23`, `22`, `24` |

### The disclosures — inverted by Alex's scope call (Workstream B)
- **B3 / M12 (multi-agency)** and **B4 (bulk onboarding)** are **no longer deferrals** — Alex pulled **mutual aid into v4.0** (**[ADR-022](../11-decisions/ADR-022-mutual-aid-v40-qr-guest.md)**): cross-dept incident sharing, **QR-everywhere join** (multi-use/revocable code — fixes B4), **guest participation** for un-provisioned units, and the **merged multi-agency audit roll-up** all ship v4.0. Specs `32`/`52` rewritten to v4.0; ripples in `06`/`07`/`08`/`20`/`31`/`41`/`53`. The v4.0 slice expanded accordingly (master plan flagged).
- **B5 (checklist editor + baseline content = v4.1)** remains the one honest disclosure (governed by ADR-020).

### Should-fix → Phase H trackers
B6/Theme-2 (buttons-beside-slide), M4 (measurement/Division control lock), M1 (PAR in command chrome), M7 (over-capacity card), M8 (mandatory display-name), plus the QR scanner — logged as [`99-open-questions.md`](../99-open-questions.md) #37–#42.

**Gate status:** all five must-fix decisions encoded; the design is ready for Alex's **#239 final sign-off**.
