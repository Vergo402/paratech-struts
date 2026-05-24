# Pass 4B — Adversarial Domain Scenarios

**Auditor:** Structural Collapse SME (Haiku)
**Date:** 2026-05-16
**Scope:** Edge cases, boundary conditions, domain stress tests in FieldShore v3.8.2

---

## Findings

### F-4B-1: AT 37-58 Boundary at Exactly 58"
**Severity:** High
**Scenario:** Rescue team measures opening at exactly 58" — AT 37-58's maximum extended length. Is this strut included or excluded?
**Expected:** AT 37-58 included (extended:58 fits 58" opening) with margin warning since strut is at max extension.
**Actual:** Comparison uses `measurement <= strut.extended`, so 58" includes AT 37-58. However, no visual boundary indicator shows "at maximum extension — zero adjustment headroom." User has no warning that they're at the operating limit with no safety margin.
**Fix:** Add margin warning: surface a "marginal fit" indicator when `margin < 5%` of strut's adjustment range.

### F-4B-2: Very Short Measurement (12")
**Severity:** Medium
**Scenario:** Team enters 12" opening — smallest AcmeThread (AT 12-15) has collapsed=12".
**Expected:** AT 12-15 shown but flagged as marginal (at compression limit).
**Actual:** AT 12-15 matches (12 <= 15 AND 12 >= 12). Strut technically usable but zero adjustment headroom. False confidence.
**Fix:** Apply same 5% margin rule from F-4B-1 — if margin < 5%, surface "marginal fit, recommend larger strut" warning.

### F-4B-3: Out-of-Range Very Long (200"+)
**Severity:** Medium
**Scenario:** User enters 200" opening. LS 1016 has extended=198" — alone excluded. With max extension (67") total = 265", but `extTotal > strut.extended` guard prevents that.
**Expected:** Clear "Opening exceeds maximum reach" message with guidance.
**Actual:** No results, no warning about why. User may assume the app is broken or that they need to try a different combination.
**Fix:** Add upper-bound warning: "Opening exceeds maximum reach (~198"). Verify measurement or consult engineering."

### F-4B-4: Zero or Negative Load Entry
**Severity:** Medium
**Scenario:** Team enters load=0 (visualize fit only) or accidentally types negative.
**Expected:** All matching struts shown without capacity filtering — load 0 = no constraint.
**Actual:** `findStrutCombinations(measurement, 0)` shows all struts that fit physically. Correct behavior. However, no warning that "load not specified" — user may have intended to enter a value and missed.
**Fix:** Add input validation: prompt "Load not specified. Assume zero-load (physical fit only)?" with optional entry field.

### F-4B-5: Load Exceeding 4-Strut Capacity (verified working)
**Severity:** Info (already fixed in v3.5.2 NEW-3)
**Scenario:** 120" opening, 50,000 lb load. ACME 120" = 5,360 lb/strut @ 4:1. Four struts = 21,440 lb max.
**Expected:** Explicit "Load exceeds 4-strut capacity" warning card with qty recommendation.
**Actual:** Code at lines 311-331 pushes result card with `exceedsCapacity: true` and explanatory warning. Working correctly post-v3.5.2.
**Fix:** ✅ Already fixed. Verify in live app testing.

### F-4B-6: LongShore Unrated Zone Boundary at Exactly 192" (16 ft)
**Severity:** High
**Scenario:** 192" opening, LS 1016 (extended=198"). 192" is AT Paratech's rated maximum (6-16 ft).
**Expected:** 192" exact is IN-BOUNDS — full capacity (6,000 lb @ 4:1). 192.0625" triggers unrated.
**Actual:** Code checks `measurement > 192` — so 192" exact does NOT trigger unrated zone (correct). Verify warning text on >192" is clear: "Not rated by Paratech beyond 16 ft (192"). Working load unverified. Consult engineering."
**Fix:** ✅ Boundary logic correct. Verify warning message clarity.

### F-4B-7: LongShore Unrated Zone — No Acknowledgment Gate
**Severity:** Critical
**Scenario:** Measurement > 192" triggers unrated warning. Can team deploy without explicit acknowledgment?
**Expected:** Warning appears AND deployment requires modal confirmation: "Confirm: this exceeds Paratech's rated range. [Cancel] [I Acknowledge — Deploy]".
**Actual:** Warning is shown as a result card sorted to top (`unrated: true` per lines 300-304), but user can deploy from that card without explicit acknowledgment. No safety gate.
**Fix:** Add modal acknowledgment gate when deploying an unrated strut. Require explicit "I acknowledge" click before deployment proceeds.

### F-4B-8: Deduction Stack Math (verified post-v3.5.2)
**Severity:** Info (already fixed)
**Scenario:** 60" opening + all max deductions (6x6 header 5.5" + 6x6 footer 5.5" + tallest top plate 6" + tallest bottom plate 6") = 23" total deduction → effective 37".
**Expected:** Find struts for 37" effective length (AT 37-58).
**Actual:** Per v3.5.2 S1 fix, `sp.requiredLength` (raw) passed to `findStrutCombinations()` which applies deductions internally. No double-deduction.
**Fix:** ✅ Already fixed in v3.5.2.

### F-4B-9: Shore Type Qty Mismatch — 3-Post with qty=1
**Severity:** Medium
**Scenario:** Shore type definition: 3-Post = qty 3. UI allows user to select qty=1 for any shore type.
**Expected:** Either auto-lock qty when shore type is selected, or warn on mismatch.
**Actual:** No validation between shore type definition and qty picker. A 3-Post deployment with qty=1 would be structurally unsound by definition (3-Post is a 3-strut config).
**Fix:** Auto-set qty to shore type's required quantity when shore type changes. Allow override only with explicit checkbox ("Custom configuration — I acknowledge deviation from standard").

### F-4B-10: Conservative-Floor Interpolation Boundaries (verified)
**Severity:** Info
**Scenario:** Three measurements near ACME 120" row:
  - Exactly 120": uses 120" row value (5,360 lb)
  - 120.0625" (just above): uses next-longer 144" row (3,830 lb) — conservative
  - 119.9375" (just below): uses 120" row (no shorter row exists between them)
**Expected/Actual:** Logic correct per v3.7.2 fix. At-row exact matches use exact row; between-row uses next-longer row.
**Fix:** ✅ Verified correct.

### F-4B-11: Span of Control Warning — Single Threshold Only
**Severity:** Low
**Scenario:** Operations Section Chief has 9 sub-roles. Code warns at >7.
**Expected:** Tiered warning matching NIMS guidance — optimal 5-7, warning at 8+, info at <3 (wasteful single-line command).
**Actual:** Single threshold at >7. No "wasteful" warning for <3.
**Fix:** Three-tier warning system: green (3-7 optimal), amber (8+ excessive), info (<3 single-line, wasteful).

### F-4B-12: Drilldown XSS (verified fixed)
**Severity:** Info (already fixed in v3.5.2)
**Scenario:** Operation labeled "Parking < 5th Floor" with HTML metacharacters.
**Expected/Actual:** Drilldown labels use `escapeHtml()` for display and data-attributes for onclick handlers per v3.5.2 X1 fix.
**Fix:** ✅ Already fixed.

### F-4B-13: Field Entry Under Stress — No Debounce
**Severity:** Medium
**Scenario:** USAR team member in heavy gloves, wet screen, 90-second window. Rapid input could trigger out-of-order search results.
**Expected:** Debounced input prevents ghost searches; latest input wins.
**Actual:** No debounce on `runQuickSelect()` triggers. Each input change triggers search. In-flight async searches could resolve out of order.
**Fix:** Add 300ms debounce to quick-select input; cancel in-flight searches on new input.

### F-4B-14: LockStroke Extension Compatibility — Verify UI Enforcement
**Severity:** High
**Scenario:** User selects LK 19-25 (limited to [6, 12] extensions per `LOCKSTROKE_EXTENSIONS`). Try to deploy with 24" extension.
**Expected:** Extension picker only shows [6, 12]. 24" hidden or disabled.
**Actual:** Algorithm enforces compatibility via inventory filter, but verify UI also respects it. Any UI path that lets a user select an incompatible extension is a bug.
**Fix:** Audit extension picker UI in `findForShorePoint()` flow to confirm `LOCKSTROKE_EXTENSIONS` is respected at display time.

### F-4B-15: Measurement Input Labeling for Mobile
**Severity:** Low
**Scenario:** Novice user enters 60 in feet field, 0 in inches, missing fraction dropdown entirely.
**Expected:** Clear labels on all three fields prevent confusion.
**Actual:** Per index.html, fields are separate selects with hints ("feet", "inches", "fraction"). Mobile renders fraction as a picker.
**Fix:** Add aria-labelledby on fraction select; ensure mobile keyboard hints are correct for numeric fields.

---

## Severity Summary

| Severity | Count | IDs |
|----------|-------|-----|
| Critical | 1 | F-4B-7 (unrated zone acknowledgment gate) |
| High | 4 | F-4B-1, F-4B-6, F-4B-14, (F-4B-9 borderline) |
| Medium | 5 | F-4B-2, F-4B-3, F-4B-4, F-4B-9, F-4B-13 |
| Low | 2 | F-4B-11, F-4B-15 |
| Info (verified) | 3 | F-4B-5, F-4B-8, F-4B-10, F-4B-12 |

## Recommended Immediate Fixes (pre-field-deployment)

1. **F-4B-7 (Critical):** Add unrated-zone acknowledgment modal gate
2. **F-4B-9:** Shore-type qty validation
3. **F-4B-1/F-4B-2:** Marginal-fit warning at boundary measurements
4. **F-4B-13:** Debounce on Quick Find input
