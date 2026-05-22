---
name: level-i-sim
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
| Moderator notes | `.claude/simulations/surfside-ttx-2/runtime/moderator-mod-*-notes.jsonl` |
| Firebase snapshots | `.claude/simulations/surfside-ttx-2/runtime/firebase-snapshots/` |
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
**Apparatus:** 12 local + state USAR TF (70 personnel) + 3 federal USAR TFs (75 each)
**SP target:** ~250 by E+36:00 (OP1: ~30, OP2: ~110, OP3: ~80, OP4: ~30)
**ICS:** Full unified command (Fire/LE/FBI), all General Staff sections, multiple branches, IST elements

---

## Locked Decisions

| # | Decision | Value |
|---|----------|-------|
| 1 | Operational periods | 4 |
| 2 | Duration | 36 hours |
| 3 | Shore point target | ~250 |
| 4 | Participants per OP | 4 (OP1) → 10 (OP2) → 14 (OP3) → 8 (OP4) |
| 5 | Moderators | 6 (NIMS, Structural, UX, Data, Comms, IST) |
| 6 | Sandbox department | `sim-surfside-ttx-2-v4` (isolated from prior run's `sim-surfside-ttx-2`) |
| 7 | App interaction | UI only — no direct Firebase writes, no JS eval, no localStorage manipulation |
| 8 | Hotwash format | Pearls & Pitfalls + Gap Analysis + FEMA Improvement Plan (14-column) |
| 9 | Inventory import | Via app UI (Inventory → Import), not direct Firebase |
| 10 | Shoring Group | Always present across all 4 OPs |

---

## Agent Framework

**Total: 15–23 agents** (varies by OP)

### Conductor (1)
Per `.claude/simulations/surfside-ttx-2/subagent-prompts/conductor-system-prompt.md`. Manages the 36-hour event clock, personnel staging, token protocol. **Updated constraint:** all app interactions go through UI only.

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
Per `.claude/simulations/surfside-ttx-2/subagent-prompts/participant-system-prompt.md` with role overlays from `per-role-overlays.md`. Shoring Group participant(s) always present.

**Critical update for re-run:** participants use ONLY `preview_click`, `preview_fill`, `preview_snapshot`, `preview_console_logs`. No `preview_eval` for app functions. No direct Firebase writes. No localStorage manipulation. If the app can't do something through its UI, that is a finding — not a workaround.

---

## Execution Phases

### Phase 0 — Intent
Two modes:
1. **First run** — Fresh execution against current app version. Seed new Firebase dept `sim-surfside-ttx-2-v4`.
2. **Re-run against v4.0** — Re-execute with updated moderator checklists reflecting v4.0 changes. Compare findings against prior run's 63 IP items.

Ask Alex which mode. Default: First run.

### Phase 1 — Pre-flight
1. Read CLAUDE.md → confirm app version
2. Read all scenario files from `.claude/simulations/surfside-ttx-2/scenario/`
3. Read roster files from `.claude/simulations/surfside-ttx-2/roster/`
4. Start preview server: `npx serve -l 8095 .`
5. Verify app loads + Firebase connection
6. **Success:** App loads, scenario files read, version confirmed

### Phase 2 — Inventory Import (UI only)
1. Settings → Department Code: `sim-surfside-ttx-2-v4`
2. Create all apparatus via the app's UI (Inventory tab → Add Apparatus for each of the 12 local + state TF + federal TFs)
3. Import inventory via Inventory → Import (may require building an import-compatible XLSX from the JSON baselines in `inventory-baseline/`)
4. Verify apparatus and strut counts match baseline targets
5. **No direct Firebase writes.** All apparatus creation and inventory entry goes through the UI.
6. **Success:** All apparatus visible with correct inventory counts

### Phase 3 — Spawn Agents
Per OP, spawn conductor + 6 moderators + OP-specific participants in a **single message**. Follow the runbook: `.claude/simulations/surfside-ttx-2/runbook.md`.

At each OP boundary, spawn new participants for the next OP while retaining conductor + moderators.

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
3. Pearls & Pitfalls table (new format — replaces the prior run's FEMA IP table for comparability)
4. Gap Analysis (map each finding to MASTER-PLAN.md Phase 3)
5. **Delta report:** Compare this run's findings against the prior run's 63 IP items. Which are fixed? Which persist? Which are new?

### Phase 5b — Issue Posting
Post Critical/High/Medium Pitfalls as GitHub issues with `[SIM-I]` prefix and `simulation` label. Run `/feedbackreview` to sweep Firebase feedback.

---

## Prior Run Findings — IP Reference (63 items)

The first Surfside TTX-2 run produced 63 findings (14 critical, 28 high, 17 medium, 4 low). Full table at `.claude/simulations/surfside-ttx-2/hotwash/improvement-plan.md`.

### Top 3 Critical (for re-run regression tracking)

| IP | Finding | v4.0 Status |
|---|---------|-------------|
| **IP-007** | Add-SP modal Save Changes button hidden in Add path | Must verify fixed |
| **IP-001** | Anonymous-auth multi-tenancy gap — all users have full r/w to all departments | v4.0 Phase 3A target |
| **IP-006** | Role history not preserved across role transitions (5 IC + 6 OSC = 11+ confirmed losses) | v4.0 Phase 3B target |

### v4.0 Gap Analysis Refresh

When executing Phase 5, re-evaluate all 63 IP findings against the **current** MASTER-PLAN.md Phase 3 scope. The prior gap analysis (`.claude/simulations/surfside-ttx-2/hotwash/v4.0.0-gap-analysis.md`) was written against the pre-reframe scope (federal-scale v4.0). Since the 2026-05-17 reframe to Level IV–V local-first scope, many findings may have shifted from "covered" to "gap" or "deferred to v5.x."

For each IP item, classify as:
- **Fixed** — verified resolved in current app version
- **Covered** — addressed by current MASTER-PLAN Phase 3 scope
- **Gap** — not addressed by current v4.0 scope, should be
- **Deferred** — intentionally deferred to v5.x (federal/USAR scope)
- **New idea** — emerged from re-run, not in prior findings

---

## Updated Moderator Checklists

The existing moderator checklists in `.claude/simulations/surfside-ttx-2/moderators/` reference v3.x Phase tags (e.g., "3B.4", "3C.7"). These checklists remain valid — read them at execution time and use the v4.0 MASTER-PLAN.md Phase 3 mapping to update phase tags.

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

**All moderators — UI-only constraint:**
- Any finding from the prior run that was worked around via direct Firebase writes or JS injection should be re-tested through the UI only. The workaround itself becomes a finding if the UI doesn't support the action.

---

## Hotwash Format

### Pearls & Pitfalls Table

| # | Type | Surface | Finding | Severity | MASTER-PLAN Phase | Prior IP | Issue |
|---|------|---------|---------|----------|-------------------|----------|-------|
| _P-01_ | _Pearl/Pitfall_ | _area_ | _description_ | _severity_ | _3X.Y_ | _IP-NNN or NEW_ | _#NNN_ |

Note the additional **Prior IP** column — links each finding to its predecessor from the 63-item improvement plan (or "NEW" if novel).

### Gap Analysis

| Finding | Covered by v4.0? | MASTER-PLAN Phase | Prior Status | Current Status | Action |
|---------|-------------------|-------------------|-------------|----------------|--------|
| _desc_ | _Covered/Gap/Deferred/New_ | _3X.Y_ | _prior classification_ | _current_ | _action_ |

### Delta Report

| IP | Prior Finding | Prior Severity | Current Status | Notes |
|----|--------------|----------------|----------------|-------|
| IP-001 | Multi-tenancy gap | Critical | _Fixed / Persists / Deferred_ | |
| IP-006 | Role history loss | Critical | _Fixed / Persists / Deferred_ | |
| IP-007 | Add-SP save hidden | Critical | _Fixed / Persists / Deferred_ | |
| ... | ... | ... | ... | |

---

## Anti-patterns

- **DO NOT** write directly to Firebase, localStorage, or sessionStorage. This is the most important change from the prior run — the first run used backend data seeding. This run is UI-only.
- **DO NOT** use `preview_eval` to execute app functions.
- **DO NOT** skip any command transfers. There are 5 IC transitions — all must go through the UI.
- **DO NOT** skip OP boundaries. All 4 transitions must be exercised.
- **DO NOT** duplicate scenario data from the simulation files into this skill. Reference the files by path.
- **DO NOT** reuse the prior sandbox department (`sim-surfside-ttx-2`). Use `sim-surfside-ttx-2-v4`.
- **DO NOT** carry over prior run findings as "already known" without re-verifying. Each finding must be independently confirmed or marked fixed.
- **DO NOT** let moderators interrupt participants.

---

## Notes

- **Sandbox department:** `sim-surfside-ttx-2-v4`
- **Inventory source:** Build import-compatible XLSX from JSON files in `.claude/simulations/surfside-ttx-2/inventory-baseline/`, then import via Inventory → Import
- **App version baseline:** v3.17.2 for first run; update when v4.0 ships
- **MASTER-PLAN reference:** `.claude/plans/MASTER-PLAN.md` Release 3 phases 3A–3F
- **Runtime output:** `.claude/simulations/surfside-ttx-2/runtime-v2/` (separate from prior run's `runtime/`)
- **Prior run reference:** `.claude/simulations/surfside-ttx-2/hotwash/` — 63 findings, 4 IAPs, 6 moderator note files
- **Key stress targets:** 250-SP rendering, 36-hour continuous operation, federal USAR TF multi-agency, unified command, IST workflow, full ICS forms gap, concurrent 14-agent writes, IP regression testing
- **Related simulations:** `/level-ii-sim` (smaller — 60 SPs, 24 hrs), and Levels III/IV/V for escalating scale below this
