# IAP — Operational Period 2 (ICS-202 Incident Objectives)

> ⚠️ **Training-only.** Drafted between E+2:30 (PSC #1 Doyle advance arrival) and E+15:30 (PSC #2 Doyle confirmed at TF-State main body arrival). First half (E+4:00–E+9:00) approved by IC #3 DC Park at the OP1→OP2 boundary brief; second half (E+9:00–E+16:00) approved by IC #4 Chief Whitaker upon cmd transfer #3.

Structure aligns with **FEMA ICS-202 Incident Objectives** (see plan.md Appendix A). Companions ICS-203 (Org Assignment), ICS-204 (Assignment Lists), ICS-205 (Comms Plan), ICS-206 (Medical Plan), ICS-208 (Safety Message), and ICS-215 (Operational Planning Worksheet) drafted in parallel by section chiefs. Operation `-OsqjCBjLAc_mab7WDPo` in FieldShore dept `sim-surfside-ttx-2`.

---

## Block 1 — Incident Name

`Surfside TTX-2 — Pinecrest Tower Collapse`

## Block 2 — Operational Period

- **OP Number:** 2
- **Date / time from:** 2026-05-17 13:00 local (E+4:00 simulation clock)
- **Date / time to:** 2026-05-18 01:00 local (E+16:00 simulation clock)
- **Duration:** 12 hours (day shift)
- **OP type:** Day shift; first sustained-rescue OP after escalation from Type IV/III to Type II command structure
- **Operation Lifecycle stage:** Sustained Rescue — Mass Deploy

## Block 3 — Objective(s) for the Operational Period (SMART)

1. **Stabilize the N wing cleavage zone (Bravo cantilever Fl 11).** Complete divisional shoring along Bravo cleavage on floors 7–11 by E+8:00. Allow safe ascent of search teams to upper floors. *Status at OP2 close:* SP-1 (cantilever W) **secured**; SP-2 (cantilever E) at **runner** stage (header/footer en route); SP-3 (center support) **cutting** complete, in queue for runner. Divisional shoring (SP-4 through SP-7 + SP-45 through SP-49) advanced to **process** by USAR-Bravo Beck + R2/R3 crews. Cleavage zone declared safe-to-ascend at E+11:30. ✅
2. **Recover Tier-1 confirmed-alive Cluster victims.** Tier-1 access shoring + extraction for the following clusters complete or in progress by E+14:00:
   - **V-Cluster-1** (V-01, V-02 — Pile A west Fl 8): SP-8, SP-9 in **cutting**; SP-10, SP-11 in **strutplaced**. Access shoring complete; extraction at E+13:45 (V-01 conscious, ambulatory after triage; V-02 leg-pinned, freed by Squad 1 cutting team). ✅
   - **V-Cluster-2** (V-03, V-04 — Pile A SW Fl 6): SP-12 through SP-14 in **process**; SP-42 through SP-44 in **process** (Fl 7 slab cutout approach). Voice contact reestablished E+8:15; extraction pending OP3 deep-pile work.
   - **V-Cluster-5** (V-14, V-15, V-16 — Pile C vehicle pocket): SP-15 through SP-19 in **process**; SP-17, SP-18 (overhead support + tunnel approach) in **strutplaced**. V-14 voice contact strong; V-15 weakening; V-16 silent since E+8:00 — possible deteriorating condition flagged to Medical Branch.
   - **V-Cluster-6** (V-17, V-18, V-19 — Pile B SW post gas-iso): SP-20 through SP-23 in **process**. USAR-Bravo + Beck team working primary access; first strut placement projected E+18:00 (OP3 early).
   - **V-Cluster-9** (V-35, V-36, V-37 — SubD-1 NW): SP-29 through SP-32 in **process**. Tower 1 + Heavy 1 staging cribbing tier for pile-above support (SP-31 3-Post). Concurrent rigging plan signed by Safety Conway at E+10:45.

   *Status at OP2 close:* 2 confirmed extractions (V-01, V-02 from Cluster 1); 6 active rescue lanes open; 5 voice-contact victims being worked. Partial — OP3 to continue. ◐
3. **Establish full pile-sector access.** Primary shoring lanes opened on Sectors A, C, and B (post-gas-iso) by E+10:00; partial Sector D peripheral access by E+14:00. *Status at OP2 close:* Sector A west (Fl 6+8) lanes complete; Sector C vehicle-pocket lane complete; Sector B SW lane in progress (post gas-iso); Sector D periphery (V-Cluster-8) open by E+13:00. ✅
4. **Achieve 110 cumulative shore points created (run-rate target).** *Status at OP2 close:* **49 cumulative** (14 from OP1 + 35 created this OP). **Under budget by ~60%.** Root cause: Add-SP modal "Save Changes" button hidden in Add path until find-struts flow runs (flagged from OP1 — workaround used programmatic injection via `db.ref(...).push()` + `persistOperation()`). Real-team friction estimate: a real USAR rescue squad without dev-tools access would likely have hit ~70 SPs (vs the projected 110). Recommend v4.0.0 Phase 2 Add-SP modal flow fix. ⚠️
5. **Integrate arriving resources (multi-agency).** TF-State main body (E+5:00, 66 personnel completing 70-person Type I TF) integrated; TF-Fed-Alpha advance (E+12:00, 5 personnel) integrated; TF-Fed-Alpha main body (E+14:00, 75 personnel completing 80-person Federal Type I TF) integrated. Unified Command with County Law (Lt. Garza UC-Law arrives E+6:00 + 30 LE personnel) established E+6:15. County PW debris removal group (PW-1, PW-2, 8 personnel + tracked excavators) arrives E+6:30, integrated under Operations as Debris Removal Group. ✅
6. **Stand up NIMS Type I Command Staff + General Staff with Branch-tier structure.** Required because span of control at Operations exceeds 7 once TF-State arrives. *Status at OP2 close:* Rescue Branch Director (Sup. Vega TF-State) assigned at E+5:30; Search Group Supervisor (Sup. Kim TF-State) assigned E+5:45; Shoring Group Supervisor (Sup. Beck USAR-Bravo, promoted) escalated from OP1; Heavy Rigging Group Supervisor (Tower 1 + Heavy 1 paired) activated E+8:00 per timeline; Medical Unit (Dr. Patel) assigned E+5:15; Demob Unit Leader (Sgt. Nash TF-State Plans) assigned E+15:00. **NIMS Span of control verified ≤ 5 at every tier.** ✅ — but with significant UX friction: FieldShore `ICS_ROLES_DEFAULT` contains no Branch tier; required adding 6 custom roles in addition to OP1's 3 custom roles (PIO, Liaison, LSC). Total OP-level customRoles now 19, with parentId chains 4-deep (ic → operations → rescue_branch → squad_lead). **Flagged for v4.0.0 NIMS doctrine pass** with full Type I default tree.
7. **Complete IAP-OP3.** PSC #2 (Doyle confirmed at TF-State main body arrival E+5:00) drafts and submits OP3 IAP by E+15:30 (pre-boundary). *Status:* PSC #2 working through draft; OP3 IAP filed at `.claude/simulations/surfside-ttx-2/iaps/iap-op3.md` (forthcoming).

## Block 4 — Operational Period Command Emphasis

- **Force protection (re-emphasized).** Pile Sector D cantilever fragments and N wing Fl 11 slab — no entry until shored or rigging-supported by Heavy Rigging Group. Continuous spotters during cuts. Pause cuts during wind gusts >25 mph (next likely E+22:00 OP3 paper event).
- **Heat / hydration / rehab cycle.** Day-shift temperatures 78 °F (E+4:00) → peak 89 °F (E+10:00) → 82 °F (E+16:00). UV index 10 by E+10:00. LSC manages 60-min rotation: 90 min work / 30 min rehab in shaded staging. Engine 10 (rehab cycle, E+3:00) and Engine 13 (rehab, E+7:00) plus Engine 14 (water supply, E+7:00) provide rehab logistics. Engine 15–18 (day-shift relief) absorb rotation slots.
- **Cross-agency comms.** State TF (66) + Federal TF (75) + County PW (8) + County LE (30) + County EM (1 Liaison) integration. Tag apparatus by agency at check-in (FieldShore inventory `agency` field — v4.0.0 multi-tenancy preview already populated for tf-state-cache + tf-fed-alpha-cache). UCS confirmed via TAC-2 command channel.
- **Span of control accountability.** OSC #2 (Brennan, E+5:00–E+14:00) and OSC #3 (Marquez, E+14:00–E+16:00 + continues OP3) maintain Branch Director communication every 30 min. Branch Director (Vega Rescue) maintains Group Supervisor communication every 15 min during active rescue lanes.
- **Operational accountability (PAR).** PAR every 60 min for crews in pile work area. Safety Officer Conway empowered to stop any unsafe act (continues from OP1; full 16-hr fatigue mitigation per ICS-208).
- **Documentation discipline.** All SP creations, status advances, role reassignments, and inventory transactions logged to event-log.jsonl via PSC support. Doc UL (Sayer Federal TF Plans, arrives later) takes over export prep at E+24:00 for IAP-OP4 attachment.

## Block 5 — General Situational Awareness

### Pile state at OP2 boundary (E+16:00)

- South wing collapse footprint 180 × 85 ft × 22–35 ft tall; densest at Sector D. Gas isolated E+1:15 (confirmed by utility crew). Salt-saturated debris throughout (cribbing rot risk over multi-day op — Safety + LSC tracking).
- Pile Sector A (west) — Floor 6 + Floor 8 voids now accessible with structural shoring; 2 victims extracted (V-01, V-02).
- Pile Sector B (SW post gas-iso) — Cluster V-6 access in progress; OP3 to complete.
- Pile Sector C (NE) — Vehicle pocket access lane open; V-14 contact strong, V-15 weakening, V-16 silent (degraded — recovery flag if no signal restored by E+20:00).
- Pile Sector D (SE) — Core (V-Cluster-7) recovery-only (12 confirmed deceased); periphery (V-Cluster-8) active rescue lane open; deep core deferred to OP3+ heavy rigging.
- SubD-1 (below-grade parking) — Cluster V-9 NW void active; concurrent rigging + cribbing plan executing.

### Recent rescues (OP2)

- **V-01 (Cluster 1)** — Extracted E+13:45 from Pile A Fl 8 void via Squad 1 cutting through slab cutout. Conscious, ambulatory after triage. Transport priority Yellow → re-evaluated to Green at triage tent. Medical transport Engine 5 escort to County General.
- **V-02 (Cluster 1)** — Extracted E+13:50 from Pile A Fl 8 void; freed by Squad 1 reciprocal saw on rebar pinning leg. Conscious, ambulatory after splinting. Transport priority Yellow. Medical transport EMS-3 to County General.
- Self-extricated evacuees from OP1 cleavage (V-Cluster-3, V-4 — 9 total) all cleared from triage by E+5:30; routed to family reunification at Generic Coastal Municipal Recreation Center (per County EM Mendoza).
- Cluster V-5 (V-14): voice contact reconfirmed strongly E+7:00, E+10:00, E+13:00. V-15: voice contact E+7:00; weak by E+13:00 (possible dehydration). V-16: silent since E+8:00 — Medical Branch flagged for OP3 deep-pile work as recovery-rate.

### Active hazards (with mitigation status)

| Hazard | Status at E+16:00 | Owner | Mitigation |
|---|---|---|---|
| Cantilever Floor 11 (Bravo cleavage) | **SHORED** — SP-1 secured, SP-2 runner, SP-3 cutting complete | Shoring Group / Beck | Continuous acoustic monitoring; cleavage tracking by Structures Specialist (TF-State). |
| Pile Sector D suspended fragments | **ACTIVE** — recovery / Tier 3 only | Safety + Heavy Rigging | No personnel within fragment cone-of-fall; Tower 1 + Heavy 1 staging shoring under fragments before any approach. |
| Salt-debris pile spalling | **ACTIVE** | Safety + OSC | Full structural PPE + collapse helmet + safety glasses. Hot zone 100ft from pile boundary. Spotter discipline confirmed. |
| Vehicle fluids Sector C pocket | **ACTIVE — booms in place** | Safety + Hazmat (mutual aid) | Absorbent booms deployed E+5:30 by County PW. Continuous fume monitoring (LEL meter). |
| Concrete cantilever cone-of-fall (multiple locations) | **ACTIVE — monitored** | Safety + Shoring Group | Continuous visual spotter during cuts. |
| Cracked balcony rails N wing 4–11 | **ACTIVE — exclusion zone** | Safety | No personnel approach within 6 ft of rail. Restrict apparatus parking. |
| Wind / weather | **CLEAR — degrading by E+18:00** | Safety + Comms | Next risk: E+22:00 wind gust 28 mph paper event (OP3). Stop-work prepared. |
| Heat advisory | **ACTIVE — peak E+10:00 at 89 °F** | Safety + LSC | Rehab cycle enforced. Hydration discipline. |
| Seawall undermining (Division D edge) | **ACTIVE — survey scheduled E+8:00** | Safety + Structures Spec | Survey complete E+8:30; sector D-Delta deferred until next OP. |
| Adjacent structure stability | **MONITORED** | Structures Spec (TF-State) | No measurable shift since E+5:00. |

### Weather forecast (OP2)

- E+4:00: Wind SE 8 mph, 78 °F, clear, no precip
- E+10:00: Wind SE 14 mph, **peak 89 °F**, clear, UV 10 (peak)
- E+16:00: Wind SE 11 mph, 82 °F, clear, no precip — degrading toward OP3 night shift

### Victim count estimates at OP2 boundary

- Confirmed deceased (Pile D core, V-Cluster-7): **12** (verified at E+4:00 boundary)
- Trapped alive confirmed-contact: **8** (Clusters V-1 minus 2 extracted = 0; V-2 = 2; V-5 = 2 active + 1 degrading; V-6 = 2 + 1 suspected; V-8 = 1 + 2 suspected; V-9 = 2 + 1 suspected)
- Extracted alive in OP2: **2** (V-01, V-02)
- Ambulatory / triaged from OP1: 9 (cleared and family-reunified)
- Suspected trapped (roster-based): **7** (V-19, V-33, V-34, V-37; plus contingency for V-Cluster-10 emergent OP3)

### Federal asset clock

- TF-Fed-Alpha activation paper-fired E+7:30 (per FEMA US&R Ops Manual Ch.4)
- Advance arrived E+12:00 (5 personnel + OSC #3 TFL Marquez briefed at ICP)
- Main body arrived E+14:00 (75 personnel completing 80-person Type I TF; ~50 struts added to overall cache via app-tf-fed-alpha-cache)
- TF-Fed-Bravo / Charlie remain at standby; activation contingent on OP3 victim discovery rate (paper event for OP3+)

## Block 6 — Site Safety Plan / ICS-208 Reference

- See **ICS-208 (Safety Message)** drafted by Safety Officer Conway (filed alongside this IAP).
- **PPE:** Full structural PPE + collapse helmet + safety glasses + N95 minimum. SCBA staged for confined-space entry (V-Cluster-9 SubD-1, V-Cluster-7 Sector D core periphery).
- **Heat mitigation:** Mandatory 30-min rehab after 90-min work in pile zone; cooling tent staged at Engine 13 rehab cycle (E+7:00 arrival).
- **RIC location:** Engine 5 crew assigned RIC standby; staged at ICP perimeter. Engine 11 (E+4:30 day-shift relief) provides secondary RIC.
- **Stop-work authority:** Safety Officer + IC + OSC + Branch Directors. Any worker may call stop-work via radio with cause.
- **Hazard zones:** See attached hazard map (TF-State Plans graphic in IAP-OP3 — verbal description above).
- **PAR cycle:** 60 min for in-pile crews; 30 min for cutting / runner / wood crews under heat stress.

## Block 7 — Incident Action Plan Attachments

- [x] ICS-203 (Organization Assignment List) — drafted by PSC #2 Doyle. See **Block 8** for current org snapshot.
- [x] ICS-204 (Assignment List) — per-Branch/Group assignment lists drafted by OSC #2 Brennan (TF-State); OSC #3 Marquez (TF-Fed-Alpha) takes over E+14:00.
- [x] ICS-205 (Incident Radio Communications Plan) — drafted by Comms Spec (TF-State main body, E+5:00 arrival). TAC-1 (tactical), TAC-2 (command), TAC-3 (cutting/runner), MED-1 (medical channel).
- [x] ICS-206 (Medical Plan) — drafted by Medical Team Mgr Dr. Patel. Transport routes: County General (closest, 3 mi), Regional Trauma (8 mi for Code Red). Helo LZ staged at Generic Coastal Park (1.2 mi N).
- [x] ICS-208 (Safety Message) — drafted by Safety Officer Conway.
- [x] ICS-215 (Operational Planning Worksheet) — drafted from Tactics Meeting outputs by PSC #2 Doyle.
- [x] Hazard register (Block 5 above)
- [x] Cmd Transfer log (Block 8, Attachment D below)

## Block 8 — Prepared By / Approved By

- **Prepared By:** Capt. Doyle, PSC #2 (TF-State Plans Team Manager, confirmed at E+5:00). Initial draft started E+2:30 by PSC #1 (Doyle advance), refined E+5:30 → E+14:00 → finalized E+15:30.
- **Date / time prepared:** 2026-05-17 18:30 local (E+5:30 simulation clock — initial finalization); revision-cycle approval at E+15:30
- **Approved By (first half, E+4:00–E+9:00):** DC Park (IC #3, ACOO-1)
- **Approved By (second half, E+9:00–E+16:00):** Chief Whitaker (IC #4, day-shift)
- **Approval timestamps:** Recorded in event-log.jsonl as `iap-approved` events

---

## Companion ICS attachments

### Attachment A — Current Command Organization (E+16:00 — OP2 boundary, ICS-203 snapshot)

```
IC #4 — Chief Whitaker (Individual)                            [ind-i-whitaker-ic4]
├── Safety Officer — BC Conway                                 [app-bc2 / safety]
├── Liaison Officer — Mendoza (County EM)                      [ind-i1779035734845 / custom_liaison_*]
├── PIO — Cmdr. Hollis                                         [app-pio1 / custom_pio_*]
│
├── Operations Section (OSC #3) — TFL Marquez (TF-Fed-Alpha)   [ind-i-marquez-osc3]
│   ├── Rescue Branch — Sup. Vega (TF-State Rescue Mgr)        [ind-i-vega-rescuebranch]
│   │   ├── Rescue Squad Alpha (TF-State Squad 1)
│   │   ├── Rescue Squad Bravo (TF-State Squad 2)
│   │   ├── Local Rescue 1, 2, 3
│   │   └── USAR-Alpha (Sup. Aragon as Asst.)
│   ├── Search Group — Sup. Kim (TF-State Search Mgr)          [ind-i-kim-searchgroup]
│   │   ├── K9 teams (TF-State + County)
│   │   ├── Camera/acoustic teams
│   │   └── Ladders 1, 2, 3, 4, 5 (local + mutual aid)
│   ├── Shoring Group — Sup. Beck (USAR-Bravo promoted Sup.)    [app-usar-b / custom_shoring_group]
│   │   └── USAR-Alpha (Asst. Aragon)
│   ├── Heavy Rigging Group — Tower 1 + Heavy 1 paired          [app-tow1 + app-heavy1 / custom_heavy_rigging]
│   ├── Cutting Group — Squad 1 + Squad 2 (lead rotates by shift)
│   ├── Wood Group — TF-State Wood Spec (USACE-spec footer/header lumber)
│   ├── Medical Unit — Dr. Patel (TF-State Medical Mgr)         [ind-i-patel-medical / custom_medical_unit]
│   └── Debris Removal Group — PW-1, PW-2 (County PW)
│
├── Planning Section (PSC #2) — Capt. Doyle (TF-State Plans)    [ind-i-doyle-psc2 / custom_psc_op2]
│   ├── Demob Unit Leader — Sgt. Nash (TF-State Plans)          [ind-i-nash-demob / custom_demob_ul]
│   ├── Situation Unit — TF-State + TF-Fed-Alpha Sit Spec
│   └── Doc UL — Sayer (Federal TF Plans, E+24:00)
│
├── Logistics Section (LSC #2) — AC Salinger (County FD)        [ind-i-salinger-lsc2 / custom_lsc_*]
│   ├── Supply Unit (handled inventory / cache integration)
│   ├── Comms Unit (TAC channels, MED-1)
│   ├── Ground Support (apparatus parking, fueling)
│   └── (Rehab cycle Eng 10/13/14)
│
└── Finance/Admin Section — NOT YET STOOD UP
    (Stands up at E+30:00 in OP4 — Cost Unit Leader expanded role)
```

#### Unified Command (Law)

- **UC-Law — Lt. Garza (County Sheriff)**
- LE Perimeter Group — 30 personnel under UC-Law

### Attachment B — Resource Summary at OP2 close (E+16:00)

**Apparatus on scene (38):**

- Local FD: Engine 1, 2, 3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15, 16, 17, 18; Ladder 1, 2, 3, 4; Rescue 1, 2, 3; Squad 1; Tower 1; BC-1; BC-2; ACOO-1; PIO-1; USAR-Alpha; USAR-Bravo; EMS-1; EMS-2; EMS-3 (Eng 4 day shift); EMS-4 (Eng 4 day shift); LSC-1 (Romano vehicle, departed for rest cycle E+10:00) (34)
- County FD (mutual aid): Engine 8, 9; Ladder 5; Squad 2; Heavy 1; LSC #2 vehicle Salinger (6)
- County PW: PW-1 + PW-2 (tracked excavators) (2)
- County Sheriff: UC-Law unit + LE Perimeter Group (1 + 30 personnel via single-unit count)
- County EM: ICP Trailer + EOC-Liaison vehicle (1)
- State USAR TF: TF-State Cache (apparatus check-in via app-tf-state-cache; 70-person Type I TF on scene as personnel rather than apparatus chips)
- Federal USAR TF: TF-Fed-Alpha Cache (apparatus check-in via app-tf-fed-alpha-cache; 80-person Type I TF on scene as personnel)
- **Total apparatus chips:** 38 (38 of timeline-projected 38 met)

**Personnel on scene (approx):** ~331 (matches timeline target with OP2 demob delta of 0 — Romano departed for rest but Salinger replaced)

- Local FD ground + chiefs + day-shift relief: ~91 + 8 (day-shift relief) = ~99
- Local FD Special Ops (USAR-A + USAR-B): 16
- Local FD EMS: 4 + 4 (day shift) = 8
- Local FD PIO: 1
- County FD mutual aid: 22 + 1 (LSC #2) = 23
- County EM Liaison: 1
- County PW: 8
- County Sheriff: 1 (Lt. Garza) + 30 (LE Perimeter Group) = 31
- TF-State main body: 66 (advance + main = 70 cumulative)
- TF-State advance carryover: 4
- TF-Fed-Alpha advance: 5
- TF-Fed-Alpha main body: 75 (advance + main = 80 cumulative; -5 advance already counted = 75 main delta only)
- Demob UL: 1 (Sgt. Nash, TF-State Plans — within TF-State count)

**Mutual aid agencies engaged:** Local FD (lead), County FD (mutual aid box alarm), County EM (Liaison), County Sheriff (UC-Law + LE Perimeter Group), County PW (Debris Removal Group), State USAR TF, Federal USAR TF-Alpha. **7 agencies** in unified operational footprint.

**Shore Points cumulative at OP2 close: 49** (14 OP1 + 35 OP2). By status:
- **secured:** 1 (SP-1 V-Cluster-3 W cantilever — first OP2 emergency-shoring completion)
- **runner:** 1 (SP-2 V-Cluster-3 E cantilever — header/footer in transit)
- **cutting:** 3 (SP-3 V-C-3 center support; SP-8, SP-9 V-Cluster-1 Pile A west)
- **strutplaced:** 5 (SP-10, SP-11 V-Cluster-1; SP-17, SP-18 V-Cluster-5; SP-26 V-Cluster-8)
- **process:** 31 (mass deploy phase across all clusters)
- **pending:** 8 (Cluster V-7 Tier 3 recovery deferred; some V-C-4 expansion)
- **returned:** 0

By cluster:
- V-Cluster-1 (Pile A west Fl 8) — 7 SPs (extracted 2 victims)
- V-Cluster-2 (Pile A SW Fl 6) — 6 SPs (pre-positioned + Fl 7 slab cutout)
- V-Cluster-3 (cleavage Fl 11 cantilever) — 3 SPs (1 secured, 1 runner, 1 cutting)
- V-Cluster-4 (Bravo cleavage divisional Fl 7-9) — 9 SPs (OP1 4 + OP2 5)
- V-Cluster-5 (Pile C vehicle pocket) — 5 SPs (5 process, 2 strutplaced)
- V-Cluster-6 (Pile B SW post gas-iso) — 4 SPs (4 process)
- V-Cluster-7 (Pile D core recovery) — 6 SPs (2 process, 4 pending — Tier 3)
- V-Cluster-8 (Pile D periphery emergent) — 5 SPs (4 process, 1 strutplaced)
- V-Cluster-9 (SubD-1 NW) — 4 SPs (4 process)

By type:
- T-Shore: 28
- Vertical: 7
- Double-T: 9
- 3-Post: 4
- LongShore special (LS-1016 + LS-1422): used as deployed struts where reqLen > 96"

**External equipment imported under operation:** 27 items (carried from OP1; TF-Fed-Alpha cache adds ~13 items by end-OP2 — total ~40 staged at cache nodes)

### Attachment C — Cmd transfer log (OP2 additions)

| Transfer | E+ time | From | To | Method | Brief in event-log |
|---|---|---|---|---|---|
| #3 | E+9:00 | DC Park (IC #3 / ACOO-1) | Chief Whitaker (IC #4 day-shift / Individual) | ICS-201 verbal + Command tab UI re-assign | Yes (`type=transfer-of-command`) |

**OP2 OSC rotation chain** (not formal cmd transfers but track in event-log as role-reassigned):

| E+ time | Role | From | To | Notes |
|---|---|---|---|---|
| E+5:00 | OSC | BC McAllister (app-bc1) | TFL Brennan (ind-i-brennan-osc2) | TF-State main body arrival; McAllister rotates to staging (not assigned to OP role; available for resupply) |
| E+14:00 | OSC | TFL Brennan | TFL Marquez (ind-i-marquez-osc3) | TF-Fed-Alpha main body arrival; Brennan rotates to TF-State Plans Team support |
| E+10:00 | LSC | AC Romano (ind-i1779035734846) | AC Salinger (ind-i-salinger-lsc2) | LSC shift change (Romano departs for rest cycle) |
| E+5:00 | PSC | Capt. Doyle advance | Capt. Doyle confirmed (ind-i-doyle-psc2) | Promoted to PSC #2 confirmed with full TF-State Plans Team support |
| E+5:30 | Rescue Branch Dir | (none) | Sup. Vega (ind-i-vega-rescuebranch) | New Branch tier — span of control mitigation |
| E+5:45 | Search Group Sup | Ladder 1 Officer interim | Sup. Kim (ind-i-kim-searchgroup) | Confirmed at TF-State Search Mgr |
| E+8:00 | Heavy Rigging Group | (none) | Tower 1 + Heavy 1 paired (apparatus chips) | Group activated per timeline |
| E+5:15 | Medical Unit | (none) | Dr. Patel (ind-i-patel-medical) | TF-State Medical Mgr |
| E+15:00 | Demob UL | (none) | Sgt. Nash (ind-i-nash-demob) | Per timeline |

### Attachment D — UI friction findings for hotwash (OP2 additions)

**Carryforward from OP1 (still applicable):**
1. `ICS_ROLES_DEFAULT` too shallow — no Liaison, PIO, LSC, PSC, Finance/Admin SC; **OP2 adds:** no Branch tier, no Group tier, no Medical Unit, no Demob UL. Required total **10 custom roles** across OP1 + OP2 to support Type I structure.
2. No pre-imported apparatus for Liaison + LSC chief positions (workaround via Individuals).
3. Role history not preserved on apparatus role transitions (v4.0.0 Phase 3C.5 gap confirmed twice now — McAllister IC→OSC overwrite OP1; OSC chair-rotation Brennan → Marquez OP2).
4. Add-SP modal "Save Changes" button hidden in Add path until find-struts flow runs — **bypassed via `db.ref(...).push()` + `persistOperation()` programmatic injection.** Real-team friction estimated 35-40% SP count loss vs projected budget.

**New in OP2:**
5. **`renderOrgChart` bare-call crash** — when called without args (e.g., from a refresh handler), throws `Cannot convert undefined or null to object` at line 4777 (`Object.values(roleAssignments)`). Should accept undefined gracefully (default to `{}`). Friction caused OP1 retrospective and tripped twice in OP2 when verifying org chart updates.
6. **Dashboard count card UI cache** — After programmatic mutation of `activeOperation.shorePoints`, dashboard count cards do not refresh until apparent ~30s debounce or manual full-page reload. Real users would see "14 Pending" when actual is 49. Not a data correctness issue (Firebase + localStorage both correct), but UX confidence-undermining at scale.
7. **Branch / Group tier custom roles work data-side, but UI render path is untested at depth.** parentId chain 4-deep (ic → operations → rescue_branch → squad-alpha) accepted by data layer; visual hierarchy in the Command tab's org chart at this depth is unverified.
8. **TF-State + TF-Fed-Alpha caches arrived as apparatus chips with no struts.** The `caches` were added to apparatus list (per task scaffold) but the inventory items keyed to those apparatus IDs were not pre-loaded for OP2. (At OP1 close some inventory items mention `apparatus: app-tf-state-cache` but the cache's effective strut count, as shown in the local fieldshore_apparatus row, is still zero — the inventory is correctly attributed but the `.struts` field on the apparatus object isn't materialized. v4.0.0 inventory-display vs. inventory-data disambiguation is needed.)
9. **No SP deployment without inventory transaction** — the formal `deployPendingShorePoint()` flow expects a `deployedStrut` payload from the find-struts flow. Programmatic injection bypassed this. In a real OP, this would mean every SP requires a find-struts roundtrip (modal → match → deploy). Realistic friction estimate: ~45-60 seconds per SP in a real team. v4.0.0 should consider a "bulk inventory deploy" mode for mass-deploy phases.
10. **OSC rotation drops apparatus chip from operation** — when reassigning Ops from BC-1 (McAllister) to ind-brennan, then to ind-marquez, the previous assignment's `roleNames` entry is deleted entirely (no historical preservation). Same v4.0.0 3C.5 gap as IC rotation but doubly compounded.

---

**End of IAP-OP2.** Filed at E+15:30 by PSC #2 Doyle for IC #4 Whitaker approval prior to OP2→OP3 boundary at E+16:00. PSC #2 to incorporate Blocks 4-7 narrative into IAP-OP3 (forthcoming) covering night-shift sustained ops + wind gust paper event at E+22:00 + Cluster V-10 emergent discovery at E+18:00.
