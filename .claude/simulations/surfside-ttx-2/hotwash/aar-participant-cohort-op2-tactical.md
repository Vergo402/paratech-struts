# AAR — Participant Cohort: OP2 Tactical (rescue-branch / shoring / search / cut)

## Subject identification

- **Cohort ID:** `op2-tactical` — encompasses `rescue-branch-op2` (Sup. Vega, TF-State Rescue Mgr), `shoring-op2` (Sup. Beck, USAR-Bravo promoted Shoring Group Sup), `search-op2` (Sup. Kim, TF-State Search Mgr), and `cut-op2` (TF-State rescue specialist rotation on the Cut Table)
- **Active window:** rescue / shoring / search E+5:00 → E+16:00; cut E+4:00 → E+16:00
- **Submission date / wall-clock:** 2026-05-17 (hotwash phase 1, post E+36:00 event-clock halt)
- **Voice:** Cohort lead speaking for the tactical-tier supervisors of OP2 (Branch Director + three Group Supervisors).

## Operational period(s) covered

OP2 only (E+4:00 → E+16:00 — first sustained-rescue day-shift OP after escalation from Type IV/III to Type II command structure).

---

## Question 1 — What was supposed to happen

The OP2 IAP (Doyle's 4,157-word document, blocks 1–8 + four attachments) committed us to seven SMART objectives. The four tactical-tier ones that landed on this cohort were: (1) stabilize the N-wing cleavage zone (Bravo cantilever Fl 11) by E+8:00 to allow safe ascent of search teams; (2) recover Tier-1 confirmed-alive cluster victims (V-1, V-2, V-5, V-6, V-9) on the access-shoring → cut → extract sequence; (3) establish full pile-sector access (Sectors A, C, B post-gas-iso, and Sector D periphery); and the implicit (4) hit ~110 shore points across the OP as the day-shift run-rate target.

Our tools were the Operations tab (SP creation + status flow), the Cut Table tab (cut-length entry + send-to-runner), the Inventory tab (deploy from caches), and the Command tab (Branch/Group org-chart parenting). Resources at OP2 start: 28 apparatus + ~123 personnel growing to 38 apparatus + ~331 personnel by E+16:00 with TF-State main body (E+5:00, 66 personnel) and TF-Fed-Alpha main body (E+14:00, 75 personnel) integrated. Vega took the new Rescue Branch Director chair at E+5:30; Kim took the Search Group Sup chair at E+5:45; Beck escalated from USAR-Bravo to Shoring Group Sup at OP2 start (carrying from his OP1 emergency-shoring work on the cleavage cantilever); the cut-table lead rotated through TF-State rescue specialists every few hours per the OP2 overlay.

The expectation was clean: stand the Branch/Group structure, drive 110 SPs at a real-team-realistic ~45–60 s per SP, push the first secured SP across the line by mid-OP, get V-01 and V-02 extracted on the day shift, and hand a stable mass-deploy posture to the OP3 night-shift cohort.

## Question 2 — What actually happened

We hit the cleavage-zone objective (SP-1 secured at E+14:30 — first OP2 emergency-shoring completion; SP-2 reached **runner**; SP-3 cutting complete and queued for runner) and we got both V-Cluster-1 extractions live and ambulatory (V-01 at E+13:45 via Squad 1 slab cutout; V-02 at E+13:50 after rebar release on a leg pin). Cleavage zone declared safe-to-ascend at E+11:30. UC with County Law established E+6:15. Sector A west, Sector C vehicle-pocket, and Sector D periphery (V-Cluster-8) lanes all opened on the timeline. The Type II command structure stood: Rescue Branch (Vega), Search Group (Kim), Shoring Group (Beck), Heavy Rigging (Tower 1 + Heavy 1 paired at E+8:00), Medical Unit (Patel), Demob UL (Nash at E+15:00). All span-of-control checks ≤5 per NIMS.

But the SP run-rate landed at **35 OP2 + 14 OP1 = 49 cumulative**, against the 110 OP2 budget — about 60% under target. The reason was singular and persistent: the **Add-SP modal's "Save Changes" button was hidden in the Add path until the find-struts flow ran**, the same friction OP1 had logged. We bypassed it via `db.ref(...).push() + persistOperation()` programmatic injection, dozens of times across OP2. The data wrote correctly, but the **dashboard count cards did not refresh after programmatic mutation** — Vega watched the cards show "14 Pending" for minutes after we knew Firebase + localStorage both showed 35+. There is an apparent ~30 s debounce or a full-page reload requirement. Real users without dev-tools access would have plowed straight into this and slowed to maybe ~70 SPs total.

Two other systemic frictions surfaced at scale. First, the **TF-State and TF-Fed-Alpha caches arrived as apparatus chips with an empty materialized `.struts` field at the apparatus-summary level** — LSC Romano/Salinger could verify that inventory items were correctly attributed to those apparatus IDs, but the apparatus chip itself showed 0 struts / 0 plates. Inventory data was correct; inventory display was lagging. Second, there is **no bulk-inventory-deploy mode** — the `deployPendingShorePoint()` flow expects a `deployedStrut` payload from a per-SP find-struts roundtrip, an estimated 45–60 s of friction per SP at mass-deploy scale. Programmatic injection bypassed this but it bit Beck especially hard on Double-T and 3-Post deployment in the cleavage divisional shoring (SP-4 through SP-7 + SP-45 through SP-49).

We also tripped the **`renderOrgChart` bare-call crash** twice during OP2 when verifying that Branch/Group additions had landed in the Command tab — the bare call throws `Cannot convert undefined or null to object` at line 4777 (`Object.values(roleAssignments)`). And the **Branch/Group/Unit tier custom roles** worked perfectly at the data layer — `parentId` chains went 4-deep (`ic → operations → rescue_branch → squad-alpha`) without complaint — but **the Command-tab render path at depth 4+ is unverified.** We have no visual confirmation that the org chart actually rendered the squad-tier nodes correctly.

## Question 3 — Why was there a difference

The gap between intended (110 SPs, smooth multi-agency integration, clean Branch/Group visualization) and actual (35 SPs, programmatic bypass, unverified UI depth) decomposes into three causes.

**App-surface causes (dominant).** The Add-SP modal's Save Changes path is the single largest source of friction across all three tactical OPs of TTX-2; it was already flagged in OP1 and no v3.x patch shipped between OP1 and OP2. Combined with the dashboard count-card stale-cache behavior and the bare-call `renderOrgChart` crash, the operations surface required dev-tools workarounds for every mass-deploy decision. The inventory-data vs inventory-display split for the TF caches is a second app-layer issue — the data model and the UI summary of the data model are out of sync at the apparatus chip level.

**Doctrine vs default-state cause (secondary but structural).** FieldShore's `ICS_ROLES_DEFAULT` contains no Branch tier, no Group tier, no Medical Unit, no Demob UL. To stand up Type II command we created 6 new custom roles in OP2 on top of OP1's 3, for a running customRoles total of 13 by OP2 close. The data layer accepted everything; the UI render at depth was never verified. The **app's default ICS tree is Type IV/III at best**, not Type I/II, and that mismatch with NIMS doctrine cascaded into all four of our cohorts' workflows.

**Coordination-model cause (minor).** Token-passing within the cohort worked. The default OSC-holds-the-token model meant Beck and Vega had to request the token from OSC for SP-creation bursts. With programmatic injection we sidestepped the actual modal contention; in a real OP with no dev-tools, the token-pass overhead at mass-deploy scale would compound the per-SP friction.

## Question 4 — What can we learn / what should change

**App changes — Phase 2 (Add-SP modal) is critical.** Tag: `Fix hidden Save Changes button in Add-SP modal Add path | phase: NEW (Phase 2 backlog) | severity: critical`. This is the single highest-ROI fix in the entire v4.0.0 program because it has now degraded SP run-rate in OP1, OP2, OP3, and OP4. Adjacent fix: surface the **bulk inventory deploy** mode so that mass-deploy phases don't pay a 45–60 s per-SP find-struts roundtrip — even a "deploy from cache without strut match" path with a follow-up reconciliation step would solve it.

**App changes — Phase 3C.1 + 3C.2 (NIMS defaults + org chart depth render).** Tag: `Add Branch/Group/Unit tier to ICS_ROLES_DEFAULT for Type I/II structure | phase: 3C.1 | severity: high`. Tag: `Verify Command-tab org-chart UI rendering at parentId depth 4+ | phase: 3C.2 | severity: high`. The data layer is fine. The defaults and the visualization aren't.

**App changes — Phase 3D (inventory display).** Tag: `Materialize apparatus-level .struts summary field on cache import | phase: 3D | severity: med`. The TF cache import path needs to populate the apparatus chip summary, not just the inventory-item attribution.

**App changes — Phase 3F (dashboard refresh).** Tag: `Force dashboard count-card re-render on shorePoint mutation (don't debounce stale) | phase: 3F | severity: med`. Counts showing 14 when reality is 49 is a confidence-undermining lag at scale.

**App changes — hotfix (org chart bare call).** Tag: `Guard renderOrgChart against undefined roleAssignments (default to {}) | phase: NEW | severity: low`. Five-minute fix; tripped twice in OP2.

**Doctrine / scenario changes.** The IAP cited a 110-SP budget; with documented friction the realistic ceiling was ~70. Future TTX scenarios should either ship a budget calibrated to current app friction or front-load the v4.0.0 Phase 2 fix before re-running this scenario.

## Cross-reference

- **Linked SP IDs:** SP-1 (V-Cluster-3 W cantilever, secured E+14:30); SP-2 (V-Cluster-3 E cantilever, runner); SP-3 (V-Cluster-3 center support, cutting complete); SP-4 through SP-7 (Bravo cleavage divisional, Fl 7-9); SP-8 through SP-14 (V-Cluster-1 + V-Cluster-2 Pile A); SP-15 through SP-19 (V-Cluster-5 Pile C vehicle pocket); SP-20 through SP-23 (V-Cluster-6 Pile B SW); SP-26 (V-Cluster-8 Pile D periphery); SP-29 through SP-32 (V-Cluster-9 SubD-1 NW); SP-42 through SP-49 (cleavage divisional + Fl 7 slab cutout).
- **Linked IAP:** `iaps/iap-op2.md` (authored by PSC #2 Doyle; objectives + Attachment D friction list 1–10 logged this cohort's findings).
- **Linked conductor state:** `sp_creation_op2_actual: 35` against `sp_creation_op2_budget: 110`; `first_secured_sp: SP-1 V-Cluster-3 W cantilever at E+14:30`; `sp_creation_method_friction` entry for OP2.

## Synthesis tags

```
tag: Fix hidden Save Changes button in Add-SP modal Add path | phase: NEW | severity: critical
tag: Add bulk inventory deploy mode for mass-deploy phases | phase: NEW | severity: high
tag: Add Branch/Group/Unit tier to ICS_ROLES_DEFAULT for Type I/II structure | phase: 3C.1 | severity: high
tag: Verify Command-tab org-chart UI render at parentId depth 4+ | phase: 3C.2 | severity: high
tag: Materialize apparatus-level .struts summary field on cache import | phase: 3D | severity: med
tag: Force dashboard count-card re-render on shorePoint mutation | phase: 3F | severity: med
tag: Guard renderOrgChart against undefined roleAssignments (default to {}) | phase: NEW | severity: low
tag: Calibrate future TTX SP budgets to documented app friction until Phase 2 ships | phase: none | severity: low
```
