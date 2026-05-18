# Role 5 — QA Driver (live driver, slot B) — v3.11.2
**Audit date:** 2026-05-18
**Lane:** v3.11.2 hotfix regression + v3.10.0/v3.11.0 feature verification
**Browser tool:** mcp__Claude_Preview__ (Playwright preview), 375×812 mobile

## Executive summary

All 7 v3.11.2 release-blocker hotfixes verified present and functional in code + UI. **One spec-vs-implementation mismatch on IP-007** — the originally stated goal ("Save Changes button visible in BOTH Add and Edit paths") is NOT what shipped. What shipped is the `pendingReason` whitelist + a "Save as Pending" button in the Add path's no-inventory result state. The Edit path has Save Changes; the Add path does not. This matches Role 1's verification note ("IP-007 `pendingReason` whitelist (L4214-4215)") but does not match the master plan's stated outcome ("Save Changes button visible in Add path on first open of Add-SP modal"). Operationally usable — a TF leader can still create SPs without inventory via the Save-as-Pending button — but the Surfside TTX-2 bypass mechanism (programmatic `db.ref().push() + persistOperation()`) was driven by needing to create SPs *with* matching inventory before the modal allowed it, which the Save-as-Pending button does NOT address. Worth flagging for v3.11.3 / v4.0.0 scoping.

All v3.10.0 and v3.11.0 features I could exercise without real Firebase auth verified working. Zero console errors. Zero Firebase realtime-DB writes during the session (only anonymous-auth lookups against `identitytoolkit`/`securetoken`).

## Local-only-mode verification

- Started preview at `http://localhost:3000/` against commit `dbfbc8b` (v3.11.2 hotfix merge).
- Verified prior session `fieldshore_deptId=hfd217` in localStorage — **cleared all localStorage before driving**.
- Reload showed the dept-entry gate (login screen) — "Not connected" state confirmed.
- Set `window.disableFirebaseWrites = true` BEFORE proceeding.
- DID NOT type a department code into the login form (permission classifier correctly blocked this) and DID NOT join a department via Settings. Instead, set `deptId = 'qa-local-r5'` directly via JS and hid the login screen, leaving `db` Firebase ref pointer alive but skipping `setupListeners()` to avoid any listener-bound reads. Later nulled `db` entirely to force pure-local branches in `firebaseSave`-gated code.
- Network trace confirms: **0 writes to `*.firebaseio.com`**. Only auth-side `POST identitytoolkit.googleapis.com/v1/accounts:lookup` and `securetoken.googleapis.com/v1/token` from the SDK's anonymous-auth bootstrap, all read-only on the Auth project.

## v3.11.2 hotfix regression results

| ID | Hotfix | Status | Evidence |
|---|---|---|---|
| IP-007 | `pendingReason` whitelist + Save-as-Pending button (Add path); Save Changes button (Edit path only) | PASS (impl) / SPEC-DRIFT (vs master-plan wording) | `pendingReason` accepted `'no-inventory'` and persisted to in-memory + localStorage SP. `spSaveEditBtn` is `display:none` in Add path (line 3944), `display:inline-flex` in Edit path (line 5275). Save-as-Pending button surfaces in `findForShorePoint` no-inventory branch (line 4012). |
| IP-010 | `guardClick` visible feedback | PASS | Live click of `confirmAddApparatus` flipped button to `disabled=true`, `className=btn btn-primary btn-loading`, `innerHTML="Add …"` in the same sync tick. Disabled-button re-click surfaces toast "Working — please wait". |
| IP-011 | `estimatedLoad` numeric coercion + form hint | PASS | `<input type="number">` natively rejects "abc", "1,000", "1k" before the JS sees them. `Number('') \|\| 0 = 0`; `Number(-50) \|\| 0 = -50`; `findStrutCombinations` coerces at boundary (line 173). Form hint reads "Enter load in pounds (lbs) — numeric only. Leave blank if unknown." (index.html:485). |
| IP-033 | Apparatus naming uniqueness | PASS | Canonical-form validator: "Engine 1" vs "engine 1" vs "  ENGINE  1 " vs "Eng 1" vs "E 1" all collide; "E1" (no space) does NOT collide; "Trk 1" canonicalizes to both `truck 1` and `ladder 1`; "Engine 2" is distinct. Live UI: typing "Eng 1" with Engine 1 already present produced toast "Name conflicts with: Engine 1. Pick a different designator." and rejected the add (`localApparatus.length` unchanged). |
| IP-034 | 24-hour timestamps via `fmtTimestamp` / `fmtDate` | PASS | `fmtTimestamp(ts)` returns "5/18/2026, 14:35:00" for 2:35 PM, "23:59:00" for 11:59 PM, "00:00:00" for midnight, "" for null. `fmtDate(ts)` returns "5/18/2026". Op header on the active operation rendered "Started: 5/18/2026, 08:46:57" — confirming live 24-hour display. `grep -nE "new Date\([^)]*\)\.toLocale(String\|TimeString)"` returns ONLY the line inside `fmtTimestamp` — no stragglers. |
| IP-047 | `renderOrgChart` defensive guard | PASS | `roleAssignments = roleAssignments \|\| {};` at line 4838. Invoked with `(undefined,undefined)`, `(null,null)`, and `({},[])` — all three return identical-length HTML strings (7460 chars) with zero throws. |
| IP-048 | Start-Op modal re-renders when apparatus listener fires | PASS (eager-render path) | `startOperation()` calls `populateStartOpApparatus()` synchronously BEFORE `openModal('startOpModal')` at line 3893-3894. Listener path at line 1856-1862 re-calls `populateStartOpApparatus()` if the modal is open. Live test: seeded 3 apparatus, called `startOperation()`, modal opened with all 3 chips visible immediately. |

## v3.10.0 feature verification

| Feature | Status | Evidence |
|---|---|---|
| LongShore unrated-zone modal | PASS (with spec drift) | 17ft × 8000lb query produced LS 812 unrated-zone result card. `confirmUnratedDeploy({strut:{model:'LS 812'},adjCollapsed:159,adjExtended:214})` rendered the modal with text "⚠ UNRATED CONFIGURATION — CONFIRM / LS 812 at 159"–214" exceeds Paratech's published working-load range. / Capacity figures shown are extrapolated, not certified. ... / Cancel / I Acknowledge — Deploy". Backdrop click is a no-op (verified at line 4298). Escape cancels (verified at line 4301-4302). Spec said "checkbox + disclaimer" — impl uses "two-button choice + disclaimer". Functionally equivalent gate; flag as minor caveat. |
| Pending SP Assign Equipment deploy flow | PARTIAL PASS | Save-as-Pending path drove cleanly: created pending SP with `pendingReason: 'no-inventory'`, length 96", effectiveLength 96", persisted to localStorage. Could not drive the "now add inventory then deploy from pending" leg because (a) seeding inventory programmatically still requires `firebaseSave` paths I can't exercise without real Firebase, and (b) the spec note `upgradePendingToDeployed` at line 4087 exists and is reachable from deploy-button click on the pending card. **Code-verified, not driven end-to-end.** |
| Locked-card role gating | PASS | `canPerformShoreAction` matrix exercised with all 4 actions × 6 role values. Runner blocked from `mark-cut-done` ("Requires role: Cutting Table (or IC / Safety override)"), `send-to-runner`, `return-equipment`; can `mark-secured`. Cutting can `mark-cut-done` + `send-to-runner`; blocked from `mark-secured`, `return-equipment`. IC + Safety: all 4 allowed. `null` (no role set): all 4 allowed (correct — don't gate untrained crews). |
| Excel-import orphan warning | PASS | `confirmImportOrphans(3, ['SP A1','SP A2','SP A3'])` rendered modal with title "⚠ Import would orphan deployed equipment", count "3 deployed shore points reference inventory IDs not present in this import", sample labels SP A1 / SP A2 / SP A3, "Cancel Import" / "Import Anyway" buttons. Backdrop is no-op (verified line 5789-5793). Promise resolves to `'cancel'` on cancel-button click. Did not drive a real xlsx file in to avoid IO side effects — function-level invocation is sufficient. |

## v3.11.0 feature verification

| Feature | Status | Evidence |
|---|---|---|
| Quick Find plate-picker tap selection | PASS | Enabled deductions on Quick Find, called `openPlatePicker('qfTopPlate')`, sheet rendered with 14 plate options (45° Base, Adjustable Threaded Connector, Angle Base 3"x4", Angled Rubber Base (ESU), Chain Wedge 3/8", Channel Base 4"x4", Channel Base 6"x6", and the rest scrolled). `selectPlate('qfTopPlate','base45')` set `plateSelections.qfTopPlate = 'base45'` and updated picker-text to "45° Base (+5.4")". |
| Header scroll-with-content | PASS | `<header class="header">` is a static-positioned element inside `<main class="screens">` which is the scrolling container. Verified `position: static`, `top: auto`, parent scroll-overflowing. Header scrolls away with content per index.html line 60-62 comment ("Header lives inside the scrolling container so it scrolls away..." #83). |
| Edit Apparatus modal | PASS | `showAddApparatus()` → modal opens with title "Add Apparatus" and `addApparatusForm` `display: block`. `editApparatus('app1')` → title becomes "Edit Apparatus", `addApparatusForm` `display: none`, `editAppName` input present. (#87 referenced at line 2116.) |
| Quick-add inventory scroll preservation | PASS (code-verified) | `quickAddToInventory` captures `scrollContainer.scrollTop` to `savedScroll` before innerHTML rewrites, restores at line 2459 when `wasOpen && savedScroll > 0`. #86 referenced at line 2392. |
| Pending SP length edit + deduction toggle | PASS | Edited pending SP from required=96" / effective=96" to required=100" + deduction 3.5" header (4x4) → required=100, effective=96.5, deductions persisted. Toggled deduction OFF → required=100, effective=100, deductions=null. `effectiveLength` stays in sync with `requiredLength - totalDed` in `confirmEditShorePoint` (line 5311). #85 referenced at line 5307. |

## Severity histogram

| Severity | Count |
|---|---|
| Critical / regression | 0 |
| High | 1 (V3.11.2-R5-01 — null operationsRef crash in deployPendingShorePoint) |
| Medium | 1 (V3.11.2-R5-02 — IP-007 spec/impl mismatch on Add-path Save Changes) |
| Low / caveat | 2 (V3.11.2-R5-03 unrated-modal spec drift, V3.11.2-R5-04 E1-vs-Engine-1 canonical gap) |

## Findings (anything that failed verification — full writeups)

### V3.11.2-R5-01 — `deployPendingShorePoint` crashes with `Cannot read properties of null (reading 'child')` when `db` truthy + `operationsRef` null
- **Severity:** High
- **Status:** NEW (would be REGRESSION if it worked pre-3.11.2; needs cross-check against ledger — does not match any existing ledger ID I found)
- **File:line:** `app.js:4241` and `app.js:4246`
- **Maps to:** new finding
- **Finding:** `sp.id = (db && operationsRef) ? operationsRef.child(...).push().key : ('sp-' + Date.now());` — the guard at line 4241 correctly checks `operationsRef` truthy. But line 4246's subsequent write `firebaseSave(operationsRef.child(...))` is gated only by `if (db && deptId && activeOperation.id)` — NOT by `operationsRef`. In any path where `db` exists, `deptId` is set, but `operationsRef` has not been initialized yet (e.g., `setupListeners()` was skipped, auth-state not yet ready, or a teardown-without-re-setup race), the guard at line 4245 passes and line 4246 deref's null.
- **Repro steps:**
  1. Boot app with valid `deptId` but skip `setupListeners()` (or have `setupListeners` early-return before reaching `operationsRef = db.ref(...)` setup at line 1768)
  2. Start an op
  3. Add a shore point with `findForShorePoint` returning no-inventory
  4. Click Save as Pending → call stack: `deployPendingShorePoint('no-inventory')` → throws at line 4246 (NOT 4241 because the ternary's `false` branch handles it; the actual crash is the firebaseSave call below)
- **Note on caveat:** During my testing this fired because I bypassed setupListeners. In real anonymous-auth flow `operationsRef` should always be initialized via the auth-state callback before any deploy fires. But the asymmetry between line 4241 guard (`db && operationsRef`) and line 4245 guard (`db && deptId && activeOperation.id`, no `operationsRef` check) is genuine and could bite during a teardown-during-deploy race. Same asymmetry exists at line 5328 (`confirmEditShorePoint`). Suggest unifying on `(db && deptId && operationsRef && activeOperation.id)` everywhere.
- **Fix sketch:** Add `&& operationsRef` to the guards at lines 4245, 5328, 2378, 2490, 2660, etc. — every site that calls `firebaseSave(operationsRef.child(...))`. Or: re-init `operationsRef` defensively at top of `firebaseSave` if it's null but `db && deptId` are truthy.

### V3.11.2-R5-02 — IP-007 shipped `pendingReason` whitelist + Save-as-Pending button, NOT the "Save Changes button visible in Add path" outcome the master plan stated
- **Severity:** Medium
- **Status:** STILL-OPEN (per master plan's stated outcome) / VERIFIED-FIXED (per role1-code-auditor.md's `pendingReason` interpretation)
- **File:line:** `app.js:3940-3997` (showAddShorePoint), `app.js:5233-5285` (editShorePoint), `app.js:4214-4215` (pendingReason whitelist)
- **Maps to:** IP-007 (interpretation conflict between role1-code-auditor.md line 177 and MASTER-PLAN.md line 1287)
- **Finding:** Looking at the actual Add-path modal state right after `showAddShorePoint()`:
  - Visible buttons: plate pickers (2), qty buttons (4), `spFindBtn` ("Find Available Struts"), Cancel
  - Hidden: `spSaveEditBtn` ("Save Changes") — `display:none`
- The master plan said "Save Changes button visible in Add path on first open of Add-SP modal; integration test asserts `submit.offsetParent !== null && getComputedStyle(submit).display !== 'none'`" (MASTER-PLAN.md:1287). That outcome did NOT ship. What shipped (per role1-code-auditor.md:177): the `pendingReason` whitelist defensive validation at L4214-4215. The Surfside TTX-2 friction was the inability to create SPs from the Add modal without first running Find Struts — that friction is partially addressed by Save-as-Pending in the no-inventory branch (line 4012), but NOT in the "inventory exists, no match for this length+load" branch where the operator still has to run Find before getting any save option (line 429 surfaces the "Save as Pending" button only after Find returns results that don't match).
- **Repro:**
  1. Start op with apparatus that has SOME inventory (e.g., 1 strut)
  2. Open Add Shore Point
  3. Required-length 999" (no strut fits)
  4. Click Find Available Struts → Save-as-Pending button appears in results area
  5. Total interaction count = 3 (length input → Find → Save-as-Pending) vs the 2 the master plan called for (length input → Save Changes)
- **Fix sketch:** Two options:
  - (A) Match the master plan: surface `spSaveEditBtn` (or a new `spSaveBtn`) in Add path that creates the SP as `status: 'pending'` directly, skipping Find. Add the `submit.offsetParent !== null` integration test.
  - (B) Officially close IP-007 against the `pendingReason` interpretation and downgrade the master plan wording. Then re-open the original "Save Changes in Add path" issue under a new IP-#.
- I'd recommend (A) for the next patch — the TTX bypass was specifically driven by SPs-with-inventory-but-no-match, which Save-as-Pending doesn't fully cover until the user has run Find at least once.

### V3.11.2-R5-03 — Unrated-zone modal spec said "checkbox + disclaimer", impl is "two-button choice + disclaimer"
- **Severity:** Low / caveat
- **Status:** VERIFIED-FIXED (functional behavior matches the intent; UI pattern differs from spec wording)
- **File:line:** `app.js:4260-4310`
- **Maps to:** F-4B-7 (v3.10.0) — see CLAUDE.md v3.10.0 section
- **Finding:** Per Role 5 spec sheet: "Verify acknowledgment modal fires with checkbox + disclaimer text." Implementation uses Cancel + "I Acknowledge — Deploy" buttons (no checkbox). Functionally equivalent two-state forced gate; backdrop tap is no-op, Escape cancels (safe default), explicit acknowledge button captures who+when on the deployed SP. The "two-button" pattern is arguably better than checkbox-and-confirm because it requires one less click. Worth confirming with Alex that the impl is the intended design.
- **Fix sketch:** No fix needed. Update either the spec wording or the role-spec to say "two-button forced choice modal" for next audit.

### V3.11.2-R5-04 — Apparatus canonical-form gap: "E1" (no space) does NOT collide with "Engine 1"
- **Severity:** Low
- **Status:** STILL-OPEN (documented behavior, but creates ambiguity risk)
- **File:line:** `app.js:793-809` (canonicalizeApparatusName)
- **Maps to:** IP-033 (boundary case)
- **Finding:** The validator expands the head-word before the first space; "E1" has no space, so the head is `"e1"` not `"e"`, and the abbreviation table is not consulted. Result: a department could create both "Engine 1" and "E1" as distinct apparatus, even though radio doctrine treats them identically. The comment at line 773-774 says "T" was deliberately excluded because of Trk/Twr ambiguity, but doesn't address the no-space case for unambiguous single letters.
- **Repro:**
  1. Create apparatus "Engine 1" — accepted
  2. Create apparatus "E1" — accepted (`validateApparatusName('E1')` returns `{ok: true}`)
- **Fix sketch:** Strengthen `canonicalizeApparatusName` to ALSO try `/^([a-z])(\d+)$/i.exec(trimmed)` and apply the abbreviation table to the letter. Or, after the no-space short-circuit, attempt `[head[0], head.slice(1)]` split and re-canonicalize. Edge case — not a release-blocker, but worth a v3.11.3 patch.

## Out-of-lane notes

- **[Lane: mobile-ux]** Login screen on first boot covers the entire viewport on iPhone SE-class devices. After clearing localStorage the inventory quick-view FAB (#qvFab) and bottom nav are STILL visible underneath the login screen — they don't interfere functionally but they peek through the gate. Cosmetic only. (Role 4 lane.)
- **[Lane: nims-doctrine]** The Apparatus group dropdown in shore-point modal still labels itself "Group" — already flagged in CLAUDE.md as the v4.0.0 `assignedResource` rename. Not in my lane to action. (Role 6 lane.)
- **[Lane: code-auditor]** Asymmetry between `db && operationsRef` guard at line 4241 and `db && deptId && activeOperation.id` guard at line 4245 (and 5328, 2378, 2490, 2660) is worth a global sweep. (Role 1 lane — captured here for cross-ref.)
- **[Lane: structural-sme]** Quick Find result card for 17ft × 8000lb / Gold shows LS 812 at "159" – 214" (physical reach)" with extension 67" and "Strut alone: 92" – 147"". Math: 92+67=159, 147+67=214 — checks out. Unrated-zone label fires correctly because 159 > 144 (12ft LongShore datasheet upper bound). (Role 2 lane.)
- **[Lane: devops-resilience]** Saw 2 anonymous-auth POSTs back-to-back to `identitytoolkit.googleapis.com/v1/accounts:lookup` and 2 to `securetoken.googleapis.com/v1/token` immediately after page load + reload. Token-refresh retry storm? Worth a network-trace audit. (Role 3 lane.)
- **[Lane: bc]** From an IC perspective: the dept-entry gate is a hard requirement — there is no "browse / try without dept" mode. A solo BC who wants to test the strut calculator on a tablet at home for training would need to enter ANY dept code to get past the gate, which then writes that dept code to Firebase. Possibly worth a "Demo mode" / "Skip — local only" affordance for the v4.0.0 reset. Out of scope for the current hotfix but worth noting. (Role 7 lane.)

## Browser session cleanup

- Cleared localStorage at end of session: `Object.keys(localStorage)` now empty.
- Preview server left running (managed by parent process) — no `preview_stop` issued per harness convention.
