# AAR — Participant Cohort: OP3 New Roles (IC / OSC / PSC / Rigging / Medical / Demob / DocUnit)

## Subject identification

- **Cohort ID:** `op3-new` — encompasses `ic-op3` (Chief Vasquez, night-shift IC #5), `osc-op3` (Asst. TFL Bishop, TF-Fed-Alpha), `psc-op3` (PSC Federal, Fed-Alpha Plans Mgr), `rigging-op3` (TF-State Heavy Rigging Spec escalated to Group Sup Grayson), `medical-op3` (Dr. Patel escalated from Medical Team Mgr to Medical Branch Director), `demob-op3` (Sgt. Nash, from E+15:00), and `docunit-op3` (Sayer, Federal TF Plans, from E+24:00)
- **Active window:** E+16:00 → E+28:00 (night-shift; Demob UL active from E+15:00; Doc UL active from E+24:00)
- **Submission date / wall-clock:** 2026-05-17 (hotwash phase 1, post E+36:00 event-clock halt)
- **Voice:** Cohort lead speaking for the night-shift command + new specialty roles introduced in OP3.

## Operational period(s) covered

OP3 (E+16:00 → E+28:00 — 12 hr night shift; sustained-rescue OP with two additional Federal TF integrations, the V-Cluster-10 emergent priority, and demob planning standup).

---

## Question 1 — What was supposed to happen

OP3 was the night shift where the operation moves from "mass deploy" to "sustained ops with priority pivots." Our IAP-OP3 (6,230 words, drafted between E+12:00 and E+27:30) committed to eight SMART objectives. The ones owned by this new-roles cohort: maintain Tier-1 voice contact through E+24:00; open the deep-pile access in Sector D; integrate TF-Fed-Bravo (E+18:00 advance, E+20:00 main body) and TF-Fed-Charlie (E+24:00 advance, E+25:00 main body); pivot to V-Cluster-10 emergent discovery within 90 min; **begin demob planning** (Nash drafts the preliminary TF-State plan); **complete IAP-OP4** with IST PSC Bauer augmentation arriving E+27:00; and **manage night-ops fatigue + weather** (wind gust 28 mph at E+22:00; brief rain at E+24:30 — both paper events).

Vasquez inherited command from Whitaker at E+21:00 (cmd transfer #4). Bishop took OSC from Marquez at E+21:00 (OSC rotation). Grayson escalated to Heavy Rigging Group Sup at E+16:05. Patel escalated from Medical Team Mgr to Medical Branch Director at E+16:10. Nash continued as Demob UL and was charged with submitting the preliminary demob plan to PSC by E+24:00. Sayer arrived at E+24:00 as Documentation Unit Leader with a 4-hour active window to test the export workflow and reconstruct role history for the IAP-OP4 attachment.

Tools and surfaces were the same suite as OP2 plus new ones we needed to learn: Settings → Export (Sayer's primary surface), apparatus-list demob workflow (Nash's expected surface — turned out not to exist), and CISM coordination flagging (Patel — also no surface).

## Question 2 — What actually happened

The tactical mission succeeded. We landed **seven live extractions in OP3**: V-17 + V-18 (Cluster 6 Pile B SW) at E+22:30 — simultaneous via TF-State Rescue Squad Alpha + USAR-Bravo; V-14 (Cluster 5) at E+25:30; V-38 (Cluster 10 emergent) + V-39 (Cluster 10) at E+25:30 / E+26:00; V-35 (Cluster 9 SubD-1 NW) + V-36 (Cluster 9) at E+26:00 / E+26:15 via the Tower 1 + Heavy 1 concurrent rigging operation Grayson coordinated; V-15 (Cluster 5, weakened) at E+26:45 to Regional Trauma Code Red. Eight cumulative event extractions through OP3 (counting the V-Cluster-1 two from OP2). Cmd transfer #4 (Whitaker → Vasquez at E+21:00) and the OSC rotation (Marquez → Bishop at E+21:00) both logged cleanly. The V-Cluster-10 emergent pivot at E+18:00 (Kim's search team established V-38 + V-39 voice contact on Pile A Fl 4) got Rescue Squad Bravo + one cutting station shifted within the 90-min window — 6 access-shoring SPs (SP-50 through SP-55) created between E+18:15 and E+19:10. IST integrated cleanly: Hall (Demob Coord) at E+26:00 and Bauer (IST-Plans / PSC augment) at E+27:00. Paper events handled: wind gust 28 mph at E+22:00 (Conway issued stop-work for Sector D crews via TAC-2; ~12 min pause; all-clear E+22:12); brief rain 15 min at E+24:30 (cutting saws powered down; resumed E+24:45).

**34 SPs created** in OP3 against the 80-130 stretch target — under base on the same programmatic-bypass friction now in its **third operational period running**. 83 cumulative.

The new-roles cohort discovered six distinct friction surfaces that did not appear in OP1 or OP2.

**Nash's demob exploration found no demob UI anywhere.** Settings tab, Operations tab apparatus list, Inventory tab, Command tab — none of them surface an apparatus-level release status, personnel-category release status, or cache reconciliation workflow. Nash drafted the preliminary TF-State demob plan (search element first → Rescue Squad Alpha → Wood Spec → Heavy Rigging holding until Sector D core stabilized → cache decon → PSC last out) entirely in a parallel Google Sheet and on ICS-220 / ICS-221 paper forms. Demob lifecycle is **completely absent** from FieldShore.

**Sayer's export exploration found partial coverage with critical gaps.** Existing exports: Inventory → multi-sheet XLSX with ID column (since v3.5.2); Settings → Export Operation (JSON snapshot of active operation); Archived ops read-only timeline. Missing: SP timeline export (cuttingStartedAt / runner / secured timestamps live on each SP but no flattened CSV available); role-history export (transitions overwrite without preservation — Sayer had to reconstruct from event-log.jsonl outside the app); ICS form auto-generation (203 / 204 / 209 reconstructed manually); external-equipment deployment history (items captured but not which SP they went to and when).

**IST multi-tenancy gap (Bauer's first surprise).** PSC Bauer connected from a FEMA IST device. Anonymous auth assigned a different anonymous uid than local PSC #3. Database rules grant **all anonymous users full r/w access to all departments** — no `/members` enforcement, no permission / scope / tenant concept. App does not distinguish IST member from local PSC. Bauer flagged this within 15 minutes of connecting.

**No stop-work UI feature.** Both weather paper events (E+22:00 wind gust, E+24:30 rain) were handled via radio TAC-2; no in-app surface marks operation-level "safety state" or SP-level "paused" status. Conway had no way to record the stop-work or the all-clear in FieldShore.

**Multiple-assignment ambiguity at Group Sup tier.** Heavy Rigging Group at OP3 close contained both apparatus chips (Tower 1 + Heavy 1) AND a new individual chair assignment (Grayson). FieldShore accepted multiple assignments to the same role; the UI showed only the first (alphabetical or insertion order). The role-chair vs role-membership distinction is unclear.

**Orphan custom role after escalation.** When Patel escalated from custom_medical_unit to custom_medical_branch, the old custom_medical_unit role remained in the customRoles list with no current assignee. App has no in-flow "delete custom role" or "deprecate role" surface. By OP3 close: 21 custom roles total (10 OP1+OP2 + 4 OP3 new + 7 orphans accumulating monotonically).

The programmatic-bypass workaround for the Add-SP modal continues unchanged from OP1 + OP2. Cumulative roleName-overwrite count from cmd transfers + OSC rotations now stands at 5.

## Question 3 — Why was there a difference

**App-surface causes (dominant — and structural).** The OP3 friction set is not "this surface is broken"; it is **"this surface does not exist."** Demob lifecycle: missing. Stop-work state: missing. Multi-tenancy: missing. CISM coord: missing (deferred to OP4). Role-history: missing. SP-timeline export: missing. ICS auto-form generation: missing. The new-roles cohort was the first set of participants whose roles required surfaces FieldShore was not designed to host. OP1 + OP2 tactical roles all map to existing surfaces (Operations / Inventory / Command); OP3 added Demob UL, Doc UL, IST PSC, and Medical Branch Director, three of which have **no current home in the app**.

**Doctrine vs default-state cause (structural).** Same root cause as OP2 but extended: Type I/II command structure includes Demob UL and Doc UL as standard Planning Section positions, plus Medical Branch as a NIMS-standard escalation when patient-flow exceeds Group span. FieldShore's defaults are Type III at best. Every Type I/II role we added was a custom role; orphan roles accumulated; the customRoles list grew monotonically; there is no lifecycle CRUD.

**Coordination-model causes (real but secondary).** The night-shift roster compounded fatigue on the same participants; cmd transfer #4 + OSC rotation #5 happened on the same minute (E+21:00) — two roleName overwrites in one event. The role-history loss is invisible until someone (in this case Sayer) tries to ask "who was IC at E+9?" and finds the app can't tell them.

**Scenario design cause (small).** The IST integration was intentionally late in the OP (E+26:00 + E+27:00) which gave Bauer only an hour of in-OP discovery time before the boundary. That said, an hour was enough to confirm the multi-tenancy gap; the scenario design surfaced what it needed to surface.

## Question 4 — What can we learn / what should change

**App changes — NEW phase (demob lifecycle).** Tag: `Add Settings → Demob section with apparatus-level release status + personnel category release status + cache reconciliation | phase: NEW | severity: critical`. This is the single biggest missing surface for Type I/II ops. Nash worked the entire OP3 outside FieldShore.

**App changes — Phase 3B (IST multi-tenancy).** Tag: `Per-device UID + role-based security rules / members enforcement | phase: 3B | severity: critical`. Bauer's first surprise is a hard blocker for IST coordination at scale. Currently any anonymous user can r/w any department.

**App changes — NEW (stop-work + safety state).** Tag: `Add ScenePause boolean + SafetyEvent log on operation schema | phase: NEW | severity: high`. Wind/rain/cracking-sound events need an in-app surface and a paused-status on SPs.

**App changes — Phase 3D (export gaps).** Tag: `Add SP-timeline CSV + role-history export + ICS form auto-generation (203 / 204 / 209) + external-equipment deployment-history export | phase: 3D | severity: high`. Sayer's gap discovery is the highest-priority documentation work for any incident over ~1 OP.

**App changes — Phase 3C.5 (role history).** Tag: `Preserve role history on apparatus / individual transitions (don't overwrite roleNames) | phase: 3C.5 | severity: critical`. The cumulative 5 roleName overwrites by OP3 close means the app has lost track of every previous IC and OSC assignment.

**App changes — Phase 3C.3 (role lifecycle CRUD).** Tag: `Add deprecate/delete custom-role workflow + "deprecated" marker | phase: 3C.3 | severity: med`. Orphan custom roles after escalations accumulate monotonically; need lifecycle support.

**App changes — Phase 3C.4 (role-chair vs role-membership).** Tag: `Distinguish role-chair (single individual) from role-membership (apparatus + crew) at Group Sup tier | phase: 3C.4 | severity: med`. The Heavy Rigging UI showing only the first assignment is data-correct but user-misleading.

**App changes — Phase 3A (programmatic-bypass exit).** Tag: `Phase 2 Add-SP modal fix remains critical for 3rd OP running | phase: NEW (Phase 2 backlog) | severity: critical`. No commentary needed.

## Cross-reference

- **Linked SP IDs:** SP-50 through SP-55 (V-Cluster-10 emergent, created E+18:15-E+19:10); SP-56 through SP-66 + SP-77 through SP-81 (V-Cluster-7 + V-Cluster-8 Sector D deep work via TF-Fed-Bravo); cleavage SP-1 / SP-2 / SP-3 advanced to secured + returned this OP.
- **Linked IAP:** `iaps/iap-op3.md` (PSC #3 with PSC #2 Doyle co-author + IST PSC Bauer augmentation; Attachment D friction items 11–20 logged this cohort's findings).
- **Linked conductor state:** `sp_creation_op3_actual: 35` (note: conductor records 34 + 1 from initial estimate; reconciled in IAP-OP3 as 34); cmd transfer #4 + OSC rotation #5 at E+21:00; IST integration at E+26:00 + E+27:00; paper events handled.

## Synthesis tags

```
tag: Add Settings → Demob section with full demob lifecycle | phase: NEW | severity: critical
tag: Per-device UID + role-based security rules / members enforcement | phase: 3B | severity: critical
tag: Add ScenePause boolean + SafetyEvent log on operation schema | phase: NEW | severity: high
tag: Add SP-timeline + role-history + ICS-203/204/209 + external-equipment deployment-history exports | phase: 3D | severity: high
tag: Preserve role history on role transitions (don't overwrite roleNames) | phase: 3C.5 | severity: critical
tag: Add deprecate/delete custom-role workflow + "deprecated" marker | phase: 3C.3 | severity: med
tag: Distinguish role-chair vs role-membership at Group Sup tier | phase: 3C.4 | severity: med
tag: Phase 2 Add-SP modal Save Changes fix remains critical | phase: NEW | severity: critical
```
