---
name: level-iv-sim
description: "Run the FEMA Level IV structural collapse simulation — URM strip mall partial collapse. Stress-tests FieldShore at working-incident scale: 4 apparatus, 8 shore points (including grouped T-Shore), single OP period. Use this skill whenever Alex says 'run level iv simulation', 'level 4 sim', 'hamden sim', or '/level-iv-sim'."
---

# Level IV Simulation — Hamden Strip Mall (URM Partial Collapse)

Stress-tests FieldShore at working-incident scale: multiple apparatus, a Safety Officer, grouped shore types (T-Shore), and the full 6-status SP lifecycle. This is where multi-apparatus inventory management, role assignment, and the grouped shore point phase-based split first get exercised. Weather conditions (rain, 42 deg F) stress mobile UX — touch targets, readability in low light.

> **TRAINING DISCLAIMER:** This is a fictional scenario for software testing purposes only. All persons, addresses, units, and events are fabricated. No real incident is depicted or referenced.

---

## Scenario

**Building:** 1-story unreinforced masonry (URM) strip mall, 4-unit commercial, 822 Dixwell Ave, Hamden CT
**Collapse mechanism:** Parapet wall failure along the front facade (Division Alpha), triggering partial roof collapse over Units 2 and 3 (a pizza restaurant and dry cleaner). Approximately 40 feet of parapet and 800 sq ft of bar-joist roof deck involved.
**Construction details:** Bearing-wall URM (3-wythe brick, no ties), steel bar-joist roof, rubber membrane over rigid insulation, concrete masonry side walls (Divisions Bravo and Delta)
**Geography:**
- Division Alpha — front/storefront side. Primary collapse zone. 2 entry points (Unit 1 door, Unit 4 door — both flanking the collapse).
- Division Bravo — north side. Secondary access via fire escape door from Unit 1. Intact.
- Charlie and Delta — no access (rear abuts railroad embankment; Delta is shared wall with adjacent building)
**Victims:** 2 suspected
- Victim 1: restaurant employee (Unit 2), confirmed by bystander who saw them enter 30 min before collapse
- Victim 2: possible occupant of dry cleaner (Unit 3), unconfirmed — business hours suggest possible
**Weather:** Overcast, 42 deg F, light rain (steady drizzle), wind 8 mph from NW
**Hazards:**
- Unstable parapet sections remaining (10-ft segment above Unit 1 and Unit 4 leaning outward ~3 degrees)
- Compromised fire sprinkler main (Unit 2 riser sheared at roof connection — water flowing)
- Natural gas service to all 4 units (meters on Delta side — gas company requested)
- Unknown occupancy status of Units 1 and 4 (appear intact but may have structural damage from shared walls)
**Exposures:** Railroad right-of-way (Charlie side), occupied 2-story mixed-use building (Delta side — evacuated by PD)

---

## Locked Decisions

| # | Decision | Value |
|---|----------|-------|
| 1 | Operational periods | 1 |
| 2 | Duration | E+0:00 → E+6:00 (6 hours) |
| 3 | Shore point target | 8 (5 single verticals + 1 T-Shore group of 3) |
| 4 | Roster granularity | Individual role assignment |
| 5 | Inventory scale | Engine 1, Engine 2, Rescue 1, BC-1: ~12 ACME struts, 2 extensions, full plate set |
| 6 | Sandbox department | `sim-millbrook-fd` |
| 7 | Hotwash format | Pearls & Pitfalls table + Gap Analysis |
| 8 | App interaction | UI only — no direct Firebase writes |
| 9 | Conductor mode | Emergent with one paper event (secondary collapse at E+2:30) |
| 10 | Ethics | Training-only fictional scenario |

---

## Personnel Roster

| Arrival | Unit | Agency | Type | Headcount | ICS Role | Notes |
|---------|------|--------|------|-----------|----------|-------|
| E+0:05 | Engine 1 | Millbrook FD | Engine | 4 | **IC #1 — Capt. Torres (interim)** | First-due |
| E+0:06 | Engine 2 | Millbrook FD | Engine | 4 | Staging / Water Supply | First alarm |
| E+0:08 | Rescue 1 | Millbrook FD | Rescue | 4 | Entry / Shoring | First alarm — carries the strut kit |
| E+0:12 | BC-1 | Millbrook FD | Command | 1 | **IC #2 — BC Whitfield** | Command transfer from Torres; Torres becomes Div Alpha Sup |

**ICS organization:** IC + Safety Officer (designated from Engine 2 officer) + informal Operations. No formal sections. IC manages planning/logistics directly.

**Role assignments:**
- BC Whitfield → IC (after E+0:12 transfer)
- Capt. Torres → Division Alpha Supervisor (post-transfer)
- Rescue 1 Officer → Safety Officer
- Engine 1 crew (3 FF) → Entry Team Alpha (through Unit 1 door)
- Engine 2 crew (3 FF) → Entry Team Bravo (through fire escape, Div Bravo)
- Rescue 1 crew (3 FF) → Shoring / Runner

---

## Inventory Baseline

Dispatched apparatus carry the following from the Millbrook fleet:

| Apparatus | Model | Qty | Available | Length | Type |
|-----------|-------|-----|-----------|--------|------|
| Engine 1 | ACME Strut | 2 | 2 | 60" | strut |
| Engine 1 | Universal Base Plate | 4 | 4 | — | plate |
| Engine 1 | Wedge Plate | 2 | 2 | — | plate |
| Engine 2 | ACME Strut | 2 | 2 | 60" | strut |
| Engine 2 | Universal Base Plate | 4 | 4 | — | plate |
| Engine 2 | Wedge Plate | 2 | 2 | — | plate |
| Rescue 1 | ACME Strut | 4 | 4 | 48" | strut |
| Rescue 1 | ACME Strut | 4 | 4 | 84" | strut |
| Rescue 1 | Extension | 2 | 2 | — | extension |
| Rescue 1 | Universal Base Plate | 8 | 8 | — | plate |
| Rescue 1 | Wedge Plate | 4 | 4 | — | plate |
| Rescue 1 | Chimney Plate | 2 | 2 | — | plate |

**Import method:** Full Millbrook fleet imported via `.claude/skills/shared/millbrook-inventory.xlsx`. Only Engine 1, Engine 2, Rescue 1, and BC-1 are dispatched.

---

## Agent Framework

**Total: 10 agents** (1 conductor + 3 moderators + 6 participants)

### Conductor
Manages E+ event clock across 6 hours. Paces arrivals per roster. Triggers one paper event at E+2:30 (secondary partial collapse — no new SPs, but forces IC to reassess safety and pull crews back temporarily). Uses token protocol.

### Moderators (3 — silent observers)

**Mod-UX** — Field UX Observer
Focus: drag-and-drop org chart usability, grouped SP card rendering, mobile UX in simulated rain conditions (large touch targets), command transfer flow.

**Mod-Data** — Data Integrity Observer
Focus: T-Shore grouped SP phase-split behavior (pre-cutting = group transitions, cutting+ = individual), Firebase write validation against security rules, inventory round-trip (deploy → return), multi-apparatus inventory tracking.

**Mod-NIMS** — NIMS Compliance Observer
Focus: ICS role assignment accuracy for Level IV org (IC + Safety + informal Ops), Division nomenclature (Alpha/Bravo), command transfer protocol, whether the app correctly handles the Torres IC→Div Alpha Sup demotion.

### Participants (6 — drive the app UI only)

**Participant-IC (BC Whitfield)**
- Takes command at E+0:12 (command transfer from Torres)
- Manages org chart: assigns Safety, Division Sups, Shoring
- Monitors SP progress from command view
- Ends operation at E+6:00

**Participant-Safety (Rescue 1 Officer)**
- Assigned Safety Officer role via org chart
- Monitors hazard conditions (can the app record/display hazards?)
- At E+2:30 (secondary collapse), assesses and communicates safety concerns
- Tests whether Safety role has any unique app capabilities vs. other roles

**Participant-Shoring (Rescue 1 FF-1)**
- Primary stress agent for shoring workflow
- Creates 5 single vertical SPs (measurements: 52", 56", 48", 61", 55")
- Creates 1 T-Shore group (3 members, measurement: 78" — tests grouped shore type creation)
- Deploys struts from Rescue 1 and Engine inventories
- Selects header/footer wood deductions (tests 4x4 vs 6x6 choice — must be explicit per SP, not auto-filled)
- Advances group SPs through pre-cutting statuses (should move as group)
- Advances individual SPs through cutting+ statuses (should move individually)

**Participant-Entry-A (Engine 1 FF)**
- Division Alpha entry crew
- Assists Shoring with measurements
- Uses Quick Find to look up 52" and 78" independently
- Tests whether multiple users can view the same operation simultaneously

**Participant-Entry-B (Engine 2 FF)**
- Division Bravo entry crew (through fire escape)
- Uses Quick Find for a 61" measurement
- Attempts to create a SP from Division Bravo perspective
- Tests Division field assignment on SP creation modal

**Participant-Runner (Rescue 1 FF-2)**
- Advances SPs through cutting → runner → secured (individual phase)
- Tests the individual-card-only constraint: can a runner advance one T-Shore member without advancing the others?
- Returns equipment at end of operation
- Posts in-app feedback for any friction in the runner workflow

---

## Execution Phases

### Phase 0 — Intent
Ask Alex: start fresh, or resume from a specific phase? Default: Phase 1.

### Phase 1 — Pre-flight
1. Read CLAUDE.md → confirm app version
2. Start preview server: `npx serve -l 8095 .`
3. Verify app loads via `preview_snapshot`
4. Check Firebase connection in Settings tab
5. **Success:** App loads, version confirmed, Firebase connected

### Phase 2 — Inventory Import (UI only)
1. Settings → Department Code: `sim-millbrook-fd`
2. Inventory → Import: `.claude/skills/shared/millbrook-inventory.xlsx`
3. Verify Engine 1, Engine 2, Rescue 1 inventories visible
4. Check console for import errors
5. **Success:** All dispatched apparatus show correct strut/plate/extension counts

### Phase 3 — Spawn Agents
Spawn all 10 agents in a **single message with 10 parallel Agent tool calls**. Each receives scenario overview, persona brief, event clock, app URL, and the UI-only constraint.

**Success:** All agents acknowledge; conductor announces E+0:00.

### Phase 4 — Event Clock
Conductor drives timeline per Event Clock section. Key stress moments:
- E+0:12: Command transfer (Torres → Whitfield)
- E+0:45: First SP created (T-Shore group — tests grouped creation flow)
- E+2:30: Secondary collapse paper event (forces safety reassessment + crew withdrawal)
- E+3:00–4:30: Peak SP activity (all 8 SPs in various statuses simultaneously)
- E+5:30: Equipment return begins

**Success:** All 8 SPs reach terminal status. T-Shore group transitions verified (group pre-cutting, individual cutting+). Operation ended.

### Phase 5 — Hotwash
1. 4-question AAR from each participant
2. Findings summary from each moderator
3. Pearls & Pitfalls table
4. Gap analysis

### Phase 5b — Issue Posting
Post Critical/High/Medium Pitfalls as GitHub issues with `[SIM-IV]` prefix and `simulation` label. Run `/feedbackreview` to sweep Firebase feedback.

---

## Moderator Checklists

### Mod-UX Checklist

| # | Item | v4.0 Phase | Surface |
|---|------|------------|---------|
| U-1 | Command transfer: does the org chart update when Torres hands off to Whitfield? Any dead-end? | 3B | Org chart |
| U-2 | T-Shore creation: can Shoring create a grouped shore type (qty=3) from the SP modal? | 3C | SP modal |
| U-3 | Grouped SP cards: do 3 T-Shore cards render as a visual group? Distinguishable from singles? | 3C | SP cards |
| U-4 | Division field: can Entry-B set "Division Bravo" on a SP? Is the field present and usable? | 3C | SP modal |
| U-5 | Rain UX: are touch targets ≥ 44px? Is text readable at arm's length in low contrast? | — | Global |
| U-6 | Drag-and-drop org chart: does it work for reassigning Torres from IC to Div Alpha Sup? | 3B | Org chart |
| U-7 | SP card density: at 8 cards, is scrolling smooth? Any layout shift? | 3C | SP cards |
| U-8 | Multi-apparatus deploy: when deploying from Rescue 1 vs Engine 1, is apparatus picker clear? | 3C | Deploy |
| U-9 | Quick Find with limited inventory: does it indicate which apparatus has the matching strut? | 3E | Quick Find |
| U-10 | End operation flow: is it obvious how to end/archive when all SPs are secured? | 3C | Operations |

### Mod-Data Checklist

| # | Item | v4.0 Phase | Surface |
|---|------|------------|---------|
| D-1 | T-Shore group: `groupId` shared across 3 members, `groupIndex` correct (0,1,2), `groupTotal`=3? | 3C | Firebase |
| D-2 | Phase-split: pre-cutting transitions (pending→process→strutplaced→cutting) apply to all 3 group members? | 3C | Status |
| D-3 | Phase-split: cutting→runner→secured transitions apply to individual members ONLY? | 3C | Status |
| D-4 | Multi-apparatus inventory: deploying from Engine 1 vs Rescue 1 decrements the correct apparatus? | 3B | Inventory |
| D-5 | Cross-apparatus return: if strut was deployed from Rescue 1, does it return to Rescue 1? | 3B | Inventory |
| D-6 | Firebase validate rule: all 8 SP writes pass security rules without PERMISSION_DENIED? | 3A | Security |
| D-7 | Concurrent views: if IC and Shoring both view the operation, do updates propagate in real time? | 3F | Sync |
| D-8 | Header/footer deduction: does the SP store `headerWood` and `footerWood` fields correctly? | 3C | SP data |
| D-9 | Console errors: any exceptions during T-Shore group lifecycle? | — | Console |

### Mod-NIMS Checklist

| # | Item | v4.0 Phase | Surface |
|---|------|------------|---------|
| N-1 | Command transfer: does the app record the transfer (time, from, to)? Or just overwrites IC? | 3B | Command |
| N-2 | Role demotion: Torres goes from IC to Div Alpha Sup — can the app handle this? | 3B | Org chart |
| N-3 | Safety Officer: is the role distinct in the org chart? Does it have any Safety-specific features? | 3B | Org chart |
| N-4 | Division naming: app uses Alpha/Bravo for geographic divisions — matches FEMA? | 3C | SP fields |
| N-5 | Span of control: IC has 3 direct reports (Safety, Div Alpha, Div Bravo) — within 3–7 range | 3B | Org chart |
| N-6 | Level IV org: no General Staff (no OSC/PSC/LSC) — does the app enforce or allow this? | 3B | Org chart |

---

## Participant Personas

### IC — BC Whitfield
> You are Battalion Chief Jim Whitfield, Millbrook FD. You arrive at E+0:12 and take command from Captain Torres. Torres briefs you with a quick ICS-201 walkthrough: "One-story URM strip mall, parapet failure, two units of roof collapse. Two possible victims. Engine 1 has entry from Alpha, Engine 2 from Bravo. Rescue 1 is setting up shoring." You handle command from behind the rig, using the app on your tablet. You need to update the org chart to reflect the command transfer, assign Safety, and monitor all 8 shore points. You interact ONLY through the app's UI.

### Safety — Rescue 1 Officer
> You are Lieutenant Andrea Chen, Rescue 1. BC Whitfield assigned you Safety Officer. Your job is to monitor hazard conditions and have authority to stop operations if unsafe. You want to log hazards (leaning parapet, gas, sprinkler water) somewhere in the app. At E+2:30, when the conductor announces a secondary partial collapse, you need to communicate a temporary crew withdrawal — can the app support this? You interact ONLY through the UI.

### Shoring — Rescue 1 FF-1
> You are Firefighter Marcus Webb, Rescue 1. You're the shoring specialist. You'll create all 8 shore points: 5 single verticals (measurements: 52", 56", 48", 61", 55") and 1 T-Shore (3-member group, 78" measurement). You deploy struts from Rescue 1's inventory first, then draw from Engine inventories when Rescue runs low. You need to select header and footer wood sizes — 4x4 for most, 6x6 for the T-Shore. You advance SPs through pending → in process → strut placed → cutting. You interact ONLY through the UI.

### Entry-A — Engine 1 FF
> You are Firefighter Sam Kowalski, Engine 1. You entered through Unit 1's front door (Division Alpha). You're working alongside Shoring, relaying measurements. You open Quick Find to check a 52" measurement and a 78" measurement. You try to create a shore point from your perspective. You're new to the app — if something confuses you, say exactly what you see and expected.

### Entry-B — Engine 2 FF
> You are Firefighter Alexa Ruiz, Engine 2. You entered through the fire escape on Division Bravo. You're working the north end of the collapse zone. You use Quick Find for a 61" measurement. When creating a shore point, you set the Division to "Bravo." You want to see only your division's SPs — can the app filter by division? You interact ONLY through the UI.

### Runner — Rescue 1 FF-2
> You are Firefighter Tyler Grant, Rescue 1. You're the runner — cutting wood to spec, delivering materials, updating statuses. You receive cutting assignments from Webb (Shoring). You advance individual SPs from cutting → runner → secured. For the T-Shore group, you should be able to advance one member at a time — if the app forces you to advance all 3 together during the cutting phase, that's a finding. At end of operation, you return all equipment. You interact ONLY through the UI.

---

## Event Clock

| E+ Time | Event | Conductor Action | Expected App Activity |
|---------|-------|-----------------|----------------------|
| E+0:00 | Dispatch | Announce: "Box alarm, 822 Dixwell Ave, Hamden. Building collapse, URM strip mall." | — |
| E+0:05 | Engine 1 on scene | Announce arrival. Torres establishes command. | IC (Torres): create operation |
| E+0:06 | Engine 2 on scene | Announce arrival. | IC: assign Engine 2 to staging/water supply |
| E+0:08 | Rescue 1 on scene | Announce arrival. | IC: assign Rescue 1 to shoring |
| E+0:12 | BC-1 on scene | Announce: "BC Whitfield on scene, assuming command." | **Command transfer**: Torres → Whitfield. Torres becomes Div Alpha Sup. |
| E+0:15 | Safety assigned | — | IC (Whitfield): assign Lt. Chen as Safety in org chart |
| E+0:20 | Shoring setup | — | Shoring: begins measuring, opens Quick Find |
| E+0:30 | First SPs created | — | Shoring: creates SP #1 (52" vertical) and SP #2 (56" vertical) |
| E+0:45 | T-Shore group | — | Shoring: creates T-Shore group (3 members, 78"). **Key test: grouped creation flow.** |
| E+1:00 | Deployment begins | — | Shoring: deploys struts from Rescue 1 to SP #1, #2 |
| E+1:15 | More SPs | — | Shoring: creates SP #4 (48"), SP #5 (61"), SP #6 (55") |
| E+1:30 | T-Shore deployed | — | Shoring: deploys struts to T-Shore group from Rescue 1 + Engine inventories |
| E+1:45 | Strut placed | — | Shoring: advances SPs #1–#6 to "strut placed" |
| E+2:00 | Cutting begins | — | Shoring: advances SPs to "cutting". Runner begins cutting wood. |
| E+2:15 | Individual cutting | — | Runner: advances SP #1 cutting → runner (individual). **T-Shore members should advance individually.** |
| E+2:30 | **SECONDARY COLLAPSE** | Paper event: "Loud crack heard from Unit 1 side. Remaining parapet section above Unit 1 has shifted. All crews withdraw from collapse zone immediately." | Safety: communicates withdrawal. IC: reassesses. **No new SPs — paper event only.** |
| E+2:45 | All clear | Announce: "Parapet section stabilized by its own debris. No further movement. Crews cleared to resume." | IC: authorizes resumed operations |
| E+3:00 | Work resumes | — | Runner: continues advancing SPs through runner → secured |
| E+3:30 | Victim 1 located | Paper event: "Search team reports victim located in Unit 2, northeast corner, under bar joist and roofing debris. Responsive." | IC: notes in operation if UI allows |
| E+4:00 | Victim 1 removed | Paper event: "Victim 1 extricated and transferred to EMS. Transported to Level 1." | — |
| E+4:30 | Victim 2 negative | Paper event: "Primary and secondary search of Unit 3 complete. No victim found. Dry cleaner confirmed closed today by owner (reached by phone)." | — |
| E+5:00 | All SPs secured | — | Runner: all SPs at "secured" status |
| E+5:30 | Demob | Announce: "Building inspector on scene. Begin equipment return." | Runner: returns all equipment. IC: verifies inventory. |
| E+6:00 | Operation ends | Announce: "Command terminated. All units available." | IC: ends operation via UI |

---

## Hotwash Format

### Pearls & Pitfalls Table

| # | Type | Surface | Finding | Severity | MASTER-PLAN Phase | Issue |
|---|------|---------|---------|----------|-------------------|-------|
| _fill during Phase 5_ | | | | | | |

### Gap Analysis

| Finding | Covered by v4.0? | MASTER-PLAN Phase | Action |
|---------|-------------------|-------------------|--------|
| _fill during Phase 5_ | | | |

---

## Anti-patterns

- **DO NOT** write directly to Firebase, localStorage, or sessionStorage.
- **DO NOT** use `preview_eval` to execute app functions. Participants use `preview_click` and `preview_fill` only.
- **DO NOT** skip the command transfer at E+0:12. Testing role transition is a primary goal.
- **DO NOT** skip the T-Shore group creation. Testing grouped shore types is a primary goal.
- **DO NOT** force all T-Shore group members through cutting phase together. Individual advancement is the expected behavior; if the app does it differently, that's a finding.
- **DO NOT** advance the event clock past the secondary collapse at E+2:30 without observing how participants react.
- **DO NOT** let moderators interrupt participants.

---

## Notes

- **Sandbox department:** `sim-millbrook-fd`
- **Inventory source:** `.claude/skills/shared/millbrook-inventory.xlsx`
- **App version baseline:** v3.17.2
- **MASTER-PLAN reference:** `.claude/plans/MASTER-PLAN.md` Release 3 phases 3A–3F
- **Runtime output:** `.claude/simulations/level-iv-sim/runtime/`
- **Key stress targets:** T-Shore grouped SP phase-split, command transfer, multi-apparatus inventory deduction, rain-condition UX
- **Related simulations:** `/level-v-sim` (smaller), `/level-iii-sim` (larger)
