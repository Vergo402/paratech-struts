# Role 6 — NIMS Compliance — v3.11.2

**Audit date:** 2026-05-18
**Lane:** NIMS/ICS doctrine + terminology + ICS-form coverage + multi-agency
**Scope recalibration:** v4.0 target is now Type IV-V local fire department per `.claude/plans/v4.0.0-plan.md` (2026-05-17 reframe). Type I/II General Staff requirements are deferred to Federal Future. Scoring applies the Type IV-V bar.

---

## Executive Summary

Against the recalibrated Type IV-V scope, v3.11.2 reaches approximately **27% NIMS compliance**, up from the v3.5.1 baseline of 19%. The improvement reflects three things: the correct IC → Safety → Operations chain is intact and sufficient for Type IV-V; the status dot key (Active / Staged) ships in the org chart; and the unrated-deploy acknowledgment gate adds a partial safety-officer safeguard for extrapolated loads. The remaining gap is structural. The SP `group` field still stores apparatus IDs under the label "Group" — the most doctrinally incorrect item in the app. Five of nine default ICS roles are task names, not NIMS supervisory positions. Safety retains org-edit authority in `canReparent()`. Neither a stop-work mechanism nor a hazard log shipped despite both being planned for v3.6.0. ICS form export has zero scaffolding. A v3.7.2 liability disclaimer described in CLAUDE.md does not appear in normal rated result cards. All of these items are correctly tracked in the plan as v4.0.0 scope; no new compliance blockers were introduced in v3.11.2.

---

## NIMS Scorecard

| Criterion | v3.5.1 | v3.11.2 | Notes |
|---|---|---|---|
| IC — Command Staff chain (Type IV-V) | Partial | Partial | IC + Safety + Ops present; PIO/LNO absent. Type IV-V only requires IC + Safety — partial credit |
| Org-edit authority (canReparent) | Fail | Fail | Safety retains authority — N7 STILL-OPEN |
| SP Group terminology | Fail | Fail | Apparatus IDs stored under "Group" label — N2 STILL-OPEN |
| ICS role position names | Fail | Fail | 5 of 9 defaults are task names — N13 STILL-OPEN |
| Operational period concept | Fail | Fail | Absent — N3 deferred v4.0 |
| ICS form export | Fail | Fail | No scaffolding — N4 deferred v4.0 |
| PAR mechanism | Fail | Fail | Apparatus count only, no crew size — D1/N10 deferred v4.0 |
| Check-in / demob timestamps | Fail | Fail | Flat apparatus ID array — N11 STILL-OPEN |
| Stop-work / mayday | Fail | Fail | Absent — D2 STILL-OPEN (was planned v3.6.0) |
| Hazard log | Fail | Fail | Absent — D3 STILL-OPEN (was planned v3.6.0) |
| Span-of-control warning | Partial | Partial | Single >7 threshold only; three-tier was planned for v3.6.0 |
| Status dot key (Active / Staged) | Absent | PASS | VERIFIED-FIXED v3.7.0 — present at app.js:4933-4936 |
| Liability disclaimer on rated results | Absent | Partial | Unrated-zone gate only; normal result cards have no notice |
| Multi-agency / Unified Command | Fail | Fail | Deferred to Federal Future — N5/N6 |
| Status label "Strut Set" | Fail | Fail | Still "Strut Placed" — v3.12.0 dual-write + v4.0.0 cutover planned |

**Estimated score: ~27% (Type IV-V scope).** Scope recalibration is the primary driver of improvement over the 19% baseline; the app's NIMS correctness has not materially advanced since v3.5.1.

---

## Severity Histogram

| Severity | Count |
|---|---|
| Compliance-blocking (must fix before v4.0 GA) | 2 |
| Terminology / incorrect naming | 3 |
| Safety-officer operational gap (unshipped v3.6.0 items) | 2 |
| Correctly deferred to v4.0 / Federal Future | 6 |
| VERIFIED-FIXED | 1 |
| Partial / ambiguous | 2 |

---

## Findings

### V3.11.2-R6-01 — SP "Group" field stores apparatus IDs (STILL-OPEN)
**Prior ledger ID:** N2
**Doctrine:** NIMS (FEMA ICSSCI SM-0322, Chapter 3) — Group is a functional supervisory level commanding resources by function, not a single resource or apparatus assignment.
**Current behavior:** `index.html:394` labels the field "Group." `populateGroupDropdown()` at `app.js:2207-2223` populates the `<select id="spGroup">` from `activeOperation.assignedApparatus` — an array of apparatus IDs. The selected value is persisted as `sp.group`. `getLocationBreadcrumb()` at `app.js:891` renders this in the breadcrumb as e.g. "Group: Engine 3" — a resource name, not a functional unit name.
**Severity:** Compliance-blocking. A NIMS-trained operator reads "Group" and expects a functional supervisory entity.
**v4.0 plan status:** Correct — dual-write (`group` + `assignedResource`) in v3.12.0, cutover in v4.0.0. No action in v3.x.

---

### V3.11.2-R6-02 — Non-NIMS position names in ICS_ROLES_DEFAULT (STILL-OPEN)
**Prior ledger ID:** N13
**Doctrine:** NIMS ICS (SM-0322, Chapter 4) — Operations Section child nodes are Branches, Divisions, and Groups with a Supervisor title. Task-role names ("Cutting Table," "Runner," "Initial Shoring," "Wood Shoring") are not NIMS ICS supervisory positions.
**Current behavior:** `app.js:1248-1251` — four child roles of `operations` carry task-assignment names. A cross-trained NIMS operator expects "Shoring Group Supervisor" or "Entry Group Supervisor," not "Initial Shoring."
**Severity:** Terminology. Does not block operations but creates confusion for personnel from other departments.
**v4.0 plan status:** The v3.12.0 Type IV-V preset is the natural fix window — these nodes should use NIMS supervisory titles.

---

### V3.11.2-R6-03 — canReparent() grants Safety org-edit authority (STILL-OPEN)
**Prior ledger ID:** N7
**Doctrine:** NIMS ICS (SM-0322, Chapter 5) — Safety Officer has emergency-stop authority. Org structure changes belong to the IC; in expanded activations to the Resources Unit Leader under Planning. Safety does not restructure command.
**Current behavior:** `app.js:1317-1320` — `canReparent()` returns true when `myRole === 'safety'`. Any device in Safety role can reparent org nodes and the change syncs to Firebase for all devices.
**Severity:** Compliance-blocking for doctrine. Low operational risk in Type IV-V single-dept context but should not survive v4.0.
**Recommended fix approach:** Remove `safety` from `canReparent()`. IC alone authorizes structure changes. PSC can be added if a PSC preset ships.

---

### V3.11.2-R6-04 — Span-of-control warning is single-threshold only (STILL-OPEN / PARTIAL)
**Prior ledger ID:** N9 (partially shipped — single threshold landed, three-tier did not)
**Doctrine:** NIMS (SM-0322, Chapter 3) — recommended 5, manageable 3-7, exceeded above 7.
**Current behavior:** `app.js:4889` — `directReports > 7` fires a single red warning icon. The 6-7 caution tier and the <3 wasteful-span informational tier were planned for v3.6.0 but were not implemented.
**Severity:** Terminology / incomplete. The >7 threshold is correct; the missing lower tier means the IC gets no nudge before hitting the ceiling.
**Recommended fix approach:** Add the 6-7 yellow indicator. The <3 informational tier is optional for Type IV-V.

---

### V3.11.2-R6-05 — Stop-work / mayday mechanism absent (STILL-OPEN)
**Prior ledger ID:** D2 (planned v3.6.0 — not shipped through v3.11.2)
**Doctrine:** NIMS ICS (SM-0322, Chapter 5). FEMA USAR Operations Manual (MANUAL 12-001) requires an all-hands stop-work mechanism accessible to Safety.
**Current behavior:** No "stop-work," "mayday," or emergency broadcast mechanism in `app.js` or `index.html`. Planned for v3.6.0 as a persistent red FAB; no implementation found across any version through v3.11.2.
**Severity:** Safety-officer operational gap. Correctly tracked for v4.0.0.

---

### V3.11.2-R6-06 — Hazard log absent (STILL-OPEN)
**Prior ledger ID:** D3 (planned v3.6.0 — not shipped through v3.11.2)
**Doctrine:** NIMS ICS (SM-0322, Chapter 7 — Planning). ICS-208 Safety Message and per-period IAP require hazard documentation.
**Current behavior:** No hazard schema or UI in any version through v3.11.2. Companion to D2; both planned, neither shipped.
**Severity:** Safety-officer operational gap. Correctly tracked for v4.0.0.

---

### V3.11.2-R6-07 — Apparatus check-in / demob timestamps absent (STILL-OPEN)
**Prior ledger ID:** N11
**Doctrine:** NIMS ICS-211 (Check-in/Check-out List) requires `arrivedAt` and release time per resource.
**Current behavior:** `assignedApparatus` is a flat array of apparatus ID strings. No arrivedAt or demobAt fields anywhere in the schema. ICS-211 cannot be generated.
**Severity:** Compliance-blocking for ICS form generation; correctly deferred to v4.0.0.
**v4.0 plan:** Convert `assignedApparatus` to a keyed object `{appId: {arrivedAt, demobAt}}`.

---

### V3.11.2-R6-08 — Liability disclaimer absent from rated result cards (NEW)
**No prior ledger ID** — this is a NEW finding.
**Background:** CLAUDE.md documents that v3.7.2 "Added disclaimer on strut results: capacity figures are planning aids, not engineering certifications."
**Current behavior:** `renderResults()` at `app.js:426-615` produces result card HTML for QuickFind and Operations. Reading the complete function: no advisory text appears in rated result cards. The text "extrapolated, not certified" exists only in `confirmUnratedDeploy()` at `app.js:4280`, which fires only for LongShore configurations beyond 16 ft. For all normal ACME, LockStroke, and in-range LongShore results the user sees no planning-aid notice.
**Severity:** Terminology. The v3.7.2 release note overstates what shipped. A single static line below the results container would satisfy the doctrine intent without cluttering individual cards.
**Recommended fix approach:** Add a static note below the result list container in `renderResults()` — not inside individual cards. Not a v3.11.x blocker but should accompany the next result-card touch.

---

### V3.11.2-R6-09 — Status dot key VERIFIED-FIXED
**Status:** VERIFIED-FIXED (v3.7.0)
`app.js:4933-4936` renders a `<div class="status-key">` containing Active and Staged dot-legend directly below the ICS Organization header. WebFetch of the live site could not render JS-generated content (chart is dynamically rendered), but source code evidence is definitive. No regression.

---

### V3.11.2-R6-10 — "Strut Placed" status label not yet renamed (STILL-OPEN, correctly deferred)
**Doctrine:** NIMS terminology — "Strut Set" aligns with FEMA ICSSCI task-completion language. "Strut Placed" has no NIMS basis.
**Current behavior:** `STATUS_LABELS.strutplaced = 'Strut Placed'` at `app.js:695`.
**Severity:** Terminology, low. v4.0.0-plan.md correctly sequences the rename: dual-write in v3.12.0, cutover in v4.0.0. No action needed in v3.x.

---

## Out-of-Lane Notes

- D4 (visual equivalence of Strut Placed and Secured — color-only) is a field-safety rendering concern. Pointer to `structural-collapse-sme` and `mobile-ux`.
- `APPARATUS_TYPES_DEFAULT` at `app.js:1972-1980` includes "Task Force" but no "Strike Team" and no `leaderId` validation (N14). Pointer to `fullstack-engineer` for v4.0.0 schema.
- N1 (missing General Staff) severity is effectively downgraded under the 2026-05-17 local-first pivot. The v3.12.0 Type IV-V preset (IC + Safety mandatory, Operations optional) matches FEMA ICSSCI guidance for Type IV-V. N1 is correctly deferred to Federal Future.
