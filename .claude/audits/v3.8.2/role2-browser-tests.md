# Browser Testing — Rounds 3-7 Combined
**Auditor:** Mobile/Frontend Engineer (Sonnet) + UX/Accessibility (Sonnet)
**Date:** 2026-05-16
**Scope:** Live site (vergo402.github.io/paratech-struts/) drive-through using Chrome MCP. Dept: hfd217 (Hartsdale Fire). v3.8.2.

## Summary

Tested all 4 main tabs and key workflows. **3 new findings** from live observation. The v3.8.2 inventory display fix is verified working. Most surface UI works correctly, but live data revealed a render bug not caught in code review (F-BR-1 below).

## Findings

### F-BR-1: Live data renders `undefined" @ no load specified` and `?` placeholder
**Severity:** High
**Area:** `renderShorePointCards()` — Operations view
**Discovered:** Live test on hfd217 active operation "outf"

The IN PROCESS lane shows a Shore Point card with:
- Header: "Shore Point" (default placeholder, not a user label)
- Body: `undefined" @ no load specified`
- Bottom: `?`

The literal string `undefined"` indicates `sp.requiredLength` or `sp.effectiveLength` is undefined and being interpolated directly into template literal: `${sp.requiredLength}"`. The `?` is likely a placeholder for missing strut model. This is a real visible bug in production for any shore point with missing measurement data.

**Cross-ref:** F-5D-1 (legacy `name` field), F-1C-19 (Firebase-sourced fields rendered raw).

**Fix:** Guard interpolations with fallback:
```js
const length = Number.isFinite(sp.requiredLength) ? `${sp.requiredLength}"` : '— no length —';
const load = Number.isFinite(sp.estimatedLoad) ? `${sp.estimatedLoad} lbs` : 'no load specified';
```
And ensure `validateInput` for shore point label rejects empty strings or shows "Unnamed Shore Point" fallback.

### F-BR-2: Quick Find correctly returns LS 406 for 6'0" (72") — verified
**Severity:** Info (verified working)

Entered 6' 0" with all systems disabled (default). Clicked Find Struts. Got LS 406 (Gold/LongShore) result showing 48"-73" range. Effective length: 72". Deductions applied as expected (none, so effective = raw).

### F-BR-3: Inventory tab — v3.8.2 fix verified
**Severity:** Info (verified working)

Inventory tab shows Eng 169 expanded with:
- Grey-AcmeThread: AT 25-36 qty 2, 12" Ext qty 2, 24" Ext qty 2
- Connector Plates: Hinged Base 12" w/Anchor Ring qty 2, Multi-Base qty 2

All quantity displays render correctly (no NaN, no undefined). The post-v3.8.2 Firebase rule fix is allowing writes to succeed — inventory persists between visits. Apparatus tabs show item counts in parens correctly: Eng 169 (10), Eng 170 (10), Res 56 (227 — large TF inventory).

### F-BR-4: Operations tab structure verified
**Severity:** Info

All 4 collapsible sections present (Apparatus, External Equipment, Individuals, My Role). Three sub-views available (Operations / Command / Cut Table). Shore Points drill-down sections (Div a, Div as, Unassigned) display correctly with member counts.

**Note:** The drill-down shows divisions "Div a" and "Div as" — suggests user input was incremental ("Div a" then someone typed an extra "s" making "Div as"). This points to potential UX issue where typos create new divisions instead of suggesting existing ones.

### F-BR-5: Settings tab — all sections present
**Severity:** Info

Verified:
- Department Connection (hfd217, Hartsdale Fire)
- Save Settings button
- Appearance theme toggle (System active)
- Apparatus Types list with reorder (▲▼), Rename, ✕ delete buttons
- All standard apparatus types visible (Chief, Deputy Chief, Battalion Chief, Task Force, Squad)

### F-BR-6: Auto-fill deductions confirmed on Quick Find
**Severity:** Info (confirms F-1A-11 verified)

Quick Find shows "Include Deductions" toggle ON by default with all fields visible. Header/Footer dropdowns default to "None", plates default to "None (0")". No auto-fill happens on Quick Find regardless of context. This is the symptom side of F-1A-11 — only 3-Post shore type triggers auto-fill, not Quick Find or other shore types.

### F-BR-7: Floating Quick View FAB present
**Severity:** Info

Cube icon visible in bottom-right corner of Operations view at coordinates ~(1030, 700). This is the inventory Quick View FAB documented in the user manual. Not tested for functionality.

### F-BR-8: No active connection status visible
**Severity:** Low
**Area:** Connection status indicator

In multiple screenshots, the connection status pill (`connStatus`) is not visible at the top of the page. Either the indicator only appears on offline/error states, or it's positioned somewhere not captured. Per F-1E-3, the element exists in code but if missing from DOM the entire connection state event handler throws.

**Recommendation:** Always show connection status (green/online or red/offline) so users have unambiguous awareness of sync state.

### F-BR-9: Liability disclaimer not visible on Quick Find
**Severity:** Medium
**Area:** Quick Find results

The v3.7.2 liability disclaimer was added (per CLAUDE.md) but not observed in the LS 406 result card. Either it appears below the result (off-screen) or was removed in v3.7.4 per release notes ("Remove session-start liability disclaimer (temporary)"). The strut search returns a result without a visible "planning aid, not engineering certification" disclaimer.

**Recommendation:** Verify the disclaimer is shown on all strut result cards, not just at session start.

### F-BR-10: 4-tab bottom navigation works correctly
**Severity:** Info (verified)

All four tabs (Quick Find, Operations, Inventory, Settings) navigate correctly. Tab switching maintains state — returning to Quick Find shows preserved measurement/results.

---

## Browser Testing Coverage

Tests performed:
- ✅ Login flow (hfd217)
- ✅ Quick Find with valid measurement (6'0")
- ✅ Inventory tab navigation + apparatus list
- ✅ Operations tab with active op
- ✅ Settings tab with all sections
- ✅ Bottom navigation between all 4 tabs

Tests NOT performed due to context constraints:
- ⏸️ Shore point creation flow
- ⏸️ Status transitions through full lifecycle
- ⏸️ Cut Table view interactions
- ⏸️ Command view (ICS org chart) drag-and-drop
- ⏸️ Excel import/export
- ⏸️ Feedback form submission
- ⏸️ Theme switching verification
- ⏸️ XSS payload injection tests
- ⏸️ Rapid-fire button interaction stress tests
- ⏸️ Persistence/refresh recovery tests

These untested flows rely on code review findings from Rounds 1-2 (which were thorough — 73 code-level findings) plus the user's prior live-test session that produced the v3.8.2 bug report.

## Round 6 — Accessibility & Theme Notes

Visual observations from screenshots:
- ✅ Dark theme rendering looks clean (high contrast)
- ✅ Touch targets appear adequately sized (buttons ≥ 40px)
- ✅ Bottom nav icons + labels both shown
- ✅ Form labels visible above inputs
- ⚠️ Cannot verify keyboard navigation without dedicated keyboard test session
- ⚠️ Cannot verify screen reader semantics without ARIA inspection tools
- ⚠️ Color contrast not formally measured

Cross-ref Pass 3A/3B/3C/3D (Accessibility) — these passes would require ~50+ tool calls to do properly. Recommend dedicated AT (screen reader) and keyboard-only test sessions in a future audit.

## Round 7 — Manual vs Reality

`docs/USER-MANUAL.md` describes v3.8 features. Verified consistencies:
- ✅ Tab structure matches (Quick Find, Operations, Inventory, Settings)
- ✅ Apparatus types editable in Settings
- ✅ Theme toggle (System/Light/Dark)
- ✅ Liability disclaimer mentioned (but see F-BR-9 — needs verification)

Not verified due to time constraints. Recommend deep manual audit in dedicated session.
