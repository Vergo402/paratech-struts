---
name: sim-level-v
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
| 8 | App interaction | UI only — see the Run rules under Anti-patterns |
| 9 | Conductor mode | Emergent — stages arrivals on schedule but doesn't force participant actions |
| 10 | Ethics | Training-only fictional scenario; no real persons or addresses |

**Shore-point status labels (7-status lifecycle).** Drive and observe by the v4 field labels:

| lifecycle id | v4 label |
|---|---|
| pending | **Pending Equipment** |
| process | **Equipment Assigned** |
| strutset | **Strut Set** |
| cutting | **Cutting Station** |
| runner | **Runner** |
| secured | **Wood Shore Secured** |
| returned | **Strut Equipment Returned** |

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

**Import method:** on the IC's device (the department Admin — only Admin can import), **Settings › Data management › Import inventory** with `.claude/skills/shared/millbrook-inventory.csv` (Phase 2). The full Millbrook fleet imports, but only Engine 1 is dispatched.

**Fixture:** `.claude/skills/shared/millbrook-inventory.csv` — 12 rows across 3 rigs: Engine 1, Engine 2, Rescue 1. Provenance: the existing Millbrook fleet CSV. Assumptions: none. The CSV uses v4 catalog names, so the app shows Engine 1's kit as 2 × AT 56-88 struts, 4 × 6" Swivel Base and 2 × 3/8" Chain Wedge rather than the table's names.

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
- Local persistence (IndexedDB): if a device reloads mid-operation, does state survive?
- Firebase sync: are writes queued if briefly offline?
- Return equipment: does `available` re-increment after return? Does it clamp to `quantity`?
- Console errors: any unhandled exceptions during the full SP lifecycle?

### Participants (4 — drive the app UI only)

**Participant-IC (Capt. Torres)**
- Creates the operation (Operations tab → Start Operation)
- Sets incident name, building info, multi-building = no
- Assigns roles in org chart
- Monitors overall progress
- Ends the operation when all SPs are Wood Shore Secured / Strut Equipment Returned
- Posts Firebase feedback (in-app feedback form) for any dead-ends encountered

**Participant-Shoring (FF-1)**
- Primary stress agent for the central feature loop
- Opens Quick Find → enters measurement (e.g., 58") → selects header/footer deductions → reviews results
- Creates shore points from Quick Find results
- Deploys struts from inventory (selects apparatus, strut model, connectors)
- Advances SP status: Pending Equipment → Equipment Assigned → Strut Set → Cutting Station
- Reports any missing UI affordances or confusing labels

**Participant-Entry (FF-2)**
- Assists Shoring participant
- Uses Quick Find independently to look up a different measurement
- Attempts to create a shore point from the Entry role perspective
- Tests whether the app differentiates between IC-level and crew-level actions

**Participant-Runner (FF-3)**
- Receives cutting assignment from Shoring
- Advances SP status: Cutting Station → Runner → Wood Shore Secured
- Returns equipment at end of operation (Wood Shore Secured → Strut Equipment Returned)
- Tests the return-equipment inventory transaction flow
- Posts Firebase feedback for any friction in the runner workflow

---

## Execution Phases

### Phase 0 — Intent
Ask Alex: start from the beginning, or resume from a specific phase? Default: Phase 1.

### Phase 1 — Pre-flight
1. Record `git rev-parse --short HEAD` (conductor). The baseline is the current v4-redesign build; the hash goes in the hotwash.
2. Start the local Firebase emulators: `npm run emulators` (Auth :9099 + Realtime Database :9000; needs Java at `/opt/homebrew/opt/openjdk/bin`). Sim runs never touch the live `fieldshore-database` project.
3. Start the emulator build: `npm run dev:emu` (Vite on **:5200** with `VITE_USE_EMULATORS=true`). The :5199 `fieldshore-v4-dev` preview config talks to the real project and is for single-device UI work only — not for sims.
4. Open one device per participant: four separate Playwright browser contexts against `http://localhost:5200` (channel `'chrome'`). Phone contexts (`isMobile` + `hasTouch`) get the status slider; mouse contexts get the status buttons. Use phone contexts for the IC and the Runner (radio in hand / gloves on). Reference driver: `.claude/audits/phase-j/262-ttx/driver.mjs` (the #262 TTX, 3 devices).
5. **IC device — the conductor sets it up, then hands it to Participant-IC.** `/auth` → "Create Account" segment → Display name `Capt. Maria Torres`, a throwaway email, a password of 6+ characters → **Create Account**. With no department the account lands on `/create-department`: enter `sim-millbrook-fd` as the department name → **Create department**. Record the invite code from the success panel, then **Done**. The creator is the department **Admin** — the only built-in role that can start and end an operation, import inventory and assign the org chart. Accounts that join by code get the **Default** role (read + field work), which is why the IC's account must be the one that creates the department.
6. **Crew devices (FF-1 Connors, FF-2 Okafor, FF-3 Marsh):** Create Account the same way with the persona's display name, then `/join-department` → enter the invite code → **Join department** → **Continue**.
7. A first-run tour ("Measure the opening", Skip/Next) appears after setup — dismiss it with **Skip** on every device where it shows.
8. The sandbox department is created fresh on the emulator every run. Emulator data is ephemeral, so nothing carries over from a previous run and there is nothing to reset.
9. **Success:** four devices signed in to `sim-millbrook-fd` (IC = Admin, crew = Default), no console errors on any device.

### Phase 2 — Inventory Import (UI only)
1. On the IC device (Admin): `location.assign('/settings')` → **Data management** → **Import inventory**. Import before Phase 4 creates the operation so the counts are a clean baseline.
2. Run the 4-step flow with `.claude/skills/shared/millbrook-inventory.csv`: pick the file → columns auto-map → row validation (12 rows, none rejected) → review + commit.
3. `location.assign('/inventory')` and read the accessibility tree. The rig scope tabs are exactly **Engine 1**, **Engine 2** and **Rescue 1**, and each rig's counts match the fixture:
   - Engine 1: 2 × AT 56-88 strut, 4 × 6" Swivel Base, 2 × 3/8" Chain Wedge
   - Engine 2: 2 × AT 56-88 strut, 4 × 6" Swivel Base, 2 × 3/8" Chain Wedge
   - Rescue 1: 4 × AT 37-58 strut, 2 × AT 56-88 strut, 2 × 24" extension, 8 × 6" Swivel Base, 4 × 6" Rigid Base, 4 × 3/8" Chain Wedge
4. On one crew device, open `/inventory` and confirm the same three rigs and counts arrived through cloud sync.
5. Check console errors on every device.
6. **Success:** the three rigs show the fixture counts on the IC and crew devices; no console errors.

### Phase 3 — Spawn Agents
Spawn all 7 agents in a **single message with 7 parallel Agent tool calls**:

Each agent receives:
- Scenario overview (building, collapse, victim, hazards)
- Their specific persona brief (from Participant Personas section)
- Event clock (from Event Clock section)
- App URL: `http://localhost:5200` (the emulator build from Phase 1)
- Their device: each participant gets the browser context signed in as their persona (Phase 1); moderators get read access to the participants' devices
- The Run rules (under Anti-patterns)

**Success:** All 7 agents acknowledge; conductor announces "E+0:00 — dispatch received, Engine 1 responding."

### Phase 4 — Event Clock
Conductor drives the timeline per the Event Clock section below. Participants interact with the app in-character. Moderators observe silently and log to JSONL.

**Success:** All 3 SPs reach terminal status (Wood Shore Secured or Strut Equipment Returned). Operation ended via UI. Moderator notes ≥ 5 entries each.

### Phase 5 — Hotwash
1. Each participant submits AAR (4 questions):
   - Q1: What did you intend to accomplish with the app?
   - Q2: What actually happened when you used it?
   - Q3: Why was there a difference (if any)?
   - Q4: What should the app do differently?
2. Each moderator submits findings summary (top 3 observations, each with severity + v4 design ref)
3. Synthesize into Pearls & Pitfalls table
4. Write gap analysis mapping each Pitfall to its v4 design ref (a `docs/v4-design/` file or ADR, or —), and record the Phase 1 commit hash as the build baseline

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
v4 design ref: {docs/v4-design file or ADR, or —}
Status: {Covered / Gap / New idea}

Generated by FieldShore simulation skill sim-level-v
EOF
)"
```

After posting, sweep the in-app feedback participants posted. On an emulator run it lands in the emulator's root `/feedback` node, not the live project, so `feedback-review` won't see it: before stopping the emulators the conductor reads it with `curl -s -H 'Authorization: Bearer owner' 'http://127.0.0.1:9000/feedback.json?ns=fieldshore-database-default-rtdb'` and files any Critical/High/Medium entry as above.

**Success:** All Critical/High/Medium pitfalls have GitHub issue numbers.

---

## Moderator Checklists

### Mod-UX Checklist

| # | Item | v4 design ref | Surface |
|---|------|------------|---------|
| U-1 | Quick Find: can IC enter 58" and get a usable result with only 2 ACME 60" struts available? | ADR-031 | Quick Find |
| U-2 | Add SP modal: is the Save button visible without scrolling? (IP-007 regression) | 09-workflows/11-adding-a-shore-point.md | SP modal |
| U-3 | Empty state: what does Operations tab show before any operation is created? | 09-workflows/10-starting-an-operation.md | Operations |
| U-4 | SP card: is the status badge readable at a glance on mobile? | ADR-010 / ADR-011 | SP cards |
| U-5 | Deploy flow: can a strut be deployed from inventory to SP in < 5 taps? | 09-workflows/12-deploying-a-strut.md / ADR-033 | Deploy |
| U-6 | Return equipment: is the flow obvious when all SPs are Wood Shore Secured? | 09-workflows/15-secured-returned.md | Return |
| U-7 | Org chart: can IC assign roles with 4 personnel and only 1 apparatus? | ADR-008 | Org chart |
| U-8 | Offline: if a device goes offline mid-operation, does the UI indicate it? | ADR-041 | Offline |

### Mod-Data Checklist

| # | Item | v4 design ref | Surface |
|---|------|------------|---------|
| D-1 | SP creation: `groupId` and `groupIndex` correct for single (non-grouped) SPs? | 09-workflows/11-adding-a-shore-point.md | Firebase |
| D-2 | Inventory deduction: `available` decrements on deploy, increments on return? | ADR-041 | Inventory |
| D-3 | Local store (IndexedDB): operation state persists across a device reload? | ADR-041 | Persistence |
| D-4 | Firebase sync: write completes within 2 seconds of UI action? | ADR-041 | Sync |
| D-5 | Console errors: any unhandled exceptions during full SP lifecycle? | — | Console |
| D-6 | End operation: does the operation status move to `ended` in the local store (IndexedDB) and in Realtime Database? | 09-workflows/16-end-of-operation.md | Cleanup |
| D-7 | Inventory validate rule: do all writes pass Firebase security rules? | ADR-009 | Security |

---

## Participant Personas

### IC — Capt. Torres
> You are Captain Maria Torres, Millbrook FD Engine 1. You're the only officer on scene — you ARE the incident. No chief is coming. You handle command, safety, and ops yourself. You're experienced but this is your first time using FieldShore at an actual incident. You interact with the app ONLY through its UI — tapping, scrolling, filling forms. If something doesn't work, say what you see and what you expected. Never bypass the UI.

### Shoring — FF-1
> You are Firefighter Jake Connors, Engine 1. You're the most experienced with Paratech struts on the crew. The Captain told you to handle shoring. You need to figure out what struts fit, create shore points, deploy equipment, and track the work. You use Quick Find to look up measurements and create shore points. You interact with the app ONLY through its UI. If a button is missing, a label is confusing, or a flow dead-ends, say exactly what you see.

### Entry — FF-2
> You are Firefighter Priya Okafor, Engine 1. You're assisting with entry and shoring. You're relatively new to FieldShore — you opened it once in training but never used it on a real call. You'll try to use Quick Find to look up a measurement independently. If the app confuses you, that's a finding — say what you expected vs what you see.

### Runner — FF-3
> You are Firefighter Danny Marsh, Engine 1. You're the runner — cutting wood, delivering materials, marking status updates. You're working from your phone with work gloves on. You need to advance shore point statuses through Cutting Station → Runner → Wood Shore Secured, then return equipment at the end. You interact with the app ONLY through its UI. Report any touch target that's too small for gloved fingers.

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
| E+0:40 | Cutting begins | — | Shoring: advance SP #1 and #2 to "Cutting Station" status |
| E+0:45 | Victim contact | Paper event: "Entry crew has victim contact. Victim ambulatory with assistance. Beginning removal." | Runner: advance SP #1 to "Runner" |
| E+0:50 | Victim removed | Announce: "Victim removed and transferred to EMS. All clear." | Runner: advance SP #2 to "Runner" |
| E+1:00 | Gas secured | Paper event: "Gas company on scene. Service shut off at meter." | — |
| E+1:15 | SPs secured | — | Runner: advance SP #1 and #2 to "Wood Shore Secured" |
| E+1:30 | Demob begins | Announce: "Building and Codes en route. Begin equipment return." | Runner: return equipment on SP #1 and #2 |
| E+1:45 | Equipment returned | — | IC: verify inventory shows 2/2 available again |
| E+2:00 | Operation ends | Announce: "Command terminated. Engine 1 available." | IC: end operation via UI |

---

## Hotwash Format

### Pearls & Pitfalls Table

| # | Type | Surface | Finding | Severity | v4 design ref | Issue |
|---|------|---------|---------|----------|-------------------|-------|
| _P-01_ | _Pearl/Pitfall_ | _area_ | _description_ | _Crit/High/Med/Low_ | _ADR-0NN / docs/v4-design file, or —_ | _#NNN_ |

### Gap Analysis

| Finding | Covered by v4.0? | v4 design ref | Action |
|---------|-------------------|-------------------|--------|
| _description_ | _Covered / Gap / New idea_ | _ADR-0NN / docs/v4-design file, or —_ | _action_ |

---

## Anti-patterns

**Run rules.** These apply to every agent in the run.

- Participants act only through the app's UI — if the UI can't do something, that's a finding. Log it; don't work around it.
- The one allowed page-level command is `location.assign('/<tab>')` to switch tabs (`/quickfind`, `/operations`, `/inventory`, `/command`, `/settings`), because the bottom tab bar is a router link that synthetic clicks can't drive. There is no other page evaluation: no calling app functions, no storage writes, no database writes.
- Participants use click, fill, the accessibility tree, screenshots and console errors. Moderators only read: accessibility tree, screenshots and console errors.
- Synthetic clicks don't flush React synchronously, so read the resulting state in a separate call.
- The run uses the local emulators and the :5200 build only, never the live project.
- Phase 2 (inventory import) always runs before Phase 4. The app's behavior with an empty inventory is a separate test within Phase 4.
- Create no more than 3 shore points. Level V is deliberately small.
- The conductor advances the event clock only after participants acknowledge, never faster than they can interact.
- Moderators observe and log silently and never interrupt participants.
- Only the conductor runs git (the Phase 1 commit hash); participants and moderators never do.

---

## Notes

- **Sandbox department:** `sim-millbrook-fd` — the department name Levels II–V use (Level I uses `sim-surfside-ttx-2-v4`). The conductor creates it fresh on the local emulator every run (Phase 1); emulator data is ephemeral, so there is nothing to reset between runs.
- **Inventory source:** `.claude/skills/shared/millbrook-inventory.csv` — full Millbrook fleet (12 rows: Engine 1, Engine 2, Rescue 1). Only Engine 1 is dispatched in this scenario.
- **App version baseline:** current v4-redesign build (record the commit hash in the hotwash).
- **v4 design ref:** checklist and hotwash refs point at the best-matching v4 design doc, relative to `docs/v4-design/` (start at `00-INDEX.md`). ADRs live in `11-decisions/` — ADR-008 NIMS org, ADR-010–013 status model / colour / measurement, ADR-017 roles, ADR-041 sync and event fold — and workflows in `09-workflows/`.
- **Runtime output:** Write hotwash artifacts to `.claude/simulations/level-v-sim/runtime/`.
- **Prior simulation:** This is the smallest of 5 escalating simulations. See also: `/sim-level-iv`, `/sim-level-iii`, `/sim-level-ii`, `/sim-level-i`.
