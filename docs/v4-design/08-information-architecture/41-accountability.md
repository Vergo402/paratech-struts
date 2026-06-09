# IA Spec: Accountability

> Phase F information-architecture spec. Cites [`00-ia-foundation.md`](00-ia-foundation.md) for all cross-cutting rules (tab map, navigation, modal-vs-sheet row, four-surface framework, persistent chrome) and does not re-derive them.
> **Renamed from "Roster" → "Accountability" at the #217 gate (Alex, 2026-06-08)** — the screen covers apparatus + external/mutual-aid equipment + individuals, not personnel only, so "Roster" (which reads personnel-only) was misleading. Still tracked as GitHub [#297](https://github.com/Vergo402/paratech-struts/issues/297).
> Source: [`06-synthesis.md`](../06-synthesis.md) **rec I-7** (per-row sync state — the PAR test case) + §1.7 (local-first / sync realism); the **Command-vs-Accountability boundary** drawn in [30-command-sitstat.md](30-command-sitstat.md) and the **Inventory-vs-Accountability** split in [40-inventory.md](40-inventory.md); [Principle 10](../02-principles.md) (no in-app comms / no push / no safety-hold); [ADR-009](../11-decisions/ADR-009-database-firebase-rtdb.md) (event log + per-device UID → per-row sync), [ADR-008](../11-decisions/ADR-008-nims-org-structure.md), [ADR-014](../11-decisions/ADR-014-tab-structure.md)/[015](../11-decisions/ADR-015-navigation-pattern.md)/[016](../11-decisions/ADR-016-modal-vs-sheet-rules.md). Reference precedents (nominative fair use, [`04-references/`](../04-references/)): Tablet Command's work-time PAR gradient, First Due's configurable PAR timer, IAMResponding's live responder roster + status pills. Grounded in v3 `renderAssignedApparatus()` (app.js:4947), `renderExternalEquipmentList()` (5010), `renderIndividualsList()` (5028) — all rendered **under Command** in v3; **the per-row sync + accountability lens is net-new** (the lists exist; the sync/PAR visibility does not). GitHub [#297](https://github.com/Vergo402/paratech-struts/issues/297).

---

## Purpose

The **accountability + sync lens** on the incident's resources: every assigned apparatus, external/mutual-aid item, and individual as a row that shows whether it is **here and current** — its per-row sync state — so that when a Personnel Accountability Report is conducted (by doctrine, over the radio / face-to-face), the Incident Commander can **trust the accountability view**, with each row's freshness available on tap. Command is where resources are *assigned*; **Accountability** is where their readiness is read.

## Where it lives

- **Tab / parent:** **Inventory** — a screen nested under the Inventory tab (per the [tab map](00-ia-foundation.md), [ADR-014](../11-decisions/ADR-014-tab-structure.md)). Its sibling is [Inventory](40-inventory.md) itself: **Inventory owns stock counts; Accountability owns who/what is here and synced** (the foundation decision, restated in [40-inventory.md](40-inventory.md) §"Per-row sync lives in Accountability, not here").
- **How it is reached:** a sub-nav entry under Inventory; and it is the **detail destination of the shell's ambient sync indicator** — the one quiet global dot says *something* is pending, Accountability says **which rows** ([`00-ia-foundation.md`](00-ia-foundation.md) §Persistent chrome).
- **Issue:** [#297](https://github.com/Vergo402/paratech-struts/issues/297).

## Primary role(s) and surface(s)

- **Primary role(s):** the **Incident Commander** / **Operations Section Chief** / whoever owns accountability reads it; every device contributes its own presence/sync (NIMS titles spelled out — [ADR-008](../11-decisions/ADR-008-nims-org-structure.md)).
- **Primary surface(s):** **phone is the floor** (read the accountability list, check a row, gloved). Tablet is the CP accountability board; laptop adds density + after-action accountability; broadcast projects a read-only accountability board.

## Information hierarchy (above / below fold) — per surface

### Phone (the floor)
- **Above fold:** the **resource list** in its three groups (assigned apparatus · external/mutual-aid equipment · individuals), each row carrying name + assignment + **per-row sync state** (synced / pending — text, never color alone). **Pending rows surface first** — accountability cares about what it can't yet vouch for.
- **Below fold:** fully-synced rows; a group/sync-state filter; a row's sync-detail entry.

### Tablet (CP)
- **Above fold:** the accountability board — the three groups as columns with per-group counts; tap a row → its sync detail in an inline panel.

### Laptop (Toughbook)
- **Above fold:** denser, keyboard-navigable; the after-action **accountability snapshot** (the PAR-record export) is this surface's affair.

### Broadcast TV (read-only projection)
- A read-only **accountability board** — names + sync state at ≥ 32pt; **no interactive primitives**, no overlays, no animation. The whole-room glance is *who is accounted for and current*.

## Primary action + secondary actions

- **Primary action (one — Principle 4):** **read accountability** — scan the list and its per-row sync state; the actionable primary is opening a row's **sync detail** in a [`sheet`](../03-primitives/sheet.md) (**last-synced time / freshness**, pending writes, device — the [`00-ia-foundation.md`](00-ia-foundation.md) modal-vs-sheet **Accountability** row: "per-row sync detail | Sheet").
- **Secondary actions:** filter by group or sync state. **Assignment itself happens on [Command](30-command-sitstat.md)** — Accountability cross-refs it, it does not duplicate it.
- **Destructive / terminal:** **none in the common path** (the ADR-016 Accountability row — no destructive overlay). Removing/re-homing a resource is a Command/Inventory action, not an Accountability one.

## Composed primitives

- [x] [list](../03-primitives/list.md) — the three grouped resource lists (apparatus / external / individuals) + their rows; doctrine order, not alphabetical.
- [x] [badge](../03-primitives/badge.md) — the **per-row sync indicator** (synced / pending — a badge **with text**, never color alone, Principle 9); the role/assignment badge; a per-group count.
- [x] [sheet](../03-primitives/sheet.md) — the **per-row sync detail** (last-synced time / freshness, pending writes, device) — the ADR-016 Accountability row.
- [x] [segmented](../03-primitives/segmented.md) — a scope/filter (assigned · external · individuals, or all · pending).
- [x] [empty-state](../03-primitives/empty-state.md) — no resources assigned yet (first-run → assign on Command); the **all-clear** variant ("All resources synced").
- [x] [button](../03-primitives/button.md) — filters; the accountability/PAR-snapshot export (below).
- [ ] picker · card · modal · input · toggle · slider · toast · loading-state · nested-checklist · warning-gate — not core.

> **A new primitive would be a gate escalation, not a spec decision.**

## The resource list (faithful to v3, with the accountability lens added)

Three groups, carried verbatim from the v3 Command rosters but re-homed here and re-lensed:

| Group | v3 source | Row shows (v4) |
|---|---|---|
| **Assigned apparatus** | `renderAssignedApparatus()` | name + type + its ICS assignment ([Org Chart](31-org-chart.md)) + **sync state** |
| **External / mutual-aid equipment** | `renderExternalEquipmentList()` | item + **source department** (for return) + availability + **sync state** |
| **Individuals** | `renderIndividualsList()` | name + ICS position + **sync state** |

**External / mutual-aid accountability lives here** — resolving [40-inventory.md](40-inventory.md) OQ2: the *stock* of external equipment reads in [Inventory](40-inventory.md); its **accountability and return-to-source** read on Accountability. Same item, two lenses (the same discipline as Command↔Accountability).

## Per-row sync — the heart of rec I-7

From [ADR-009](../11-decisions/ADR-009-database-firebase-rtdb.md)'s event-log + per-device UID, each row's **face** shows whether its latest state is:

| State | Meaning | Signal (never color alone — Principle 9) |
|---|---|---|
| **Synced** | committed to the server | label + filled dot |
| **Pending** | queued locally, not yet flushed | label + half dot |

**Freshness is on tap, not on the face** (the #217 gate — Alex's "keep it simple"): the row face shows only synced / pending; **how old** a row's information is (last-synced / last-seen time) lives in its **sync-detail [`sheet`](../03-primitives/sheet.md)**, read on demand — there is **no passive "stale" greying or aging of rows**. The global sync dot (shell chrome) says *something* is pending; Accountability says *which rows*, with each row's freshness one tap away.

## PAR & Principle 10 — visible accountability, never an alarm (the load-bearing rule)

A Personnel Accountability Report is conducted **by doctrine, over the radio / face-to-face.** FieldShore's job is to make the accountability view **trustworthy for that PAR** — visible per-row sync (synced / pending) with freshness on tap — **not** to become the PAR itself. Per [Principle 10](../02-principles.md) (no in-app comms / no push / no safety-hold), Accountability **does not** issue PAR alarms, countdown timers with audible alerts, or push notifications — the reference apps' automated PAR reminders (Tablet Command, First Due) are described as precedent but **deliberately not adopted**. v4.0 also does **not** show a passive staleness / work-time gradient on the row face (the #217 "keep it simple" decision); freshness is available on tap. The line holds: calm, on-demand information is permitted; an active alarm/notification is comms (forbidden). This is the same posture as the [Hazard Log](32-hazard-log.md)'s no-safety-hold and the [ORM/TCRM](23-orm-tcrm.md) briefing's not-a-gate.

## Locked cross-cutting rules this screen honors

- [x] **Phone is the floor** — read the accountability list, check a row, open sync detail — all phone-only.
- [x] **No in-app comms / no push / no safety-hold** (Principle 10) — **the** rule here: accountability is made *visible*, never alarmed or gated.
- [x] **Color never alone** — every sync state is a label + shape, not a hue (Principle 9).
- [x] **NIMS terminology** — apparatus types + spelled-out ICS positions ([ADR-008](../11-decisions/ADR-008-nims-org-structure.md), [`voice-and-tone.md`](../07-design-system/voice-and-tone.md)).
- [x] **Command-vs-Accountability boundary** — Command owns structure + assignment; Accountability owns accountability + sync; cross-ref, don't duplicate ([30-command-sitstat.md](30-command-sitstat.md)).
- [x] **Tap geometry** — 56pt rows (accountability is read during an incident); 8pt dead zones ([`spacing-grid.md`](../07-design-system/spacing-grid.md)).
- [x] **Modal-vs-sheet** — the ADR-016 Accountability row: sync detail = sheet; no destructive overlay in the common path.
- [x] **Persistent sync indicator is the shell's** — Accountability is its per-row detail destination ([`00-ia-foundation.md`](00-ia-foundation.md) §Persistent chrome).
- [x] **Capacity demoted** — not a datum here.

## The four-surface table (this screen)

| Dimension | Phone | Tablet (CP) | Laptop | Broadcast |
|---|---|---|---|---|
| Layout | single-column grouped accountability list | three-group board + inline detail | dense + keyboard + export | read-only accountability board |
| Above fold | pending rows first; per-row sync | groups as columns + counts | groups + accountability snapshot | names + sync state |
| Primary-action affordance | tap row → sync-detail sheet | tap row → inline panel | keyboard + export | — (read-only) |
| Added density | filter | per-group columns | after-action PAR snapshot | — |
| Does NOT render | — | — | — | overlays, filters, any control |

## Empty / error / loading states

(Posture set in [`00-ia-foundation.md`](00-ia-foundation.md) §Cross-cutting empty / error / loading.)

- **Empty — no resources assigned:** the first-run [`empty-state`](../03-primitives/empty-state.md) — set-glyph + "No resources assigned" + a pointer to assign on [Command](30-command-sitstat.md) (upstream-blocked variant).
- **Empty — all synced:** the **all-clear** [`empty-state`](../03-primitives/empty-state.md) — "All resources synced" (a calm success state, not a void); the accountability list remains listed.
- **Error:** a **failed sync is not an error modal — it is the row's state** (pending); that is the feature, not a failure. A genuine system error resolves inline; never `alert()`.
- **Loading:** local-first — the accountability list renders instantly from local state; a fresh hydration is the only real wait ([`loading-state.md`](../03-primitives/loading-state.md)).

## Accessibility / screen-reader notes

**Cite [`accessibility.md`](../07-design-system/accessibility.md), do not restate.**
- Each row announces *resource · assignment · sync state as words* — "Engine 12, Shoring Group, synced"; "Firefighter Diaz, Rescue Group, pending sync" — the sync state is a spoken word, never color-only ([`accessibility.md`](../07-design-system/accessibility.md) §Screen-reader scripts; extend the registry with this screen's sync-row script). The detail sheet announces the freshness / last-synced time.
- The sync-detail [`sheet`](../03-primitives/sheet.md) is focus-trapped with labeled fields; the group/sync filter ([`segmented`](../03-primitives/segmented.md)) uses roving-tabindex per its primitive.
- Power Select gives any in-sheet picker a native `<select>` fallback under VoiceOver/TalkBack-or-Settings.

## Open questions (per-screen)

1. ~~**PAR — passive display vs. active alert.**~~ **RESOLVED at the #217 gate (Alex, 2026-06-08):** **no passive staleness display.** The row face shows **synced / pending only**; freshness (last-synced time) is on-tap in the sync-detail sheet; no greying/aging, no alarm/sound/push (Principle 10). "Keep it simple."
2. **Freshness detail + thresholds** — what the per-row detail sheet shows for last-seen / last-synced, and any "how old" labels, depend on [ADR-009](../11-decisions/ADR-009-database-firebase-rtdb.md)'s event/heartbeat data; affordance + threshold detail for the Phase H slice. (The row face stays synced / pending only — gate decision above.)
3. **Accountability / PAR-snapshot export** — whether Accountability exports a point-in-time PAR record (likely yes; the format is shared with the Audit Log work, [#211](https://github.com/Vergo402/paratech-struts/issues/211)); finalized there.
4. **External / mutual-aid return mechanics** — the return-to-source flow (accountability here, stock in [Inventory](40-inventory.md)) is resolved in the Phase G operations/return workflow.
