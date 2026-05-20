# Variable Participant Cast — Surfside TTX-2

> ⚠️ **Training-only.** All personae are fictional.

This file enumerates the **subagents that actively drive the live preview PWA** during each operational period. Only ONE participant holds the active-driver token at any moment; the conductor passes it explicitly. Others observe but do not drive. The active-driver token holder is logged with every app action.

## Spawn / terminate schedule

| OP | Spawn at | Terminate at | New subagents | Carried over |
|---|---|---|---|---|
| OP1 | E-5 (5 min before clock start) | E+4:00 boundary | 4 | 0 |
| OP2 | E+4:00 boundary | E+16:00 boundary | 6 new | 4 from OP1 (but OP1 IC handed off to OP2 IC via persona swap) |
| OP3 | E+16:00 boundary | E+28:00 boundary | 4 new | All 10 OP2 roles continue (persona rotation per roster) |
| OP4 | E+28:00 boundary | post-hotwash | 0 new | 8 of OP3's 14 continue; 6 explicitly terminated |

## OP1 — 4 active participants

| Role | Subagent ID | Active window | Persona (drives ICS leader chain) | Primary app surfaces |
|---|---|---|---|---|
| IC | `ic-op1` | E+0:00 → E+4:00 | Reyes → McAllister (E+0:09) → Park (E+0:45) | Settings → Start Operation modal; Command tab |
| Operations SC | `osc-op1` | E+0:45 → E+4:00 | McAllister (post-IC handoff) | Operations tab — assignments, sectors |
| Rescue Captain | `rescue-op1` | E+0:05 → E+4:00 | Rescue 1 senior officer | Operations — SP creation (first ~30 SPs); status flow |
| Cut Table Lead | `cut-op1` | E+0:22 → E+4:00 | Squad 1 senior | Cut Table tab — cut workflow once first SP reaches cutting |

**OP1 SP creation budget:** ~30 shore points (initial recon + cleavage emergency shoring + first probes Sector A).

## OP2 — 10 active participants

| Role | Subagent ID | Active window | Persona | Primary app surfaces |
|---|---|---|---|---|
| IC | `ic-op2` | E+4:00 → E+16:00 | Chief Whitaker (day shift) | Command — role tree |
| OSC | `osc-op2` | E+4:00 → E+16:00 | TFL Brennan (E+5:00–E+14:00) → TFL Marquez (E+14:00+) | Operations — tactical |
| PSC | `psc-op2` | E+4:00 → E+16:00 | Capt. Doyle (TF-State Plans Mgr) | Reads Operations + Command; drafts IAP-OP3 |
| LSC | `lsc-op2` | E+4:00 → E+16:00 | Romano (departs E+10:00) → Salinger | Inventory + Apparatus |
| Safety Officer | `safety-op2` | E+4:00 → E+16:00 | BC Conway | Command — Safety reparent; hazard tracking |
| Rescue Branch Director | `rescue-branch-op2` | E+5:00 → E+16:00 | Vega (TF-State Rescue Mgr) | Operations — SP creation + group ops |
| Shoring Group Sup | `shoring-op2` | E+5:00 → E+16:00 | Sup. Beck (USAR-Bravo, escalates) | Operations — heavy SP creation |
| Search Group Sup | `search-op2` | E+5:00 → E+16:00 | Sup. Kim (TF-State Search Mgr) | Operations — search-driven SP requests |
| Cut Table Lead | `cut-op2` | E+4:00 → E+16:00 | TF-State rescue spec rotation | Cut Table — sustained workflow |
| Liaison Officer | `liaison-op2` | E+6:00 → E+16:00 | Mendoza | Inventory — multi-agency apparatus tagging (preview of v4.0.0 multi-tenancy) |

**OP2 SP creation budget:** ~110 shore points (mass deploy across Sectors A, C, partial D; Bravo cleavage divisional shoring).

## OP3 — 14 active participants

All OP2 roles continue (with persona rotation per roster), **plus** 4 new subagents:

| Role | Subagent ID | Active window | Persona | Primary app surfaces |
|---|---|---|---|---|
| IC (rotates) | `ic-op3` | E+16:00 → E+28:00 | Vasquez (night) | Command |
| OSC (rotates) | `osc-op3` | E+16:00 → E+28:00 | Asst. TFL Bishop | Operations |
| PSC | `psc-op3` | E+16:00 → E+28:00 | PSC Federal (Fed-Alpha Plans Mgr) | Drafts IAP-OP4 |
| LSC | `lsc-op3` | E+16:00 → E+28:00 | Romano (return) | Inventory |
| Safety Officer | `safety-op3` | E+16:00 → E+28:00 | Conway continues | Command |
| Rescue Branch Director | `rescue-branch-op3` | E+16:00 → E+28:00 | Vega → Federal Rescue Mgr rotation | Operations |
| Shoring Group Sup | `shoring-op3` | E+16:00 → E+28:00 | Beck continues | Operations |
| Search Group Sup | `search-op3` | E+16:00 → E+28:00 | Kim continues | Operations |
| Cut Table Lead | `cut-op3` | E+16:00 → E+28:00 | Federal cutting spec rotation | Cut Table |
| Liaison Officer | `liaison-op3` | E+16:00 → E+28:00 | Mendoza continues | Inventory + Command |
| **NEW Heavy Rigging Group Sup** | `rigging-op3` | E+16:00 → E+28:00 | TF-State Heavy Rigging Spec | Operations — crane-integrated SP creation; Sector D deep ops |
| **NEW Medical Branch Director** | `medical-op3` | E+16:00 → E+28:00 | Dr. Patel (escalated from Medical Team Mgr) | Operations — patient-flow shoring priorities |
| **NEW Demob Unit Leader** | `demob-op3` | E+15:00 → E+28:00 | Sgt. Nash | Command, Inventory — explores demob UI (likely v4.0.0 gap) |
| **NEW Documentation Unit Leader** | `docunit-op3` | E+24:00 → E+28:00 | Sayer (TF Plans) | Settings → Export, Archived ops — tests export / history UI |

**OP3 SP creation budget:** ~80 shore points (deep work Sector D; continued Sector B post-gas-iso; sustained Sector A).

## OP4 — 8 active participants

Cast shrinks. Conductor **explicitly terminates** the 6 retiring subagents at OP3→OP4 boundary.

| Role | Subagent ID | Active window | Persona | Primary app surfaces |
|---|---|---|---|---|
| IC | `ic-op4` | E+28:00 → end | Chief Whitaker (return) | Command — reviews IAP-OP4 |
| OSC | `osc-op4` | E+28:00 → end | TFL Marquez (return) | Operations |
| PSC | `psc-op4` | E+28:00 → end | PSC Federal continues + IST PSC augment | Command + Inventory |
| Safety Officer | `safety-op4` | E+28:00 → end | Conway continues | Command |
| Rescue Branch Director | `rescue-branch-op4` | E+28:00 → end | Federal Rescue Mgr | Operations |
| Shoring Group Sup | `shoring-op4` | E+28:00 → end | Beck continues | Operations |
| Cut Table Lead | `cut-op4` | E+28:00 → end | Federal cutting spec | Cut Table |
| Demob Unit Leader | `demob-op4` | E+28:00 → end | Sgt. Nash continues | Command — demob discussion (state TF) |

**Terminated at OP3→OP4 boundary:** Liaison (`liaison-op3`), Search Group Sup (`search-op3`), Heavy Rigging (`rigging-op3`), Medical Branch (`medical-op3`), LSC (`lsc-op3`), Documentation UL (`docunit-op3` — completes export work by E+28:00 boundary).

**OP4 SP creation budget:** ~30 shore points (sustained cuts + emergency shoring redo in cleavage zone as fatigue/weather degrades earlier work; minor new SP creation).

## Handoff protocol (at each OP boundary)

1. **Outgoing IC** (or any rotated role) writes a one-paragraph briefing into `runtime/event-log.jsonl` with type `transfer-of-command` capturing: current state, immediate priorities, hazards, resource posture.
2. **Incoming IC** reads (a) the outgoing brief, (b) the latest IAP, (c) the most recent Firebase snapshot in `runtime/firebase-snapshots/`. Acknowledges before issuing app actions.
3. **Active-driver token** explicitly transferred via a single `event-log.jsonl` line `{type: "token-transfer", from: <subagent-id>, to: <subagent-id>, ts: E+...}`.
4. **Conductor validates** `fieldshore_deptId === 'sim-surfside-ttx-2'` in localStorage immediately before the transfer.

## Active-driver-token sharing within an OP

Within a single OP, multiple participants share the preview by passing the token:

- **Default token holder:** OSC (Operations tab is the most-used surface during sustained ops)
- **PSC takes token** for IAP drafting (briefly, between OP boundaries)
- **Rescue Branch / Shoring Group / Cut Table** take token for their specific work bursts, then release back to OSC
- **Safety Officer** takes token for any reparent / hazard log update
- **IC** takes token for status review and at OP boundaries

The conductor logs every `token-transfer` event. `mod-data` checks the resulting Firebase write attribution.
