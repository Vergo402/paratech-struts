# `mod-struct` Observation Checklist — Structural Collapse SME

> Reference: Paratech O&M Manual + LongShore datasheet (load tables encoded in `app.js`, plan.md Appendix E); USACE shoring doctrine; MASTER-PLAN Phase 3E (strut algorithm enhancements).
>
> **Mode:** silent observation. Notes appended to `notes/moderator-mod-struct-notes.jsonl`.

## Checklist (12 items)

### Item 1 — 250-SP rendering at scale
- **Observe:** As cumulative SP count approaches and exceeds the prior baseline (41 SPs @ 5.6ms; F4 finding said 200+ approaches 30ms), does the Operations tab remain interactive? Measure render time via preview_eval on `performance.now()` around `renderOperations()`.
- **Surface:** Operations tab — full SP list
- **v4.0.0 Phase:** 3F / **NEW** (virtualization absent)

### Item 2 — Multi-strut group advance correctness
- **Observe:** Double-T or 3-Post shores create grouped SPs. Status advance pre-cutting (pending → process → strutplaced) should apply to all group members. Cutting workflow (cutting → runner → secured → returned) should operate individually (per v3.8.0).
- **Surface:** Operations tab — grouped SP cards
- **v4.0.0 Phase:** `none` (v3.8.0 shipped — verify no regression)

### Item 3 — LongShore unrated-zone audit trail
- **Observe:** When a deploy crosses into the LongShore unrated zone (>16 ft / 192" — per v3.5.2 NEW-2), does the app require explicit team acknowledgment AND log who acknowledged + when?
- **Surface:** Deploy modal — unrated zone gate
- **v4.0.0 Phase:** `none` (v3.10.0 — F-4B-7 fixed — verify no regression)

### Item 4 — Wedge + plate geometry consistency
- **Observe:** When `findStrutCombinations` is called with header + footer wood + top + bottom plates + wedge, does the math match Paratech O&M Manual section 2.3? Test via known-input Quick Find queries: a 96" opening with 4x4 header + 4x4 footer + hinged6 top + hinged6 bottom should produce specific strut recommendations.
- **Surface:** Quick Find tab + Deploy modal
- **v4.0.0 Phase:** 3E.1 (wedge + plate geometry consistency)

### Item 5 — qty>4 sentinel
- **Observe:** When required quantity exceeds 4 struts at given load + length, does the app surface a "qty > 4" informational warning (per v3.5.2 NEW-3) rather than silently rejecting?
- **Surface:** Quick Find result area; Deploy modal results
- **v4.0.0 Phase:** 3E.3 (recommendedQty surface; verify v3.5.2 fix still shipped)

### Item 6 — Capacity + margin surfacing
- **Observe:** Result cards should show strut capacity AND margin (capacity / load ratio). Does the app render these consistently? Does it warn when margin < 30% ("Near max")?
- **Surface:** Quick Find result cards
- **v4.0.0 Phase:** 3E.2 (always-show capacity + margin)

### Item 7 — StructSpec role visible in Plans Section
- **Observe:** TF-State StructSpec arrives at E+5:00 as part of the Plans Team (2 personnel). Can the OSC see this specialty? Or is StructSpec lumped under generic "Plans"?
- **Surface:** Command tab — Plans Section sub-roles
- **v4.0.0 Phase:** 3C.1 (NIMS preset must include StructSpec)

### Item 8 — Pancake floor labeling (Subdivision, Div Alpha–Delta)
- **Observe:** When creating SPs in the below-grade Subdivision 1 (parking) or on exterior division faces, does the app accept "SubD-1" or "Div Alpha"/"Div Bravo" labels naturally, or fight the user with form constraints?
- **Surface:** Add SP modal — Division field, Building field
- **v4.0.0 Phase:** `none` / **NEW** (per-division labeling convention)

### Item 9 — Heavy Rigging vs Cutting distinction
- **Observe:** Heavy Rigging Group (cranes, Tower 1, Heavy 1) vs Cutting Table (Squad 1, Squad 2) — distinct roles, distinct app surfaces. Does the org chart represent both clearly?
- **Surface:** Command tab — org chart Operations sub-tree
- **v4.0.0 Phase:** 3C.1 (NIMS preset must distinguish)

### Item 10 — Collapsed-floor SP exterior division reference
- **Observe:** When an SP is created on what was Floor 9 but is now in Pile Sector D core, can the participant naturally label the SP with both "Floor 9" AND "Pile Sector D" + "Bravo side"? Or does the app force a single Building/Floor field?
- **Surface:** Add SP modal — Building/Floor/Area fields
- **v4.0.0 Phase:** **NEW** (post-collapse geometry labeling)

### Item 11 — Victim-tied SP traceability
- **Observe:** SP labels include `[V-Cluster-N]` tags (per scenario/victims.md). Does the app preserve these tags through filter/search/export? Could you find "all SPs supporting V-Cluster-5"?
- **Surface:** Operations tab — SP filter / search; Inventory export
- **v4.0.0 Phase:** **NEW** (no Victim Locator Unit data model)

### Item 12 — Hazards log capture + export
- **Observe:** The scenario has 7 standing hazards (gas leak, cantilever, salt debris, suspended fragments, balcony rails, seawall, vehicle fluids). Does the app have any hazard-log surface today? If created in OP2, does it export with the ICS-203 / ICS-208?
- **Surface:** (None visible — flag as gap if absent)
- **v4.0.0 Phase:** 3D.1 (hazards log in ICS-208) / **NEW**

---

## Calibration anchors

- AT 12-15 / 19-25 / 25-36 / 37-58 / 56-88 — 5 AcmeThread models
- LS 203 / 304 / 406 / 610 / 812 / 1016 — 6 LongShore models
- LK 19-25 / 25-36 / 37-58 / 55-89 — 4 LockStroke models
- ACME LOAD TABLE corrected v3.5.2 (Table 2-7 match)
- LONGSHORE LOAD TABLE corrected v3.5.2 NEW-2 (Dec 2019 datasheet match)
- Conservative-floor interpolation since v3.7.2 (replaced linear)
- Wedge deduction = 1.5" (constant, top-of-app.js)
- USACE 3-Post = 6x6 header + 6x6 footer (auto-fill since v3.9.1)
- T-Shore + Double-T = no auto-fill (operator choice per v3.9.1)
