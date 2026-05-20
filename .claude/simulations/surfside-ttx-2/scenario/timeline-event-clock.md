# Master Event Clock — Surfside TTX-2

> ⚠️ **Training-only.** All times, units, and events are fictional simulation entries.

The event clock is anchored to **E+0:00 = collapse onset**. Real-world equivalent for simulation reference only: 01:22 local (overnight start, daylight by OP2 mid-period). The conductor drives the clock; arrivals fire on schedule per this timeline; participant actions emerge in response.

## Operational period boundaries

| OP | Range | Duration | Phase |
|---|---|---|---|
| OP1 | E+0:00 → E+4:00 | 4 hr | Initial Response (alarm growth → command transfer chain) |
| OP2 | E+4:00 → E+16:00 | 12 hr | Mass Deploy (day shift; State TF + Federal Alpha arrival) |
| OP3 | E+16:00 → E+28:00 | 12 hr | Sustained Ops (night shift; Federal Bravo + Charlie arrival; demob planning begins) |
| OP4 | E+28:00 → E+36:00 | 8 hr | Demob Discussion + Sustained (day 2; first cost/time tracking; CISM team activated) |

## Catastrophic / paper events (conductor fires these on schedule)

These are not participant actions — they are world events. Conductor injects them into `event-log.jsonl` at the listed E+ time.

| E+ time | Event | Effect |
|---|---|---|
| E+0:00 | **COLLAPSE** | Building south wing pancakes. Floor slabs sequence over ~12 sec. |
| E+0:03 | First 9-1-1 calls | Dispatch reports "explosion / collapse" at Generic Avenue |
| E+1:15 | **Gas isolation confirmed** | Utility crew reports SW service stub isolated; Pile Sector B accessible |
| E+3:45 | **ESF-9 SAR request transmitted** | State EM relays request to FEMA Region — triggers federal TF activation chain |
| E+7:30 | **Federal activation order** | FEMA HQ issues activation to TF-Fed-Alpha |
| E+18:00 | **Cluster V-Cluster-10 discovered** | Search Specialist makes voice contact with V-38 on Floor 4, Pile Sector A — late emergent priority |
| E+22:00 | **Wind gust 28 mph** | Brief weather event — affects Pile Sector D cantilevered fragments; suspend cuts for ~10 min |
| E+24:30 | **Brief rain (15 min)** | Reduces visibility; some cutting saws power down for moisture risk |
| E+28:00 | **National Weather Service heat advisory** | Forecast OP4 day-shift high 88 °F + humidity → rehab pacing tightens |
| E+30:00 | **TF-State demob discussion** | Not actual demob — formal planning conversation; documented but no apparatus leaves yet |

## Personnel arrival schedule (full roster reference: [roster/personnel-roster.md](../roster/personnel-roster.md))

### OP1 (E+0:00 → E+4:00)

| E+ time | Arrival | Cumulative on-scene personnel |
|---|---|---|
| E+0:04 | Engine 1, Ladder 1 | 9 |
| E+0:05 | Rescue 1 | 13 |
| E+0:06 | Engine 2 | 17 |
| E+0:09 | BC-1 (cmd transfer #1, Capt. Reyes → BC McAllister IC #2) | 18 |
| E+0:12–0:18 | Engine 3, Ladder 2, Rescue 2 (box alarm) | 31 |
| E+0:22 | Squad 1 | 35 |
| E+0:25 | BC-2 (Safety Officer assignment) | 36 |
| E+0:30–0:38 | Engine 4, Engine 5, Ladder 3, Tower 1 (2nd alarm) | 54 |
| E+0:45 | ACOO-1 (cmd transfer #2 — DC Park IC #3, McAllister → OSC) | 55 |
| E+0:48 | USAR-Alpha (local Special Ops, 8 personnel) | 63 |
| E+1:00–1:10 | Engine 6, Engine 7, Rescue 3, Ladder 4 (3rd alarm) | 80 |
| E+1:15 | EMS-1, EMS-2 | 84 |
| E+1:20–1:30 | Engine 8, Engine 9, Ladder 5 (mutual aid) | 97 |
| E+1:45 | EOC-Liaison (Liaison Officer assignment) | 98 |
| E+2:00 | PIO-1 | 99 |
| E+2:15 | USAR-Bravo (local Special Ops, 8 personnel) | 107 |
| E+2:30 | TF-State Advance (4 personnel, PSC #1 Capt. Doyle) | 111 |
| E+2:45 | Heavy 1 (crane) | 114 |
| E+3:00 | Engine 10 (rehab cycle) | 118 |
| E+3:15 | Squad 2 (mutual aid) | 122 |
| E+3:30 | LSC-1 (Logistics standup) | 123 |
| **OP1 boundary E+4:00** | — | **~123 personnel, 28 apparatus, 13 ICS leadership filled** |

### OP2 (E+4:00 → E+16:00)

| E+ time | Arrival | Cumulative |
|---|---|---|
| E+4:30 | Engine 11, Engine 12 (day-shift relief) | 131 |
| E+5:00 | **TF-State main body** (66 personnel completes 70-person Type I TF; structured per FEMA Type I composition — see [plan.md](../plan.md) Appendix B) | 197 |
| E+5:30 | ICP Trailer | 199 |
| E+6:00 | UC-Law + LE Perimeter Group (~30 personnel total) | 230 |
| E+6:30 | PW-1, PW-2 (Debris Removal) | 238 |
| E+7:00 | Engine 13, Engine 14 | 246 |
| E+8:00 | (No personnel — TF-State-Rigging activates internally) | 246 |
| E+9:00 | Day-shift IC (Chief Whitaker, cmd transfer #3) | 247 |
| E+10:00 | LSC #2 relief | 247 (Romano departs for rest cycle, no net change) |
| E+10:30, E+11:00 | EMS-3, EMS-4 | 251 |
| E+12:00 | **TF-Fed-Alpha Advance** (5 personnel, TFL Marquez OSC #3) | 256 |
| E+14:00 | **TF-Fed-Alpha main body** (75 personnel completes 80-person Type I TF) | 331 |
| E+15:00 | (Demob Unit Leader assignment internal to TF-State) | 331 |
| **OP2 boundary E+16:00** | — | **~331 personnel, 40+ apparatus, 22 ICS leadership filled** |

> **Note:** Per FEMA US&R Operations Manual (plan.md Appendix C), federal TF embarkation is 4 hr (ground) / 6 hr (air) PLUS travel. E+14:00 main body arrival is on the fast end for an out-of-state Type I; plan-build session may push to E+16–E+20 if higher realism is desired.

### OP3 (E+16:00 → E+28:00)

| E+ time | Arrival | Cumulative |
|---|---|---|
| E+18:00 | TF-Fed-Bravo Advance (5 personnel, TFL Okafor OSC #4-rel) | 336 |
| E+20:00 | TF-Fed-Bravo main body (75 personnel completes Type I TF) | 411 |
| E+21:00 | Night-shift IC (Chief Vasquez), Night-shift OSC (Asst. TFL Bishop) cmd transfer #4 | 411 (relief — no net) |
| E+22:00 | Engine 15, Engine 16 (night relief) | 419 |
| E+23:00 | TF-State rest cycle — 35 personnel rotate to rehab | 384 active |
| E+24:00 | TF-Fed-Charlie Advance (5 personnel) | 389 active |
| E+25:00 | TF-Fed-Charlie main body (75 personnel completes Type I TF) | 464 active |
| E+26:00 | FEMA IST Demob Coordinator (1 personnel) | 465 |
| E+27:00 | FEMA IST-Plans (3 personnel, IST PSC augment) | 468 |
| **OP3 boundary E+28:00** | — | **~440–470 personnel on scene (peak), 50+ apparatus, 27 ICS leadership filled** |

### OP4 (E+28:00 → E+36:00)

| E+ time | Arrival | Cumulative |
|---|---|---|
| E+28:00 | Day-2 IC (Chief Whitaker rtn, cmd transfer #5) | 470 |
| E+30:00 | TF-State Cache Decon team (6 personnel — prep for eventual release) | 476 |
| E+30:00 | Day-2 OSC (TFL Marquez rtn) | 476 (relief — no net) |
| E+30:00 | Cost Unit Leader (2 personnel — Finance/Admin SC) | 478 |
| E+32:00 | Time Unit (2 personnel) | 480 |
| E+33:00 | CISM team (4 personnel) | 484 |
| E+34:00 | Engine 17, Engine 18 (relief) | 492 |
| E+35:00 | Documentation Unit Leader (2 personnel) | 494 |
| **OP4 boundary E+36:00 (event end)** | — | **~440–494 personnel sustained, 30 ICS leadership over operation lifetime** |

## Conductor's event-injection responsibilities

1. **At each row in this timeline:** append an `event-log.jsonl` line with `{ts, event, units, personnel_delta, cumulative}`.
2. **At each catastrophic/paper event:** append + notify active driver so they can react (e.g., gas-isolation event lets Pile Sector B work proceed).
3. **At each OP boundary:** trigger pre-boundary hooks (drafter completes IAP; cmd transfer brief written; snapshot of Firebase state written).
4. **Validate `fieldshore_deptId === 'sim-surfside-ttx-2'` in localStorage** at every OP boundary; mismatch → abort.
