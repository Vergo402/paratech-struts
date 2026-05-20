# AAR — Moderator `mod-ist` (FEMA IST / Inter-Agency Plans Chief)

## Subject identification

- **Subject ID:** `mod-ist`
- **Role / Persona:** Moderator — FEMA Incident Support Team / Inter-Agency Plans Chief perspective; reference FEMA US&R Operations Manual Sep 2012 (plan.md Appendix B/C/D) + ICS Form Descriptions (Appendix A) + MASTER-PLAN Phase 3B (multi-tenancy) + 3C (NIMS) + 3D (ICS forms export)
- **Active window:** E+0:00 → E+36:00 (full sim, silent observation; observation cadence sharpens at IST integration window E+26:00 / E+27:00)
- **Submission date / wall-clock:** 2026-05-17

## Operational period(s) covered

OP1, OP2, OP3, OP4 — full sim. Highest density observation OP3 (E+26:00 Hall + E+27:00 PSC Bauer arrival) and OP4 (E+30:00 Penz Finance/Admin SC stand-up, E+30:30 demob discussion, E+35:00 Sayer Doc UL formal arrival).

---

## Question 1 — What was supposed to happen?

The IST perspective evaluates FieldShore from the **incoming-fresh-federal-actor** angle. A FEMA Incident Support Team arrives at a major incident already in progress, expects to plug into standard NIMS doctrine via standard ICS forms (201, 202, 203, 204, 207, 209, 211, 215), and integrates without disturbing operational tempo. I came in with the v4.0.0 hypothesis that the v3.x app would surface gaps along four axes: (1) **multi-tenancy** — federal vs state vs local visibility and write scope; (2) **ICS-forms exportability** — can the IST PSC draft an OP-N+1 IAP from app data alone; (3) **SitStat 60-second snapshot** — can incoming IST personnel achieve situational awareness without parallel docs; (4) **Demob workflow** — does the app support the structured release of resources the IST Demob Coordinator must run.

I expected gap density to be uniformly high across all 13 checklist items. I specifically expected (a) ICS-203 / 207 to be partially deliverable from the Command tab, (b) ICS-202 / 204 / 215 / 209 to be entirely absent, (c) Demob to be a paper-only workflow, (d) Finance/Admin SC to have no app surface, (e) Doc UL to have no comprehensive export. I expected the IST integration moment (E+27:00 PSC Bauer) to produce the densest concentration of friction.

## Question 2 — What actually happened?

Every prediction held, and several gaps were larger than predicted. The most consequential finding, recorded in mod-ist note line 8: **`localStorage.deptId=sim-surfside-ttx-2` is the entire scope mechanism.** Anonymous Auth grants identical read/write scope to a federal IST member, a state TF Plans, and a local-FD member. There is no per-actor identity beyond `auth.uid`, no `agency` tag on writes, no role/scope/tenant model. When IST PSC Bauer "arrived" at E+27:00, she had full write access to TF-State Cache inventory, full write access to local-FD apparatus, and full write access to every operation in the dept. This is the v4.0.0 Phase 3A/3B gap not as a partial — as a complete absence. The membership-gating rule (`data.child('members').child(auth.uid).exists()`) does scope read by dept, but does nothing to scope by agency or role within a dept.

**IST integration moment (E+26:00 + E+27:00):** Demob Coordinator Hall arrives E+26:00 and PSC Bauer arrives E+27:00 per `conductor-state.op3_closed.ist_integrated`. The app had no SitStat surface for them. mod-ist note line 9 confirms: app version v3.11.1, zero buttons across 125 total contain `'status/sitstat/activity/feed/log/history/demob/finance/cost/time/ICS'` tokens. The 60-second SitStat is not deliverable — Bauer would have had to hand-walk Operations cards and the Command modal to derive incident state. In the live run, the IAP-op3.md file (6,230 words) was the actual onboarding artifact, not the app.

**IST PSC Bauer augmented PSC #3 with no in-app surface:** the simulation captured this as a doctrine-correct dual-PSC arrangement (federal-level PSC working alongside local-level PSC under the unified IC), but the app has no way to express it. The role-assign model is single-slot per role; a "PSC #3 augmented by IST PSC Bauer" arrangement collapses into either an overwrite or an orphan custom role (cross-reference to mod-data line 6 + conductor friction entry "Orphan custom roles after escalation").

**Demob held entirely in Google Sheets:** the OP4 demob discussion (E+30:30, conductor-state.op4_closed.demob_discussion) involved Demob UL Nash + IST Demob Coordinator Hall + PSC #3 + IC Whitaker. The release sequence (Search element first → Rescue Squad Alpha → Wood Spec → Heavy Rigging holding → Cache Decon completion → PSC + Sit Specs last out) and the cache-decon math (4hr/item × 46 items = 8 personnel-hr load) were worked out in parallel Google Sheets. The app has zero demob lifecycle UI — Settings, Operations, Inventory, Command all lack any demob surface (conductor friction entry "No demob UI surface anywhere"). The IST Demob Coordinator's primary tool was not FieldShore.

**Finance/Admin Section completely greenfield:** OP4 stood up a 5th Section under IC (Finance/Admin SC — Director Penz, E+30:00) — verified at the data layer and rendered at the UI layer. **But:** (a) `ICS_ROLES_DEFAULT` in `app.js` has no Finance/Admin SC entry (Phase 3C.1 gap, conductor friction); (b) there is no double-hat / multi-role-per-individual support, so Penz's dual FASC + Cost UL role required a shadow-individual workaround; (c) Time UL formal arrival at E+32:00 and Doc UL Sayer formal arrival at E+35:00 both occupied roles with no in-app surface for their work. Cost capture, time tracking, and documentation are all out-of-app activities.

**Federal vs state vs local agency tagging entirely absent:** mod-data baseline (line 5) at T-15 confirmed zero of 38 apparatus carry an `agency` field. TF-State Cache and TF-Fed-Alpha/Bravo/Charlie Caches arrived as apparatus chips indistinguishable from local Engine 1 or Ladder 2 except by name string. The IST cannot ask "show me only federal apparatus" or "show me TF-State's external equipment" — no filter exists because no tag exists.

**Cross-OP command-frequency transitions (5 IC transfers):** Reyes → McAllister → Park → Whitaker → Vasquez → Whitaker (4 transfers forward + 1 return). Each transfer leaves no role-history trail (cross-reference mod-data + 6 instances in conductor friction). When IST PSC asks "who held IC at E+9:00?", the answer comes from `iap-op2.md`, not the app.

**Victim-cluster linkage:** mod-ist note 5 — grep for `victimCluster` returns zero matches. SPs have Building/Floor/Division/Area/Group but no proper VLU data structure. The OP3 V-Cluster-10 discovery at E+18:00 had to encode cluster membership in the SP label string, which IST cannot parse without manual processing.

**OP3 driver non-persistence:** conductor-state friction confirms OP3 driver event-log entries (34 SPs + 21 status writes + IC/OSC transitions + role escalations) were NOT persisted to UI/database; the OP4 driver re-applied state. From an IST perspective this is fatal — the documentation chain Doc UL Sayer is responsible for cannot be reconstructed if OP-to-OP state does not persist atomically.

## Question 3 — Why was there a difference?

The IST gaps are doctrinal, not regressions. The v3.x app was built for a single-agency, single-incident, single-OP shoring tool. Multi-agency NIMS doctrine — IST integration, ICS forms 202/204/207/209/215, demob workflows, finance/admin section, append-only role tenure, victim cluster linkage — is the v4.0.0 scope from beginning to end. The sim served as the predicted-outcome confirmation rather than a discovery exercise: every gap mod-ist flagged is already named in MASTER-PLAN Phase 3B/3C/3D or scoped as **NEW**.

The single most consequential gap, and the one most likely to require its own dedicated v4.0.0 sub-phase rather than fitting into existing 3B, is the **per-actor, per-agency identity model**. Today the app has one identity primitive (`auth.uid`) and one scope primitive (`members[uid]` map). FEMA US&R doctrine needs at minimum: actor.uid, actor.fullName, actor.agency (federal-IST / federal-TF / state-TF / state-EM / local-FD / local-PD / contractor), actor.role (current ICS position), actor.qualifications (USAR-Specialist, Structural-Specialist, Rescue-Specialist, ...), actor.checkInTs, actor.checkOutTs. Without this, none of the downstream Phase 3B/3C/3D deliverables (per-write attribution, role history, T-Card, ICS-203, ICS-211, ICS-209) compose cleanly.

The OP3 driver non-persistence is a simulation-runtime issue, but from the IST perspective it also points to a real app gap: there is no OP-boundary verification surface ("the app thinks the prior OP wrote N changes — confirm or reconcile").

The demob-in-Google-Sheets outcome reflects that demob is not a single screen — it's a workflow (proposed → reviewed by IST + Demob UL + PSC + IC → approved → executed → resource departs) — that crosses Apparatus, Personnel, External Equipment, and Op-state. None of these have lifecycle hooks today.

## Question 4 — What can we learn from it / what should change?

**App changes (concrete):**

1. **Per-actor identity model.** Extend `auth.uid` with `fullName`, `agency`, `qualifications[]`, `checkInTs`, `checkOutTs`, `currentRole`. Stored at `/departments/{deptId}/personnel/{uid}`. Tag: `Phase 3A.2` + `Phase 3B.1`. Severity: critical.
2. **Agency tagging end-to-end** on apparatus, inventory, external equipment, and personnel. Render agency badge on chips. Filter by agency in Inventory + Operations. Tag: `Phase 3B.1` + `3B.3`. Severity: critical.
3. **Per-role per-agency write scope.** Reads can remain shared within a dept; writes scope by agency and role. Federal IST PSC writes are visible to local-FD as read-only; local-FD cannot write to TF-State Cache inventory. Tag: `Phase 3A.2` + `Phase 3B`. Severity: critical.
4. **SitStat (ICS-209-equivalent) snapshot view.** Single screen showing pile status, recent rescues, weather/hazards, current/next priorities, command staff, apparatus on-scene, personnel on-scene, status counts. Achievable in <60 seconds for incoming IST. Tag: **NEW**. Severity: high.
5. **ICS-203 / 207 export from Command tab live state.** Tag: `Phase 3D.1`. Severity: high.
6. **ICS-202 / 204 / 215 draft from OP data.** Even a partial export (objectives, command emphasis, attached forms list) is materially better than blank. Tag: `Phase 3D.1`. Severity: high.
7. **ICS-211 check-in list with arrival timestamp, agency, qualifications, current assignment.** Driven by the per-actor identity model. Tag: `Phase 3D.1` + `Phase 3C.4`. Severity: high.
8. **Demob workflow.** New section in Operations: proposed release sequence list (drag-orderable), per-resource demob status (proposed → reviewed → approved → executing → released), check-out timestamps, cache-decon prereq tracking. Tag: `Phase 3C.4` + `Phase 3D` / **NEW**. Severity: high.
9. **Finance/Admin Section as 5th Section under IC** in `ICS_ROLES_DEFAULT`. Add Cost UL + Time UL + Procurement UL + Comp/Claims UL. Tag: `Phase 3C.1`. Severity: high.
10. **Double-hat / multi-role-per-individual** so Penz can legitimately hold FASC + Cost UL without a shadow workaround. Tag: `Phase 3C.1` + `Phase 3C.5`. Severity: high.
11. **Time UL + check-in/check-out timestamps** on personnel. Drives ICS-211, drives demob, drives cost. Tag: `Phase 3C.4`. Severity: high.
12. **Cost capture surface** — cost-bearing events (personnel hours, consumable use, apparatus deploy time). Tag: **NEW**. Severity: medium.
13. **Documentation Unit comprehensive export** — every record (op timeline, role history, SP lifecycle, apparatus check-in/demob, hazards, incidents, costs) exportable as a single archive. Tag: `Phase 3D.1`. Severity: high.
14. **Append-only role history** (also a mod-data finding) — required for IST PSC's "who held X at time Y" question. Tag: `Phase 3C.5`. Severity: critical.
15. **VLU data structure** — SP gains `victimCluster: clusterId` field; SP→victim linkage queryable. Tag: **NEW**. Severity: high.
16. **OP-boundary snapshot owned by app + diff view** so Doc UL can reconcile what the app thinks happened vs. driver/conductor records. Tag: `Phase 3C.3`. Severity: high.
17. **Dual-PSC (and dual-role generally) support** so IST PSC Bauer can augment PSC #3 without orphaning. Tag: `Phase 3C.5`. Severity: medium.

**Doctrine / runtime changes:** the sim runtime needs persistence verification between OPs (mod-data also flags). Participant prompts for the IST personas should explicitly call out the SitStat + demob expectation so v4.x evaluation can measure progress concretely.

## Cross-reference

- **Linked notes:** `notes/moderator-mod-ist-notes.jsonl` lines 1–9
- **Linked IAPs:** `iaps/iap-op3.md` (IST integration), `iap-op4.md` (Finance/Admin stand-up, demob discussion)
- **Linked conductor-state entries:** `op3_closed.ist_integrated`, `op4_closed.new_roles_assigned`, `op4_closed.finance_admin_section_outcome`, `op4_closed.demob_discussion`, friction indexes 14, 15, 16, 21, 22, 23, 26, 27, 28, 29

## Synthesis tags

```
tag: Per-actor identity model with agency + qualifications + check-in/out timestamps | phase: 3A.2 | severity: critical
tag: Per-role per-agency write scope so federal IST and local FD differ | phase: 3B | severity: critical
tag: Append-only role history queryable by time | phase: 3C.5 | severity: critical
tag: SitStat 60-second snapshot view for incoming IST | phase: new | severity: high
tag: ICS-202/203/204/207/211/215 export from app data | phase: 3D.1 | severity: high
tag: Demob workflow with proposed→reviewed→approved→executing→released lifecycle | phase: 3C.4 | severity: high
tag: Finance/Admin Section in ICS_ROLES_DEFAULT plus Cost/Time/Procurement/Comp ULs | phase: 3C.1 | severity: high
tag: Double-hat support — multi-role per individual without shadow workaround | phase: 3C.5 | severity: high
tag: VLU data structure — SP.victimCluster field with queryable SP→victim linkage | phase: new | severity: high
tag: Documentation Unit comprehensive single-archive export | phase: 3D.1 | severity: high
```
