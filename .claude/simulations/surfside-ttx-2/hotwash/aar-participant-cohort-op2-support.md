# AAR — Participant Cohort: OP2 Support (LSC / Safety / Liaison)

> Army-AAR format. Cohort lead voice. Drafted at hotwash Phase 1 after E+36:00 event-clock halt. ⚠️ Training-only.

---

## Subject identification

- **Cohort ID:** `op2-support-cohort` (composed of `lsc-op2`, `safety-op2`, `liaison-op2`)
- **Personae:**
  - **LSC** — AC Romano (E+4:00 → E+10:00) → AC Salinger (E+10:00 → E+16:00, county FD relief)
  - **Safety Officer** — BC Conway (continues from OP1; full 12-hour OP2 + OP3 + OP4 carryover)
  - **Liaison Officer** — Mendoza (County EM; arrives E+6:00)
- **Active window:** E+4:00 → E+16:00 (Liaison from E+6:00)
- **Submission date / wall-clock:** 2026-05-17 (hotwash phase 1)

## Operational period(s) covered

OP2 only (sustained-rescue mass-deploy day shift), with Conway's OP1 carryover context.

---

## Question 1 — What was supposed to happen?

Per **IAP-OP2** (ICS-202, 4,157 words) and the per-role overlays for `lsc-op2`, `safety-op2`, `liaison-op2`, the support cohort had three parallel mandates:

**LSC (Romano → Salinger)** — track inventory consumption as SPs deployed, coordinate cache integration as TF-State main body (E+5:00) and TF-Fed-Alpha main body (E+14:00) arrived, order resupply if any item category dropped below 10 available. Drive the rehab-cycle logistics (Engine 10 / 13 / 14) supporting the 90-min-work / 30-min-rehab cadence under heat advisory. Romano departs E+10:00 for rest cycle; Salinger replaces — clean LSC rotation.

**Safety (Conway)** — monitor the org chart for any attempt to reparent Safety away from IC (block + warn); track active hazards (gas iso confirmed E+1:15, cantilever Fl 11, salt-debris spalling, vehicle fluids Sector C, concrete cone-of-fall, balcony rails, heat advisory peak 89 °F at E+10:00, seawall undermining D-edge); issue stop-work for any unsafe condition; sign concurrent-rigging plans (Tower 1 + Heavy 1 paired with cribbing tier for V-Cluster-9 SubD-1 pile-above support at E+10:45).

**Liaison (Mendoza)** — primary mandate per overlay: **multi-agency apparatus tagging by originating agency** (preview of v4.0.0 multi-tenancy). When mutual aid arrived — TF-State main body, TF-Fed-Alpha main body, County PW (PW-1/PW-2 + 8 personnel), County Law (Lt. Garza + 30 LE), County FD relief (LSC #2 Salinger), County EM (ICP Trailer + EOC-Liaison vehicle) — ensure each apparatus chip reflected its originating agency in the FieldShore inventory `agency` field. Coordinate with UC-Law on perimeter / security integration. Test agency-tag round-trip end-to-end (mod-data observing).

13 custom roles were expected to exist at OP2 close (Doyle PSC #2 confirmation, Vega Rescue Branch, Kim Search Group, Beck Shoring Group escalation, Tower-1+Heavy-1 Heavy Rigging Group, Patel Medical Unit, Nash Demob UL, plus carryforward Liaison/PIO/LSC from OP1 + the OSC chair-rotations on the individual side). First secured SP was projected E+14:30 (SP-1 V-Cluster-3 W cantilever).

---

## Question 2 — What actually happened?

The support cohort hit its operational beats but exposed a different friction surface than the command cohort — one that doesn't show up in the SP-budget number but is doctrinally more severe.

**LSC rotation** (Romano → Salinger, E+10:00) executed clean on schedule. Salinger picked up the Inventory tab, tracked the TF-Fed-Alpha cache arrival at E+14:00 (~50 struts added at app-tf-fed-alpha-cache), and managed rehab logistics through the 89 °F peak at E+10:00. **But:** the LSC #2 chair (Salinger) had **no pre-imported apparatus** — `app-lsc2` did not exist. Workaround was the same as OP1's Liaison and LSC #1 — attach Salinger via the Individuals subsystem (`ind-i-salinger-lsc2`) and assign to a `custom_lsc_*` role. This is the **second time in the incident** a chief-level position had to be hung off the Individuals subsystem instead of an apparatus row, and it's not the last.

**Safety (Conway)** carried forward from OP1 cleanly — no Safety reparent attempts to block, hazard tracking proceeded by radio + verbal (no in-app hazard log surface; v4.0.0 gap), concurrent rigging plan signed E+10:45. **But:** when Conway carried forward from OP1 IC #3 (Park) attribution to OP2 IC #4 (Whitaker) attribution at E+9:00, the `roleNames['app-bc2']` entry was updated without preserving the prior IC #3 association. This is the **same v4.0.0 Phase 3C.5 role-history gap** flagged by OP1 — Safety confirmed it for the second time on the Safety chair.

**Liaison (Mendoza)** is the most severe finding of the support cohort. Mendoza arrived E+6:00 per timeline and her primary mandate was **multi-agency apparatus tagging**. Within OP2 we onboarded six new agencies into the operational footprint:

- **State USAR TF** (app-tf-state-cache arrival E+5:00, 70-person Type I TF)
- **Federal USAR TF-Alpha** (app-tf-fed-alpha-cache arrival E+14:00, 80-person Type I TF)
- **County FD** (LSC #2 Salinger + Engine 8/9, Ladder 5, Squad 2, Heavy 1)
- **County Sheriff** (UC-Law Garza + LE Perimeter Group, 31 personnel)
- **County PW** (PW-1/PW-2 + 8 personnel, Debris Removal Group)
- **County EM** (ICP Trailer + EOC-Liaison vehicle — Mendoza's own home agency)

The mandate was: every apparatus chip carries an `agency` field, every inventory item inherits `agency` from its parent apparatus, every Firebase write attributes correctly. The reality: **agency tagging was entirely absent**. The `agency` field exists on the inventory items at the TF-State and TF-Fed-Alpha cache level (mod-data confirmed) but **was not visible on the apparatus chip UI, was not enforced on apparatus creation, and had no in-app surface for Liaison to view or edit**. Mendoza's primary mandate had no tool to execute against. She spent OP2 cross-referencing apparatus arrivals against a paper sheet and verbal radio confirmation — the exact workflow v4.0.0 multi-tenancy is meant to replace.

Other concrete findings from the support cohort across the 12 hours of OP2:

- **No pre-imported apparatus** for: Liaison (`app-eoc-liaison` — flagged OP1, still missing OP2), LSC #2 (`app-lsc2` — new OP2 finding), IC #4 (Whitaker hung off Individuals, not an apparatus row — `ind-i-whitaker-ic4`), OSC #2 (Brennan hung off Individuals — `ind-i-brennan-osc2`), OSC #3 (Marquez — `ind-i-marquez-osc3`), PSC #2 (Doyle — `ind-i-doyle-psc2`), Rescue Branch Director (Vega — `ind-i-vega-rescuebranch`), Search Group Sup (Kim — `ind-i-kim-searchgroup`), Medical Unit (Patel — `ind-i-patel-medical`). **Nine chief-level positions** in OP2 alone hung off Individuals subsystem, doctrinally weak for full Type I structure.
- **Role history not preserved** confirmed **four additional times in OP2** beyond OP1's first confirmation: IC #3→#4 transition (Park's prior IC role on ACOO-1 overwritten), OSC McAllister→Brennan (BC-1's prior OSC role overwritten), OSC Brennan→Marquez (Brennan's prior OSC role overwritten — and Brennan rotated to TF-State Plans Team support with no in-app trace), LSC Romano→Salinger (Romano's prior LSC role overwritten — and Romano departed scene with no trace of having held LSC #1). **Cumulative confirmation count by OP2 close: 5 of 5 expected transitions.** The Phase 3C.5 gap is reproducible at 100% rate.
- **No agency tagging UI surface** — Mendoza's primary mandate. The `agency` field exists in data, but Inventory tab does not display it on apparatus chips, Inventory items list does not group by agency, there is no agency filter, there is no agency-coverage report (e.g., "TF-State has X struts, of which Y are in active SP deployments").
- **Custom-role total: 13 at OP2 close** (3 from OP1 carry + 6 new Branch/Group/Unit + 4 individual-chair customs for chief-level positions hung off Individuals). All accepted by data layer; UI render path at depth 4+ unverified by `mod-ux`.
- **First secured SP at E+14:30** (SP-1 V-Cluster-3 W cantilever) — on schedule per IAP-OP2 Objective 1. Safety Conway signed off on the cleavage-zone safe-to-ascend declaration at E+11:30.

---

## Question 3 — Why was there a difference?

The biggest gap — **agency tagging absence** — is squarely **app, not coordination**. The data model has the `agency` field; the UI does not surface it. This is a deliberate v4.0.0 multi-tenancy preview that was scaffolded into the inventory caches but never wired through to the user-facing apparatus and inventory views. Mendoza could not execute her primary mandate because the tool didn't have the surface.

The **nine chief-level positions hung off Individuals** is a doctrinal gap — `apparatus` is the canonical anchor for command positions in NIMS / FEMA Type I structure (vehicle, callsign, chair). The app currently treats `apparatus` as a fleet-truck concept and `individuals` as a person concept, which fails to model the doctrinal reality that an IC, OSC, PSC, LSC, FASC each occupies a chair that is itself a resource. The Individuals subsystem becomes the catch-all for "we need to put a person somewhere", which works at small scale and breaks at Type I scale.

**Role history preservation** is the same v4.0.0 Phase 3C.5 gap, now confirmed at six total transitions (OP1 ×1 + OP2 ×5). The data model treats role assignments as scalars rather than time-keyed logs; every transition is destructive of prior state. For an after-action review on a real incident, this would be a documentation-discipline failure — there would be no in-app trace of who held what role when. Doc UL Sayer (arriving OP3) will hit this hard.

The LSC #2 missing apparatus is a **roster scaffolding gap** — the apparatus list was seeded with chief positions for OP1 expectations only and was not extended to cover the OP2 rotation chain. The county FD's LSC #2 Salinger is a known incoming role per the scenario timeline; he should have an apparatus row pre-staged.

Persona / coordination was strong. Romano executed clean inventory tracking through E+10:00 before rotating out. Salinger picked up cleanly. Conway maintained Safety discipline throughout — concurrent-rigging signoff, hazard tracking, no Safety reparent attempts to block. Mendoza did everything she could without a tool — the gap is the absence of the tool, not Mendoza's effort.

---

## Question 4 — What can we learn from it / what should change?

**App changes (cite v4.0.0 phase tags):**

- **Agency tagging UI surface** — Liaison's primary mandate. Apparatus chip shows `agency` field. Inventory tab groups by agency. Agency filter on apparatus / inventory queries. Agency-coverage report (struts per agency, deployments per agency, demob readiness per agency). **Phase 3B.1**, **severity: high**. This is the v4.0.0 multi-tenancy preview that scaffolded into the data model but did not surface in the UI.
- **Pre-import canonical chief-level apparatus rows** for full Type I structure: `app-ic-day`, `app-ic-night`, `app-osc-2`, `app-osc-3`, `app-psc-2`, `app-lsc-2`, `app-fasc-1`, `app-rescue-branch`, `app-search-group`, `app-shoring-group`, `app-heavy-rigging-group`, `app-medical-unit`, `app-demob-ul`, `app-doc-ul`, `app-eoc-liaison`. **Phase 3C.1**, **severity: high**. Eliminates the Individuals-subsystem catch-all for chief-level positions.
- **Role history preservation** (carry from OP1+OP2 command cohort; OP2-support confirms five additional transitions) — keyed log per apparatusId / individualId with `{role, assigned_at, assigned_by, cleared_at, cleared_by}`. **Phase 3C.5**, **severity: high**. 6/6 transitions confirmed lossy; reproducible at 100% rate.
- **Hazard log in-app surface** — Safety Officer needs a structured hazard register (hazard, status, owner, mitigation, last verified). Currently radio + verbal only. **Phase 3E / NEW**, **severity: med**.
- **Concurrent-rigging plan signoff in-app** — Safety signs off on rigging plans (V-Cluster-9 SubD-1 cribbing-tier + pile-above support type) with timestamp + acknowledged by. **Phase 3E / NEW**, **severity: low**.
- **Agency-coverage / cache-readiness reporting** — for demob planning, LSC needs "which agency's cache has what, and what's deployed" by agency dimension. **Phase 3B.1 / 3D**, **severity: med**.

**Doctrine / scenario changes:**

- The Liaison role overlay (`liaison-op2`) should be revised after v4.0.0 multi-tenancy ships — currently the overlay's primary mandate (agency tagging round-trip) cannot be executed and that should be a known finding rather than a participant blocker.
- The roster scaffolding should pre-stage **every chief-level apparatus row the scenario timeline anticipates** before the simulation starts, not just OP1's roster. This is a TTX-cycle process improvement.

---

## Cross-reference

- **Linked SP IDs:** SP-1 V-Cluster-3 W cantilever (first secured SP at E+14:30). All 35 OP2 SP creations bear on LSC inventory tracking but Liaison's mandate was apparatus-side, not SP-side.
- **Linked IAP:** `iaps/iap-op2.md` (4,157 words; Block 5 hazard register tracked by Conway, Block 6 ICS-208 reference signed by Conway, Block 7 ICS-203 Org Assignment listing all 13 custom roles).
- **Linked event-log entries:** LSC rotation E+10:00 (Romano → Salinger); apparatus arrivals E+5:00 (TF-State cache), E+6:00 (Mendoza), E+6:30 (County PW), E+14:00 (TF-Fed-Alpha cache); concurrent rigging signoff E+10:45 (Conway).

---

## Synthesis tags (for the Phase 2 merge)

```
tag: Agency tagging UI surface on apparatus chips and inventory grouping (Liaison primary mandate) | phase: 3B.1 | severity: high
tag: Pre-import canonical chief-level apparatus rows for full Type I structure (15+ rows) | phase: 3C.1 | severity: high
tag: Role history preservation — 6 of 6 transitions confirmed lossy (100% reproducible) | phase: 3C.5 | severity: high
tag: Hazard log in-app surface for Safety Officer (structured register) | phase: 3E / NEW | severity: med
tag: Concurrent-rigging plan signoff in-app with timestamp | phase: 3E / NEW | severity: low
tag: Agency-coverage / cache-readiness reporting for LSC demob planning | phase: 3B.1 / 3D | severity: med
tag: Roster scaffolding pre-stages all chief-level apparatus rows scenario anticipates | phase: NEW (TTX process) | severity: med
tag: Liaison overlay mandate (multi-agency tag round-trip) blocked by absent UI surface — revise after 3B.1 ships | phase: 3B.1 | severity: med
```
