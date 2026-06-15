# Phase I — Tab Build Sequence (DRAFT)

> **Status: DRAFT reference.** The binding Phase I build order is ratified by [#250](https://github.com/Vergo402/paratech-struts/issues/250) **after the [#248](https://github.com/Vergo402/paratech-struts/issues/248) Phase H gate clears** — not here. This doc exists so the four non-Operations tabs are visible and roughly sequenced while the slice is still being re-driven. Orientation, not commitment.

---

## Why there is no "build Quick Find" line item

Phase I ([#137](https://github.com/Vergo402/paratech-struts/issues/137)) builds the app **one workflow at a time, not one tab at a time.** A tab is a container that fills in as its workflows land — so no single unit of work is "the Quick Find tab." Each tab below decomposes into one or more Phase G workflows. The board now carries a coarse placeholder per tab — [#320](https://github.com/Vergo402/paratech-struts/issues/320) Quick Find · [#321](https://github.com/Vergo402/paratech-struts/issues/321) Settings · [#322](https://github.com/Vergo402/paratech-struts/issues/322) Inventory · [#323](https://github.com/Vergo402/paratech-struts/issues/323) Command — for visibility, but the real scheduling lives in the workflow sequence (#250).

The Phase H slice deliberately built **only** the Operations spine (Start operation → Add shore point → Deploy strut) to prove the load-bearing path — the event-log data seam, the status doctrine, the group lockstep — before the supporting tabs get built on the same proven pattern.

## Design status: all four are DONE

Every tab has a signed Phase F screen spec (× 4 surfaces). The blueprints exist; only the build is pending.

| Tab | Phase F spec | Code today | Build scope | Dependencies | Cost · slot |
|---|---|---|---|---|---|
| **Quick Find** | [#198](https://github.com/Vergo402/paratech-struts/issues/198) · [`10-quick-find.md`](../08-information-architecture/10-quick-find.md) | stub `src/app/routes/quickfind.tsx`; `MeasurementInput` + `DeductionPicker` + `RecommendationCard` already built & live in Add Shore Point | standalone results screen wiring the ported capacity engine to the existing inputs + rec cards; no-match empty state; planning-aid disclaimer | none — all parts exist | **small · 1st** |
| **Settings** | [#202](https://github.com/Vergo402/paratech-struts/issues/202) (+ deeper pass [#308](https://github.com/Vergo402/paratech-struts/issues/308)) · [`50-settings.md`](../08-information-architecture/50-settings.md) | **partly built** `settings.tsx` (theme + native-controls toggle live) | (a) **core/connection** = dept registration/connection + identity ("auth"); (b) **admin** = RBAC (ADR-017 / [#304](https://github.com/Vergo402/paratech-struts/issues/304)), after-action toggle (ADR-018 / [#305](https://github.com/Vergo402/paratech-struts/issues/305)), data mgmt/export | data/sync seam + auth model | **medium, split · core 2nd, admin late** |
| **Inventory** | [#200](https://github.com/Vergo402/paratech-struts/issues/200) (+ Excel/CSV redesign [#307](https://github.com/Vergo402/paratech-struts/issues/307)) · [`40-inventory.md`](../08-information-architecture/40-inventory.md) | stub `inventory.tsx` (count only) | apparatus + strut mgmt; Excel/CSV import-export redesign; plate/connector photos; **extension + base-plate stock decrement deferred from Phase H** (strut-only today) | data layer (Dexie store exists); deploy/return txns | **large · 3rd** |
| **Command (SitStat)** | [#201](https://github.com/Vergo402/paratech-struts/issues/201) · [`30-command-sitstat.md`](../08-information-architecture/30-command-sitstat.md) | stub `command.tsx` | SitStat roll-up (who's-on-what), Command Picture, ICS org chart, division/area summaries | **operations data must accrue first** (ADR-027 ships per-card `assignedResource` now for exactly this) + RBAC + multi-OP / command-transfer | **largest, most dependent · last** |

## Proposed build order (draft)

1. **Quick Find** — smallest. Its inputs and the recommendation card are already built and live inside Add Shore Point. Build is a standalone results screen wiring the ported capacity engine to those existing parts. The app's front door, and it de-risks the engine in a standalone context. No dependencies.
2. **Settings (core / connection)** — the department-connection + identity half ("auth" in the epic's sketched order). Foundational for multi-device, so it comes early; the theme picker already ships.
3. **Inventory** — apparatus + strut management, the Excel/CSV import-export redesign, plate/connector photos, and the extension + base-plate stock decrement deferred from the slice. Heavier; leans on the data layer.
4. **Command (SitStat)** — the who's-on-what roll-up, Command Picture, and org chart. Largest and most dependent: it needs operations data to have accrued (which is why per-card `assignedResource` ships now, per ADR-027), plus RBAC and the multi-OP / command-transfer workflows.
5. **Settings (admin)** — RBAC, after-action auto-email toggle, data management/export. Lands alongside or after Command.

This maps onto the epic's sketch — *auth → operations → checklists → admin → mutual-aid* — with Quick Find as a standalone calculator that can slot in early.

## How this gets ratified

When Alex signs off [#248](https://github.com/Vergo402/paratech-struts/issues/248), [#250](https://github.com/Vergo402/paratech-struts/issues/250) turns this draft into the real workflow-level sequence — the checklists, command-transfer, mutual-aid, and auth workflows from Phase G interleave with these tabs. At that point the four coarse placeholders ([#320](https://github.com/Vergo402/paratech-struts/issues/320)–[#323](https://github.com/Vergo402/paratech-struts/issues/323)) get decomposed into per-workflow build issues, one per session ([#251](https://github.com/Vergo402/paratech-struts/issues/251)).
