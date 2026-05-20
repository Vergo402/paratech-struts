# Victim Profile — Surfside TTX-2

> ⚠️ **Training-only.** All victim identities, locations, and outcomes are entirely fictional. Numbers, names, and clinical details exist for simulation purposes and bear no relation to any real person.

## Summary

| Metric | Value |
|---|---|
| Total modeled victims | **40** (V-01 through V-40) |
| Confirmed deceased at E+0:00 | 12 (immediate pancake impact zone, Pile Sector D core) |
| Trapped & alive at E+0:00 | 19 (varied void survivability) |
| Mobile evacuees (cleavage zone, N wing) | 9 (self-extricated by E+0:30; mostly minor injuries) |
| Unaccounted at E+0:00 | 0 (sim assumes verified occupancy roster; in reality this is often the largest unknown) |

The app has **no Victim Locator Unit (VLU) data model today** — this is a known v4.0.0 gap (`mod-ist` and `mod-struct` will flag). For the sim, victims are referenced by **cluster ID** in shore-point labels (e.g., "SP-093 [V-Cluster-5]"). The cluster-to-victim mapping lives below.

## Victim clusters (priority-tiered)

Clusters group victims by void location and inform shoring priority. Each cluster ties to a pile sector + floor + general area.

### Cluster V-Cluster-1 — Pile Sector A, Floor 8 void (Highest priority)

| ID | Status @ E+0:00 | Last contact | Notes |
|---|---|---|---|
| V-01 | Trapped alive, voice contact | E+0:18 (rescuer hail) | Adult M, ~40s; faint response from confirmed void; access via Pile Sector A west face |
| V-02 | Trapped alive, voice contact | E+0:18 | Adult F, ~35s; same void as V-01; reports leg pinned but conscious |

**Shoring priority:** Tier 1 — access shoring required on Pile Sector A west face floors 8–9 to reach void

### Cluster V-Cluster-2 — Pile Sector A, Floor 6 void

| ID | Status @ E+0:00 | Last contact | Notes |
|---|---|---|---|
| V-03 | Trapped alive, tapping | E+1:30 (acoustic) | Adult, unknown gender; tapping pattern audible at Pile Sector A SW |
| V-04 | Trapped alive, tapping | E+1:30 | Same general void as V-03; possibly child (smaller acoustic signature) |

**Shoring priority:** Tier 1 — secondary access via Floor 7 slab cutout

### Cluster V-Cluster-3 — Cleavage zone, N wing Floor 11

| ID | Status @ E+0:00 | Last contact | Notes |
|---|---|---|---|
| V-05 | Mobile, self-extricating | E+0:12 (face-to-face) | Adult F, ~50s; ankle injury; assisted to triage |
| V-06 | Mobile, self-extricating | E+0:14 | Adult M, ~60s; lacerations; assisted to triage |
| V-07 | Mobile, self-extricating | E+0:15 | Adult F, ~30s; emotional distress only |

**Shoring priority:** Tier 1 — emergency shoring under cantilevered Floor 11 slab to prevent secondary collapse during evacuation

### Cluster V-Cluster-4 — Cleavage zone, N wing Floors 7–9 (multiple units)

| ID | Status @ E+0:00 | Last contact | Notes |
|---|---|---|---|
| V-08 to V-13 | Mobile, self-extricating | E+0:15 to E+0:35 | 6 evacuees walking down N wing stairwell; minor injuries; triage cleared by E+0:50 |

**Shoring priority:** Tier 2 — divisional shoring along Bravo cleavage as crews ascend N wing stairwell

### Cluster V-Cluster-5 — Pile Sector C, vehicle pocket

| ID | Status @ E+0:00 | Last contact | Notes |
|---|---|---|---|
| V-14 | Trapped alive, voice contact | E+2:10 (rescuer hail) | Adult M, valet driver from SubD-1 parking; pinned in vehicle pocket |
| V-15 | Trapped alive, voice contact | E+2:10 | Adult F, vehicle owner from SubD-1 parking |
| V-16 | Trapped alive, intermittent voice | E+3:00 → silence by E+8:00 | Adult, unknown; condition deteriorating; loss of contact concerning |

**Shoring priority:** Tier 1 — access shoring across Pile Sector C vehicle debris; HazMat surveillance for fuel/fluid exposure

### Cluster V-Cluster-6 — Pile Sector B, SW void (post gas-isolation)

| ID | Status @ E+0:00 | Last contact | Notes |
|---|---|---|---|
| V-17 | Trapped alive, voice contact | E+1:45 | Adult; access blocked by active gas leak until E+1:15 |
| V-18 | Trapped alive, voice contact | E+1:45 | Adult; same void as V-17 |
| V-19 | Suspected trapped | None | Roster indicates resident of affected unit; presence unconfirmed |

**Shoring priority:** Tier 1 (after gas isolation confirmed E+1:15) — access via Pile Sector B north face

### Cluster V-Cluster-7 — Pile Sector D core (deepest pile, highest risk)

| ID | Status @ E+0:00 | Last contact | Notes |
|---|---|---|---|
| V-20 to V-31 | Confirmed deceased | E+4:00 (visual confirmation) | Pile Sector D immediate-impact zone; 12 victims confirmed deceased once crews reached Floor 1 footprint |

**Shoring priority:** Tier 3 — recovery only; recovery-rate shoring at slower pace once Tier 1 active rescues stabilized

### Cluster V-Cluster-8 — Pile Sector D periphery voids

| ID | Status @ E+0:00 | Last contact | Notes |
|---|---|---|---|
| V-32 | Trapped, unknown status | E+6:30 (faint acoustic) | Single tap reported by Search Specialist; not reconfirmed |
| V-33 | Suspected trapped | None | Roster indicates resident; presence unconfirmed |
| V-34 | Suspected trapped | None | Roster indicates resident; presence unconfirmed |

**Shoring priority:** Tier 1 once Cluster 7 stabilized; deep-pile access via reverse-direction tunneling from Cluster 5

### Cluster V-Cluster-9 — Subdivision 1 (below-grade parking)

| ID | Status @ E+0:00 | Last contact | Notes |
|---|---|---|---|
| V-35 | Trapped alive, voice contact | E+5:00 (post-debris-clear) | Adult M, vehicle service worker; void confirmed at SubD-1 NW corner |
| V-36 | Trapped alive, voice contact | E+5:00 | Adult F, same void as V-35 |
| V-37 | Suspected trapped | None | Vehicle records suggest occupant; unconfirmed |

**Shoring priority:** Tier 1 — requires concurrent rigging + cribbing of pile above to safely access SubD-1

### Cluster V-Cluster-10 — Pile Sector A floor 4 void (late discovery)

| ID | Status @ E+0:00 | Last contact | Notes |
|---|---|---|---|
| V-38 | Trapped alive, voice contact discovered E+18:00 | E+18:00 | Adult F; not on initial roster; void discovered during OP3 deep search |
| V-39 | Trapped alive, voice contact | E+18:00 | Adult M; same void as V-38; reports back injury, can't move |
| V-40 | Suspected trapped | None | Possible child based on family roster of V-38 |

**Shoring priority:** Tier 1 (OP3 onward) — emergent priority shift; competes with ongoing Cluster 5/9 work for cutting-table capacity

## Cluster-to-pile-sector summary

| Cluster | Sector | Floor / level | Tier | Discovered |
|---|---|---|---|---|
| V-Cluster-1 (V-01, V-02) | A | 8 | 1 | OP1 (E+0:18) |
| V-Cluster-2 (V-03, V-04) | A | 6 | 1 | OP1 (E+1:30) |
| V-Cluster-3 (V-05, V-06, V-07) | N wing cleavage | 11 | 1 | OP1 (E+0:12) |
| V-Cluster-4 (V-08–V-13) | N wing cleavage | 7–9 | 2 | OP1 (E+0:15) |
| V-Cluster-5 (V-14, V-15, V-16) | C | SubD-1 / vehicle pocket | 1 | OP1 (E+2:10) |
| V-Cluster-6 (V-17, V-18, V-19) | B | SW void | 1 (post-gas-iso) | OP1 (E+1:45) |
| V-Cluster-7 (V-20–V-31) | D core | 1–3 | 3 (recovery) | OP2 (E+4:00) |
| V-Cluster-8 (V-32, V-33, V-34) | D periphery | 4–7 | 1 | OP2 (E+6:30) |
| V-Cluster-9 (V-35, V-36, V-37) | C / SubD-1 | NW corner | 1 | OP2 (E+5:00) |
| V-Cluster-10 (V-38, V-39, V-40) | A | 4 | 1 (OP3 emergent) | OP3 (E+18:00) |

## How victims are referenced in the app

Each shore point label includes the cluster ID where applicable, e.g.:

- `SP-022 — Pile Sector A west, Floor 8 access [V-Cluster-1]`
- `SP-114 — Pile Sector C vehicle pocket east [V-Cluster-5]`
- `SP-187 — Pile Sector D periphery NE Floor 6 [V-Cluster-8]`

The app's current SP `label` field accepts up to 200 chars (per `database.rules.json`), so the cluster tag fits. `mod-ist` and `mod-struct` will flag during hotwash that **a dedicated victim-locator schema** (rather than label-embedded cluster IDs) would be a v4.0.0 NEW item.

## Rescue priority decision tree (for `mod-struct` to benchmark)

The IC + Rescue Branch Director use these tiers when assigning resources:

1. **Tier 1 — Live contact, confirmed void, safe-to-enter:** Maximum resources; bypass other work
2. **Tier 1-conditional — Live contact, void access requires emergent shoring:** Concurrent shoring + rescue planning
3. **Tier 1-emergent — Late-discovered live contact:** Shift resources from lower priorities at next safe pause
4. **Tier 2 — Probable live victims (acoustic, roster but unconfirmed):** Standard pace
5. **Tier 3 — Recovery only:** Slower pace, safer-side shoring, scheduled around Tier 1/2 demand
