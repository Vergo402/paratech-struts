# FieldStruts Findings Ledger

**Single source of truth for every finding from both rounds.**

ID prefix scheme:
- `S` = Safety-critical (strut algorithm + data integrity)
- `X` = Security (XSS, auth)
- `R` = Race conditions / multi-device
- `A` = Accessibility
- `L` = Storage / lifecycle / state
- `N` = NIMS / ICS doctrine
- `U` = UX / field-use / gloves
- `O` = Operations workflow
- `P` = Performance
- `V` = Verified-via-interactive-test (Round 2 reproduced)

Status:
- 🔴 OPEN — not addressed
- 🟡 PLANNED-v3.5.2 — in safety hotfix
- 🟢 PLANNED-v3.6.0 — in minor release
- 🔵 PLANNED-v4.0.0 — in major release
- ⚪ DEFERRED — beyond v4
- ✅ FIXED — verified in current code

---

## 🚨 SAFETY-CRITICAL — Strut Algorithm

| ID | Severity | Status | Finding | File:Line | Fix Approach |
|---|---|---|---|---|---|
| S1 | CRITICAL | 🟡 v3.5.2 | Double-deduction in pending SP re-validation: passes `sp.effectiveLength` (already deducted) AND `sp.deductions` to `findStrutCombinations` | `app.js:2846-2847` | Pass `sp.requiredLength` instead; include deduction hash in cache key |
| S2 | CRITICAL | 🟡 v3.5.2 | ACME load table linear interpolation over-reports capacity by 16.9% at 11 ft (132") vs Paratech O&M Manual Table 2-7 cliff | `app.js:32-39` | Add 60", 84", 108", 132" rows from manual |
| S3 | CRITICAL | 🟡 v3.5.2 | ACME 4:1 column at 24" reports 21,750 lb; manual says 20,000 (8.75% over) | `app.js:32-39` | Replace value at 24" row |
| S-H1 | HIGH | 🟢 v3.6.0 | Wedge deduction omitted from strut-fit search; cut length omits plate heights — two different formulas | `app.js:125, 3342` | Define canonical `setLength` formula consistently |
| S-H2 | HIGH | 🟢 v3.6.0 | Capacity + margin never displayed unless margin < 0 — user can't distinguish 0.2% from 500% margin | `app.js:364` | Always display capacity; show margin always; "near max" warning at < 30% |
| S-H3 | HIGH | 🟢 v3.6.0 | RecommendedQty silently capped at 4 — load needing 5+ struts shows "no combinations" | `app.js:193` | Surface "exceeds 4-strut config" as a result type with warning |
| S-H4 | HIGH | 🟢 v3.6.0 | LS 1016 silently rejected at 193-198" range — capacity returns 0, all options dropped | `app.js:41-48, 101-107` | Show "physically fits but unrated" warning |
| S-H5 | HIGH | 🟢 v3.6.0 | `editShorePoint` doesn't recompute `effectiveLength` when deductions removed | `app.js:4096-4099` | Add else-branch setting effectiveLength = requiredLength |
| S-M1 | MEDIUM | 🟢 v3.6.0 | Strut cache key ignores deductions; SPs with same length+load but different deductions share cache entry | `app.js:2846` | Include deduction hash in cache key (fixes simultaneously with S1) |
| S-M2 | MEDIUM | 🔵 v4.0.0 | External extensions/plates not merged into operation inventory (only struts merge) | `app.js:2572-2589` | Generalize external-equipment merging |
| S-M3 | MEDIUM | 🟢 v3.6.0 | Inventory extension filter requires single record with ≥qty; split inventory across apparatus fails | `app.js:175-183` | Sum available across matching records |
| S-M4 | MEDIUM | 🟢 v3.6.0 | Empty system filter (all toggles off) shows ALL systems, not zero | `app.js:269-275, 141` | Disable all-off OR treat empty as none |
| S-M5 | MEDIUM | 🟢 v3.6.0 | Unknown strut models in inventory silently dropped (typo in XLSX import) | `app.js:136-138` | Log warning for unknown models |
| S-M6 | MEDIUM | 🟢 v3.6.0 | Deployed SPs don't carry capacity info — user can't verify capacity on deployed shore | `app.js:3221-3254` | Store capacity + totalCapacity on deploy |
| S-L1 | LOW | ⚪ Deferred | `extTotal > strut.extended` check is more restrictive than Paratech manual | `app.js:158` | Remove check or document rationale |
| S-L2 | LOW | ⚪ Deferred | AcmeThread capacity at <24" uses 24" table value (extrapolation) | `app.js:103` | Conservative; document |
| S-L3 | LOW | ⚪ Deferred | System label inconsistent: button says "Grey", result card says "GREY — LockStroke" | `index.html:156, app.js:308` | Unify labels |
| S-L4 | LOW | ⚪ Deferred | `capacityAll` array computed but never used | `app.js:196-200` | Remove |
| S-L5 | LOW | 🟢 v3.6.0 | No upper-bound warning when opening > max strut+ext reach (~265") | `app.js:1384` | Show "opening exceeds maximum reach" |
| S-L6 | LOW | 🟢 v3.6.0 | No lower-bound warning when opening < min collapsed (12") | (calc) | Show "opening too small" |

---

## 🔥 SAFETY-CRITICAL — Data Integrity / Persistence

| ID | Severity | Status | Finding | File:Line | Fix Approach |
|---|---|---|---|---|---|
| S4 | CRITICAL | 🟡 v3.5.2 | App-bricking: `JSON.parse(sessionStorage.orgCollapsed)` top-level unguarded — corrupt sessionStorage stops app.js load | `app.js:415` | Wrap in try/catch with fallback |
| S5 | CRITICAL | 🟡 v3.5.2 | `endOperation` online doesn't clear `fieldstruts_operation` localStorage — archived op resurrects as active on reload | `app.js:4221-4237` | Add `localStorage.removeItem` + optimistic local clear |
| S6 | CRITICAL | 🟡 v3.5.2 | Online-only persistence: `persistOperation` skips localStorage when online. Offline reload reads stale state | `app.js:487` + many call sites | Always write to localStorage; remove the early return |
| S7 | CRITICAL | 🟡 v3.5.2 | Firebase listener wipes local data on first-connect with empty Firebase response (e.g., deptId typo) | `app.js:993-999, 1037-1039` | First-fire guard: if snap empty AND local has data, push local to Firebase |
| S8 | CRITICAL | 🟡 v3.5.2 | `confirmAddApparatus` online branch does Firebase-only write; no local mutation; modal stays open silently | `app.js:1252-1274` | Add local push BEFORE firebaseSave |
| S9 | CRITICAL | 🟡 v3.5.2 | `endOperation` online branch same class of bug | `app.js:4218-4252` | Same pattern as S8 |
| L1 | CRITICAL | 🟢 v3.6.0 | `safeParse` corruption silently destroys data with no user notification | `app.js:557, 1068, 1076, 4793` | Detect corruption, alert user, attempt recovery |
| L2 | CRITICAL | 🟢 v3.6.0 | `safeSetItem` quota exceeded silently continues with in-memory state; reload reads pre-quota | `app.js:547-554` | Detect quota; flag persistent banner; offer cache trim |
| L3 | HIGH | 🟢 v3.6.0 | `pendingWrites` >24h silently dropped; offline >24h = data loss with only generic toast | `app.js:597` | Per-write notification on drop; export-to-clipboard recovery |
| L4 | HIGH | 🟢 v3.6.0 | `pendingWrites` URL paths carry old deptId after switch — replays write to wrong dept | `app.js:606, 4479-4490` | Clear or rewrite pending paths on `connectDepartment` |
| L5 | HIGH | 🟢 v3.6.0 | `archivedOperations` listener has no `limitTo` — unbounded growth in RAM | `app.js:1017` | Add `limitToLast(50)` or pagination |
| L6 | MEDIUM | 🟢 v3.6.0 | `fieldstruts_deptName` read at 1683 but never written; feedback submissions always null | `app.js:1683` | Write key on connect/save |
| L7 | MEDIUM | 🟢 v3.6.0 | When customApparatusTypes Firebase data is null, localStorage key not removed; stale types persist | `app.js:1059-1061` | Always remove on null |
| L8 | MEDIUM | 🟢 v3.6.0 | Device clock used for all timestamps — cross-device sort broken with clock drift | Many sites | Use Firebase `ServerValue.TIMESTAMP` where possible |
| L9 | MEDIUM | 🟢 v3.6.0 | ID generation collisions on `Date.now()`-only IDs (`type_<ts>`, `grp-<ts>`, `i<ts>`, `local-op-<ts>`) | `app.js:1175, 1808, 2505, 3004, 3170` | Add jitter `+ Math.random().toString(36).slice(2,6)` |
| L-M1 | MEDIUM | 🟢 v3.6.0 | `orgTouchClone` orphaned on `touchcancel` (no handler) | `app.js:2191` | Add touchcancel listener calling `cancelOrgMove` |
| L-M2 | MEDIUM | 🟢 v3.6.0 | `orgLongPressTimer` not cleared on touchcancel — phantom reparent mode after interrupted touch | `app.js:2161` | Same touchcancel listener |
| L-M3 | MEDIUM | 🟢 v3.6.0 | `controllerchange` reload skipped on Ops screen — user stuck on old SW after leaving Ops | `app.js:4840-4844` | Re-check on screen change |
| L-M4 | MEDIUM | 🟢 v3.6.0 | `pendingWrites` feedback entries use relative paths; same-ms collision risk | `app.js:1694` | Add jitter to feedback id |
| L-M5 | MEDIUM | 🟢 v3.6.0 | No cross-tab `storage` event listener — two tabs on same device drift offline | (absent) | Add storage listener; reconcile on activate |
| L-M6 | MEDIUM | 🟢 v3.6.0 | No `beforeunload` / `visibilitychange` — in-flight `firebaseSave` lost on page kill | (absent) | Add handlers; flush pending |
| L-L1 | LOW | ⚪ Deferred | `elapsed` can render negative if device clock moved backward | `app.js:3571` | Clamp at 0 |
| L-L2 | LOW | ⚪ Deferred | `elapsed` display doesn't auto-tick | `app.js:3571` | `setInterval` 60s |
| L-L3 | LOW | ⚪ Deferred | Sort fallback `\|\| 0` mixes ISO string and number | `app.js:3861-3863` | Use sentinel like `'9999-...'` |
| L-L4 | LOW | ⚪ Deferred | Toast `onclick` stays attached after auto-hide | `app.js:4826-4832` | Clear in setTimeout |
| L-L5 | LOW | ⚪ Deferred | `_originalParent` reference on plate grid (potential stale parent) | `app.js:4680, 4631` | Use closest('.modal-overlay') |
| L-L6 | LOW | ⚪ Deferred | sessionStorage not cleared on logout | `app.js:4479-4490` | Add `sessionStorage.clear()` to logOut |
| L-L7 | LOW | ⚪ Deferred | `laneCollapsedState`, `sectionCollapsedState` in-memory only — UX state resets every reload | `app.js:403, 3370` | Persist to sessionStorage |

---

## 🔒 SECURITY — XSS, Auth

| ID | Severity | Status | Finding | File:Line | Fix Approach |
|---|---|---|---|---|---|
| X1 | CRITICAL | 🟡 v3.5.2 | Drilldown labels rendered raw; `key.replace(/'/g, "\\'")` only escapes `'` — `"` breaks attribute, `<` breaks span content | `app.js:3543, 3547, 3548` | Use `escapeHtml(displayName)` for content; `data-` attributes + delegated listener for onclick |
| X2 | CRITICAL | 🟡 v3.5.2 | Inventory `item.model` rendered raw in 4 places; JSON import path performs no validation (no Firebase write required) | `app.js:1462, 1488, 4529-4530, 4536` | `escapeHtml(name)` at each site |
| X3 | HIGH | 🟡 v3.5.2 | `renderCommandLayout` onclick: `escapedName` only escapes `'` and `\` (in wrong order — double-escapes backslash); `"`, `>`, `<` unescaped | `app.js:3779-3784` | Same data-attribute pattern as X1 |
| X4 | HIGH | 🟡 v3.5.2 | `escapeHtml()` misused inside `value="..."`; `escapeHtml` doesn't escape `"` | `app.js:1286, 1371` | Use `escapeAttr()` instead |
| X5 | HIGH | 🟢 v3.6.0 | `aria-label="${escapeHtml(sp.label)}..."` — same issue, label with `"` breaks attribute | `app.js:2826, 2827` | Use `escapeAttr()` |
| X6 | HIGH | 🟢 v3.6.0 | `sp.deployedStrut.model` rendered raw (Firebase-write needed but trivial) at 3 sites | `app.js:2838, 2949, 3957` | `escapeHtml(sp.deployedStrut.model)` at each |
| X7 | HIGH | 🟢 v3.6.0 | `ext.model` (external equipment) rendered raw | `app.js:2699` | `escapeHtml(ext.model)` |
| X8 | MEDIUM | 🟢 v3.6.0 | `g.type` (apparatus group type) raw — Firebase-only exploit | `app.js:2654` | `escapeHtml(g.type)` |
| X9 | MEDIUM | 🟢 v3.6.0 | `showToast` regex auto-detects HTML — fragile; better to split into `showToast` + `showToastHTML` | `app.js:520-537` | Two-argument API |
| X10 | CRITICAL | 🔵 v4.0.0 | **No Firebase Auth** — anonymous read/write; config hardcoded in source visible via DevTools | `app.js:927-958` | Firebase Anonymous Auth + per-device UID + security rules |
| X11 | CRITICAL | 🔵 v4.0.0 | **No per-write attribution** — no `changedBy` / `deviceId` / serverTimestamp on writes | All firebaseSave sites | Decorate every write with `{by, agency, at: ServerValue.TIMESTAMP}` |
| X12 | LOW | 🔵 v4.0.0 | `validateInput` strips control chars only — doesn't escape HTML at storage time | `app.js:454-460` | Add `sanitizeForDisplay` helper |

---

## 🌐 RACE CONDITIONS / MULTI-DEVICE

| ID | Severity | Status | Finding | File:Line | Fix Approach |
|---|---|---|---|---|---|
| R1 | CRITICAL | 🟢 v3.6.0 | Stale-dept listeners never `.off()` — after dept switch, old listeners overwrite new-dept localStorage | `app.js:983-1064` | Track refs; `.off()` before re-attach |
| R2 | CRITICAL | 🟢 v3.6.0 | `activeOperation` full-reference replacement on every listener echo wipes in-flight form state | `app.js:1001-1015` | Optional version pinning + reload prompt; merge instead of replace |
| R3 | CRITICAL | 🟢 v3.6.0 | `orgSwapRoles` writes FULL `roles` map via `set` — concurrent role edits silently clobber | `app.js:2291` | `.update({path: value})` keyed by targetId |
| R4 | CRITICAL | 🟢 v3.6.0 | `orgReparentRole` / `saveCustomRoles` writes FULL `customRoles` array via `set` — concurrent reparents clobber | `app.js:687` | `.transaction()` on customRoles or keyed `.update()` |
| R5 | CRITICAL | 🟢 v3.6.0 | Excel import `set` on `/inventory` root — concurrent qty changes wiped or create phantom rows | `app.js:4462-4470` | Per-item `.update({})` |
| R6 | CRITICAL | 🟢 v3.6.0 | `pendingWrites` + Firebase SDK double-write on reconnect — same write can land twice | `app.js:560-632` | Either trust Firebase SDK offline OR add idempotency keys |
| R7 | HIGH | 🟢 v3.6.0 | `updateShoreStatus` per-member loop is non-atomic — partial commits on network drop mid-loop | `app.js:3322-3362` | Multi-path `update({...})` for atomic group transition |
| R8 | HIGH | 🟢 v3.6.0 | `endOperation` mixes transaction increment with `set inventory.available = quantity` — races with concurrent deploys | `app.js:4218-4252` | Block new deploys via sentinel; complete returns first |
| R9 | HIGH | 🟢 v3.6.0 | `removeApparatus` cascade is 4+ separate writes — partial commits leave orphan inventory + dangling refs | `app.js:1315-1339` | Atomic multi-path `update({})` |
| R10 | HIGH | 🟢 v3.6.0 | `deployShorePoint` writes SP then decrements inventory — partial drop creates phantom inventory | `app.js:3256-3287` | Inside transaction handler, abort if available would go negative |
| R11 | HIGH | 🟢 v3.6.0 | `sendToRunner` cut-table buttons lack `guardClick` — double-tap fires `update` twice (mostly idempotent but cutMarkedDone races) | `app.js:3920-3932` | Wrap with `guardClick` |
| R12 | HIGH | 🟢 v3.6.0 | `confirmEditShorePoint` clobbers concurrent status/inventory updates via field-level update | `app.js:4080-4115` | Block edits on `cutting`/`runner` status; or version-stamp + reload prompt |
| R13 | HIGH | 🟢 v3.6.0 | Listener first-fire vs cached-op deploy — stale inventory IDs become phantom entries | `app.js:993, 4793` | Block deploys until first echo (loading state) |
| R14 | MEDIUM | 🟢 v3.6.0 | `editingShorePointId` not cleared on backdrop modal close — wrong-SP save possible | `app.js:404, 4080` | Clear all editing IDs in `closeModal` |
| R15 | MEDIUM | 🟢 v3.6.0 | `toggleApparatusAssignment` uses `set` on full array — concurrent assignments race | `app.js:1740-1756` | Store as keyed map `{id: true}` |
| R16 | MEDIUM | 🟢 v3.6.0 | `returnEquipmentSingle` SP-then-inventory order — network drop between leaves orphaned state | `app.js:4185-4216` | Reverse order; atomic update |
| R17 | MEDIUM | 🟢 v3.6.0 | Two devices `startOp` simultaneously — `ops[0]` arbitrary winner | `app.js:1001-1015` | Enforce single active op via Firebase rule |
| R18 | MEDIUM | 🟢 v3.6.0 | `removeIndividual` cascade is 3 separate writes | `app.js:2528-2530` | Atomic multi-path |
| R19 | MEDIUM | 🟢 v3.6.0 | `customApparatusTypes` set race — same as R3 pattern | `app.js:1165` | Keyed map |
| R20 | MEDIUM | 🟢 v3.6.0 | `initCustomRoles` writes default tree reflexively — every device hitting Command first writes 13 roles | `app.js:678-680` | Transaction: only write if undefined |
| R21 | LOW | ⚪ Deferred | `flushPendingWrites` path reconstruction via string surgery | `app.js:606` | Store relative paths at queue time |
| R22 | LOW | ⚪ Deferred | `connRef` global flush replays writes from previous dept after switch | `app.js:943-958` | Clear on dept switch |

---

## ♿ ACCESSIBILITY

| ID | Severity | Status | Finding | File:Line | Fix Approach |
|---|---|---|---|---|---|
| A1 | CRITICAL | 🟢 v3.6.0 | 40+ `<div onclick>`/`<span onclick>` patterns lacking role/keyboard support (org chart, drilldown, role grid, lane headers, plate picker, chips) | many | Replace with `<button>`; add keyboard handlers |
| A2 | CRITICAL | 🟡 v3.5.2 | Cutting badge `#F57F17` on `#FFF176` = 2.9:1 (fails 4.5:1); Runner `#E65100` on `#FFCC80` = 3.2:1 | `style.css:593-596` | Darken cutting/runner text vars |
| A3 | CRITICAL | 🟢 v3.6.0 | Dark mode blue-on-blue-light combos (chips, role-badge, qty-btn) = 3.1:1 | `style.css [data-theme="dark"]` | Lighten `--blue` or darken `--blue-light` in dark mode |
| A4 | CRITICAL | 🟢 v3.6.0 | No status change announcer — SP status transitions silent to screen readers | `app.js renderOperations` | Add `aria-live="polite"` announcer; populate on every status change |
| A5 | CRITICAL | 🟢 v3.6.0 | Org chart drag has zero keyboard alternative | `app.js:3705-3716` | Make nodes `<button>`; Enter/Space picks; Arrow nav; Escape cancels |
| A6 | HIGH | 🟢 v3.6.0 | No modal focus trap — Tab from last element exits modal | `app.js:1641-1657` | Tab key handler wraps focus |
| A7 | HIGH | 🟢 v3.6.0 | Background content not `inert` when modal open | `index.html` modal markup | Add `inert` attribute on `#mainApp > *` |
| A8 | HIGH | 🟢 v3.6.0 | Quick view panel: no role/aria-modal, no focus management, Escape doesn't close | `app.js:4495, index.html:43` | Add `role="dialog" aria-modal="true"`; focus management |
| A9 | HIGH | 🟢 v3.6.0 | Dynamically created modals (createGroup, addRole, reparent) don't use openModal — no focus management | `app.js:804, 902, 1795` | Wrap through openModal/closeModal |
| A10 | HIGH | 🟢 v3.6.0 | Plate picker is `<div>` not listbox; no keyboard arrow nav | `app.js:4615, 4639` | role="listbox", role="option", arrow keys |
| A11 | HIGH | 🟢 v3.6.0 | Form labels mostly not `for=`-linked | `index.html` many forms | Add `for=` / `id=` linkage |
| A12 | HIGH | 🟢 v3.6.0 | Form errors via `alert()` not associated with inputs (`aria-invalid`/`aria-describedby`) | 19 alert() sites in app.js | Inline error UI |
| A13 | HIGH | 🟢 v3.6.0 | Drilldown items not focusable (primary nav path broken for keyboard) | `app.js:3537-3551` | `<button>` instead of `<div>` |
| A14 | HIGH | 🟢 v3.6.0 | Lane headers, section toggles lack `tabindex`/keydown handlers despite `role="button"` | `app.js:2783, index.html:214` | Add tabindex=0 and keydown |
| A15 | HIGH | 🟢 v3.6.0 | View switcher buttons 36-40px (< 44px) | `style.css:669` | Increase padding |
| A16 | HIGH | 🟢 v3.6.0 | Inventory quickview close (×) under 44px | `style.css:875` | min-width/height 44px |
| A17 | HIGH | 🟢 v3.6.0 | Required fields not marked (no `required`, no `*`, no `aria-required`) | many forms | Add markers |
| A18 | MEDIUM | 🟢 v3.6.0 | Touch target spacing < 8px between adjacent action buttons | `style.css:1299, 669` | gap: 8px |
| A19 | MEDIUM | 🟢 v3.6.0 | App-chip X button overlaps with chip body — destructive action with no confirm | `app.js:2678` | Confirm or long-press required |
| A20 | MEDIUM | 🟢 v3.6.0 | `prefers-reduced-motion` handled but toast auto-dismiss has no pause control | `app.js:520-537` | Snackbar with close button for action toasts |
| A21 | MEDIUM | 🔵 v4.0.0 | All sizes in `px`; browser font-size zoom doesn't affect text | many | Convert typography to `rem` |
| A22 | MEDIUM | 🟢 v3.6.0 | Status dots are color-only; no shape/icon variation | `style.css:649-656, app.js renderStatusPills` | Add icons or shapes |
| A23 | MEDIUM | 🟢 v3.6.0 | Form labels lack `autocomplete`/`autocapitalize` hints | `index.html` op name, apparatus name | Add hints |
| A24 | LOW | ⚪ Deferred | 10-12px text in many places (.version-label, .input-hint, .org-collapse-btn) | `style.css` various | Bump to 12px minimum |
| A25 | LOW | ⚪ Deferred | `title` attribute for accessibility (span-warning ⚠) doesn't work on touch | `app.js:3694` | Add `aria-label` |
| A26 | LOW | ⚪ Deferred | View switcher tablist lacks arrow-key navigation | `app.js:3386-3398` | Add roving tabindex pattern |

---

## ⚙️ NIMS / ICS DOCTRINE

| ID | Severity | Status | Finding | File:Line | Fix Approach |
|---|---|---|---|---|---|
| N1 | CRITICAL | 🔵 v4.0.0 | Missing General Staff (PSC, LSC, FSC) and Command Staff (PIO, LNO) in default ICS roles | `app.js:657-667` | Add to defaults; offer Type III / I-II presets |
| N2 | CRITICAL | 🔵 v4.0.0 | "Group" field on SPs is doctrinally wrong — Group in NIMS is functional command unit, not a resource | `app.js:3116, 1370` | Rename to `assignedResource`; add separate optional `nimsGroup` |
| N3 | CRITICAL | 🔵 v4.0.0 | No operational period concept — ICS-202/203/204 are all per-period | (absent) | Add `operationalPeriods[]` schema; snapshot at boundary |
| N4 | CRITICAL | 🔵 v4.0.0 | No after-action / ICS form export (ICS-201, 203, 204, 211, 215) | `app.js:4218-4252, 2932` | `exportOperationReport()` generating ZIP of forms |
| N5 | CRITICAL | 🔵 v4.0.0 | No apparatus agency/home-department tag — multi-agency response unreadable | `app.js` apparatus schema | Add `agency` field; color-code badges |
| N6 | CRITICAL | 🔵 v4.0.0 | No Unified Command support — single `ic` role hardcoded | `app.js:657-667, 728` | Allow multiple IC role holders with agency tags |
| N7 | HIGH | 🔵 v4.0.0 | `canReparent()` gives Safety org-edit authority — doctrinally wrong (that's Planning's role) | `app.js:728-731` | Move to IC + PSC |
| N8 | HIGH | 🔵 v4.0.0 | Reparenting allows non-NIMS structures (Branch under Group, Command Staff under General Staff, etc.) | `app.js:733-758` | Add doctrinal hierarchy enforcement |
| N9 | HIGH | 🟢 v3.6.0 | Span warning threshold > 7 only; NIMS optimal 5, max 7, wasteful < 3 | `app.js:3693-3694` | Three-tier: yellow at 6-7, red at 8+, info at <3 |
| N10 | HIGH | 🔵 v4.0.0 | Headcount counts apparatus not personnel — PAR impossible | `app.js:3724-3727` | Add `crewSize` field; PAR dashboard |
| N11 | HIGH | 🔵 v4.0.0 | Apparatus check-in / demob has no timestamps — ICS-211 cannot be generated | `app.js:1740-1760, assignedApparatus` schema | Convert to object array `{id, arrivedAt, demobedAt}` |
| N12 | HIGH | 🔵 v4.0.0 | No role-history — assignments overwrite, after-action loss | `app.js:733, 2291, 1888` | Append to `roleHistory[]` on every mutation |
| N13 | HIGH | 🔵 v4.0.0 | Default "Initial Shoring", "Cutting Table", "Runner", "Wood Shoring" are not NIMS positions | `app.js:657-667` | Rename to NIMS-correct or move to subgroups |
| N14 | MEDIUM | 🔵 v4.0.0 | Strike Team / Task Force defined in UI but no leader field, no kind validation | `app.js:1781-1820` | Add `leaderId`; validate ST same-kind, TF mixed |
| N15 | MEDIUM | 🔵 v4.0.0 | Resource Typing (NIMS Type I-V) absent | `app.js` apparatus | Add `type` field separate from `kind` |
| N16 | MEDIUM | 🔵 v4.0.0 | No deputy/assistant slots (ASOs, JIC PIOs) | `app.js roles schema` | Allow multiple per role with `role: 'lead'\|'deputy'\|'assistant'` |
| N17 | MEDIUM | 🔵 v4.0.0 | Demobilization is single-step — no per-resource release plan | `app.js:4218-4252` | Multi-step demob phase |

---

## 🛡️ SAFETY OFFICER NEEDS

| ID | Severity | Status | Finding | File:Line | Fix Approach |
|---|---|---|---|---|---|
| D1 | CRITICAL | 🔵 v4.0.0 | No PAR mechanism — "12/25 resources" counts apparatus not bodies | `app.js:3723-3727` | Add `crewSize` + `crew[]` to apparatus; PAR tile |
| D2 | CRITICAL | 🟢 v3.6.0 | No emergency / stop-work / mayday button anywhere | (absent) | Persistent red FAB visible to IC/Safety; broadcasts via Firebase |
| D3 | CRITICAL | 🟢 v3.6.0 | No hazard log — secondary collapse, HazMat, heat, confined-space cannot be recorded | (absent) | `/operations/{opId}/hazards[]` schema; red banner on area cards |
| D4 | HIGH | 🟢 v3.6.0 | Strut Placed visually equivalent to Secured (color only) — fall hazard | `style.css:577-596` | Hatched diagonal pattern or ⚠ UNSECURED overlay |
| D5 | HIGH | 🟢 v3.6.0 | No stale shore point indicator (pending > 2h, cutting > 1h, runner > 30min) | `app.js:2820-2895, 3856` | Compute age on render; red ring + label |
| D6 | MEDIUM | 🟢 v3.6.0 | Safety role default view = same as IC — no dedicated Safety dashboard | `app.js:659, 2076-2078` | Build `'safety'` view route: PAR, Hazards, Stale SPs, etc. |

---

## 👨‍🚒 FIELD USE / GLOVES / RECOVERY

| ID | Severity | Status | Finding | File:Line | Fix Approach |
|---|---|---|---|---|---|
| U1 | CRITICAL | 🟡 v3.5.2 | F2: Section-button "Assign Apparatus" silent fail (collapsed by default) — only this button, not all 4 as Round 1 claimed | `app.js:1722-1738, 3370` | Auto-expand section before render |
| U2 | CRITICAL | 🟢 v3.6.0 | No undo on Send to Runner / status transitions / Deploy — single tap = data change | many | Add undo toasts using existing `undoReparent` pattern |
| U3 | CRITICAL | 🟢 v3.6.0 | 10 native `confirm()` dialogs — tiny OK/Cancel, hard with gloves | `app.js:821, 867, 878, 1201, 1318, 2452, 2962, 4119, 4219, 4480` | Custom confirm sheet, 56px buttons, color-coded |
| U4 | CRITICAL | 🟢 v3.6.0 | No `visibilitychange`/`pageshow` handler — dropped phone loses form draft | `app.js:4744-4767` | Persist draft to localStorage on input; resume toast on init |
| U5 | HIGH | 🟢 v3.6.0 | Long-press for reparent triggers on water droplet (continuous touch) | `app.js:2163-2174` | Require >8px movement OR two-finger trigger |
| U6 | HIGH | 🟢 v3.6.0 | Status badges 14px, color-only differentiation (Cutting yellow / Runner orange visually similar) | `style.css:582-596` | Bump to 16px; add leading glyph per status |
| U7 | HIGH | 🟢 v3.6.0 | Quick Find can't deploy — must re-enter measurement in Operations (~8 extra taps) | `app.js:277-295` | "Deploy this" button on result card when activeOperation set |
| U8 | HIGH | 🟢 v3.6.0 | Cut table actual-cut input disappears when status flips to "done" — sendToRunner reads gone element | `app.js:3920-3931, 3968` | Keep input visible in done state |
| U9 | HIGH | 🟢 v3.6.0 | Measurement entry is 3 fields (feet, inches, fraction) — slow with gloves, 6+ taps per measurement | `index.html:398-428, app.js:1378` | Single text input parsing `7'4-1/2"`, `7 4 1/2`, `88.5` |
| U10 | MEDIUM | 🟢 v3.6.0 | No "yours" lane to find shore points YOU just created | `app.js renderOperations` | Track `_lastDeployedSpId` per session; "Recent (you)" lane |
| U11 | MEDIUM | 🟢 v3.6.0 | No notes/hazard field on shore point (dictation possible if textarea exists) | `index.html:362-491` | Add `<textarea id="spNotes">` |
| U12 | MEDIUM | 🟢 v3.6.0 | Deduction toggle preference saved for QuickFind but not applied to Shore Point modal | `app.js:4807-4809` | Apply same pref to `#spDeductionToggle` |
| U13 | LOW | ⚪ Deferred | Lane arrow icons at 10px | `style.css:604` | Bump to 12px |
| U14 | LOW | ⚪ Deferred | Lane header `cursor: default` | `style.css:603` | `cursor: pointer` |

---

## 🏃 RUNNER WORKFLOW

| ID | Severity | Status | Finding | File:Line | Fix Approach |
|---|---|---|---|---|---|
| O1 | CRITICAL | 🟡 v3.5.2 (basic) / 🟢 v3.6.0 (full) | No runner identity — "Runner" status is just a flag; no `runnerId`/`runnerName`/`ETA`; can't recall | `app.js:3964-3994` | Prompt for runner name (basic in v3.5.2 via prompt(); full custom UI v3.6.0); track identity + timestamp |
| O2 | HIGH | 🟢 v3.6.0 | Entry team has no "cut in transit" cue — status flips silently | `app.js:2880-2884` | Toast on render delta; or "Incoming Cuts" panel |
| O3 | HIGH | 🟢 v3.6.0 | Grouped SPs render as SEPARATE cards on cut table (T-post pair = 2 cards) — scrap risk | `app.js:3856-3888` | Dedupe by groupId; one card per group |
| O4 | HIGH | 🟢 v3.6.0 | Cut table sort is age-only — Floor 10 emergency sits behind Floor 2 routine from 45 min ago | `app.js:3858-3864` | Section by Floor/Division; priority pin |
| O5 | MEDIUM | 🟢 v3.6.0 | Backward transitions don't release equipment — Cutting → strutplaced doesn't return strut to inventory | `app.js:3322-3356` | Prompt on backward; call returnInventoryItems |
| O6 | MEDIUM | 🟢 v3.6.0 | `cuttingStartedAt` clobbered on re-entry; cut history lost | `app.js:3339-3344` | Preserve original timestamp; track attempts |
| O7 | MEDIUM | 🟢 v3.6.0 | Pending SPs have no "needed model" tag — no aggregate "what we're waiting on" | `app.js:2842-2854, 3105` | Add `neededModel`; "Pending Needs" rollup |
| O8 | MEDIUM | 🟢 v3.6.0 | `cutMarkedDone` is a hidden middle state — invisible to entry team | `app.js:3977, 4009-4013` | Expose as real status or cross-side toast |

---

## 👁️ VISIBILITY / INFO DENSITY

| ID | Severity | Status | Finding | File:Line | Fix Approach |
|---|---|---|---|---|---|
| V1-int | HIGH | 🟢 v3.6.0 | Orphan reference: SP referencing deleted apparatus shows raw `app-99` ID with no fallback | `app.js getGroupDisplayName, renderOperations` | Display "Unknown apparatus" instead of raw ID |
| V2 | HIGH | 🟢 v3.6.0 | No "what changed in last 15 min" feed for IC | (absent) | Activity feed on Command page (last 20 events) |
| V3 | HIGH | 🟢 v3.6.0 | Command Layout only shows top hierarchy level — Floor 5 requires drilldown (3 taps) | `app.js:3765-3789` | Expandable Layout or "Critical Floors" widget |
| V4 | MEDIUM | 🟢 v3.6.0 | Drilldown card list has no status filter at deepest level | `app.js:2762` | Chip filter row: All/Pending/Cutting/Runner/etc. |
| V5 | MEDIUM | 🟢 v3.6.0 | Command page leads with status pills, buries org chart and layout — fails 5-second test | `app.js renderCommandView order` | Reorder: action summary first, filtered org chart, then layout |
| V6 | MEDIUM | 🟢 v3.6.0 | After-action: archived op renders shore points only — no role history, no apparatus log | `app.js:2932` | (see N4) |

---

## ⚡ PERFORMANCE

| ID | Severity | Status | Finding | File:Line | Fix Approach |
|---|---|---|---|---|---|
| P1 | MEDIUM | 🟢 v3.6.0 | `localApparatus.find()` O(n) inside O(m) render loops — 20,000 lookups at 200 SPs × 100 apparatus | `app.js:2662, 2671-2678, 3624, 4520` | Build `Map<id, apparatus>` once per render |
| P2 | LOW | ⚪ Deferred | DOM string concat in tight loops — noticeable at 1000+ SPs | `app.js:2774-2895` | DocumentFragment or array.join('') |
| P3 | ✅ FIXED | — | Stress test at 200 SPs measured 10.3ms full render — acceptable | (measured Round 2) | — |

---

## Summary roll-up by status

| Status | Count |
|---|---|
| 🟡 PLANNED-v3.5.2 (safety hotfix) | 14 (S1-S9, X1-X4, A2, U1) |
| 🟢 PLANNED-v3.6.0 (minor) | 60+ |
| 🔵 PLANNED-v4.0.0 (major) | 15+ (mostly NIMS doctrine + multi-agency + Auth) |
| ⚪ DEFERRED beyond v4 | 10+ (polish, low-impact) |
| ✅ FIXED | 1 (P3, observation that perf is acceptable) |

**Total findings tracked: ~100**

---

## Strategic audit closures — misty-journal.md STOP-SHIP findings

The strategic roadmap (`.claude/plans/v4.0-to-v5.0-roadmap.md`) flagged five STOP-SHIP findings (C1–C5) from the 19-reviewer audit team. Status of the two that overlap with the algorithm work in this ledger:

| ID | Original concern | Status | Verified |
|----|------------------|--------|----------|
| C1 | Linear interpolation in `getLoadCapacity()` over-reports capacity at intermediate lengths (Euler 1/L² concavity) | ✅ CLOSED in v3.7.2 — interpolation replaced with conservative floor (returns the longer/lower-capacity row). | `app.js:143-164` + header comment `app.js:46-50`. Audit script ran 21 probes (10 adjacent-row midpoints + 11 exact-row matches) against ACME_LOAD_TABLE — all pass, none over-report. |
| C3 | LockStroke extension compatibility treated per-system; Paratech tubes differ per-strut (LK 19-25 vs LK 55-89) | ✅ CLOSED — per-strut `LOCKSTROKE_EXTENSIONS` map in place; `findStrutCombinations` keys off `strut.id` first, falls back to `EXTENSIONS[system]` only for non-LockStroke. | `app.js:31-39` (map) + `app.js:198-200` (lookup). |

C2 (Firebase rules), C4 (E&O insurance), C5 (offline conflict resolution) remain open and are scoped to v4.0.0 / Pre-Phase 0.

---

## Cross-references

- Audit details: `v3.5.1-deep-audit-round2.md` (Round 2 verified findings) and `v3.5.1-comprehensive-audit.md` (Round 1, with caveats listed in Round 2's "Headline corrections")
- Implementation: `MASTER-PLAN.md` (comprehensive multi-release plan)
- Interactive evidence: `interactive-findings.md`
- v3.5.2 hotfix specifics: `v3.5.2-safety-hotfix.md`
- Strategic roadmap (C1–C5 source): `v4.0-to-v5.0-roadmap.md`
