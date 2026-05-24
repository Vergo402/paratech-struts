# Plan: Miami Surfside Collapse TTX-2 — Pre-Event Package

## Context

The prior Surfside-scale run ([`interactive-findings.md`](/Users/alex/Developer/paratech-struts/main/.claude/audits/interactive-findings.md)) was a JS-injected stress test against a snapshot dataset: 41 shore points, 21 apparatus, 12 ICS roles, all instantiated at once. It produced 10 findings (F1–F10) and a render-time baseline, but it skipped everything that makes a real collapse a *collapse*: alarm growth, mutual-aid escalation, USAR task force assembly, command transfers, shift rotations, and the field experience of using the app while resources are arriving.

This run rebuilds the simulation with three properties the first run lacked:

1. **Pre-staging.** Personnel and teams are catalogued and assigned before the event starts, in the order they'd arrive in a real incident.
2. **Staggered response.** Time advances on an event clock; resources, decisions, and app actions occur at the right tagged-clock moment, not all at once.
3. **Observation + feedback loop.** A six-persona moderator cohort watches participants drive the app, captures friction in real time, and consolidates findings at a structured hotwash. Both participants (in-character) and moderators (out-of-character) submit app feedback. Findings are mapped against the v4.0.0 release scope (per [`MASTER-PLAN.md`](/Users/alex/Developer/paratech-struts/main/.claude/plans/MASTER-PLAN.md) Release 3 — Firebase Auth, multi-tenancy, NIMS doctrine, ICS forms export, strut algorithm enhancements, hardening) to identify which findings v4.0.0 already addresses, which it doesn't (gaps), and which suggest new ideas worth adding to the v4.0.0 backlog.

**This plan is the pre-event package.** It produces the full roster, timeline, framework, file scaffolding, and runbook. The live simulation runs in a follow-up Claude Code session, driving the real PWA against an isolated Firebase department.

---

## Locked decisions

| # | Decision | Value |
|---|----------|-------|
| 1 | This round's deliverable | Plan-only. Live event runs in follow-up session. |
| 2 | App engagement at execution | Drive live preview (preview_start + preview_click/fill) against real Firebase |
| 3 | Operational scope | E+0:00 → E+36:00, four OPs |
| 4 | OP lengths | OP1 4hr / OP2 12hr / OP3 12hr / OP4 8hr |
| 5 | Scenario basis | Mirrors actual Champlain Towers South 6/24/2021 01:22 EDT geometry + timeline |
| 6 | Personnel naming | Generic unit numbers (Engine 1–18, USAR-Alpha/Bravo, TF-State, TF-Fed-Alpha/Bravo/Charlie). ICS leadership = fictional named individuals. |
| 7 | Building | Single 12-story residential, partial pancake collapse of south half |
| 8 | Shore-point target | ~250 SPs by E+36 (paced: OP1 ~30, OP2 ~110, OP3 ~80, OP4 ~30) |
| 9 | Victim modeling | ~40 modeled victims tied to SP priority clusters |
| 10 | Inventory baseline | Realistic-large: 12 local apparatus + state TF (~70 personnel) + 3 federal TFs (~80 each) over 36hr; ~150–200 struts, full plate set, extensions, lumber |
| 11 | Roster granularity | Unit-level + named ICS leadership |
| 12 | Sandbox Firebase dept | New isolated dept `sim-surfside-ttx-2` |
| 13 | Conductor mode | Emergent — stages personnel/resource arrivals on schedule but doesn't force events |
| 14 | Participant cast | Variable per OP: 4 (OP1) → 10 (OP2) → 14 (OP3) → 8 (OP4) |
| 15 | Per-OP planning artifact | Full FEMA ICS-202 template drafted in-character by PSC subagent |
| 16 | Moderator cohort | 6 silent-observation moderators: NIMS, Structural SME, Field UX, Data Integrity, Communications, FEMA IST |
| 17 | Moderator interaction | Pure silent observation; rolling timestamped notes; no mid-event interruption |
| 18 | Hotwash format | Two-layer: Army AAR (4 questions) per participant + per moderator → synthesized FEMA Improvement Plan table |
| 19 | v4.0.0 reference doc | [`MASTER-PLAN.md`](/Users/alex/Developer/paratech-struts/main/.claude/plans/MASTER-PLAN.md) Release 3 (lines 862–1180) — Phases 3A/3B/3C/3D/3E/3F |
| 20 | Output location | New directory `.claude/simulations/surfside-ttx-2/` in the FieldShore repo |
| 21 | Sim ethics header | Each scenario file carries a "training-only, not based on any real person/address/unit" disclaimer |

---

## Personnel roster (E+0:00 → E+36:00)

Event clock anchored to collapse at E+0:00 (real-world equivalent: 01:22 EDT 6/24/2021 — overnight start, daylight by OP2). Total: ~71 unit-level rows, 30 named ICS leadership positions across the operation lifetime.

### OP1 — Initial Response (E+0:00 → E+4:00, 4 hours)

| Arrival | Unit | Agency | Type | Headcount | ICS Role | Notes |
|---|---|---|---|---|---|---|
| E+0:04 | Engine 1 | Local FD | Engine | 4 | IC #1 (Capt. Reyes — interim) | First-due |
| E+0:04 | Ladder 1 | Local FD | Truck | 5 | Search Group (interim) | First-alarm |
| E+0:05 | Rescue 1 | Local FD | Heavy Rescue | 4 | Rescue Group (interim) | |
| E+0:06 | Engine 2 | Local FD | Engine | 4 | Water Supply | First-alarm |
| E+0:09 | BC-1 | Local FD | Command | 1 | **IC #2 — BC McAllister** | Cmd transfer via ICS-201 brief |
| E+0:12 | Engine 3 | Local FD | Engine | 4 | Rescue Group | Box alarm |
| E+0:14 | Ladder 2 | Local FD | Truck | 5 | Search Group | Box alarm |
| E+0:18 | Rescue 2 | Local FD | Heavy Rescue | 4 | Rescue Group | Box alarm |
| E+0:22 | Squad 1 | Local FD | Squad | 4 | Cutting | Box alarm |
| E+0:25 | BC-2 | Local FD | Command | 1 | **Safety Officer** | Box alarm |
| E+0:30 | Engine 4 | Local FD | Engine | 4 | Staging | 2nd alarm |
| E+0:32 | Engine 5 | Local FD | Engine | 4 | Staging | 2nd alarm |
| E+0:35 | Ladder 3 | Local FD | Truck | 5 | Search Group | 2nd alarm |
| E+0:38 | Tower 1 | Local FD | Tower Ladder | 5 | Heavy Rigging | 2nd alarm |
| E+0:45 | ACOO-1 | Local FD | Command | 1 | **IC #3 — DC Park** | Cmd transfer #2; McAllister → OSC |
| E+0:48 | USAR-Alpha | Local FD Special Ops | USAR | 8 | Shoring Group (interim) | Special Ops collapse team |
| E+1:00 | Engine 6, Engine 7 | Local FD | Engine | 4 ea | Staging | 3rd alarm |
| E+1:05 | Rescue 3 | Local FD | Heavy Rescue | 4 | Rescue Group | 3rd alarm |
| E+1:10 | Ladder 4 | Local FD | Truck | 5 | Search Group | 3rd alarm |
| E+1:15 | EMS-1, EMS-2 | Local FD EMS | Medical | 2 ea | Medical Unit | Triage setup |
| E+1:20 | Engine 8, Engine 9 | County FD | Engine | 4 ea | Staging | Mutual aid |
| E+1:30 | Ladder 5 | County FD | Truck | 5 | Search Group | Mutual aid |
| E+1:45 | EOC-Liaison | County EM | Command | 1 | **Liaison Officer — Mendoza** | EOC link |
| E+2:00 | PIO-1 | Local FD | Command | 1 | **PIO — Cmdr. Hollis** | Media line |
| E+2:15 | USAR-Bravo | Local FD Special Ops | USAR | 8 | Shoring Group | |
| E+2:30 | TF-State Advance | State USAR TF | Advance Party | 4 | **PSC #1 — Capt. Doyle** (drafts OP2 IAP) | |
| E+2:45 | Heavy 1 | County FD | Crane/Heavy | 3 | Heavy Rigging | Crane support |
| E+3:00 | Engine 10 | Local FD | Engine | 4 | Rehab | Rehab cycle setup |
| E+3:15 | Squad 2 | County FD | Squad | 4 | Cutting | Mutual aid |
| E+3:30 | LSC-1 | Local FD | Command | 1 | **LSC — AC Romano** | Logistics standup |
| E+3:45 | (paper event) | State EM | ESF-9 transmitted | 0 | — | Federal TF activation triggered |

**OP1 boundary state:** ~118 personnel, 28 apparatus, 13 ICS leadership roles filled.

### OP2 — Mass Deploy (E+4:00 → E+16:00, 12 hours)

| Arrival | Unit | Agency | Type | Headcount | ICS Role | Notes |
|---|---|---|---|---|---|---|
| E+4:30 | Engine 11, Engine 12 | Local FD | Engine | 4 ea | Day-shift relief | Shift change |
| E+5:00 | TF-State main body | State USAR TF | Full TF | 66 | (multiple, below) | 12-vehicle convoy completes TF on scene (70 total) |
| E+5:00 | TF-State-TFL | State USAR | Command | (within 70) | **OSC #2 — TFL Brennan** | TF assumes Operations |
| E+5:00 | TF-State-Search | State USAR | Search | (within 70) | **Search Group Sup. — Kim** | K9 + cameras |
| E+5:00 | TF-State-Rescue-A | State USAR | Rescue Squad | (within 70) | **Rescue Branch Director — Vega** | |
| E+5:00 | TF-State-Rescue-B | State USAR | Rescue Squad | (within 70) | Rescue Squad Leader | |
| E+5:00 | TF-State-Medical | State USAR | Medical | (within 70) | **Medical Team Mgr — Dr. Patel** | |
| E+5:00 | TF-State-Logistics | State USAR | Logistics | (within 70) | Logistics Team | Cache offload (~80 struts) |
| E+5:00 | TF-State-Plans | State USAR | Plans | (within 70) | **PSC #2 — Capt. Doyle confirmed** | Drafts OP3 IAP |
| E+5:00 | TF-State-Tech | State USAR | Tech Specialists | (within 70) | StructSpec / HazMatSpec | |
| E+5:30 | ICP Trailer | County EM | Facility | 2 | Facilities Unit | ICP relocation |
| E+6:00 | UC-Law | County Sheriff | Command | 1 | **Unified Command — Lt. Garza** | UC standup for perimeter/morgue |
| E+6:00 | Perimeter Group (multi) | County Sheriff | LE | 30 | Perimeter / Traffic / Security | LE branch |
| E+6:30 | PW-1, PW-2 | County PW | Heavy equipment | 8 | Debris Removal Group | Tracked excavators |
| E+7:00 | Engine 13, Engine 14 | Local FD | Engine | 4 ea | Rehab / water supply | |
| E+7:30 | (paper event) | FEMA | Federal activation order | 0 | — | First federal TF mobilized |
| E+8:00 | TF-State-Rigging | State USAR | Rigging Team | (within 70) | Heavy Rigging Group Sup. | Crane integration |
| E+9:00 | Day-shift IC | Local FD | Command | 1 | **IC #4 — Chief Whitaker** | 12-hr command transfer via ICS-201 |
| E+10:00 | LSC #2 | County FD | Command | 1 | LSC relief | Logistics shift change |
| E+10:30 | EMS-3, EMS-4 | Local FD EMS | Medical | 2 ea | Medical Unit | Day shift |
| E+12:00 | TF-Fed-Alpha Advance | Federal USAR | Advance | 5 | **OSC #3 — TFL Marquez** | First federal advance |
| E+14:00 | TF-Fed-Alpha main body | Federal USAR | Full TF | 75 | (multiple, below) | 80-person FEMA Type I TF |
| E+14:00 | TF-Fed-Alpha-Search | Federal USAR | Search | (within 80) | Search Team Manager | K9 + thermal |
| E+14:00 | TF-Fed-Alpha-Rescue-A,-B | Federal USAR | Rescue Squad | (within 80) | Rescue Squad Leaders | |
| E+14:00 | TF-Fed-Alpha-Medical | Federal USAR | Medical | (within 80) | Medical Team | |
| E+14:00 | TF-Fed-Alpha-Plans | Federal USAR | Plans | (within 80) | **PSC #3 — Drafts OP4 IAP** | |
| E+14:00 | TF-Fed-Alpha-Logistics | Federal USAR | Logistics | (within 80) | Logistics Team | Adds ~50 struts |
| E+14:00 | TF-Fed-Alpha-Tech | Federal USAR | Tech Specialist | (within 80) | StructSpec / Rigging Spec | |
| E+15:00 | Demob Unit Leader | State USAR | Plans | (within 70) | **Demob UL — Sgt. Nash** | Demob planning starts |

**OP2 boundary state:** ~280 personnel on scene, 40+ apparatus, 22 ICS leadership roles filled.

### OP3 — Sustained Ops (E+16:00 → E+28:00, 12 hours)

| Arrival | Unit | Agency | Type | Headcount | ICS Role | Notes |
|---|---|---|---|---|---|---|
| E+18:00 | TF-Fed-Bravo Advance | Federal USAR #2 | Advance | 5 | **OSC #4-rel — TFL Okafor** | Second federal advance |
| E+20:00 | TF-Fed-Bravo main body | Federal USAR #2 | Full TF | 75 | (mirror Fed-Alpha breakdown ×6 sub-roles) | Second 80-person TF |
| E+21:00 | Night-shift IC | Local FD | Command | 1 | **IC #5 — Chief Vasquez** | 12-hr command transfer |
| E+21:00 | Night-shift OSC | Federal TF | Command | 1 | **OSC #5 — Asst. TFL Bishop** | TFL rotation |
| E+22:00 | Engine 15, Engine 16 | Local FD | Engine | 4 ea | Water / Rehab | Night relief |
| E+23:00 | TF-State (rest cycle) | State USAR | — | -35 active | — | Half of state TF rotates to rehab |
| E+24:00 | TF-Fed-Charlie Advance | Federal USAR #3 | Advance | 5 | (Plans-tier integration) | Third federal TF arrives |
| E+25:00 | TF-Fed-Charlie main body | Federal USAR #3 | Full TF | 75 | (mirror Fed-Alpha ×6) | Third 80-person TF — OP4 reserve |
| E+26:00 | Demob Coordinator | FEMA IST | Command | 1 | **IST Demob Coordinator** | FEMA Incident Support Team |
| E+27:00 | FEMA IST-Plans | FEMA IST | Plans | 3 | **IST PSC — Augments PSC #3** | OP4 IAP coordination |

**OP3 boundary state:** ~440 personnel on scene (peak), 50+ apparatus, 27 ICS leadership roles filled.

### OP4 — Demob Discussion + Sustained (E+28:00 → E+36:00, 8 hours)

| Arrival | Unit | Agency | Type | Headcount | ICS Role | Notes |
|---|---|---|---|---|---|---|
| E+28:00 | Day-2 IC | Local FD | Command | 1 | **IC #6 — Chief Whitaker (rtn)** | Day-2 command transfer |
| E+30:00 | TF-State demob disc. | State USAR | — | — | — | Discussion only — no actual demob this OP |
| E+30:00 | TF-State Cache Decon | State USAR | Logistics | 6 | Demob support | Prep for eventual release |
| E+30:00 | Day-2 OSC | Federal TF | Command | 1 | **OSC #6 — TFL Marquez (rtn)** | |
| E+30:00 | Cost Unit Leader | County EM | Finance | 2 | **Finance/Admin SC** | Cost tracking starts |
| E+32:00 | Time Unit | County EM | Finance | 2 | Time Unit | |
| E+33:00 | CISM team | County FD | Medical | 4 | CISM | Critical incident stress mgmt |
| E+34:00 | Engine 17, Engine 18 | Local FD | Engine | 4 ea | Water / Rehab | |
| E+35:00 | Documentation UL | Federal TF | Plans | 2 | **Doc Unit Leader** | Compiles OP1–4 records |

**Final state at E+36:00:** ~440 personnel sustained, 30 ICS leadership positions over operation lifetime, ~28 active simultaneously at peak.

---

## Variable participant cast (subagents that drive the live preview)

Only **one** participant holds the active-driver token at any moment; the conductor passes the token explicitly. Others observe but don't drive. Active-driver transitions are logged.

### OP1 — 4 active participants
| Role | Subagent ID | Active window | Drives |
|---|---|---|---|
| IC (rotates Reyes → McAllister → Park) | `ic-op1` | E+0:00 → E+4:00 | Command tab, start-op modal |
| Operations SC | `osc-op1` | E+0:45 → E+4:00 | Operations tab |
| Rescue Captain | `rescue-op1` | E+0:05 → E+4:00 | SP creation, status flow |
| Cut Table Lead | `cut-op1` | E+0:22 → E+4:00 | Cut Table tab |

### OP2 — 10 active participants
IC (`ic-op2`), OSC (`osc-op2` handoff Brennan → Marquez at E+14:00), PSC (`psc-op2` — drafts OP3 IAP), LSC (`lsc-op2`), Safety (`safety-op2`), Rescue Branch Director (`rescue-branch-op2`), Shoring Group Sup (`shoring-op2`), Search Group Sup (`search-op2`), Cut Table Lead (`cut-op2`), Liaison (`liaison-op2`)

### OP3 — 14 active participants
All OP2 roles continue (with persona rotation per roster), **plus** 4 new:
- Heavy Rigging Group Sup (`rigging-op3`) — crane integration
- Medical Branch Director (`medical-op3`)
- Demob Unit Leader (`demob-op3`) — drives demob UI exploration
- Documentation Unit Leader (`docunit-op3`) — tests export / history UI

### OP4 — 8 active participants
Shrinks to: IC, OSC, PSC, Safety, Rescue Branch Director, Shoring Group Sup, Cut Table Lead, Demob Unit Leader. Conductor explicitly terminates the 6 retiring subagents at OP3→OP4 boundary.

**Handoff protocol:** at each OP boundary, the outgoing participant subagent posts a one-paragraph briefing into the event log; the incoming subagent reads it plus the latest IAP before issuing app actions. Models ICS-201 transfer-of-command.

---

## Moderator cohort — 6 silent-observation personas

Each runs the full E+0:00 → E+36:00 window. Each emits append-only single-line JSON notes to `notes/moderator-<id>-notes.jsonl`. **No mid-event interruption.**

### Note line format
```
{"ts":"E+HH:MM","wallclock":"YYYY-MM-DD HH:MM:SS","op":1|2|3|4,"participant":"<subagent-id|n/a>","surface":"<tab/modal/component>","obs":"<one-sentence>","severity":"low|med|high|critical","v4_phase":"3A|3B|3C|3D|3E|3F|none|new"}
```

### `mod-nims` — NIMS / ICS Doctrine
Watches: single-IC discipline in OP1; UC introduced only at OP2+; Safety always reports to IC; Branch-level emergence when span >7; Type II/III preset adequacy; OP boundary visual markers; role history on transfers; "Group" field semantic correctness; staging area concept (currently absent); per-write attribution visible; Strike Team vs Task Force representability; demobilized apparatus retention. **12 checklist items mapped to v4.0.0 Phases 3B.4, 3C.1, 3C.2, 3C.3, 3C.4, 3C.5, 3C.7.**

### `mod-struct` — Structural Collapse SME
Watches: 250-SP rendering at scale; multi-strut group advance; LongShore unrated-zone audit trail; wedge+plate geometry consistency; qty>4 sentinel; capacity+margin surfacing; StructSpec role presence; pancake floor labeling (Subdivision 1/2, Div Alpha–Delta); Heavy Rigging vs Cutting distinction; collapsed-floor SP exterior-division reference; victim-tied SP traceability; hazards log export. **12 items mapped to Phases 3C.1, 3D.1, 3E.1, 3E.2, 3E.3, 3E.5; several NEW gaps.**

### `mod-ux` — Field UX / Mobile Ergonomics
Watches: section-button dead-end regression (F2); offline-status UI regression (F3); drilldown responsiveness at 250 SPs; legibility on 375px; plate picker scroll under rapid use; dark mode contrast on all pills; "+SP" reachable in ≤2 taps; long-press reparent discoverability; status filter at card-list (F7); headcount reads "X apparatus, Y personnel" (F10); 44px min touch targets on gloveable buttons; Quick Find inventory quick-view during input. **12 items mapped to 3C.6 and many NEW.**

### `mod-data` — Data Integrity / Multi-Agency / After-Action
Watches: F1 regression (listener-wipe-local); USAR-on-plane local-first survival; per-record agency tag round-trip; agency badge color render; external equipment cross-agency tracking; apparatus demob timestamp survives OP boundary; role history on every assignment/reparent/demob; PAR correctness; OP snapshot at boundary; ICS-203/211 export completeness; SP timeline export with by/agency attribution; sync-degraded banner + manual retry. **13 items mapped to Phases 3B.1, 3B.3, 3C.3, 3C.4, 3C.5, 3C.6, 3D.1.**

### `mod-comms` — Communications / Radio Traffic
Watches: field labels match radio terminology (Div Alpha vs "front side"); apparatus naming radio-unique; "Strut Placed" vs "strut set" terminology; Cut Table arm's-length legibility; Quick Find result card transmittable as one radio call; Pending SP card explains "what's missing"; ICS-205 representability (absent); Command Net / Tactical Net assignment per role (absent); status-change cross-device announcement; 24h timestamps. **10 items mostly NEW (gap: app has no radio-net concept).**

### `mod-ist` — FEMA IST / Inter-Agency Plans Chief
Watches: OP IAP authorship attributable to specific PSC; ICS-202 draftable from app data; ICS-203 live snapshot accuracy; ICS-204 per-Division/Group exportable; ICS-215 representability; ESF-9 chain visible in role history; IST PSC sees same data as local PSC (multi-tenancy); demob plan draftable; Resource Status (T-Card) viewable; SitStat at-a-glance for incoming PSC; Victim Locator data tied to SP clusters; AAR export completeness; Cost/Time tracking. **13 items mapped to Phases 3B, 3C.4, 3C.5, 3D.1; several NEW.**

---

## Per-OP IAP (ICS-202) outline

Each OP boundary produces a complete ICS-202 stored at `iaps/iap-op<N>.md`. Drafting cadence:

| OP | Drafter | Reviewer | Window |
|---|---|---|---|
| OP1 | IC #3 (DC Park) — retrospective ICS-201 | (none) | At E+4:00 boundary |
| OP2 | `psc-op2` (Capt. Doyle) | `ic-op2` | E+2:30 → E+4:00 |
| OP3 | `psc-op2` (continues) | `ic-op2` then `ic-op3` | E+14:00 → E+16:00 |
| OP4 | `psc-op3` (Fed-Alpha PSC) | `ic-op3` then `ic-op4` | E+26:00 → E+28:00 |

**ICS-202 sections (each IAP fills all 8):**
1. Incident Name — "Surfside TTX-2 — Generic Residential Collapse"
2. Operational Period (number, start, end)
3. Incident Objectives — 3–5 SMART, IC dictates → PSC drafts
4. Operational Period Command Emphasis — IC's leadership message
5. General Situational Awareness — pile status, recent rescues, weather, hazards, victim count est. (PSC drafts)
6. Site Safety Plan / ICS-208 ref — Safety Officer drafts
7. Incident Action Plan attachments — list of attached forms (203, 204, 205, 206, 215)
8. Prepared By / Approved By — PSC signature + IC signature with timestamp

---

## Hotwash — two-layer format

### Layer 1 — Army AAR (one file per participant + per moderator)
Each subagent answers the four questions, in isolation (doesn't see anyone else's draft):
1. What was supposed to happen?
2. What actually happened?
3. Why was there a difference?
4. What can we learn from it / what should change?

Files: `hotwash/aar-participant-<role>.md` (~14 files), `hotwash/aar-moderator-<id>.md` (6 files).

### Layer 2 — FEMA Improvement Plan synthesis
A synthesis subagent merges all AARs + all moderator rolling notes into a single `hotwash/improvement-plan.md`. Column structure:

| Column | Allowed values / notes |
|---|---|
| `IP-#` | `IP-001` sequential |
| `Finding` | One-sentence problem statement |
| `Source` | Comma-list of moderator IDs + `participant-hotwash` |
| `OP` | 1–4, or `all` |
| `App Surface` | Specific tab / modal / component |
| `Severity` | `critical | high | medium | low` |
| `FEMA-IP-Capability` | `Planning | Operations | Logistics | Intelligence/Investigation | Communications | Public Information | Safety | Resource Management` |
| `v4.0.0 Phase` | `3A-Auth | 3B-Multi-tenancy | 3C-NIMS | 3D-ICS-forms | 3E-Strut-algo | 3F-Hardening | NONE | NEW` |
| `v4.0.0 Coverage` | `covered | partial | gap | new-idea` |
| `Recommended Action` | Short imperative |
| `Owner` | `app-eng | doctrine-review | alex-decision` |
| `Target Release` | `v4.0.0 | v4.1.0 | v4.x backlog | drop` |
| `AAR Question` | `Q1-intended | Q2-actual | Q3-sustain | Q4-improve` |
| `Linked Note` | File + line of the source observation |

Sort: severity desc, then phase, then IP-#.

### v4.0.0 gap analysis output
Separate file `hotwash/v4.0.0-gap-analysis.md`: every IP-# entry mapped to a MASTER-PLAN.md Release-3 phase, tagged `covered | partial | gap | new-idea`. Result feeds back into Alex's v4.0.0 backlog as concrete deltas.

---

## Files produced in `.claude/simulations/surfside-ttx-2/`

### Pre-event (built in the follow-up *plan-build* session — current session's plan stops here at ExitPlanMode)

```
.claude/simulations/surfside-ttx-2/
├── README.md                              # Index + how to execute
├── plan.md                                # Mirror of this plan file
├── scenario/
│   ├── building-profile.md                # 12-story residential, pancake collapse, victim density
│   ├── victims.md                         # ~40 victims w/ priority cluster → SP cluster mapping
│   └── timeline-event-clock.md            # Master E+ schedule
├── roster/
│   ├── personnel-roster.md                # The full table above, expanded
│   ├── ics-leadership.md                  # 30 named leaders + transfer chain
│   └── participant-cast-by-op.md
├── inventory-baseline/
│   ├── local-apparatus-inventory.json     # 12 local apparatus + struts
│   ├── state-tf-cache.json                # 70-person state TF gear
│   ├── fed-tf-cache.json                  # Federal TF gear template (×3)
│   └── external-equipment-pool.json
├── iaps/
│   ├── iap-op1-template.md                # ICS-202 blank
│   ├── iap-op2-template.md
│   ├── iap-op3-template.md
│   └── iap-op4-template.md
├── moderators/
│   ├── moderator-framework.md
│   ├── mod-nims-checklist.md
│   ├── mod-struct-checklist.md
│   ├── mod-ux-checklist.md
│   ├── mod-data-checklist.md
│   ├── mod-comms-checklist.md
│   └── mod-ist-checklist.md
├── hotwash/
│   ├── aar-question-template.md
│   └── improvement-plan-template.md
├── subagent-prompts/
│   ├── participant-system-prompt.md
│   ├── moderator-system-prompt.md         # Silent observer constraints
│   ├── conductor-system-prompt.md         # Event clock + arrival staging
│   └── per-role-overlays.md
└── runbook.md                             # Step-by-step execution instructions
```

### Post-event (live execution session adds)

```
├── runtime/
│   ├── event-log.jsonl                    # Append-only master timeline
│   ├── firebase-snapshots/                # snap-E+04h, E+16h, E+28h, E+36h, final
│   ├── preview-screenshots/               # Per-OP screenshots
│   └── conductor-state.json               # Conductor heartbeat / token state
├── notes/
│   └── moderator-mod-*-notes.jsonl        # 6 files, one per moderator
├── iaps/
│   ├── iap-op1.md … iap-op4.md            # Filled in-character
├── hotwash/
│   ├── aar-participant-<role>.md          # ~14 files
│   ├── aar-moderator-<id>.md              # 6 files
│   ├── improvement-plan.md                # Synthesized table
│   └── v4.0.0-gap-analysis.md
└── final-report.md                        # Executive summary + headline findings + v4.0.0 deltas
```

---

## Execution sequencing (when the follow-up session runs)

Strict order — each step depends on the previous:

1. **T-30** Read `plan.md` + `runbook.md`. Confirm `sim-surfside-ttx-2` dept does NOT already exist in Firebase.
2. **T-25** Create the dept by browsing live preview with that dept ID. Confirm empty state.
3. **T-20** Bulk-import `inventory-baseline/local-apparatus-inventory.json` into the new dept. Verify in inventory tab.
4. **T-15** Spawn all 6 moderator subagents. Each opens its checklist + creates its empty notes file; each acknowledges silent-mode constraint.
5. **T-10** Spawn conductor. Conductor loads master timeline + roster + scenario, opens `event-log.jsonl`.
6. **T-5** Spawn OP1 participants (4) in order: IC → OSC → Rescue Captain → Cut Table Lead. Each acknowledges role, persona, active-driver-token protocol.
7. **T-0** Conductor starts the event clock. First event = E+0:04 first-due arrival.
8. **OP1→OP2 boundary (E+4:00)** (a) `psc-op2` (Capt. Doyle) drafts IAP-OP2 (must complete before crossing); (b) outgoing OP1 IC posts ICS-201 transfer brief into event log; (c) conductor spawns 6 additional OP2 participants; (d) active-driver token transferred to new IC; (e) snapshot `snap-E+04h.json` written.
9. **OP2→OP3 boundary (E+16:00)** Same sequence; spawn 4 additional OP3 participants; PSC must finish IAP-OP3 before crossing.
10. **OP3→OP4 boundary (E+28:00)** Same; participants drop from 14 to 8 — conductor explicitly terminates the 6 retiring subagents; PSC must finish IAP-OP4 before crossing.
11. **E+36:00** Conductor halts event clock. Participants and moderators stop driving but remain alive for hotwash.
12. **Hotwash phase 1** Each participant submits AAR (isolated). Each moderator submits AAR (isolated).
13. **Hotwash phase 2** Synthesis subagent merges all AARs + moderator notes into `improvement-plan.md`.
14. **Hotwash phase 3** Synthesis subagent compares each IP-# to MASTER-PLAN.md lines 862–1180. Tagged `covered | partial | gap | new-idea` → `v4.0.0-gap-analysis.md`.
15. **Final** `final-report.md` summarizes headlines + v4.0.0 backlog deltas + recommended MASTER-PLAN.md changes.
16. **Teardown (optional, Alex approves)** Export full JSON to `firebase-snapshots/final.json`, then delete `sim-surfside-ttx-2` from Firebase to keep prod clean.

---

## Identified risks + mitigations

| # | Risk | Mitigation |
|---|---|---|
| 1 | Two moderators disagree on severity for same observation | Keep both `Source` tags in IP table; conductor flags >1-tier mismatch for Alex to adjudicate |
| 2 | Participant subagent stuck on a modal | Conductor heartbeat (any tool call resets); 5-min no-action → conductor injects "yield turn"; stuck event logged |
| 3 | Rolling-notes wall-clock vs event clock drift | Every note records both `ts` (E+) and `wallclock`; master `event-log.jsonl` is the reconciliation timeline |
| 4 | Preview state shared across participants | Only ONE active-driver token at a time; conductor passes explicitly; token holder logged per action |
| 5 | Firebase data leaking outside sim dept | Conductor validates `fieldshore_deptId` in localStorage at every OP boundary; mismatch → abort |
| 6 | Radio traffic absent (app has no radio-net concept) | `mod-comms` flags every UI moment that maps to a radio call as med+ severity; hotwash Q: "what should the app announce?" |
| 7 | Victim modeling has no UI representation | Victim data in `scenario/victims.md` referenced by SP cluster ID in SP labels (e.g., "SP-093 [V-12]"); `mod-ist` + `mod-struct` flag as v4.0.0 NEW |
| 8 | SP creation unpaced — could spike in OP1 | Per-OP SP budget enforced by conductor: OP1 ~30, OP2 ~110, OP3 ~80, OP4 ~30 |
| 9 | No automated regression baseline for `findStrutCombinations` | Smoke deck of 5 fixed Quick Find queries with expected outputs run at each OP boundary by `mod-ux`; drift = critical |
| 10 | AAR question-set vs FEMA IP table column structure | AAR Q1+Q2 → `Finding` + `Recommended Action`; Q3 → "do not regress"; Q4 → `Recommended Action` |
| 11 | Conductor single point of failure | Conductor state persisted to `runtime/conductor-state.json` after every tick; restart resumes from disk |
| 12 | Scenario mirrors a real disaster — legal/ethical concern | Every scenario file carries explicit training-only disclaimer; all names + units are fictional |

---

## Verification

How we'll know the pre-event package is ready:

- [ ] `.claude/simulations/surfside-ttx-2/` directory tree matches the pre-event file list above
- [ ] `personnel-roster.md` has all ~71 unit rows and 30 named leaders from this plan
- [ ] All 6 moderator checklists exist with ≥10 observation items each, every item tagged to v4.0.0 phase or NEW
- [ ] All 4 IAP templates have the 8 ICS-202 sections present
- [ ] `local-apparatus-inventory.json` validates against the current FieldShore inventory schema (test by importing into a throwaway dept in the live preview)
- [ ] `runbook.md` is followable cold by another Claude session — every step has explicit success criteria
- [ ] `improvement-plan-template.md` has all 14 columns documented with allowed values
- [ ] Every scenario file carries the training-only disclaimer

How we'll know the live event ran successfully (executed in follow-up session):
- [ ] Event clock reached E+36:00
- [ ] ~250 SPs created across the 4 OPs, distributed roughly to budget
- [ ] All 6 moderator notes files exist with ≥30 entries each
- [ ] All 4 IAPs filled in-character
- [ ] All participant + moderator AARs written
- [ ] `improvement-plan.md` synthesized with ≥40 IP-# entries
- [ ] `v4.0.0-gap-analysis.md` maps every entry to a phase
- [ ] `final-report.md` written with headline findings and concrete MASTER-PLAN.md deltas
- [ ] F1–F10 (interactive-findings.md) regressions explicitly checked
- [ ] Sim Firebase dept either archived to JSON or removed

---

## Critical files referenced

| File | Purpose |
|---|---|
| [`.claude/audits/interactive-findings.md`](/Users/alex/Developer/paratech-struts/main/.claude/audits/interactive-findings.md) | Prior Surfside-scale run; F1–F10 baseline that regression checks verify against |
| [`.claude/plans/MASTER-PLAN.md`](/Users/alex/Developer/paratech-struts/main/.claude/plans/MASTER-PLAN.md) lines 862–1180 | v4.0.0 Release 3 scope — phases 3A/3B/3C/3D/3E/3F; the comparison target |
| [`.claude/audits/findings-ledger.md`](/Users/alex/Developer/paratech-struts/main/.claude/audits/findings-ledger.md) | Cross-reference for any IP-# that overlaps an existing audit finding |
| [`/Users/alex/.claude/projects/-Users-alex-Developer-paratech-struts-main/memory/reference_fema_ics_collapse.md`](/Users/alex/.claude/projects/-Users-alex-Developer-paratech-struts-main/memory/reference_fema_ics_collapse.md) | FEMA ICSSCI doctrine reference for `mod-nims` |
| [`CLAUDE.md`](/Users/alex/Developer/paratech-struts/main/CLAUDE.md) | Current app state (v3.11.1), local-first write architecture, Firebase listener behavior — `mod-data` reference |
| [`docs/USER-MANUAL.md`](/Users/alex/Developer/paratech-struts/main/docs/USER-MANUAL.md) | Current feature surface — `mod-ux` baseline |
| `app.js`, `index.html`, `style.css`, `sw.js`, `database.rules.json` | The live PWA the simulation drives |

---

## Authoritative references appendix (integrated 2026-05-17)

The plan-build session must use these verified references — not summaries — when writing IAP templates, moderator checklists, and roster details.

### Appendix A — FEMA ICS Forms (authoritative list)

Source: FEMA *ICS Form Descriptions* (March 2018, extracted from E/L/G 0300 ICS 300). Cached PDF at `tool-results/webfetch-1779029951068-3n3pkh.pdf`.

| Form # | Title | Purpose (verbatim doctrine) | Used in this sim |
|---|---|---|---|
| **201** | Incident Briefing | Provides IC + Command + General Staff basic info on situation + resources; initial action worksheet; **permanent record of initial response** | OP1 transfer-of-command briefing |
| **202** | Incident Objectives | Basic incident strategy, incident objectives, command emphasis/priorities, safety considerations — for the **next operational period** | OP2/OP3/OP4 IAP — **drafted in full per OP** |
| **203** | Organization Assignment List | Units currently activated + names staffing each position/unit; feeds ICS-207 wall chart | `mod-ist` checks app's ability to produce snapshot at each OP boundary |
| **204** | Assignment List | Division/Group assignments after Cmd + General Staff agree | `mod-ist` checks per-Division/Group exportability |
| **205** | Incident Radio Communications Plan | All radio frequencies/talkgroups per OP, prepared by Communications Unit Leader | `mod-comms` — gap-finding (app has no radio-net concept) |
| **205A** | Communications List | Radio + phone + pager directory for all incident personnel | `mod-comms` — directory gap |
| **206** | Medical Plan | Medical aid stations, transport, hospitals, emergency procedures | `mod-data` — does app capture enough to populate |
| **207** | Incident Organization Chart | Wall chart of activated ICS positions and names | `mod-nims` — current Command tab is the closest equivalent |
| **208** | Safety Message/Plan | Safety message, priorities, command emphasis, safety hazards, precautions per OP | `mod-nims` + Safety Officer subagent — drafted at each OP boundary |
| **209** | Incident Status Summary | Snapshot in time for staff + external parties + PIO | `mod-ist` — gap (no SitStat view) |
| **210** | Resource Status Change | Comms Center Manager records resource status changes | Not exercised |
| **211** | Incident Check-In List | Records arrival times, initial location, supports demob | `mod-data` — checks that arrival timestamps survive Firebase round-trip |
| **213** | General Message | Written messages between dispatcher and personnel | Not exercised |
| **214** | Activity Log | Notable activities at any ICS level, basis for AAR | `event-log.jsonl` IS the ICS-214 equivalent for this sim |
| **215** | Operational Planning Worksheet | Tactics Meeting output; Resources Unit uses to complete 204, LSC uses for ordering | `mod-ist` — checks app's resource breakdown supports this |
| **215A** | IAP Safety Analysis | Safety Officer operational risk assessment | Drafted by Safety Officer subagent at each OP boundary |
| **218** | Support Vehicle/Equipment Inventory | Ground Support Unit transportation inventory | `mod-data` — partial gap |
| **220** | Air Operations Summary | Air Branch helicopter/air resource assignments | Not exercised (no air ops in this sim) |
| **221** | Demobilization Check-Out | Resources checking out have completed all incident business | `mod-ist` + `demob-op3` + `demob-op4` — checks demob procedure UI |

**ICS organizational element definitions (verbatim doctrine):**
- **Command Staff** = report directly to IC (PIO, SO, LNO, others)
- **Section** = major functional area (Ops, Plans, Logs, Fin/Admin, Intel/Investigations); between Branch and IC
- **Branch** = functional or geographic, between Section Chief and Division/Group in Ops; between Section and Units in Logistics; identified by Roman numerals or functional name
- **Division** = geographic area of operations; between Strike Team and Branch
- **Group** = functional area; between Branches (when activated) and resources, in Operations
- **Unit** = functional element with specific Plans/Logs/Fin-Admin responsibility (Resources Unit, Demob Unit, Comms Unit, etc.)
- **Task Force** = combination of resources of **different kinds and types**, common comms, designated leader
- **Strike Team / Resource Team** = set of resources of **same kind and type**, established minimum, common comms, designated leader
- **Single Resource** = individual equipment + personnel complement, or crew with identified supervisor

This is the doctrine `mod-nims` benchmarks against. Notable: the app's "Group" field currently overloads with apparatus assignment (semantically wrong — Group is functional in NIMS). Already flagged in MASTER-PLAN Phase 3C.7 as the `assignedResource` rename.

### Appendix B — FEMA US&R Task Force Composition (authoritative)

Source: FEMA *National US&R Response System Operations Manual* (Sep 2012, MANUAL 12-001). Cached PDF at `tool-results/webfetch-1779029967936-csgimu.pdf`.

**Type I Task Force — 70 personnel + up to 10 support (ground transport) = up to 80 deployed**

Full Type I composition (Figure I-1, page 2):

```
                          TASK FORCE LEADER (2)
                                  │
                          SAFETY OFFICER (2)
                                  │
        ┌─────────┬─────────┬─────┴─────┬─────────┬─────────┐
   SEARCH TM    RESCUE TM   HAZMAT TM   MEDICAL TM  LOGISTICS TM  PLANS TM
   MGR (2)     MGR (2)     MGR (2)     MGR (2)     MGR (2)         MGR (2)
       │           │           │           │           │              │
  CANINE (4)  SQUAD OFF (4)  HAZMAT     MEDICAL   LOGISTICS      TECH INFO
              RESCUE SPEC    SPEC (8)   SPEC (4)  SPEC (4)       SPEC (2)
  TECH SRCH   (20)                                COMMS SPEC (2) STRUCTURES
  SPEC (2)    HEAVY RIG                           SUPPORT        SPEC (2)
              SPEC (2)                            SPEC (10)
```

**Total counts:** TFL 2, SO 2, Search 8 (2+4+2), Rescue 28 (2+4+20+2), HazMat 10 (2+8), Medical 6 (2+4), Logistics 18 (2+4+2+10), Plans 6 (2+2+2). Sum = 80. Base deploys 70; up to +10 with ground transport.

**This supersedes my earlier "70-person state TF / 80-person federal TF" guess in the OP2/OP3 roster.** The plan-build session uses this canonical composition for each TF arrival. State and federal TFs use the same Type I structure.

**Type III Task Force — 28 personnel + up to 6 support = up to 34 deployed**

Composition (Figure I-2, page 3):

```
              TASK FORCE LEADER (1)
                       │
              SAFETY OFFICER (2)
                       │
   ┌──────────────┬────┴─────────┬──────────────┐
SEARCH/RESCUE   MEDICAL        LOGISTICS      PLANS
MGR (2)         MGR (1)        MGR (2)        MGR (1)
   │                              │              │
CANINE TM (2×2)             COMMS SPEC (2)   TIS/SitStat
RESCUE SPEC (2×2)           SUPPORT SPEC (5)   (1)
MEDICAL SPEC (2×1)
TECH SRCH SPEC (2×1)
HAZMAT SPEC (2×1)
STRUCTURES SPEC (2×1)
```

Type III is used for rapid needs-assessment/search. Not currently scheduled in the sim, but the plan-build session can add a Type III deployment in OP1 as state-level rapid-assessment before the Type I main body if Alex wants extra fidelity.

### Appendix C — FEMA US&R Mobilization Timing (authoritative)

Source: same manual, Chapter 4 + page 2.

- **TF accept/decline** activation within **1 hour** of receipt
- **Embarkation:** position personnel + equipment at:
  - Embarkation point within **4 hours** for ground transport, OR
  - Aerial Port of Embarkation (APOE) within **6 hours** for air transport
- **"Mobilized and en route within a matter of hours"** (doc verbatim)

**Implication for the sim's OP timeline:**
- Plan currently has ESF-9 transmitted at E+3:45, federal activation order at E+7:30, federal advance arriving at E+12:00, main body at E+14:00 — 4.5 hours from activation to advance.
- Per the manual, 4hr embarkation + travel time = federal Type I from out-of-state arriving at E+12-18 is **on the fast end**. Plan-build session should adjust OP2/OP3 timings if more realism is needed (e.g., push Fed-Alpha main body to E+16-20).
- State TF (in-state) arriving at E+5:00 (2:15 after ESF-9 request) is realistic — state TFs are typically pre-positioned and don't require federal activation order.

### Appendix D — ESF #9 Chain of Authority (authoritative)

Source: same manual, Figure I-3 (page 4) + section 1-3.

- **ESF #9 (Search and Rescue) primary agencies:** FEMA, USCG, DOI/NPS, DoD
- For **structural collapse (urban) SAR**: **FEMA is overall primary** — manages US&R task force and IST deployments, coordinates with all federal/state/tribal/local SAR authorities
- FEMA activates ESF #9 when an incident requiring unified SAR response is **anticipated or actually occurs**
- Other SAR types (FEMA categorizes 3): Structural Collapse (Urban) SAR, Maritime/Coastal/Waterborne SAR, Land SAR

**Implication for the sim:** Unified Command at E+6:00 with Sheriff is correct; would also need FEMA representation once federal TFs deploy. Plan-build session adds FEMA IST as UC participant from E+12:00+ when Fed-Alpha advance arrives.

### Appendix E — Paratech O&M + LongShore (BLOCKED at fetch — fallback path)

URLs returned HTTP 403 from paratech.com via WebFetch:
- `https://paratech.com/wp-content/uploads/2019/11/Operation-and-Maintenance-Manual-for-Rescue-Support-Systems-Lockstroke-Acmethread-and-Low-Clearance.pdf`
- `https://paratech.com/wp-content/uploads/2019/12/Application-Manual-for-LongShore-Rescue-Support-System.pdf`

The teamequipment.com mirror returned binary-only image scans.

**Authoritative load tables are ALREADY ENCODED in [`app.js`](/Users/alex/Developer/paratech-struts/main/app.js)**, with traceability:
- `ACME_LOAD_TABLE` (~line 38–80) — corrected to match Paratech O&M Table 2-7 in v3.5.2 (per `.claude/audits/v3.5.1-deep-audit-round2.md` S2/S3 fix; over-reporting at 132" and 24" was eliminated)
- `LONGSHORE_LOAD_TABLE` — corrected to match Paratech LongShore datasheet (Dec 2019) in v3.5.2 NEW-2; lengths < 6 ft removed; unrated-zone surfaced for >16 ft

**Plan-build session action:** `mod-struct` benchmarks app behavior against `app.js` load tables, treating them as the authoritative encoded version of the Paratech manuals. If a discrepancy is found and Alex wants the original Paratech PDFs in hand, options: (a) Alex downloads from paratech.com manually via browser and saves locally; (b) Paratech.com URLs are publicly indexed — they may unblock for a non-WebFetch user agent; (c) contact Paratech Technical Services directly.

### Appendix F — WCAG 2.1/2.2 anchors for `mod-ux`

Source: W3C *WCAG 2.2 Quickref* (fetched 2026-05-17).

| Criterion | Level | Implication for FieldShore |
|---|---|---|
| **2.5.8 Target Size (Minimum)** | **AA** (2.2) | Touch target ≥ **24×24 CSS pixels** with adjacent-target spacing — gloveable; the F-1A-19 style finding |
| **2.5.5 Target Size (Enhanced)** | **AAA** (2.1) | Touch target ≥ **44×44 CSS pixels** — what cut-table buttons should target for gloved firefighter use |
| **1.4.3 Contrast (Minimum)** | AA | Text contrast ≥ **4.5:1** standard, ≥ **3:1** large text (18pt+ / 14pt+ bold) — covers status pills, ICP badges |
| **1.4.11 Non-text Contrast** | AA | UI components + states ≥ **3:1** against adjacent — covers status indicators, button borders, focus rings |
| **2.5.7 Dragging Movements** | AA (2.2) | Drag-and-drop interfaces (org chart reparent) must have non-drag alternative — current implementation has tap-to-pick which satisfies this; `mod-ux` verifies |
| **2.5.4 Motion Actuation** | A (2.1) | Motion-based controls must have UI alternative — not currently used by app |
| **4.1.3 Status Messages** | AA (2.1) | Status changes (SP advanced to Cutting) must be programmatically determinable by assistive tech without receiving focus — covered by v3.6.0 Phase 2H.4 `announce()` if shipped |
| **2.1.1 Keyboard** | A | All functionality operable via keyboard — covered by v3.6.0 Phase 2H.1 (button-ification of div onclick) if shipped |

**Plan-build session:** `mod-ux` checklist items 4 ("legible on smallest target") and 11 ("44px min touch targets on gloveable buttons") cite 2.5.5 AAA explicitly. Item 6 ("dark mode contrast on all pills") cites 1.4.3 + 1.4.11.

### Appendix G — NFPA standards (paywalled — partial reference only)

NFPA 1006 (Standard for Technical Rescuer Professional Qualifications) and NFPA 1670 (Standard on Operations and Training for Technical Search and Rescue Incidents) are paywalled.

**Plan-build session action:** Reference NFPA chapters at the abstract level only (e.g., "NFPA 1670 Chapter 6 — Structural Collapse"); do not attempt to quote requirements. If a `mod-struct` observation requires NFPA grounding, flag for Alex to verify against his department's copies.

### Appendix H — Source URLs (for the plan-build session's reference list)

- FEMA ICS Forms (downloadable): https://training.fema.gov/icsresource/icsforms.aspx
- FEMA ICS Form Descriptions PDF: https://training.fema.gov/emiweb/is/icsresource/assets/ics%20forms%20descriptions.pdf
- FEMA ICS-202 fillable: https://training.fema.gov/emiweb/is/icsresource/assets/ics%20forms/ics%20form%20202,%20incident%20objectives%20(v3.1).pdf
- FEMA ICS-203 fillable: https://training.fema.gov/emiweb/is/icsresource/assets/ics%20forms/ics%20form%20203,%20organization%20assignment%20list%20(v3).pdf
- FEMA ICS-204 fillable: https://training.fema.gov/emiweb/is/icsresource/assets/ics%20forms/ics%20form%20204,%20assignment%20list%20(v3.1).pdf
- FEMA ICS-201 fillable: https://training.fema.gov/emiweb/is/icsresource/assets/ics%20forms/ics%20form%20201,%20incident%20briefing%20(v3).pdf
- FEMA US&R Operations Manual (mirror): https://bcfdmo.com/wp-content/uploads/2017/06/FEMA-USR-Operations-Manual.pdf
- FEMA US&R Field Operations Guide (alt): https://www.fema.gov/pdf/emergency/usr/usr_23_20080205_rog.pdf (returned 403; try alternate access)
- FEMA US&R program page: https://www.fema.gov/emergency-managers/national-preparedness/frameworks/urban-search-rescue
- FEMA Resource Typing Library Tool — US&R: https://rtlt.preptoolkit.fema.gov/Public/Resource/View/8-508-1262
- Paratech O&M Manual (blocked): https://paratech.com/wp-content/uploads/2019/11/Operation-and-Maintenance-Manual-for-Rescue-Support-Systems-Lockstroke-Acmethread-and-Low-Clearance.pdf
- Paratech LongShore Application Manual (blocked): https://paratech.com/wp-content/uploads/2019/12/Application-Manual-for-LongShore-Rescue-Support-System.pdf
- W3C WCAG 2.2 Quickref: https://www.w3.org/WAI/WCAG21/quickref/

---

## Roster + framework updates from references

Three plan sections need adjustment at plan-build time, based on the Appendix B/C verified composition:

1. **TF row composition in roster** — replace generic "TF-State-Search / Rescue-A / Rescue-B / Medical / Plans / Logistics / Tech / Rigging" rows with the exact Type I structure (TFL×2, SO×2, Search Mgr×2 + Canine×4 + Tech Search×2, Rescue Mgr×2 + Squad Officer×4 + Rescue Spec×20 + Heavy Rigging×2, HazMat Mgr×2 + HazMat Spec×8, Medical Mgr×2 + Medical Spec×4, Logistics Mgr×2 + Logistics Spec×4 + Comms Spec×2 + Support Spec×10, Plans Mgr×2 + TIS×2 + StructSpec×2). Per-TF total = 70 (base) or up to 80 (with ground support).

2. **Federal TF arrival timing** — Appendix C says 4hr embarkation (ground) or 6hr (air) plus travel; my E+12:00 federal advance arrival is on the fast end. Plan-build session: push Fed-Alpha main body to E+16:00 (advance still at E+12), Fed-Bravo main body to E+22:00 (advance at E+18), Fed-Charlie main body to E+28:00 (advance at E+24). This shifts a few participant subagent windows but doesn't change the 36hr scope.

3. **IAP template** — use the verified ICS-202 sections from Appendix A row 202 ("basic strategy, incident objectives, command emphasis/priorities, safety considerations") rather than my earlier 8-block sketch. The actual ICS-202 has fewer blocks than I'd drafted; plan-build session uses the fillable PDF as template, not my outline.

---

## What ExitPlanMode means here

Approving this plan greenlights the **plan-build session** (next conversation) — that session writes all the pre-event files into `.claude/simulations/surfside-ttx-2/`. After the pre-event package exists, a third session runs the live event (drives the preview, spawns moderators + participants, executes the hotwash, produces the gap analysis). This split keeps the work staged: design → build the kit → run the exercise.
