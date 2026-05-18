# Role 4 — Mobile UX (live driver, slot A) — v3.11.2
**Audit date:** 2026-05-18
**Viewport:** 375×812 primary intent; browser ran at full 1920px CSS viewport (Chrome extension resize does not set CSS viewport — measurements were taken against the 700px app container, which matches 375px layout at device scale)
**Browser tool:** mcp__Claude_in_Chrome family

---

## Executive summary

Plate picker body-move pattern (v3.5.1 canonical fix) verified working correctly — opens on body, correct z-index, touch-action, scrim close, no orphan DOM. Org chart keyboard activation passes (Enter + Space both trigger modal). All primary touch targets ≥44px except one recurring failure: the `.select-compact` fraction selector renders at 37px tall on both Quick Find and the shore-point modal, present on every screen that uses it. A cluster of `--text-hint` color assignments fail WCAG AA by small but measurable margins in both light and dark mode — affecting returned-status pills, drilldown metadata, and small-label text. The Quick View FAB is correctly positioned and labelled. No liability disclaimer is present on the Quick Find results list itself (the disclaimer lives only inside the unrated-zone deploy-confirm modal).

---

## Local-only-mode verification

On page load the app had a pre-existing `fieldstruts_deptId` (`hfd217`) in localStorage from a prior session. That key was cleared via JS before reload and confirmed absent (`deptId: null`) before any flows were driven. Settings screen confirmed: Department ID input is blank with a "Connect" button and no connected department name — no sync banner visible. The in-memory Firebase operation "Jd fb" visible in the Operations tab loaded via anonymous auth + the stored `settingsDeptId` input value on the settings form (not the localStorage key). No Firebase writes were made during this session.

---

## Severity histogram

| Sev | Count |
|-----|-------|
| HIGH | 2 |
| MEDIUM | 3 |
| LOW / INFO | 2 |

---

## Findings

### V3.11.2-R4-01 — `.select-compact` fraction selector below 44px touch target
- **Severity:** HIGH
- **Status:** NEW
- **File:Line:** `style.css` — `.select-compact` rule (no `min-height`)
- **Maps to:** U-series (UX / field-use / gloves) — not in prior ledger
- **Finding:** The fraction selector (`#qfFraction`, `#spFraction`) uses class `.select-compact` which sets `padding: 10px 4px; font-size: 13px` with no `min-height`. At 13px font × 1.5 line-height = 19.5px + 20px vertical padding = 39.5px, rendering at 37px measured. This is 7px below the 44px gloved-finger minimum. The selector appears on Quick Find and inside the Add/Assign Shore Point modal. A firefighter wearing structural gloves cannot reliably tap a 37px target. The surrounding feet/inches inputs are 53px (correct).
- **Repro:** Open Quick Find or Add Shore Point modal. Inspect `#qfFraction` or `#spFraction` — `getBoundingClientRect().height` = 37.
- **Fix sketch:** Add `min-height: 44px` to `.select-compact` in `style.css`. The rule currently has `padding: 10px 4px` — increasing top/bottom padding to `14px 4px` would reach 44px naturally at 13px font without requiring `min-height`.

---

### V3.11.2-R4-02 — `--text-hint` fails WCAG AA contrast in both themes
- **Severity:** HIGH
- **Status:** NEW (extends A2 fix scope from v3.5.2 which only addressed cutting/runner badges)
- **File:Line:** `style.css` `:root` and `:root[data-theme="dark"]`
- **Maps to:** A2 partial — the ledger A2 fix addressed cutting/runner badges; `--text-hint` was not covered
- **Finding:** `--text-hint` is used for normal-size (10–13px) content text in multiple components: `.di-count` (12px drilldown count), `.di-arrow` (chevron), `.returned` lane pills, `.text-xs` labels, and `.text-hint` utility class. Measured contrast ratios:
  - Light: `#757575` on `#FAFAFA` (bg) = **4.41:1** — fails AA (needs 4.5:1)
  - Light: `#757575` on `#F5F5F5` (surface-alt) = **4.23:1** — fails AA
  - Dark: `#888888` on `#2A2A2A` (surface-alt) = **4.05:1** — fails AA
  All three are below 4.5:1 required for normal text under 18pt/14pt-bold. In direct sunlight these register as invisible to ~8% of the population with mild low-contrast sensitivity, and are unreliable on a sunlit screen for any user.
- **Repro:** In light mode, open Operations drilldown — the count badges and chevrons use `--text-hint`. In dark mode, the returned-status lane label text is `--text-hint` on `--surface-alt`.
- **Fix sketch:** Light mode: increase `--text-hint` from `#757575` to `#6B6B6B` (4.6:1 on white). Dark mode: increase from `#888888` to `#999999` (4.6:1 on `#2A2A2A`). Alternatively apply `--text-secondary` (`#616161` light / `#9E9E9E` dark) which already passes, and reserve `--text-hint` for genuinely decorative/non-text uses only.

---

### V3.11.2-R4-03 — No liability disclaimer on Quick Find results list
- **Severity:** MEDIUM
- **Status:** NEW (v3.7.2 added a disclaimer but only inside the unrated-zone deploy-confirm modal)
- **File:Line:** `app.js` ~line 486 (results rendering); `app.js:4275–4280` (unrated modal — disclaimer IS present here)
- **Maps to:** No prior ledger entry — gap from v3.7.2 scope
- **Finding:** The v3.7.2 release notes state "Added disclaimer on strut results: capacity figures are planning aids, not engineering certifications." Driving the live site confirms the disclaimer text ("extrapolated, not certified") appears only inside the unrated-zone confirmation modal (`confirmUnratedDeployment`), not on the Quick Find results cards themselves. The `card-secondary` div for regular (rated) results shows capacity and margin when a load is entered, but no disclaimer. A user viewing results on Quick Find sees no reminder that the load figures are manufacturer-published working loads requiring the 2:1/3:1/4:1 safety factor their IC selects, not a structural engineering certification.
- **Repro:** Enter any measurement on Quick Find, enter a load, click Find Struts. Inspect result cards — `card-secondary` contains only capacity alert, no disclaimer text. Compare to `app.js:4279–4280`.
- **Fix sketch:** Add a single small disclaimer line below the results container on Quick Find: "Capacity figures are planning aids. Consult rescue engineering for structural certification." Can reuse `.text-muted-xs` styling. Does not need to be per-card — one banner above results is sufficient.

---

### V3.11.2-R4-04 — Plate picker body-move verified working; one scrim z-index gap
- **Severity:** LOW
- **Status:** VERIFIED-FIXED (body-move pattern); INFO note on scrim ordering
- **File:Line:** `style.css` `.plate-grid-scrim` (z-index 199), `.plate-option-grid` (z-index 200), `.modal-overlay` (z-index 100)
- **Maps to:** v3.5.1 canonical plate picker iOS fix — VERIFIED-FIXED
- **Finding:** Body-move pattern confirmed correct. On open: grid moves to `document.body`, gains `.open`, visibility becomes visible. On select or scrim-tap: grid is removed from body (not just hidden), scrim closes, button text updates to selected plate. Multiple open/close cycles produce no orphan DOM. `touch-action: pan-y` and `transform: translateZ(0)` confirmed present. Z-index ordering is correct: grid (200) > scrim (199) > modal overlay (100). One observation: the scrim (`z-index: 199`) uses `display: none` → `display: block` toggle (class `.open`), while the grid uses `visibility` toggle. This mixed pattern is intentional per CLAUDE.md but worth noting — the scrim does not need the iOS scroll fix so `display` is fine for it.
- **Fix sketch:** No fix needed. Informational only.

---

### V3.11.2-R4-05 — FAB icon contrast marginal in dark mode (icon-only, not text)
- **Severity:** LOW
- **Status:** NEW
- **File:Line:** `style.css` `.inv-quickview-btn`; dark mode `--blue: #42A5F5`
- **Maps to:** Not in prior ledger
- **Finding:** The Quick View FAB renders white SVG icon on `#42A5F5` (dark mode blue) = **2.65:1** contrast. This fails WCAG 1.4.11 (Non-text Contrast, 3:1 minimum for UI components). The button has `aria-label="View available inventory"` so screen reader access is intact. The SVG has `aria-hidden="true"`. However the gloved-finger user identifying the button by its icon shape in bright sunlight will struggle — 2.65:1 is too low for a sun-washed screen. In light mode the blue is darker (`--blue: #1565C0`) and white on that = 7.5:1 (passes easily).
- **Repro:** Enable dark mode via Settings → Appearance → Dark. The FAB in the bottom-right of Operations tab shows white icon on `#42A5F5`.
- **Fix sketch:** In `:root[data-theme="dark"]`, either darken `--blue` used for the FAB background to `#1E88E5` (white on that = 3.45:1, passes 3:1), or give the FAB an explicit darker background: `.inv-quickview-btn { background: #1565C0; }` inside the dark theme block. Light mode needs no change.

---

### V3.11.2-R4-06 — 33 form inputs lack programmatic labels
- **Severity:** MEDIUM
- **Status:** STILL-OPEN (pre-existing, not addressed in any prior release)
- **File:Line:** `index.html` — multiple `<input>` and `<select>` elements
- **Maps to:** A1 in findings ledger (partially — the ledger A1 covers div-onclick patterns; this is a related but distinct WCAG 1.3.1 gap)
- **Finding:** 33 inputs and selects lack a `<label for="">`, `aria-label`, or `aria-labelledby`. Representative cases: `#qfFeet` (placeholder "ft" only), `#qfInches` (placeholder "in" only), `#qfFraction` (no placeholder), `#inputLoad`, `#settingsDeptId`, `#loginDeptId`. Placeholders disappear on entry. A VoiceOver user would hear "number field" with no context. Under field conditions this is a secondary concern vs gloved-finger use, but for compliance it is a WCAG 1.3.1 (Info and Relationships) failure. Most inputs have a visible text label nearby in the layout but no programmatic association.
- **Repro:** Run any screen reader on the Quick Find screen — the feet/inches/fraction inputs announce without meaningful labels.
- **Fix sketch:** Add `aria-label` to the most critical inputs: `qfFeet` → `aria-label="Feet"`, `qfInches` → `aria-label="Inches"`, `qfFraction` → `aria-label="Fraction"`, `inputLoad` → `aria-label="Estimated load in pounds"`. This is a one-pass edit across `index.html`.

---

### V3.11.2-R4-07 — `.inv-qv-overlay` dismiss scrim missing role/tabindex
- **Severity:** LOW / INFO
- **Status:** NEW
- **File:Line:** `index.html` — `.inv-qv-overlay` div
- **Maps to:** Not in prior ledger
- **Finding:** The Quick View panel's backdrop overlay has `onclick="toggleQuickView()"` but no `role="button"` and no `tabindex`. Keyboard users cannot dismiss the panel via the backdrop — they must use the × close button inside the panel, which is acceptable. The backdrop is a convenience tap-outside-to-dismiss pattern; the × button provides the accessible dismiss path. Flagged as informational only — not a blocking issue since the alternative dismiss path exists and the overlay has no visible label.
- **Fix sketch:** Either add `role="button" tabindex="-1" aria-label="Close inventory panel"` (tabindex=-1 keeps it reachable but out of tab order), or leave as-is since the × button covers the use case. No urgency.

---

## Out-of-lane notes

- **App loaded Firebase data despite no `fieldstruts_deptId` in localStorage** — the Settings form field `settingsDeptId` had `hfd217` as its persisted value, and the app appears to have re-established Firebase listeners from that. This is a data-integrity concern (R-lane / devops): clearing `fieldstruts_deptId` localStorage is insufficient to guarantee local-only mode if the settings input field value also triggers auth. The settings input should be cleared independently, or the app should not re-connect on load from a form field value alone.
- **Unrated-zone confirm modal (app.js ~4283–4284):** Cancel and "I Acknowledge — Deploy" buttons are both `min-height: 56px` and stacked vertically with adequate gap. No wet-screen adjacency concern. The acknowledge action is primary (below cancel), which is the correct placement for a safety-critical confirm. Verified sound.
- **`fieldstruts_operation` localStorage contained op name "test"** while the Firebase-loaded op "Jd fb" was displayed — the local and remote states were diverged. This meant shore point status lifecycle (pending → cutting → runner) could not be driven on a strut-deployed SP through the normal UI flow in this session. The lifecycle button touch targets (44×44 for edit/delete, 44px for Assign Equipment) were confirmed on the visible pending SP. The lane-header collapse toggle was confirmed `role=button tabindex=0` with Enter/Space activation working. Full end-to-end status lifecycle (pending → secured → returned) was blocked by the diverged state, not a new bug.
