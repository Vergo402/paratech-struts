# IA Spec: Audit Log

> Phase F information-architecture spec. Cites [`00-ia-foundation.md`](00-ia-foundation.md) for all cross-cutting rules and does not re-derive them.
> Source: the master plan **D7.5** (audit logging — every state-changing action logged with user UID, role-at-time, device, timestamp, before/after; queryable per incident + per user; for after-action and liability); [`06-synthesis.md`](../06-synthesis.md) **§3.6** ("**audit log == event log**" — a filtered view of the same append-only event log that drives persistence; ICS reconstruction is a query, not a parallel record) + §1.2 (v3's Surfside TTX-2 produced *zero* audit trail across IC/Ops transitions); [ADR-009](../11-decisions/ADR-009-database-firebase-rtdb.md) (event-sourced; current state is a projection), [ADR-008](../11-decisions/ADR-008-nims-org-structure.md) (NIMS terms in entries), [ADR-016](../11-decisions/ADR-016-modal-vs-sheet-rules.md), [ADR-014](../11-decisions/ADR-014-tab-structure.md)/[015](../11-decisions/ADR-015-navigation-pattern.md). The foundation folds **After-Action into this screen as its laptop surface** ("filters and formatting, not data collection"). **Net-new UI** — v3 has only `logSyncEvent()` backend diagnostics (app.js:~1617, no UI), unlogged `customRoles` mutations, and a text-only op-archive. GitHub [#211](https://github.com/Vergo402/paratech-struts/issues/211).

---

## Purpose

The **queryable read of the incident's append-only event log**: every state-changing action — shore-point advance, strut deploy, hazard added, role assigned — shown as *who did what, when, and what changed*. It is also the **after-action / export convergence point**: the ICS-form assembly and every export resolve here.

## Where it lives

- **Tab / parent:** **Settings** — a first-class admin screen nested under Settings (per the [tab map](00-ia-foundation.md), [ADR-014](../11-decisions/ADR-014-tab-structure.md)), one tap from its Administration gateway.
- **How it is reached:** the [Settings](50-settings.md) Administration gateway; a filtered entry from a [User Manager](51-user-manager.md) member row ("this person's actions"). **After-Action is not a separate screen** — it folds in here as the laptop surface (foundation §"Three constitution-named screens that do NOT become screens").
- **Issue:** [#211](https://github.com/Vergo402/paratech-struts/issues/211).

## Primary role(s) and surface(s)

- **Primary role(s):** **all roles may read** the log (Principle 7 — visible safety; nothing buried); **export is Owner/Admin** (flag). Roles spelled out ([ADR-008](../11-decisions/ADR-008-nims-org-structure.md)).
- **Primary surface(s):** **phone is the floor** (scroll/filter the log); a **non-operational surface → 48pt targets**. **Laptop is the after-action surface** (the ICS assembly + export). **Broadcast does not render this** (a data-dense record, not a room board).

## Information hierarchy (above / below fold) — per surface

### Phone (the floor)
- **Above fold:** the **event list** newest-first, each row *timestamp · actor (role-at-time) · action*; an inline **scope [`segmented`](../03-primitives/segmented.md)** + **filter [`input`](../03-primitives/input.md)** (by user / role / action / time).
- **Below fold:** older events (paginated/virtualized); a row → its before→after detail.

### Tablet
- **Above fold:** a left filter rail + the event list; tap a row → detail in a side panel.

### Laptop (Toughbook) — the After-Action surface
- **Above fold:** filters + list + detail, **plus the after-action assembly**: the **ICS-201/203/207/208/209** forms populated from the log, and the **export** (CSV of the raw log + PDF of the assembled forms).

### Broadcast TV
- **Not rendered.**

## Primary action + secondary actions

- **Primary action (one — Principle 4):** **read / filter the log** — an **inline scope [`segmented`](../03-primitives/segmented.md) + filter [`input`](../03-primitives/input.md); no destructive overlay** (the immutable append-only contract — the ADR-016 Audit Log row).
- **Secondary actions:** open a row's before→after detail; **export** (Owner/Admin — the after-action assembly, laptop-primary).
- **Destructive / terminal:** **none — the log is immutable** (you cannot delete events; correcting state happens by a new action on the source screen, which itself logs).

## Composed primitives

- [x] [list](../03-primitives/list.md) — the event list; virtualized past the fold (the K-15 scale rule — an incident can produce 1000+ events).
- [x] [badge](../03-primitives/badge.md) — the **action type** + the actor's **role-at-time**; never color alone (Principle 9).
- [x] [segmented](../03-primitives/segmented.md) — the inline scope (all / by-user / by-action / by-time).
- [x] [input](../03-primitives/input.md) — the filter (search / date-range).
- [x] [button](../03-primitives/button.md) — export (CSV / PDF); the ICS-form assembly actions (laptop).
- [x] [empty-state](../03-primitives/empty-state.md) — no events yet (a calm "Nothing logged yet," not an alarm).
- [ ] picker · card · sheet · modal · toggle · slider · toast · loading-state · warning-gate · nested-checklist — not core (no destructive overlay; a row's detail is an inline panel, not a sheet).

> **A new primitive would be a gate escalation, not a spec decision.**

## The event-log projection (the architecture — synthesis §3.6, ADR-009)

v4 is **event-sourced**: every write appends an immutable event to `/operations/{opId}/events/`, and the live UI renders a **projection** of that log. The Audit Log is simply a **filtered, paginated read of the same log** — *not a parallel record*. Each event carries `{ at, byUid, role (at time of action), deviceId, action, before, after }` ([ADR-009](../11-decisions/ADR-009-database-firebase-rtdb.md); the [`nested-checklist`](../03-primitives/nested-checklist.md) attribution record and the [Roster](41-roster.md) per-row sync are the same discipline). This is the v4 correction to v3's gap: the Surfside TTX-2 had five IC transitions and six Operations-Section-Chief rotations and **left no trace** (synthesis §1.2); v4 shows the whole thread.

## The after-action / export convergence point

After-Action folds in here as the laptop surface — "filters and formatting, not data collection" (foundation). This screen is where the exports **converge**:
- **ICS-201/203/207/209** assembled from the event log + role history (the [Command](30-command-sitstat.md) / [Org Chart](31-org-chart.md) role-history thread feeds it).
- **ICS-208** Safety Message/Plan — from the [Hazard Log](32-hazard-log.md) register (its export resolves here).
- **PAR snapshot** — the point-in-time accountability record from the [Roster](41-roster.md) (its OQ3 export resolves here).
- **Raw CSV** of the event log for further analysis.

One persistence path, many formatted reads — no parallel data model.

## What ships v4.0 (and the flagged ambiguity)

The **event-log persistence ships v4.0** — it is THE persistence path of the whole app (ADR-009), not an add-on. Whether *this review/after-action UI* ships v4.0 or v4.1 is **ambiguous in the source** (master-plan D7 "Option B" vs. synthesis "deferred") — **not resolved here; tracked as [`99-open-questions.md`](../99-open-questions.md) #32** (shared with [User Manager](51-user-manager.md)). The IA is identical either way.

## 2FA forward hook (future, out of current scope)

When 2FA lands ([User Manager](51-user-manager.md) policy; mechanism in [Login/Register](70-login-register.md) / [Settings](50-settings.md)), its events — **enrolled / challenged / failed** — are **recorded here** like any other state change. The log performs nothing; it logs. Forward hook only, tracked as [`99-open-questions.md`](../99-open-questions.md) #33; not built.

## Locked cross-cutting rules this screen honors

- [x] **Audit log == event log** (synthesis §3.6, [ADR-009](../11-decisions/ADR-009-database-firebase-rtdb.md)) — a read projection, not a parallel record.
- [x] **Immutable / read-only** — no destructive overlay; events are never edited or deleted (the ADR-016 Audit Log row).
- [x] **Visible safety** — all roles read the log; nothing is buried (Principle 7).
- [x] **NIMS terms in entries** — "Rescue Group Supervisor," spelled out ([ADR-008](../11-decisions/ADR-008-nims-org-structure.md), [`voice-and-tone.md`](../07-design-system/voice-and-tone.md)).
- [x] **No comms / no push** (Principle 10) — a record of actions, never a messaging surface.
- [x] **Color never alone** — action/role badges carry text (Principle 9).
- [x] **Phone is the floor**; **48pt non-operational targets**; **laptop = after-action**; **no broadcast render**.
- [x] **Scale** — virtualized list, the K-15 250-card/1000-event rule ([`list.md`](../03-primitives/list.md)).

## The four-surface table (this screen)

| Dimension | Phone | Tablet | Laptop | Broadcast |
|---|---|---|---|---|
| Layout | event list + inline filter | filter rail + list + side detail | filters + list + detail + **ICS assembly/export** | **not rendered** |
| Above fold | newest events + scope/filter | filtered list | the after-action assembly | — |
| Primary-action affordance | scroll + inline filter (48pt) | filter rail | keyboard + export | — |
| Added density | — | side detail panel | ICS-form assembly + CSV/PDF export | — |
| Does NOT render | — | — | — | **the whole screen** |

## Empty / error / loading states

(Posture set in [`00-ia-foundation.md`](00-ia-foundation.md) §Cross-cutting empty / error / loading.)

- **Empty — nothing logged yet:** the all-clear [`empty-state`](../03-primitives/empty-state.md) — "Nothing logged yet" (calm; the log fills as work happens).
- **Empty — filtered to nothing:** the filtered variant with a clear-filter action; settle before empty.
- **Error:** a read/export failure resolves inline (retry); never `alert()`.
- **Loading:** the log is read locally where possible; **pagination at 1000+ events** is a genuine wait → determinate / incremental ([`loading-state.md`](../03-primitives/loading-state.md)); the PDF export is the other real wait → determinate.

## Accessibility / screen-reader notes

**Cite [`accessibility.md`](../07-design-system/accessibility.md), do not restate.**
- Each event row announces *actor · role · action · time* ("Rescue Group Supervisor advanced Shore Point B-2 to Cutting, 14:32"); action + role are text + badge, never color alone ([`accessibility.md`](../07-design-system/accessibility.md) §Screen-reader scripts — extend the registry with the audit-row script).
- The scope [`segmented`](../03-primitives/segmented.md) + filter [`input`](../03-primitives/input.md) are keyboard-navigable; the export announces progress via `aria-live`; the laptop ICS-assembly is a labeled, keyboard-reachable region ([`accessibility.md`](../07-design-system/accessibility.md) §Focus & keyboard).

## Open questions (per-screen)

1. **Review-UI ship version** — v4.0 vs v4.1 → [`99-open-questions.md`](../99-open-questions.md) #32 (the event-log persistence is firmly v4.0).
2. **Which ICS forms in scope** — ICS-201 at minimum; 203/207/208/209 likely later (v4.1); confirmed at the Phase F gate / Phase G.
3. **Export format** — CSV (raw log) + PDF (assembled forms); the exact format is shared with the [Hazard Log](32-hazard-log.md) ICS-208 + the [Roster](41-roster.md) PAR snapshot; finalized in the Phase G/H export work.
4. **Pagination at scale** — load strategy for 1000+ events (infinite scroll vs. date-range); affordance for Phase H.
5. **Immutability enforcement** — backend guarantee of no out-of-band deletes to `/events/`; Phase H infrastructure.
6. **Multi-incident roll-up** — how a mutual-aid incident ([Cross-Dept Invite](52-cross-dept-invite.md)) merges contributing depts' events into one log; Phase G mutual-aid workflow.
7. **2FA event recording** — when 2FA lands → [`99-open-questions.md`](../99-open-questions.md) #33.
