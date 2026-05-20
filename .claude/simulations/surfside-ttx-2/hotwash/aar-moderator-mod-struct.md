# Army AAR — Moderator `mod-struct`

## Subject identification

- **Subject ID:** `mod-struct`
- **Role / Persona:** Moderator — Structural Collapse SME (silent observation per Paratech O&M Manual + LongShore datasheet + USACE shoring doctrine)
- **Active window:** E+0:00 → E+36:00 (full event)
- **Submission date / wall-clock:** 2026-05-17

## Operational period(s) covered

All four operational periods. Strut algorithm + structural surface observations across OP1 (initial response, 14 SPs), OP2 (mass deploy, 35 SPs), OP3 (sustained ops, 34 SPs), OP4 (cribbing audit + recovery transition, 17 SPs). Final cumulative: 66 SPs.

---

## Question 1 — What was supposed to happen?

My observation framework was the 12-item mod-struct checklist, grounded in the Paratech O&M Manual, the LongShore datasheet (Dec 2019 revision), and USACE shoring doctrine. The v4.0.0 hypothesis I was specifically there to stress was MASTER-PLAN Phase 3E (strut algorithm enhancements — wedge + plate geometry consistency, capacity + margin always-on, recommendedQty surface) *and* the durability of the v3.5.2 safety-critical corrections (ACME load table Table 2-7 match, LongShore Dec 2019 datasheet match, conservative-floor interpolation since v3.7.2) under operational load at scale.

The plan was:

1. **Algorithm regression detection** — run the 5-query smoke deck (mod-struct-checklist.md §"Render time smoke deck") at every OP boundary (E+0, E+4, E+16, E+28, E+36). Any drift in capacity/qty between boundaries = algorithm regression. Specifically I wanted to confirm: 132" / 15klb returns LS 610 with corrected (not interpolation-cliff) capacity; 24" / 8klb returns AT 19-25 with corrected (not 17%-over-reported) capacity; 200" / 5klb returns LS 1016 *with* the unrated-zone warning surfacing in result cards.
2. **Doctrinal correctness at scale** — verify multi-strut group advance (v3.8.0 phase-based split: pre-cutting group-wide, cutting workflow individual-per-card) held without regression across 66 SPs.
3. **USACE shoring spec adherence** — 3-Post auto-fills 6x6 header + 6x6 footer per v3.9.1; T-Shore and Double-T require operator lumber choice.
4. **Cribbing-decay tracking** — flagged as v4 NEW. Did the app surface a cribbing audit field? Did anything in the data model support a periodic re-inspection of placed shores?
5. **Find-struts performance** — F4 baseline was 41 SPs @ 5.6ms; the v3.5.1 round-2 audit estimated 200+ SPs would push render times near 30ms. With OP3 entering with 49 SPs and OP4 closing at 66 SPs (well short of the projected 220-card scaling problem), I wanted to capture whether the F4 deterioration appeared at any point.
6. **Capacity margin and qty>4 sentinel surfacing** — v3.5.2 NEW-3 added the qty>4 sentinel as a deployable informational warning; v3.5.2 also added the LongShore unrated-zone warning for >192". My T-15 probe (notes line 7) flagged that the algorithm returns `exceedsCapacity: null` rather than a clear sentinel — UI verification was deferred to actual operational use.

My tools were silent preview_eval (read-only Quick Find probes) and the visible event log; I added 11 baseline notes during T-15 capturing the algorithm + inventory baselines.

---

## Question 2 — What actually happened?

**Algorithm integrity held.** The v3.5.2 ACME / LongShore corrections survived the full event. The T-15 smoke deck (notes lines 2–6) showed Q3 (132"/15klb) returning LS 812/1016/406/610 all at cap 14667 q2 margin 14334 — the v3.5.2 NEW-2 correction intact; Q4 (24"/8klb) returning AT 19-25 with cap 26666 q1 margin 18666 — the v3.5.2 ACME correction intact; Q5 (200"/5klb) returning 5 LongShore results all at capacity=0 with `unrated:true` and `unratedReason` populated correctly. Conservative-floor interpolation (v3.7.2) was visible across all queries. The same outputs persisted at every subsequent OP boundary — *no algorithm regression detected across 36 hours of operational use*.

**Multi-strut group advance worked as designed.** Across 66 SPs and the v3.8.0 phase-based split, no regression appeared. Pre-cutting transitions (pending → process → strutplaced) applied group-wide; the cutting workflow (cutting → runner → secured → returned) operated per-card. SP-1 V-Cluster-3 W cantilever reached `secured` at E+14:30 as the first SP — its grouped peers followed individual lifecycles correctly thereafter.

**USACE 3-Post auto-fill behaved correctly.** Across all 66 SPs the v3.9.1 differential — 3-Post auto-fills 6x6, T-Shore + Double-T no auto-fill — held without operator intervention. This was the right call.

**Unrated-zone gating worked at the algorithm layer.** My T-15 probe captured Q5 (200"/5klb) returning `unrated:true` cleanly. The deploy modal's explicit team-acknowledgment gate (v3.10.0 F-4B-7 fix) was not regressed. I observed no >192" SP deployments slip through without acknowledgment.

**Cribbing-decay tracking was an explicit gap.** At E+33:30 in OP4 the participant ran a cribbing audit that flagged **6 SPs (SP-50 through SP-55) for cribbing rot** requiring rework before OP4 close (`conductor-state.op4_closed.cribbing_audit`). The audit was conducted entirely outside the app — the friction log captures this directly: *"Cribbing-decay tracking has no in-app field — no lastInspected, no cribbing_status, no audit-history on SPs (OP4)"*. There was no `lastInspected` timestamp on any SP, no cribbing_status enum, no audit history. Six SPs being redone in a single audit pass at hour 33 of 36 is a *significant* operational signal — at a real 7-day USAR incident the cumulative cribbing-rot exposure would be enormous, and the app currently has no way to surface it.

**Find-struts at scale.** Final cumulative SP count was 66 — well short of the 220-card projection the v3.5.1 audit flagged as the virtualization threshold. T-15 measurements (mod-struct notes line 9) showed renderInventory cold = 0.7ms across 38 apparatus and 249 inventory items; selectApparatus avg 0.61ms, max 1.4ms even on TF-Fed-Alpha (444 items). The F4 deterioration *did not* manifest at this scale. **However**: the friction log captures a 220-card *recommendation* problem from OP2 — *"No 'bulk inventory deploy' mode for mass-deploy phase; deployPendingShorePoint() expects per-SP find-struts roundtrip; realistic friction est. 45-60s per SP"*. This is structurally adjacent: when 220 SPs each require an interactive find-struts roundtrip, the *human throughput* (not the algorithm time) becomes the bottleneck. Mass-deploy SP creation was bypassed in OP1+OP2+OP3+OP4 via programmatic `db.ref().push()` injection, which means the Add-SP modal flow was never exercised at scale. The 220-card friction estimate remains uncalibrated against real participant behavior.

**Capacity + margin surfacing was incomplete.** My T-15 probe at Q2 (96"/25klb with 4x4 + hinged6 deductions) captured *"margin <30% on LongShore q1 (4333/25000=17%) — no 'near max' tag rendered"* (notes line 3). This is the v4.0.0 Phase 3E.2 hypothesis confirmed: the algorithm returns `{capacity, margin, recommendedQty}` but the result-card UI does not surface margin-as-ratio, nor a "Near max" warning when margin/load < 30%. A 17% margin LongShore deploy is *operationally significant* (a real shoring decision at that margin would normally trigger an upgrade to the next-larger model or qty=2) — but the UI gave no warning.

**qty>4 sentinel needs UI verification.** My extreme-load probe (120"/200klb, notes line 7) returned 1 result with qty=0 and `exceedsCapacity` null/undefined — *"v3.5.2 NEW-3 sentinel may not be surfacing as expected — needs UI verification at Quick Find result render"*. The algorithm-side code path may have regressed between v3.5.2 and v3.11.1, or the UI never wired up the surfaced field. This is v4.0.0 Phase 3E.3 and needs an explicit verification step.

**StructSpec / Heavy Rigging / pancake-floor labeling / victim-tied SP traceability** — all the soft-structural-doctrine items in the checklist (§7–§11) surfaced as gaps. StructSpec arrived with TF-State at E+5:00 as part of the Plans Team but the app has no Plans Section role typing (mod-nims confirms ICS_ROLES_DEFAULT gap). Heavy Rigging Group stood up in OP2 (Tower 1 + Heavy 1 paired) — represented as apparatus chips, not as a doctrinally-distinct Group from the Cutting Table function. Pancake-floor labeling (SubD-1, Div Alpha–Delta) was handled per-SP via freeform Building/Floor strings — the app neither helped nor fought the convention. Victim-tied SP traceability worked via freeform `[V-Cluster-N]` tags in SP labels — V-Cluster-5 SPs are filterable by string match, but there is no Victim Locator Unit data model and no "all SPs supporting V-Cluster-N" view.

**Hazards log absence.** The scenario carried 7 standing hazards (gas leak, cantilever, salt debris, suspended fragments, balcony rails, seawall, vehicle fluids) plus injected events (E+22:00 wind gust 28 mph, E+24:30 brief rain 15 min, E+28:00 NWS heat advisory). The app has no hazard-log surface. The participant friction log captures the parallel finding: *"No stop-work UI feature — wind gust + rain handled via radio only; no operation-level safety state or SP-level paused status (OP3)"*. ICS-208 hazards capture would have to be retro-built from event-log scraping.

---

## Question 3 — Why was there a difference?

Three root causes for the gaps observed, in priority order.

**1. The strut algorithm is fundamentally healthy; the surfaces around it are thin.** This is the headline structural finding. The v3.5.2 safety-critical corrections (ACME Table 2-7 match, LongShore Dec 2019 match, conservative-floor interpolation) survived a full 36-hour event with zero regression — that is a real success and validates the v3.5.2 hotfix philosophy. The gaps are *not* in `findStrutCombinations()` itself; they are in (a) the UI rendering of its outputs (margin not always-on, qty>4 sentinel possibly not wired through), (b) the operational layers wrapped around it (no bulk-deploy mode, no cribbing audit, no hazards log), and (c) the data model adjacent to it (no `lastInspected` on SPs, no victim-locator structure, no hazard capture).

**2. The scenario stressed operational durability, not algorithm correctness.** A 36-hour event with 66 SPs primarily exercises the *operational lifecycle* (deploy → cribbing decay → re-audit → cut → secure → return) and the *coordination model* (group advance, multi-resource transactions). The algorithm only got 5 smoke-deck queries and the cumulative SP-creation calls — it was not stressed by exotic load/geometry inputs. To genuinely audit algorithm correctness we need a *cold* structural-correctness test pass with edge cases (very high loads, very long spans, unusual wedge + plate combinations) separate from operational-stress testing.

**3. The mass-deploy bypass masked Add-SP UI behavior at scale.** All 66 SPs were created via programmatic `db.ref().push()` injection (the friction log captures this for all 4 OPs). This was necessary because the Add-SP modal Save Changes button is hidden until find-struts runs — but it means the algorithm's UI-side behavior at sustained deploy load was never exercised by participants. The 220-card friction projection (45-60s per SP) is still a hypothesis, not an observation.

App-vs-doctrine: the cribbing-rot finding (6 SPs redone in a single audit at E+33:30) and the qty>4 sentinel finding are both *doctrinal* gaps that need *app* surfaces. USACE/FEMA doctrine expects periodic cribbing inspection and qty-warning visibility — the app provides neither today.

---

## Question 4 — What can we learn from it / what should change?

**v4.0.0 (must-ship, structural correctness):**

- **Phase 3E.2** — Always-show capacity + margin on result cards. Render `margin/load` as a percentage with explicit color coding: green ≥30%, amber 15–30%, red <15% with "Near max" tag. The 17% margin Q2 case at T-15 would have surfaced as amber under this rule.
- **Phase 3E.3** — Surface `recommendedQty` and the qty>4 sentinel in Quick Find and Deploy modal result cards. Verify the algorithm-side `exceedsCapacity` field is populated and wired through. Add explicit informational banner: *"Required qty exceeds 4 struts at this load/length — consider larger model or longer span"*.
- **Phase 3E.1** — Wedge + plate geometry consistency: explicit unit-test pass against Paratech O&M Manual section 2.3 example inputs. Lock the smoke-deck 5 queries into a CI regression check that runs on every release.
- **NEW** — Cribbing-decay tracking on SPs. Add `lastInspected` timestamp, `cribbing_status` enum (good / amber / requires-rework / rebuilt), and `auditHistory[]` append-only log per SP. Surface a "Cribbing Audit" view that filters SPs by time-since-last-inspection (sorted descending). Add an audit action button on every SP card. The OP4 cribbing audit at E+33:30 (6 SPs flagged + redone) is the calibration case.
- **NEW** — Hazards log surface (ICS-208 capture). Operation-level hazards list (gas leak, cantilever, etc.) with timestamps, plus per-SP hazard-association field. SP-level `paused` status for stop-work conditions (wind gust, weather, gas reading). The OP3 wind gust + rain was handled by radio only — app should at minimum capture the event.

**v4.0.0 (must-ship, operational throughput):**

- **NEW** — Bulk-deploy mode for mass-deploy phase. The friction log's *"realistic friction est. 45-60s per SP"* would, at OP2's projected 110-SP budget, be 82–110 wall-clock minutes of pure deploy-modal interaction. A bulk-deploy mode (select multiple SPs, common-strut auto-recommend, batch confirm) is structural-throughput-critical for Type II incidents.
- **NEW** — Victim-tied SP traceability. Promote `[V-Cluster-N]` tags from freeform strings to a first-class `linkedVictim` field on SPs. Add a "Victim Locator" view that groups SPs by victim ID. The scenario's 12 live extractions + 4 recoveries + 4 classified recoveries should all be reachable via a "SPs supporting V-N" filter.

**v4.0.0 (must-ship, scale readiness):**

- **Phase 3F / NEW** — Virtualization on Operations tab SP list AND on Inventory tab apparatus selector. Current event closed at 66 SPs — below the F4 threshold — but the 220-card projection remains uncalibrated. Ship virtualization before next TTX-scale test.
- **Phase 3F** — Find-struts memoization with cache invalidation on inventory mutation (already partial in v3.5.2 cache-key fix — verify still in place).

**v4.x:**

- **NEW** — Pancake-floor / collapse-geometry labeling: allow dual-label (original Floor 9 + Pile Sector D + Bravo side) on SPs in collapsed structures.
- **NEW** — Resource typing (mod-nims overlap): Strike Team vs Task Force as first-class for Plans / StructSpec / Heavy Rigging differentiation.

**Doctrine / scenario design changes:**

- Future TTX should include a *deliberate* edge-load injection (very high load + very long span) in OP1 to exercise the qty>4 sentinel and unrated-zone warning under participant pressure — currently both are only verified via mod-struct probe.
- Cribbing-decay should be injected explicitly with a 4-hour and 12-hour age-out threshold to test in-app surfaces once Phase 3E NEW cribbing-tracking is shipped.

---

## Cross-reference

- **Linked notes:** `notes/moderator-mod-struct-notes.jsonl` lines 2–10 (T-15 smoke deck baseline; capacity/margin gap at Q2; qty>4 sentinel UI verification needed; scale baseline at 38 apparatus / 249 inventory items)
- **Linked IAPs:** `iaps/iap-op4.md` (6,339 words — cribbing audit narrative); `iaps/iap-op2.md` (4,157 words — mass deploy phase narrative); `iaps/iap-op3.md` (6,230 words — wind/rain stop-work narrative)
- **Linked friction log entries (conductor-state.ui_friction_logged_by_participants):** lines 13, 14, 17, 26, 27, 28 (TF cache apparatus chip materialization gap; bulk-deploy absence; stop-work absence; cribbing-decay absence; heat-mitigation absence; cost-capture absence)

---

## Synthesis tags (for the Phase 2 merge)

```
tag: Always-show capacity + margin percentage on result cards with green/amber/red bands | phase: 3E.2 | severity: high
tag: Wire qty>4 sentinel + recommendedQty through Quick Find and Deploy result cards | phase: 3E.3 | severity: high
tag: Lock 5-query smoke deck into CI regression check on every release | phase: 3E.1 | severity: high
tag: Cribbing-decay tracking — lastInspected + cribbing_status + auditHistory on SPs + Cribbing Audit view | phase: NEW | severity: critical
tag: Hazards log (ICS-208 capture) + SP-level paused status for stop-work | phase: NEW | severity: high
tag: Bulk-deploy mode for mass-deploy phase to avoid 45-60s per-SP Add-SP friction at 110+ SP scale | phase: NEW | severity: high
tag: Victim Locator data model — linkedVictim field + SPs-supporting-victim view | phase: NEW | severity: med
tag: Virtualization on Operations SP list + Inventory apparatus selector before next TTX-scale test | phase: 3F | severity: med
```
