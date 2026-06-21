# v3 → v4 Feature Parity Matrix

> **Living tracker.** The v4 redesign (`v4-redesign`) forked from `main` at **v3.19.1** (`a91a8e4`, 2026-05-20). Every v3 feature shipped **after** that fork must be carried into the v4 design — or be a conscious **decided-drop** — or it is silently lost when v4 is built (Phase I/J). This file is the concrete instrument behind the Phase J parity gate, [#256](https://github.com/Vergo402/paratech-struts/issues/256).
>
> **Maintain on every v3 MINOR/MAJOR** (CLAUDE.md release rule): add/refresh the shipped feature's row. Reconciliation runs **both directions** — §2 tracks v4 design decisions that owe a change back to the v3 app.
>
> Created 2026-06-07 from the v3↔v4 IT reconciliation audit.

## Legend

| Mark | Coverage |
|---|---|
| ✅ Covered | Represented in an accepted v4 design doc |
| 🟡 Deferred | Acknowledged, but its v4 surface/spec is pending a not-yet-written doc |
| 🔴 Gap | Not represented; at risk of being lost — needs a design action |
| ⚪ Decided-drop | Intentionally not carried into v4 (rationale noted) |
| ↩︎ Backport owed | A v4 design decision that mandates a change to the **v3** app |

## Baseline at audit time

- **Merge base:** `a91a8e4` — "mark v3.19.1 shipped"
- **`main`:** v3.21.2 (`9a2b98a`)
- **`v4-redesign`:** `a70772c` (Phase F, Session 3) — **7 of ~18 screen IA specs done**; Phases G–J not started. Phase status lives in [`00-INDEX.md`](../00-INDEX.md).
- **Tracking note:** v3 work is tracked on **Project 1** (FieldShore Roadmap); the v4 program on **Project 2** (v4 Redesign Roadmap). The two are separate boards.

---

## §1 — Post-fork delta (the at-risk set)

What `main` shipped **after** the v4 fork (`git log a91a8e4..main`). User-facing rows only; pure chores (path migration, manual sync, board logging) omitted because they carry no parity obligation.

| v3 ship | Feature | v4 | v4 design ref | Notes / action |
|---|---|---|---|---|
| **v3.20.0** ([#127](https://github.com/Vergo402/paratech-struts/issues/127)) | External / mutual-aid equipment inventory plumbing — external-dept equipment shows in Quick View + Inventory, deployable, source tracked for return | 🟡 | [`40-inventory.md`](../08-information-architecture/40-inventory.md) §Quick View + OQ #2; routed to Roster ([#297](https://github.com/Vergo402/paratech-struts/issues/297)) | Stock counts read in Inventory; per-row accountability + dept/apparatus badge + demob return visibility are **deferred to the unwritten Roster IA spec**. v3-side gap = [#283](https://github.com/Vergo402/paratech-struts/issues/283). **Top watch-item.** |
| **v3.21.0** + **v3.21.2** ([#119](https://github.com/Vergo402/paratech-struts/issues/119)) | Fractional measurement **display** — render measurements as legible fraction glyphs | ✅ | [ADR-012](../11-decisions/ADR-012-measurement-precision-eighth-inch.md) + [ADR-028](../11-decisions/ADR-028-inter-numerals-diagonal-fractions.md) + [`10-quick-find.md`](../08-information-architecture/10-quick-find.md) + [`typography.md`](../07-design-system/typography.md) | v4 renders 1/8″ floored **diagonal** fractions via the value font (Inter, numerals-only — [ADR-028](../11-decisions/ADR-028-inter-numerals-diagonal-fractions.md), [#317](https://github.com/Vergo402/paratech-struts/issues/317)); drops the super/subscript hack **and** the earlier hand-stacked digit-pair form. Field semantics identical. See §2 for the compute half. |
| **v3.21.1** ([#285](https://github.com/Vergo402/paratech-struts/issues/285)) | Auto-scroll strut recommendations into view on submit | 🟡 | [`10-quick-find.md`](../08-information-architecture/10-quick-find.md) (results above/below fold) | Micro-UX. IA places results but doesn't spell out scroll-on-submit. Verify in the Phase H slice. |

---

## §2 — Reverse obligations (v4 design → v3 backport owed)

v4 ADRs that mandate a change to the **v3 app** not yet made. Under the ship-v3-in-parallel posture these are v3 release candidates.

| v4 decision | Owed v3 change | Status | Ref |
|---|---|---|---|
| **ADR-012** (1/8″ floor-rounding) | Replace `Math.round`-to-nearest with an explicit **floor** at the cut-/effective-length sites (`app.js` ~189, ~573, ~5295, ~6395). Round-**down** is the safe direction — over-long is the hazard (gap / eccentric bearing / unreachable config). | ✅ **Shipped in v3.22.0** ([#300](https://github.com/Vergo402/paratech-struts/issues/300), 2026-06-07) — floored at the cut-/effective-length sites; the v3.21.x work had been *display* only. | [ADR-012](../11-decisions/ADR-012-measurement-precision-eighth-inch.md) §Scope / §Consequences |

→ **Done:** shipped in **v3.22.0** ([#300](https://github.com/Vergo402/paratech-struts/issues/300)) — `Math.round`→`Math.floor` to 1/8″ at the three live cut-/effective-length sites (app.js 189 / 6579 / 7692), disclaimer + extension warning retained.

---

## §3 — Standing v3 surfaces → v4 IA coverage (curated, living)

Major v3 screens/features mapped to their v4 design home. 🟡 Pending = the screen exists in v3 and the v4 spec is **not yet written** (Phase F continuing / Phase G). These are where a standing feature could still slip.

| v3 surface / feature | v4 | v4 design ref |
|---|---|---|
| Quick Find | ✅ | [`10-quick-find.md`](../08-information-architecture/10-quick-find.md) |
| Operations (ops, shore points, deploy) | ✅ | [`20-operations.md`](../08-information-architecture/20-operations.md); v3 Add-Shore-Point parity (field order, inline Find+Deploy as a per-op mode, Group/`assignedResource`, Estimated Load) restored per [ADR-027](../11-decisions/ADR-027-deploy-mode-and-v3-shore-point-entry.md). **Shore-point card dual-length** (Raw opening + Required strut length + deduction + load) and **division/area sort + filter** restored ([#248](https://github.com/Vergo402/paratech-struts/issues/248) re-drive — [`card.md`](../03-primitives/card.md) value-shelf + ADR-027). Command roll-up of `assignedResource` = Phase I |
| Cutting Station (cut → runner → secured → returned) | ✅ | [`21-cutting-station.md`](../08-information-architecture/21-cutting-station.md); lifecycle **+ the wood cut-length formula** (shore-type-fixed header/footer + 1.5″ wedge, no plates — `cutLengthInches`) **shipped 2026-06-21** ([#361](https://github.com/Vergo402/paratech-struts/issues/361)). The Cut/Set shelf reads the cut length from the cutting phase onward. |
| Command / SitStat | ✅ | [`30-command-sitstat.md`](../08-information-architecture/30-command-sitstat.md) |
| Org Chart (ICS roles, drag-assign, command transfer) | ✅ | [`31-org-chart.md`](../08-information-architecture/31-org-chart.md) |
| Hazard Log | ✅ | [`32-hazard-log.md`](../08-information-architecture/32-hazard-log.md) |
| Inventory (apparatus stock, ± stepper) | ✅ | [`40-inventory.md`](../08-information-architecture/40-inventory.md) |
| Excel import/export (ID + Plate-ID round-trip, orphan guard) | ✅ | [`40-inventory.md`](../08-information-architecture/40-inventory.md) §Excel |
| Visual-grid plate / wood picker | ✅ preserved verbatim | [`picker.md`](../03-primitives/picker.md), [`sheet.md`](../03-primitives/sheet.md) |
| **Deploy consumes + returns plate/extension stock per-rig** | ✅ data layer done · 🟡 re-sourcing UI deferred | [ADR-033](../11-decisions/ADR-033-sourced-bill-of-materials.md) / [#330](https://github.com/Vergo402/paratech-struts/issues/330) | v3 decrements strut **and** extensions **and** plates per-apparatus, each independently sourced — so "strut off Rescue 2, plate off Engine 1" works in v3. **ADR-033 Phases 1–3b shipped 2026-06-18** ([#330](https://github.com/Vergo402/paratech-struts/issues/330) closed): sourced bill-of-materials (each component stamped with its own rig), off-book path, interactive deploy resolution. The `ComponentResourced` event, reducer, and store guards also ship in Phase 2 and are tested. **Phase 4 (post-deploy re-sourcing editing UI) explicitly deferred** pending field evaluation (Alex, 2026-06-18: "test it and see how it goes") — recorded in [ADR-033](../11-decisions/ADR-033-sourced-bill-of-materials.md) §Phase 4. |
| **Roster** (Apparatus / External / Individuals / My-Role) | 🟡 Pending spec | [#297](https://github.com/Vergo402/paratech-struts/issues/297) (unwritten) |
| **Settings** (dept connect, data mgmt, feedback, theme) | 🟡 Pending spec | [#202](https://github.com/Vergo402/paratech-struts/issues/202) (unwritten) |
| **Checklists** — IC Command / Task Level / ORM-TCRM | 🟡 Pending spec | [#203](https://github.com/Vergo402/paratech-struts/issues/203) / [#204](https://github.com/Vergo402/paratech-struts/issues/204) / [#205](https://github.com/Vergo402/paratech-struts/issues/205) (Phase F next) |
| NIMS terminology (Strut Set / Wood Shore Secured / `assignedResource`) | ✅ | [ADR-008](../11-decisions/ADR-008-nims-org-structure.md), [`voice-and-tone.md`](../07-design-system/voice-and-tone.md) |
| Firebase RTDB + offline / local-first | ✅ retained | [ADR-009](../11-decisions/ADR-009-database-firebase-rtdb.md) |
| Anonymous Auth → per-device UID | ✅ inherited from the v3.x train | `.claude/plans/v4.0.0-plan.md` |
| Capacity / load-table ratings | ⚪ Demoted by design (not deleted) | [`06-synthesis.md`](../06-synthesis.md) §3.4 |
| Brand: FieldStruts → FieldShore (localStorage key migration) | ✅ | `index.html` migration shim; [ADR-013](../11-decisions/ADR-013-brand-emblem-full-color.md) (emblem) |

---

## §4 — Open gaps & watch-items

1. **External-equipment surface treatment** (🟡, the one live parity risk) — v3.20.0 ships dept/apparatus-badged external equipment on Quick View + demob return tracking; v4 defers the surface to the **unwritten Roster spec** ([#297](https://github.com/Vergo402/paratech-struts/issues/297), OQ #2 in `40-inventory.md`). v3-side gap = [#283](https://github.com/Vergo402/paratech-struts/issues/283). → ensure #297 carries it (acceptance criterion added 2026-06-07).
2. **ADR-012 floor-rounding v3 backport** (↩︎) — §2; not yet a tracked issue. Safety-relevant.
3. **Auto-scroll-on-submit** (v3.21.1) — verify carried in the Phase H slice.
4. **Pending IA specs** — Roster #297, Settings #202, Checklists #203–205 are where standing v3 features could still slip; not gaps yet, but the highest-leverage place to watch as Phase F/G continue.
5. **CLAUDE.md drift (`main` ↔ `v4-redesign`)** — the two `CLAUDE.md` files have forked: `v4-redesign`'s is ahead on the GitHub-Project section (the **two-board** structure incl. Project 2, the push-on-commit rule, closing-issues guidance) while `main`'s is ahead on the two-manual `.docx` rule. Reconcile in a dedicated pass (cherry-pick, don't blind-merge — same rename-conflict caveat as the branches).
6. **Wood cut-length formula** (✅ **SHIPPED 2026-06-21**, was 🔴 safety-relevant) — v3 computes a distinct cut length when a piece enters cutting (`app.js:6720` — `floor((opening − header − footer − 1.5″ wedge) × 8)/8`, **no plates**). Confirmed doctrine (Alex, 2026-06-21): the cut header/footer is **fixed by shore type** — 4×4 for T-Shore/Double-T, 6×6 for 3-Post — **decoupled from the strut-sizing deduction** (which stays the operator's free choice, v3.9.1). A **correction** of v3, whose cut formula uses the operator's *set* deductions (`member.deductions.header/.sole`) and so would mis-cut a T-Shore sized with 6×6. **→ Built:** `cutLengthInches(sp)` in `core/shorepoint`; the card Cut/Set shelf reads it for the cutting → returned phases (`ShorePointCard.tsx`); the dead `WEDGE_DEDUCTION` is now live. Tests pin all three shore types + the v3-correction ([#361](https://github.com/Vergo402/paratech-struts/issues/361)). **↩︎ v3 backport owed:** the same shore-type-fixed correction likely applies to v3's `cutLength` (separate Project-1 look).

---

## Maintenance

- Update on every v3 MINOR/MAJOR (CLAUDE.md release rule). Just append/adjust rows — no need to re-baseline.
- **Phase J parity gate ([#256](https://github.com/Vergo402/paratech-struts/issues/256)):** every §1/§3 row must be ✅ Covered or ⚪ Decided-drop, and every §2 obligation resolved, before cutover.
