# IA Spec: Org Chart

> Phase F information-architecture spec. Cites [`00-ia-foundation.md`](00-ia-foundation.md) for all cross-cutting rules and does not re-derive them.
> Source: recs K-3 / K-12 (tablet-portrait budget) / K-13 (role history); [`04-references/nims-org-structure.md`](../04-references/nims-org-structure.md) + [ADR-008](../11-decisions/ADR-008-nims-org-structure.md) (the structure authority); [`06-synthesis.md`](../06-synthesis.md) §1.10; [`99-open-questions.md`](../99-open-questions.md) #26 (org chart = a screen composition, not a primitive); GitHub [#295](https://github.com/Vergo402/paratech-struts/issues/295). Grounded in v3 `renderOrgChart()` (app.js:7082), `openOrgChartNode()` (4078), `orgSwapRoles()` (4446), `orgReparentRole()` (2299), `ICS_ROLES_DEFAULT` (1989), `customRoles`/`customRolesById`, `canReparent()` (IC-only).

---

## Purpose

The incident's ICS command structure: who holds each position, who reports to whom, and where every resource is assigned — rendered as a chart the IC can read at a glance and restructure as the incident grows.

## Where it lives

- **Tab / parent:** **Command** — a **screen-level composition** opened **one tap from [SitStat](30-command-sitstat.md)** as a sheet/modal (per the [tab map](00-ia-foundation.md), [ADR-014](../11-decisions/ADR-014-tab-structure.md); it is **not** a Phase-E primitive — the org-**node** card surface lives in [`card.md`](../03-primitives/card.md); this spec is the *composition*).
- **How it is reached:** the Org Chart entry on the Command tab; also a node's role-history is one tap from the chart.
- **Issue:** [#295](https://github.com/Vergo402/paratech-struts/issues/295).

## Primary role(s) and surface(s)

- **Primary role(s):** the **Incident Commander** (the only role that may restructure — the v3 `canReparent` lock); the **Operations Section Chief** and **Group Supervisors** read it.
- **Primary surface(s):** **phone is the floor** (read + tap-to-assign; reparent via button equivalents **or** press-and-hold/drag — see the amendment note). **Tablet** is where the chart is comfortably edited (drag-reparent). Broadcast renders it read-only to Section-Chief depth (C-13).

> **Amendment (2026-06-28, [#367](https://github.com/Vergo402/paratech-struts/issues/367)).** Phone now **also** supports press-and-hold/drag reparent as an **additive convenience** (built off-spec in #323, blessed here by Alex). This overrides the original Phase-F-gate decision that phone "does NOT render drag-reparent." The **assistive-tech-cannot-drag contract is unchanged** — the node-sheet "Move…" buttons remain the keyboard/AT path and the guaranteed floor; drag is an enhancement on top. Flagged for the Phase J doctrine audit ([`98-design-docket.md`](../98-design-docket.md) §Doctrine deviation watch).

## Information hierarchy (above / below fold) — per surface

### Phone (the floor)
- **Above fold:** the IC node + its direct reports (Safety Officer, Operations Section Chief); the **active path** highlighted.
- **Below fold / tap-to-descend:** Groups and their assigned resources — **one level at a time** (the K-12 budget forbids an infinite canvas on a phone).

### Tablet (CP)
- **Above fold:** the chart to **Section-Chief depth within the K-12 budget — ≤ 7 cards × 2 levels in portrait, no scroll**; drag handles for reparent.
- **Below fold:** deeper levels by tap-to-descend.

### Laptop (Toughbook)
- Denser chart, keyboard-navigable (arrow keys move the focus node; reparent via keyboard); role history in a side panel.

### Broadcast TV (read-only projection)
- The chart to **Section-Chief depth** (the C-13 left third); only **populated** roles; ≥ 32pt; no interactive primitives, no animation.

## Primary action + secondary actions

- **Primary action (one — Principle 4):** read the structure; **(IC) tap a node → assign/clear a resource** (a [`sheet`](../03-primitives/sheet.md)).
- **Secondary actions (IC only):** add a sub-role, rename, **promote / demote / reparent**; open a node's **role history**; collapse/expand a branch.
- **Destructive:** removing an **assigned supervisor** (a populated command position) = a [`modal`](../03-primitives/modal.md) confirm; clearing an assignment is reversible (a sheet, no confirm).

## Composed primitives

- [x] [card](../03-primitives/card.md) — the **org-node** card (role title, assigned resource, status dot, span-of-control warning — the surface specced in `card.md`).
- [x] [sheet](../03-primitives/sheet.md) — the **node sheet** (assign/clear apparatus + individuals, add sub-role, rename, promote/demote/reparent); the **role-history** view.
- [x] [modal](../03-primitives/modal.md) — destructive removal of a populated command position.
- [x] [list](../03-primitives/list.md) — the tree layout (one-level drill) + the role-history list.
- [x] [badge](../03-primitives/badge.md) — the node status dot (active vs. staged), the span-of-control caution/over indicator.
- [x] [button](../03-primitives/button.md) — the reparent **button equivalents** (move-up / move-to-parent) on phone/AT; collapse toggles.
- [x] [empty-state](../03-primitives/empty-state.md) — a fresh op with only IC + the two Group Supervisors populated.
- [ ] picker · input · toggle · slider · toast · loading-state · nested-checklist · warning-gate (not core).

## The NIMS structure (ADR-008) — the v4 default, replacing v3's flat tree

v3's default is a flat division tree (`ICS_ROLES_DEFAULT`: IC → Safety, Operations → Staging, **Division 1 → Entry/Rescue/Shoring/Wood**, Cutting → Runner). v4's default is the **functional two-Group structure** ([ADR-008](../11-decisions/ADR-008-nims-org-structure.md)):

```
Incident Commander
├─ Safety Officer
└─ Operations Section Chief
   ├─ Rescue Group Supervisor      ← (Entry, Search, Rescue are tasks/resources beneath)
   ├─ Shoring Group Supervisor     ← (Initial Shoring, Wood Shoring are tasks/resources beneath)
   ├─ Staging Area Manager
   └─ Cutting Station              ← a WORKSTATION card (like Staging), NOT a command box
   (Search Group Supervisor + Medical Group Supervisor add at Level III+)
```

- **Two functional Groups by default** — Rescue + Shoring Group Supervisors. Search/Medical Group Supervisors are **add-ons at Level III+**.
- **Entry / Initial Shoring / Wood Shoring / Runner are tasks/resources beneath their Group, not org boxes** (Runner is a go-fer resource). **Cutting Station is a workstation under Operations** ([21-cutting-station.md](21-cutting-station.md)), **not** an org-chart command position.
- **Titles spelled out, no acronyms** — "Operations Section Chief," never "Ops"; "Safety Officer," never "SO".
- **Divisions are numbered by floor; sides A–D** are a separate geographic locator (the IC sets the A side) — Divisions appear as positions only at scale; the default is functional Groups, not geographic Divisions.
- **Level presets deferred** — v4.0 ships this default structure; the IC restructures manually. (No NIMS Level I–V preset selector yet.)

The **migration of existing v3 org data** (flat tree → two-Group) is deferred to Phase G/H; this spec defines the v4 **target** structure.

## The K-12 layout budget (the binding constraint)

The default chart must render **≤ 7 cards × 2 levels in tablet portrait without scrolling** (Meadowville OP2 tore on an infinite canvas). Consequences:
- The chart shows **only populated roles** by default (empty positions don't consume the budget).
- Deeper structure is reached by **tap-to-descend**, not an ever-wider canvas.
- The default two-Group structure fits the budget (IC + Safety + Operations Section Chief on level 1–2, the two Groups + Staging + Cutting Station as Operations' reports = within 7×2).

## Node interactions

- **Tap a node** → the node [`sheet`](../03-primitives/sheet.md): assigned resources + assign/clear; (IC) add sub-role, rename, promote/demote/reparent. **Editing is IC-only** (the v3 `canReparent` / lock-state).
- **Role history one tap from a node** (rec K-13 — **new in v4**; v3 has no org history): who has held this position, with timestamps (the audit thread the command-transfer + assignment events feed).
- **Reparent** = **tablet drag** (the v3 three-method drag, simplified) / **phone = button equivalents** ("move under…", move-up/down) **plus** an additive press-and-hold/drag ([#367](https://github.com/Vergo402/paratech-struts/issues/367) amendment) / **AT = button equivalents only** — the *assistive-tech-cannot-drag* contract ([`accessibility.md`](../07-design-system/accessibility.md)).
- **Span-of-control warning** kept (caution at 6–7 direct reports, over at >7) — a [`badge`](../03-primitives/badge.md) on the node, informational (never a block — Principle 10).
- **Collapse/expand** a branch (the v3 `orgCollapsedNodes`); collapse snaps, only the chevron animates ([`motion.md`](../07-design-system/motion.md)).

## Locked cross-cutting rules this screen honors

- [x] **Phone is the floor** — read + assign + reparent (via buttons; phone also supports press-and-hold/drag as an additive convenience, [#367](https://github.com/Vergo402/paratech-struts/issues/367)) all work phone-only.
- [x] **NIMS terminology + structure** ([ADR-008](../11-decisions/ADR-008-nims-org-structure.md)) — two Groups, tasks beneath, Cutting Station out, titles spelled out, `group` → **assignedResource**.
- [x] **K-12 budget** — ≤ 7 cards × 2 levels tablet portrait; tap-to-descend; populated roles only.
- [x] **Visible, never blocking** — span-of-control is a caution badge, not a gate (Principle 10); no safety-hold.
- [x] **Tap geometry** — 56pt node tap targets + button equivalents; 8pt dead zones.
- [x] **Modal-vs-sheet** per the ADR-016 Org Chart row: assign/reparent/role-history = sheet; destructive removal of a populated position = modal.
- [x] **Reduced motion / broadcast** — collapse snaps; broadcast renders read-only, no interactive primitive.
- [x] **Role history is visible + audited** (K-13; feeds the audit log).

## The four-surface table (this screen)

| Dimension | Phone | Tablet (CP) | Laptop | Broadcast |
|---|---|---|---|---|
| Layout | IC + direct reports; tap-to-descend | chart to Section-Chief depth, ≤ 7×2 (K-12) | dense, keyboard-nav | read-only to Section-Chief depth |
| Above fold | IC + Safety + Ops Section Chief | + the two Groups + Staging + Cutting Station | + role-history panel | populated roles only |
| Edit affordance | tap-assign; reparent buttons **+ press-and-hold/drag** ([#367](https://github.com/Vergo402/paratech-struts/issues/367)) | tap-assign; **drag-reparent** | keyboard reparent | — (read-only) |
| Role history | node sheet | node sheet / side panel | side panel | — |
| Does NOT render | — (AT path = buttons only; see [#367](https://github.com/Vergo402/paratech-struts/issues/367)) | — | — | any edit, any overlay |

## Empty / error / loading states

- **Empty — fresh operation:** the [`empty-state`](../03-primitives/empty-state.md) isn't really "empty" — the default structure (IC + Safety + Operations Section Chief + the two Group Supervisors) renders unpopulated-but-present; unfilled positions show a muted "unassigned" slot inviting assignment (the org-slot variant referenced by [`empty-state.md`](../03-primitives/empty-state.md) → `card.md`).
- **Error:** a failed assignment write queues locally (sync indicator); never `alert()`.
- **Loading:** local-first — the chart renders instantly from local state ([`loading-state.md`](../03-primitives/loading-state.md)).

## Accessibility / screen-reader notes

**Cite [`accessibility.md`](../07-design-system/accessibility.md), do not restate.**
- Each node is a labeled button announcing *position · assigned resource · status* ("Shoring Group Supervisor, Rescue 2, active"); span-of-control warnings announce as text, not color alone ([`accessibility.md`](../07-design-system/accessibility.md) §Screen-reader scripts).
- **Reparent has a full keyboard/AT path** (the *assistive-tech-cannot-drag* contract) — move-to-parent / move-up / move-down controls equivalent to the tablet drag ([`accessibility.md`](../07-design-system/accessibility.md) §Assistive tech cannot slide / §Focus & keyboard).
- The node sheet and role-history are focus-trapped; Power Select gives the assign picker a native `<select>` fallback under VoiceOver/TalkBack-or-Settings.

## Open questions (per-screen)

1. **v3 → v4 org migration** — how an existing v3 flat-tree operation (Division 1 with task children) maps onto the two-Group structure on upgrade; deferred to the Phase G/H migration (this spec defines the target).
2. **When Divisions (geographic) appear alongside Groups (functional)** — the default is two Groups; at what Level/scale numbered-floor Division Supervisors enter the default chart; tied to the deferred Level presets.
3. **Reparent drag mechanics** — the exact tablet drag affordance + threshold; affordance geometry finalized in the Phase H slice (inherits the [`card.md`](../03-primitives/card.md) gesture work).
