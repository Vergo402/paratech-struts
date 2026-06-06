# UI Primitive: The List

> Phase E primitive spec. The **arrangement primitive** — the ordered container that holds the app's collections. It owns *structure* (order, grouping, density, scroll, scale); it never owns the items it holds. Authored at the depth of [`picker.md`](picker.md).
> Source: essay [`05-essays/11-scenario-stress.md`](../05-essays/11-scenario-stress.md) (the list is where the IA tears at scale — virtualization **K-15**, group-by-shore-point **K-5**) + [`06-synthesis.md`](../06-synthesis.md) §1.8 / §2.7 / §3.2, governed by **Principle 3** (*calm in chaos*), **Principle 4** (*one canonical action*), **Principle 9** (*color is never the only signal*), and the **snap-not-animate** reorder rule of [`motion.md`](../07-design-system/motion.md). Grounded in the **real v3 list sprawl** — more than ninety distinct list-, row-, section-, and tree-shaped classes across `renderShorePointCards()`, `renderInventory()`, `renderDrilldownList()` / `renderDrilldownTree()`, the `.lane-*`, `.inv-item`, `.di-*`, and `.ops-tree-*` families — the way [`card.md`](card.md) is grounded in `renderResults()`. The list mints **no token of its own**; every value is owned by a sibling and cited (`--space-2` / `--space-5` [`spacing-grid.md`](../07-design-system/spacing-grid.md), `--surface-stroke` [`color.md`](../07-design-system/color.md), the 56pt operational row floor [`spacing-grid.md`](../07-design-system/spacing-grid.md), `--motion-instant` for the snap [`motion.md`](../07-design-system/motion.md)). Distinct from the **card** it stacks ([`card.md`](card.md)) and the **picker** it underlies ([`picker.md`](picker.md)) — see **The two boundaries**.

---

## Purpose

A list is the **ordered container** that holds a collection — shore points, inventory, apparatus, hazards, operations, divisions. It is the scaffold the operator scrolls, scans, groups, and acts down. It is the most *structural* primitive in the system: where the [card](card.md) is the object and the [badge](badge.md) is the tag, the list is the **arrangement** those objects sit in.

The reason v3 needs this doc is the same reason [`picker.md`](picker.md) and [`badge.md`](badge.md) needed theirs: **the same conceptual structure looks different in a dozen places.** v3 grew a status-lane list here, a system-grouped inventory list there, a drill-down on the phone and a sidebar tree on the desktop, a compact quick-view row, a hazard card stack, a role grid — each hand-built at its call site with its own spacing, its own grouping mechanism, its own row height, its own empty state. They are all *the same idea*: an ordered set of items with optional grouping and a way to act on each. The reference apps the industry uses do not re-invent the list per screen; FieldShore will not either.

v4 collapses the sprawl into a **small, ruled vocabulary** — two base shells, one grouping layer, one hierarchical form — every value cited to the token file that owns it. And the list is where the design system keeps its **scale** promise: a Surfside operation is 250 shore points, and any arrangement that re-renders the whole collection on every change (the v3 reality) fails there. The list owns virtualization, in-place update, and the doctrine-aware order so the collection stays legible from a three-point Verplanck job to a 250-point federal deployment.

---

## The variants

v4 ships **two base list shells, one grouping layer, and one hierarchical form.** Which you reach for is determined by *what the collection is*, not by taste.

| Variant | Arranges | Item primitive | Examples | v3 origin |
|---|---|---|---|---|
| **Card list** | A vertical stack of full cards | [`card.md`](card.md) | Operations shore-point list, Quick Find results, hazard log, archived operations | `renderShorePointCards()`, `renderResults()`, `.op-card`, `.hazard-card` |
| **Row list** | A dense stack of compact rows | **the row** (owned here) | Inventory, individuals, external equipment, quick-view stock, legend | `.inv-item`, `.inv-qv-item`, `.ext-item`, `.list-item-row` |
| **Sectioned list** | *A layer over either shell* — grouped under collapsible headers | inherits | Status lanes, inventory by system, apparatus by group | `.lane-*`, `.inv-section-*`, `.aa-section-*` |
| **Tree / drill-down list** | A hierarchy you navigate *into* | row + disclosure | Division drill-down, the desktop ops sidebar, the org chart structure | `renderDrilldownList()` / `renderDrilldownTree()`, `.di-*`, `.ops-tree-*`, `.org-node-*` |

The **card list** and **row list** are the two base shells. **Sectioning is a layer** either shell wears — a card list or a row list, broken into labeled, collapsible groups — not a third kind of item. The **tree** is the one structurally different form: it is read by *descending*, not by scrolling a flat set. (The org chart's reparent / promote / span-of-control editing is an Operations workflow, **Phase G** — list.md owns only its tree *structure*.)

---

## The two boundaries

Two rules decide whether something is a list at all, and both are rules, not judgment calls — the same discipline [`picker.md`](picker.md), [`sheet.md`](sheet.md), and [`badge.md`](badge.md) impose on their vocabularies.

### 1. The arrangement boundary — list vs. its items

> **The list owns the arrangement. It never owns the item.**

| The list owns… | The list does **not** own… |
|---|---|
| Order, sort, and grouping | The card's anatomy → [`card.md`](card.md) |
| Inter-item rhythm, dividers, density | The badge's geometry → [`badge.md`](badge.md) |
| Scroll, virtualization, live update | The status word / color → [`voice-and-tone.md`](../07-design-system/voice-and-tone.md) / [`color.md`](../07-design-system/color.md) |
| The empty / loading slot (reserved, not styled) | The empty / loading content → [`empty-state.md`](empty-state.md) / [`loading-state.md`](loading-state.md) |

The **one item this doc owns is the row** — because *a row has no meaning outside its list.* A card can stand alone on a screen; a badge can ride a button; a row exists only as a member of a list, so its anatomy lives here. Everything richer is a card.

### 2. The intent boundary — list vs. picker

> **A list displays; a picker selects.** If dismissing it returns a chosen value to a parent field, it is a [picker](picker.md). If you read it, navigate it, or act on items where they live, it is a list.

The picker's **full-screen-list variant** ([`picker.md`](picker.md)) is *built on this same scaffold* — 56pt rows, sectioning, search-past-7, virtualization — and then adds **select-and-return** commit semantics on top. So list.md owns the substrate; picker.md owns the selection layered over it. They look alike on purpose (the same structure should be the same structure); they differ in what the row's action *does*: advance a shore point and stay (list) vs. pick a base plate and return (picker).

---

## The row — the one item this doc owns

A row is the compact list member: read it, and act on it with at most one affordance. It is deliberately lighter than a [card](card.md) — single identity line, optional secondary line, a trailing value or **one** control.

| Property | Value | Token / source |
|---|---|---|
| Min height | **56pt** in any operational list (44pt only in tertiary/disclosure contexts) | [`spacing-grid.md`](../07-design-system/spacing-grid.md) §Touch targets |
| Padding | 12pt vertical / 16pt horizontal | `--space-3` / `--space-4` — [`spacing-grid.md`](../07-design-system/spacing-grid.md) |
| Divider | 1pt hairline between rows | `--surface-stroke` — [`color.md`](../07-design-system/color.md) |
| Background | row surface; active/selected fill | `--surface-card` / `--surface-card-hover` — [`color.md`](../07-design-system/color.md) |
| Radius | **none** — the row is flush; only the *containing panel* may carry `--radius-card` | — |
| Label (leading) | the identity line | `--type-body` (14/400) — [`typography.md`](../07-design-system/typography.md) |
| Secondary / value (trailing) | metadata or a measurement/count | `--type-caption` for prose, `--type-mono` + `tabular-nums` for measurements & counts — [`typography.md`](../07-design-system/typography.md) |
| Trailing affordance | **at most one** — a value, a chevron, or a single control | chevron from [`iconography.md`](../07-design-system/iconography.md) |

> **One trailing affordance per row.** A row that needs two or more actions is not a row — it is a [card](card.md) with one primary action and an overflow (Principle 4). This retires v3's affordance-saturated rows (edit ✎ + delete ✕ + reorder ▲▼ crammed on a single `.inv-item`): the row is read + one action; richer is a card.

The row carries **no shadow** (elevation belongs to sheets and modals — [`card.md`](card.md)), and never re-styles its own divider, height, or padding per call site (the exact v3 debt this doc retires).

---

## Anatomy of the list itself

The list above its items is just rhythm and a scroll container — and the rhythm is on grid:

- **Card list:** cards separated by an **8pt gutter** (`--space-2`, the external rhythm of [`spacing-grid.md`](../07-design-system/spacing-grid.md)); each card owns its own 12pt radius and 1pt-top-highlight elevation ([`card.md`](card.md)).
- **Row list:** rows **flush**, separated by the 1pt `--surface-stroke` hairline; the whole list may sit in a `--radius-card` panel so the group reads as one surface.
- **Section gap:** **20pt** between sections within a screen (`--space-5`), **24pt** between major sections (`--space-6`).
- **Scroll** lives on the list body, not the page, so a pinned header / summary bar / filter stays put while the collection scrolls beneath it (the v3 `.modal-scrollbody` discipline, generalized).

Internal card and row padding does **not** change across surfaces; only the gutters and page margin grow ([`spacing-grid.md`](../07-design-system/spacing-grid.md) §Surface breakpoints).

---

## Order, grouping & sectioning

- **The list states its sort; doctrine sets the order.** Status groups follow the **lifecycle order** (`pending → process → strutset → cutting → runner → secured → returned`, the `STATUS_ORDER` of [`color.md`](../07-design-system/color.md)), divisions follow **floor order** (numeric, top-down), operations newest-first. **Never alphabetical where doctrine has an order** — an alphabetized status lane is a doctrine violation, not a neutral default (Principle 1).
- **A section header is a row that groups.** It carries a **label** (`--type-label` micro-caps or `--type-body-medium`), a **count badge** (the count variant of [`badge.md`](badge.md) — "12", tabular, never re-styled), and a **collapse affordance** (a chevron from [`iconography.md`](../07-design-system/iconography.md)). It is a control, so it meets the touch floor and has keyboard parity (see Accessibility).
- **Collapse state persists.** The v3 `toggleSection()` / `sectionCollapsedState` (and the lane-collapse mechanism) carry forward — a collapsed lane stays collapsed across renders. Collapse hides the body (`--motion-instant`, no reveal animation — [`motion.md`](../07-design-system/motion.md)); the count badge in the header still reports what's inside.
- **Worked example — the status lanes.** The Operations shore-point list is a **sectioned card list**: one collapsible lane per lifecycle status, each header carrying its status word + a count badge, lanes ordered by `STATUS_ORDER`. Grouped shore points keep their group identity inside the lane (the v3.8.0/v3.9.0 phase split is a *card/workflow* behavior — [`card.md`](card.md) — not a list concern). The **group-by-shore-point** resolution (alternatives nested under a shore point, collapsed by default — synthesis §2.7, **K-5**) is an Operations-IA decision (**Phase F**) the sectioned card list is built to host.

---

## Scale — the headline rule

This is the one place the list earns its own primitive, and the v3 gap it closes is real: v3 rebuilds the entire `innerHTML` of every list on **every** state change (`renderOperations()` and siblings), which is unsustainable at federal scale.

- **Virtualize past the fold.** A list renders only the rows in (and near) the viewport. **The shore-point list must render 250 cards at Surfside scale without scroll lag (K-15)**, with an explicit virtualization bench before **Phase H** closes. This is the binding constraint from Surfside TTX-2 and the single most important rule in this doc.
- **Update in place, never re-render whole.** A peer write over Firebase changes one row; the list mutates that row from the event-log projection — it does not rebuild the collection. (The v3 full-`innerHTML` re-render is retired.)
- **Structure before search.** A long operational list reaches first for **sectioning + virtualization**, *then* a findability affordance: a **scope selector** at the top (an inline-segmented [picker](picker.md), defaulting to the operator's assigned division/group — **K-14**) and, past ~7 findable items, a **filter field** (a text [input](input.md)). Search **supplements** structure; it never replaces it. (Contrast the [picker](picker.md), where search-at-7 is the *primary* findability tool — because a picker's whole job is to find-and-select.)
- **56pt rows, 8pt dead zone** in every operational list; 44pt is tertiary-disclosure only ([`spacing-grid.md`](../07-design-system/spacing-grid.md) §Touch targets).

---

## Reorder, removal & live updates

- **Reorder snaps; it never animates** ([`motion.md`](../07-design-system/motion.md) §What does not move). Sorting or reordering reflows instantly — animated reflow on a 200-row list is expensive and pointless when the operator just tapped a sort. `--motion-instant`, always.
- **Reorder is CP-only where it is a dispatcher action.** The Cutting Station queue reorders by **drag on the tablet only**; the phone shows the same queue **read-only** (**G-16**). The FIFO-with-priority-override queue logic is the Cutting Station workflow (**Phase F/G**); the list owns only the snap-reorder + phone-read-only rule.
- **No silent removal** (Principle 10). When an item regresses off an active work queue it does **not** vanish — it shows the **off-queue red-slash "Removed from cut list"** state ([`card.md`](card.md) owns the card treatment); the list owns the rule that the gap **snaps** closed and the item is never dropped without that visible reason. A card disappearing reads as data loss under stress.
- **Live updates are quiet.** A row added or changed by a peer write appears without a full re-render and announces politely (see Accessibility) — never an alarm, never a pulse ([`motion.md`](../07-design-system/motion.md); Principle 3).

---

## Empty & loading states

- Every list **reserves an empty-state slot**, owned by [`empty-state.md`](empty-state.md) — not this doc. A list **never shows a blank region** (the v3.7.3 "No matching struts found" fix, made permanent). The two operational shore-point empties are named by reference — **"no matching strut"** (inventory exists, nothing fits the length + load) vs. **"no inventory"** (no apparatus stock to pull from) — distinct messages with distinct remediation (**K-4**; visible safety, Principle 7).
- Every list **reserves a loading-state slot**, owned by [`loading-state.md`](loading-state.md). v3 has none (synchronous full re-render); v4's virtualized seam is the place a skeleton lives.

---

## v3 grounding — ninety classes, one vocabulary

v3 renders list-shaped UI from dozens of call sites with no shared primitive — status lanes in `renderShorePointCards()` (`app.js:5257`), a system-grouped inventory in `renderInventory()` (`app.js:3445`), a phone drill-down and a desktop sidebar tree from `renderDrilldownList()` / `renderDrilldownTree()` (`app.js:6681`, `6542`), compact quick-view rows (`app.js:8361`), a hazard card stack (`app.js:4747`). v4 re-sorts every one into the vocabulary above — **by what the collection is, not by its v3 markup:**

| v3 class / function family | v4 form |
|---|---|
| `.shore-point*` (`renderShorePointCards`), `.result-card` (`renderResults`), `.op-card`, `.hazard-card` | **Card list** (stacks [`card.md`](card.md)) |
| `.inv-item*`, `.inv-qv-item` / `.qv-*`, `.ext-item`, `.list-item-row`, `.legend-list li` | **Row list** |
| `.lane-*` status lanes, `.inv-section-*` by system, `.aa-section-*` by group, `.floor-group-*`, the cut-table sections | **Sectioned list** (a layer over either shell) |
| `.di-*` / `.drilldown-*`, `.ops-tree-*`, `.org-node-*`, `.drilldown-breadcrumb` | **Tree / drill-down list** *(org-chart editing → Phase G)* |
| `.app-chip` + `.chip-x` | **Not a list item** → [`input.md`](input.md) (interactive chip) |
| `.role-grid` / `.role-card` (a 2-up selection grid that returns a value) | **Not a list** → [`picker.md`](picker.md) (full-screen-list / grid selection) |
| the IC Command / Task Level / ORM checklists | **Not a list** → [`nested-checklist.md`](nested-checklist.md) |

**What carries forward:** the collapsible-section mechanism (`toggleSection` / `sectionCollapsedState`), the doctrine-aware sorts (floor order, lifecycle order), and the v3.7.3 empty-state-not-blank fix. **The v4 gap this closes:** the full-`innerHTML`-re-render-on-every-change (→ virtualized, in-place update — **K-15**) and the affordance-saturated row (→ one trailing affordance; richer is a card) — and the dozen-ways-to-arrange-a-collection inconsistency itself (one row geometry, one gutter, one section header, one tree, cited tokens everywhere).

---

## Universal rules

1. **The list owns arrangement, never the item.** A card is [`card.md`](card.md), a badge is [`badge.md`](badge.md); the **row** is the one item this doc owns, because a row has no meaning outside its list.
2. **Display, not selection.** If dismissing it returns a value to a parent field, it is a [picker](picker.md). A list lets you read, navigate, or act in place.
3. **One trailing affordance per row.** Two or more actions makes it a [card](card.md) with one primary action + overflow (Principle 4).
4. **56pt rows in every operational list;** 44pt is tertiary-disclosure only; 8pt dead zone between adjacent targets ([`spacing-grid.md`](../07-design-system/spacing-grid.md)).
5. **Virtualize past the fold; 250 SP cards render without lag (K-15).** No full re-render on change — update in place.
6. **Reorder snaps, never animates** ([`motion.md`](../07-design-system/motion.md)); reorder is CP-only where it is a dispatcher action (**G-16**).
7. **No silent removal** (Principle 10): a card leaving a queue shows its removal state ([`card.md`](card.md)); the gap snaps closed, the item is never dropped without the visible reason.
8. **Structure before search:** sectioning + virtualization first, filter/scope second.
9. **The list states its sort and grouping; doctrine sets the order** (lifecycle order for status, floor order for divisions) — never alphabetical-by-default where doctrine has an order (Principle 1).
10. **Color is never the only grouping signal** (Principle 9): a section is a labeled header carrying a count *word*, not a color band alone.

---

## Surface adaptations

| Surface | List behavior |
|---|---|
| **Phone (team officer)** | Single column, full-width rows / cards, 56pt floor. The tree **drills in one level at a time** (push navigation with a breadcrumb back-path). The thumb-reach surface; no tablet-only summary bar. |
| **Tablet (command post)** | A card list becomes a **board / grid** (the resource board). A **status summary bar** sits above the shore-point list — counts per status (**G-15**), **tablet only**. The tree renders as an **expanded sidebar** (the v3 `renderDrilldownTree` form). Drag-reorder enabled where it is a dispatcher action. |
| **Laptop (Toughbook)** | Denser rows; a row list may become a **multi-column sortable table** (roster by status / apparatus / load), **keyboard-navigable** — arrow keys move the focused row, Enter opens; command-palette find. |
| **Broadcast TV** | **Read-only** grid of status cards, **4 or 6 per row** at a **72pt outer margin** ([`spacing-grid.md`](../07-design-system/spacing-grid.md)). No interaction, no reorder, no filter affordance (the board shows the operative subset). No animation; refreshes on the ~15s poll ([`motion.md`](../07-design-system/motion.md)). |

Progressive density, not parallel designs (synthesis §1.8): one event-log projection, four adapters — the phone shows the working subset, the tablet adds the summary bar and board, the laptop adds the dense sortable table, the broadcast adds the wall grid. The *vocabulary* does not fork across surfaces; the density does.

---

## Accessibility floor

- **A list is a real list.** Native `<ul>` / `<ol>` or `role="list"` with `role="listitem"`, so a screen reader announces **"List, [name], [N] items"** and each item's **position** ("3 of 12"). Registered in [`accessibility.md`](../07-design-system/accessibility.md) §Screen-reader scripts.
- **Roving focus, arrow-key navigation.** One tab stop enters the list; **arrow keys move between rows / cards** (roving `tabindex`), Enter / Space activates the item's primary action — the delegated Enter/Space handler v3 already ships (`app.js:8756`) is the mechanism v4 inherits. The **item**, not its inner badge, is the focus stop ([`badge.md`](badge.md) — badges are never tab stops).
- **Section headers are announced and operable:** "[Label], [N] items, collapsed. Double tap to expand." The collapse is a real control with keyboard parity, not a `<div>` with a click handler.
- **Tree nodes announce depth, count, and state:** "[Label], [N] points, [status summary]. Double tap to open." The breadcrumb is a labeled back-path, each crumb a real button.
- **Live updates are polite.** A row added or changed by a peer write announces through the same `aria-live="polite"` region the card uses ([`card.md`](card.md)) — never `assertive` for routine change ([`accessibility.md`](../07-design-system/accessibility.md) anti-patterns).
- **Virtualization must not break focus.** A focused row scrolled out of the window and back keeps its identity and focus; the windowing is invisible to assistive tech.
- **Reduced motion loses nothing:** the snap is already instant, the collapse already instant — there is no list animation to suppress ([`motion.md`](../07-design-system/motion.md)).
- Per-row / section / tree VoiceOver / TalkBack scripts are consolidated in [`accessibility.md`](../07-design-system/accessibility.md) §Screen-reader scripts.

---

## Anti-patterns (do not do these)

- **Re-styling a list per screen** — a hand-rolled row, section, or tree at each call site (the >90-class v3 debt this doc retires). One vocabulary, cited tokens.
- **A row with two-plus trailing buttons.** That is a [card](card.md) with one primary action + overflow (Principle 4), not a row.
- **Rendering the whole list on every change.** Virtualize and update in place; the full-`innerHTML` re-render is the v3 scale failure (**K-15**).
- **Animating reorder or reflow.** Snap ([`motion.md`](../07-design-system/motion.md)) — animated reflow on a long list serves no job.
- **Silently dropping a card from a queue.** Show the off-queue removal state (Principle 10; [`card.md`](card.md)).
- **A blank region for an empty list.** Every list has an empty state ([`empty-state.md`](empty-state.md)); the two shore-point cases are named (**K-4**).
- **A selection list that's really a picker.** If it returns a value to a field, it is [`picker.md`](picker.md) — don't fork a parallel pattern (the exact v3 sin: the role grid, the strut results, and the apparatus picker each looked different).
- **Alphabetizing where doctrine has an order** — status lifecycle, division floor order (Principle 1).
- **A color-banded group with no header word** (Principle 9).
- **A checklist built as a list.** The checkable hierarchy with progress is [`nested-checklist.md`](nested-checklist.md), a different primitive.
- **A custom list a screen reader cannot navigate** — no list semantics, no roving focus, no position announce.

---

## Open questions for downstream

1. **Card-list gutter vs. flush rows.** The card list uses an 8pt (`--space-2`) gutter; the row list is flush with hairline dividers. Whether a dense tablet board tightens the gutter further is affordance geometry for the **vertical slice (Phase H)** — like the sheet's swipe threshold ([`sheet.md`](sheet.md) OQ2). The *vocabulary* (two shells, sectioning layer, tree) is fixed here.
2. **Virtualization technique.** *That* the list virtualizes and meets the 250-card bench (**K-15**) is fixed; the technique (a windowing library vs. hand-rolled, and the bench harness itself) is a **Phase H** build + test decision, run against real components, not prose.
3. **Tablet summary-bar + scope-selector placement.** The list is built to host both (**G-15**, **K-14**); their exact placement, and whether the scope selection persists per-operation, is an IA decision per screen (**Phase F**).
4. **A first-class data-table primitive.** The laptop sortable table is presented here as a *surface adaptation* of the row list. If Phase F's after-action / audit-log / ICS-201 screens need true table mechanics (column resize, freeze panes, export), that is its own doc — flagged so it is not silently folded into the row list.
5. **The append-only log as a list.** Role history (**C-4 / D-3 / K-13**) is surfaced **one tap from an org-chart node, not as a standalone list screen** — so a "log list" form is deliberately *not* specced here. If a verbose audit-log screen lands in Phase F, it reuses the sectioned row list; flagged so the inline-vs-screen decision stays explicit.
