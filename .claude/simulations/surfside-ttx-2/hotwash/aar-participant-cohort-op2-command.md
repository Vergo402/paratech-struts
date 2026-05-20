# AAR — Participant Cohort: OP2 Command (IC / OSC / PSC)

> Army-AAR format. Cohort lead voice. Drafted at hotwash Phase 1 after E+36:00 event-clock halt. ⚠️ Training-only.

---

## Subject identification

- **Cohort ID:** `op2-command-cohort` (composed of `ic-op2`, `osc-op2`, `psc-op2`)
- **Personae:**
  - **IC #4** — Chief Whitaker (day shift; assumed cmd via Transfer #3 at E+9:00 from DC Park)
  - **OSC** — TFL Brennan (TF-State, E+5:00 → E+14:00) → TFL Marquez (TF-Fed-Alpha, E+14:00+)
  - **PSC #2** — Capt. Doyle (TF-State Plans Team Manager, confirmed at E+5:00 from PSC #1 advance role)
- **Active window:** E+4:00 → E+16:00 (12-hour day shift)
- **Submission date / wall-clock:** 2026-05-17 (hotwash phase 1)

## Operational period(s) covered

OP2 only (sustained-rescue mass-deploy day shift).

---

## Question 1 — What was supposed to happen?

Per **IAP-OP2** (ICS-202; 4,157 words, approved by IC #3 Park first half and IC #4 Whitaker second half) and the per-role overlays for `ic-op2`, `osc-op2`, `psc-op2`, our command cohort was responsible for seven SMART objectives spanning a 12-hour day shift:

1. **Stabilize the N-wing cleavage zone** by E+8:00 (Bravo cantilever Fl 11, divisional shoring Fl 7–11).
2. **Recover Tier-1 confirmed-alive Cluster victims** (V-Cluster-1, -2, -5, -6, -9) — open access lanes, drive cuts to runner/secured, extract.
3. **Establish full pile-sector access** (A, B post-gas-iso, C, partial D periphery).
4. **Achieve 110 cumulative SPs created** (run-rate target — OP2 mass-deploy phase budget).
5. **Integrate multi-agency arrivals** — TF-State main body E+5:00 (66 personnel completing 70-person Type I), TF-Fed-Alpha advance E+12:00 (5), TF-Fed-Alpha main body E+14:00 (75), UC-Law E+6:00 (Lt. Garza + 30 LE), County PW E+6:30 (8).
6. **Stand up NIMS Type I Command Staff + General Staff with Branch-tier structure** — Rescue Branch Dir (Vega), Search Group Sup (Kim), Shoring Group Sup (Beck escalated), Heavy Rigging Group (Tower 1 + Heavy 1 paired), Medical Unit (Patel), Demob UL (Nash).
7. **Complete IAP-OP3** — PSC #2 drafts and submits by E+15:30 pre-boundary.

Cmd Transfer #3 (Park → Whitaker) was the only formal IC transfer in OP2. OSC rotation chain: McAllister → Brennan (E+5:00) → Marquez (E+14:00) — two rotations within the 12-hour window. The Operations span-of-control mandate (NIMS ≤ 7, preferred ≤ 5) drove the Branch-tier expansion: span exceeded 7 once TF-State arrived, forcing Rescue Branch Director emergence at E+5:30.

---

## Question 2 — What actually happened?

The command structure landed cleanly on the IAP timeline. **Cmd Transfer #3 (Park → Whitaker) executed at E+9:00** — clean ICS-201 verbal + Command tab UI re-assign. **OSC rotation Brennan → Marquez at E+14:00** on the TF-Fed-Alpha main body arrival. UC with County Law established **E+6:15** (Lt. Garza UC-Law arrival E+6:00 + 15-min ICP integration). All seven NIMS Branch / Group / Unit positions populated by E+8:00 except Demob UL Nash (E+15:00 per timeline).

We hit **35 SPs in OP2** for a cumulative **49 SPs** (14 OP1 + 35 OP2). The IAP target was 110 cumulative — we landed at **44.5% of budget**. The status distribution at OP2 boundary: 1 secured (SP-1 V-Cluster-3 W cantilever at E+14:30, the first secured SP of the incident), 1 runner, 3 cutting, 5 strutplaced, 31 process, 8 pending, 0 returned. Two live extractions in OP2: **V-01 at E+13:45** (Pile A Fl 8, ambulatory after triage) and **V-02 at E+13:50** (leg-pinned, freed by Squad 1 reciprocal saw on rebar).

Friction was the dominant story of OP2. Specific surfaces, in order of severity:

- **Add-SP modal Save Changes button still hidden in Add path** (carryforward from OP1). After ~12 SPs of manual workaround in OP2's early mass-deploy phase, the cohort accepted the workaround was unsustainable for a 110-SP budget and **introduced a programmatic bypass via `db.ref('departments/sim-surfside-ttx-2/operations/<opId>/shorePoints').push() + persistOperation()`**. This bypass is what got us to 35 SPs — without it we'd have hit ~12. Realistic friction estimate for a real USAR team without dev-tools console access: **45–60 seconds per SP** with the find-struts roundtrip and the modal Save-button hunt; we estimate a real team would have reached ~70 SPs vs the 110 projected.
- **Dashboard count cards not refreshing after programmatic mutation** — after `push()` + `persistOperation()`, the Operations dashboard continued to show stale SP counts for ~30 seconds (apparent debounce), or required a full-page reload to refresh. Not a data-correctness issue — Firebase and localStorage both held correct state, verified by `mod-data` — but UX-confidence-undermining at scale, because the IC's situational picture from the dashboard lagged the true state of the incident.
- **`renderOrgChart` bare-call crash recurrence** — same Object.values(undefined) crash as OP1, hit twice in OP2 during org-chart verification (once at the Branch-tier expansion, once at the OSC rotation). Worked around the same way (pass assignments explicitly), but it remains a recurring papercut at every org-chart structure change.
- **`ICS_ROLES_DEFAULT` missing Branch / Group / Unit tier** — OP1 had already required 3 custom roles (Liaison, PIO, LSC); OP2 required **6 more** for the NIMS Type I Branch-tier expansion: Rescue Branch Director, Search Group Supervisor, Shoring Group Supervisor (escalated from interim), Heavy Rigging Group Supervisor, Medical Unit, Demob Unit Leader. Total customRoles at OP2 close: **13 unique roles**. parentId chains 4-deep (`ic → operations → rescue_branch → squad-alpha`) accepted by the data layer, but **UI rendering at depth 4+ unverified** — the Command tab's org chart visualizer may collapse or mis-render at this depth; mod-ux flagged for hotwash.
- **TF-State + TF-Fed-Alpha caches arrived as apparatus chips with empty `.struts` field** — `app-tf-state-cache` and `app-tf-fed-alpha-cache` were added to the apparatus list correctly on cache arrival, but the materialized `.struts` summary stayed empty even though individual inventory items were correctly attributed by `apparatus: app-tf-state-cache`. The inventory was queryable from the items side but the apparatus-level rollup was out of sync. LSC could not get a quick "how many struts are in TF-State cache?" view from the apparatus chip.
- **No bulk inventory deploy mode** — `deployPendingShorePoint()` expects a per-SP find-struts roundtrip (open modal → search by measurement → pick a match → confirm deploy). For mass-deploy phases this is the wrong workflow. There is no "deploy 5 SPs against these 5 struts as a batch" path. The 45–60s per-SP estimate above is dominated by this roundtrip, not by modal-Save friction alone.
- **Role history not preserved across OSC rotation** — McAllister → Brennan → Marquez chain overwrote `roleNames['operations']` twice with no historical trace (v4.0.0 Phase 3C.5 gap, **OP1+OP2 confirmed four times now** across IC #2→#3, IC #3→#4, OSC McAllister→Brennan, OSC Brennan→Marquez).

PSC #2 (Doyle) filed **IAP-OP3** at E+15:30 pre-boundary per mandate — 6,230 words — covering night-shift sustained ops, the E+22:00 wind-gust paper event, and the V-Cluster-10 emergent discovery at E+18:00.

---

## Question 3 — Why was there a difference?

The 44.5% SP-budget achievement is **almost entirely the SP-creation modal friction**, compounded by the absence of bulk deploy and the dashboard-stale-count UX. The programmatic bypass was a forcing function: without it OP2 would have been a documented coordination failure. With it, the cohort got data-correct results but at the cost of bypassing the very UI the v4.0.0 audit is meant to validate. That's a methodology tension we want to flag explicitly — **a v4.0.0 fix to the Add-SP modal alone won't validate "the modal works at scale"; it has to be tested with bulk deploy and stale-count-refresh fixes together**.

The Branch / Group / Unit tier custom-role requirement is the same `ICS_ROLES_DEFAULT` shallowness OP1 flagged, intensified. A Type I incident reliably exceeds Operations span-of-control once a state TF arrives; the **Branch tier emergence is doctrine, not novelty**. The app should seed it. Instead, OP2 burned senior-officer attention on creating six custom roles in the middle of mass-deploy.

The TF-State + TF-Fed-Alpha cache `.struts` field gap is a **data-model normalization issue**. Inventory items hold the authoritative apparatus attribution; the apparatus chip's `.struts` summary is a denormalized rollup that didn't get re-materialized on cache arrival. Either the rollup runs continuously (listener) or the chip reads through to items on demand. Both are valid; the current state (chip rollup stale) is the worst of both.

`renderOrgChart` crash recurrence is the same defensive-programming gap as OP1; no patch shipped between OP1 and OP2, so we hit it again. This is a process finding — **between-OP patches were not part of the TTX-2 cadence**, by design. Future TTX cycles may want to consider hot-patches between OPs for crash-class defects only.

Persona / coordination was not the bottleneck. Brennan (TF-State) and Marquez (TF-Fed-Alpha) executed clean OSC handoffs with appropriate Branch Director communication every 30 min, Group Sup communication every 15 min during active lanes. Whitaker (IC #4) reviewed and approved IAP-OP2 at the boundary brief and IAP-OP3 at E+15:30 without revision-cycle delay. PSC #2 Doyle's IAP-OP3 came in at 6,230 words on time. The cohort discipline was tight; the app made the cohort look slower than they were.

---

## Question 4 — What can we learn from it / what should change?

**App changes (cite v4.0.0 phase tags):**

- **Add-SP modal Save Changes button visible in Add path without find-struts gate** (carry from OP1) — **Phase 3B**, **severity: critical**. OP2 confirmed this is the dominant SP-budget friction at scale.
- **Bulk inventory deploy mode** — a "deploy N SPs as a batch" path that doesn't require per-SP find-struts roundtrip. Operator picks a measurement range + load class + cluster, app suggests batch of struts, single confirm. **Phase 3B / NEW**, **severity: high**. Estimated 45–60s per SP friction → projected ~10s per SP with bulk mode.
- **Dashboard count cards reactive to programmatic mutations** — replace the apparent ~30s debounce with a localStorage / Firebase listener-driven refresh. **NEW**, **severity: med**.
- **`ICS_ROLES_DEFAULT` Branch / Group / Unit tier seeded** — Rescue Branch Dir, Search Group Sup, Shoring Group Sup, Heavy Rigging Group Sup, Medical Unit Leader, Demob UL, Doc UL, Comms UL, Supply UL, Ground Support UL all default-seeded. **Phase 3C.1**, **severity: high**.
- **Org chart UI verification at depth 4+** — render-path testing for `ic → operations → rescue_branch → squad-alpha` chains. Visual layout (indentation, collapsing, scrolling) must hold at 4-deep, 5-deep, and 6-deep. **Phase 3E / NEW**, **severity: med**.
- **`renderOrgChart` defensive default-arg fix** (carry from OP1) — **NEW**, **severity: med**.
- **Apparatus-level `.struts` rollup re-materialized on cache arrival** — listener on inventory items with `apparatus: <cacheId>` updates the cache apparatus chip's `.struts` field. **Phase 3D / NEW**, **severity: med**.
- **Role history preservation** (carry from OP1, 4× more confirmations) — **Phase 3C.5**, **severity: high**.

**Doctrine / scenario changes:**

- The TTX-2 IAP framework should call out **realistic SP-budget achievement vs. budget-without-friction** as a separate KPI — operators should know that "70 of 110 SPs" is a realistic expectation given current friction, not a coordination failure.
- Future TTX cycles should consider **between-OP hot-patch policy** for crash-class defects (e.g., `renderOrgChart` bare-call) without disrupting the IAP cadence.

---

## Cross-reference

- **Linked SP IDs:** all 35 OP2-created SPs (V-Cluster-1 expansion ×3, V-2 ×3, V-3 advance (SP-1/2/3) ×3, V-4 ×5, V-5 ×5, V-6 ×4, V-7 ×6, V-8 ×5, V-9 ×4). Status detail in `runtime/firebase-snapshots/snap-E+16h.json`.
- **Linked IAP:** `iaps/iap-op2.md` (4,157 words; approved by Park first half, Whitaker second half). `iaps/iap-op3.md` (6,230 words; filed by Doyle E+15:30).
- **Linked event-log entries:** cmd-transfer #3 (E+9:00); OSC rotations E+5:00 + E+14:00; Branch / Group / Unit role assignments E+5:15 through E+15:00; V-01 extraction E+13:45 + V-02 E+13:50; first secured SP at E+14:30.

---

## Synthesis tags (for the Phase 2 merge)

```
tag: Add-SP modal Save Changes button always visible in Add path | phase: 3B | severity: critical
tag: Bulk inventory deploy mode for mass-deploy phases (batch struts to SPs) | phase: 3B / NEW | severity: high
tag: Dashboard count cards reactive to programmatic mutations (eliminate ~30s debounce) | phase: NEW | severity: med
tag: ICS_ROLES_DEFAULT seeded with full Branch / Group / Unit tier | phase: 3C.1 | severity: high
tag: Org chart UI verified at 4+ deep parentId chains | phase: 3E / NEW | severity: med
tag: Apparatus .struts rollup re-materialized on cache arrival (listener-driven) | phase: 3D / NEW | severity: med
tag: Role history preservation on apparatus / individual transitions (4x confirmation) | phase: 3C.5 | severity: high
tag: renderOrgChart defensive default-arg fix (recurrence) | phase: NEW | severity: med
```
