---
name: sim-level-iii
description: "Run the FEMA Level III structural collapse simulation — warehouse roof pancake. Stress-tests FieldShore at extended-attack scale: 10 apparatus, 25 shore points, 2 OP periods, command transfer, LongShore struts. Use this skill whenever Alex says 'run level iii simulation', 'level 3 sim', 'meadowville sim', or '/level-iii-sim'."
---

# Level III Simulation — Meadowville Warehouse (Roof Pancake)

Stress-tests FieldShore at extended-attack scale: command transfer, OP period transition, concurrent multi-agent writes, LongShore struts with unrated-zone warnings, and 25 shore points across 3 geographic divisions. This is where the app must prove it can handle a real multi-hour collapse operation with rotating leadership and mutual aid — the threshold between "working fire" and "campaign incident."

> **TRAINING DISCLAIMER:** This is a fictional scenario for software testing purposes only. All persons, addresses, units, and events are fabricated. No real incident is depicted or referenced.

---

## Scenario

**Building:** Pre-engineered metal building (PEMB), single-story, 180 x 240 ft footprint, 28-ft clear height, 3400 Industrial Pkwy, Meadowville PA
**Collapse mechanism:** Accumulated snow load (48" base + 8" overnight) exceeded bar-joist capacity in the east bay. Approximately 60 x 240 ft of roof deck pancaked onto warehouse floor at 05:45 hours. Steel columns remain standing but are laterally displaced. West bay roof is intact but suspect — showing visible deflection at midspan.
**Construction details:** Rigid-frame steel with bar-joist roof, metal deck, built-up roofing with gravel. Concrete tilt-up walls on 3 sides. Dock doors (8) on north side (Division Bravo). Personnel door on west side (Division Alpha). East wall (Division Charlie) partially buried under roof debris.
**Geography:**
- Division Alpha — west side. Main personnel access. Intact. Primary entry point.
- Division Bravo — north dock side. 8 dock doors, 3 accessible. Secondary entry. Truck access for heavy equipment.
- Division Charlie — east side. Collapse zone exterior. No entry — debris field extends 20 ft from building.
- Division Delta — south side. Intact tilt-up wall. No doors. Exposure to adjacent parking lot.
**Victims:** 2 confirmed via security company (badge-in records show 2 employees entered at 05:00 for early shift). Work areas in east bay (collapse zone).
**Weather:** Active snowfall (1"/hr rate), 28 deg F, wind 15 mph gusting 30 from NW. Visibility 1/4 mile in snow. Dawn at 07:15.
**Hazards:**
- West bay roof: visible deflection at midspan. Rated capacity exceeded — potential for progressive collapse. 100-ft exclusion zone established.
- Liquid nitrogen storage: 500-gallon dewar in northeast corner (Division Bravo/Charlie corner). Integrity unknown. HazMat consulted.
- Limited egress: single personnel door (Alpha), 3 dock doors (Bravo). No Charlie/Delta exits.
- Snow/ice on exterior surfaces. Footing hazard for all crews.
- Cold stress: 28 deg F with wind chill ~12 deg F. 30-minute work cycles, mandatory rehab.
- Steel debris: exposed bar-joist ends, metal decking edges. Puncture/laceration hazard.
**Exposures:** Parking lot (Delta, 60 ft clear). Adjacent warehouse (Bravo side, 80 ft separation). Railroad spur (Charlie side, 40 ft).

---

## Locked Decisions

| # | Decision | Value |
|---|----------|-------|
| 1 | Operational periods | 2 (OP1: E+0:00–6:00, OP2: E+6:00–12:00) |
| 2 | Duration | E+0:00 → E+12:00 (12 hours) |
| 3 | Shore point target | 25 (20 single verticals/rakers + 1 LongShore group of 3 + 1 Double-T group of 2) |
| 4 | Roster granularity | Individual role assignment with named ICS leadership |
| 5 | Inventory scale | 9 Millbrook apparatus + County Engine 4 (mutual aid): ~30 ACME, 2 LongShore, 10 extensions |
| 6 | Sandbox department | `sim-millbrook-fd` — created fresh on the local emulators each run (Phase 1); other devices join with its invite code |
| 7 | Hotwash format | Pearls & Pitfalls table + Gap Analysis |
| 8 | App interaction | UI only |
| 9 | Command transfer | E+2:00 IC #1 (Torres) → IC #2 (Whitfield) — tests role history preservation (IP-006) |
| 10 | OP2 boundary | E+6:00 — new IAP, OSC rotation, resource redeployment |

**Shore-point status lifecycle (7 statuses).** Event-clock and checklist status words use these field labels:

| lifecycle id | v4 label |
|---|---|
| pending | **Pending Equipment** |
| process | **Equipment Assigned** |
| strutset | **Strut Set** |
| cutting | **Cutting Station** |
| runner | **Runner** |
| secured | **Wood Shore Secured** |
| returned | **Strut Equipment Returned** |

**Grouped shores.** The shore type sets the group: a Vertical T-Shore takes 1 strut, a Double-T Vertical Shore 2, a 3-Post Vertical Shore 3. A Double-T's or 3-Post's struts share one group that moves lock-step before Cutting Station and individually from Cutting Station on. The Add form's "Number of Shore Sets" makes that many separate shores, not a group. The scenario's "LongShore group of 3" is one 3-Post Vertical Shore built with LongShore struts; the "Double-T group of 2" is one Double-T Vertical Shore. Those three are the only shore types, so the Division Charlie rakers (Shoring-C, S-7) are expected findings.

---

## Personnel Roster

### OP1 — Initial + Expanded Response (E+0:00 → E+6:00)

| Arrival | Unit | Agency | Type | Headcount | ICS Role | Notes |
|---------|------|--------|------|-----------|----------|-------|
| E+0:06 | Engine 1 | Millbrook FD | Engine | 4 | **IC #1 — Capt. Torres** | First-due |
| E+0:07 | Ladder 1 | Millbrook FD | Ladder | 4 | Staging | First alarm |
| E+0:08 | Rescue 1 | Millbrook FD | Rescue | 4 | Entry Team Alpha | First alarm |
| E+0:10 | Engine 2 | Millbrook FD | Engine | 4 | Water supply / exposure | First alarm |
| E+0:15 | Engine 3 | Millbrook FD | Engine | 4 | Entry Team Bravo | Box alarm |
| E+0:18 | Squad 1 | Millbrook FD | Squad | 4 | Shoring / Cutting | Box alarm |
| E+0:22 | Heavy Rescue 1 | Millbrook FD | Heavy Rescue | 6 | **Shoring Group** — primary strut kit | Box alarm |
| E+0:30 | BC-1 | Millbrook FD | Command | 1 | **Safety Officer** | |
| E+0:45 | EMS-1 | Millbrook FD | Medical | 2 | Medical / Rehab | |
| E+1:30 | County Engine 4 | County FD | Engine | 4 | Staging → Entry relief | Mutual aid |
| E+2:00 | BC-2 (off-duty recall) | Millbrook FD | Command | 1 | **IC #2 — BC Whitfield** | Command transfer from Torres |

**Post-transfer ICS organization (E+2:00+):**
- BC Whitfield → IC
- Capt. Torres → **OSC** (Operations Section Chief — first formal General Staff position)
- BC-1 → Safety Officer
- Heavy Rescue 1 Officer → Shoring Group Supervisor
- Rescue 1 Officer → Division Alpha Supervisor
- Engine 3 Officer → Division Charlie Supervisor (exterior ops)
- Squad 1 Officer → Cutting Group lead

### OP2 — Extended Response (E+6:00 → E+12:00)

| Change | Details |
|--------|---------|
| OSC rotation | Torres (12 hrs on scene) → Lt. Vega (Rescue 1 Officer) as OSC. Torres released to rehab. |
| Fresh crews | County Engine 4 crew rotates to Entry Team Alpha. Rescue 1 crew to rehab. |
| No new apparatus | Same fleet, crew rotation only |

---

## Inventory Baseline

Dispatched apparatus from Millbrook fleet + County mutual aid:

| Apparatus | Key Equipment |
|-----------|--------------|
| Engine 1 | 2x ACME 60", 4 universal, 2 wedge |
| Engine 2 | 2x ACME 60", 4 universal, 2 wedge |
| Engine 3 | 2x ACME 48", 2x ACME 72", 4 universal, 2 wedge |
| Ladder 1 | 2 wedge plates only |
| Rescue 1 | 4x ACME 48", 4x ACME 84", 2 ext, 8 universal, 4 wedge, 2 chimney, 4x 4x4 lumber |
| Heavy Rescue 1 | 4x ACME 36", 4x ACME 60", 4x ACME 96", 4x ACME 120", 2x LongShore 96", 6 ext, 8 universal, 6 wedge, 4 chimney, 4 ACME foot, 2 ACME head, 4x 4x4, 4x 6x6 lumber |
| Squad 1 | 2x ACME 48", 2x ACME 72", 2 ext, 4 universal, 2 wedge, 2x 4x4 |
| BC-1 | Command only |
| EMS-1 | Medical only |
| County Engine 4 | 2x ACME 60", 4 universal |

**Total on scene:** ~30 ACME struts, 2 LongShore, 10 extensions, full plate/lumber complement.

**Fixture:** `.claude/skills/shared/sim-level-iii-inventory.csv` — 35 rows across 8 stocked rigs (County Engine 4, Engine 1, Engine 2, Engine 3, Heavy Rescue 1, Ladder 1, Rescue 1, Squad 1), imported in Phase 2. It carries the per-rig table above in v4 catalog names; the per-rig table is the authority over the "~30 ACME" total, so the fixture holds 38 AcmeThread struts, 2 LongShore struts, 10 extensions and 68 plates. Names follow `millbrook-inventory.csv` first and the v3 Millbrook spreadsheet second: ACME 36" = AT 25-36, 48" = AT 37-58, 60/72/84/96/120" = AT 56-88 (no AcmeThread strut reaches 96"/120" without an extension; Heavy Rescue 1's three sizes merge into one row of 12); LongShore 96" = LS 610 (72–116"; LS 812 is not in the catalog); universal = `swivel6`, wedge = `chainwedge`, chimney = `contour`, ACME foot = `rigid12`, ACME head = `hinged6`. Lumber has no rows — inventory holds struts, extensions and plates, and wood is chosen per shore point. Extension systems and lengths are chosen: Grey 24" ×2 on Rescue 1, Grey 12" ×2 on Squad 1, and Grey 12" ×2 + Grey 36" ×2 + Gold 24" ×2 on Heavy Rescue 1, so not every 96"/120" shore can be extended at once. The CSV can't carry apparatus Type and the importer types any unknown name as Other, so Phase 2 builds the 10-rig roster with types first (BC-1 and EMS-1 carry no stock and have no rows). Expected findings from this fixture: the LongShore 3-Post needs 3 LongShore struts but 2 are on scene; LS 610 stock can't reach the over-16-ft unrated zone; and County Engine 4 is an ordinary rig in the sim department because the outside-department equipment surface is deferred (parity matrix, ADR-022), which U-11 records.

---

## Agent Framework

**Total: 14 agents** (1 conductor + 4 moderators + 9 participants)

### Conductor
Manages 12-hour event clock across 2 OP periods. Handles:
- Staggered arrivals per roster
- Command transfer at E+2:00 (token protocol: announce, wait for Torres acknowledgment, wait for Whitfield acknowledgment)
- OP2 boundary at E+6:00 (announce new OP, OSC rotation, crew rotation)
- Paper events: HazMat update (E+3:00), victim #1 located (E+4:30), victim #1 extricated (E+5:15), victim #2 located (E+8:00), victim #2 recovery (E+9:30)

### Moderators (4 — silent observers)

**Mod-UX** — Field UX Observer
Focus: OP period transition UI, command transfer modal/flow, SP card density at 25 cards, snow/cold condition UX (heavy gloves = even larger touch targets needed), dark-to-light transition (dawn at E+1:30 sim time = 07:15).

**Mod-Data** — Data Integrity Observer
Focus: concurrent writes from 9 participants, role history preservation across command transfer (IP-006), OP period snapshot, LongShore group data integrity, console errors under sustained multi-agent pressure.

**Mod-NIMS** — NIMS Compliance Observer
Focus: Branch/Division/Group structure for Level III org (IC + Safety + OSC, Divisions Alpha/Charlie, Shoring Group, Cutting Group), ICS-201 brief during command transfer, span of control at OSC level, staging area management.

**Mod-Structural** — Structural/Shoring Observer
Focus: LongShore strut selection (unrated-zone warning for lengths > 16 ft), wood deduction handling for Double-T group, correct base plate pairing for ACME vs LongShore struts, load table accuracy for ACME 36"–120" range.

### Participants (9 — drive the app UI only)

**Participant-IC (BC Whitfield)** — Takes command at E+2:00. Manages org chart, monitors all 25 SPs, authorizes OP2 transition.

**Participant-Safety (BC-1)** — Monitors hazards. At E+3:00 HazMat paper event, tests whether app can record/display evolving hazard info.

**Participant-OSC (Capt. Torres → Lt. Vega at OP2)** — Directs tactical operations. Manages division assignments. At OP2 boundary, tests OSC role handoff.

**Participant-Div-Alpha-Sup (Rescue 1 Officer)** — Manages Division Alpha SPs. Coordinates with Shoring participants.

**Participant-Div-Charlie-Sup (Engine 3 Officer)** — Manages Division Charlie exterior ops. Creates SPs for exterior raker shores.

**Participant-Shoring-A (Heavy Rescue 1 FF-1)** — Primary shoring agent for Division Alpha interior. Creates ~15 SPs (verticals + LongShore group). Deploys struts from Heavy Rescue 1 inventory primarily.

**Participant-Shoring-C (Squad 1 FF)** — Secondary shoring agent for Division Charlie exterior. Creates ~10 SPs (rakers). Deploys from Squad 1 + Engine inventories. **Runs concurrent with Shoring-A** to stress simultaneous Firebase writes.

**Participant-Entry (Engine 1 FF)** — Entry team member. Uses Quick Find independently. Tests whether the app handles multiple simultaneous Quick Find sessions (different measurements from different users).

**Participant-Runner (Engine 3 FF)** — Advances SPs through Cutting Station → Runner → Wood Shore Secured. Tests individual advancement on grouped SPs (LongShore group of 3, Double-T group of 2).

---

## Execution Phases

### Phase 0 — Intent
Start fresh or resume from OP2? Default: OP1. Resuming needs the same emulator session still running (emulator data does not survive a restart); otherwise start fresh.

### Phase 1 — Pre-flight
1. Conductor records the baseline, the current `v4-redesign` build: `git rev-parse --short HEAD` (conductor only; the hash goes in the hotwash).
2. Start the local Firebase emulators fresh for each run: `npm run emulators` (Auth :9099 + Realtime Database :9000; needs Java at `/opt/homebrew/opt/openjdk/bin`). Stop any instance left from a prior run first — a still-running emulator keeps that run's accounts, and the same emails then fail at sign-up. Sim runs never touch the live `fieldshore-database` project.
3. Start the app against them: `npm run dev:emu` (Vite on :5200 with `VITE_USE_EMULATORS=true`). The :5199 `fieldshore-v4-dev` preview config talks to the real project and is not for sims.
4. Devices: one Playwright browser context per participant against `http://localhost:5200` (channel `'chrome'`). Phone contexts (`isMobile` + `hasTouch`) get the status slider; mouse contexts get buttons. Reference driver: `.claude/audits/phase-j/262-ttx/driver.mjs` (the #262 TTX, 3 devices).
5. The conductor's device creates the sandbox department: `/auth` → "Create Account" segment → Display name, Email, Password (≥6 characters) → **Create Account**. A new account with no department lands on `/create-department`: name it `sim-millbrook-fd` → **Create department**. Record the invite code from the success panel, then tap **Done**. This account is the department's Admin. Dismiss the first-run tour ("Measure the opening") with **Skip**.
6. A fresh emulator start is empty, so the sandbox department is new every run and nothing needs resetting afterward.
7. **Success:** App loads on :5200 against the emulators, `sim-millbrook-fd` exists, invite code recorded, console clean.

### Phase 2 — Inventory Import (UI only)
1. On the conductor's (Admin) device, build the roster on `/inventory` with **Add apparatus** (Apparatus name + Type). Names must match the fixture byte for byte: Engine 1, Engine 2, Engine 3, County Engine 4 = Engine · Ladder 1 = Ladder · Rescue 1, Heavy Rescue 1 = Rescue · Squad 1 = Squad · BC-1 = Chief · EMS-1 = Other (10 rigs).
2. Settings › Data management › **Import inventory** (or the import/export button in the Inventory header) → pick `.claude/skills/shared/sim-level-iii-inventory.csv` → columns auto-map → row validation (35 rows, none rejected) → review + commit. Import before creating the Meadowville operation so the counts are a clean baseline.
3. On `/inventory`, check every rig scope tab and its per-rig counts against the fixture (see Inventory Baseline). Console clean.
4. **Success:** 10 rigs on the roster, 8 stocked; 38 AcmeThread + 2 LongShore struts, 10 extensions and 68 plates, each rig matching its fixture rows.

### Phase 3 — Spawn Agents
14 agents in a **single message**. Each receives the scenario, its persona, the event clock and the run rules (Anti-patterns section). Each participant's first step is device setup in its own browser context: sign up at `/auth` ("Create Account"); on `/create-department` tap **Join an existing department**, type the Phase 1 invite code into "Enter it by hand" → **Join department**, wait for "Joined sim-millbrook-fd" → **Continue**; dismiss the first-run tour with **Skip** if it appears. Joined accounts get the Default role (read + field work), which can't create or end an operation, so once the OSC (Torres) and IC (Whitfield) participants have joined, the conductor gives both the Admin role: Settings › Administration › **Users & roles** → tap the member → pick Admin in the Member sheet. Everyone else stays Default; record any other action Default blocks in the hotwash.

### Phase 4 — Event Clock
Key stress moments:
- E+0:22: Heavy Rescue 1 arrives with primary strut kit — the largest rig in the Phase 2 import
- E+2:00: **Command transfer** Torres → Whitfield. Torres becomes OSC. Tests IP-006 role history.
- E+3:00: HazMat paper event — LN2 dewar intact but inaccessible. Tests hazard recording.
- E+4:00–5:00: Peak SP creation — Shoring-A and Shoring-C both creating/deploying simultaneously (concurrent write stress)
- E+5:15: Victim #1 extricated
- E+6:00: **OP2 boundary** — OSC rotation (Torres → Vega), crew rotation, new IAP
- E+8:00: Victim #2 located
- E+9:30: Victim #2 recovery (deceased)
- E+10:00–11:00: All SPs Wood Shore Secured
- E+11:00–12:00: Equipment return + operation end

**Success:** All 25 SPs at terminal status. OP transition completed. Role history preserved. Moderator notes >= 10 entries each.

### Phase 5 — Hotwash
AAR from all 9 participants + 4 moderator findings. Synthesize Pearls & Pitfalls + Gap Analysis.

### Phase 5b — Issue Posting
`[SIM-III]` prefix. After posting, sweep the in-app feedback participants posted. On an emulator run it lands in the emulator's root `/feedback` node, not the live project, so `feedback-review` won't see it: before stopping the emulators the conductor reads it with `curl -s -H 'Authorization: Bearer owner' 'http://127.0.0.1:9000/feedback.json?ns=fieldshore-database-default-rtdb'` and files any Critical/High/Medium entry as above.

---

## Moderator Checklists

### Mod-UX Checklist

| # | Item | v4 design ref | Surface |
|---|------|---------------|---------|
| U-1 | SP card density: are 25 cards navigable without performance degradation? | — | SP cards |
| U-2 | Division filter/sort: can OSC see only Division Alpha SPs? Division Charlie? | ADR-008 | Operations |
| U-3 | OP transition: how does the UI signal "new operational period"? Any workflow? | ADR-039 | Operations |
| U-4 | Command transfer UI: does it guide the user through ICS-201 brief steps? | ADR-021 | Org chart |
| U-5 | LongShore in Quick Find: when user enters 96" measurement, does LongShore appear as an option? | ADR-031 | Quick Find |
| U-6 | Unrated zone warning: for LongShore > 16 ft, does the warning appear? Is it dismissible? | ADR-031 | Quick Find |
| U-7 | Gloved use: at 25 SPs, can a user scroll + tap a specific card with heavy winter gloves? | — | Global |
| U-8 | Dawn transition: app usable in both dark and light conditions during the same operation? | ADR-011 | Theme |
| U-9 | Multi-apparatus deploy picker: with 10 apparatus on scene, is the picker overwhelming? | ADR-033 | Deploy |
| U-10 | Crew rotation: when OSC hands off to new person, how is this reflected in the app? | ADR-008 | Org chart |
| U-11 | Mutual aid apparatus: is County Engine 4 distinguishable from Millbrook apparatus? | ADR-022 | Inventory |

### Mod-Data Checklist

| # | Item | v4 design ref | Surface |
|---|------|---------------|---------|
| D-1 | Concurrent writes: do Shoring-A and Shoring-C both write SPs without overwriting each other? | ADR-041 | Firebase |
| D-2 | Role history: after command transfer at E+2:00, is Torres's previous IC assignment preserved? (IP-006) | ADR-008, ADR-021 | Roles |
| D-3 | OP snapshot: is OP1 state captured/accessible after OP2 begins? | ADR-039 | Operations |
| D-4 | LongShore group: `groupId` correct for 3-member group? `groupTotal`=3? | — | Firebase |
| D-5 | Double-T group: `groupId` correct for 2-member group? `groupTotal`=2? | — | Firebase |
| D-6 | Inventory deduction across apparatus: struts from Heavy Rescue 1, Engine 1, Squad 1 all tracked? | ADR-033, ADR-041 | Inventory |
| D-7 | Firebase under sustained load: any 429s or timeouts during peak SP creation (E+4:00–5:00)? | ADR-041 | Network |
| D-8 | Console errors: tally all exceptions during 12-hour sim | — | Console |
| D-9 | OSC rotation: when Torres→Vega, does the role assignment update atomically? | ADR-008 | Roles |

### Mod-NIMS Checklist

| # | Item | v4 design ref | Surface |
|---|------|---------------|---------|
| N-1 | Level III org: IC + Safety + OSC + Division/Group Sups. No PSC/LSC at this level. Correct? | ADR-008 | Org chart |
| N-2 | Division naming: Alpha (west/access), Bravo (north/dock), Charlie (east/collapse). Matches FEMA? | ADR-008 | SP fields |
| N-3 | Shoring Group vs Division: Shoring is functional (Group), not geographic (Division). App models this? | ADR-008 | Org chart |
| N-4 | Command transfer: ICS-201 brief — does the app support/guide this? | ADR-021 | Command |
| N-5 | Staging: mutual aid crew (County Engine 4) stages before assignment. App has staging concept? | ADR-008 | Operations |
| N-6 | Span of control: OSC has 4 direct reports (Div Alpha, Div Charlie, Shoring Group, Cutting). Within 3–7? | ADR-008 | Org chart |
| N-7 | OP periods: does the app formalize OP1 vs OP2 boundaries? Or is it free-form? | ADR-039 | Operations |

### Mod-Structural Checklist

| # | Item | v4 design ref | Surface |
|---|------|---------------|---------|
| S-1 | LongShore 96": load table returns correct capacity for this length? Match Paratech datasheet? | — | Load table |
| S-2 | Unrated zone: if user enters >16 ft (192") for LongShore, warning surfaces? Requires acknowledgment? | ADR-031 | Quick Find |
| S-3 | ACME 36"–120" range: all lengths in the dispatched inventory return valid load table values? | — | Load table |
| S-4 | Wood deduction: Double-T with 6x6 header/footer — deduction math correct? | ADR-012 | Deductions |
| S-5 | Base plate pairing: LongShore struts use correct connector types (not ACME plates)? | ADR-033 | Deploy |
| S-6 | Extension math: ACME 60" + extension — does Quick Find show extended range? | ADR-031 | Quick Find |
| S-7 | Raker shore: for Division Charlie exterior rakers, does the app handle raker-specific deductions? | — | Shore types |

---

## Participant Personas

### IC — BC Whitfield
> You are Battalion Chief Jim Whitfield, Millbrook FD. You arrive at E+2:00 to a well-established operation — Torres has been running it for 2 hours with 8 SPs already in progress. Torres briefs you: "One-story PEMB warehouse, east bay roof pancake. Two confirmed workers inside. We have 10 apparatus, Divisions Alpha and Charlie established, Shoring Group working interior. I'll stay as your OSC." You take the app from Torres and need to orient yourself to 8+ existing shore points, current role assignments, and resource status. Can the app give you a command picture fast?

### Safety — BC-1
> You are Battalion Chief Pat Donovan. You're the Safety Officer for this operation. You arrived at E+0:30 and have been monitoring hazards: west bay roof deflection (100-ft exclusion zone), LN2 dewar (northeast corner, HazMat consulted), cold stress (30-min work cycles). At E+3:00, the conductor will announce a HazMat update on the LN2 dewar. You want to record evolving hazard conditions in the app. You also need to ensure 30-min rehab cycles are tracked.

### OSC — Capt. Torres (OP1) / Lt. Vega (OP2)
> OP1: You are Captain Maria Torres, acting as OSC after handing command to Whitfield at E+2:00. You direct tactical operations: telling Division Sups where to focus, prioritizing shoring locations, coordinating entry with shoring readiness. At E+6:00, you're relieved by Lt. Vega for OP2 — you've been on scene 6 hours and need rehab. How does the app handle the OSC handoff?
> OP2: You are Lieutenant Rosa Vega, Rescue 1. You take over as OSC from Torres. You need to quickly understand current SP status, resource deployments, and crew rotations. Can the app brief you?

### Div-Alpha-Sup — Rescue 1 Officer
> You are Lieutenant Mike Tran, Rescue 1, Division Alpha Supervisor. You manage interior operations on the west (access) side. You coordinate with Shoring-A on SP placement and status. You see ~15 SPs in your division. You need to filter or find your division's SPs quickly.

### Div-Charlie-Sup — Engine 3 Officer
> You are Lieutenant Kenji Hashimoto, Engine 3, Division Charlie Supervisor. You manage exterior operations on the east (collapse) side. Your crew is placing raker shores against the exterior wall. You coordinate with Shoring-C. You have ~10 SPs. You set Division to "Charlie" on each SP.

### Shoring-A — Heavy Rescue 1 FF-1
> You are Firefighter Leo Marchetti, Heavy Rescue 1. You're the lead shoring specialist for interior operations (Division Alpha). You create ~15 SPs: single verticals (various measurements from 28" to 120") and a LongShore group of 3 (96" measurement). You deploy struts primarily from Heavy Rescue 1's inventory — it has the biggest kit. When Heavy Rescue runs out of a specific length, you pull from Engine inventories. You select appropriate connectors for each strut type. For the LongShore group, you verify the app handles LongShore-specific plates.

### Shoring-C — Squad 1 FF
> You are Firefighter Dana Krug, Squad 1. You're handling exterior raker shores for Division Charlie. You create ~10 SPs: rakers at various angles against the east wall. You deploy from Squad 1 and Engine 3 inventories. You're working at the same time as Shoring-A (interior) — both of you are creating and deploying SPs simultaneously. If the app gets confused by concurrent writes, say what you see.

### Entry — Engine 1 FF
> You are Firefighter Priya Okafor, Engine 1. You're on the interior entry team, Division Alpha. You assist Shoring-A by relaying measurements. You open Quick Find to verify strut selections independently — entering measurements like 96" (should show LongShore options) and 48" (ACME options).

### Runner — Engine 3 FF
> You are Firefighter Carlos Medina, Engine 3. You're the runner for Division Charlie. You cut wood, deliver materials, and update SP statuses. You advance SPs from Cutting Station → Runner → Wood Shore Secured individually. For the LongShore group (3 members), you advance each one separately — if the app forces group advancement during the cutting phase, that's a finding. At end of operation, you return equipment.

---

## Event Clock

| E+ Time | Event | Conductor Action | Expected App Activity |
|---------|-------|-----------------|----------------------|
| E+0:00 | Dispatch | Announce: "Box alarm, 3400 Industrial Pkwy, Meadowville. Warehouse roof collapse, possible entrapment. Heavy snow." | — |
| E+0:06 | Engine 1 on scene | Announce arrival. Torres establishes command. | IC: create operation, set incident name |
| E+0:07–0:10 | Ladder 1, Rescue 1, Engine 2 arrive | Announce each. | IC: assign roles |
| E+0:15 | Engine 3 arrives | Announce. | IC: assign to Division Charlie |
| E+0:18 | Squad 1 arrives | Announce. | IC: assign to cutting/shoring |
| E+0:22 | Heavy Rescue 1 arrives | Announce: "Heavy Rescue 1 on scene with full strut kit." | IC: assign to Shoring Group |
| E+0:30 | BC-1 arrives, Safety assigned | Announce. | IC: assign Safety in org chart |
| E+0:45 | Shoring begins | — | Shoring-A: first SP created (interior vertical) |
| E+1:00 | Exterior shoring | — | Shoring-C: first raker SP created (Division Charlie) |
| E+1:30 | County Engine 4 arrives | Announce: "Mutual aid, County Engine 4 on scene." | IC: assign to staging |
| E+2:00 | **COMMAND TRANSFER** | Announce: "BC Whitfield on scene, assuming command from Torres." | **IC transfer. Torres → OSC. Test IP-006 role history.** |
| E+2:30 | 8 SPs active | — | Shoring-A + Shoring-C: 8 SPs deployed, various statuses |
| E+3:00 | HazMat update | Paper event: "HazMat reports LN2 dewar intact. Ambient monitoring shows no elevated N2 levels. Dewar inaccessible under debris — leave in place, monitor from Bravo side." | Safety: record in app |
| E+3:30 | LongShore deployment | — | Shoring-A: creates LongShore group (3 members, 96") |
| E+4:00 | Peak activity begins | — | **Shoring-A + Shoring-C both creating/deploying SPs. 14 agents active. Concurrent write stress.** |
| E+4:30 | Victim #1 located | Paper event: "Entry Team Alpha reports victim located in east bay, row 3, partially pinned under bar joist. Responsive, complaining of leg pain." | IC: notes in app |
| E+5:00 | 20 SPs active | — | 20 SPs across Divisions Alpha and Charlie |
| E+5:15 | Victim #1 extricated | Paper event: "Victim 1 extricated. Transported to Level 1 trauma center." | — |
| E+5:30 | OP2 preparation | Announce: "IC to all units: OP2 begins at E+6:00. Torres rotating off as OSC, Vega assuming. Rehab rotation for Rescue 1 crew." | OSC: prepare for handoff |
| E+6:00 | **OP2 BOUNDARY** | Announce: "OP2 is now in effect. Lt. Vega is OSC. Torres released to rehab. County Engine 4 crew rotating to Entry Alpha." | **OSC handoff. Crew rotation. New OP in app?** |
| E+7:00 | SP creation continues | — | Shoring-A + Shoring-C: 25 SPs total by now |
| E+8:00 | Victim #2 located | Paper event: "Entry Team Alpha reports second victim located, row 7, under collapsed roof section. No signs of life." | IC: notes in app |
| E+9:00 | All SPs at Cutting Station or later | — | Runner: advancing all SPs through individual cutting workflow |
| E+9:30 | Victim #2 recovery | Paper event: "Victim 2 confirmed deceased. Recovery operation complete." | — |
| E+10:00 | All SPs Wood Shore Secured | — | All 25 SPs at "Wood Shore Secured" status |
| E+10:30 | Demob planning | Announce: "Structural engineer on scene. Building condemned. Begin equipment return." | — |
| E+11:00 | Equipment return | — | Runner: returns all equipment across all apparatus |
| E+11:30 | Inventory verification | — | IC: verify inventory counts restored |
| E+12:00 | Operation ends | Announce: "Command terminated." | IC: end operation |

---

## Hotwash Format

### Pearls & Pitfalls Table

| # | Type | Surface | Finding | Severity | v4 design ref | Issue |
|---|------|---------|---------|----------|---------------|-------|
| _fill during Phase 5_ | | | | | | |

### Gap Analysis

| Finding | Covered by v4.0? | v4 design ref | Action |
|---------|-------------------|---------------|--------|
| _fill during Phase 5_ | | | |

---

## Anti-patterns

**Run rules.** Every agent gets these in Phase 3.

- Participants act only through the app's UI — if the UI can't do something, that's a finding. Nobody writes to Firebase (emulators included), IndexedDB, localStorage or sessionStorage, and nobody calls app functions from the page.
- The one allowed page command is `location.assign('/<tab>')` to switch tabs (`/quickfind`, `/operations`, `/inventory`, `/command`, `/settings`), because the bottom tab bar is a router link that synthetic clicks can't drive. Send it on its own, one per switch.
- Act with click and fill; observe with the accessibility tree, screenshots and console errors. Synthetic clicks don't update the screen right away, so read the result in a separate call.
- Only the conductor runs git, and only `git rev-parse --short HEAD` for the hotwash.
- Run the command transfer at E+2:00. Role history preservation (IP-006) is a primary stress target.
- Run the OP2 boundary at E+6:00. OP transitions are a primary test at this scale.
- Shoring-A and Shoring-C work at the same time, not in turns, so concurrent writes get tested.
- Hold the clock at each victim paper event until the IC and Safety responses have been observed.
- Moderators observe silently and never interrupt participants.
- Stop at 25 SPs. Level III is controlled scale.

---

## Notes

- **Sandbox department:** `sim-millbrook-fd`, created fresh on the local emulators each run (Phase 1)
- **Run environment:** `npm run emulators` + `npm run dev:emu` (:5200); one Playwright browser context per device (reference: `.claude/audits/phase-j/262-ttx/driver.mjs`)
- **Inventory source:** `.claude/skills/shared/sim-level-iii-inventory.csv`
- **App version baseline:** current v4-redesign build (record the commit hash in the hotwash)
- **v4 design reference:** `docs/v4-design/00-INDEX.md`; ADRs in `docs/v4-design/11-decisions/` (ADR-008 NIMS org, ADR-010 status commit, ADR-017 roles, ADR-021 command transfer, ADR-039 operational periods, ADR-041 event order + derived inventory)
- **Runtime output:** `.claude/simulations/level-iii-sim/runtime/`
- **Key stress targets:** Command transfer + role history, OP period transition, concurrent writes, LongShore struts + unrated zone, 25-SP card density
- **Related simulations:** `/sim-level-iv` (smaller), `/sim-level-ii` (larger)
