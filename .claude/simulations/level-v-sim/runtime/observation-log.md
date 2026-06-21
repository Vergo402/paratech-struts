# Level V Sim — Live Observation Log (v4-adapted)
Run date: 2026-06-19 · App: v4.0.0-slice.1 (dev server :5199) · Scenario: Verplanck Residential (car into building)

## Adaptations from v3 skill
- Execution: single driver (main loop) plays conductor + 4 participants sequentially; analysis fanned out to a verified workflow.
- Inventory: v4 self-seed (no Excel import). Engine 1 = AT 19-25 ×2, AT 25-36 ×2, LS 1016 ×2, LS-ext-48 ×1. Squad 3 = stock-on-paper/0-available. Rescue 2 = rich rig.
- Measurements mapped to v4 seed drivers: 30" → real recs; 16" → no-match; 200" → unrated zone; Squad 3 → no-stock state.

## Setup findings
- **F-SETUP-1 (Mod-Data, HIGH candidate):** On first load with STALE IndexedDB data from a prior app/schema version, the entire Operations board crashed — `<ShorePointCard>` threw, caught by the route CatchBoundary (40+ error-boundary fires in console). Only a full IndexedDB wipe recovered it. No migration guard / no graceful per-card fallback. In the field this means: an app update that changes shore-point shape could brick the board for a crew mid-incident. VERIFY against migration/versioning code.
- Clean seed loads correctly: 17 items, 3 rigs, version label v4.0.0-slice.1, guest mode ("Sign in to sync" banner present).

## Event clock

### Confirmed working (live drive, E+0:04 → E+0:30)
- **Start Operation**: name-required gate works ("Enter an operation name" disables submit — Pearl). ADR-027 deploy-mode toggle present (Pending Card On/Off). Op created + persisted.
- **Add Shore Point form**: Division picker (Div 1 Ground level), shore-type radio (T-Shore/Double-T/3-Post), Number of Shore Sets, ft/in + eighths-strip measurement, **deduction ledger collapsed-by-default (#349 live)**, **Estimated load (lbs) field SHIPPED** (gate script said Phase-I-future — it's here, so over-capacity gate now testable in-flow), Find Available Struts + Save as Pending (both gated on measurement).
- **Measurement math**: 2'6" → "Required strut length 30″" correct.
- **Recommendation engine (Assign Equipment + inline Find)**: 4 ranked cards @30″ — Gold LS 203/Rescue2 (22,000lb), Grey AT 25-36/Engine1 (20,000lb), AT 25-36/Rescue2, **AT 19-25 + 6″ cross-rig extension (strut Engine1 + ext Rescue2 — ADR-033/#330 live)**. Each: source rig, deduction ledger (N/S until picked), capacity-at-length, planning-aid disclaimer. Pearl-rich.
- **Deploy → inventory deduction (Mod-Data D-2)**: Engine1 AT25-36 2→1→0 across two deploys. Event log: OperationCreated→ShorePointAdded→EquipmentDeployed→StatusChanged→ShorePointAdded→EquipmentDeployed (event-sourced ADR-009, clean).
- **Card anatomy (deployed)**: #N corner tab, shore type, Div, source rig, status, "Raw opening 30″ · 0 lbs", Required strut length, deployed model, Details(QuickView #340)/advance/step-back.
- **Advance**: renders as TAP button ("Set Strut Set"/"Send to Cutting Station") on the headless desktop driver = ADR-035 (mouse→tap-once, not slide). Correct.
- **Return transaction (Mod-Data D-2 return, Mod-UX U-6)**: "Back to Pending Equipment" pops confirm — "return each piece to its source truck's available count (the strut to Engine 1)" (Pearl, names piece+truck). Confirm → Engine1 AT25-36 0→1, EquipmentReturned event. Re-increment correct.

### Minor observations (candidate Low findings)
- **O-1 (copy/semantics):** Blank/optional load renders as "0 lbs" on cards ("Raw opening 30″ · 0 lbs") rather than "—" / omitted. Blank ≠ 0 lbs conceptually.
- **O-2 (form default):** Shore type silently defaults to T-Shore when none explicitly picked (radiogroup had no pre-selection in form, but saved card = T-Shore). Verify intended — shore type drives wood/deduction math; an unintended default could mislead.
- **O-3 (tooling, NOT app bug):** Synthetic-click path doesn't fire Radix dialog dismiss → modals stay mounted-but-empty after submit/deploy; verified via reload that the underlying action committed every time. A real tap dismisses. Excluded from findings.

### Full lifecycle + safety gates + end-of-op (E+0:32 → E+2:00)
- **Safety gates (now in-flow — load field shipped):**
  - **Over-capacity:** 30″ + 100,000 lb → only highest-cap LS 203 shown, Deploy DISABLED, "Over capacity" badge, math "require 5 struts". No override. (HIGH-value safety Pearl.)
  - **Unrated zone:** 200″ → 3 cards, all Deploy disabled, "Unrated" badge, per-card acknowledgment checkbox; ticking card 1's checkbox flips ONLY card 1's Deploy enabled. Warning persists. (Pearl.)
  - **No-match:** 16″ → "No matching struts · Nothing fits this opening at this load — adjust deductions or re-measure", 0 deploys, but Save as Pending still offered (#344). (Pearl.)
- **Quick Find tab (#320, FF-2 independent lookup):** ft/in + eighths, collapsed deductions, optional load w/ helper "load doesn't change which strut fits" (better copy than card's "0 lbs"). Find Struts → dismissible results sheet (ADR-031): LS 203 22,000lb, AT 25-36 20,000lb, AT 19-25, planning-aid disclaimer. Read-only (no deploy from Quick Find — correct).
- **Full Operations lifecycle (SP #1):** Pending → Equipment Assigned → Strut Set → Cutting Station → (Mark Cut Done → Send to Runner, both in the Cutting Station sub-view) → Runner → Wood Shore Secured → Strut Equipment Returned. Card labels phase-shift: "Required strut length" → "Cut length" → "Set length". Engine1 AT25-36 returned 1→2 on terminal reclaim.
- **Cutting Station sub-view (#222):** "✂ Cutting Station", "N cut in queue", view-toggle badge "Cutting Station (1)". Cut card: Mark Cut Done → ✓ Cut done → Send to Runner / Clear Cut Done. Saw operator works entirely in this view; Operations-board card is read-only (Details only) during cutting.
- **Event model:** distinct types — EquipmentDeployed, EquipmentReturned (reversible mid-lifecycle step-back), **EquipmentReclaimed** (terminal secured→returned), ShorePointStatusChanged, ShorePointEdited, OperationEnded. Clean event-sourcing (ADR-009).
- **Step-back / return confirms (all name piece + source truck):**
  - Mid-lifecycle (Equipment Assigned → Pending): "return each piece to its source truck's available count (the strut to Engine 1)". Reversible.
  - Terminal (Secured → Returned): "...This cannot be undone." One-way door. (Good distinction.)
- **Delete (Pending only):** asks first + **recoverable** ("restore it from the Deleted section" — ADR-030) + guard explained ("only be deleted while it is Pending"). Triple Pearl.
- **End Operation (#339):** confirm → OperationEnded event → board "No active operation" → archived under "Past operations" ("Verplanck Residential · Ended · 2 shore points"), re-openable. Archives an incomplete (still-Pending) SP fine.

### Coverage GAPS (deliberately unbuilt — not bugs; map to backlog)
- **G-1:** Org chart / ICS role assignment (E+0:06) — Command tab is a stub → #323.
- **G-2:** Hazard log entry (E+0:10) — workflow #21 unbuilt → #251.
- **G-3:** Offline indicator / sync status (sim D-4, U-8) — cloud sync stubbed by design (local-only); "Sign in to sync" banner is the only network affordance. Multi-device/Firebase is a later session.
- **G-4 (cross-cutting, IC pain at Level V):** a single IC running the whole incident has NO command picture (SitStat/PAR) — Command tab stub. At Level V (1 company) tolerable; flagged because Command is the next big block (#323/#352/#353).
