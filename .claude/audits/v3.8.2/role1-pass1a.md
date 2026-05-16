# Pass 1A — Core Algorithm & Data Constants
**Auditor:** Senior Full-Stack Engineer (Opus)
**Date:** 2026-05-16
**Scope:** Lines 1-800, constants and algorithm (`STRUTS`, load tables, `EXTENSIONS`, `BASE_PLATES`, `SHORE_TYPES`, `WOOD_SIZES`, `findStrutCombinations`, `getLoadCapacity`, `APP_VERSION`)

---

## Findings

### F-1A-01: STRUTS[] — All 15 models verified
**Severity:** Info
**Area:** `STRUTS[]` (lines 4-22)

15 strut models across 3 systems, all structurally correct:
- **AcmeThread (5):** AT 12-15, AT 19-25, AT 25-36, AT 37-58, AT 56-88. `system:'AcmeThread'`, `color:'grey'`. Collapsed/extended ranges contiguous and reasonable.
- **LongShore (6):** LS 203, LS 304, LS 406, LS 610, LS 812, LS 1016. `system:'LongShore'`, `color:'gold'`. LS 1016 extends to 198" (6" past last load table row at 192") correctly triggering unrated zone logic.
- **LockStroke (4):** LK 19-25, LK 25-36, LK 37-58, LK 55-89. `system:'LockStroke'`, `color:'grey'`. Uses AcmeThread load table (line 141). No duplicate IDs.

### F-1A-02: ACME_LOAD_TABLE — All 11 rows verified correct
**Severity:** Info
**Area:** `ACME_LOAD_TABLE` (lines 51-63)

- **Monotonicity (4:1):** 20000, 20000, 20000, 16551, 14125, 13081, 12025, 9138, 5360, 3932, 3830. Non-increasing.
- **2:1 = 4:1 × 2:** All 11 rows exact.
- **3:1 = floor(4:1 × 4/3):** All 11 rows exact.
- **Length coverage:** 24"-144" (2-12 ft). AT 12-15 at 12-15" gets first row value (conservative-safe). AT 56-88 max reach with extensions = 124", within table.

### F-1A-03: LONGSHORE_LOAD_TABLE — All 11 rows verified, 1 trivial discrepancy
**Severity:** Low
**Area:** `LONGSHORE_LOAD_TABLE` (lines 77-89)

- **Monotonicity (4:1):** 22000, 22000, 20000, 16000, 12000, 11000, 10000, 7000, 6000, 4500, 3000. Non-increasing.
- **2:1 ratio:** All rows exact.
- **3:1 ratio:** Row 156" (13 ft) shows 9332 vs expected 9333 (floor(7000×4/3)). Delta = -1 lb. Since the LongShore table is documented as "published directly from manufacturer's chart," this is almost certainly the datasheet value. Trivially conservative. No safety impact.
- **<72" excluded:** First row starts at 72".
- **>192" behavior:** `getLoadCapacity` returns 0, triggering unrated zone path.

### F-1A-04: EXTENSIONS[] — Verified correct
**Severity:** Info
**Area:** `EXTENSIONS` (lines 24-28), `LOCKSTROKE_EXTENSIONS` (lines 33-38)

- AcmeThread: [6, 12, 24, 36]. LongShore: [12, 24, 48, 67]. LockStroke: per-strut overrides (lk-19-25 and lk-25-36 restricted to [6, 12]).
- LongShore max 1 extension (line 217). AcmeThread/LockStroke max 2, total ≤ 36" (line 219). Cross-system AcmeThread/LockStroke compatibility (lines 233-234). `extTotal > strut.extended` guard (line 213). No impossible combinations pass filters.

### F-1A-05: BASE_PLATES[] — 23 entries verified
**Severity:** Info
**Area:** `BASE_PLATES[]` (lines 94-118)

23 entries (22 connectors + "none"). Heights range 0"-6.0". All reasonable. IDs unique and consistently referenced in `getDeductions()` and `renderResults()`.

### F-1A-06: SHORE_TYPES[] — Dead data fields
**Severity:** Low
**Area:** `SHORE_TYPES[]` (lines 126-130)

Quantity logic correct: t-shore=1, double-t=2, 3-post=3. However, `defaultHeader` and `defaultFooter` fields are defined but never referenced anywhere in the code. The 3-post case hardcodes `'5.5'` instead of reading from the constant. Dead data that could cause confusion if shore types are extended.

### F-1A-07: WOOD_SIZES[] — Verified correct
**Severity:** Info
**Area:** `WOOD_SIZES[]` (lines 120-124)

None=0", 4x4=3.5", 6x6=5.5". Standard lumber actual dimensions confirmed correct. `WEDGE_DEDUCTION = 1.5"` correctly separated from strut selection (used only for cut-length calculations).

### F-1A-08: findStrutCombinations() — Full algorithm trace verified
**Severity:** Info
**Area:** `findStrutCombinations()` (lines 167-353)

All code paths verified: deduction calculation, strut candidate selection, extension enumeration, extension rules, range filtering, inventory availability, load capacity lookup, unrated zone detection, quantity recommendation (with >4-strut sentinel), sorting, and extension deduplication. Edge cases (0 measurement, negative, huge values, fractions) all handled correctly.

### F-1A-09: getLoadCapacity() — Conservative-floor interpolation verified
**Severity:** Info
**Area:** `getLoadCapacity()` (lines 144-165)

Below-table: returns first row (conservative-safe). Above-table: returns 0 (triggers unrated zone for LongShore). Between rows: returns upper row's value (lower capacity = conservative floor). Euler buckling 1/L² concavity justifies this over linear interpolation. `sfIndex + 1` mapping correct.

### F-1A-10: APP_VERSION verified consistent
**Severity:** Info
**Area:** `APP_VERSION` (line 132), `index.html` (line 60), `sw.js` (line 1)

'3.8.2' in all 3 locations. Used in `logSyncEvent()`, `submitFeedback()`, `firebaseSave()` queued writes, and version-mismatch discard guard.

### F-1A-11: double-t and t-shore do not auto-fill header/footer deductions
**Severity:** Medium
**Area:** `onShoreTypeChange()` (lines 5159-5176)

When the user selects Double-T or T-Shore, header/footer deduction fields are not auto-populated (they stay at 0). Only 3-Post auto-fills header=5.5 and sole=5.5. Since all three shore types require wood headers and footers, the user must manually enter deductions for T-Shore and Double-T. If forgotten, the strut search uses the raw opening measurement instead of the effective (deducted) length, potentially leading to sub-optimal strut selection. **Not safety-critical** — the strut will still physically fit — but could lead to less accurate results.

**Fix:** Apply `defaultHeader`/`defaultFooter` from `SHORE_TYPES` for all types, using `WOOD_SIZES` lookup for actual dimensions:
```javascript
const shoreConfig = SHORE_TYPES.find(t => t.id === type);
const headerWood = WOOD_SIZES.find(w => w.id === shoreConfig.defaultHeader);
const footerWood = WOOD_SIZES.find(w => w.id === shoreConfig.defaultFooter);
document.getElementById('spHeader').value = headerWood ? headerWood.height : 0;
document.getElementById('spSole').value = footerWood ? footerWood.height : 0;
```

### F-1A-12: channel6x6 and channel4x4 identical deduction heights
**Severity:** Info
**Area:** `BASE_PLATES`

Both have `height: 3.4`. Likely correct — the base height is determined by the strut attachment mechanism, not the lumber channel width. Worth manual verification against Paratech specs.

### F-1A-13: LongShore sub-72" models get maximum-rated capacity
**Severity:** Info
**Area:** `getLoadCapacity()`

LS 203 (26-36"), LS 304 (36-50"), LS 406 (48-73") operate partially/entirely below the load table's first row. `getLoadCapacity` returns 22,000 lb (4:1) for any length ≤ 72". Correct — shorter configurations are structurally stronger.

### F-1A-14: getMeasurementInches() verified
**Severity:** Info
**Area:** `getMeasurementInches()`

Correct feet/inches/fraction conversion, `parseFloat() || 0` safety, negative/overflow guards, 16ths-of-inch fraction support.

### F-1A-15: getDeductions() verified
**Severity:** Info
**Area:** `getDeductions()`

Correct plate lookup, null return on zero deductions, toggle guard, structured return object.

### F-1A-16: Safety factor constants verified
**Severity:** Info
**Area:** `runQuickSelect()`, `findForShorePoint()`

Both hardcode `sfIndex = 2` (4:1). 2:1 and 3:1 computed for display only, never used for selection. Correct safety-first approach.

### F-1A-17: Extension combination loop verified
**Severity:** Info
**Area:** `findStrutCombinations()` extension enumeration

All valid single and double extension combinations generated without omissions or invalid duplicates. Filters correctly applied.

### F-1A-18: Input bounds verified
**Severity:** Info
**Area:** `runQuickSelect()`, `findForShorePoint()`

`MAX_MEASUREMENT_INCHES = 360` (30 ft) and `MAX_LOAD_LBS = 500,000` enforced at both search entry points.

---

## Summary

| Severity | Count | IDs |
|----------|-------|-----|
| Critical | 0 | — |
| High | 0 | — |
| Medium | 1 | F-1A-11 |
| Low | 2 | F-1A-03, F-1A-06 |
| Info | 15 | F-1A-01, 02, 04, 05, 07, 08, 09, 10, 12, 13, 14, 15, 16, 17, 18 |

**Overall assessment:** The core algorithm and data constants are in excellent shape. No safety-critical issues found. The one Medium finding (F-1A-11) is a UX gap where double-t and t-shore shore types don't auto-populate wood deductions like 3-post does, potentially leading to sub-optimal (but never unsafe) strut selection. All load tables are mathematically verified row by row. Conservative-floor interpolation is correctly implemented. Version consistency is perfect across all 3 files (index.html, app.js, sw.js).
