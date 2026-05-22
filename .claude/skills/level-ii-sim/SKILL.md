---
name: level-ii-sim
description: "Run the FEMA Level II structural collapse simulation — mid-rise residential partial floor collapse. Stress-tests FieldShore at regional-response scale: 20+ apparatus, state USAR TF, 60 shore points, 3 OP periods, full ICS General Staff. Use this skill whenever Alex says 'run level ii simulation', 'level 2 sim', 'riverside sim', or '/level-ii-sim'."
---

# Level II Simulation — Riverside Falls Mid-Rise (Partial Floor Collapse)

Stress-tests FieldShore at regional-response scale: full ICS organization with all sections, 60 shore points across 6 geographic divisions (4 exterior + 2 floors), state USAR task force arrival, multi-agency coordination, 3 operational periods over 24 hours, and the beginning of demobilization. This is the scale where rendering performance, Firebase query limits, and multi-tenancy gaps (IP-001) become real constraints — and where the app must prove it can support a Planning Section Chief, not just a field operator.

> **TRAINING DISCLAIMER:** This is a fictional scenario for software testing purposes only. All persons, addresses, units, and events are fabricated. No real incident is depicted or referenced.

---

## Scenario

**Building:** 8-story Type III masonry residential apartment building, 1972 construction, 340 Riverside Dr, Riverside Falls OH
**Collapse mechanism:** Partial pancake collapse of Floors 3 and 4 in the southeast quadrant. Suspected trigger: long-term water infiltration into post-tensioned slab at the Floor 3/4 connection, weakening tendons and causing progressive failure. Approximately 3,000 sq ft of floor area involved per floor (6,000 sq ft total). Collapse occurred at 11:45 hours during occupied hours.
**Construction details:** Reinforced concrete frame with clay masonry infill walls. Post-tensioned concrete floor slabs. Flat roof with parapet. 8 residential units per floor (64 total). Central corridor with 2 stairwells (NW and SE). Elevator shaft (center). SE stairwell compromised.
**Geography:**
- Division Alpha — south face (address side). Primary access. Lobby entrance. Fire department connection.
- Division Bravo — east face. SE corner collapse visible. Exposed floor plates Floors 3–6. Secondary access via service entrance.
- Division Charlie — north face. Rear parking lot. Intact. Staging area established here.
- Division Delta — west face. Intact. Adjacent to public sidewalk. PD traffic control.
- Division 3 — Floor 3 interior (collapsed floor — primary search/shoring zone)
- Division 4 — Floor 4 interior (collapsed floor — secondary search/shoring zone)
**Victims:** ~12 known missing per building management (badge-in system for maintenance staff + resident welfare checks). Floors 3–6 SE-quadrant units. 3 confirmed in voids by search teams.
**Weather:** Clear, 55 deg F, wind 5 mph, low humidity. Good conditions.
**Hazards:**
- Partial floor plates hanging: Floors 5 and 6 SE quadrant show visible sagging. Structural engineer rates as "unstable — do not load." 50-ft interior exclusion zone above Floor 4.
- Disrupted standpipe system: riser sheared at Floor 3 SE connection. Water flowing. FDC charged from hydrant but limited to floors 1–2.
- Asbestos presumed: 1972 construction, no abatement records. OSHA notification made. All crews in full PPE with P100 minimum.
- Elevator shaft: car between Floors 3 and 4. Cable integrity unknown. Shaft locked out.
- Post-tensioned tendons: if exposed during shoring/cutting, extreme stored energy hazard. Structural engineer must assess before any cutting near PT slabs.
**Exposures:** 4-story commercial building (Bravo side, 30-ft separation). Public sidewalk (Delta side). Residential across street (Alpha side, 60 ft).

---

## Locked Decisions

| # | Decision | Value |
|---|----------|-------|
| 1 | Operational periods | 3 (OP1: E+0–6, OP2: E+6–18, OP3: E+18–24) |
| 2 | Duration | E+0:00 → E+24:00 (24 hours) |
| 3 | Shore point target | 60 (OP1: ~15, OP2: ~35, OP3: ~10 final placements) |
| 4 | Roster granularity | Named ICS leadership, unit-level crews |
| 5 | Inventory scale | Full Millbrook fleet + County Rescue 2 + State USAR Alpha (arrives OP2) |
| 6 | Sandbox department | `sim-millbrook-fd` |
| 7 | Hotwash format | Pearls & Pitfalls table + Gap Analysis |
| 8 | App interaction | UI only |
| 9 | Multi-agency | Local FD + County FD + State USAR TF — tests IP-001 multi-tenancy |
| 10 | Demob | OP3 begins demobilization planning for non-critical resources |

---

## Personnel Roster

### OP1 — Initial + Expanded Response (E+0:00 → E+6:00)

| Arrival | Unit | Agency | Type | Headcount | ICS Role | Notes |
|---------|------|--------|------|-----------|----------|-------|
| E+0:04 | Engine 1 | Millbrook FD | Engine | 4 | **IC #1 — Capt. Torres** | First-due |
| E+0:05 | Ladder 1 | Millbrook FD | Ladder | 4 | Search Group | First alarm |
| E+0:06 | Rescue 1 | Millbrook FD | Rescue | 4 | Entry Team / Shoring | First alarm |
| E+0:07 | Engine 2 | Millbrook FD | Engine | 4 | Water supply / FDC | First alarm |
| E+0:10 | Engine 3 | Millbrook FD | Engine | 4 | Entry Team Floor 4 | Box alarm |
| E+0:12 | Heavy Rescue 1 | Millbrook FD | Heavy Rescue | 6 | **Shoring Group** | Box alarm |
| E+0:15 | Squad 1 | Millbrook FD | Squad | 4 | Cutting / Rigging | Box alarm |
| E+0:20 | BC-1 | Millbrook FD | Command | 1 | **IC #2 — BC Whitfield** | Cmd transfer #1 |
| E+0:25 | EMS-1 | Millbrook FD | Medical | 2 | Medical Group | Triage area setup |
| E+0:30 | County Engine 4 | County FD | Engine | 4 | Staging | Mutual aid |
| E+0:45 | County Rescue 2 | County FD | Rescue | 4 | Entry Team relief | Mutual aid |
| E+1:00 | DC-1 | Millbrook FD | Command | 1 | **IC #3 — DC Park** | Cmd transfer #2 |
| E+1:00 | — | — | — | — | Torres → OSC, Whitfield → Safety | Post-transfer |
| E+1:15 | PIO-1 | Millbrook FD | Command | 1 | **PIO — Cmdr. Hollis** | Media staging |
| E+1:30 | Liaison-1 | County EM | Command | 1 | **Liaison — Mendoza** | EOC link |
| E+2:00 | Plans-1 | Millbrook FD | Command | 1 | **PSC — Capt. Doyle** | Planning Section established |
| E+3:00 | Logistics-1 | Millbrook FD | Command | 1 | **LSC — Lt. Yun** | Logistics Section established |

### OP2 — Extended Response (E+6:00 → E+18:00)

| Arrival | Unit | Agency | Type | Headcount | ICS Role | Notes |
|---------|------|--------|------|-----------|----------|-------|
| E+8:00 | State USAR Alpha | State USAR TF | USAR | 35 | Integrated under S&R Branch | **Multi-agency stress test** |
| E+8:00 | — | — | — | — | **S&R Branch Director** established | Torres promoted from OSC |
| E+8:00 | — | — | — | — | OSC → new appointment from State TF | — |
| E+10:00 | Structural Engineer | County | Technical Specialist | 1 | Reports to PSC | PT slab assessment |

**OP2 ICS Organization:**
```
DC Park — IC
├── Cmdr. Hollis — PIO
├── BC Whitfield — Safety (+ Asst. Safety from State TF)
├── Mendoza — Liaison
├── OSC (State TF appointee)
│   ├── S&R Branch (Torres)
│   │   ├── Division 3 Sup
│   │   ├── Division 4 Sup
│   │   ├── Division Alpha Sup (exterior)
│   │   └── Shoring Group Sup (Heavy Rescue 1 Officer)
│   ├── LE Branch (PD — paper role only)
│   └── Medical Branch (EMS — paper role only)
├── PSC — Capt. Doyle
│   ├── Situation Status
│   └── Resource Status
└── LSC — Lt. Yun
    ├── Communications
    └── Rehab
```

### OP3 — Demobilization (E+18:00 → E+24:00)

| Change | Details |
|--------|---------|
| Demob planning | PSC begins demob planning. County mutual aid released first. |
| Crew rotation | Night shift reliefs for Millbrook crews. State TF self-contained. |
| Reduced ops | Only active shoring in Division 3 (final 10 SPs for structural stabilization) |

---

## Inventory Baseline

| Apparatus Group | Key Equipment Summary |
|----------------|----------------------|
| **Millbrook fleet (9 apparatus)** | 22 ACME struts (36"–120"), 2 LongShore 96", 10 extensions, 38 universal plates, 20 wedge, 8 chimney, 4 ACME foot, 2 ACME head, 10x 4x4, 4x 6x6 lumber |
| **County Rescue 2** | 4x ACME 60", 4x ACME 84", 2 ext, 8 universal, 4 wedge, 4x 4x4 |
| **State USAR Alpha (arrives E+8:00)** | 8x ACME (full range 36"–132"), 4x LongShore (72"–192"), 10 ext, 20+ connectors (full set), 8x 4x4, 8x 6x6 |

**Total at peak (OP2):** ~50 ACME, 6 LongShore, 22 extensions, full connector complement.

**Import:** `.claude/skills/shared/millbrook-inventory.xlsx` at Phase 2. State USAR Alpha inventory is added during OP2 (participants add apparatus + import supplemental inventory through the UI at E+8:00).

---

## Agent Framework

**Total: 19 agents** (1 conductor + 5 moderators + 13 participants)

### Conductor
Manages 24-hour event clock across 3 OP periods. Handles:
- Staggered arrivals (OP1: every 5–15 min)
- Command transfer #1 (E+0:20 Torres→Whitfield) and #2 (E+1:00 Whitfield→DC Park)
- State USAR TF arrival at E+8:00 (OP2) — triggers S&R Branch establishment
- OP boundaries at E+6:00 and E+18:00
- Paper events: victim discoveries (E+3:00, E+5:30, E+9:00, E+14:00), structural engineer assessment (E+10:30), aftershock/settling event (E+12:00), demob authorization (E+19:00)
- Victim outcomes: 3 live rescues (E+4:00, E+6:30, E+15:00), 2 recoveries (E+10:00, E+16:00)

### Moderators (5 — silent observers)

**Mod-UX** — Field UX Observer
Focus: SP card rendering at 60 items (scroll, filter, search), mobile vs desktop experience, General Staff org chart complexity, state TF integration into existing UI, demob workflow.

**Mod-Data** — Data Integrity Observer
Focus: IP-001 multi-tenancy (State TF accessing `sim-millbrook-fd` data), 60-SP Firebase snapshot size, concurrent 13-agent write pressure, role history across 2 command transfers, inventory integrity after state TF supplemental import.

**Mod-NIMS** — NIMS Compliance Observer
Focus: Full ICS General Staff validation (PIO, Safety, Liaison, OSC, PSC, LSC), Branch/Division/Group structure accuracy, command transfer chain (3 ICs), UC protocol discussion (County mutual aid = possible UC trigger), staging management.

**Mod-Structural** — Structural/Shoring Observer
Focus: Mixed floor/exterior division SP assignment, PT slab hazard documentation, LongShore group integrity for long spans, strut load ratings for multi-floor vertical shores, base plate selection for concrete vs masonry bearing surfaces.

**Mod-Comms** — Communications Observer
Focus: Radio terminology compliance ("Division 3" not "third floor," "Division Alpha" not "front"), Quick Find output transmittability (can IC relay strut selection over radio?), ICS-205 communications plan absence, command/tactical net separation.

### Participants (13 — drive the app UI only)

**Participant-IC (DC Park)** — Takes command at E+1:00 (transfer #2). Manages the full General Staff org chart. Monitors 60 SPs. Authorizes OP transitions and demob.

**Participant-Safety (BC Whitfield)** — Safety Officer from E+1:00 onward. Monitors hazards (hanging floors, PT tendons, asbestos). Records safety messages. At E+12:00 settling event, reassesses and communicates.

**Participant-PIO (Cmdr. Hollis)** — Tests whether the app has any PIO-relevant features (incident summary export, status overview for media briefing). If not, that's a finding.

**Participant-OSC (Torres OP1 / State TF appointee OP2)** — Directs tactical operations. At E+8:00, Torres promoted to S&R Branch Director; new OSC from State TF. Tests Branch Director role creation and assignment.

**Participant-PSC (Capt. Doyle)** — Planning Section Chief. Tests resource tracking, situation status, whether the app can produce any ICS-form-like outputs. If not, that's a finding.

**Participant-LSC (Lt. Yun)** — Logistics Section Chief. Tests whether the app supports logistics functions (rehab tracking, equipment requests, communications plan). If not, that's a finding.

**Participant-S&R-Branch-Dir (Torres, from E+8:00)** — Search & Rescue Branch Director. Manages Division 3, Division 4, and Shoring Group. Tests Branch-level role in org chart.

**Participant-Div-3-Sup** — Division 3 (Floor 3) Supervisor. Manages interior SPs on collapsed floor. Coordinates with Shoring-A.

**Participant-Div-4-Sup** — Division 4 (Floor 4) Supervisor. Manages Floor 4 SPs. Coordinates with Shoring-B.

**Participant-Shoring-A (Heavy Rescue 1 FF)** — Primary shoring for Division 3 (Floor 3). Creates ~30 SPs. Deploys from Heavy Rescue 1 + local apparatus inventories.

**Participant-Shoring-B (State USAR Alpha specialist)** — Shoring for Division 4 (Floor 4) after State TF arrival at E+8:00. Creates ~20 SPs. Deploys from State USAR Alpha inventory. **Runs concurrent with Shoring-A** — stress tests 2 shoring agents + 11 other agents all writing simultaneously.

**Participant-State-TF-Leader** — State USAR Task Force Leader. Arrives at E+8:00. Tests multi-agency integration: can they see the operation? Add their inventory? Assign their personnel to roles? Is the app designed for single-dept or multi-agency?

**Participant-Medical-Group-Sup** — Medical Group Supervisor. Manages triage/treatment at staging area (Charlie side). Tests whether the app supports medical/victim tracking. If not, that's a finding.

---

## Execution Phases

### Phase 0 — Intent
Start fresh, resume from OP2, or resume from OP3? Default: OP1.

### Phase 1 — Pre-flight
1. Confirm app version
2. Start preview: `npx serve -l 8095 .`
3. Verify load + Firebase
4. **Success:** App loads, version confirmed

### Phase 2 — Inventory Import (UI only)
1. Settings → Department Code: `sim-millbrook-fd`
2. Inventory → Import: `.claude/skills/shared/millbrook-inventory.xlsx`
3. Verify full Millbrook fleet + County apparatus
4. **Note:** State USAR Alpha inventory added during OP2 (E+8:00) via additional apparatus creation + import through the UI
5. **Success:** Millbrook + County apparatus visible with correct counts

### Phase 3 — Spawn Agents
19 agents in a **single message**. Each receives scenario, persona, event clock, UI-only constraint.

### Phase 4 — Event Clock
Key stress moments:
- E+0:20: Command transfer #1 (Torres → Whitfield)
- E+1:00: Command transfer #2 (Whitfield → DC Park). Torres becomes OSC. Full Command Staff established by E+3:00.
- E+3:00–5:00: OP1 peak SP creation (15 SPs by Division 3 shoring)
- E+6:00: **OP2 boundary**
- E+8:00: **State USAR Alpha arrival** — multi-agency integration. S&R Branch established. Tests IP-001.
- E+8:00–16:00: OP2 sustained operations. 35 new SPs. Peak 13-agent concurrent writes.
- E+12:00: Settling paper event — crews briefly withdraw.
- E+18:00: **OP3 boundary** — demob planning begins.
- E+19:00: County mutual aid released.
- E+22:00–24:00: Equipment return + operation end.

**Success:** 60 SPs at terminal status. 3 OP transitions. 2 command transfers. State TF integrated. Demob started.

### Phase 5 — Hotwash
AAR from all 13 participants + 5 moderator findings. Synthesize Pearls & Pitfalls + Gap Analysis.

### Phase 5b — Issue Posting
`[SIM-II]` prefix. `/feedbackreview` sweep.

---

## Moderator Checklists

### Mod-UX Checklist

| # | Item | v4.0 Phase | Surface |
|---|------|------------|---------|
| U-1 | 60-SP rendering: scroll performance on mobile? Any jank or frame drops? | 3C | SP cards |
| U-2 | SP filtering: can OSC/Branch Dir view only Division 3 SPs? Only Division 4? | 3C | Operations |
| U-3 | Org chart at full ICS: General Staff (PIO, Safety, Liaison, OSC, PSC, LSC) + Branches + Divisions + Groups. Readable? | 3B | Org chart |
| U-4 | State TF integration: when 35 new personnel join at E+8:00, does the UI become overwhelming? | 3B | Org chart |
| U-5 | Desktop vs mobile: is command-level work (IC, PSC) better on desktop? Does the app support it? | 3C | Responsive |
| U-6 | Demob workflow: any UI for tracking resource release? Or is it all manual? | 3D | Demob |
| U-7 | Quick Find at scale: with 50+ struts in inventory, are results filterable/sortable? | 3E | Quick Find |
| U-8 | OP period transition: clear visual indication of new OP? OP history accessible? | 3C | Operations |
| U-9 | Command transfer #2: app handles IC → IC → IC chain? Role history visible? | 3B | Org chart |
| U-10 | Inventory at scale: 50+ struts + plates + extensions + lumber — is the Inventory tab usable? | 3B | Inventory |

### Mod-Data Checklist

| # | Item | v4.0 Phase | Surface |
|---|------|------------|---------|
| D-1 | IP-001 multi-tenancy: State TF Leader can read/write to `sim-millbrook-fd` department data? | 3A | Auth |
| D-2 | 60-SP Firebase payload: total data size? Any query limits hit? | 3F | Firebase |
| D-3 | 13-agent concurrent writes: any Firebase transaction conflicts or retries? | 3F | Firebase |
| D-4 | Role history: 2 command transfers (Torres IC→OSC→Branch Dir). All preserved? (IP-006) | 3B | Roles |
| D-5 | State TF inventory import: supplemental import mid-operation corrupts existing inventory? | 3B | Inventory |
| D-6 | OP snapshot: OP1 and OP2 state accessible from OP3? | 3C | Operations |
| D-7 | Demob: resource release tracked in Firebase? Or just local? | 3D | Demob |
| D-8 | Console errors: tally across 24-hour sim | — | Console |
| D-9 | Network: any 429s, timeouts, or PERMISSION_DENIED during peak OP2? | 3F | Network |
| D-10 | Memory: preview process memory after 24 hours of operation? Any leak indicators? | — | Performance |

### Mod-NIMS Checklist

| # | Item | v4.0 Phase | Surface |
|---|------|------------|---------|
| N-1 | Full General Staff: PIO, Safety, Liaison, OSC, PSC, LSC all assignable in org chart? | 3B | Org chart |
| N-2 | Branch Director: S&R Branch between OSC and Division Sups — app models this level? | 3B | Org chart |
| N-3 | Division 3/4 naming: floor-based divisions per FEMA (Division 1 = 1st floor, etc.) | 3C | SP fields |
| N-4 | UC discussion: County mutual aid on scene. Does the app support Unified Command? | 3B | Command |
| N-5 | Staging: formal staging area (Charlie side). App has staging concept? | 3B | Operations |
| N-6 | Command transfer chain: 3 ICs in sequence. ICS-201 brief at each? | 3B | Command |
| N-7 | PSC functions: resource tracking, situation status — app supports any of this? | 3D | Planning |
| N-8 | LSC functions: rehab, communications plan, equipment requests — app supports? | 3D | Logistics |
| N-9 | Span of control: OSC with S&R Branch + LE Branch + Medical Branch = 3. OK. Branch Dir with Div 3 + Div 4 + Shoring Group = 3. OK. | 3B | Org chart |
| N-10 | Demob: FEMA Phase IV requirements (resource info, agreements, personnel condition, transport). App supports? | 3D | Demob |

### Mod-Structural Checklist

| # | Item | v4.0 Phase | Surface |
|---|------|------------|---------|
| S-1 | Floor-to-floor shoring: vertical shores between Floor 2 (intact) and Floor 5 (intact) through collapsed 3/4. Measurement range? | 3E | Quick Find |
| S-2 | PT slab hazard: can the app flag/display hazard warnings per SP? | 3C | SP fields |
| S-3 | Mixed bearing surface: concrete floor (Divisions 3/4) vs masonry wall (exterior). Plate selection guidance? | 3E | Deploy |
| S-4 | LongShore for long spans: Division 3 has open-plan areas requiring 12–16 ft shores. LongShore results accurate? | 3E | Quick Find |
| S-5 | Multi-strut configurations: some void spaces need 2–3 struts in parallel. Can the app model this? | 3C | SP creation |
| S-6 | Extension stacking: ACME strut + extension for Floor 3 (12-ft ceiling). Correct combined range? | 3E | Quick Find |

### Mod-Comms Checklist

| # | Item | v4.0 Phase | Surface |
|---|------|------------|---------|
| C-1 | Division naming: "Division 3" (floor) and "Division Alpha" (exterior) in radio comms. App consistent? | 3C | SP fields |
| C-2 | Quick Find transmittable: can IC relay "ACME 84 with 6x6 header, universal plate" over radio? App formats this? | 3E | Quick Find |
| C-3 | ICS-205 absence: no communications plan in the app. Is this a gap at Level II scale? | 3D | Forms |
| C-4 | Command/Tactical net: app has any concept of radio channel assignment? | 3D | Comms |
| C-5 | Status transmittable: "Division 3, SP 7, status runner" — is the SP naming scheme radio-friendly? | 3C | SP cards |
| C-6 | Resource status: "Engine 1, 0 of 2 ACME 60-inch available" — can this be read over radio from the app? | 3B | Inventory |

---

## Participant Personas

### IC — DC Park
> You are Deputy Chief Helen Park, Millbrook FD. You take command at E+1:00 — the third IC in the chain. Torres and Whitfield brief you: "8-story residential, Floors 3 and 4 partial pancake, SE quadrant. 12 missing, 3 confirmed in voids. We have Divisions 3 and 4 interior, Alpha through Delta exterior. Torres is your OSC. Whitfield is Safety. Heavy Rescue has shoring." You're managing from your vehicle with a tablet. You need the full command picture: who's where, what's shored, what's pending. At E+8:00, the State USAR TF arrives and things get more complex. Can the app scale with you? UI only.

### Safety — BC Whitfield
> You are Battalion Chief Jim Whitfield. After transferring command to DC Park, you're assigned Safety. Hazards: hanging floor plates (Floors 5–6 SE), PT tendons, asbestos, compromised standpipe. You want to record these hazards, set exclusion zones, and track work-cycle compliance (30-min rotation, cold stress). At E+12:00, the conductor announces a settling event — you order all crews out until structural reassessment. Can the app support safety stop-work authority? UI only.

### PIO — Cmdr. Hollis
> You are Commander Dave Hollis, PIO. You need to prepare media briefings. You want an incident summary you can share — number of SPs, resources deployed, victim status. Can the app generate or export any of this? If not, that's a finding. UI only.

### OSC — Torres (OP1) / State TF (OP2)
> OP1: You are Captain Torres, OSC. You direct Division and Group supervisors. You track which divisions need more shoring resources. At E+8:00, you're promoted to S&R Branch Director when the State TF arrives. A State TF officer becomes OSC.
> OP2: You are Captain Reeves, State USAR Alpha. You're assigned OSC at E+8:00. You need to understand the current operational picture through an app you've never used before. How quickly can you orient? UI only.

### PSC — Capt. Doyle
> You are Captain Ed Doyle, PSC. Your job: resource tracking (who's where), situation status (what's changed), and planning the next OP. You want to produce an IAP or at least an objectives list. You want resource status — how many struts deployed vs available? Can the app give you planning tools? If not, that's a finding. UI only.

### LSC — Lt. Yun
> You are Lieutenant Christine Yun, LSC. You manage logistics: rehab rotation, equipment requests, communications, food/water. You want to track which crews need rehab and when equipment resupply is needed. Can the app tell you inventory burn rate? If not, that's a finding. UI only.

### S&R Branch Dir — Torres (from E+8:00)
> You are Captain Torres, promoted to S&R Branch Director at E+8:00 when the State TF integrates. You manage Division 3 Sup, Division 4 Sup, Shoring Group, and coordinate with State TF elements. You need a branch-level view of all search and rescue activity. Can the app show you only your branch's SPs? UI only.

### Div-3-Sup
> You are Lieutenant Tran, Division 3 Supervisor. You manage Floor 3 interior — the primary collapse zone. 30+ SPs in your division. You need to see your SPs filtered, know which are pending vs secured, and coordinate with Shoring-A. UI only.

### Div-4-Sup
> You are Lieutenant Hashimoto, Division 4 Supervisor. You manage Floor 4 interior — the secondary collapse zone above Floor 3. ~20 SPs in your division. State TF Shoring-B creates most of your SPs after E+8:00. UI only.

### Shoring-A — Heavy Rescue 1 FF
> You are Firefighter Marchetti, Heavy Rescue 1. Lead shoring for Division 3. You create ~30 SPs through the full operation. Measurements range from 28" (small void) to 144" (floor-to-floor with extension). You deploy from Heavy Rescue 1 first, then Rescue 1, then Engines as needed. You work continuously from E+0:30 through OP2, with rehab breaks. At peak (E+8:00–16:00), you're creating SPs while Shoring-B is also creating SPs on Floor 4 — concurrent pressure. UI only.

### Shoring-B — State USAR Alpha
> You are Specialist First Class Ronaldo, State USAR Alpha. You arrive at E+8:00 with the task force. You need to: (1) figure out the app — you've never used FieldShore, (2) add State USAR Alpha apparatus to the department and import their inventory, (3) start creating Division 4 SPs (~20 total). You deploy from State USAR Alpha's inventory. You and Shoring-A are working simultaneously. UI only.

### State-TF-Leader
> You are Task Force Leader Captain Vasquez, State USAR Alpha. You arrive at E+8:00 with 35 personnel. You need to integrate your team into the existing ICS structure. Questions you'll test through the app: Can your team see the operation? Can you add your apparatus/inventory? Can you assign your personnel to roles? Is the app designed for a single department, or does it handle multi-agency? UI only.

### Medical-Group-Sup
> You are Paramedic Chief Santos, EMS-1. Medical Group Supervisor. You manage triage/treatment at the staging area (Charlie side). You track victims as they're extricated: status, destination, transport unit. Does the app have any victim tracking? Patient tracking? If not, that's a finding. UI only.

---

## Event Clock

| E+ Time | Event | Conductor Action |
|---------|-------|-----------------|
| E+0:00 | Dispatch | "Multi-alarm, 340 Riverside Dr. 8-story residential, partial building collapse, multiple trapped." |
| E+0:04–0:30 | OP1 arrivals | Per roster. Torres → Whitfield at E+0:20, Park at E+1:00. |
| E+1:00 | **Cmd transfer #2** | "DC Park assuming command. Torres to OSC. Whitfield to Safety." |
| E+1:30 | Shoring begins | Shoring-A starts Division 3 SPs |
| E+2:00 | PSC arrives | Planning Section established |
| E+3:00 | Victim #1 located | "Search reports victim in Floor 3, SE corridor. Responsive. Pinned by concrete debris." |
| E+3:00 | LSC arrives | Logistics Section established |
| E+4:00 | Victim #1 extricated | "Victim 1 extricated. Critical injuries. Transported Level 1." |
| E+5:00 | 15 SPs active | OP1 target reached |
| E+5:30 | Victim #2 located | "Search reports victim in Floor 3, apartment 3F. Unresponsive." |
| E+6:00 | **OP2 BOUNDARY** | "OP2 in effect. PSC issues new objectives. Crew rotation per plan." |
| E+6:30 | Victim #2 recovered | "Victim 2 confirmed deceased. Recovery complete." |
| E+8:00 | **STATE USAR ALPHA ARRIVES** | "State USAR Alpha, 35 personnel, on scene at staging." **Multi-agency integration.** |
| E+8:00 | S&R Branch established | Torres promoted to S&R Branch Dir. State TF officer → OSC. |
| E+8:30 | State TF inventory added | Shoring-B adds USAR apparatus + imports inventory through UI |
| E+9:00 | Victim #3 located | "Search reports victim Floor 4, apartment 4D. Responsive." |
| E+10:00 | Victim #3 extricated | "Victim 3 extricated. Moderate injuries." |
| E+10:30 | Structural engineer | "Structural engineer reports: PT tendons intact in remaining floor sections. Cutting authorized with 8-ft buffer from any PT cable path." |
| E+12:00 | **SETTLING EVENT** | "Loud crack reported Floor 5 SE. All crews EVACUATE collapse zone. PAR check." |
| E+12:30 | All clear | "Structural reassessment complete. Floor 5 sagging increased 2 inches but stable. Crews cleared with revised exclusion zone." |
| E+14:00 | Victim #4 located | "Search reports victim Floor 3, apartment 3B. Unresponsive." |
| E+15:00 | Victim #4 recovered | "Victim 4 deceased." |
| E+16:00 | 50 SPs active | Peak SP count approach |
| E+18:00 | **OP3 BOUNDARY** | "OP3 in effect. Transition to stabilization and demobilization. Only Division 3 final shoring active." |
| E+19:00 | Demob authorized | "County mutual aid released. County Engine 4 and County Rescue 2 demob. State TF continues." |
| E+20:00 | Final SPs | Shoring-A: last 10 SPs for structural stabilization |
| E+22:00 | All SPs secured | 60 SPs total at terminal status |
| E+23:00 | Equipment return | Return equipment across all apparatus |
| E+24:00 | Operation ends | "Command terminated." |

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
- **DO NOT** use `preview_eval` for anything.
- **DO NOT** skip command transfers. Testing the IC→IC→IC chain with role history is critical.
- **DO NOT** skip the State TF arrival at E+8:00. Multi-agency integration is a primary stress target.
- **DO NOT** have Shoring-A and Shoring-B work sequentially. They must work simultaneously during OP2.
- **DO NOT** skip the settling event at E+12:00. Tests crew evacuation + PAR + safety authority.
- **DO NOT** skip OP boundaries. Testing 3 OP transitions is core to this simulation.
- **DO NOT** skip demob at OP3. Even if the app has zero demob features, documenting that absence is the finding.
- **DO NOT** let moderators interrupt participants.
- **DO NOT** exceed 60 SPs. Save the 200+ SP test for Level I.

---

## Notes

- **Sandbox department:** `sim-millbrook-fd`
- **Inventory source:** `.claude/skills/shared/millbrook-inventory.xlsx` (base) + supplemental State USAR Alpha inventory added at E+8:00 through the UI
- **App version baseline:** v3.17.2
- **MASTER-PLAN reference:** `.claude/plans/MASTER-PLAN.md` Release 3 phases 3A–3F
- **Runtime output:** `.claude/simulations/level-ii-sim/runtime/`
- **Key stress targets:** 60-SP rendering, IP-001 multi-tenancy, 3 OP periods, 2 command transfers, full General Staff org chart, State TF multi-agency integration, demob workflow absence, PSC/LSC capability gaps
- **Related simulations:** `/level-iii-sim` (smaller), `/level-i-sim` (larger — Surfside scale)
