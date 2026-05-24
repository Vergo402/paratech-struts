# Surfside TTX-2 — Final Report

> **Event:** Pinecrest Tower Collapse (Type I → Type II USAR/FEMA TTX)
> **Event clock:** E+0:00 → E+36:00 (4 OPs; halted 2026-05-17)
> **Report date:** 2026-05-17
> **Source set:** 4 IAPs (19,190 cumulative words) + 12 AAR submissions + 7 moderator note files + 63 IP-# rows + 30-entry conductor friction log
> **Audience:** Alex (greenlight authority for v4.0.0 planning changes)

---

## 1. Executive Summary

Surfside TTX-2 drove FieldShore v3.11.1 through 36 simulated hours of an escalating Type I collapse incident — from a 28-apparatus initial response at OP1 close to a peak of **494 personnel and 50 apparatus** at OP4 close, with **66 shore points** created across the event, **4 IAPs** filed (19,190 cumulative words), **5 IC transfers + 6 OSC rotations**, **12 live extractions + 4 confirmed-deceased recoveries**, FEMA IST integration at E+26:00–E+27:00, and a 5-Section command structure standing up Finance/Admin under IC at E+30:00. The hotwash produced **63 IP-# findings** (**14 critical, 28 high, 17 medium, 4 low**); the three most consequential criticals are (1) **IP-007 — Add-SP modal Save Changes button hidden in the Add path**, forcing programmatic injection bypass for every one of 66 SPs across all 4 OPs with no patch shipped between OPs; (2) **IP-001 — anonymous-auth granting all users full read/write to all departments** with no per-agency scope, identified within 15 minutes of IST PSC Bauer's E+27:00 arrival ("anonymous auth grants identical read/write scope to a federal IST member, a state TF Plans, and a local-FD member"); and (3) **IP-006 — role history not preserved across any role transition** (5 IC transfers + 6 OSC rotations + multiple Branch/Group/Unit escalations, 100% reproducible loss rate, critical for ICS-209 reconstruction). The gap analysis recommends **51 MASTER-PLAN edits across Phases 3A–3F plus 7 release-blocker pre-work items** that must ship before v4.0.0 phase code begins.

---

## 2. Headline Findings

- **Add-SP modal Save Changes button was hidden in the Add path** for all 4 OPs (IP-007). 66 SPs were created via programmatic `db.ref().push() + persistOperation()` workaround. Seven of twelve AAR files cite it — the highest source-count finding in the table. The integration test asserting `submit.offsetParent !== null` is a single-day fix that would have prevented the entire 36-hour bypass.

- **Default ICS_ROLES_DEFAULT shipped without Finance/Admin SC, Cost UL, or Time UL** (IP-005). The 5th Section standup at E+30:00 hit the gap cold (Director Penz, FASC). Cumulatively, **4 doctrine-defining ICS roles are missing from defaults** (FASC + Cost UL + Time UL + Procurement UL) plus Liaison/PIO/LSC/PSC/Branch tier filled by custom roles under operational pressure across OP1–OP2 (13 custom roles by OP2 close, 24 by OP4 close).

- **Role history is not preserved across any role transition** (IP-006). Confirmed 11+ times — 5 IC transfers, 6 OSC rotations, plus all Branch/Group/Unit tier escalations. Doc UL Sayer maintained an independent Google Sheet role-history log going back to E+0:00 to enable ICS-209 reconstruction. MASTER-PLAN Phase 3C.5 covers this in scope but the UI surface for the transfer-audit view is undefined.

- **Multi-tenancy gap: anonymous auth grants all users full r/w to all departments** (IP-001, IP-004). IST PSC Bauer's E+27:00 arrival was the first encounter — within 15 minutes she had write access to TF-State Cache, local-FD apparatus, and every operation in the dept. mod-ist captured it as "`localStorage.deptId=sim-surfside-ttx-2` is the entire scope mechanism." This is the v4.0.0 Phase 3A/3B gap **not as a partial — as a complete absence**.

- **`estimatedLoad` numeric validate rule was undocumented** (IP-011). OP4's first programmatic SP create failed PERMISSION_DENIED because the UI dropdown emits string labels `'medium'`/`'heavy'` while the database.rules.json validate requires numeric. The validate rule is correct; the API contract is the gap.

- **No demob UI surface exists anywhere** in FieldShore (IP-008). Demob UL Sgt. Nash worked the entire OP3 and OP4 demob planning outside the app — Google Sheets + paper ICS-220/221. mod-ist: "This is the single biggest missing surface for Type I/II ops." TF-State release sequence (Search element → Rescue Squad Alpha → Wood Spec → Heavy Rigging → Cache Decon → PSC last out) lives only in IAP-OP4 Attachment B.

- **No cribbing-decay tracking on SPs** (IP-009). The E+33:30 Conway+Beck audit found 6 SPs requiring rework (SP-50–SP-55) after multi-day salt-saturated exposure. The 6 SPs were redone in-OP, but the audit lived in PSC's parallel notebook + photos — no `lastInspected`, no `cribbing_status`, no `auditHistory[]` exists in the data model.

- **No stop-work UI feature** (IP-032). OP3 wind gust 28 mph at E+22:00 and rain at E+24:30 were handled via radio TAC-2 only. No operation-level safety state, no per-SP `paused` status. Stop-work is a doctrinal stop-the-line primitive and FieldShore has zero surface for it.

- **OP3 driver event-log entries were not persisted to UI/database** (IP-012). OP3's 34 SP creations + 21 status writes + IC/OSC transitions + role escalations did not survive into OP4 — OP4 driver had to re-apply state from scratch via 2-step manual reconstruction. Not an app bug per se, but the simulation runtime needs a persistence-verification snapshot-diff between OPs.

- **Apparatus naming uniqueness is unvalidated** (IP-033). TF-State-Rescue-A, TF-Fed-Alpha-Rescue-A, TF-Fed-Bravo-Rescue-A, TF-Fed-Charlie-Rescue-A all collide on "Rescue-A" token across 4 federal+state TFs. mod-comms calls this a **life-safety class radio-net ambiguity** and a release-blocker pre-work item.

---

## 3. v4.0.0 Backlog Deltas

Findings tagged `gap` (15 after re-classification) plus highlights from `partial` (9). One row per finding with proposed MASTER-PLAN addition, target phase, and severity.

| IP-# | Finding (short) | Proposed MASTER-PLAN Addition | Target Phase | Severity |
|---|---|---|---|---|
| IP-001 | Anonymous auth = full r/w to all depts (no per-agency scope) | 3A.3 — per-agency scope inside `/operations/{opId}` rules + role-based write gating (federal-IST read-only on local-FD; local-FD cannot write to TF-State cache) | 3A.3 | critical |
| IP-003 | `agency` field present at data layer but invisible in UI | 3B.3 — agency badge on apparatus chip + group-by-agency in Inventory + agency filter + agency-coverage report | 3B.3 | critical |
| IP-004 | Per-role per-agency write scope absent | 3A.3 — read-shared / write-scoped semantics in operation rules | 3A.3 | critical |
| IP-005 | ICS_ROLES_DEFAULT missing Finance/Admin SC + Cost UL + Time UL | 3C.1 — add FASC + Cost UL + Time UL + Procurement UL + Comp/Claims UL to Type III and Type I/II presets | 3C.1 | critical |
| IP-008 | Demob lifecycle entirely absent (Nash worked outside app for 2 OPs) | 3C.4 — full FEMA proposed→reviewed→approved→executing→released lifecycle + cache-decon prereq tracking + drag-orderable release-sequence plan | 3C.4 | critical |
| IP-009 | Cribbing-decay tracking missing (6 SPs flagged + redone E+33:30) | 3C.8 (new) — `lastInspected` + `cribbing_status` enum + `auditHistory[]` on every SP + Cribbing Audit view | 3C.8 | critical |
| IP-014 | NIMS Type I–V preset absent from Start Operation modal | 3C.1 — "Choose ICS Template" selector wired into Start Operation modal; Type II preset includes all 5 Sections + Command Staff + Staging | 3C.1 | critical |
| IP-018 | Staging area absent from default org tree under OSC; no Released terminal state | 3C.1 — Staging as first-class node under OSC + Released terminal state for apparatus | 3C.1 | high |
| IP-019 | Apparatus + personnel check-in/demob timestamps absent | 3C.4 — individuals-level check-in/check-out + Time UL surface with shift tracking | 3C.4 | high |
| IP-020 | Span-of-control warnings + Branch-tier promotion workflow absent | 3C.2 — span warning (>7) at Section→Branch transition + "Convert to Branches" workflow | 3C.2 | high |
| IP-022 | Full FEMA Type I Command + General Staff not in preset (13→24 custom roles needed) | 3C.1 — enumerate full FEMA Type I Command Staff + General Staff in preset (Liaison, PIO, FASC, branch directors, group sups, all unit leaders) | 3C.1 | high |
| IP-023 | `renderOrgChart` parentId depth 4+ unverified (crashed twice OP1, twice OP2) | 3C.2 — default `roleAssignments` to `{}`; visual-layout test at depth 4/5/6 | 3C.2 | high |
| IP-025 | ICS-205 Comms Plan surface absent | 3D.2 (new) — ICS-205 surface per OP (Command/Tactical/Support/Air-to-Ground/Emergency Traffic) with per-role `nets: []` binding | 3D.2 | high |
| IP-026 | OP-boundary snapshot ownership lives outside app | 3C.3 — app-owned snapshot emission + "writes since last snap" diff in Command tab | 3C.3 | high |
| IP-029 | 5-query smoke deck not wired into CI regression | 3E.6 (new) — lock 132"/15klb, 24"/8klb, 200"/5klb, 96"/25klb, 120"/200klb into CI on every release | 3E.6 | high |
| IP-030 | Dashboard count cards stale ~30s after programmatic mutation | 3F.5 (new) — reactive count cards subscribed to local-first state stream | 3F.5 | high |
| IP-039 | Pre-imported chief-level apparatus rows absent (9 chiefs hung off Individuals in OP2 alone) | 3F.1 — canonical chief roster (app-ic-day/night, app-osc-2/3, app-psc-2, app-lsc-2, app-fasc-1, branch/group apparatus) in pre-built bundles | 3F.1 | high |
| IP-043 | Cache apparatus chips show empty `.struts` rollup | 3D.1 — materialize apparatus-level rollup via listener on inventory items | 3D.1 | medium |
| IP-045 | Multi-holder render at Group Sup tier shows only first assignment | 3C.6 — render all holders at multi-assigned role nodes with "multi-holder" badge | 3C.6 | medium |
| IP-046 | Orphan custom roles after escalation (7 orphans by OP3 close) | 3C.5 — custom-role deprecate/supersede workflow + prompt on individual escalation | 3C.5 | medium |
| IP-056 | Virtualization on SP list + apparatus selector uncalibrated | 3F.9 (new) — virtualization + find-struts memoization cache invalidation | 3F.9 | medium |
| IP-057 | Dual-keyed SP IDs (Object.keys vs push-key) undocumented | 3C.7 — normalize SP ID indexing alongside group→assignedResource rename | 3C.7 | medium |
| IP-015 | WCAG 1.4.3 contrast fails on 2/7 dark + 4/7 light status pills | 3F.4 (new) — WCAG AA audit across all 7 pills in both modes | 3F.4 | high |
| IP-060 | Stale `fieldshore_*` localStorage keys (pre-v3.11.1 rename leftover) | 3B.2 — clean stale keys during v3→v4 migration | 3B.2 | low |

---

## 4. Doctrine Recommendations

Items requiring NIMS / SOP review (owner: `doctrine-review`) before app implementation. All 63 IP rows currently route to `app-eng` or `alex-decision`, but the following carry NIMS doctrine implications that warrant Alex's doctrine-review pass before coding begins:

- **NIMS terminology — `group` field rename.** SP `group` (used 66 times for apparatus assignment) violates NIMS doctrine where Group is a functional command unit, not a resource. Rename to `assignedResource` AND add separate optional `nimsGroup` field (IP-017, MASTER-PLAN 3C.7). Confirmed across all 4 OPs.

- **Full FEMA Type I roster as defaults.** Current 9-role flat default is Type IV/V appropriate; Type II/I incidents require the full Command Staff (PIO, LNO, SO) + General Staff (5 Sections including Finance/Admin) + Branch tier + Unit Leaders. The standup of FASC at E+30:00 under custom-role workaround proves the gap (IP-005, IP-022).

- **Operational period as a first-class concept.** OP boundaries are doctrinal stop-the-line for IAP cycle, plan-do-review, span-of-control reassessment, and PAR. FieldShore renders 36 hours as one continuous timeline (IP-016). Add OP indicator + boundaries doctrine to Command + Operations tab headers.

- **Command Staff vs General Staff distinction.** Default tree treats Liaison, PIO, SO (Command Staff under IC) the same as Section Chiefs (General Staff). Type I/II structure requires the doctrinal distinction in both data model and render path (folded into IP-022 + IP-014).

- **ICS-205 Comms Plan as a doctrinal artifact.** Net assignments per role per OP are required for any Type II+ incident (IP-025). Grep across `app.js` + `index.html` returns zero matches — the doctrine is wholly outside the tool.

- **24-hour timestamps + Zulu time discipline app-wide.** Fireground radio-log doctrine is 24-hour; FieldShore renders 12-hour AM/PM via `Date.toLocaleString()` defaults across 5 cmd transfers + 6 OSC rotations (IP-034). Replace all locale-default formatters with explicit `{hour12: false}` site-wide.

- **Unified Command as a primary USAR pattern.** Sheriff Garza UC-Law standup at E+6:15 lived entirely outside the ICS data structure because `ic` is a singular field (IP-013, MASTER-PLAN 3B.4). Replace with `IC` collection; surface ≥2 IC slots in Command tab from op start.

---

## 5. Alex Decision Queue

Product calls that need an Alex decision before implementation can scope (owner: `alex-decision`):

- **Multi-tenancy / per-agency identity in v4.0.0 — yes or v4.1.0?** IP-001 + IP-004 cover the full per-actor / per-agency identity model (actor.uid + actor.fullName + actor.agency + actor.role + actor.qualifications + actor.checkInTs + actor.checkOutTs). mod-ist: "Without this, none of the downstream Phase 3B/3C/3D deliverables (per-write attribution, role history, T-Card, ICS-203, ICS-211, ICS-209) compose cleanly." If yes, MASTER-PLAN Phase 3A and 3B need significant scope expansion; if v4.1.0, the 14 critical findings tied to identity defer with it.

- **Demob lifecycle scope — minimum viable vs full ICS-220/221 form export?** IP-008 is critical and Nash worked outside FieldShore for 2 OPs. Minimum viable = proposed→reviewed→approved→executing→released lifecycle + per-resource demob status. Full = also ICS-220 Resources Demob Plan + ICS-221 Check-Out form generators + cache decon prereq tracking + drag-orderable release-sequence plan. Recommend full for v4.0.0 given how much paper this generated.

- **Double-hat / multi-role assignment per individual — feature flag or default-on?** IP-040: Director Penz double-hat as FASC + Cost UL required a shadow individual `i-penz-cost` workaround. NIMS Type I doctrine permits double-hat at span <7. Default-on is doctrinally correct but adds conflict-flagging UI burden; feature flag preserves current single-role simplicity.

- **Release-blocker pre-work as v3.11.2 hotfix before v4.0.0 begins (Y/N)?** Seven findings are release-blocker-class (IP-007, IP-010, IP-011, IP-033, IP-034, IP-047, IP-048). All seven could ship as a single v3.11.2 PATCH in <1 week. Recommendation: **yes, ship v3.11.2 first** — they unblock the next TTX and de-risk v4.0.0 phase code.

- **IP-059 prioritization call — which of cribbing/demob/CISM/heat/cost/time/safety-state ship in v4.0.0 vs v4.1.0?** The gap analysis recommends cribbing (IP-009) + demob (IP-008) + safety-state (IP-032) for v4.0.0 (safety-critical + IST-blocking); CISM (IP-052) + heat (IP-041) + cost (IP-042) + time (in IP-019) for v4.1.0. Alex's call on whether to consolidate or split.

- **Drop list — none recommended.** IP-012 and IP-063 are simulation-runtime concerns, not app changes; they stay in the simulation-runtime backlog rather than being dropped outright. Every other finding has a credible v4.0.0 or v4.1.0 home.

---

## 6. Coda — "What I'd ship Monday morning"

If we ship nothing else from this TTX before v4.0.0 work begins, ship these 3 in a v3.11.2 PATCH:

1. **Fix the Add-SP modal Save Changes button visibility in the Add path** (IP-007). Decouple SP-create from find-struts; show Save Changes always in Add path; add the one-line integration test asserting `submit.offsetParent !== null && getComputedStyle(submit).display !== 'none'`. Seven AAR files cite this; it cost us 4 OPs running of programmatic-injection bypass.

2. **Add Finance/Admin SC + Cost UL + Time UL + Doc UL + Demob UL to `ICS_ROLES_DEFAULT`** (IP-005, partial coverage of IP-022). 30-minute fix; the OP4 E+30:00 5th Section standup proved the data layer + UI render path already work — the gap is the default constant. This single edit lets the next TTX stand up a 5-Section structure without a custom-role workaround.

3. **Document the `estimatedLoad` numeric API contract** (IP-011). Coerce string → numeric in `addShorePoint()` before write; add inline form hint on the dropdown ("medium = 5 klb, heavy = 15 klb"); surface a structured client-side error on string write instead of PERMISSION_DENIED. One file, three sites.

That's a single PATCH release Alex can ship Monday morning that closes the highest-source-count critical, the single doctrinal default that broke OP4's standup cold, and the API-contract gap that wasted 90 seconds at every programmatic SP create. The other four release-blocker pre-work items (IP-010 guardClick, IP-033 apparatus naming uniqueness, IP-034 24-hour timestamps, IP-048 Start-Op apparatus checkbox eager-render) can ride in v3.11.3 the following week, or fold into the v4.0.0 release-blocker pre-work bundle — they don't gate Monday.
