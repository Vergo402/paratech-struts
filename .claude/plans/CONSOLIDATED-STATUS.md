# FieldShore — Status & Roadmap (narrative)

> **Current:** v3.16.4 (shipped 2026-05-19) · **Live:** https://vergo402.github.io/paratech-struts/
> **Source of truth for items:** [FieldShore Roadmap Project](https://github.com/users/Vergo402/projects/1) (also linked under the repo's Projects tab)

This file is narrative only — per-release lessons learned + strategic direction. **Item-level tracking lives in the Project**, queryable by `Release`, `Status`, `Source`, `Severity`, `Component`. Plan files in `.claude/plans/` are frozen specs (immutable after ship; archived).

---

## Strategic anchor (2026-05-17 reframe)

v4.0 anchors on everyday municipal fire-department use (Type IV/V incidents) — single dept, NIMS terminology, per-device UID auth, role-based perms. Federal/USAR/FEMA Type I/II scope (multi-agency auth, Unified Command, full FEMA demob, ICS forms suite, bulk-deploy, 250+ SP virtualization) deferred to v5.x+ after 10+ local departments validate the product.

**Long-horizon roadmap** (PWA → React Native → App Store, ~11-13 months total): see `v4.0-to-v5.0-roadmap.md`.

---

## Recent releases — what we learned

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

### v3.17.0 (MINOR) ⏳ next — 6 items scoped in Project

Local-first defaults + carry-over fixes from v3.16.x field feedback + pre-v4 schema dual-write.

**Already scoped** (set in Project on 2026-05-19):
- [#79](https://github.com/Vergo402/paratech-struts/issues/79) — `assignedApparatus` array → keyed object
- [#102](https://github.com/Vergo402/paratech-struts/issues/102) — Add External Equipment should match full inventory list flow
- [#104](https://github.com/Vergo402/paratech-struts/issues/104) — Role permissions: Mark Secured open to all; Runner limited
- [#105](https://github.com/Vergo402/paratech-struts/issues/105) — Remove End Operation from Operations tab — IC-only via Command
- [#106](https://github.com/Vergo402/paratech-struts/issues/106) — Verify "Setup actions IC-only" legend wording
- [#107](https://github.com/Vergo402/paratech-struts/issues/107) — External-equipment transaction failures on RETURN (v3.16.4 F1 follow-up)

**Carry-over items still in Backlog** (decide on next `/plan` run): scenario presets, solo-IC mode, Quick-start FAB, `Strut Placed` → `Strut Set` dual-write, `customRoles` keyed-object dual-write, one-shot role-hierarchy migration, drilldown search v2.

Live query: [Release=v3.17.0 in the Project](https://github.com/users/Vergo402/projects/1).

### v4.0.0 (MAJOR, ~2-3 weeks) ⏳ planned — 2 items scoped in Project

Per-device UID auth + NIMS doctrine corrections + schema cutover. Per-write `_meta: { byUid, at }` attribution, role-based write scope, schema dual-write window closes. Local-scale TTX-3 alpha gate (car-into-building, ~6-8 SPs). User manual rewrite.

**Already scoped:**
- [#80](https://github.com/Vergo402/paratech-struts/issues/80) — Cloud Function for atomic allocate+create (architectural, depends on per-device UID auth landing first)
- [#103](https://github.com/Vergo402/paratech-struts/issues/103) — Header/footer beams in inventory + deduct from cut lengths (hfd217-tagged "in v4")

Plan: [v4.0.0-plan.md](v4.0.0-plan.md) (canonical for v4.0 scope per MASTER-PLAN.md). Live query: [Release=v4.0.0 in the Project](https://github.com/users/Vergo402/projects/1).

---

## Open decisions

| # | Decision | Recommendation |
|---|---|---|
| 1 | Minimum org chart for Type IV/V? | IC + Safety mandatory; Ops auto-suggested at >10 SPs or >3 apparatus |
| 2 | Solo IC mode — full bypass or progressive disclosure? | Progressive disclosure — single apparatus auto-selects; adding 2nd promotes UI |
| 3 | Per-device UID — auto-generate or prompt? | Auto-generate + prompt for display name on first write (e.g., "BC Alex") |
| 4 | NIMS terminology cutover — atomic or staggered? | Atomic — dual-write in v3.12.0–v3.17.0, cut over in v4.0.0 |
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
