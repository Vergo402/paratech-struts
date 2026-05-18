# v3.11.2 Audit — SUMMARY

**Audit date:** 2026-05-18
**Target:** https://vergo402.github.io/paratech-struts/ (v3.11.2, commit `dbfbc8b`)
**Team:** 7 agents — code-auditor / SME / devops-resilience / mobile-ux / qa-driver / nims-compliance / battalion-chief
**Mode:** Read-only on source, no Firebase data writes, local-only mode in browser sessions
**Plus:** 1 in-app feedback item processed → [issue #90](https://github.com/Vergo402/paratech-struts/issues/90)

---

## Headline numbers

| Severity | Count (deduplicated) |
|---|---|
| **Critical** | 3 |
| **High** | 11 |
| **Medium** | 11 |
| **Low / Informational** | 8 |
| **Verified-Fixed** (this audit) | 12 |
| **Still-Open** (prior ledger items reproduced) | 14 |

Total findings across 7 reports (pre-dedup): 42. After cross-role consolidation: **33 unique** + 12 verified-fixed.

**Bottom line:** All 7 v3.11.2 release-blocker hotfixes (IP-007/010/011/033/034/047/048) verified working in code + live UI. The patch is safe to operate at Type IV–V scale. But 3 Critical XSS / IC-trust issues plus 8 High items remain — most are **STILL-OPEN** carry-overs that have been on the ledger since v3.6.0 and were not addressed in the v3.8–v3.11 train. v3.11.3 patch is recommended for the 3 release-blocker-class items; the rest reshape v3.12.0 + v4.0.0 scope.

---

## Critical findings (full callouts)

### V3.11.2-SUM-C1 — Stored XSS via `aria-label` attribute breakout (Role 1)
**Source:** R1-01 — `app.js:3722-3723`. Maps to prior **X5** (ledger v3.6.0 — never shipped).
**Finding:** `<button aria-label="Edit ${escapeHtml(sp.label) || 'Shore Point'}">` — `escapeHtml()` returns `textContent`-encoded text that escapes `<>&` but **not `"` or `'`**. `sp.label` is peer-writable via Firebase (rule validates only `isString() && length <= 200`). A peer-written label containing `"` breaks out of the attribute and injects an event handler. Both edit and delete buttons affected.
**Fix:** Replace `escapeHtml(sp.label)` with `escapeAttr(sp.label)` at both interpolations. Pure attribute-context substitution. 30 minutes.
**Release target:** v3.11.3.

### V3.11.2-SUM-C2 — `showToast` HTML auto-detect XSS via user-controlled fields (Role 1)
**Source:** R1-02 — `app.js:3199`, `app.js:2091`, `app.js:2141`. Maps to prior **X9**.
**Finding:** `showToast()` at `app.js:901` uses regex `/<[a-z][\s\S]*>/i` to decide `innerHTML` vs `textContent`. Three call sites pass user-controlled fields un-escaped:
- L3199: `getRoleAbbr()` returns `customRoles[].abbr` (peer-writable, 6-char limit — `<a x>` or `<svg>` fits).
- L2091, L2141: Apparatus-name conflict list. `localApparatus[].name` is 100-char peer-writable. `<img src=x onerror=alert(1)>` triggers the regex → runs as HTML.
**Fix:** Either (a) escape interpolated user fields before passing to `showToast`, OR (b) refactor into `showToast(text)` (always `textContent`) + `showToastHTML(html)` for the one legit caller (undo-link toast L1376). Option (b) is structural and correct.
**Release target:** v3.11.3.

### V3.11.2-SUM-C3 — Role assignment is write-once with no history (Role 7)
**Source:** R7-01 — `app.js:2934` (`assignOrgChartRole`). Maps to v4.0.0 Phase 3C.5.
**Finding:** `activeOperation.roles[targetId] = roleId` overwrites without recording prior holder, timestamp, or attribution. Surfside TTX-2 confirmed 100% reproduction across 5 IC transfers + 6 OSC rotations. Doc UL had to maintain a parallel Google Sheet to reconstruct command history. App fails its core accountability function for any incident with command transfer.
**Fix:** Restructure `roles` from `{targetId: roleId}` keyed map to `{targetId: [{roleId, assignedAt, assignedBy, releasedAt}]}` history array. Big change — v4.0.0 scope.
**Release target:** v4.0.0 (correctly tracked).

---

## High findings (table)

| ID | Source | Severity | Status | Finding | File:Line | Maps to |
|---|---|---|---|---|---|---|
| SUM-H1 | R1-03 | High | STILL-OPEN | Deploy transactions create phantom inventory nodes — no `makeDeployDecrementer` symmetry (return path has guard since v3.5.2; deploy path doesn't) | `app.js:4175,4177,4180,4183,4458-4466` | half-of-NEW-7 |
| SUM-H2 | R1-04 | High | **REGRESSION** | Cut-table render dropped `Number(e.length)` coercion — F-1C-19 fixed 2/3 sites in v3.9.0, missed L5130 | `app.js:5130,5112` | F-1C-19 partial |
| SUM-H3 | R1-05 | High | STILL-OPEN | Unvalidated peer-writable fields rendered raw (`cutLength`, `actualCutLength`, `headerSize`, `footerSize`) | `app.js:3766-5173` | X (no prior ID) |
| SUM-H4 | R1-06 | High | STILL-OPEN | `saveCustomRoles` still uses root `set()` — concurrent overwrite risk | `app.js:1273` | R4 (v4.0 planned) |
| SUM-H5 | R3-01 | High | **REGRESSION** | `disableFirebaseWrites` kill-switch bypassed by `flushPendingWrites()` — the exact class v3.10.1 was meant to prevent | `app.js:1131-1202` | F-1B-08 partial |
| SUM-H6 | R3-02 | High | NEW | Feedback photos can silently fail the 500 KB validate rule — no client check after `toDataURL`, success `alert()` fires before async write resolves | `app.js:2538-2568,2596-2600` | — |
| SUM-H7 | R4-01 | High | NEW | `.select-compact` fraction selector renders at 37px (needs 44px for gloves) — Quick Find + Add SP modal | `style.css .select-compact` | U-series |
| SUM-H8 | R4-02 | High | NEW | `--text-hint` fails WCAG AA in both themes (4.41:1 light / 4.05:1 dark) — affects status pills, drilldown chevrons | `style.css :root + dark` | A2 extension |
| SUM-H9 | R5-01 | High | NEW | `deployPendingShorePoint` null-`operationsRef` crash — guard asymmetry between `app.js:4241` (`db && operationsRef`) and 4245 (no `operationsRef` check). Same pattern at L5328, 2378, 2490, 2660 | `app.js:4241,4245,5328,2378,2490,2660` | — |
| SUM-H10 | R7-02 | High | STILL-OPEN | No ICS-201 / SitStat surface for command transfer — incoming IC gets the same Operations tab as everyone else | architectural | IP-037 / IP-061 |
| SUM-H11 | R6-01 + R7-03 + R6-06 | High | STILL-OPEN | Operations tab overload: SP `group` field stores apparatus IDs (NIMS terminology violation), no op-period boundary, no stop-work / hazard log | `app.js:2207-2223,895,1973-1980` + `index.html:394` | N2 / N3 / D2 / D3 |

---

## Medium findings (rolled up by theme)

**Documentation & spec drift (4):**
- R2-01 + R4-03 + R6-08 (**consolidated**): Liability disclaimer absent from rated result cards. v3.7.2 release notes claim it shipped; only present on unrated-zone modal. Three independent observations from SME, mobile-UX, NIMS.
- R2-02: v3.10.0 LockStroke smoke test cites stale line anchors (`app.js:31-39` should be `34-39`, `198-201` should be `206-208`).
- R2-03: `findings-ledger.md` S-H1 entry could mislead a future auditor — current text says "cut length omits plate heights" without noting it is intentional doctrine.
- R5-02: IP-007 implementation diverges from MASTER-PLAN wording. What shipped = `pendingReason` whitelist + Save-as-Pending button (no-inventory branch only). Master plan said "Save Changes visible in Add path on first open." Partial coverage of the TTX-2 bypass cause.

**Resilience & infra (3):**
- R3-03: GitHub Pages serves `sw.js` with `cache-control: max-age=600` via Fastly. Combined with 30-min `reg.update()` cadence, worst-case hotfix delivery is ~40 minutes, not "push and done."
- R3-04: `manifest.json` has only one 192×192 icon — missing 512×512 for Android install/splash.
- R3-05: `registerMember()` writes `members/{uid}=true` without checking `disableFirebaseWrites` — same regression class as SUM-H5.

**Code & UX (4):**
- R1 Mediums: active-ops listener missing first-fire guard; Excel import still root-`set` (mitigated by v3.10.1 backup); `custom_`/`type_` ID jitter; pendingWrites dept-switch leak.
- R4-06: 33 form inputs lack programmatic labels (placeholder-only). `#qfFeet`, `#qfInches`, `#qfFraction`, `#inputLoad` representative.
- R7-04: Offline banner doesn't surface pending-write count — IC sees "Offline — will sync" but not how many writes are queued.
- R7-05: `endOperation()` is one native `confirm()` away from destroying work. v3.10.1 backup safety net is solid; UI gate is still 44px from disaster.

---

## Low / informational findings

- R1 Lows: archivedOps unbounded; no CSP; feedback path collision risk.
- R4-05: FAB icon contrast in dark mode 2.65:1 (needs 3:1 for non-text UI). Aria-label present so SR access intact.
- R4-07: `.inv-qv-overlay` scrim has `onclick` but no `role`/`tabindex` — keyboard users dismiss via × button.
- R5-03: Unrated-zone modal uses two-button forced choice instead of spec's "checkbox + disclaimer" — functionally equivalent.
- R5-04: Apparatus canonical-form gap — "E1" (no space) doesn't collide with "Engine 1" because head-word abbreviation expansion only fires when a space delimits the head.
- R6-04: Span-of-control warning is single-threshold (>7) only. 6–7 yellow tier was planned v3.6.0, never shipped.
- R3-06: Offline-queued feedback writes lose `appVersion` tag.

---

## Cross-cutting themes

1. **Triple-corroborated: liability disclaimer missing from rated results.** SME, mobile-UX, and NIMS independently raised this. The v3.7.2 release notes claim a planning-aid disclaimer ships on all strut-result cards. Code search confirms the only disclaimer text is inside `confirmUnratedDeploy()` (LongShore > 16 ft). Either restore the rated-card disclaimer or correct the changelog. Operationally low-risk; doctrinally important for a USAR/FEMA-positioned tool.

2. **Attribute-context vs. element-context escaping (2 Criticals).** `escapeHtml()` returns `textContent`-encoded HTML safe for innerHTML element content; it does NOT escape `"` or `'`. The v3.9.0 hardening pass added `escapeAttr()` in some attribute interpolations but missed `aria-label` (R1-01) and toast HTML-auto-detect paths (R1-02). Pattern: every `${...}` inside `attr="..."` needs `escapeAttr`, not `escapeHtml`. A repo-wide grep + manual review is warranted.

3. **`disableFirebaseWrites` kill-switch is incomplete (2 regressions).** v3.10.1 introduced this guard in response to the hfd217 inventory wipe. It's honored in `firebaseSave`/`maybeBackup`/`backupBeforeDestructiveWrite`/`pruneOldBackups` but bypassed by `flushPendingWrites()` (R3-01) and `registerMember()` (R3-05). A reconnect after a session with the flag set will flush stale localStorage queue against production. The exact regression class the flag was meant to prevent.

4. **Operations tab is overloaded (1 feedback + 3 audit roles agree).** In-app feedback issue [#90](https://github.com/Vergo402/paratech-struts/issues/90) (dept hfd217) plus Role 6 (NIMS terminology) + Role 7 (BC command-transfer surface) + Role 4 (modal stacking) all point at the same problem. v3.12.0 Command tab separation is the right structural fix (plan drafted at `.claude/plans/v3.12.0-feedback-command-tab.md`).

5. **Deploy-vs-return transaction asymmetry.** v3.5.2 fixed phantom-item creation on the return path. The deploy path (and the post-deploy `assignEquipmentToPending` parallel) never got the same `makeDecrementer` guard. Inventory tree corruption is reachable today via stale Excel imports or peer-deleted items mid-deploy.

---

## Regression check — v3.11.2 release-blocker hotfixes

| ID | Description | Verdict | Notes |
|---|---|---|---|
| **IP-007** | Save Changes visibility / Pending state | PASS w/ caveat | `pendingReason` whitelist + Save-as-Pending button shipped. Master-plan wording diverges (SUM-Med "spec drift"). Functionally sound — TF leaders can create SPs in no-inventory branch. |
| **IP-010** | `guardClick` visible feedback | PASS | Disabled state + toast "Working — please wait" verified live. |
| **IP-011** | `estimatedLoad` numeric coercion | PASS | `<input type="number">` + `Number(...) \|\| 0` boundary; form hint copy verified. |
| **IP-033** | Apparatus name uniqueness | PASS w/ caveat | Canonical form correctly collides "Engine 1"/"engine 1"/"Eng 1"/"E 1"/"Trk 1"/"Ladder 1". Does NOT collide "E1" (no space) — see SUM-Low R5-04. Edge case, low risk. |
| **IP-034** | 24-hour timestamps | PASS | `fmtTimestamp` / `fmtDate` centralization confirmed at `app.js:742-755`. Grep returns ONLY the centralized site — no stragglers. One non-timestamp `toLocaleString` on `estimatedLoad` remains; out of scope. |
| **IP-047** | `renderOrgChart` defensive guard | PASS | `roleAssignments = roleAssignments \|\| {}` at L4838. Invoked with `(undefined,undefined)`/`(null,null)`/`({},[])` — zero throws. |
| **IP-048** | Start-Op modal apparatus eager-render | PASS | `populateStartOpApparatus()` sync before `openModal('startOpModal')` (L3893-3894). Listener path at L1856-1862 re-calls on apparatus change. |

**All 7 hotfixes pass.** Two have minor spec-drift caveats (IP-007 wording, IP-033 "E1" edge case). Neither blocks release.

---

## Mapping table → `findings-ledger.md` (merge diff)

| New ID | Prior ID | New ledger status | Action |
|---|---|---|---|
| V3.11.2-SUM-C1 | X5 | STILL-OPEN | Re-open / clarify status. Was 🟡 v3.6.0; never shipped. Tag 🟠 v3.11.3. |
| V3.11.2-SUM-C2 | X9 | STILL-OPEN | Re-open. Was 🟡 v3.6.0; never shipped. Tag 🟠 v3.11.3. |
| V3.11.2-SUM-C3 | (none) | NEW | v4.0.0 Phase 3C.5 reference; promote from "planned" to "active blocker." |
| SUM-H1 | NEW-7 (return only) | STILL-OPEN | Add deploy-path symmetry note. Tag 🟠 v3.11.3. |
| SUM-H2 | F-1C-19 | REGRESSION | v3.9.0 was incomplete. Tag 🟠 v3.11.3. |
| SUM-H3 | (none) | NEW | Add to ledger. Tag 🟠 v3.11.3. |
| SUM-H4 | R4 | STILL-OPEN | Existing. v4.0.0 confirmed. |
| SUM-H5 | (none, related F-1B-08) | REGRESSION | Add to ledger. Tag 🟠 v3.11.3. |
| SUM-H6 | (none) | NEW | Add to ledger. Tag 🟠 v3.12.0. |
| SUM-H7 | (none) | NEW | Add to ledger. Tag 🟠 v3.11.3 (style.css one-liner). |
| SUM-H8 | A2 extension | NEW | Add to ledger. Tag 🟠 v3.11.3. |
| SUM-H9 | (none) | NEW | Add to ledger. Tag 🟠 v3.11.3. |
| SUM-H10 | IP-037 / IP-061 | STILL-OPEN | Existing. v4.0.0 / v4.1.0 confirmed. |
| SUM-H11 | N2 / N3 / D2 / D3 | STILL-OPEN | Existing. v3.12.0 dual-write + v4.0.0 cutover confirmed. |
| (12 Medium / Low / Doc-drift items) | Various | See per-role reports | Per-row notes in ledger merge. |

---

## Recommended action plan

### v3.11.3 — Security & correctness patch (recommended this week)
**Critical (release-blocker class):**
- SUM-C1 / X5 — `aria-label` use `escapeAttr` (Edit + Delete SP buttons).
- SUM-C2 / X9 — refactor `showToast` into `showToast(text)` + `showToastHTML(html)`; update call-sites at L3199, L2091, L2141.

**High:**
- SUM-H1 — `makeDeployDecrementer` symmetry on all 8 deploy-transaction sites.
- SUM-H2 — F-1C-19 third site `Number(e.length)` coercion at L5130 + L5112.
- SUM-H3 — Coerce / escape `cutLength`, `actualCutLength`, `headerSize`, `footerSize` at all render sites.
- SUM-H5 + SUM-H7 of resilience pair — add `disableFirebaseWrites` guard to `flushPendingWrites()` and `registerMember()`.
- SUM-H7 — `style.css` `.select-compact { min-height: 44px }` one-liner.
- SUM-H8 — Bump `--text-hint` to `#6B6B6B` light / `#999999` dark in `style.css`.
- SUM-H9 — `operationsRef` guard parity at L4245 + 4 sibling sites.

**Documentation:**
- v3.10.0 smoke-test line anchors (R2-02).
- `findings-ledger.md` S-H1 clarifying note (R2-03).
- Either restore the rated-result liability disclaimer OR correct the v3.7.2 release notes (consolidated R2-01/R4-03/R6-08).

**Estimated effort:** 1 short PR (~50 lines diff across `app.js`/`style.css`/two docs). Patch release.

### v3.12.0 — Command tab + NIMS terminology cutover (MINOR)
- Issue #90 — Command tab separation per drafted plan `.claude/plans/v3.12.0-feedback-command-tab.md`.
- N2 → `assignedResource` dual-write (rename `group` field).
- Stop-work / hazard log (D2 / D3) — planned for v3.6.0, still open; deferred multiple times; v3.12.0 is the natural home now.
- Pending-write count in offline banner (R7-04).
- Span-of-control 6–7 yellow tier (R6-04 / N9).
- 33 form input `aria-label` audit (R4-06).
- Custom confirm sheet for `endOperation` (R7-05).

### v4.0.0 — Architectural / accountability
- SUM-C3 — Role assignment history.
- Operational period boundary (R7-03 / IP-016).
- ICS-201 / SitStat surface (R7-02 / IP-037).
- Safety Officer dashboard + PAR (R7-06 / D1).
- Apparatus check-in / demob timestamps (R6-07 / N11).
- `canReparent` — remove Safety org-edit authority (R6-03 / N7).
- ICS_ROLES_DEFAULT supervisory naming (R6-02 / N13).
- "Strut Placed" → "Strut Set" rename cutover (R6-10).

---

## Overall assessment

**v3.11.2 is safe to operate at Type IV–V scale by a single fire department with single-IC command and no mutual aid.** All seven release-blocker hotfixes verified. The strut algorithm is doctrinally correct (Role 2's verified-fixed list is extensive: ACME / LongShore / LockStroke load tables, conservative-floor interpolation, deduction symmetry, qty>4 sentinel, unrated-zone gate, Excel ID round-trip). The plate-picker body-move pattern (v3.5.1 canonical fix) still works. Listener teardown / re-attach / SRI / anonymous-auth bootstrap all clean.

**It is NOT safe to rely on as the sole accountability tool above Type IV.** The 3 Criticals + 11 Highs are real and would surface under any sustained multi-IC, multi-agency, or peer-write-heavy use. Most have been on the ledger since v3.6.0 and slipped through the v3.8–v3.11 hotfix series. The v3.11.3 security patch closes the immediate exploitable holes; the v3.12.0 + v4.0.0 plan addresses the structural ones. Paper backup for IC history and command transfer remains mandatory until v4.0.0 ships role-history.

---

## Team verdict refresh (1–10)

Per Role 7's lens, reconciled with the Role 1 + Role 3 findings (which Role 7 did not see):

| Role | v3.5.1 | v3.11.2 | Justification |
|---|---|---|---|
| Code | 3 | **6** | v3.9.0/v3.11.2 hardening real, but 2 Criticals + 4 Highs still open (X5/X9 are 6+ months overdue; SUM-H2 is a regression). Lowered from R7's 7. |
| SME | 2 | **8** | Confirmed by independent SME review. Core algorithm trustworthy for Type IV–V. |
| DevOps | 2 | **5** | R7 said 6; lowered to 5 after R3-01 found the `disableFirebaseWrites` regression (the exact failure class v3.10.1 was meant to prevent). Auth/SW/SRI/backup machinery solid; kill-switch incomplete. |
| Mobile-UX | 3 | **6** | Confirmed. 2 New Highs (touch target + contrast) are minor and one-liner fixes. Plate picker verified-fixed. |
| QA | 3 | **7** | All 7 hotfixes PASS in live drive. IP-007 spec-drift and IP-033 E1 edge are caveats, not regressions. |
| NIMS | 1 | **4** | Score 27% (Type IV–V scope). Modest progress from scope recalibration, not code changes. |
| BC | 2 | **6** | R7's self-assessment. App is trustworthy for solo Type V; not for multi-agency without paper. |

---

## Out-of-audit notes

- **Feedback Phase 3 was blocked** by the audit's "no backend" constraint. Issue #90 created, but Firebase entry `-OsutW-kvfc2qYS9tOnH` was not deleted. Manual cleanup needed (or add `Bash(firebase database:update *)` rule and retry).
- The `v3.12.0` Command-tab plan at `.claude/plans/v3.12.0-feedback-command-tab.md` already cross-references findings SUM-H10, SUM-H11, and R6-04 — those naturally bundle into the same release.
- Sub-agents with read-only toolsets (Roles 2, 6, 7) returned their reports as text and the parent agent persisted them to disk. Sub-agents with full toolsets (Roles 1, 3, 4, 5) wrote their reports directly. All 7 files plus this SUMMARY now present in `.claude/audits/v3.11.2/`.
