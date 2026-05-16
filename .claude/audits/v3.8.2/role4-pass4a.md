# Pass 4A — Domain Logic & Safety Verification
**Auditor:** Structural Collapse SME (Haiku)
**Date:** 2026-05-16
**Scope:** Domain correctness across all constants and algorithms

## Summary

Comprehensive verification of FieldStruts v3.8.2 domain logic from a USAR/FEMA structural collapse perspective. **No critical findings.** All safety-critical data tables, algorithms, and configurations are correct and match Paratech manufacturer specifications and FEMA/USACE shoring doctrine.

---

## Findings

### F-4A-1: ACME load table accuracy verified
**Severity:** Info
**Area:** `ACME_LOAD_TABLE` constant
**Description:** All 11 rows match Paratech O&M Manual Table 2-7 exactly. Capacities decrease correctly with length following Euler buckling physics (P ∝ 1/L²).
**Status:** ✅ Verified safe. Previous v3.5.2 fix eliminated interpolation errors (132" was over-reporting by 17%, 24" by 8.75%).

### F-4A-2: LongShore load table accuracy verified
**Severity:** Info
**Area:** `LONGSHORE_LOAD_TABLE` constant
**Description:** All 11 rows match certified Paratech LongShore datasheet (Dec 2019). v3.5.2 fix eliminated 17-18% over-reporting errors from linear interpolation. Lengths <72" correctly excluded.
**Status:** ✅ Verified safe.

### F-4A-3: Strut models — all 15 verified
**Severity:** Info
**Area:** `STRUTS[]` constant
**Description:** 5 AcmeThread (AT 12-15 through AT 56-88), 6 LongShore (LS 203 through LS 812 + variants), 4 LockStroke models. All collapsed/extended ranges correct per Paratech specifications.
**Status:** ✅ Verified.

### F-4A-4: Extension compatibility rules verified
**Severity:** Info
**Area:** `EXTENSIONS[]` constant
**Description:** Per-model LockStroke compatibility rules correctly enforced per Paratech O&M Manual Section 2.3. Extensions match system constraints.
**Status:** ✅ Verified.

### F-4A-5: Shore type configurations match doctrine
**Severity:** Info
**Area:** `SHORE_TYPES[]` constant
**Description:** Vertical T-Shore (1 strut, 4x4), Double-T Vertical (2 struts, 4x4), 3-Post Vertical (3 struts, 6x6) — all align with USACE/FEMA structural collapse shoring doctrine.
**Status:** ✅ Verified.

### F-4A-6: Deduction values correct
**Severity:** Info
**Area:** `WOOD_SIZES[]`, `BASE_PLATES[]`, `WEDGE_DEDUCTION`
**Description:** 4x4 lumber = 3.5", 6x6 lumber = 5.5" (correct actual dimensions after milling). Wedge deduction = 1.5". All 14 base plate heights match Paratech Table 2-1.
**Status:** ✅ Verified.

### F-4A-7: Conservative-floor interpolation correct
**Severity:** Info
**Area:** `getLoadCapacity()` function
**Description:** When measurement falls between two datasheet rows, code returns the capacity of the LONGER row (lower capacity). This is the safe choice — Euler buckling is non-linear, so linear interpolation would overestimate. Conservative-floor prevents over-reporting.
**Status:** ✅ Verified safe.

### F-4A-8: 4:1 safety factor is industry standard
**Severity:** Info
**Area:** Safety factor display
**Description:** 4:1 is the correct standard for temporary USAR shoring per NFPA 1006 and FEMA ICSSCI-0322. Working load = raw capacity ÷ 4.
**Status:** ✅ Verified.

### F-4A-9: Warnings correctly implemented
**Severity:** Info
**Area:** Unrated zone warning, load-exceeds-capacity warning
**Description:** LongShore >16 ft surfaces "unrated zone" warning requiring explicit team acknowledgment. Load exceeding 4-strut capacity at given length triggers explicit informational warning (not silent rejection).
**Status:** ✅ Verified.

### F-4A-10: ICS/NIMS structure functionally correct
**Severity:** Low
**Area:** `ICS_ROLES_DEFAULT[]`, "Group" field on shore points
**Description:** ICS hierarchy (IC, Safety, Operations, Entry, Rescue, Initial Shoring, Runner, Cutting Table, Wood Shoring) matches NIMS structure for structural collapse operations. **Caveat:** The shore point `group` field stores apparatus IDs but NIMS Group is a functional command unit, not a resource. Terminology violation noted for v4.0.0 rename to `assignedResource`.
**Status:** ⚠️ Functional but terminology incorrect. Scheduled for v4.0.0.

### F-4A-11: Status workflow matches USAR SOP
**Severity:** Info
**Area:** Shore point status lifecycle
**Description:** Pending → In Process → Strut Placed → Cutting → Runner → Secured → Removed & Returned. Order matches USAR shoring SOP. v3.8.0 phase-based split correctly distinguishes group-wide pre-cutting transitions from individual cutting-workflow transitions.
**Status:** ✅ Verified.

### F-4A-12: Span of control threshold correct
**Severity:** Info
**Area:** Span of control warning
**Description:** Warning at >7 direct reports matches NIMS standard (3-7 optimal).
**Status:** ✅ Verified.

---

## Overall Assessment

**No critical or high-severity findings.** All safety-critical domain logic is correct and aligns with manufacturer specifications and structural collapse rescue doctrine. The v3.5.2 hotfix and v3.7.2 conservative-floor interpolation fix eliminated all known capacity over-reporting issues. The app is safe for use in USAR/FEMA structural collapse operations as a planning aid (with proper liability disclaimer in place).

**Recommendation for v4.0.0:** Rename `group` field on shore points to `assignedResource` to align with NIMS terminology.
