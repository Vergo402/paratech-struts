# FieldShore — Status & Roadmap (narrative)

> **Current:** v3.19.1 (shipped 2026-05-20) · **Live:** https://vergo402.github.io/paratech-struts/
> **Next planned:** v4.0.0 (doctrine cutover — see `.claude/plans/v4.0.0-plan.md`)
> **Source of truth for items:** [FieldShore Roadmap Project](https://github.com/users/Vergo402/projects/1) (also linked under the repo's Projects tab)

This file is narrative only — per-release lessons learned + strategic direction. **Item-level tracking lives in the Project**, queryable by `Release`, `Status`, `Source`, `Severity`, `Component`. Plan files in `.claude/plans/` are frozen specs (immutable after ship; archived).

---

## Strategic anchor (2026-05-17 reframe)

v4.0 anchors on everyday municipal fire-department use (Type IV/V incidents) — single dept, NIMS terminology, per-device UID auth, role-based perms. Federal/USAR/FEMA Type I/II scope (multi-agency auth, Unified Command, full FEMA demob, ICS forms suite, bulk-deploy, 250+ SP virtualization) deferred to v5.x+ after 10+ local departments validate the product.

**Long-horizon roadmap** (PWA → React Native → App Store, ~11-13 months total): see `v4.0-to-v5.0-roadmap.md`.

---

## Recent releases — what we learned

### v3.17.1 → v3.17.4 (PATCH series, 2026-05-19) — FAB polish + inventory atomicity
Catch-up entry: v3.17.1 increased FAB hold duration 0.5s → 3.5s. v3.17.2 fixed FAB arc animation hidden behind icon on mobile. v3.17.3 + v3.17.4 ([commits f656b89, ed85e88](https://github.com/Vergo402/paratech-struts/commits/main)) closed remaining v3.17.0 carry-overs: plate double-deduction during group deploys, silent inventory exhaustion mid-group, atomic deploys, silent auto-repair, display race fix. **Lesson:** the v3.17.0 ship was correctly framed as a bundle but the plate-double-deduction and group-exhaustion paths weren't caught by the in-flight v3.17.0 audit — drove a same-day patch series. Project items were closed and bumped to Done; this narrative entry catches up the CONSOLIDATED-STATUS doc which had drifted to v3.17.0 only.

### v3.17.0 (MINOR, 2026-05-19) — Pre-v4 bundle (12 items)
Local-first defaults (scenario presets, solo-IC mode, quick-start FAB), pre-v4 schema dual-writes (`assignedApparatus`→keyed, `customRoles`→keyed, `'Strut Placed'`→`'Strut Installed'`, one-shot role-hierarchy migration), role/permission cleanup (IC-only End Op, Mark Secured restricted to IC+Safety+Shoring, legend audit, external-equipment full form rebuild), and the #107 external-equipment offline resync that v3.16.4 deferred. **Lesson:** the external-equipment form rebuild (#102) revealed that `getOperationInventory()` had been hardcoding `type: 'strut'` for all external items since the feature was introduced — extensions and plates were silently mistyped. The shared grid builder pattern (`buildStrutGridHTML`/`buildExtGridHTML`/`buildPlateGridHTML`) extracted from the regular inventory modal prevented duplicating that bug. The ext-equipment offline resync (#107) mirrored the v3.16.4 inventory pattern one-to-one with namespaced `_itemEpoch` keys (`'ext:' + opId + ':' + itemId`), confirming the touched-set architecture generalizes cleanly. Plan: [v3.17.0-pre-v4-bundle.md](v3.17.0-pre-v4-bundle.md).

### v3.16.4 (PATCH, 2026-05-19) — Transaction resync (#71)
Extended v3.15.0's `offlineTouchedInventory` to cover non-offline transaction failures + 4 safety guards (epoch, peer-write, retry bound, `_meta` audit). **Lesson:** Flow B exposed a real implementation gap — Component A initially only caught *thrown* failures; Firebase's 25-retry abort resolves uncommitted, not thrown. Post-implementation audit folded 4 of 5 follow-ups into v3.16.4 itself (peer_converged diagnostic, dept-switch epoch clear, flush mutex, user-visible toast on max_retries). Only F1 (external-equipment return path, [#107](https://github.com/Vergo402/paratech-struts/issues/107)) deferred to v3.17.0. Plan: [v3.16.4-transaction-resync.md](v3.16.4-transaction-resync.md).

### v3.16.3 (PATCH, 2026-05-19) — Desktop UI hotfix (hfd217 feedback)
Scoped primary-button centering, pinned Add SP modal header/footer (opt-in `.modal-scrollbody`), legend → top of left column on desktop, phone DnD gate via `(pointer: coarse)`. **Lesson:** the broad `.btn-primary` rule made the 1000px wrapper fight desktop layouts — scoped selectors with `:root:not(.force-mobile-view)` outrank cleanly. Plan: [v3.16.3-desktop-ui-hotfix.md](v3.16.3-desktop-ui-hotfix.md).

### v3.16.0–v3.16.2 (MINOR + 2 PATCH, 2026-05-19) — SmartArt ICS + must-fix items
SmartArt org chart, lock-by-default, arrow-semantics, ICS-doctrine role hierarchy. Then a permanent inventory right rail (v3.16.1) and Operations legend + drilldown-search removal (v3.16.2). **Lesson:** the floating inventory panel overlapped shore-point cards at certain widths; a permanent right rail is simpler than dynamic offsets. Plan: [v3.16.0-smartart-org-chart.md](v3.16.0-smartart-org-chart.md).

### v3.15.0 (MINOR, 2026-05-19) — Numbered divisions + inventory hardening
Numbered divisions (#93), `offlineTouchedInventory` mark/filter/flush trio (#71 mitigation), `makeAllocateDecrementer` (#80 partial). **Lesson:** offline mitigation as a pattern unblocks #71 architecturally — v3.16.4 extended it rather than parallel-queueing.

### v3.13.0–v3.14.3 — Desktop view rollout
Top nav + Operations split (v3.13.x → v3.14.x), Settings link fix, viewport fill. **Lesson:** desktop split-view targeted Command before Operations; users wanted the split on the most-used tab.

### v3.5.2 – v3.12.0 — Audit-driven hardening
Two-round audit (v3.5.1) catalogued ~100 unique findings. Closed across v3.5.2 (safety hotfix), v3.6.0 (comprehensive), v3.7.x (Anonymous Auth + security rules + conservative-floor interpolation), v3.8.x (Firebase validate rules, quick wins), v3.9.x (XSS + import + SRI), v3.10.x (UI-walked audit minor + safety hotfix), v3.11.x (Hartsdale field feedback + Surfside-TTX security/correctness patch), v3.12.0 (Command tab separation + `group` → `assignedResource` dual-write + hazard log). **Lesson:** the audit gate (code-auditor + battalion-chief + mobile-ux before implementation for MINOR/MAJOR) was added after v3.14.0 shipped without it and needed a same-day v3.14.2 hotfix.

---

## Pipeline

### v3.17.0–v3.17.4 ✅ shipped 2026-05-19 — see "Recent releases" above

### v3.18.0 ✅ shipped 2026-05-20 — hfd217 field feedback (9 items)

hfd217 field-feedback response. **Workflow blockers:** #120 (cutting → runner blocked), #118 (Ops permission narrowing per battalion-chief), #116 (ext-equip inventory display refresh). **Layout fixes:** #117 (Operations header push-left regression), #115 (Assigned Apparatus category grouping). **Reversals:** #122 (scenario presets — undoes v3.17.0 #108), #124 (auto/solo/promote — undoes v3.17.0 #109). **UX polish:** #125 (Command dashboard tiles — timer setInterval pattern), #121 (plate dropdown sort with section-label divider).

B6 review: 7 reviewers, skeptical-senior-engineer added to the always-include set. **BLOCK partially honored** — #119 (all-measurements fractions) moved to v4.0.0 because it's data-model scope, not a bug fix. Plan: [v3.18.0-field-feedback.md](v3.18.0-field-feedback.md). Live query: [Release=v3.18.0 in the Project](https://github.com/users/Vergo402/projects/1).

**Process callout:** the safety-defaults memory rule that's supposed to gate setup-default changes did not catch v3.17.0 #108/#109. Cause: n=1 — when the only user is also the only requester, treating the user's request as "explicit Alex confirmation" collapses the check. See plan's "Process notes" section for the recommended rule update (not in v3.18.0 scope).

### v3.18.1 ✅ shipped 2026-05-20 — Quick View inventory filter (single-fix PATCH)

Two pieces of hfd217 feedback came in within hours of v3.18.0 deploying. **#126** — [`renderQuickViewInventory()` at app.js:8354](app.js:8354) was showing ALL department apparatus inventory regardless of which apparatus were assigned to the operation. Fixed with tri-state filter: gate on `activeOperation` existence (not `assignedApparatus.length`), so an active op with zero assigned apparatus shows an empty state with "Assign apparatus..." prompt instead of the no-op fallback. Tri-state behavior verified through preview UI driver. **#127** (external equipment not registering as available equipment) **deferred at GATE 2** — skeptical-senior-engineer BLOCK on surface ambiguity; could be Quick View, Inventory tab, or deploy flow; adding to any new surface is additive (MINOR not PATCH). Awaiting hfd217 surface clarification; will refile under v3.19.0 or fold into v4.0.0. Plan: [v3.18.1-inventory-display-patch.md](v3.18.1-inventory-display-patch.md). **Lesson:** GATE 2 caught an inverted-condition bug in the original Fix 1 draft (`length > 0` collapsed two distinct states); both reviewers converged on the same finding independently — confirms the value of running both code-auditor AND skeptical-senior on PATCH releases when reasonable.

**Process callout:** during this planning session a `gh api graphql updateProjectV2Field` mutation to add the v3.18.1 release option REPLACED the entire Release options list instead of appending — the API's `singleSelectOptions` field is set-and-replace, not append. Recovery: re-recreated all 41 options (new IDs) and re-set Release=v4.0.0 on the 4 v4.0.0 items + Release=v3.18.1 on #126. Backfill script [.claude/scripts/backfill-project.sh](.claude/scripts/backfill-project.sh) updated with new IDs. **Lesson for future planning sessions:** never use `updateProjectV2Field` to add a new Release option — read all current options first, then submit the full list including the new one. Or use the GitHub project web UI for one-off additions.

### v3.18.2 ✅ shipped 2026-05-20 — Org chart title fix (PATCH)

Custom role abbreviations were hard-truncated at 6 chars in JS (`substring(0,6)`), so "Staging Officer" displayed as "STAGIN". Fixed by raising the limit to 30 chars with word-wrap. Also removed the `org-card-name` subtitle row from org chart cards — abbreviated title now stands alone, centered and word-wrapped. Code-auditor caught two issues pre-ship: (1) Firebase `abbr` validate rule capped at 8 chars — bumped to 30 and deployed rules first to avoid PERMISSION_DENIED gap; (2) `.role-badge` (7 chip/banner surfaces) lacked word-wrap — added `word-break: break-word` to prevent overflow.

### v3.19.0 ✅ shipped 2026-05-20 — Default ICS org chart restructure (MINOR)

`ICS_ROLES_DEFAULT` ([app.js:1977](app.js:1977)) restructured to match the user's intended starting layout: added **Staging Area Manager** (under Operations per NIMS — "Officer" is reserved for Command Staff) and **Division 1** (under Operations, **collapsed by default** via [initCustomRoles()](app.js:1998) writing 'div1' to `orgCollapsedNodes`). Re-parented entry/rescue/shoring/wood from operations → div1. Cutting Table and Runner unchanged.

GATE 1 ran 4 reviewers in parallel. **code-auditor:** no blockers — migration logic at app.js:2114 is idempotent on `parentId`, existing ops untouched. **battalion-chief:** recommended dropping DIV 1 entirely (phantom node for Type IV-V); **overridden by user preference** — they want it as a placeholder. **nims-compliance:** BLOCKED original "Staging Officer under IC" plan ("Officer" reserved for Command Staff; Staging Area Manager reports to OPS per NIMS 2017 / SM-0322); honored — renamed and re-parented. **mobile-ux:** WARNED horizontal scroll on 4-sibling DIV 1 row; mitigated by default-collapse.

**Lesson:** the v3.18.2 PATCH that shipped just before this one fixed only the org chart title truncation — but the user's original ask ("this should be the standard opening ICS chart") was about the STRUCTURE, not just the labels. Half-honored the request. Caught when the user pushed back: "you didn't update the org chart like I asked." Then a second false alarm — user reported the move/drag controls were broken; turned out their device's `myRole !== 'ic'` so `canReparent()` gated everything. Existing behavior, not a regression. **Surfaces a UX concern for later:** when not-IC, the org chart looks broken / read-only. Could add a banner or message explaining the gate.

### v3.19.1 ✅ shipped 2026-05-20 — Note explaining IC-only chart editing (PATCH)

The v3.19.0 cycle surfaced a long-standing UX gap: when a user's `myRole !== 'ic'`, `canReparent()` returns false → Edit button, toolbar arrows, drag-and-drop, and tap-modal reorder controls are ALL gated off. The corner of the ICS Organization section rendered empty, making the chart look broken / read-only. v3.19.1 fills that corner with **"Only the IC can edit the chart"** in italic muted text, with a tooltip explaining how to claim the IC role. Zero behavior change — just a label closing the UX seam.

### v4.0.0 (MAJOR, ~2-3 weeks) ⏳ planned — 4 items scoped in Project

Per-device UID auth + NIMS doctrine corrections + schema cutover. Per-write `_meta: { byUid, at }` attribution, role-based write scope, schema dual-write window closes. Local-scale TTX-3 alpha gate (car-into-building, ~6-8 SPs). User manual rewrite.

**Scoped in Project:**
- [#80](https://github.com/Vergo402/paratech-struts/issues/80) — Cloud Function for atomic allocate+create (architectural, depends on per-device UID auth landing first)
- [#103](https://github.com/Vergo402/paratech-struts/issues/103) — Header/footer beams in inventory + deduct from cut lengths (hfd217-tagged "in v4")
- [#119](https://github.com/Vergo402/paratech-struts/issues/119) — All measurements as fractions (moved from v3.18.0 per skeptical-senior-engineer BLOCK; data-model + Excel I/O + search-cache-key scope)
- [#123](https://github.com/Vergo402/paratech-struts/issues/123) — Department → Apparatus → Equipment/Individuals breadcrumb hierarchy (single-dept piece in v4.0; multi-dept dropdown deferred to Federal Future)

Plan: [v4.0.0-plan.md](v4.0.0-plan.md) (canonical for v4.0 scope per MASTER-PLAN.md). Live query: [Release=v4.0.0 in the Project](https://github.com/users/Vergo402/projects/1).

---

## Open decisions

| # | Decision | Recommendation |
|---|---|---|
| 1 | Minimum org chart for Type IV/V? | IC + Safety mandatory; Ops auto-suggested at >10 SPs or >3 apparatus |
| ~~2~~ | ~~Solo IC mode~~ | ✅ Resolved in v3.17.0 — progressive disclosure with count + IC override (#109) |
| 3 | Per-device UID — auto-generate or prompt? | Auto-generate + prompt for display name on first write (e.g., "BC Alex") |
| 4 | NIMS terminology cutover — atomic or staggered? | Dual-write phase complete (v3.12.0–v3.17.0). Cutover in v4.0.0 |
| 5 | `_review-to-delete/` folder — safe to nuke? | Yes — stale worktrees + browser "Save As" artifacts |

---

## File map — what lives where

| Where | What |
|---|---|
| **[FieldShore Roadmap Project](https://github.com/users/Vergo402/projects/1)** | All tracked items. Filter by Release, Status, Source, Severity, Component |
| `CONSOLIDATED-STATUS.md` (this file) | Per-release narrative + strategic direction |
| `.claude/plans/v{X.Y.Z}-{theme}.md` | Frozen spec per release. Immutable after ship |
| `.claude/plans/archive/` | Completed/superseded plans |
| `v4.0.0-plan.md` / `MASTER-PLAN.md` | Canonical v4.0 scope + traceability spine |
| `v4.0-to-v5.0-roadmap.md` | Long-horizon PWA → React Native → App Store |
| `.claude/audits/findings-ledger.md` | Every audit finding catalogued (most now in the Project) |
| `.claude/scripts/backfill-project.sh` | Re-sync issues to the Project. Idempotent |

---

## Housekeeping

- `_review-to-delete/` — nuke once Alex confirms
- `git worktree prune` — clean stale refs locally
- CLAUDE.md line-number drift — version label says `~line 60`; actual is line 74. Refresh on next docs pass
