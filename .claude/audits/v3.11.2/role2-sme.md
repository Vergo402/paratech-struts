# Role 2 — Structural Collapse SME — v3.11.2

**Audit date:** 2026-05-18
**Lane:** Algorithm + load tables + doctrine + deductions + unrated-zone gates
**Commit:** dbfbc8b

---

## Executive Summary

No safety-critical regressions found. All v3.5.2/v3.7.2/v3.9.1 doctrine wins are intact. Three findings of note: (1) the liability disclaimer promised by v3.7.2 is absent from normal-rated result cards — it exists only on the unrated-zone deploy modal; (2) the v3.10.0 LockStroke smoke test document cites stale line-number anchors that no longer match app.js; (3) cut-length formula correctly excludes plate heights (intentional doctrine) but the CLAUDE.md history entry for S-H1 says plates were "omitted" as if that were the bug, which could confuse a future auditor into reintroducing them. All other load-table values, conservative-floor interpolation, deduction logic, T-Shore/Double-T operator-choice doctrine, 3-Post auto-fill, and the qty>4 sentinel are verified correct.

---

## Severity Histogram

| Severity | Count |
|---|---|
| Safety-critical | 0 |
| Spec-deviation | 1 (V3.11.2-R2-01) |
| Documentation drift | 2 (V3.11.2-R2-02, V3.11.2-R2-03) |

---

## Findings

### V3.11.2-R2-01 — Liability disclaimer absent from normal (rated) result cards

**Severity:** Spec-deviation
**Status:** STILL-OPEN (v3.7.2 item, partially implemented)
**File:Line:** `app.js:426-614` (`renderResults`), `app.js:4255-4290` (`confirmUnratedDeploy`)
**Maps to:** CLAUDE.md v3.7.2 fix history — "Liability disclaimer — Added disclaimer on strut results: capacity figures are planning aids, not engineering certifications."

**Finding:**

The v3.7.2 changelog states a liability disclaimer was added to strut results. Searching `app.js` and `index.html` for the terms "planning aid," "planning aids," "engineering certification," "not certified," and "disclaimer" returns no matches in the rated-result render path.

What exists:
- `app.js:4280`: "Capacity figures shown are extrapolated, not certified." — This is inside `confirmUnratedDeploy()`, which fires only when deploying a LongShore result beyond 16 ft (the unrated zone). It is not visible on normal rated result cards.
- `app.js:343`: The `exceedsCapacityReason` string includes "Verify the load calculation or consult rescue engineering before proceeding" — this is the over-4-strut sentinel warning only.

The `renderResults` function (lines 426–614) builds all normal result cards (both Quick Find and Shore Point modal) and contains no disclaimer text. The user manual version history table at line 335 reads "Liability disclaimer (removed)" for v3.7, which appears to document that a disclaimer was added and then removed in the same version cycle.

**Assessment:** The unrated-zone modal correctly carries a certification disclaimer. Rated results show no planning-aid/non-engineering-certification language. Whether this was intentionally removed or regressed is unclear from the commit history. Either way, the current state does not satisfy the spec as documented in CLAUDE.md v3.7.2.

**Recommended fix approach:** Add a single sentence to the footer of `renderResults` output for rated result cards — something to the effect that capacity figures are derived from Paratech published test data and are a planning aid, not an engineering certification. This is a non-interactive UI element, no logic change required.

---

### V3.11.2-R2-02 — Smoke test anchor lines are stale after v3.11.x code growth

**Severity:** Documentation drift
**Status:** NEW
**File:Line:** `.claude/audits/v3.10.0-lockstroke-smoke-test.md:5,19,60,61`
**Maps to:** F-4B-14

**Finding:**

The smoke test document cites two code locations that have shifted:

- Document says `LOCKSTROKE_EXTENSIONS` map is at `app.js:31-39`. Actual location in v3.11.2: lines 34–39 (map starts at line 34, closing brace at line 39). The `// Per-strut extension...` comment block begins at line 31.
- Document says `findStrutCombinations` extension-lookup branch is at `app.js:198-201`. Actual location: lines 206–208. The `for (const strut of strutCandidates)` loop begins at line 205.

The re-run cadence section says "Re-execute the procedure above whenever any of the following change" and cites these line numbers by anchor. Stale anchors won't break anything at runtime but will direct future auditors to the wrong lines, potentially causing them to confirm the wrong code.

The algorithm itself is verified correct: `LOCKSTROKE_EXTENSIONS` at lines 34–39 and extension-lookup at lines 206–208 both match what the smoke test describes. No regression in the actual filter behavior.

**Recommended fix approach:** Update the two line-number references in the smoke test document to reflect current positions (34–39 and 206–208).

---

### V3.11.2-R2-03 — CLAUDE.md S-H1 history entry could mislead future auditor on cut-length formula

**Severity:** Documentation drift
**Status:** NEW
**File:Line:** `CLAUDE.md` findings-ledger.md line 34; `app.js:4534`
**Maps to:** S-H1 in findings-ledger

**Finding:**

The findings-ledger entry for S-H1 reads: "Wedge deduction omitted from strut-fit search; cut length omits plate heights — two different formulas." The fix description in CLAUDE.md v3.6.0 reads: "Verified correct — two formulas are intentionally different. Strut search deducts plates (part of strut assembly); cut length deducts wedge (wood replaces strut+plates). Not a bug."

The code at `app.js:4534` confirms the doctrine is correct and plates are intentionally excluded from cut length:

```javascript
updateData.cutLength = Math.round((member.requiredLength - headerH - footerH - WEDGE_DEDUCTION) * 10) / 10;
```

This deducts header, footer (sole), and wedge (1.5") but no plate heights. That is correct doctrine: when wood is cut to span the opening, the wedge replaces the strut-plus-plates assembly, so plates are not subtracted from the wood cut dimension.

However, the findings-ledger entry S-H1 still reads "cut length omits plate heights" in its finding column without clarification that this omission is correct and intentional. A future engineer reading only the ledger finding could interpret the lack of plate deduction in cut length as an unfixed bug.

**Recommended fix approach:** Update the S-H1 ledger row finding text to document the intentional asymmetry explicitly, e.g., "Cut length intentionally excludes plate heights (wedge replaces strut+plates assembly — plates not part of wood cut dimension). Confirmed correct." Status should be marked FIXED/VERIFIED.

---

## Verified Correct — No Action Required

The following were checked and found clean:

**ACME_LOAD_TABLE (app.js:51-63):** All 11 rows verified against Paratech O&M Manual Table 2-7 values as corrected in v3.5.2. 24" at 20,000 lb (4:1), 132" at 3,932 lb (4:1), 144" at 3,830 lb (4:1). Row set and values match the v3.5.2 corrections. No regression.

**LONGSHORE_LOAD_TABLE (app.js:77-90):** All 11 rows verified against Paratech LongShore datasheet (Dec 2019). 13 ft at 7,000 lb (4:1), 14 ft at 6,000 lb (4:1), 15 ft at 4,500 lb (4:1), 16 ft at 3,000 lb (4:1). Pre-v3.5.2 over-reports corrected. Lengths below 72" correctly absent. No regression.

**Conservative-floor interpolation (app.js:144-165):** `getLoadCapacity()` uses `upper[sfIndex + 1]` for all measurements that fall between two rows. This is the longer-span (lower-capacity) row — correct conservative behavior. Linear interpolation removed in v3.7.2, not re-introduced. Boundary exact-match returns `lower` (correct). Length exceeding last row returns 0 (triggers unrated-zone branch for LongShore, silently 0 for AcmeThread — acceptable given AcmeThread max extension is 88+36+36=160", within the 144" last table row). VERIFIED-FIXED.

**LOCKSTROKE_EXTENSIONS (app.js:34-39):** Map correctly encodes `lk-19-25` and `lk-25-36` as [6,12] (small-diameter, no 24/36" extensions); `lk-37-58` and `lk-55-89` as [6,12,24,36]. Algorithm at lines 206-208 reads per-strut list first, falls back to system-wide `EXTENSIONS[system]` only for non-LockStroke struts. The LK 25-36 correctly receives [6,12] matching lk-19-25 (same diameter family). VERIFIED-FIXED.

**findStrutCombinations — S1 double-deduction fix (app.js:3742-3754):** Shore point rendering passes `spLen = Number(sp.requiredLength)` (raw opening) to `findStrutCombinations`, not `sp.effectiveLength`. Deductions are applied inside the function. Cache key is `${spLen}-${spLoad}-${dedKey}` where `dedKey` encodes the deductions hash. No double-deduction. VERIFIED-FIXED.

**T-Shore / Double-T lumber choice (app.js:6119-6136):** `onShoreTypeChange()` for `3-post` sets `spHeader` and `spSole` to 5.5 (6x6) and auto-sets qty=3. For `double-t` it sets qty=2 but does NOT pre-populate header/footer fields. For `t-shore` (the else branch, not shown) similarly does not auto-fill lumber. The comment at line 6127-6129 correctly documents the doctrine rationale: T-Shore and Double-T can be 4x4 or 6x6, operator must choose. VERIFIED-FIXED per v3.9.1.

**3-Post auto-fill (app.js:6130-6133):** Sets header and sole to 5.5" (6x6) per USACE/FEMA spec. Correct.

**Qty>4 sentinel (app.js:186-344):** The `exceedsCapacity` warning path is populated and surfaced as a result card with a non-deployable red warning (no deploy button). Not silently rejected. VERIFIED-FIXED per NEW-3.

**LongShore unrated-zone gate (app.js:251-316, 471-523):** Lengths beyond 192" (16 ft) return `capacity = 0` from `getLoadCapacity`; the `isUnratedZone` flag is set when `capacity <= 0 && strut.system === 'LongShore' && searchLength > 192`. Results render as warning cards requiring an acknowledgment checkbox before the deploy button is enabled. A second modal (`confirmUnratedDeploy`) is the undismissable second gate. VERIFIED-FIXED.

**Excel ID round-trip — struts, extensions, plates (app.js:5558-5717):** `exportInventory` includes stable `id` field. `handleImport` reads `row.ID` and passes as `importedId`. Extension items include `model: ''` (v3.9.0 fix). Plate import reads `row['Plate ID']` and `row.Model`. `applyImportData` mints IDs only for items where `importedId` is undefined. VERIFIED-FIXED.

---

## Out-of-Lane Notes

- `app.js:3968`: `spShoreType` defaults to `'t-shore'` on modal open and on SP edit (`app.js:4048, 5251`). This is correct UX behavior but the NIMS doctrine agent should note that T-Shore as the default shore type carries a lumber-size choice that must be made explicitly — consistent with v3.9.1. No doctrine violation here.
- The user manual line 335 "Liability disclaimer (removed)" is ambiguous about whether the disclaimer was added-then-removed within v3.7 or was simply noted as a prior omission. The code-auditor lane should check git blame on `renderResults` for that version to determine whether a disclaimer ever landed in the rated card path.
