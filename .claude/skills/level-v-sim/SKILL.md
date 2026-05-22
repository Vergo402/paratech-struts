---
name: level-v-sim
description: "Run the FEMA Level V structural collapse simulation — car into residential building. Stress-tests FieldShore at minimal operational scale: 1 engine, 3 shore points, single OP period. Use this skill whenever Alex says 'run level v simulation', 'level 5 sim', 'verplanck sim', or '/level-v-sim'."
---

# Level V Simulation — Verplanck Residential (Car Into Building)

Stress-tests FieldShore at the smallest operational scale: one engine company, one IC, 3 shore points, single operational period. This is the baseline — if the app can't handle a single-company response cleanly, nothing else matters. Targets: basic SP creation/lifecycle, Quick Find → deploy flow, empty state handling, offline resilience, and inventory deduction at minimal scale.

> **TRAINING DISCLAIMER:** This is a fictional scenario for software testing purposes only. All persons, addresses, units, and events are fabricated. No real incident is depicted or referenced.

---

## Scenario

**Building:** 2-story wood-frame residential (Type V construction), 14 Maple St, Verplanck NY
**Collapse mechanism:** Vehicle struck front corner support post at approximately 14:30 hours; partial front-wall lean (approximately 8 degrees off plumb) with second-floor joist sag above impact zone
**Construction details:** Platform frame, vinyl siding over OSB sheathing, 2×10 floor joists at 16" OC, balloon-framed front corner (no fire stops)
**Geography:** Single Division Alpha (front/address side). Sides Bravo/Charlie/Delta intact and stable. No branches.
**Victim:** 1 confirmed — 2nd floor bedroom directly above collapse zone, responsive, ambulatory with assistance
**Weather:** Clear, 68 deg F, daylight (14:30 hours), wind calm
**Hazards:**
- Compromised utility service entrance (gas meter tilted, flex connector stressed — gas company notified)
- Unstable interior staircase (stringer cracked at 3rd tread)
- Vehicle fuel leak (gasoline, small pool under engine block)
**Exposures:** Single-family attached garage (Delta side), no immediate exposure threat

---

## Locked Decisions

| # | Decision | Value |
|---|----------|-------|
| 1 | Operational periods | 1 |
| 2 | Duration | E+0:00 → E+2:00 (2 hours) |
| 3 | Shore point target | 3 (two vertical shores, one raker) |
| 4 | Roster granularity | Individual role assignment |
| 5 | Inventory scale | Engine 1 only: 2 ACME 60" struts, 4 universal plates, 2 wedge plates |
| 6 | Sandbox department | `sim-millbrook-fd` |
| 7 | Hotwash format | Pearls & Pitfalls table + Gap Analysis |
| 8 | App interaction | UI only — no direct Firebase writes, no JS eval, no localStorage manipulation |
| 9 | Conductor mode | Emergent — stages arrivals on schedule but doesn't force participant actions |
| 10 | Ethics | Training-only fictional scenario; no real persons or addresses |

---

## Personnel Roster

| Arrival | Unit | Agency | Type | Headcount | ICS Role | Notes |
|---------|------|--------|------|-----------|----------|-------|
| E+0:04 | Engine 1 | Millbrook FD | Engine | 4 | **IC — Capt. Torres (interim)** | First-due, single company |

**ICS organization at this scale:** IC handles all functions (Command, Ops, Planning, Logistics). No formal Safety Officer — IC retains safety responsibility. No staging, no branches, no sections.

**Role assignments within the crew:**
- Captain Torres → IC
- FF-1 → Entry / Shoring
- FF-2 → Entry assistant
- FF-3 → Runner / Outside operations

---

## Inventory Baseline

Engine 1 carries a minimal shoring kit. This is intentional — tests whether the app handles small inventories gracefully and whether Quick Find produces useful results when options are limited.

| Apparatus | Model | Qty | Available | Length | Type |
|-----------|-------|-----|-----------|--------|------|
| Engine 1 | ACME Strut | 2 | 2 | 60" | strut |
| Engine 1 | Universal Base Plate | 4 | 4 | — | plate |
| Engine 1 | Wedge Plate | 2 | 2 | — | plate |

**Import method:** IC participant navigates to **Settings → Department Code** (`sim-millbrook-fd`), then **Inventory tab → Import** using `.claude/skills/shared/millbrook-inventory.xlsx`. The full Millbrook fleet imports, but only Engine 1 is dispatched.

---

## Agent Framework

**Total: 7 agents** (1 conductor + 2 moderators + 4 participants)

### Conductor
Manages the E+ event clock. Announces arrivals, triggers paper events, signals end-of-operation. Uses token protocol: announces an event, waits for IC acknowledgment, then advances clock.

### Moderators (2 — silent observers)

**Mod-UX** — Field UX Observer
- Touch target sizing on SP creation modal
- Quick Find flow: measurement entry → result display → strut selection → deploy
- Empty state handling (what does the Operations tab show before any operation exists?)
- Error states (what happens if you try to deploy a strut that doesn't exist in inventory?)
- Modal stacking (Add SP inside an operation — does the save button appear? IP-007 regression test)
- One-handed usability (can IC run the app while holding a radio?)

**Mod-Data** — Data Integrity Observer
- SP creation: does `groupId` generate correctly for single SPs?
- Inventory deduction: when a strut deploys, does `available` decrement in real time?
- localStorage persistence: if the preview reloads mid-operation, does state survive?
- Firebase sync: are writes queued if briefly offline?
- Return equipment: does `available` re-increment after return? Does it clamp to `quantity`?
- Console errors: any unhandled exceptions during the full SP lifecycle?

### Participants (4 — drive the app UI only)

**Participant-IC (Capt. Torres)**
- Creates the operation (Operations tab → Start Operation)
- Sets incident name, building info, multi-building = no
- Assigns roles in org chart
- Monitors overall progress
- Ends the operation when all SPs are secured/returned
- Posts Firebase feedback (in-app feedback form) for any dead-ends encountered

**Participant-Shoring (FF-1)**
- Primary stress agent for the central feature loop
- Opens Quick Find → enters measurement (e.g., 58") → selects header/footer deductions → reviews results
- Creates shore points from Quick Find results
- Deploys struts from inventory (selects apparatus, strut model, connectors)
- Advances SP status: pending → in process → strut placed → cutting
- Reports any missing UI affordances or confusing labels

**Participant-Entry (FF-2)**
- Assists Shoring participant
- Uses Quick Find independently to look up a different measurement
- Attempts to create a shore point from the Entry role perspective
- Tests whether the app differentiates between IC-level and crew-level actions

**Participant-Runner (FF-3)**
- Receives cutting assignment from Shoring
- Advances SP status: cutting → runner → secured
- Returns equipment at end of operation (secured → returned)
- Tests the return-equipment inventory transaction flow
- Posts Firebase feedback for any friction in the runner workflow

---

## Execution Phases

### Phase 0 — Intent
Ask Alex: start from the beginning, or resume from a specific phase? Default: Phase 1.

### Phase 1 — Pre-flight
1. Read CLAUDE.md → confirm current app version (expect v3.17.2+)
2. Start preview server: `npx serve -l 8095 .`
3. Verify app loads via `preview_snapshot` — check version label in header
4. Verify Firebase connection — Settings tab should show connection status
5. **Success:** App loads, correct version displayed, no console errors

### Phase 2 — Inventory Import (UI only)
1. Navigate to **Settings tab**
2. Enter department code: `sim-millbrook-fd`
3. Navigate to **Inventory tab → Import**
4. Import `.claude/skills/shared/millbrook-inventory.xlsx`
5. Verify via `preview_snapshot`: Engine 1 appears with 2 ACME 60" struts, 4 universal plates, 2 wedge plates
6. Check `preview_console_logs` for any import errors
7. **Success:** Inventory tab shows correct Engine 1 inventory; no console errors

### Phase 3 — Spawn Agents
Spawn all 7 agents in a **single message with 7 parallel Agent tool calls**:

Each agent receives:
- Scenario overview (building, collapse, victim, hazards)
- Their specific persona brief (from Participant Personas section)
- Event clock (from Event Clock section)
- App URL: `http://localhost:8095`
- **UI-only constraint**: participants use ONLY `preview_click`, `preview_fill`, `preview_snapshot`, `preview_console_logs`. No direct Firebase, no JS eval, no localStorage. If the app can't do something through its UI, that's a finding.

**Success:** All 7 agents acknowledge; conductor announces "E+0:00 — dispatch received, Engine 1 responding."

### Phase 4 — Event Clock
Conductor drives the timeline per the Event Clock section below. Participants interact with the app in-character. Moderators observe silently and log to JSONL.

**Success:** All 3 SPs reach terminal status (secured or returned). Operation ended via UI. Moderator notes ≥ 5 entries each.

### Phase 5 — Hotwash
1. Each participant submits AAR (4 questions):
   - Q1: What did you intend to accomplish with the app?
   - Q2: What actually happened when you used it?
   - Q3: Why was there a difference (if any)?
   - Q4: What should the app do differently?
2. Each moderator submits findings summary (top 3 observations, each with severity + v4.0 phase tag)
3. Synthesize into Pearls & Pitfalls table
4. Write gap analysis mapping each Pitfall to MASTER-PLAN.md Phase 3

**Success:** Pearls & Pitfalls table complete; gap analysis written.

### Phase 5b — Issue Posting
For every Critical/High/Medium Pitfall:
```bash
gh issue create \
  --repo Vergo402/paratech-struts \
  --title "[SIM-V] {Short finding title}" \
  --label "simulation,{severity}" \
  --body "$(cat <<'EOF'
## Source
Simulation: Level V — Verplanck Residential
Event time: E+{HH:MM}
Participant: {role}
Surface: {app surface}

## Finding
{Description}

## Reproduction
{Steps taken in the UI}

## Severity
{Critical / High / Medium}

## v4.0 Coverage
MASTER-PLAN Phase: {phase or —}
Status: {Covered / Gap / New idea}

Generated by FieldShore simulation skill level-v-sim
EOF
)"
```

After posting, run `/feedbackreview` to sweep any in-app feedback entries posted by participants.

**Success:** All Critical/High/Medium pitfalls have GitHub issue numbers.

---

## Moderator Checklists

### Mod-UX Checklist

| # | Item | v4.0 Phase | Surface |
|---|------|------------|---------|
| U-1 | Quick Find: can IC enter 58" and get a usable result with only 2 ACME 60" struts available? | 3E | Quick Find |
| U-2 | Add SP modal: is the Save button visible without scrolling? (IP-007 regression) | 3C | SP modal |
| U-3 | Empty state: what does Operations tab show before any operation is created? | 3C | Operations |
| U-4 | SP card: is the status badge readable at a glance on mobile? | 3C | SP cards |
| U-5 | Deploy flow: can a strut be deployed from inventory to SP in < 5 taps? | 3C | Deploy |
| U-6 | Return equipment: is the flow obvious when all SPs are secured? | 3C | Return |
| U-7 | Org chart: can IC assign roles with 4 personnel and only 1 apparatus? | 3B | Org chart |
| U-8 | Offline: if preview goes offline mid-operation, does the UI indicate it? | 3F | Offline |

### Mod-Data Checklist

| # | Item | v4.0 Phase | Surface |
|---|------|------------|---------|
| D-1 | SP creation: `groupId` and `groupIndex` correct for single (non-grouped) SPs? | 3C | Firebase |
| D-2 | Inventory deduction: `available` decrements on deploy, increments on return? | 3B | Inventory |
| D-3 | localStorage: operation state persists across preview reload? | 3F | Persistence |
| D-4 | Firebase sync: write completes within 2 seconds of UI action? | 3F | Sync |
| D-5 | Console errors: any unhandled exceptions during full SP lifecycle? | — | Console |
| D-6 | End operation: does `activeOperation` clear from localStorage and Firebase? | 3C | Cleanup |
| D-7 | Inventory validate rule: do all writes pass Firebase security rules? | 3A | Security |

---

## Participant Personas

### IC — Capt. Torres
> You are Captain Maria Torres, Millbrook FD Engine 1. You're the only officer on scene — you ARE the incident. No chief is coming. You handle command, safety, and ops yourself. You're experienced but this is your first time using FieldShore at an actual incident. You interact with the app ONLY through its UI — tapping, scrolling, filling forms. If something doesn't work, say what you see and what you expected. Never bypass the UI.

### Shoring — FF-1
> You are Firefighter Jake Connors, Engine 1. You're the most experienced with Paratech struts on the crew. The Captain told you to handle shoring. You need to figure out what struts fit, create shore points, deploy equipment, and track the work. You use Quick Find to look up measurements and create shore points. You interact with the app ONLY through its UI. If a button is missing, a label is confusing, or a flow dead-ends, say exactly what you see.

### Entry — FF-2
> You are Firefighter Priya Okafor, Engine 1. You're assisting with entry and shoring. You're relatively new to FieldShore — you opened it once in training but never used it on a real call. You'll try to use Quick Find to look up a measurement independently. If the app confuses you, that's a finding — say what you expected vs what you see.

### Runner — FF-3
> You are Firefighter Danny Marsh, Engine 1. You're the runner — cutting wood, delivering materials, marking status updates. You're working from your phone with work gloves on. You need to advance shore point statuses through cutting → runner → secured, then return equipment at the end. You interact with the app ONLY through its UI. Report any touch target that's too small for gloved fingers.

---

## Event Clock

| E+ Time | Event | Conductor Action | Expected App Activity |
|---------|-------|-----------------|----------------------|
| E+0:00 | Dispatch | Announce: "Engine 1 dispatched to 14 Maple St, Verplanck. Vehicle into building, possible entrapment." | — |
| E+0:04 | Engine 1 on scene | Announce arrival. IC establishes command. | IC: create operation, set incident name |
| E+0:06 | Sizeup complete | Announce: "2-story wood frame, car into front corner. Front wall leaning. One victim 2nd floor, responsive." | IC: assign roles in org chart |
| E+0:10 | Gas company en route | Paper event: "Dispatch advises gas company ETA 20 minutes." | IC: add hazard note if UI allows |
| E+0:15 | Shoring begins | — | Shoring: Quick Find → 58" measurement → create SP #1 (vertical) |
| E+0:20 | SP #1 deployed | — | Shoring: deploy strut from Engine 1 inventory → SP #1 |
| E+0:25 | SP #2 started | — | Shoring: Quick Find → 62" → create SP #2 (vertical) |
| E+0:30 | SP #2 deployed | — | Shoring: deploy 2nd strut → SP #2. **Note: Engine 1 is now at 0 available struts.** |
| E+0:32 | SP #3 needed | — | Shoring: Quick Find → 44" raker. **Stress test: no struts left in inventory. What does the app show?** |
| E+0:35 | Raker improvised | Paper event: "Crew advises using cribbing and lumber for raker shore. No strut needed." | IC: create SP #3 as manual entry (no strut deployed) |
| E+0:40 | Cutting begins | — | Shoring: advance SP #1 and #2 to "cutting" status |
| E+0:45 | Victim contact | Paper event: "Entry crew has victim contact. Victim ambulatory with assistance. Beginning removal." | Runner: advance SP #1 to "runner" |
| E+0:50 | Victim removed | Announce: "Victim removed and transferred to EMS. All clear." | Runner: advance SP #2 to "runner" |
| E+1:00 | Gas secured | Paper event: "Gas company on scene. Service shut off at meter." | — |
| E+1:15 | SPs secured | — | Runner: advance SP #1 and #2 to "secured" |
| E+1:30 | Demob begins | Announce: "Building and Codes en route. Begin equipment return." | Runner: return equipment on SP #1 and #2 |
| E+1:45 | Equipment returned | — | IC: verify inventory shows 2/2 available again |
| E+2:00 | Operation ends | Announce: "Command terminated. Engine 1 available." | IC: end operation via UI |

---

## Hotwash Format

### Pearls & Pitfalls Table

| # | Type | Surface | Finding | Severity | MASTER-PLAN Phase | Issue |
|---|------|---------|---------|----------|-------------------|-------|
| _P-01_ | _Pearl/Pitfall_ | _area_ | _description_ | _Crit/High/Med/Low_ | _3X.Y or —_ | _#NNN_ |

### Gap Analysis

| Finding | Covered by v4.0? | MASTER-PLAN Phase | Action |
|---------|-------------------|-------------------|--------|
| _description_ | _Covered / Gap / New idea_ | _3X.Y or —_ | _action_ |

---

## Anti-patterns

- **DO NOT** write directly to Firebase, localStorage, or sessionStorage. If the UI can't do it, log it as a finding.
- **DO NOT** use `preview_eval` to execute app functions. Participants use `preview_click` and `preview_fill` only.
- **DO NOT** skip Phase 2 (inventory import). The app's behavior with empty inventory is a separate test within Phase 4.
- **DO NOT** create more than 3 shore points. This is a Level V — the scenario is deliberately small.
- **DO NOT** advance the event clock faster than participants can interact. Wait for acknowledgment before moving on.
- **DO NOT** let moderators interrupt participants. Moderators observe and log silently.

---

## Notes

- **Sandbox department:** `sim-millbrook-fd` — shared across all 5 simulation types. Reset by ending/archiving the operation between runs.
- **Inventory source:** `.claude/skills/shared/millbrook-inventory.xlsx` — full Millbrook fleet. Only Engine 1 is dispatched in this scenario.
- **App version baseline:** v3.17.2. Update the version check in Phase 1 when running against v4.0+.
- **MASTER-PLAN reference:** Phase tags reference `.claude/plans/MASTER-PLAN.md` Release 3 phases (3A–3F).
- **Runtime output:** Write hotwash artifacts to `.claude/simulations/level-v-sim/runtime/`.
- **Prior simulation:** This is the smallest of 5 escalating simulations. See also: `/level-iv-sim`, `/level-iii-sim`, `/level-ii-sim`, `/level-i-sim`.
