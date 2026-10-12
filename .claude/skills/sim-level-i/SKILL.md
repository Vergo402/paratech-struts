---
name: sim-level-i
description: "Run the FEMA Level I structural collapse simulation — Surfside-scale multi-agency federal response. Wraps and enhances the existing Surfside TTX-2 infrastructure. 250 shore points, 4 OP periods, 36 hours, federal USAR task forces, full ICS with UC. Use this skill whenever Alex says 'run level i simulation', 'level 1 sim', 'surfside sim', or '/level-i-sim'."
---

# Level I Simulation — Surfside TTX-2 (Federal-Scale Collapse)

Wraps the existing `.claude/simulations/surfside-ttx-2/` pre-event package as an invokable skill. This is the maximum-stress test: 250 shore points, 494 personnel at peak, 4 operational periods across 36 hours, 3 federal USAR task forces, unified command, full ICS General Staff with all sections, and the complete IST workflow. Targets every app surface simultaneously — rendering, sync, auth, NIMS compliance, command structure, inventory management, and operational workflow at a scale that breaks everything that can break.

> **TRAINING DISCLAIMER:** This is a fictional scenario for software testing purposes only. Based on general structural collapse response patterns. All persons, addresses, units, and events are fabricated. No real incident is depicted or referenced.

---

## Scenario Reference

This skill does NOT duplicate the scenario data — it references the existing Surfside TTX-2 files:

| Component | Path |
|-----------|------|
| Building profile | `.claude/simulations/surfside-ttx-2/scenario/building-profile.md` |
| Victim roster | `.claude/simulations/surfside-ttx-2/scenario/victims.md` |
| Event clock | `.claude/simulations/surfside-ttx-2/scenario/timeline-event-clock.md` |
| Personnel roster | `.claude/simulations/surfside-ttx-2/roster/personnel-roster.md` |
| ICS leadership | `.claude/simulations/surfside-ttx-2/roster/ics-leadership.md` |
| Participant cast by OP | `.claude/simulations/surfside-ttx-2/roster/participant-cast-by-op.md` |
| Local apparatus inventory | `.claude/simulations/surfside-ttx-2/inventory-baseline/local-apparatus-inventory.json` |
| State TF cache | `.claude/simulations/surfside-ttx-2/inventory-baseline/state-tf-cache.json` |
| Federal TF cache | `.claude/simulations/surfside-ttx-2/inventory-baseline/fed-tf-cache.json` |
| External equipment pool | `.claude/simulations/surfside-ttx-2/inventory-baseline/external-equipment-pool.json` |
| Inventory fixture (v4 import CSV) | `.claude/skills/shared/sim-level-i-inventory.csv` |
| Moderator framework | `.claude/simulations/surfside-ttx-2/moderators/moderator-framework.md` |
| NIMS checklist | `.claude/simulations/surfside-ttx-2/moderators/mod-nims-checklist.md` |
| Structural checklist | `.claude/simulations/surfside-ttx-2/moderators/mod-struct-checklist.md` |
| UX checklist | `.claude/simulations/surfside-ttx-2/moderators/mod-ux-checklist.md` |
| Data checklist | `.claude/simulations/surfside-ttx-2/moderators/mod-data-checklist.md` |
| Comms checklist | `.claude/simulations/surfside-ttx-2/moderators/mod-comms-checklist.md` |
| IST checklist | `.claude/simulations/surfside-ttx-2/moderators/mod-ist-checklist.md` |
| IAP templates | `.claude/simulations/surfside-ttx-2/iaps/iap-op{1-4}-template.md` |
| Runbook | `.claude/simulations/surfside-ttx-2/runbook.md` |
| Canonical plan | `.claude/simulations/surfside-ttx-2/plan.md` |

### Prior Run Results (read-only reference)

| Component | Path |
|-----------|------|
| Filled IAPs | `.claude/simulations/surfside-ttx-2/iaps/iap-op{1-4}.md` |
| Event log | `.claude/simulations/surfside-ttx-2/runtime/event-log.jsonl` |
| Conductor state | `.claude/simulations/surfside-ttx-2/runtime/conductor-state.json` |
| Moderator notes | `.claude/simulations/surfside-ttx-2/notes/moderator-mod-*-notes.jsonl` |
| Firebase snapshots (v3-only) | `.claude/simulations/surfside-ttx-2/runtime/firebase-snapshots/` |
| OP3 driver script (v3-only) | `.claude/simulations/surfside-ttx-2/runtime/op3-driver.py` |
| Final report | `.claude/simulations/surfside-ttx-2/hotwash/final-report.md` |
| Improvement plan | `.claude/simulations/surfside-ttx-2/hotwash/improvement-plan.md` (63 findings) |
| v4.0 gap analysis | `.claude/simulations/surfside-ttx-2/hotwash/v4.0.0-gap-analysis.md` |

---

## Scenario Summary

**Building:** 12-story Type IB residential, coastal Florida. South-wing pancake collapse triggered by column-slab connection failure at pool-deck transfer zone.
**Victims:** ~40 modeled, clustered by priority into SP priority zones
**Geography:** 4 pile sectors across Divisions Alpha through Delta. 12 floors + below-grade.
**Duration:** E+0:00 → E+36:00, 4 operational periods (OP1: 4hr, OP2: 12hr, OP3: 12hr, OP4: 8hr)
**Personnel:** ~494 at peak (OP4 close). 71 unit-level rows, 30 named ICS leadership.
**Apparatus:** 12 local + state USAR TF (70 personnel) + 3 federal USAR TFs (75 each). In v4 every rig (local, mutual-aid, state TF and federal TF) is an ordinary rig in the one sandbox department (v4's outside-department equipment surface is deferred). The TF caches keep the fixture names, which already carry the TF (`TF-State Cache`, `TF-Fed-Alpha Cache`, `TF-Fed-Bravo Cache`, `TF-Fed-Charlie Cache`); any TF or mutual-aid apparatus added by hand is named with its agency (e.g. "FL-TF1 Rescue 1", "County Engine 8").
**SP target:** ~250 by E+36:00 (OP1: ~30, OP2: ~110, OP3: ~80, OP4: ~30)
**ICS:** Full unified command (Fire/LE/FBI), all General Staff sections, multiple branches, IST elements

**Fixture.** `.claude/skills/shared/sim-level-i-inventory.csv`: 243 rows (1866 units: 498 struts, 550 extensions, 818 plates) across 13 rigs (Engine 1, Engine 3, Rescue 1, Rescue 2, Rescue 3, Squad 1, Tower 1, USAR-Alpha, USAR-Bravo, TF-State Cache, TF-Fed-Alpha Cache, TF-Fed-Bravo Cache, TF-Fed-Charlie Cache). It was built from `runtime/import-payload.json`, which matches the four `inventory-baseline/` JSONs row for row (the federal template is used three times, for Alpha, Bravo and Charlie). Counts come from the per-rig rows, not from the `_counts` blocks, which disagree with their own rows. The app's own `toCsv()` wrote the file, and `parseCsv()` checked it (`src/data/inventory/excel.ts`). Assumptions: LS 812 is omitted (6 lines, 26 units). It is not in the v4 catalog (`src/core/load/struts.ts`), so USAR-Alpha drops 14→12 struts, USAR-Bravo 12→10, TF-State Cache 86→82 and each TF-Fed cache 120→114; this is an expected Mod-Structural finding. LK 37-58, a typo in the sim data, is mapped to LK 36-57. The external equipment (lumber, wedges, cribbing) is excluded because it is deferred in v4. ID and Apparatus ID are blank, so the importer assigns IDs and matches rigs by exact name. The CSV cannot carry a rig's type or list the 25 unstocked roster rigs, so Phase 2 creates those by hand. The root `.gitignore` ignores `*.csv`, so the fixture stays untracked until the conductor adds an exception or force-adds it.

---

## Locked Decisions

| # | Decision | Value |
|---|----------|-------|
| 1 | Operational periods | 4 |
| 2 | Duration | 36 hours |
| 3 | Shore point target | ~250 |
| 4 | Participants per OP | 4 (OP1) → 10 (OP2) → 14 (OP3) → 8 (OP4) |
| 5 | Moderators | 6 (NIMS, Structural, UX, Data, Comms, IST) |
| 6 | Sandbox department | `sim-surfside-ttx-2-v4`, created fresh on the local Firebase emulator each run (emulator data is ephemeral). The prior v3 run used `sim-surfside-ttx-2` |
| 7 | App interaction | UI only (see Run rules under Anti-patterns) |
| 8 | Hotwash format | Pearls & Pitfalls + Gap Analysis + FEMA Improvement Plan (14-column) |
| 9 | Inventory import | Via the app's import flow (Settings › Data management › "Import inventory") using `.claude/skills/shared/sim-level-i-inventory.csv` |
| 10 | Shoring Group | Always present across all 4 OPs |

**Shore-point status labels (7-status lifecycle).** The data stores the lifecycle ids. Participants and moderators drive and observe by the v4 field labels.

| lifecycle id | v4 label |
|---|---|
| pending | **Pending Equipment** |
| process | **Equipment Assigned** |
| strutset | **Strut Set** (was v3 "strut placed" / `strutplaced`) |
| cutting | **Cutting Station** |
| runner | **Runner** |
| secured | **Wood Shore Secured** |
| returned | **Strut Equipment Returned** |

---

## Agent Framework

**Total: 15–23 agents** (varies by OP)

### Conductor (1)
Per `.claude/simulations/surfside-ttx-2/subagent-prompts/conductor-system-prompt.md`. Manages the 36-hour event clock, personnel staging, token protocol. The conductor also starts the emulators, creates the sandbox department, and records the build commit (Phase 1). All app interactions follow the Run rules under Anti-patterns.

### Moderators (6 — silent observers)
Per `.claude/simulations/surfside-ttx-2/moderators/moderator-framework.md`. Each uses their respective checklist. All notes written in JSONLines format per `.claude/simulations/surfside-ttx-2/subagent-prompts/moderator-system-prompt.md`.

| Moderator | Focus | Checklist |
|-----------|-------|-----------|
| Mod-NIMS | ICS doctrine, command structure, UC | `mod-nims-checklist.md` |
| Mod-Structural | Strut selection, load tables, deductions | `mod-struct-checklist.md` |
| Mod-UX | Touch targets, scroll, modals, responsiveness | `mod-ux-checklist.md` |
| Mod-Data | Firebase integrity, sync, listener behavior | `mod-data-checklist.md` |
| Mod-Comms | Radio terminology, ICS-205, transmittable output | `mod-comms-checklist.md` |
| Mod-IST | IST functions, ICS forms, cost/time tracking | `mod-ist-checklist.md` |

### Participants (4→10→14→8)
Per `.claude/simulations/surfside-ttx-2/subagent-prompts/participant-system-prompt.md` with role overlays from `per-role-overlays.md`. Shoring Group participant(s) always present. That prompt is v3-era — where it allows page-eval reads, direct Firebase seeding or names the `sim-surfside-ttx-2` department, Phase 1–2 and the Run rules of this skill supersede it.

Each participant is one device: its own Playwright browser context against `http://localhost:5200`. Phone contexts (isMobile + hasTouch) get the status slider, and mouse contexts get buttons. Participants drive the app with click and fill, and observe it through the accessibility tree, screenshots and console errors, following the Run rules (see Anti-patterns).

---

## Execution Phases

### Phase 0 — Intent
Two modes:
1. **First run** — Fresh execution against the current v4-redesign build. Create the sandbox department `sim-surfside-ttx-2-v4` through the app's UI on the local emulator (Phase 1).
2. **Re-run against v4.0** — Re-execute with the moderator checklist additions below. Compare findings against the prior (v3) run's 63 IP items.

Ask Alex which mode. Default: First run.

### Phase 1 — Pre-flight
1. Record `git rev-parse --short HEAD` (conductor only). The baseline is the current v4-redesign build.
2. Read all scenario files from `.claude/simulations/surfside-ttx-2/scenario/`
3. Read roster files from `.claude/simulations/surfside-ttx-2/roster/`
4. Start the local Firebase emulators with `npm run emulators` (Auth :9099 + Realtime Database :9000; needs Java at `/opt/homebrew/opt/openjdk/bin`). Sims never run against the live `fieldshore-database` project. The :5199 `fieldshore-v4-dev` preview config is for single-device UI work against the real project, not for sims.
5. Start the app against the emulators with `npm run dev:emu` (Vite on `http://localhost:5200`, `VITE_USE_EMULATORS=true`).
6. Open devices as separate Playwright browser contexts against :5200 (channel `'chrome'`). The reference driver is `.claude/audits/phase-j/262-ttx/driver.mjs` (the #262 TTX, 3 devices). A single-device step may use the preview browser tab on :5200 instead.
7. Conductor sign-up: go to `/auth`, pick the "Create Account" segment, enter a display name, a throwaway emulator-only email and a password of 6+ characters, then press Create Account. The new account has no department, so it lands on `/create-department`. Name the department `sim-surfside-ttx-2-v4` and press "Create department". Record the invite code from the success panel; the other devices join with it. The creator is Admin. Dismiss the first-run tour ("Measure the opening") with Skip.
8. Verify the app loads on :5200, shows the sandbox department, and logs no console errors.
9. **Success:** Emulators and :5200 up, sandbox department created, invite code recorded, scenario files read, commit hash recorded

### Phase 2 — Inventory Import (UI only)
Import before creating the operation, so the counts are a clean baseline. Import also works during an active operation.
1. Pre-create the rigs that need a specific type, using Inventory › "Add apparatus". The CSV cannot carry rig type, and an unknown rig name is created as type Other. Engine 1 and Engine 3 → Engine; Tower 1 → Ladder; Rescue 1, Rescue 2 and Rescue 3 → Rescue; Squad 1, USAR-Alpha and USAR-Bravo → Squad; TF-State Cache, TF-Fed-Alpha Cache, TF-Fed-Bravo Cache and TF-Fed-Charlie Cache → Other (v4 has no task-force type). Use these exact names, because the importer matches rigs by exact name.
2. If the run uses the runbook's full 38-apparatus roster, hand-add the 27 unstocked rigs (25 from the baseline plus EMS-3 and EMS-4 from the event clock), which can't appear in the CSV: Engine 2, Engines 4–7 and 10–18 → Engine; Ladder 1–4 → Ladder; BC-1, BC-2, ACOO-1 and PIO-1 → Chief; EMS-1, EMS-2, EMS-3, EMS-4 and Heavy 1 → Other. The roster lists Heavy 1 as County FD, so it may be named `County Heavy 1`. Add the unstocked County FD mutual-aid units named with their agency: County Engine 8 and County Engine 9 → Engine, County Ladder 5 → Ladder, County Squad 2 → Squad.
3. Import `.claude/skills/shared/sim-level-i-inventory.csv` through Settings › Data management › "Import inventory" (the import/export button in the Inventory header opens the same flow). The flow has 4 steps: pick the file, columns auto-map, row validation, then review and commit.
4. Verify that every rig appears as a rig scope tab in Inventory, and that the per-rig strut, extension and plate counts match the fixture (243 lines, 1866 units). Check against the fixture, not the baseline JSONs, because the fixture drops LS 812. Confirm the console logs no errors.
5. **Success:** All 13 stocked rigs plus the hand-added rigs visible, with counts that match the fixture

### Phase 3 — Spawn Agents
Per OP, spawn conductor + 6 moderators + OP-specific participants in a **single message**. Follow the runbook for OP sequencing only: `.claude/simulations/surfside-ttx-2/runbook.md` is v3-era — its seeding steps (page-eval, direct Firebase writes) are superseded by Phase 1–2 and the Run rules.

At each OP boundary, spawn new participants for the next OP while retaining conductor + moderators.

Each new participant device signs up at `/auth` ("Create Account"), then joins the sandbox department through `/join-department` with the invite code from Phase 1. Dismiss the first-run tour with Skip if it appears.

### Phase 4 — Event Clock
Follow `.claude/simulations/surfside-ttx-2/scenario/timeline-event-clock.md`.

Key milestones:
- E+0:04–0:45: OP1 arrivals (local apparatus)
- E+2:30: State TF advance party
- E+4:00: **OP2 boundary**
- E+6:00: State TF main body (70 personnel)
- E+8:00: Federal TF Alpha (75 personnel)
- E+12:00: Federal TFs Bravo and Charlie
- E+16:00: **OP3 boundary**
- E+24:00: Peak SP count (~200+)
- E+28:00: **OP4 boundary**
- E+32:00: Demob planning for local and state resources
- E+36:00: End of exercise

**Success:** ~250 SPs at terminal status. 4 OP transitions. 5 command transfers. All moderator notes >= 30 entries.

### Phase 5 — Hotwash
1. Participant AARs (Army 4-question format per `.claude/simulations/surfside-ttx-2/hotwash/aar-question-template.md`)
2. Moderator findings (per moderator framework)
3. Pearls & Pitfalls table. It replaces the prior run's FEMA IP table, and its Prior IP column keeps the two comparable.
4. Gap Analysis (map each finding to its v4 design ref; see Hotwash Format)
5. **Delta report:** Compare this run's findings against the prior run's 63 IP items. Which are fixed? Which persist? Which are new?

### Phase 5b — Issue Posting
Post Critical/High/Medium Pitfalls as GitHub issues with `[SIM-I]` prefix and `simulation` label. After posting, sweep the in-app feedback participants posted. On an emulator run it lands in the emulator's root `/feedback` node, not the live project, so `feedback-review` won't see it: before stopping the emulators the conductor reads it with `curl -s -H 'Authorization: Bearer owner' 'http://127.0.0.1:9000/feedback.json?ns=fieldshore-database-default-rtdb'` and files any Critical/High/Medium entry as above.

---

## Prior Run Findings — IP Reference (63 items)

The first Surfside TTX-2 run produced 63 findings (14 critical, 28 high, 17 medium, 4 low). Full table at `.claude/simulations/surfside-ttx-2/hotwash/improvement-plan.md`.

### Top 3 Critical (for re-run regression tracking)

| IP | Finding | v4.0 Status |
|---|---------|-------------|
| **IP-007** | Add-SP modal Save Changes button hidden in Add path | Must verify fixed |
| **IP-001** | Anonymous-auth multi-tenancy gap — all users have full r/w to all departments | Must verify (v4 design ref: ADR-017) |
| **IP-006** | Role history not preserved across role transitions (5 IC + 6 OSC = 11+ confirmed losses) | Must verify (v4 design ref: ADR-008) |

### v4.0 Gap Analysis Refresh

When executing Phase 5, re-evaluate all 63 IP findings against the **current** v4 design: `docs/v4-design/00-INDEX.md`, the ADRs in `docs/v4-design/11-decisions/`, and the parity matrix `docs/v4-design/12-parity/v3-feature-parity.md`. The prior gap analysis (`.claude/simulations/surfside-ttx-2/hotwash/v4.0.0-gap-analysis.md`) was written against a federal-scale v4.0 scope. v4 is scoped to Level IV–V local-first, so many findings that were "covered" there may now be "gap" or "deferred to v5.x."

For each IP item, classify as:
- **Fixed** — verified resolved in the current v4-redesign build
- **Covered** — addressed by the current v4 design (cite the v4 design ref)
- **Gap** — not addressed by current v4.0 scope, should be
- **Deferred** — intentionally deferred to v5.x (federal/USAR scope)
- **New idea** — emerged from this run, not in prior findings

---

## Updated Moderator Checklists

The existing moderator checklists in `.claude/simulations/surfside-ttx-2/moderators/` reference v3.x Phase tags (e.g., "3B.4", "3C.7"). These checklists remain valid, so read them at execution time. Those phase tags are stale for v4, so record a v4 design ref for each finding instead: status lifecycle → ADR-010 (with ADR-011 colour and ADR-012 measurement); org/positions → ADR-008; roles/permissions → ADR-017; sync/offline → ADR-041; anything else → "—". If a checklist item names a v3 mechanism (the v3 join-by-code screen, browser storage, spreadsheet import), test the v4 equivalent: create/join department, the Dexie/IndexedDB local store with Realtime Database sync, CSV import. Checklist items that ask whether outside-agency rigs are distinguishable stay in as expected findings, because v4's outside-department equipment surface is deferred.

### Additional checklist items (new for re-run):

**Mod-UX additions:**
- U-NEW-1: 250-SP rendering performance (scroll, filter, search) on mobile
- U-NEW-2: Desktop command view — is it usable at this scale?
- U-NEW-3: Dark mode during overnight OPs (OP2 and OP3 are partially overnight)

**Mod-Data additions:**
- D-NEW-1: Firebase snapshot at 250 SPs — total payload size?
- D-NEW-2: Memory profile after 36 hours of continuous operation
- D-NEW-3: Concurrent writes from 14 agents (OP3 peak) — any transaction conflicts?

**Mod-NIMS additions:**
- N-NEW-1: Unified Command (Fire/LE/FBI) — app handles 3 ICs simultaneously?
- N-NEW-2: IST integration — any features for FEMA IST workflow?

**All moderators — prior-run workarounds:**
- Any finding that the prior run worked around with direct Firebase writes or JS injection is re-tested under the Run rules.

---

## Hotwash Format

### Pearls & Pitfalls Table

| # | Type | Surface | Finding | Severity | v4 design ref | Prior IP | Issue |
|---|------|---------|---------|----------|---------------|----------|-------|
| _P-01_ | _Pearl/Pitfall_ | _area_ | _description_ | _severity_ | _ADR-0NN / docs/v4-design path / —_ | _IP-NNN or NEW_ | _#NNN_ |

Note the additional **Prior IP** column — links each finding to its predecessor from the 63-item improvement plan (or "NEW" if novel).

### Gap Analysis

| Finding | Covered by v4.0? | v4 design ref | Prior Status | Current Status | Action |
|---------|-------------------|---------------|-------------|----------------|--------|
| _desc_ | _Covered/Gap/Deferred/New_ | _ADR-0NN / docs/v4-design path / —_ | _prior classification_ | _current_ | _action_ |

### Delta Report

| IP | Prior Finding | Prior Severity | Current Status | Notes |
|----|--------------|----------------|----------------|-------|
| IP-001 | Multi-tenancy gap | Critical | _Fixed / Persists / Deferred_ | |
| IP-006 | Role history loss | Critical | _Fixed / Persists / Deferred_ | |
| IP-007 | Add-SP save hidden | Critical | _Fixed / Persists / Deferred_ | |
| ... | ... | ... | ... | |

---

## Anti-patterns

**Run rules.**

- Participants act only through the app's UI — if the UI can't do something, that's a finding, not something to work around. Nobody writes directly to Firebase, the emulator, IndexedDB or browser storage, and nobody calls app functions from the page.
- The one page command allowed is `location.assign('/<tab>')`, used to switch tabs (`/quickfind`, `/operations`, `/inventory`, `/command`, `/settings`). The bottom tab bar is a router link that synthetic clicks can't drive. No other page evaluation is allowed.
- Agents drive the app with click and fill, and observe it through the accessibility tree, screenshots and console errors. Synthetic clicks don't flush React synchronously, so read the resulting state in a separate call.
- All 5 IC transitions go through the UI, and none is skipped.
- All 4 OP boundaries are exercised.
- Scenario data stays in the simulation files, and this skill references those files by path.
- Each run uses a fresh `sim-surfside-ttx-2-v4` department on the local emulator. It never uses the prior v3 sandbox (`sim-surfside-ttx-2`) or the live `fieldshore-database` project.
- Prior-run findings are never carried over as "already known". Each one is independently confirmed or marked fixed.
- Moderators observe silently and never interrupt participants.
- Only the conductor runs git, and only to record the commit hash. Participants and moderators never do.

---

## Notes

- **Sandbox department:** `sim-surfside-ttx-2-v4`, created fresh on the local emulator each run (emulator data is ephemeral)
- **Inventory source:** `.claude/skills/shared/sim-level-i-inventory.csv`, imported through Settings › Data management › "Import inventory" (provenance in the Fixture paragraph under Scenario Summary)
- **App version baseline:** current v4-redesign build (record the commit hash in the hotwash)
- **v4 design reference:** `docs/v4-design/00-INDEX.md`; ADRs in `docs/v4-design/11-decisions/` (ADR-008 NIMS org, ADR-010–012 status model/colour/measurement, ADR-017 roles, ADR-041 canonical event fold). The v3 `MASTER-PLAN.md` phase labels are stale for v4.
- **Runtime output:** `.claude/simulations/surfside-ttx-2/runtime-v2/` (separate from prior run's `runtime/`)
- **Prior run reference:** `.claude/simulations/surfside-ttx-2/hotwash/` — 63 findings, 4 IAPs, 7 moderator note files
- **v3-only artifacts:** `runtime/op3-driver.py` and `runtime/firebase-snapshots/` come from the v3 run against the v3 root app. They are reference only. The package's `runbook.md` and `subagent-prompts/participant-system-prompt.md` are v3-era too: Phase 1–2 and the Run rules above supersede their seeding, tooling and department-name instructions.
- **Follow-up:** Playwright device contexts (pattern: .claude/audits/phase-j/262-ttx/driver.mjs) replace op3-driver.py before the next run
- **Key stress targets:** 250-SP rendering, 36-hour continuous operation, federal USAR TF multi-agency, unified command, IST workflow, full ICS forms gap, concurrent 14-agent writes, IP regression testing
- **Related simulations:** `/sim-level-ii` (smaller — 60 SPs, 24 hrs), and Levels III/IV/V for escalating scale below this
