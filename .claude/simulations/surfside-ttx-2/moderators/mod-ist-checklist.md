# `mod-ist` Observation Checklist — FEMA IST / Inter-Agency Plans Chief

> Reference: FEMA US&R Operations Manual Sep 2012 (plan.md Appendix B/C/D); ICS Form Descriptions (plan.md Appendix A); MASTER-PLAN Phase 3B (multi-tenancy) + 3C (NIMS) + 3D (ICS forms export).
>
> **Mode:** silent observation. Notes appended to `notes/moderator-mod-ist-notes.jsonl`.

## Premise

The FEMA Incident Support Team (IST) deploys to support a major incident. The IST is staffed by experienced ICS personnel from across the federal system. They arrive (in this sim: E+26 IST Demob Coordinator, E+27 IST-Plans) AFTER the local + state + federal TFs are already operating, and they expect to integrate seamlessly using standard NIMS doctrine + standard ICS forms. **`mod-ist` evaluates the app from this incoming-fresh-IST perspective.**

## Checklist (13 items)

### Item 1 — OP IAP authorship attributable to specific PSC
- **Observe:** When the IST PSC (Bauer) arrives at E+27:00 and asks "who drafted the OP4 IAP and when?", can the app or its artifacts tell them?
- **Surface:** IAP file metadata + Firebase records
- **v4.0.0 Phase:** 3D.1 / **NEW**

### Item 2 — ICS-202 (Incident Objectives) draftable from app data
- **Observe:** Can the IST PSC derive an ICS-202 draft from app data alone (objectives, command emphasis, situational awareness, attached forms list, prepared/approved signatures)? Or do they need parallel paper/Word notes?
- **Surface:** Settings → Export, ICS-202 generation (if exists)
- **v4.0.0 Phase:** 3D.1

### Item 3 — ICS-203 (Organization Assignment List) live snapshot accuracy
- **Observe:** Does the app's Command tab (the closest analog to ICS-207/203) accurately reflect current org? Does it include EVERY current named position?
- **Surface:** Command tab
- **v4.0.0 Phase:** 3C / 3D.1

### Item 4 — ICS-204 (Assignment List) per Division/Group exportable
- **Observe:** Could the IST OSC produce a per-Division/Group assignment sheet for the next OP from app data?
- **Surface:** Settings → Export ICS-204 (if exists)
- **v4.0.0 Phase:** 3D.1

### Item 5 — ICS-215 (Operational Planning Worksheet) representability
- **Observe:** ICS-215 = Tactics Meeting output (resource assignments + needs for next OP). Is there an app surface for this, or does it live entirely in PSC's parallel notes?
- **Surface:** None visible (likely)
- **v4.0.0 Phase:** 3D.1

### Item 6 — ESF-9 chain visible in role history
- **Observe:** The ESF-9 SAR request is transmitted at E+3:45 and triggers federal TF activation at E+7:30. Can the app capture this chain (who requested, who acknowledged, who activated, who arrived) in role history or activity feed?
- **Surface:** Activity feed (if exists); role history
- **v4.0.0 Phase:** 3C.5 (role history) / **NEW** (ESF-9 chain)

### Item 7 — IST PSC sees same data as local PSC (multi-tenancy)
- **Observe:** When IST PSC Bauer arrives at E+27:00 and connects to the sim dept, do they see EXACTLY the same data as PSC #2 / PSC #3? Or is there a multi-tenant boundary preventing federal visibility into state-level changes?
- **Surface:** Settings → Connect dept (Bauer's perspective)
- **v4.0.0 Phase:** 3B (multi-tenancy — federal IST visibility)

### Item 8 — Demob plan draftable
- **Observe:** Demob UL Sgt. Nash (since E+15:00) + IST Demob Coordinator (E+26:00) need a place to draft TF-State release sequence. Does the app have a Demob workflow, or does it live in parallel docs?
- **Surface:** Settings → Demob (if exists)
- **v4.0.0 Phase:** 3C.4 + 3D / **NEW**

### Item 9 — Resource Status (T-Card equivalent) viewable
- **Observe:** Resources Unit Leader (under PSC) maintains T-Card status (Available, Assigned, Out-of-Service) per resource. Does the app's apparatus chip show equivalent? Can the IST OSC quickly see "which apparatus are currently available for reassignment"?
- **Surface:** Inventory tab apparatus list; Command tab
- **v4.0.0 Phase:** 3C.5 + 3C.4 / **NEW**

### Item 10 — SitStat (Situation Status) at-a-glance for incoming PSC
- **Observe:** When Bauer arrives, she needs an ICS-209-equivalent snapshot: pile status, recent rescues, weather, hazards, current/next priorities. Does the app give her this in <60 seconds?
- **Surface:** Settings → Status or some "SitStat" view
- **v4.0.0 Phase:** **NEW** (SitStat absent)

### Item 11 — Victim Locator (VLU) data tied to SP clusters
- **Observe:** Per [scenario/victims.md](../scenario/victims.md), victims are referenced by cluster ID embedded in SP labels (workaround). The IST expects a proper VLU data structure. Does the app's SP have a `victimCluster` field, or does the workaround require manual label parsing?
- **Surface:** Add SP modal; SP card
- **v4.0.0 Phase:** **NEW** (VLU data model absent)

### Item 12 — Documentation Unit export completeness
- **Observe:** Doc Unit Leader Sayer (E+35:00) must compile every record for the AAR + FEMA After-Action Report. Can he export EVERYTHING (op timeline, role history, SP lifecycle, apparatus check-in/demob, hazards, incidents, costs)?
- **Surface:** Settings → Export full op archive
- **v4.0.0 Phase:** 3D.1 (ICS forms export full)

### Item 13 — Cost/Time tracking representable
- **Observe:** Finance/Admin SC (Director Penz, E+30:00) + Time Unit + Cost Unit Leader. Does the app capture cost-bearing events (personnel hours, consumable use, apparatus deploy time) for state + federal reimbursement?
- **Surface:** None visible (likely)
- **v4.0.0 Phase:** **NEW** (Finance/Admin absent)

---

## Calibration anchors

- IST = Incident Support Team, federal-level support for major incidents
- IST roles per FEMA US&R Manual: IST Leader + Plans + Logistics + Safety + Specialist subgroups
- ICS-209 Incident Status Summary = "snapshot in time" of incident, for staff + PIO
- T-Card = traditional Resources Unit visual tracker for resource status
- FEMA After-Action Report (AAR) drives federal reimbursement + lessons-learned
- ESF-9 primary agencies: FEMA, USCG, DOI/NPS, DoD; FEMA = primary for structural collapse SAR
- Type I TF embarkation: 4hr ground / 6hr air (FEMA US&R Ops Manual Chapter 4)
- Type I TF = 70 base personnel + up to 10 ground support = up to 80 deployed
- This sim has 1 State + 3 Federal Type I TFs = up to ~290 USAR-specific personnel at peak

## Multi-agency visibility test sequence (run at OP boundaries)

At each OP boundary, simulate "incoming IST member connects to the sim" by:
1. Opening preview in a fresh browser tab (preview_eval to open new tab if possible)
2. Setting localStorage `fieldshore_deptId = 'sim-surfside-ttx-2'`
3. Reloading the app
4. Capturing what's visible from the fresh perspective via preview_snapshot
5. Comparing to the primary participant's view

Discrepancies = multi-tenancy / sync gaps for v4.0.0 Phase 3B.
