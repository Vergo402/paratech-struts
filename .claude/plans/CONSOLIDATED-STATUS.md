# FieldShore — Consolidated Status & Next Steps

> **Date:** 2026-05-19
> **Production:** v3.16.2
> **Live:** https://vergo402.github.io/paratech-struts/

---

## What shipped (v3.5.2 → v3.14.3)

Everything from the two-round audit is implemented through v3.11.3. Post-audit local-first work runs through v3.14.3:

| Version | What shipped |
|---|---|
| v3.5.2 | Safety hotfix — strut algorithm capacity corrections, XSS, data integrity |
| v3.6.0 | Comprehensive audit fixes — UX, safety, race conditions, accessibility |
| v3.7.0 | Firebase Anonymous Auth + security rules + feedback photo attachment |
| v3.7.1 | Auth race condition hotfix |
| v3.7.2 | Safety-critical: linear interpolation → conservative-floor + liability disclaimer |
| v3.7.3 | Empty-state clarity (#63) |
| v3.8.0 | Individual wood cut tracking (#65) + inventory display fix (#64) |
| v3.8.1 | Sync diagnostics — error capture |
| v3.8.2 | Firebase validate rule field mismatch fix |
| v3.8.3 | 13 quick wins from v3.8.2 audit |
| v3.9.0 | Status-progression guard, Excel ext+plate import, orphan-role sync, SRI, peer-XSS hardening |
| v3.9.1 | Revert T-Shore deduction auto-fill |
| v3.9.2 | XSS hotfix — missed site in renderCutTableCard |
| v3.10.0 | Audit v3.10 minor (UI-walked) |
| v3.10.1 | Safety hotfix — disableFirebaseWrites guard + auto-backup |
| v3.11.0 | 7 Hartsdale field feedback fixes (#82–#88): plate picker, header, dark-mode contrast, edit SP length, scroll jump, apparatus modal |
| v3.11.1 | FieldStruts → FieldShore rename |
| v3.11.2 | Release-blocker hotfix — IP-007/010/011/033/034/047/048 (7 Surfside-TTX findings) + smoke deck |
| v3.11.3 | Security & correctness patch — 2 Critical XSS (aria-label escapeAttr, showToast text/html split) + 7 High (deploy-decrementer symmetry, cut-table coercion, peer-writable field escapes, disableFirebaseWrites guard, .select-compact 44px, --text-hint AA contrast, operationsRef guard parity) + photo feature removed + quick wins |
| v3.12.0 | Command tab separation (#90) + `group` → `assignedResource` dual-write + `customRoles` concurrent-safe writes + hazard log (ICS-208) + force-update mechanism + 9 audit-medium fixes |
| v3.13.0 | Desktop view — top nav + Operations split + view-mode toggle |
| v3.13.1 | Re-targeted desktop split-view onto Command tab |
| v3.14.0 | Operations-tab desktop split-view (drilldown sidebar + centered actions) |
| v3.14.1 | Settings link fix — broken USAR FOG URL → Wayback + FEMA index (#92) |
| v3.14.2 | Hotfix — Wayback URL format, distinct status pill colors, 44px hit targets |
| v3.14.3 | Desktop view fills viewport (#94 from hfd217 feedback) + planning-doc drift cleanup |
| v3.15.0 | Numbered divisions (#93) + offline inventory hardening (#71, #80 partial) |
| v3.16.0 | SmartArt ICS org chart (#95) + 12 must-fix items (#96) + lock-by-default + ↑↓←→ arrows + modal close repositioned + ICS-doctrine role hierarchy (Operations left of Safety, Runner under Cutting Table) + 44px touch targets + post-audit refinements |
| v3.16.1 | Permanent inventory right rail on desktop Operations (fixes floater overlapping shore-point cards) |
| v3.16.2 | Operations legend (card colors + per-action role permissions) + remove buggy drilldown search |

---

## What's next — pipeline

**Strategic decision (2026-05-17):** v4.0 anchors on everyday municipal fire department use (Type IV/V incidents). Federal/USAR/FEMA Type I/II scope deferred to v5.x+.

Both v3.11.2 and v3.12.0 (originally scoped as "local-first defaults") have shipped, though v3.12.0 absorbed the Command-tab split + dual-write + hazard log rather than the scenario presets. Those presets are recycled into v3.16.0 below.

### Release 1 — v3.15.0 (MINOR, ~7–10 days) ⏳ planned

**Goal:** Numbered divisions feature + offline inventory hardening.

- **#93 Numbered divisions with vertical anchoring** (HEADLINE — feedback from hfd217, 2026-05-18). Replace free-text division field with a numbered selector + vertical-anchored dropdown (Division 1 center, +N above, +N sub-divisions below). Append-only via `[+]` controls; no manual entry. `formatDivision()` helper centralizes breadcrumb display. Schema migration with `divisionLegacyLabel` fallback.
- **#71 Offline-touched-inventory tracking + flush-pass.** Track inventoryIds touched offline; on reconnect, push only those items' local `available` value to Firebase BEFORE the listener overwrites. Solves the architectural root cause of the v3.8.2 inventory bug.
- **#80 Short-term transaction race guard (v=0 case).** v3.11.3's `makeDeployDecrementer()` handles `v == null` (peer-deleted); add a second guard for `v === 0` (last unit already taken) → reject companion SP write + toast.

Agent gate (per memory rule): code-auditor + battalion-chief + mobile-ux (mandatory MINOR) + architect + devops-resilience + migration-specialist (scope) + qa-driver + release-manager.

**User manual update required** (MINOR — new feature).

### Release 2 — v3.16.0 (MINOR) ✅ shipped 2026-05-19

**Goal:** SmartArt ICS org chart — interactive hierarchy tree with per-node controls.

**Plan file:** [v3.16.0-smartart-org-chart.md](v3.16.0-smartart-org-chart.md)

- **#95** SmartArt interactive org chart (headline — already implemented on `feature/smartart-org-chart`)
- **#96** 12 must/should-fix items from 5-agent review: `canReparent()` IC-only + runtime guard, 44px touch targets with mobile toolbar→modal rework, granular `moveRoleUp/Down` updates, 19-site `escapeAttr()` hardening, `renderSubtree` crash fix + cycle guard, aria-labels, clearTimeout debounce, iOS `touch-action`, disabled opacity fix, role-assignment toast
- User manual update (MINOR)

**Deferred from original v3.16.0 scope → v3.17.0:**
- 3 scenario presets, first-due solo IC mode, Quick-start FAB
- `Strut Placed` → `Strut Set` rename dual-write
- `customRoles` array → keyed object dual-write

### Release 3 — v3.17.0 (MINOR, TBD) ⏳ planned

**Goal:** Local-first defaults + pre-v4 schema dual-write window.

- 3 scenario presets: "Car into building", "Residential partial collapse", "Light commercial partial collapse"
- First-due solo IC mode (progressive disclosure — single apparatus auto-selects)
- Quick-start FAB on Quick Find tab
- `Strut Placed` → `Strut Set` rename dual-write
- `customRoles` array → keyed object dual-write
- `assignedApparatus` array → keyed object (#79)
- Remaining schema migration prep for v4.0 cutover

### Release 4 — v4.0.0 (MAJOR, ~2-3 weeks) ⏳ planned

**Goal:** Per-device UID auth + NIMS doctrine corrections + schema cutover.

- Per-device UID auth (single dept, role-based perms — NOT multi-agency)
- Per-write `_meta: { byUid, at }` attribution
- Role-based write scope in Firebase rules (IC+Safety = full, operator = SPs only, observer = read-only)
- `group` → `assignedResource` rename (dual-write started in v3.12.0)
- `Strut Placed` → `Strut Set` status rename cutover
- `customRoles` array → keyed object migration
- `assignedApparatus` array → keyed object (#79)
- `roleHistory` append-only event log + compact UI (closes V3.11.2-SUM-C3)
- Schema cutover (old-shape reads removed, dual-write window closes)
- Cloud Function for atomic allocate+create (#80 full fix, needs per-device UID auth landed first)
- Local-scale TTX-3 alpha gate (car-into-building, ~6-8 SPs)
- User manual rewrite (MAJOR release)

---

## Open decisions for Alex

| # | Decision | Recommendation |
|---|---|---|
| 1 | Minimum org chart for Type IV/V? | **IC + Safety mandatory; Ops auto-suggested at >10 SPs or >3 apparatus** |
| 2 | Solo IC mode — full bypass or progressive disclosure? | **Progressive disclosure** — single apparatus auto-selects; adding 2nd promotes UI |
| 3 | Per-device UID — auto-generate or prompt? | **Auto-generate + prompt for display name on first write** (e.g., "BC Alex") |
| 4 | NIMS terminology cutover — atomic or staggered? | **Atomic** — dual-write in v3.12.0–v3.17.0, cut over in v4.0.0 |
| 5 | `_review-to-delete/` folder — safe to nuke? | **Yes** — stale worktrees + browser "Save As" artifacts |

---

## After v4.0 — the long horizon

**v4.0 → v5.0 roadmap** (see `v4.0-to-v5.0-roadmap.md`):

| Phase | Duration | What ships |
|---|---|---|
| 0 (current) | ~5-6 weeks | v4.0.0 PWA — local-first scope |
| Pre-1 | 3-4 weeks | Legal/IP: dept IP policy, LLC, trademark, E&O insurance |
| 1 | 6-8 weeks | Turborepo monorepo + shared core + React Native Quick Find |
| 2 | 8-10 weeks | Full mobile app on Expo Go |
| 3 | 6-8 weeks | App Store submission + web command module |
| 4 | Ongoing | Photos, GPS, push, training mode, reporting |

**Total to App Store: ~11-13 months.** Budget: ~$8,000-15,000 (incl. first-year E&O).

Federal-scope features (multi-agency auth, Unified Command, full FEMA demob, ICS forms suite, bulk-deploy, 250+ SP virtualization) re-enter at v5.2+ after 10+ local departments validate the product.

---

## File map — what lives where

### Active plans (`.claude/plans/`)

| File | Purpose |
|---|---|
| **CONSOLIDATED-STATUS.md** | This file — single source of truth for current state |
| **MASTER-PLAN.md** | v3.x audit finding traceability + release-roadmap spine |
| **v4.0.0-plan.md** | Canonical v4.0 release plan — 3-release train with full scope |
| **v4.0-to-v5.0-roadmap.md** | Long-horizon PWA → React Native → App Store roadmap |

### Archived plans (`.claude/plans/archive/`)

All completed or superseded: v1.8.1, v1.9.0, v2.1.0, v2.3.0, v3.4.1, v3.5.2, v3.6.0, v3.7.3, v3.8.0, v3.8.2, v3.11.0, v4.0.0-scale-back-analysis.

### Audit reference (`.claude/audits/`)

| File | Purpose |
|---|---|
| **AUDIT-INDEX.md** | Entry point for the two-round v3.5.1 audit |
| **findings-ledger.md** | Every finding catalogued with status |
| **v3.8.2/SUMMARY.md** | v3.8.2 5-role audit (121 findings) |

---

## Housekeeping still needed

- [ ] `_review-to-delete/` — nuke once Alex confirms
- [ ] `git worktree prune` — run locally from Terminal to clean stale refs
- [ ] CLAUDE.md — add v3.10.0 through v3.11.1 shipped tables (currently stops at v3.9.1)
- [ ] MEMORY.md — update production version from v3.7.3 to v3.11.1
