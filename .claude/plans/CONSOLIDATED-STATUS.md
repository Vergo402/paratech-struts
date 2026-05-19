# FieldShore — Consolidated Status & Next Steps

> **Date:** 2026-05-19
> **Production:** v3.16.2
> **Live:** https://vergo402.github.io/paratech-struts/

---

## What shipped (v3.5.2 → v3.16.2)

Everything from the two-round audit is implemented through v3.11.3. Post-audit local-first work runs through v3.16.2:

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

Both v3.11.2 and v3.12.0 (originally scoped as "local-first defaults") have shipped, though v3.12.0 absorbed the Command-tab split + dual-write + hazard log rather than the scenario presets. Those presets are recycled into v3.17.0 below.

### Release 1 — v3.15.0 (MINOR) ✅ shipped 2026-05-19

Numbered divisions (#93) + offline inventory hardening (#71 mitigated via `offlineTouchedInventory` flush-pass, #80 partial via `makeAllocateDecrementer`).

### Release 2 — v3.16.x (MINOR + 2 PATCH) ✅ shipped 2026-05-19

- **v3.16.0** — SmartArt ICS org chart (#95) + 12 must-fix items (#96) + lock-by-default + ↑↓←→ arrows + modal close repositioned + ICS-doctrine role hierarchy (Operations left of Safety, Runner under Cutting Table) + 44px touch targets. Plan file: [v3.16.0-smartart-org-chart.md](v3.16.0-smartart-org-chart.md)
- **v3.16.1** — Permanent inventory right rail on desktop Operations (fixes the floating panel overlapping shore-point cards)
- **v3.16.2** — Operations legend (card colors + per-action role permissions) + remove buggy drilldown search

### Release 3 — v3.16.3 (PATCH, planned) ⏳ planned 2026-05-19

**Desktop UI hotfix from Hartsdale (hfd217) in-app feedback + v3.16.x carry-over fixes.**
- #97 app width investigation (likely stale SW / persisted `forceMobileView`)
- #98 #99 #100 — `.btn-primary` desktop centering via scoped `.screen > .btn-primary` selector
- #101 — Add Shore Point modal: Option C (pin header/footer, scroll body)
- Operations legend → top of left column on desktop
- Disable ICS org-chart drag-and-drop on phones (`(pointer: coarse)` gate; tap-place + arrow toolbar remain)
- Plan file: [v3.16.3-desktop-ui-hotfix.md](v3.16.3-desktop-ui-hotfix.md)
- Agent-reviewed (code-auditor, mobile-ux, devops-resilience, qa-driver, release-manager). #71 split into v3.16.4.

### Release 4 — v3.16.4 (PATCH, planned) ⏳ next after v3.16.3

**#71 architectural full-fix — failed-transaction value-resync (split out of v3.16.3 due to blast radius).**
- Scoped-field allowlist (only `inventory/{id}.available`, `.quantity`), not whole-subtree
- Mutation-epoch versioning to prevent resync clobbering concurrent local writes
- Separate `pendingResyncs` queue (de-duped by path)
- `_meta.lastVerifiedAt` schema field added (free signal for v3.18.0 dual-write)
- Diagnostics: `logSyncEvent('resync_enqueued' | 'resync_applied', {path, drift})`
- Explicit failure-injection driver flow (override `updateFunction` to return `undefined`; offline-throttle alone insufficient)
- Plan file: to be drafted (next `/plan` run)

**Deferred from original v3.16.0 scope → v3.17.0:**
- 3 scenario presets, first-due solo IC mode, Quick-start FAB
- `Strut Placed` → `Strut Set` rename dual-write
- `customRoles` array → keyed object dual-write

### Release 5 — v3.17.0 (MINOR, TBD) ⏳ planned

**Goal:** Local-first defaults + pre-v4 schema dual-write window + carry-over fixes from v3.16.x field feedback.

- 3 scenario presets: "Car into building", "Residential partial collapse", "Light commercial partial collapse"
- First-due solo IC mode (progressive disclosure — single apparatus auto-selects)
- Quick-start FAB on Quick Find tab
- `Strut Placed` → `Strut Set` rename dual-write
- `customRoles` array → keyed object dual-write
- `assignedApparatus` array → keyed object (#79)
- Remaining schema migration prep for v4.0 cutover

**Carry-over from v3.16.x field feedback:**
- **One-shot role-hierarchy migration** — detect operations whose `customRoles` have Entry/Cutting reparented to IC or Runner missing under Cutting (legacy from pre-v3.16.0 defaults). Snap back to canonical or surface a one-tap "Reset to NIMS doctrine" toast for the IC. Closes Open Decision #6.
- **Drilldown search v2** — debounced filter that doesn't fight the drilldown tree state. Closes Open Decision #7 (was removed in v3.16.2).

_(Legend reposition, phone DnD disable, and #71 architectural fix were pulled forward into v3.16.3 / v3.16.4 on 2026-05-19 — see Release 3 and 4 above.)_

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
| 6 | Existing operations with broken role hierarchy (Entry/Cutting reparented to IC, Runner missing under Cutting) | **One-shot data migration in v3.17.0** — detect canonical-deviation `parentId`s and snap back. Until then: end + restart the operation OR have the IC manually rearrange via the new lock toggle |
| 7 | Should drilldown search return? | **Yes, eventually** — was removed in v3.16.2 as too buggy. Re-introduce in v3.17.0 with a debounced filter that doesn't fight the drilldown tree state |

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
- [ ] CLAUDE.md — "Known still pending" list stops at v3.9.1; pull the per-release detail forward to v3.16.x or fold it into the CONSOLIDATED-STATUS pointer
- [ ] Reconcile #71 status across docs — issue body and v3.15.0 row say "partial"; the underlying `firebaseSave` transaction-skip is still present (slated for v3.16.4)
- [ ] CLAUDE.md line-number drift — says `index.html ~line 60` for the version label; actual is line 74. Refresh on the next docs pass.

---

## Planning Session — 2026-05-19

- **Target release:** v3.16.3 (PATCH)
- **Plan file:** [v3.16.3-desktop-ui-hotfix.md](v3.16.3-desktop-ui-hotfix.md)
- **In scope:** 7 items (5 feedback bugs #97–#101 + legend reposition + phone DnD gate)
- **Split out:** #71 architectural transaction-resync fix → v3.16.4 PATCH (own plan to be drafted) due to blast-radius and verification complexity
- **Slate confirmed:** v3.16.3 → v3.16.4 → v3.17.0 (local-first defaults + carry-overs) → v3.18.0 (schema dual-write) → v4.0.0 (per-device UID + NIMS cutover + Cloud Function)
- **GitHub issues created via /feedbackreview:** #97, #98, #99, #100, #101 (Firebase queue cleared)
- **Agent review (5):** code-auditor, mobile-ux, devops-resilience, qa-driver, release-manager — all APPROVE for the revised v3.16.3 scope; key changes folded in (scoped CSS selector, `(pointer: coarse)` media query, modal Option C, explicit driver flows with `getBoundingClientRect()` capture + feedback-modal canary)
- **Resolved decisions:** Open Decisions #6 and #7 stay in v3.17.0 (NIMS doctrine reset + drilldown search v2); legend, phone DnD, and #71 promoted forward.
