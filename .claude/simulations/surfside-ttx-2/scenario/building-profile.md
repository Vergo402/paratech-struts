# Building Profile — Surfside TTX-2

> ⚠️ **Training-only.** Building, occupancy, address, and structural details are fictional. Geometry mirrors the general envelope of a 1980s-era coastal Florida residential mid-rise for instructional realism only.

## Building summary

| Attribute | Value |
|---|---|
| Designation (sim) | **Building A — "Pinecrest Tower"** |
| Address (sim) | 8800 Block, Generic Avenue, Generic Coastal Municipality, FL |
| Year built (sim) | 1981 |
| Occupancy class | R-2 (residential, multi-family condominium) |
| Stories | 12 above grade + 1 below-grade parking subdivision |
| Footprint | ~140 ft × ~190 ft, L-shaped (south wing + north wing) |
| Units (total) | 136 residential units (12 floors × ~11 units/floor avg) |
| Units estimated occupied at collapse | 84 (overnight, mid-week) |
| Construction type | Type IB — flat slab on columns, reinforced concrete, no shear walls, brick + stucco exterior |
| Foundation | Augered concrete piles on shallow sand-and-shell substrate, salt-table groundwater within 3 ft of grade |
| Roof | Flat membrane over concrete slab |

## Collapse mechanism (sim scenario)

At **E+0:00 (01:22 local)**, the **south wing** undergoes a progressive pancake collapse triggered by column-slab connection failure at the pool-deck transfer zone (lower-floor parking subdivision). Collapse propagates upward as each floor slab loses support, in roughly **12-second sequence**. The north wing remains structurally intact but loses several units along the cleavage line (Division Alpha/Bravo boundary). Approximately **55 of the 136 units** are destroyed or rendered unrecoverable; ~30 units in the cleavage zone are evacuated.

The collapse footprint creates a **debris pile** approximately:
- 180 ft east-west × 85 ft north-south
- 22–35 ft above grade (multiple voided sub-floors)
- Concentrated denser at the southeast quadrant (pile sector D)

The pile contains pancaked slab segments, residual column stubs, plumbing trees, HVAC equipment, furnishings, vehicles from the parking subdivision, and natural-gas service connections (one suspected active leak at the southwest service stub).

## ICS geographic divisions (NIMS doctrine — see plan.md Appendix A)

Per NIMS, Divisions are geographic. The sim establishes these divisions:

### Exterior (sides — clockwise from address-facing)

- **Division Alpha (A)** — Front / address-facing (north side, intact north wing)
- **Division Bravo (B)** — Address-left (west side, partial collapse face along cleavage)
- **Division Charlie (C)** — Rear (south side, full collapse face, pile abuts neighboring lot)
- **Division Delta (D)** — Address-right (east side, full collapse, pile abuts seawall)

### Vertical

- **Division 1** — Above-grade ground floor (lobby + units 101–108)
- **Division 2 through Division 12** — Floors 2–12 (collapsed where south wing was; intact in north wing)
- **Subdivision 1 (SubD-1)** — Below-grade parking subdivision (~80% buried under debris)

### Pile sectors (for shore-point clustering)

The collapsed pile is subdivided for operational management:

- **Pile Sector A** — Northwest quadrant of debris (lighter pile, ~22 ft tall, structural slabs upright)
- **Pile Sector B** — Southwest quadrant (gas service stub — active hazard)
- **Pile Sector C** — Northeast quadrant (vehicles from parking subdivision, dense)
- **Pile Sector D** — Southeast quadrant (densest, ~35 ft tall, suspected highest victim concentration)

## Standing hazards (drive `mod-struct` + Safety Officer attention)

| Hazard | Location | Severity | Mitigation in scenario |
|---|---|---|---|
| Active natural gas leak | SW service stub, Pile Sector B | **Critical** | Utility shutoff requested E+0:30; partial isolation confirmed E+1:15 |
| Unsupported slab cantilever | N wing Floor 7, Division Bravo cleavage | High | Exclusion zone until Bravo emergency shoring |
| Salt-saturated debris | Entire pile (groundwater intrusion) | Med | PPE / waterproof boots; cribbing rot risk over multi-day op |
| Suspended concrete fragments | Pile Sector D, multiple voids | High | Continuous spotter; pause cuts during wind gusts >25 mph |
| Cracked exterior balcony rails | N wing floors 4–11, all divisions | Med | Restrict approach; do not load |
| Adjacent seawall undermining | Division Delta edge | Med | Survey at E+8:00; defer rescue Sector D-Delta until shored |
| Vehicle fluid release | Pile Sector C, SubD-1 | Low–Med | Absorbent boom; defer ignition source operations within 25 ft |

## Weather (sim)

| Time | Wind | Temp | Precip | Visibility | Notes |
|---|---|---|---|---|---|
| OP1 (E+0–E+4, overnight) | Calm, 2–5 mph from SE | 78 °F | None | Clear, low cloud | Coastal humidity; lighting required |
| OP2 (E+4–E+16, day shift) | 8–14 mph from SE | 78 → 89 → 82 °F | None | Clear, full sun | UV index 10; rehab pressure |
| OP3 (E+16–E+28, night shift) | Building to 18 mph; **gust to 28 mph at E+22** | 82 → 76 °F | Brief shower E+24:30 (15 min) | Reduced after shower | Lighting + shower delay cuts |
| OP4 (E+28–E+36, day 2) | 10–15 mph from SE | 76 → 88 °F | None | Clear | Heat advisory issued by NWS |

## Reference materials in scenario

- [Victim profile](victims.md) — 40 modeled victims clustered by priority + shore-point linkage
- [Timeline / event clock](timeline-event-clock.md) — master E+ schedule

## Suggested SP creation pace

The collapse footprint supports roughly **250 shore-point operations** distributed across the pile sectors + the cleavage emergency-shoring on the N wing. Per-OP budget (conductor enforces):

| OP | SP target | Rationale |
|---|---|---|
| OP1 | ~30 | Initial recon + cleavage emergency shoring (N wing Bravo); first probes into Pile Sector A (lightest) |
| OP2 | ~110 | Mass deploy as State TF + Federal Alpha arrive; primary shoring across Sectors A, C, partial D |
| OP3 | ~80 | Sustained ops; deep work in Pile Sector D; continued Sector B (post-gas-isolation) |
| OP4 | ~30 | Sustained cuts + emergency shoring redo in cleavage as fatigue/weather degrade earlier work |
