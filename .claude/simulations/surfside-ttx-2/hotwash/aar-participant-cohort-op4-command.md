# AAR — Participant Cohort: OP4 Command (IC / OSC / PSC / Safety / Rescue Branch / Shoring / Cut / Demob)

## Subject identification

- **Cohort ID:** `op4-command` — encompasses `ic-op4` (Chief Whitaker, day-2 return), `osc-op4` (TFL Marquez, return), `psc-op4` (PSC Federal continues + IST PSC Bauer augment), `safety-op4` (BC Conway, fatigued continues), `rescue-branch-op4` (Federal Rescue Mgr replacing Vega rotation), `shoring-op4` (Sup. Beck continues), `cut-op4` (Federal cutting spec rotation), and `demob-op4` (Sgt. Nash continues)
- **Active window:** E+28:00 → E+36:00 (8-hour compressed day-2 shift; final OP of the TTX-2 event clock)
- **Submission date / wall-clock:** 2026-05-17 (hotwash phase 1, post E+36:00 event-clock halt)
- **Voice:** Cohort lead speaking for the OP4 command tier — day-2 return roster with one critical new section standup and the formal demob discussion.

## Operational period(s) covered

OP4 only (E+28:00 → E+36:00) — the final OP of the simulated event clock. Includes the Finance/Admin Section first appearance, formal TF-State demob discussion, CISM activation, and the cribbing-rot audit cycle.

---

## Question 1 — What was supposed to happen

OP4 was the day-2 shift where the operation transitions from active sustained-rescue into sustained-recovery + formal demob planning. Our IAP-OP4 (~6,339 words; Whitaker approved at cmd transfer #5) committed to eight SMART objectives. The ones owned by this command cohort: (1) recover remaining Tier-1 active rescues (V-40 child Cluster 10 search; V-33 / V-34 Cluster 8 suspected; V-37 Cluster 9 suspected); (2) sustain Pile D core recovery operations at safer-side pace; (3) re-evaluate degraded OP1/OP2 shoring for cribbing rot in salt-saturated debris; (4) **formalize the TF-State demobilization plan** (Nash + Hall) with no actual demob this OP; (5) **stand up the Finance/Admin Section** — Cost UL + Time UL by E+32:00; (6) **activate CISM** at E+33:00; (7) initiate Documentation Unit Leader formal authority at E+35:00; and (8) achieve 15–20 additional shore points (cumulative target ~66).

Whitaker returned for cmd transfer #5 at E+28:00 (Vasquez → Whitaker, fifth transfer of the event). Marquez returned for OSC at E+30:00 (Bishop → Marquez). Director Penz arrived at E+30:00 to take the Finance/Admin SC chair — **the 5th Section under IC, the first appearance of Finance/Admin in the entire incident.** Per NIMS Type I doctrine, F/A is a standard Section alongside Operations / Plans / Logistics. Cost capture forward from E+30:00 plus retrospective reconstruction of the prior 30 hours. CISM team (4 personnel, County FD) arrived E+33:00 with Conway's pre-CISM briefing covering V-Cluster-7 recovery emotional load on TF-State specialists. Sayer formalized Doc UL authority at E+35:00.

## Question 2 — What actually happened

The mission landed: **17 new SPs in OP4** (SP-50 through SP-66) bringing the cumulative total to **66** (matching the stretch objective exactly); **2 live extractions** (V-03 at E+30:45, V-04 at E+31:30, both conscious + ambulatory to County General); **4 recoveries** (V-19 Cluster 6 body extracted E+33:30 from Pile B SW; 3 Pile D core upper-layer recoveries at E+31:00 / E+32:30 / E+34:00). Cribbing-rot audit completed by Conway + Beck at E+33:30 — **6 SPs flagged + redone** (SP-50 through SP-55: cleavage Fl 5 + Fl 6, Pile B SW + Pile B West header, Pile A Fl 8 + Pile A Fl 6 access). All 6 redos cycled through to **returned** status by E+35:30 with fresh 6x6 wood + verified bolt-torque inspection. CISM activated E+33:00 with first defusing session at E+33:30; 3 TF-State Rescue Specialists defused by E+35:00. Recovery-rate transitions for V-16 + V-33 + V-34 + V-37 at E+34:00 per Patel's 36+ hour no-contact protocol.

But OP4 surfaced **ten distinct new friction items** that no prior OP exposed.

**The Finance/Admin standup uncovered a critical default-state finding.** `ICS_ROLES_DEFAULT` in `app.js` has **no Finance/Admin SC role**. We created `custom_finance_admin_sc` via direct write to the customRoles array, plus `custom_cost_ul` and `custom_time_ul` children. The data layer accepted it, and the UI render of the 5-section structure visually confirmed — Finance/Admin displays correctly under IC alongside Operations / Plans / Logistics. **Big positive at the data and render layers; the gap is at app initial-state defaults.** This is the v4.0.0 Phase 3C.1 critical finding.

**Penz double-hat exposed a hard data-model limit.** Penz needed to chair both FASC and Cost UL (NIMS allows double-hat at span <7). FieldShore permits only one role per target. Workaround: created a **shadow individual `ind-i-penz-cost` to hold the Cost UL chair while `ind-i-penz-finance` holds the FASC chair**. This splits one human's accountability across two database entities. No double-hat / multi-role-per-individual support in the data model.

**`estimatedLoad` field validate-rule mismatch on first SP creation.** Our first OP4 SP-create attempt failed with `PERMISSION_DENIED`. Root cause: the database.rules.json validate rule (from v3.8.2) requires `estimatedLoad` to be **numeric**, but participants creating SPs via programmatic bypass naturally pass string values like `'medium'` or `'heavy'` matching the dropdown UI labels. The validate rule is correct; the **API contract is undocumented** and the UI dropdown labels are string-valued while the database expects numeric. Fixed by switching to numeric load values for the remaining SPs.

**OP3-to-OP4 persistence drift.** When OP4 driver started, the actual Firebase state showed **none of OP3's logged transitions** applied: still 49 SPs (not 83), still Whitaker IC (not Vasquez), still Marquez OSC (not Bishop), no Heavy Rigging Group Sup escalation, no Medical Branch Director escalation, no Doc UL arrival. Either OP3 driver wrote to a different operation ID, or persistence failed silently, or the driver never ran the eval. OP4 driver had to **re-apply all OP3 night-shift transitions** then apply OP4 day-2 transitions — a 2-step manual reconstruction. The simulation runtime needs a persistence-verification step between OPs to detect this drift.

**Doc UL formal arrival discrepancy.** Sayer was introduced at OP3 E+24:00 in the event log, but the Doc UL role was not assigned in Firebase at that time. OP4 driver formalized at E+35:00 per the scenario timeline. Discrepancy noted.

**CISM coordination has no in-app surface.** Team arrived E+33:00; first defusing E+33:30; 3 specialists defused by E+35:00. No CISM-needed flag on individual or apparatus. No in-app log of CISM sessions or follow-ups. All CISM coord via paper + radio + parallel notebook.

**Cribbing-decay tracking has no in-app field.** The E+33:30 audit was the highest-stakes safety inspection of the event — 6 SPs failed and had to be redone before continued reliance. **No `lastInspected` field on SP; no `cribbing_status` field; no audit-history.** Inspection notes lived entirely in Conway's parallel notebook + photos.

**Heat-mitigation discipline has no in-app surface.** Mandatory 60-min rehab cycle during the 88 °F + 78% humidity peak (E+34:00). No `last_rehab_at` field on apparatus or individual; no `rehab_required_at`. Managed via radio + parallel notebook. No documented heat-related incidents through OP4, but the absence of an audit trail is a Phase NEW gap.

**Cost capture entirely outside FieldShore.** Penz operating in a parallel Google Sheet + ICS-211 paper forms. Compiled ~13,000 personnel-hr cumulative through E+36:00. No personnel-hour field; no apparatus rate field; no consumable rate field; no reimbursement-package export.

**Time Unit Leader has no in-app surface.** Time UL operating entirely outside FieldShore. No individual check-in / check-out timestamps; no shift-tracking. Workaround: ICS-211 paper + Google Sheets time tracker.

The programmatic-bypass workaround for the Add-SP modal is now in its **fourth operational period running** with no v3.x patch shipped.

## Question 3 — Why was there a difference

**App-surface and default-state causes (dominant).** OP4 is the OP where the app's structural debt **all surfaces at once** because the operation finally hits Type I full-doctrine territory: a 5th Section, double-hatting, cribbing audit, heat discipline, cost capture, time tracking, CISM. Every Phase NEW item we surfaced is a NIMS-standard practice for Type I/II ops that has no FieldShore home. The Finance/Admin SC default omission is a 30-minute fix in `app.js`; the cost/time/CISM/cribbing/rehab surfaces are net-new feature scope.

**Persistence-runtime cause (new and significant).** The OP3 → OP4 state drift is the most important runtime finding of the simulation — it implies the simulation harness itself does not verify that one OP's documented mutations actually landed in Firebase before the next OP starts. This is not a FieldShore app bug; it is a simulation-runtime gap. Fixing it requires a snapshot-diff verification step at every OP boundary.

**Doctrine vs default-state cause (structural, continued).** The Finance/Admin omission compounds the OP1+OP2 ICS_ROLES_DEFAULT shallowness (no Liaison / PIO / LSC / PSC / Branch / Group / Unit / Medical Branch / Demob UL / Doc UL). After OP4, the running custom-roles count is **24** — every one a workaround for an absent default.

**Coordination-model cause (real).** Cmd transfer #5 (Vasquez → Whitaker) at E+28:00 + OSC rotation #6 (Bishop → Marquez) at E+30:00 compound the OP1+OP2+OP3 roleName overwrites. By OP4 close, the app has lost track of who held IC and OSC during every prior OP — Sayer's role-history reconstruction work proves this is now a hard requirement of any documentation cycle.

**Persona/role-understanding cause (minor).** The Doc UL OP3 introduction vs OP4 formal-arrival discrepancy is a narrative-vs-data drift. The scenario plan introduced Sayer at OP3 E+24:00 but assigned the role at OP4 E+35:00; both timestamps are legitimate (intro vs formal authority) but the event-log treats them as the same event.

## Question 4 — What can we learn / what should change

**App changes — Phase 3C.1 (Finance/Admin default).** Tag: `Add Finance/Admin SC + Cost UL + Time UL to ICS_ROLES_DEFAULT | phase: 3C.1 | severity: critical`. 30-minute fix. The data + render path both work; only the default is missing.

**App changes — NEW (double-hat / multi-role per individual).** Tag: `Support double-hat / multi-role-per-individual at NIMS Type I span < 7 | phase: NEW | severity: high`. Penz's shadow-individual workaround is data-model abuse.

**App changes — NEW (cribbing-decay tracking).** Tag: `Add lastInspected + cribbing_status + audit-history fields on SP | phase: NEW | severity: critical (safety)`. Multi-day ops in salt-saturated debris require this; OP4 audit found 6 SPs needing redo with zero in-app trail.

**App changes — NEW (heat-mitigation surfaces).** Tag: `Add last_rehab_at + rehab_required_at on apparatus and individual | phase: NEW | severity: high`. No incidents in OP4 doesn't mean the next op won't have them; absence of audit trail is the issue.

**App changes — NEW (cost capture).** Tag: `Add personnel-hour + apparatus-rate + consumable-rate fields + reimbursement-package export | phase: NEW | severity: high`. Cost UL working entirely outside the app at Type I scale.

**App changes — NEW (time tracking).** Tag: `Add individual check-in / check-out + shift-tracking | phase: NEW | severity: high`. Same root as cost — Type I positions with no app home.

**App changes — NEW (CISM coordination).** Tag: `Add CISM-needed flag on individual + CISM session log | phase: NEW | severity: med`. CISM is doctrinally standard for Type I/II long-duration incidents.

**App changes — API contract.** Tag: `Document estimatedLoad numeric requirement; align UI dropdown values to database expectation | phase: NEW | severity: med`. First SP-create eval failed with PERMISSION_DENIED in OP4; either docs or UI must change so participants don't hit this cold.

**Simulation runtime change (not FieldShore).** Tag: `Add persistence-verification snapshot-diff step at every OP boundary | phase: none (simulation runtime) | severity: critical`. OP3→OP4 drift is the most important runtime finding of TTX-2; without this guard, future scenarios cannot trust their own state.

**App changes — Phase 2 (Add-SP modal).** Tag: `Phase 2 Add-SP modal Save Changes fix is now 4-OPs-running critical | phase: NEW | severity: critical`. The longest-standing single issue across all four OPs.

**Scenario-design change (Doc UL).** Tag: `Reconcile narrative-arrival vs formal-authority-assignment timestamps in event log | phase: none | severity: low`.

## Cross-reference

- **Linked SP IDs:** SP-50 through SP-55 (cribbing-rot redo, deployed E+30:00 onward, all returned by E+35:30); SP-56 through SP-59 (cleavage zone N wing settlement, V-Cluster-3 + V-Cluster-4); SP-60 through SP-62 (V-Cluster-7 Pile D core recovery); SP-63 through SP-66 (V-Cluster-8 periphery). Plus SP-1 / SP-2 / SP-3 (cleavage cantilever) decommissioned + returned E+34:30.
- **Linked IAP:** `iaps/iap-op4.md` (PSC #3 + IST PSC Bauer + Doc UL Sayer AAR-prep augmentation; Friction items 1–10 in the OP4 NEW list logged this cohort's findings; Attachment B Demob Plan Draft; Attachment C Finance/Admin Standup Notes).
- **Linked conductor state:** `sp_creation_op4_actual: 17`; cmd transfer #5 (Vasquez → Whitaker E+28:00); OSC rotation Bishop → Marquez E+30:00; Finance/Admin standup outcome `data-layer + UI-layer both verified`; CISM activated E+33:00; cribbing audit E+33:30; final SP distribution 10p/10pr/7sp/5c/5r/9s/20r.

## Synthesis tags

```
tag: Add Finance/Admin SC + Cost UL + Time UL to ICS_ROLES_DEFAULT | phase: 3C.1 | severity: critical
tag: Support double-hat / multi-role-per-individual for NIMS span < 7 | phase: NEW | severity: high
tag: Add lastInspected + cribbing_status + audit-history on SP | phase: NEW | severity: critical
tag: Add last_rehab_at + rehab_required_at on apparatus / individual | phase: NEW | severity: high
tag: Add cost-capture surfaces (personnel-hr + rates + reimbursement-package export) | phase: NEW | severity: high
tag: Add individual check-in / check-out + shift-tracking (Time UL) | phase: NEW | severity: high
tag: Add CISM-needed flag + session log | phase: NEW | severity: med
tag: Document estimatedLoad numeric API contract; align UI dropdown values | phase: NEW | severity: med
tag: Add persistence-verification snapshot-diff at every OP boundary (simulation runtime) | phase: none | severity: critical
tag: Phase 2 Add-SP modal Save Changes fix — 4 OPs running | phase: NEW | severity: critical
```
