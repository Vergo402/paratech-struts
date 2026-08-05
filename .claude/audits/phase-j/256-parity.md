# Phase J Gate Audit — #256 — v3 → v4 Feature Parity

**Date:** 2026-07-28
**Scope:** v4 (`src/`, `v4-redesign`) vs v3 (root `app.js`/`index.html`, production `main`) — every v3 feature shipped after the v4 fork (v3.19.1), plus a code-level spot-check of 10 core workflows regardless of matrix claims.
**Method:** Read `docs/v4-design/12-parity/v3-feature-parity.md`; independently verified every row's coverage claim against `src/` (2 parallel research passes, cross-checked manually); diffed `git log a91a8e4..origin/main` for post-baseline v3 releases; spot-checked 10 core workflows end-to-end in v4 source.

## Verdict: **PASS-WITH-CONDITIONS**

The matrix's coverage claims hold up — 14 of 16 verified rows check out with solid code evidence, all 10 independently spot-checked core workflows have genuine (non-stub) v4 implementations, and no v3 MINOR/MAJOR has shipped since the matrix's last sync that isn't already accounted for. Two items keep this from a clean PASS:

1. **A live, safety-relevant catalog conflict** between v3 (production, as of v3.22.3) and v4 over whether the LongShore LS 812 strut is real — this needs a decision before cutover, not just a doc update.
2. **The matrix itself is stale in three places** (Settings, Checklists, Roster all marked "🟡 Pending spec" but are fully built) — doesn't block cutover on its own, but the matrix is the named instrument for this gate and should be trustworthy before it's used to sign off.

Neither finding is in the known #447–#480 / #445 / #446 triage set — both are new.

---

## 1. LS 812 strut catalog conflict — NEW FINDING, safety-relevant

**v3 production** (`origin/main`, commit `1ca2933`, shipped as `v3.22.3`, 2026-07-03) **removed** the LongShore LS 812 (92"–147") from `STRUTS[]`, with this reasoning in the commit message:

> "Confirmed against Paratech's live website and Product Catalog v.19 — the LongShore line is exactly five sizes... An older fire-trade magazine article listing a sixth 92-147" size is outdated. Carrying LS 812 let the strut finder recommend a strut nobody stocks."

**v4** (`src/core/load/struts.ts:4-10,33`) **keeps** LS 812, with a code comment arguing it's real (cites a Paratech part number `22-796370`) and notes it was "briefly removed 2026-06-14 on an incomplete sheet, restored once the brochure surfaced the part number." `struts.test.ts:35-36` pins this decision with an explicit test.

This is a direct, dated contradiction:
- v4's decision to keep LS 812 (2026-06-14) **predates** v3.22.3's investigation (2026-07-03), which explicitly checked the live Paratech website + Product Catalog v.19 — sources v4's comment doesn't cite checking.
- The consequence flagged in the v3 commit — "the strut finder recommend[ing] a strut nobody stocks" — is a live safety/logistics concern (a Quick Find hit on the wrong model in the field), not cosmetic.
- v4's root `app.js` copy on this branch is also one patch behind (`v3.22.2`, missing `1ca2933`), confirming this is a genuine unresolved cross-branch gap, not a stale checkout artifact on my end.

**This is not on the parity matrix at all** (v3.22.1–v3.22.3 are PATCH releases, and CLAUDE.md's matrix-maintenance rule only requires MINOR/MAJOR rows) — but a catalog correctness conflict between what v3 ships today and what v4 will ship is exactly the kind of thing the Phase J gate exists to catch.

**Recommendation:** route to `structural-collapse-sme` to re-verify LS 812 against the same sources v3.22.3 cites (live Paratech site + Catalog v.19) before cutover. Either v3.22.3 was right and v4's catalog needs the same fix, or v4's part-number evidence overrides v3.22.3's finding and v3 needs a revert — but it can't be left unresolved into the v4 ship.

Evidence:
- `src/core/load/struts.ts:4-10` (v4's justification comment) / line 33 (`ls-812` entry)
- `src/core/load/struts.test.ts:35-36` (pinning test)
- `origin/main` commit `1ca2933567cf7e060d248cb3ed575b10d0d5d3fd` (v3.22.3 commit message + diff)
- root `app.js` on `v4-redesign` vs `origin/main` diff (confirms branch lag, unrelated to the src/ conflict)

---

## 2. Parity matrix is stale — three rows understate v4 progress (not a risk, but a gate-hygiene issue)

The matrix (`docs/v4-design/12-parity/v3-feature-parity.md` §3) marks these "🟡 Pending spec":

| Matrix row | Claim | Actual state in `src/` |
|---|---|---|
| Roster (#297) | "unwritten" | `src/ui/hooks/useRoster.ts`, `src/ui/command/RosterStrip.tsx` exist and are wired (git history shows Phase F Session 5 IA spec + a Roster→Accountability rename, `fbbb7e6`) |
| Settings (#202) | "unwritten" | Fully built: `src/app/routes/settings/{AccountPage,AdministrationPage,ApparatusTypesPage,AppearancePage,DataManagementPage,DepartmentPage,HelpReferencePage,SettingsIndex}.tsx` — 8 pages, 1500+ lines, tests alongside each |
| Checklists — IC Command / Task Level / ORM-TCRM (#203–205) | "unwritten" | Fully built: `src/core/checklist/`, `src/core/schema/checklist.ts`, `src/ui/checklists/`, `src/ui/operations/TaskLevelChecklist.tsx`, `src/ui/command/ICCommandChecklist.tsx`, `src/ui/onboarding/ChecklistHub.tsx`, `src/data/store/checklistTemplateStore.ts` (git: Phase F Session 4 IA specs, `cffad8e`) |

None of these are gaps — they're **more done than the matrix says**, which is a false-negative direction (safe), but a matrix that's wrong in either direction can't be trusted as the "every row must be ✅ or ⚪ before cutover" gate instrument it's designed to be (per the matrix's own §Maintenance note and CLAUDE.md's per-MINOR/MAJOR update rule). Recommend a refresh pass on §3 before the Phase J gate closes.

---

## 3. Matrix row verification — full table

Both a code-level matrix-row audit and an independent 10-feature spot-check were run in parallel; results cross-confirm.

| # | Row | Verdict | Evidence |
|---|---|---|---|
| 1 | Quick Find (calc, deductions, filter chips) | ✅ Verified | `src/core/load/engine.ts:96` `findStrutCombinations()` — header/sole/topPlate/bottomPlate deductions (L.123-125), extension combos w/ system rules (Gold=1, Grey/LockStroke=2 ≤36", L.162-199), qty>4 sentinel preserved (L.234-239); `src/ui/quickfind/QuickFind.tsx` |
| 2 | Operations — dual-length card, division/area sort+filter, ADR-027 deploy mode | ✅ Verified | `RecommendationCard.tsx:162-166,329-330`; `OpsFilterSheet.tsx:39-48`; `OperationsBoard.tsx:262` |
| 3 | Cutting Station lifecycle + `cutLengthInches` (shore-type-fixed, no plates, 1.5" wedge) | ✅ Verified | `src/core/shorepoint/reducer.ts:222-238` — lumber fixed by shore type, `WEDGE_DEDUCTION=1.5` (`core/load/plates.ts:83`), no plates in formula |
| 4 | Command / SitStat | ✅ Verified | `src/core/command/sitstat-rollup.ts`, `src/ui/command/SitStat.tsx`, `SitStatRollup.tsx` |
| 5 | Org Chart (drag-assign, roles, command transfer) | ✅ Verified | `OrgConnectors.tsx`, `useOrgDragDrop.ts`, `NodeSheet.tsx`, `TransferCommand.tsx`, `AddCustomTitleModal.tsx` |
| 6 | Hazard Log | ✅ Verified | `src/core/hazard/reducer.ts` (`HazardLogged`/`Mitigated`/`Reopened`, idempotent-by-id), `src/ui/command/HazardLog.tsx` |
| 7 | Inventory (apparatus stock, stepper) | ✅ Verified | `src/ui/inventory/EquipmentRow.tsx`, `InventoryScreen.tsx` |
| 8 | Excel/CSV round-trip (ID + Plate ID, orphan guard) | ✅ Verified | `src/data/inventory/excel.ts:7-18` (RFC-4180, ID + Plate ID cols); `inventoryStore.ts:72-86` (`sameIdentity`/`sameKind` orphan guards) |
| 9 | Visual-grid plate/wood picker | ✅ Verified | `src/ui/picker/VisualGridPicker.tsx`, used in `DeductionPicker.tsx` |
| 10 | Deploy sourced BOM per-rig (ADR-033) | ✅ Verified (Phase 4 correctly still deferred) | `inventoryStore.ts` event-owned `available`; `DeployResolution.tsx` |
| 11 | NIMS terminology (Strut Set / Wood Shore Secured / `assignedResource`) | ✅ Verified | `src/core/shorepoint/status.ts:12-19`; `src/core/schema/shorepoint.ts:126` — old `group` field fully replaced |
| 12 | Firebase RTDB + offline/local-first (no if/else fork) | ✅ Verified | Dexie `src/data/store/db.ts`; sync seam `src/data/sync/index.ts`; `operationStore.ts` commits always write local, sync is additive (`enqueue` gated on `!fromRemote`, not a branch) |
| 13 | Anonymous Auth → per-device UID | 🟡 Verified but stale wording | `authSession.ts:47-49` binds to Firebase `user.uid`, but per-account (not per-device) binding shipped 2026-07-11 (positions follow the account). Row should be reworded, not a coverage gap. |
| 14 | Brand FieldStruts→FieldShore | ✅ Verified | Zero `FieldStruts` hits in `src/`; `AppHeader.tsx` hardcodes "FieldShore" |
| 15 | Fractional display, 1/8" diagonal (ADR-028) | ✅ Verified | `src/ui/primitives/Measurement.tsx:3-6,33,48` — `eighthsToParts`, `font-variant-numeric: diagonal-fractions` |
| 16 | Auto-scroll results into view (v3.21.1) | 🟡 Not found as literally stated, but superseded | No `scrollIntoView` outside tests. Superseded by ADR-031: results render in a dismissible `Sheet` (`QuickFind.tsx:19-22`), which moots the original scroll-on-submit fix. Matrix's own 🟡 flag was correctly cautious; row should read "N/A — superseded by ADR-031" rather than stay open. |

**Spot-checked core workflows (independent of matrix rows) — all 10 verified, no stubs/TODOs found:**

| # | Workflow | Evidence |
|---|---|---|
| 1 | Quick Find matching + deductions | `engine.ts:96` (see row 1 above) |
| 2 | Excel/CSV round-trip | `excel.ts` (see row 8) |
| 3 | Grouped SP phase-based split | `src/core/operation/reducer.ts:41-84` `groupAdvance()` — `GROUP_ZONE=['process','strutset','cutting']`; refined from v3's "catch up to target" to lockstep-only (documented as deliberate, safer) |
| 4 | Org chart + role assignment | `useOrgDragDrop.ts`, `AddCustomTitleModal.tsx`, `orgReducer.ts` |
| 5 | Command transfer, gated | `TransferCommand.tsx` (two-party Initiated/Accepted handshake — stronger than v3's direct reassignment), gated via `useIsIC()` |
| 6 | Feedback submission | `src/data/feedback/feedbackService.ts:37-45` — writes category/text/timestamp/deptId/deptName/appVersion/uid, member-gated |
| 7 | Dexie local-first, no if/else fork | confirmed repo-wide — no `if(db){}else{}` pattern found |
| 8 | Archive / re-open (ADR-036) | `OperationReopened` event (`event.ts:53`), reducer (`operation/reducer.ts:135`), `projectArchive()` |
| 9 | Hazard log | (see row 6 above) |
| 10 | Numbered divisions | `src/core/operation/division.ts` — signed-integer floor model, `parseDivisionNumber()` rejects free text |

---

## 4. Completeness check — v3 releases since the matrix baseline

Matrix baseline: `main` at v3.21.2 (`9a2b98a`). Current `origin/main`: **v3.22.3**.

| Release | Type | In matrix? | v4 status |
|---|---|---|---|
| v3.22.0 (#300 floor-rounding, #80 descoped, #284 DRY) | MINOR | ✅ §2 backport row, marked done | Confirmed shipped both sides |
| v3.22.1 (LockStroke 3rd size fix, 37-58→36-57) | PATCH | Not required by rule | ✅ v4 already matches (`struts.ts:38`) |
| v3.22.2 (base plate Multi-Base rename + 2 metric channels) | PATCH | Not required by rule | ✅ v4 already matches (`plates.ts`, dimension-first naming convention predates this) |
| v3.22.3 (LS 812 removal) | PATCH | Not required by rule | 🔴 **Not reflected — see Finding 1** |

No MINOR/MAJOR has shipped past v3.22.0, so nothing is silently missing from the matrix's row set on completeness grounds. The one gap found (LS 812) is a PATCH-level catalog correction that fell outside the matrix's maintenance trigger but is still a real cross-app data conflict.

---

## 5. Known items — not re-reported

Per instructions, board issues #447–#480 (Stage 0 triage, `TRIAGE-2026-07-28.md`) and buckets #445/#446 are already tracked and excluded from this report.

---

## Summary for the gate

- **§1/§3 matrix rows:** 14/16 solid, 2 need wording fixes (not coverage gaps).
- **10 spot-checked core workflows:** all genuine, none stubbed.
- **No silent MINOR/MAJOR parity loss.**
- **One new safety-relevant finding:** LS 812 catalog conflict between v3.22.3 (production) and v4 — needs adjudication before cutover.
- **One new gate-hygiene finding:** matrix understates Settings/Checklists/Roster completion — refresh before relying on it to sign off Phase J.

---
## Gate decisions (Alex, 2026-07-28)
- **LS 812: REMOVED from the v4 catalog** to match v3.22.3 production (v.19 catalog + live site outrank the older brochure part number; a department owning one tracks it as external equipment). Applied in the Stage A fix batch with an anti-reintroduction comment in struts.ts.
- **Matrix staleness**: refreshed in the Stage A fix batch (Settings/checklists/Roster → Covered; per-device UID row superseded by per-account binding; auto-scroll row superseded by ADR-031).
