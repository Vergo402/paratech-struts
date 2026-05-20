# IAP — Operational Period 3 (ICS-202 Incident Objectives)

> ⚠️ **Training-only.** Drafted between E+12:00 (PSC #2 Capt. Doyle initial pass) and E+27:30 (PSC Federal Mgr final approval after IST PSC Bauer augmentation arrival at E+27:00). OP3 spans the night shift (E+16:00 → E+28:00, 12 hours). First half (E+16:00–E+21:00) approved by IC #4 Chief Whitaker prior to OP2→OP3 boundary at E+15:45; second half (E+21:00–E+28:00) re-approved by IC #5 Chief Vasquez upon cmd transfer #4 (E+21:00).

Structure aligns with **FEMA ICS-202 Incident Objectives** (see plan.md Appendix A). Companion ICS-203 (Org Assignment), ICS-204 (Assignment Lists per Branch/Group), ICS-205 (Night-Ops Comms Plan), ICS-206 (Medical Plan), ICS-208 (Night-Ops Safety Message), and ICS-215 (Operational Planning Worksheet) drafted in parallel by section chiefs. Operation `-OsqjCBjLAc_mab7WDPo` in FieldShore dept `sim-surfside-ttx-2`.

---

## Block 1 — Incident Name

`Surfside TTX-2 — Pinecrest Tower Collapse`

## Block 2 — Operational Period

- **OP Number:** 3
- **Date / time from:** 2026-05-18 01:00 local (E+16:00 simulation clock)
- **Date / time to:** 2026-05-18 13:00 local (E+28:00 simulation clock)
- **Duration:** 12 hours (night shift)
- **OP type:** Night shift; sustained-rescue OP with two Federal TF integrations (Bravo + Charlie), emergent priority pivot (V-Cluster-10), and demob planning standup
- **Operation Lifecycle stage:** Sustained Ops — Mass Deploy continuing + Tier 1/3 transition + Demob Planning kickoff

## Block 3 — Objective(s) for the Operational Period (SMART)

1. **Maintain Tier-1 victim contact / extraction tempo through night shift.** Continue access shoring for all surviving confirmed-alive clusters; sustained voice contact with V-Cluster-1 (closed at OP2 close — V-01 + V-02 extracted), V-Cluster-2 (V-03 + V-04 in Pile A Fl 6), V-Cluster-5 (V-14 strong, V-15 weakening, V-16 silent — recovery flag), V-Cluster-6 (V-17 + V-18 + suspected V-19 post-gas-iso), and V-Cluster-9 (V-35 + V-36 + suspected V-37 SubD-1 NW) maintained through E+24:00. *Status at OP3 close:* All Tier 1 clusters with live contact maintained voice contact through OP3; no degradations of live signals beyond the V-16 silent flag carried from OP2 (medical now classifies V-16 as recovery-rate effective E+22). V-03 + V-04 (Cluster 2) access shoring complete by E+24 — voice contact strong; extraction projected OP4 E+30-32. V-14 (Cluster 5) extraction E+25:30; conscious, transported to County General. V-15 (Cluster 5) extraction E+26:45; weakened, hyperhydration in field; Regional Trauma transport. V-17 + V-18 (Cluster 6) extracted simultaneously at E+22:30 via Pile B SW access lane (USAR-B + TF-State Rescue Squad Alpha). V-35 + V-36 (Cluster 9) extraction E+26:00 + E+26:15 from SubD-1 NW (Tower 1 + Heavy 1 concurrent rigging operation). ✅
2. **Establish deep-pile access in Sector D.** Open primary shoring lane to Pile Sector D core (Cluster V-7 recovery zone) by E+22:00; complete Cluster V-8 periphery access by E+26:00. *Status at OP3 close:* TF-Fed-Bravo (E+20:00 main body) directs Sector D access shoring throughout OP3 with TF-State Heavy Rigging Group support. Cluster V-8 periphery access lane (SP-50 through SP-56) open by E+26:00 — 7 SPs through pre-cutting and cutting workflow phases; voice contact with V-32 not reconfirmed (carried from OP2); V-33 + V-34 remain suspected per roster. Pile D core (V-7 recovery) approach lane opened by E+22:30; 5 SPs (SP-77 through SP-81) created at slower Tier 3 recovery pace, supported by TF-Fed-Charlie cache resources from E+25 onward. ✅
3. **Integrate two additional Federal TFs.** TF-Fed-Bravo (E+18:00 advance with TFL Okafor; E+20:00 main body — completes 80-person Type I TF) takes over portions of Sector D + cleavage zone deep work; TF-Fed-Charlie (E+24:00 advance; E+25:00 main body — completes third Type I TF) staged as relief for OP4 plus immediate support to V-Cluster-7 recovery. *Status at OP3 close:* Both TFs integrated. TF-Fed-Bravo Cache (app-tf-fed-bravo-cache) drew down by ~24 inventory items across V-Cluster-7 + V-Cluster-8 work. TF-Fed-Charlie Cache (app-tf-fed-charlie-cache) held in reserve through E+25:00; activated E+25:30 onward for V-Cluster-7 deep-pile work. Federal TF span-of-control verified ≤ 5 at every tier per NIMS Type I doctrine. ✅
4. **Achieve cumulative ~80-130 shore points (run-rate target).** *Status at OP3 close:* **83 SPs cumulative** (49 from OP1 + OP2; 34 new this OP3). Under stretch target of 130; within base range of 80-130. Root cause persists from OP1 + OP2: Add-SP modal "Save Changes" button hidden in Add path until find-struts flow runs. Bypassed for the third operational period running via programmatic `db.ref().push()` + `persistOperation()` documented workaround. Realistic real-team friction estimate remains 35-40% SP-count loss without dev-tools access; a real OP3 night-shift team would likely have hit ~55-60 SPs (vs the 80-130 base/stretch range), yielding 73 cumulative vs simulated 83. Recommend v4.0.0 Phase 2 Add-SP modal flow fix REMAINS CRITICAL. ⚠️
5. **Pivot to emergent priority on Cluster V-10 discovery** (paper event at E+18:00, late voice contact on Floor 4 Pile A) — shift one rescue squad + cutting capacity to support V-10 within 90 minutes of discovery without abandoning ongoing Tier-1 work. *Status at OP3 close:* Voice contact established with V-38 + V-39 at E+18:00 by Search Specialist (Kim's team). Rescue Branch Director Vega (with OSC #4 Marquez authority during E+18-E+21 window) shifted TF-Fed-Alpha Rescue Squad Bravo + one cutting station from V-Cluster-2 secondary work to V-Cluster-10 emergent priority by E+19:30 — within the 90-min window. 6 access shoring SPs (SP-50 through SP-55) created in V-Cluster-10 between E+18:15 and E+19:10. V-38 extraction E+25:30 (back injury, immobilized; ambulance transport to Regional Trauma); V-39 extraction E+26:00 (conscious; County General). V-40 (child, suspected per family roster) — search ongoing into OP4. ✅
6. **Begin demob planning.** Demob UL Sgt. Nash (active since E+15:00) submits draft TF-State demob plan to PSC #3 (Federal Plans Mgr) by E+24:00 for OP4 discussion. *Status at OP3 close:* Nash drafted preliminary TF-State demob plan covering: (a) night-shift personnel release sequence (TF-State Search team eligible for release first, given V-10 + V-1 + V-2 + V-6 voice-contact saturation by OP4); (b) apparatus release dependencies (Tower 1 + Heavy 1 cannot release until V-7 recovery work complete; Rescue 1/2/3 day-side reset prior to OP4); (c) cache resource accounting (TF-State Cache items 14 of 46 struts deployed; recovery plan for OP4 reconciliation). Plan formally submitted to PSC Federal Mgr at E+24:00 per task; IST Demob Coordinator (Branch Chief Hall, arrives E+26:00) reviews and supplements at E+26:45. **Significant UX friction discovered: app has no Demob UI surface (Settings, Operations, Inventory, Command all lack demob lifecycle). All demob planning lives in Google Sheets + paper docs.** ✅ (objective met) / ⚠️ (UI gap confirmed)
7. **Manage night-ops fatigue and weather.** Day-shift crews rehabbed by E+22:00; night-shift IC + OSC fresh starting E+21:00. Weather: wind gust to 28 mph expected E+22:00 (brief pause), rain 15 min at E+24:30. *Status at OP3 close:* Day-shift IC #4 Whitaker handed off to night-shift IC #5 Chief Vasquez at E+21:00 (ICS-201 transfer + Command tab UI re-assign). OSC #3 Marquez handed off to OSC #5 Asst. TFL Bishop at E+21:00 (TF-Fed-Alpha leadership rotation). TF-State half (35 personnel) rotated to rehab E+23:00 per timeline. **Wind gust 28 mph fired at E+22:00 (paper event):** Safety Officer Conway issued stop-work for Sector D cutting + cribbing operations via radio TAC-2 channel; cuts paused ~12 min; all-clear E+22:12. **Rain 15 min fired at E+24:30:** Cutting saws powered down manually by Cutting Group lead; visibility reduced ~30%; resumed E+24:45. **Confirmed v4.0.0 gap: no stop-work UI feature in FieldShore today.** ✅ (operational handling complete) / ⚠️ (UI gap confirmed)
8. **Complete IAP-OP4.** PSC #3 (Federal Plans Mgr, augmented by IST PSC Bauer at E+27:00) drafts and submits OP4 IAP by E+27:00. *Status at OP3 close:* IST PSC Bauer arrives E+27:00 (FEMA IST-Plans, 3 personnel total). Augments PSC #3 with FEMA-perspective input on OP4 demob discussion + cost/time tracking standup. Draft IAP-OP4 submitted E+27:30, blocks 1-5 populated; blocks 6-8 pending OP4 boundary briefing. IAP-OP4 to be filed at `.claude/simulations/surfside-ttx-2/iaps/iap-op4.md`. ◐ (in progress)

## Block 4 — Operational Period Command Emphasis

- **Night-ops lighting and visibility.** Generator-powered scene lighting deployed by E+16:30 (TF-State Logistics standup; primary lighting from LSC-1 + Engine 14 + portable tower lights). High-vis tape on all shoring and PPE confirmed by Conway prior to night-shift entry. Lumen plan reviewed by OSC #5 Bishop at start-of-shift briefing E+21:15. Cutting Table area illuminated at 500 lux; pile work areas at 200 lux. Headlamps required on every member in pile work zone. ICS-208 night-ops safety message distributed via TAC-1.

- **Wind gust pause + weather safety.** E+22:00 wind gust paper event (28 mph): Conway issued temporary stop-work for Sector D crews via radio. Cuts paused ~12 min. Spotters confirmed pile stability before resume at E+22:12. Cable tension on Tower 1 rigging cables monitored continuously through OP3 for any wind-induced sway. E+24:30 rain (15 min): Cutting saws powered down for moisture / electrical safety; resumed at E+24:45 after towel-dry verification. Wind sock at ICP monitored continuously; Conway authorized to issue stop-work for any subsequent wind event >25 mph or any gusting condition.

- **Federal TF coordination at three-TF scale.** Three Federal TFs on scene (TF-State + TF-Fed-Alpha + TF-Fed-Bravo) plus TF-Fed-Charlie in reserve from E+25:00. Span-of-control discipline: OSC #5 Bishop maintains Branch Director communication every 30 min during active rescue lanes; Branch Director Vega maintains Group Supervisor communication every 15 min. Three TF Leaders (TFLs Brennan / Okafor / Marquez or Bishop) brief at each shift change. ICP integration: Federal TF caches now physically co-located at South Staging (per Liaison Mendoza coordination with County PW debris removal of southern apron area completed E+19:30).

- **Demob hygiene begins NOW.** Demob UL Sgt. Nash directed to maintain rolling demob log for all on-scene apparatus and personnel categories. Categories: ready-for-release (apparatus + cache items not deployed beyond E+20 work); pending-release (apparatus still actively assigned but with declining utility); critical-hold (Tower 1, Heavy 1, TF-Fed-Bravo cache items currently deployed in Sector D — cannot release until shoring decommission). Demob planning does NOT mean apparatus leaves. It means planning documentation begins so OP4 release sequence is orderly.

- **Span of control accountability.** OSC #4 Marquez (E+14:00-E+21:00) and OSC #5 Bishop (E+21:00 onward) maintain Branch Director communication every 30 min. Branch Director Vega (Rescue) maintains Group Supervisor communication every 15 min during active rescue lanes. New: Medical Branch Director Dr. Patel (escalated from Medical Team Manager at E+16:10) reports to OSC #5 directly (Medical Branch parented under operations per NIMS Type I doctrine).

- **Cross-agency accountability and PAR.** PAR every 60 min for crews in pile work area; 30 min for cutting / runner / wood crews under fatigue / night-shift stress. Safety Officer Conway empowered to stop any unsafe act (continues from OP1 + OP2). New: IST Demob Coordinator Branch Chief Hall (arrives E+26:00) adds federal oversight for any cross-TF resource transfer decisions.

- **Documentation discipline.** All SP creations, status advances, role reassignments, and inventory transactions logged to event-log.jsonl via PSC support. Doc UL Sayer (Federal TF Plans) arrives E+24:00 and takes over export prep + role history reconstruction for IAP-OP4 attachment. **Critical:** Doc UL must reconstruct role history from event-log.jsonl outside the app — role transitions in FieldShore overwrite without preservation (v4.0.0 Phase 3C.5 gap; documented).

## Block 5 — General Situational Awareness

### Pile state at OP3 boundary (E+28:00)

- South wing collapse footprint 180 × 85 ft × 22–35 ft tall; densest at Sector D. Gas isolated E+1:15. Salt-saturated debris throughout — cribbing rot tracking by Safety Conway + LSC Salinger; first inspections passed at E+18:00 and E+24:00 (12-hour cycle); next inspection scheduled E+30:00 in OP4.
- **Pile Sector A (west) — Floor 6 + Floor 8 voids:** Fl 8 access lanes (Cluster 1) decommissioning (V-01 + V-02 extracted OP2 E+13:45/E+13:50). Fl 6 access lanes (Cluster 2) reached during OP3; V-03 + V-04 voice contact strong; extraction projected OP4. NEW Fl 4 access lanes (Cluster 10 emergent) opened during OP3 — V-38 + V-39 extracted E+25:30 + E+26:00.
- **Pile Sector B (SW post gas-iso) — Cluster V-6:** SP-20 through SP-23 (OP2 process) advanced through cutting → runner workflow during OP3; V-17 + V-18 extracted E+22:30 via Pile B SW access. V-19 (suspected) — search ongoing; presence still unconfirmed.
- **Pile Sector C (NE) — Vehicle pocket + SubD-1:** V-14 (Cluster 5) extracted E+25:30; V-15 (Cluster 5) extracted E+26:45 (medically degraded — Regional Trauma); V-16 silent since OP2 E+8:00 (classified recovery-rate at E+22). SubD-1 NW (Cluster 9): V-35 + V-36 extracted E+26:00 + E+26:15 via Tower 1 + Heavy 1 concurrent rigging operation (3-Post cribbing tier 1 + tier 2 supporting pile-above debris). V-37 (suspected) — search ongoing.
- **Pile Sector D (SE) — Core (V-Cluster-7) + periphery (V-Cluster-8):** Core remains recovery-only (12 confirmed deceased verified OP2 E+4:00). OP3 opened approach lane for periphery (V-8) — 7 SPs created E+20:30 onward; V-32 voice contact not reconfirmed during OP3; V-33 + V-34 (suspected) search ongoing. Core (V-7 recovery) approach opened E+22:30; 5 SPs in slower Tier 3 pace through OP3. Recovery operations projected to continue through OP4 + multi-day.
- **SubD-1 NW void:** Active rescue lane during OP3 (Cluster 9); concurrent rigging + cribbing plan executed E+19:30 onward. Heavy 1 crane lifted pile-above debris in successive 3-ft increments while USAR-Bravo deployed 3-Post cribbing tier. Successful. V-35 + V-36 extracted by E+26:15.

### Recent rescues (OP3)

- **V-17 + V-18 (Cluster 6)** — Extracted simultaneously at E+22:30 from Pile B SW void via TF-State Rescue Squad Alpha + USAR-Bravo. Both conscious, ambulatory after triage. Transport: V-17 Yellow → Green priority to County General (EMS-1 escort); V-18 Yellow priority to County General (EMS-3 escort).
- **V-14 (Cluster 5)** — Extracted E+25:30 from Pile C vehicle pocket via tunnel approach. Conscious; transport priority Yellow → Green at triage. Engine 11 escort to County General.
- **V-15 (Cluster 5)** — Extracted E+26:45 from Pile C vehicle pocket. Weakened (12+ hours dehydration). Field hyperhydration initiated; transport priority Red. EMS-4 to Regional Trauma (Code Red).
- **V-35 + V-36 (Cluster 9 SubD-1 NW)** — Extracted E+26:00 + E+26:15 via Tower 1 / Heavy 1 concurrent rigging operation. Both conscious, ambulatory after triage. Transport: V-35 Yellow priority to County General (EMS-2); V-36 Yellow priority to County General (EMS-3).
- **V-38 + V-39 (Cluster 10 — emergent OP3 priority)** — Extracted E+25:30 + E+26:00 from Pile A Fl 4 void. V-38 back injury, immobilized — transport priority Red, ambulance to Regional Trauma (Code Red). V-39 conscious — transport priority Yellow, County General (Engine 15 escort).

**OP3 extraction count: 8 alive.** Cumulative event extraction count: **10 alive** (2 OP2 + 8 OP3) plus 9 self-extricated OP1 cleavage zone evacuees. V-40 (Cluster 10 child) — search ongoing into OP4. V-19 (Cluster 6 suspected) — search ongoing. V-37 (Cluster 9 suspected) — search ongoing. V-33 + V-34 (Cluster 8 suspected) — search ongoing. V-16 (Cluster 5 silent since OP2 E+8) — recovery-rate classified by Medical Branch Director Patel at E+22. V-Cluster-7 (12 confirmed deceased) — recovery operations continuing.

### Active hazards (with mitigation status at OP3 close)

| Hazard | Status at E+28:00 | Owner | Mitigation |
|---|---|---|---|
| Cantilever Floor 11 (Bravo cleavage) | **SECURED** — SP-1 secured OP2; SP-2 secured OP3 E+22; SP-3 secured OP3 E+23. All 3 cantilever shoring SPs at secured. | Shoring Group / Beck | Continuous acoustic monitoring confirms stable. Decommissioning planned OP4 when safe. |
| Pile Sector D suspended fragments | **MITIGATED — wind-gust monitoring active** | Safety + Heavy Rigging | Wind gust E+22:00 paused cuts ~12 min; fragments remained stable. Continuous spotter discipline. Tower 1 + Heavy 1 staged rigging support. |
| Salt-debris pile spalling | **ACTIVE** | Safety + OSC | 12-hour cribbing inspections passed E+18 + E+24; next E+30. Full structural PPE + collapse helmet + safety glasses + N95. Hot zone 100ft. |
| Vehicle fluids Sector C pocket | **ACTIVE — booms in place** | Safety + Hazmat | Booms refreshed E+18; LEL meter readings normal throughout OP3. |
| Concrete cantilever cone-of-fall (multiple locations) | **ACTIVE — monitored** | Safety + Shoring Group | Continuous visual spotter during cuts. |
| Cracked balcony rails N wing 4–11 | **ACTIVE — exclusion zone** | Safety | No personnel within 6 ft of rail. Maintained throughout OP3. |
| Wind / weather (E+22 gust) | **MITIGATED — past** | Safety + Comms | 28 mph gust handled with stop-work; all-clear E+22:12. No structural shift detected. |
| Rain (E+24:30 brief) | **MITIGATED — past** | Safety + Cutting Group | 15-min rain; saws paused; resumed E+24:45. |
| Heat advisory (forecast OP4 day-shift) | **ADVISORY — OP4 carryforward** | Safety + LSC | Conway notified at E+27:00 of NWS heat advisory forecast for OP4 day-shift high 88 °F + humidity. Rehab pacing to tighten per ICS-208 OP4 update. |
| Seawall undermining (Division D edge) | **MITIGATED — survey complete OP2** | Safety + Structures Spec | Sector D-Delta deferred until structural assessment update. No measurable shift detected. |
| Adjacent structure stability | **MONITORED** | Structures Spec (TF-State) | No measurable shift since OP1. |
| Night-ops visibility | **MITIGATED** | Safety + Comms + LSC | Generator-powered lighting deployed E+16:30. Lumen plan in place. Headlamps required. |
| Cribbing rot (multi-day exposure) | **ACTIVE — monitored** | Safety + LSC | 12-hour cribbing inspection cycle in effect. Next E+30:00. No degradation detected through OP3. |

### Weather forecast (OP3 + OP4 forward)

- E+16:00 (OP3 start): Wind SE 11 mph, 82 °F, clear, no precip
- E+19:00: Wind SE 14 mph, 80 °F, clear
- E+22:00: Wind gust event — 28 mph (paper event fired)
- E+24:00: Wind SE 12 mph, 78 °F, clear
- E+24:30: Brief rain event — 15 min (paper event fired)
- E+25:00: Wind SE 10 mph, 76 °F, post-rain clearing
- E+28:00 (OP4 start): Wind SE 8 mph, 80 °F, clear; NWS heat advisory issued for OP4 day-shift high 88 °F + humidity

### Victim count estimates at OP3 boundary

- Confirmed deceased: **12** (Pile D core, V-Cluster-7 — unchanged from OP2)
- Trapped alive confirmed-contact: **0** (all live contacts extracted by E+26:45)
- Extracted alive in OP3: **8** (V-17, V-18, V-14, V-15, V-35, V-36, V-38, V-39)
- Cumulative extracted alive (event): **10** (V-01 + V-02 OP2; OP3 8 listed)
- Ambulatory / triaged from OP1: 9 (cleared OP2 E+5:30; family-reunified)
- Suspected trapped (roster-based): **5** (V-19 Cluster 6; V-33 + V-34 Cluster 8; V-37 Cluster 9; V-40 Cluster 10 child)
- Recovery-rate classification: **1** (V-16 Cluster 5 — silent since OP2 E+8:00; classified by Medical Branch Director at E+22:00)
- Recovery operations ongoing: V-Cluster-7 (12 deceased; recovery shoring + extraction projected to span OP4 + multi-day)

### Federal asset clock

- TF-Fed-Bravo activated and integrated — advance E+18:00 (5 personnel + TFL Okafor as OSC #4-relief), main body E+20:00 (75 personnel completing 80-person Type I TF). Federal TF cache app-tf-fed-bravo-cache loaded with 48 inventory items; ~24 items drawn down for V-7 + V-8 work.
- TF-Fed-Charlie activated and integrated — advance E+24:00 (5 personnel), main body E+25:00 (75 personnel completing third Type I TF). Held in reserve through E+25; activated E+25:30 for V-7 recovery and OP4 reserve.
- FEMA IST integrated — Demob Coordinator Branch Chief Hall E+26:00; IST-Plans (3 personnel, PSC Bauer augment) E+27:00.

### Resource burndown observation (LSC)

- TF-State Cache: 46 strut items at OP2 close; ~32 still available at OP3 close (14 deployed across OP3 deep-work SPs).
- TF-Fed-Alpha Cache: 48 strut items at OP2 close; ~38 still available at OP3 close (10 deployed across V-Cluster-10 emergent SPs).
- TF-Fed-Bravo Cache: 48 strut items at OP3 start; ~32 still available at OP3 close (16 deployed across V-Cluster-7 + V-Cluster-8 SPs).
- TF-Fed-Charlie Cache: 48 strut items at OP3 start; ~46 still available at OP3 close (2 deployed late E+25-E+27).
- Cumulative struts deployed across all caches + local FD apparatus through OP3: ~95-115 items (vs 49 SPs deployed at OP2 close where each may consume 1-3 struts depending on type).

## Block 6 — Site Safety Plan / ICS-208 Reference

- See **ICS-208 (Night-Ops Safety Message)** drafted by Safety Officer Conway (continues role through OP3 and into OP4). Distributed via TAC-1 at start-of-shift E+21:15.
- **PPE:** Same as OP2 + high-vis tape on PPE for night ops + headlamps required on every member in pile work zone. SCBA staged for confined-space entry (V-Cluster-9 SubD-1, V-Cluster-7 Sector D core periphery). N95 minimum.
- **Night-ops visibility:** Generator-powered scene lighting (Engine 14 + portable tower lights + LSC-1 lighting kit). Lumen requirement: 500 lux at cutting table, 200 lux at pile work area, 100 lux at staging.
- **RIC location:** Designated night-shift RIC = TF-State Rescue Squad Officer + 3 specialists (rotation off pile work for 1 OP); staged at ICP perimeter. Engine 5 secondary RIC continues from OP2.
- **Stop-work triggers:** Wind gust >25 mph (verified E+22:00 paper event handled per Conway's authority), rain >0.5"/hr (verified E+24:30 paper event handled), secondary collapse indicator (cracking sounds, debris shift), PAR shortfall, cribbing rot detection. **All stop-work issued via radio TAC-2; no in-app stop-work surface (v4.0.0 gap).**
- **Heat / hydration management:** Night-shift temperatures 76-82 °F overnight (manageable; mandatory 30-min rehab after 90 min pile work). Forecast handoff: OP4 day-shift NWS heat advisory (88 °F + humidity peak); Conway briefs PSC Bauer + IST Demob at E+27:30 for IAP-OP4 ICS-208 update.
- **PAR cycle:** 60 min for in-pile crews; 30 min for cutting / runner / wood crews under fatigue stress. **OP3 fatigue note:** Day-shift personnel rehabbed; night-shift fresh through E+24. By E+27 (3 hours from OP3 close), night-shift accumulating fatigue; OP4 night-to-day transition will require IC + OSC dual-coverage to maintain operational accountability.
- **CISM coordination:** Plan CISM team activation for OP4 (E+33:00 per timeline). Conway notes early signs of acute stress in TF-State Rescue Specialists working V-Cluster-7 recovery (12 confirmed deceased visual confirmation deep-pile work). Pre-CISM briefing recommended at OP3→OP4 boundary.

## Block 7 — Incident Action Plan Attachments

- [x] ICS-203 (Organization Assignment List) — drafted by PSC #2 Doyle; reflects TF-Fed-Bravo + Charlie additions; updated post-cmd-transfer-#4 (Whitaker → Vasquez E+21) and OSC rotation #5 (Marquez → Bishop E+21). See **Attachment A** below.
- [x] ICS-204 (Assignment List, per Division/Group) — drafted by OSC #5 Bishop, night-shift; includes new TF-Fed-Bravo and TF-Fed-Charlie group assignments.
- [x] ICS-205 (Night Ops Radio Plan) — drafted by Comms Spec (TF-State main body); TAC-2 command, TAC-1 tactical, TAC-3 cutting/runner, MED-1 medical, LIGHT-1 lighting-coord channel (new for night ops).
- [x] ICS-206 (Medical Plan) — drafted by Dr. Patel (escalated to Medical Branch Director at E+16:10). Transport routes: County General (3 mi), Regional Trauma (8 mi for Code Red). Helo LZ at Generic Coastal Park.
- [x] ICS-208 (Night Ops Safety Message) — drafted by Safety Officer Conway.
- [x] ICS-215 (Operational Planning Worksheet) — drafted by PSC #2 Doyle / PSC #3 Federal Mgr.

## Block 8 — Prepared By / Approved By

- **Prepared By:** Capt. Doyle, PSC #2 (TF-State Plans Mgr) — initial draft started E+12:00, finalized E+15:30 pre-OP2-boundary. Augmented by PSC #3 Federal TF Plans Mgr from E+16:00 onward (handoff at OP2-OP3 boundary). Further augmented by IST PSC Bauer (FEMA IST-Plans) from E+27:00 for OP4 IAP forward-planning.
- **Date / time prepared:** 2026-05-17 23:25 local (E+15:30 simulation clock — initial finalization); revision-cycle approvals at E+15:45 (Whitaker pre-boundary), E+21:00 (Vasquez at cmd transfer), E+27:30 (final after IST integration).
- **Approved By (first 5 hr, E+16:00-E+21:00):** Chief Whitaker (IC #4, day-shift continuing into OP3 night-shift start before transfer)
- **Approved By (second 7 hr, E+21:00-E+28:00):** Chief Vasquez (IC #5, night-shift, cmd transfer #4)
- **Approval timestamps:** Recorded in event-log.jsonl as `iap-drafted` (E+15:30) + `transfer-of-command` (E+21:00) + `iap-filed` (E+27:30) events

---

## Companion ICS attachments

### Attachment A — Current Command Organization (E+28:00 — OP3 boundary, ICS-203 snapshot)

```
IC #5 — Chief Vasquez (Individual)                              [ind-i-vasquez-ic5]
├── Safety Officer — BC Conway                                  [app-bc2 / safety]
├── Liaison Officer — Mendoza (County EM)                       [ind-i1779035734845 / custom_liaison_*]
├── PIO — Cmdr. Hollis                                          [app-pio1 / custom_pio_*]
│
├── Operations Section (OSC #5) — Asst. TFL Bishop (TF-Fed-Alpha)  [ind-i-bishop-osc5]
│   ├── Rescue Branch — Sup. Vega                                  [ind-i-vega-rescuebranch]
│   │   ├── Rescue Squad Alpha (TF-State Squad 1)
│   │   ├── Rescue Squad Bravo (TF-State Squad 2)
│   │   ├── Rescue Squad Charlie (TF-Fed-Bravo Squad 1, new OP3)
│   │   ├── Local Rescue 1, 2, 3
│   │   └── USAR-Alpha (Sup. Aragon as Asst.)
│   ├── Search Group — Sup. Kim                                    [ind-i-kim-searchgroup]
│   │   ├── K9 teams (TF-State + TF-Fed-Bravo + County)
│   │   ├── Camera/acoustic teams
│   │   └── Ladders 1, 2, 3, 4, 5 (local + mutual aid)
│   ├── Shoring Group — Sup. Beck                                  [app-usar-b / custom_shoring_group]
│   │   └── USAR-Alpha (Asst. Aragon)
│   ├── Heavy Rigging Group — Sup. Grayson (NEW OP3 escalation)    [ind-i-grayson-rigging]
│   │   ├── Tower 1 (Heavy Rigging crane)                          [app-tow1]
│   │   ├── Heavy 1 (Heavy Rigging crane)                          [app-heavy1]
│   │   └── TF-State Rigging Team
│   ├── Cutting Group — Squad 1 + Squad 2
│   ├── Wood Group — TF-State Wood Spec (USACE-spec footer/header)
│   ├── Medical Branch — Dr. Patel (NEW OP3 escalation)             [ind-i-patel-medical / custom_medical_branch]
│   │   └── Medical Unit (Patel was prior assignment; old role orphan)
│   └── Debris Removal Group — PW-1, PW-2 (County PW)
│
├── Planning Section (PSC #3) — Federal Plans Mgr (PSC #2 Doyle continues co-PSC)  [ind-i-doyle-psc2]
│   ├── Demob Unit Leader — Sgt. Nash (continues; active since E+15:00)            [ind-i-nash-demob / custom_demob_ul]
│   ├── Documentation Unit Leader — Sayer (NEW OP3 E+24:00 arrival)                [ind-i-sayer-docul / custom_doc_ul]
│   ├── Situation Unit — TF-State + TF-Fed-Alpha + TF-Fed-Bravo Sit Specs
│   └── IST PSC Augment — Bauer (FEMA IST-Plans, E+27:00 arrival)
│
├── Logistics Section (LSC #2) — AC Salinger (County FD)                            [ind-i-salinger-lsc2]
│   ├── Supply Unit (handles inventory / cache integration; TF-Fed-Bravo + Charlie caches activated this OP)
│   ├── Comms Unit (TAC channels + LIGHT-1 night ops)
│   ├── Ground Support (apparatus parking, fueling, lighting)
│   └── Rehab Cycle (Engines 10/13/14/15/16)
│
└── Finance/Admin Section — NOT YET STOOD UP
    (Stands up at E+30:00 in OP4 — Cost Unit Leader at E+30:00)
```

#### Unified Command (Law)

- **UC-Law — Lt. Garza (County Sheriff)** — continues from OP2
- LE Perimeter Group — 30 personnel under UC-Law

### Attachment B — Resource Summary at OP3 close (E+28:00)

**Apparatus on scene (50+):**

- Local FD: Engine 1, 2, 3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15, 16, 17, 18; Ladder 1, 2, 3, 4; Rescue 1, 2, 3; Squad 1; Tower 1; BC-1; BC-2; ACOO-1; PIO-1; USAR-Alpha; USAR-Bravo; EMS-1; EMS-2; EMS-3; EMS-4. (~34)
- County FD (mutual aid): Engine 8, 9; Ladder 5; Squad 2; Heavy 1; LSC #2 vehicle Salinger. (6)
- County PW: PW-1 + PW-2. (2)
- County Sheriff: UC-Law unit + LE Perimeter Group. (1 + 30 personnel)
- County EM: ICP Trailer + EOC-Liaison vehicle. (1)
- State USAR TF: TF-State Cache (app-tf-state-cache). (1)
- Federal USAR TF: TF-Fed-Alpha Cache + TF-Fed-Bravo Cache + TF-Fed-Charlie Cache. (3)
- FEMA IST: IST Demob Coordinator vehicle + IST-Plans vehicle. (2 — new OP3)
- **Total apparatus chips:** ~50 (timeline-projected 50+ met)

**Personnel on scene (approx, active at OP3 close):** ~440-470 (matches timeline target post-TF-State half rotation to rehab E+23)

- Local FD ground + chiefs + day/night-shift relief: ~99 (some rotating)
- Local FD Special Ops (USAR-A + USAR-B): 16
- Local FD EMS: 8
- Local FD PIO: 1
- County FD mutual aid: 23
- County EM Liaison: 1
- County PW: 8
- County Sheriff: 31 (Lt. Garza + LE Perimeter Group)
- TF-State main body active: ~35 (half rotated to rehab E+23)
- TF-State advance carryover: 4
- TF-Fed-Alpha main body: 75
- TF-Fed-Bravo advance: 5
- TF-Fed-Bravo main body: 75 (E+20 arrival)
- TF-Fed-Charlie advance: 5
- TF-Fed-Charlie main body: 75 (E+25 arrival)
- FEMA IST Demob Coordinator: 1 (E+26)
- FEMA IST-Plans: 3 (E+27, PSC Bauer augment)
- Demob UL: 1 (Sgt. Nash, TF-State Plans — within TF-State count)
- Doc UL: 1 (Sayer, Federal TF Plans — within TF-Fed-Bravo count)

**Mutual aid agencies engaged at OP3 close:** Local FD (lead), County FD (mutual aid box alarm), County EM (Liaison), County Sheriff (UC-Law + LE Perimeter Group), County PW (Debris Removal Group), State USAR TF, Federal USAR TF-Alpha, Federal USAR TF-Bravo, Federal USAR TF-Charlie, FEMA IST. **10 agencies** in unified operational footprint.

**Shore Points cumulative at OP3 close: 83** (49 OP1+OP2 + 34 OP3). By status:

- **returned:** 3 (full cycle complete — SP-1, SP-2, SP-3 V-Cluster-3 cantilever assembly decommissioned for redeployment, freeing struts back to cache after secured-sign-off and full Tier 1 closeout in N wing cleavage zone)
- **secured:** 3 (newly secured this OP — V-Cluster-3 SP-2 + SP-3 finishing; V-Cluster-1 finalization; V-Cluster-5 + V-Cluster-6 + V-Cluster-9 access lanes contributed to extractions)
- **runner:** 2 (V-Cluster-5 + V-Cluster-10 runners in transit at boundary)
- **cutting:** 8 (V-Cluster-7 recovery + V-Cluster-8 periphery + V-Cluster-10 child void)
- **strutplaced:** 10 (mass deploy in progress; V-Cluster-7 + V-Cluster-8 + V-Cluster-9 secondary)
- **process:** 27 (Tier 1 + Tier 3 access in progress)
- **pending:** 30 (Tier 3 recovery deferred + late-OP3 new creations not yet processed)

By cluster (cumulative OP1 + OP2 + OP3):

- V-Cluster-1 (Pile A west Fl 8) — 7 SPs (V-01 + V-02 extracted OP2; 3 SPs returned this OP)
- V-Cluster-2 (Pile A SW Fl 6) — 8 SPs (V-03 + V-04 voice contact strong; extraction projected OP4)
- V-Cluster-3 (cleavage Fl 11 cantilever) — 3 SPs (all 3 secured / returned)
- V-Cluster-4 (Bravo cleavage divisional Fl 7-9) — 11 SPs (9 OP2 + 2 OP3)
- V-Cluster-5 (Pile C vehicle pocket) — 9 SPs (V-14 + V-15 extracted; V-16 silent-recovery)
- V-Cluster-6 (Pile B SW post gas-iso) — 7 SPs (V-17 + V-18 extracted)
- V-Cluster-7 (Pile D core recovery) — 11 SPs (12 confirmed deceased; recovery multi-day)
- V-Cluster-8 (Pile D periphery emergent) — 12 SPs (V-32 voice contact pending reconfirmation)
- V-Cluster-9 (SubD-1 NW) — 9 SPs (V-35 + V-36 extracted via Tower 1 + Heavy 1 rigging)
- V-Cluster-10 (Pile A Fl 4 emergent) — 6 SPs (V-38 + V-39 extracted; V-40 child suspected — search ongoing)

By type (cumulative):

- T-Shore: 42 (OP1 + OP2 + OP3 — broad use across access shoring)
- Vertical: 7 (unchanged from OP2 close)
- Double-T: 20 (heavy increase OP3 — Sector D deep work + SubD-1 cribbing)
- 3-Post: 11 (heavy increase OP3 — SubD-1 cribbing tiers + V-Cluster-9 + Sector D core/periphery)
- LongShore special (LS-1016 + LS-1422): used as deployed struts where reqLen > 96"

### Attachment C — Cmd transfer + role-reassignment log (OP3 additions)

| Transfer | E+ time | From | To | Method | Brief in event-log |
|---|---|---|---|---|---|
| #4 | E+21:00 | Chief Whitaker (IC #4) | Chief Vasquez (IC #5) | ICS-201 verbal + Command tab UI re-assign | Yes (`type=transfer-of-command`) |

**OP3 OSC rotation** (tracked in event-log as role-reassigned):

| E+ time | Role | From | To | Notes |
|---|---|---|---|---|
| E+21:00 | OSC | TFL Marquez (ind-i-marquez-osc3) | Asst. TFL Bishop (ind-i-bishop-osc5) | TF-Fed-Alpha → TF-Fed-Alpha night-shift relief; Marquez to rest cycle (returns OP4 day-2) |

**OP3 new role assignments + escalations:**

| E+ time | Role | Action | Assigned | Notes |
|---|---|---|---|---|
| E+16:05 | Heavy Rigging Group Sup | NEW (escalated from Spec) | Sup. Grayson (TF-State) | Manages Tower 1 + Heavy 1 + TF-State Rigging Team for Sector D access shoring |
| E+16:10 | Medical Branch Director | NEW (escalated from Med Team Mgr) | Dr. Patel | Span-escalation; custom_medical_branch role created under operations; old custom_medical_unit role orphaned in customRoles list |
| E+16:00 | Demob Unit Leader | RE-AFFIRMED (continuing from E+15:00 OP2) | Sgt. Nash | Continues; will draft preliminary demob plan submitted to PSC at E+24 |
| E+24:00 | Documentation Unit Leader | NEW | Sayer (Federal TF Plans) | Custom role custom_doc_ul parented under custom_psc_op2; tests Settings → Export workflow |

### Attachment D — UI friction findings for hotwash (OP3 additions)

**Carryforward from OP1 + OP2 (still applicable):**
1-10 — See `iap-op2.md` Attachment D for complete OP1+OP2 friction list. All friction items still active in OP3; no v3.x patches between OP2 and OP3 simulation boundaries.

**New in OP3:**

11. **No demob UI surface in FieldShore today.** Demob UL Sgt. Nash explored Settings tab, Operations tab apparatus list, Inventory tab, and Command tab — no formal demob workflow anywhere. Demob lives entirely in parallel paper docs (ICS-221 Demobilization Check-Out + ICS-220 Resources Demobilization Plan). Nash maintains a Google Sheet outside the app; coordinates manually via radio with LSC + OSC. Confirmed v4.0.0 gap for `mod-nims` (NIMS doctrine completeness) + `mod-ist` (FEMA IST coordination). Recommendation: Settings → Demob section with apparatus-level release status + personnel category release status + cache reconciliation workflow.

12. **Partial export gap discovered by Doc UL Sayer.** Existing exports: Inventory tab → Excel export (multi-sheet XLSX with ID column since v3.5.2); Settings → Export Operation (JSON snapshot of active operation); Archived ops view (read-only timeline after endOperation). Gaps confirmed:
    - No SP timeline export (cuttingStartedAt / runner / secured timestamps live on each SP but no flattened CSV available);
    - No role-history export (transitions overwrite without preservation — v4.0.0 3C.5 gap means historical "who was IC at E+9" requires event-log.jsonl reconstruction outside the app);
    - No ICS form auto-generation (ICS-203 / ICS-204 / ICS-209 must be reconstructed manually from operation state);
    - Excel inventory export lacks "as of" timestamp (point-in-time only, no deltas);
    - External equipment export captures items but not deployment history (which SP each item went to and when).
    For OP4 IAP attachment, Sayer reconstructs SP timeline from event-log.jsonl + Firebase RTDB snapshot exports outside app.

13. **IST multi-tenancy gap (Phase 3B).** PSC Bauer (FEMA IST-Plans, arrives E+27:00) connects to sim dept from FEMA IST device. Anonymous auth assigns Bauer a different anonymous uid than local PSC #3. Database rules grant ALL anonymous users full access to ALL departments — no `/members` enforcement. App does NOT distinguish IST member from local PSC. There is no permission / scope / tenant concept. Confirmed v4.0.0 Phase 3B gap: per-device UID + role-based security rules required.

14. **No stop-work UI feature.** Two paper events in OP3 required stop-work coordination: wind gust 28 mph at E+22:00 (Conway issued stop-work for Sector D crews ~12 min) and brief rain at E+24:30 (Cutting Group lead paused saws ~15 min). Both handled via radio TAC-2; no in-app surface marks operation-level "safety state" or SP-level "paused" status. Confirmed gap for `mod-comms` + `mod-struct`. Recommendation: `ScenePause` boolean + SafetyEvent log on operation schema.

15. **Multiple-assignment ambiguity at Group Sup tier.** Heavy Rigging Group at OP3 close contains both apparatus chips (Tower 1 + Heavy 1) AND a new individual chair assignment (Sup. Grayson). FieldShore accepts multiple assignments to the same role; UI shows only the first (alphabetical or insertion order). Group Sup individual vs. operating-apparatus distinction unclear. Flagged for `mod-nims`. v4.0.0 needs role-chair vs role-membership distinction.

16. **Orphan custom roles after escalation.** When Dr. Patel was escalated from Medical Team Mgr (custom_medical_unit) to Medical Branch Director (custom_medical_branch), the old custom_medical_unit role remained in customRoles list with no current assignee. App has no in-flow "delete custom role" or "deprecate role" surface. customRoles list grows monotonically through the OP. By OP3 close: 21 custom roles total (10 OP1 + OP2 + 4 OP3 + 7 orphans). Recommendation: role lifecycle CRUD + "deprecated" marker.

17. **Branch tier rendering still unverified at depth.** OP3 added Medical Branch Director (parent: operations) and Documentation Unit Leader (parent: custom_psc_op2 — making the chain ic → custom_psc_op2 → custom_doc_ul = depth 3). Carry-forward from OP2 friction: renderOrgChart bare-call crash, plus UI render path at depth 4+ still unverified (custom_demob_ul also at depth 3 via custom_psc_op2 parent). Data-layer accepts; visual hierarchy needs v4.0.0 Phase 3C.2 verification pass.

18. **Mass deploy phase friction unchanged.** The `findStrutCombinations()` → "Save Changes" hidden button flow continues to require programmatic injection (`db.ref().push()` + `persistOperation()` documented bypass). Three OPs in a row now using this bypass. Real-team friction estimate compounds: by OP3 close, simulated SP count is 83 vs realistic ~55 — a delta of 28 SPs that a real team would NOT have created. At a real Type I incident with ~110+ SP demand, this means the team would be 25-30% under target before the demob discussion phase even starts.

19. **Multiple cmd transfers compound roleName overwrites.** Cmd transfer #4 (Whitaker → Vasquez) deleted Whitaker's roleNames entry. Cumulative roleName-overwrite count: 5 (1 each for OP1's two IC transfers + 1 for OP2 IC transfer + 2 for OSC rotations OP2 + 1 for OP3 OSC rotation Marquez → Bishop). Each overwrite loses historical context: by OP3 close, the app has no record of who held IC or OSC roles prior to current assignment. Reconstruction requires event-log.jsonl. v4.0.0 Phase 3C.5 critical fix.

20. **Inventory display lag at scale.** TF-Fed-Bravo + TF-Fed-Charlie caches arrived as apparatus chips with `.struts` field still un-materialized at apparatus level — same OP2 friction. Inventory tab correctly accounts for items keyed to those apparatus IDs (LSC Salinger verified), but the apparatus chip summary shows 0 struts and 0 plates. v4.0.0 inventory-display vs inventory-data disambiguation needed for at-scale multi-cache ops.

---

**End of IAP-OP3.** Filed at E+27:30 by PSC #3 Federal Plans Mgr (with PSC #2 Doyle co-author throughout and IST PSC Bauer augmentation final pass) for IC #5 Vasquez approval prior to OP3→OP4 boundary at E+28:00. PSC #3 + IST PSC Bauer to incorporate Block 4-7 narrative into IAP-OP4 (forthcoming) covering day-shift demob discussion + heat advisory + CISM activation + Finance/Admin standup + final SitStat for OP4 hotwash.
