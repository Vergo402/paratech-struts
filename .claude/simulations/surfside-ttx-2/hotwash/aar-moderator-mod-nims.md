# Army AAR — Moderator `mod-nims`

## Subject identification

- **Subject ID:** `mod-nims`
- **Role / Persona:** Moderator — NIMS / ICS Doctrine (silent observation per FEMA ICSSCI SM-0322)
- **Active window:** E+0:00 → E+36:00 (full event)
- **Submission date / wall-clock:** 2026-05-17

## Operational period(s) covered

All four operational periods: OP1 (E+0:00→E+4:00 initial response), OP2 (E+4:00→E+16:00 TF-State + TF-Fed-Alpha integration), OP3 (E+16:00→E+28:00 sustained operations + IST integration), OP4 (E+28:00→E+36:00 mature ICS with 5th Section standup, demob discussion, recovery transition).

---

## Question 1 — What was supposed to happen?

My observation framework rested on FEMA ICSSCI SM-0322 and the 12-item NIMS checklist (mod-nims-checklist.md). The v4.0.0 hypothesis I was specifically there to stress was MASTER-PLAN Phase 3C — that FieldShore's current ICS data model (a 9-role flat default tree, singular `ic` field, no operational-period concept, no role history, no Branch tier, and the doctrinally-incorrect `group` field on shore points) would scale poorly from an OP1 Type IV/V single-engine response up to an OP4 mature Type II IST-integrated incident with a full 5-Section command staff.

Doctrinally, the event should have produced: (a) clean single-IC discipline through three OP1 transfers (Reyes→McAllister→Park) with the prior IC slot cleared each time; (b) Unified Command standup at E+6:15 (Sheriff Garza + FD IC) once law enforcement integrated; (c) Command Staff (Safety, PIO, Liaison) reporting directly to IC and *not* counting against IC's span of control; (d) Branch-tier emergence (Rescue Branch, Heavy Rigging Group, Search Group) when OSC's direct-report count crossed 7; (e) a full 5-Section structure by OP4 (Operations, Planning, Logistics, Finance/Admin, plus the IST Plans cell integration); (f) OP-boundary visual markers at E+4:00 / E+16:00 / E+28:00 so participants knew which operational period they were in; (g) preserved role history across 5 IC transfers and 6 OSC rotations; (h) functional NIMS Groups (Shoring Group, Search Group, Rescue Squad Alpha) distinct from apparatus assignment; (i) a Staging area concept under OSC for the Engine 4/5/6/7 holding pool; and (j) doctrinal differentiation of Strike Team (same kind) vs Task Force (mixed kind) for resources like Squad 1 + Squad 2 + USAR-Alpha vs TF-State / TF-Fed-Alpha.

My tools were silent preview_snapshot/preview_eval (read-only) and the participant-visible event log. I added 8 baseline notes during the T-15 init window capturing the cold-start state of `ICS_ROLES_DEFAULT`, the Start Operation modal, the empty `commandView` node, the apparatus typing taxonomy, and the absence of an OP indicator in the Operations tab header.

---

## Question 2 — What actually happened?

The event clocked 5 IC transfers and 6 OSC rotations across 4 OPs (`conductor-state.total_cmd_transfers: 5`, `total_osc_rotations: 6`). Specifically: Reyes→McAllister at E+0:09, McAllister→Park at E+0:45, Park→Whitaker at E+9:00, Whitaker→Vasquez at E+21:00, and Vasquez→Whitaker (return) at E+28:00. OSC churn was even higher — McAllister→Brennan (E+5:00), Brennan→Marquez (E+14:00), Marquez→Bishop (E+21:00), Bishop→Marquez (return) at E+30:00. **Every one of those 11 transitions overwrote the prior role assignment with zero history retained on the apparatus or individual record** — confirming the `v4_phase: 3C.5` gap I flagged at T-15 (mod-nims notes line 1 / role-tree observation, line 4). The `ui_friction_logged_by_participants` log captures this directly: *"Role history not preserved on apparatus or individual role transitions (v4.0.0 3C.5 gap confirmed in OP1 + 4x more in OP2 + 1 more in OP3 = 6 total)"*.

The 5th-Section gap I predicted at T-15 (mod-nims notes line 4: *"entire Planning, Logistics, Finance/Admin sections… are absent"*) materialized exactly as expected — and at the **worst possible moment**. Finance/Admin Section Chief was not needed through OP1, OP2, and OP3; the structure stood up at E+28:00 in OP4 with Director Penz, and only then did the participant discover that `ICS_ROLES_DEFAULT` ships with no Finance/Admin SC slot at all (conductor-state.op4_closed.finance_admin_section_outcome: *"default ICS_ROLES_DEFAULT in app.js missing Finance/Admin SC (v4.0.0 Phase 3C.1)"*). Penz had to be seated via custom-role creation; then Cost UL and Time UL had to be added beneath; then Penz was double-hatted as Cost UL via a "shadow individual" workaround because the app has no multi-role assignment per individual (friction log: *"No double-hat / multi-role assignment per individual; Penz FASC+Cost UL required shadow individual workaround"*).

Unified Command was a comparable failure mode. Sheriff Garza joined at E+6:15 (`op2_closed.uc_law_established`), but the app's singular `ic` field forced the participant to leave Garza outside the ICS data structure entirely — Garza appears in IAPs and event log but is not a co-equal IC node. This is the exact gap I flagged at T-15 (notes line 3) and the v4.0.0 Phase 3B.4 hypothesis: replace singular `ic` with an `IC` collection.

Branch-tier rendering was data-side success, UI-side failure. OP2 closed with `branch_structure_outcome: "data-layer-accepted; UI rendering at depth not verified (renderOrgChart bare-call crash)"`. Custom roles total climbed 0→13→21→24 across OP1→OP2→OP3→OP4. The org chart's depth-4+ render path was never verified to work — every observation came through the underlying data model. Participants logged: *"Branch/Group/Unit tier custom roles work data-side; UI render path at depth 4+ unverified (OP2)"*.

OP-boundary markers: I flagged at T-15 (notes line 8) that *"no operational-period indicator in header — when OP1->OP2 boundary fires at E+4:00 there is no visual marker that the operational period changed; entire 36-hr op will read as one continuous timeline"*. This held — IAPs were filed at every boundary (4 IAPs total, 19,190 cumulative words) but the app surface gave the participants no signal that they had crossed into OP2/3/4. IC #4 Whitaker took command at E+9:00 with no indication he was operating in OP2.

The `group` field on shore points (doctrinally incorrect — NIMS Group is functional, not a resource) was used 66 times for apparatus assignment with no field rename. Multi-assignment ambiguity at Group Sup tier was flagged in OP3: *"apparatus chips + new individual chair both attached to same role; UI shows only first"*. Orphan custom roles: *"old custom_medical_unit role remained after Patel escalated to Medical Branch Director (OP3)"*.

---

## Question 3 — Why was there a difference?

Three root causes, in priority order.

**1. Doctrine-flat data model.** `ICS_ROLES_DEFAULT` was designed for the Type IV/V single-engine response that the app originally targeted. The 9-role default tree models a working fireground, not a Type II USAR incident. Every doctrinally-required element above the default tree — Command Staff (PIO/LNO/Safety as a Command-Staff *tier* not counted against IC span), the Planning Section, the Logistics Section, the Finance/Admin Section, Branch tier, Group tier (functional, distinct from apparatus), Strike Team vs Task Force resource typing, Staging — must be hand-built as a custom role. The app accepted those custom roles as data but provided no doctrinal scaffolding, no NIMS Type I-V preset selector, no span-warning at the Section→Branch transition, and no validation that (e.g.) Safety reports to IC rather than Operations. The result was that the participants did all the doctrinal labor in their heads, with the app acting as a passive data store. This is the *core* finding for v4.0.0 Phase 3C.

**2. Immutable role assignments.** The role-assign code path is a simple overwrite (`roles[targetId] = roleId`). It does not append to a history log. It does not record the wall-clock or event-clock of the change. It does not preserve the prior holder's record. Across 11 IC/OSC rotations the app permanently lost the answer to "who was IC at E+5:30, and when did they hand off?" This is not a UI issue — it is a data-shape issue (v4.0.0 Phase 3C.5).

**3. App-as-tool, not app-as-record.** The participants used FieldShore as an *operational* tool (Quick Find, deploy struts, track SP status) but used IAPs (4 markdown documents, 19,190 words) and the event log as the *system of record*. The app's ICS surface (Command tab, org chart) was authoritative for the *current* moment only — every doctrinal artifact requiring temporal continuity (role history, OP boundaries, demob lifecycle, time-unit check-in/check-out, cost capture) lived outside the app. By OP4 the participant explicitly logged *"Time Unit Leader has no in-app surface — no individual check-in/check-out timestamps; no shift-tracking"* and *"Cost capture has no in-app surface — Cost UL operating entirely outside FieldShore"*.

Coordination model was not a root cause — the silent-moderator constraint worked correctly; I did not interrupt or signal, and the gaps that surfaced are app/doctrine gaps, not coordination gaps.

---

## Question 4 — What can we learn from it / what should change?

Concrete, MASTER-PLAN-tagged actions for v4.0.0 and v4.x.

**v4.0.0 (must-ship, doctrinal-correctness):**

- **Phase 3C.1** — Add NIMS Type I–V preset selector to the Start Operation modal. At minimum Type II preset must include all 5 Sections (Operations, Planning, Logistics, Finance/Admin, with stub UL roles beneath each) plus full Command Staff (PIO, LNO, SO) plus Staging under OSC. Type III preset = 4-Section minimum (no Finance/Admin). Type IV/V keep current default. **Severity: critical** — the Finance/Admin gap at E+28:00 was a doctrinal hole that propagated into custom-role + shadow-individual + Cost-UL-outside-app cascade.
- **Phase 3B.4** — Replace singular `ic` field with `IC` collection. Unified Command is a *primary* USAR doctrine pattern, not an edge case. Surface at least 2 IC slots in the Command tab from operation start.
- **Phase 3C.5** — Role history as append-only log. Every `roles[targetId] = roleId` write must dual-write a `roleHistory[targetId][ts] = { from, to, byUid, wallclock, eventClock }` record. Surface a "Role History" view per role and per individual.
- **Phase 3C.3** — Operational-period indicator in Command tab header AND Operations tab header. At each OP boundary surface a "Now entering OP N" transition. Tag every write (status update, role assignment, deploy) with `opNumber` so post-hoc export can filter by OP.
- **Phase 3C.7** — Rename SP `group` field to `assignedResource` and introduce a separate `nimsGroup` field for functional grouping (Shoring Group, Search Group, Rescue Squad). The current overload is a doctrinal error that confuses every participant on first contact.
- **Phase 3C.2** — Role-typing + reparent enforcement. Safety blocked from reparenting under Operations. Branch tier surfaced as a first-class concept (not a freeform custom role). Span warning at Section→Branch transition (>7 = warn) AND at Section→multi-Branch suggestion (offer "Convert to Branches" workflow).

**v4.0.0 (must-ship, doctrinal-completeness):**

- **NEW** — Staging area concept under OSC. Engines 4/5/6/7 should have a "Staging" parent that is doctrinally distinct from "Assigned." Demob discussion at E+30:00 surfaced the inverse gap — released apparatus needs a "Released" terminal state too.
- **Phase 3C.4** — Apparatus check-in / demob lifecycle with timestamps. Currently no demob UI surface anywhere (friction log OP3). Demob discussion was held entirely on paper.
- **Phase 3C.1 / NEW** — Resource typing: Strike Team vs Task Force as first-class. TF-State, TF-Fed-Alpha, TF-Fed-Bravo, TF-Fed-Charlie should render as Task Force (mixed-kind, designated leader, common comms). Future Squad 1+2 grouping should be representable as Strike Team.
- **Phase 3C.6** — Personnel + PAR. Apparatus chips currently lack personnel counts; PAR cannot be computed.

**v4.x (next minor):**

- **NEW** — Multi-role assignment per individual (Penz FASC+Cost UL double-hat). At minimum allow a single individual to hold ≤2 roles with explicit conflict flagging.
- **NEW** — Orphan-role cleanup on escalation (Patel Medical Unit → Medical Branch Director left orphan custom_medical_unit role).
- **Phase 3A.2 + 3B.1** — Per-write attribution visible (uid + agency on every Firebase record); agency tagging on apparatus chips. (Becomes urgent at IST integration in OP3.)

**Doctrine / scenario design changes:**

- Future TTXs should include a *deliberate* Finance/Admin standup injection in OP1 or OP2 (not OP4) — the late standup masked how broken the app's Type II readiness is until very late in the event.
- Moderator framework should add a "role history snapshot at OP boundary" duty so the audit trail for the role lineage is captured externally even if the app doesn't preserve it.

---

## Cross-reference

- **Linked notes:** `notes/moderator-mod-nims-notes.jsonl` lines 2–8 (T-15 baseline: Start Op modal absence of Type I-V preset, UC toggle, FASC slot; OP indicator absence; Staging absence; apparatus typing taxonomy gap; default-role-span observation)
- **Linked IAPs:** `iaps/iap-op1.md`, `iaps/iap-op2.md`, `iaps/iap-op3.md`, `iaps/iap-op4.md` — all four; especially `iap-op4.md` (6,339 words) which documents the Finance/Admin standup
- **Linked friction log entries (conductor-state.ui_friction_logged_by_participants):** lines 4, 5, 6, 7, 19, 22, 23, 25 (ICS_ROLES_DEFAULT gaps, role history loss, multi-assignment ambiguity, orphan roles, FASC missing, no double-hat)

---

## Synthesis tags (for the Phase 2 merge)

```
tag: Add NIMS Type I–V preset selector to Start Operation modal with full 5-Section Type II preset including Finance/Admin SC | phase: 3C.1 | severity: critical
tag: Replace singular ic field with IC collection to seat Unified Command at OP2+ | phase: 3B.4 | severity: critical
tag: Append-only role history log with eventClock + wallclock per assignment write | phase: 3C.5 | severity: high
tag: Operational-period indicator in Command + Operations tab headers with OP transition marker | phase: 3C.3 | severity: high
tag: Rename SP group field to assignedResource and add separate functional nimsGroup field | phase: 3C.7 | severity: high
tag: Add Staging area as first-class node under OSC in default tree | phase: NEW | severity: high
tag: Apparatus demob lifecycle with timestamped Released state | phase: 3C.4 | severity: high
tag: Multi-role assignment per individual with explicit conflict flagging | phase: NEW | severity: med
```
