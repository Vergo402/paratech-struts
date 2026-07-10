# Handoff: Command Board — ICS Org Chart (FieldShore v4)

## Overview
The **Command Board** is the Command-section *Org Chart* for FieldShore v4 — a field
tool for USAR/FEMA rescue-shoring crews. It renders a live **NIMS/ICS incident
command structure** (per ADR-008) as an interactive, editable org chart: the Incident
Commander at the root, command staff to the side, and the Operations section branching
down into Groups, Divisions, Staging, a Cutting Station, and the individual apparatus
assigned to each.

The same chart runs on two surfaces driven by **one shared data model**, so an edit made
on either surface appears instantly on the other:

- **Command Post (desktop)** — the Toughbook at the command post: full chart, drag a card
  by its grip to reparent, zoom, a docked inspector panel, and an incident rail with
  live metrics + a span-of-control caution.
- **The floor (phone)** — the same chart for responders working the scene:
  pinch/zoom, tap to assign, hold-to-drag to move, and a bottom sheet.

The IC builds and adjusts the command structure as the incident grows — promoting a rig to
lead a Group, adding a Branch when span-of-control gets tight, moving a crew to a new
Division as a second work face opens.

---

## About the Design Files
The files in this bundle are **design references created in HTML/CSS/JS** — a working
prototype that demonstrates the intended look, layout, and interaction model. **They are
not production code to copy directly.**

The task is to **recreate this design in the target codebase's existing environment**
(React, Vue, SwiftUI, native, etc.) using its established components, state management, and
patterns. If no environment exists yet, choose the most appropriate framework for the
project and implement the design there. Use the prototype to verify behavior and the exact
visual values; use this README as the spec.

### Running the prototype
Open `command-board/Command Board.html` in a browser. It loads `../styles.css` (the
FieldShore token + font slice included here) plus the board's own CSS/JS. No build step,
no network — everything needed is in this folder.

> **The top exploration toolbar is design-session scaffolding, NOT part of the product.**
> The Theme / Connectors / Density segmented controls, the "Reset incident" button, and the
> "Live model — edits sync across both views" note exist only to demo the prototype. Do not
> ship them. See *Interactions → Exploration toolbar* for how to treat each one.

---

## Fidelity
**High-fidelity.** Final colors, typography, spacing, radii, shadows, and interactions are
all specified here and present in the prototype. Recreate the UI pixel-faithfully using the
target codebase's existing libraries and design system. Where this design references a
FieldShore token (e.g. `--accent`, `--surface-card`, `--status-secured-text`), map it to the
**same token in the app** rather than hard-coding the hex — the values in *Design Tokens*
are the source of truth for what those tokens resolve to per theme.

---

## Screens / Views

### A · Command Post (desktop)
**Purpose:** The IC and command staff manage the whole incident structure from the command
post. Full chart, structural edits via drag, a docked inspector.

**Layout (outer → inner):**
- **Window chrome** — `1180px` wide, `14px` radius, macOS-style traffic lights + title
  *"FieldShore — Meadowville Collapse · OP 2"*. Title bar `40px` tall, gradient
  `#2C3036 → #23262B`. (The window chrome is presentation; in-app this is just the app frame.)
- **Deck** — CSS grid, `312px` rail + `1fr` workspace, fixed height `660px`.
- **Incident rail** (`312px`, `20px` padding, `18px` gap, scrolls):
  - *Active operation* — eyebrow + incident name `h2` (`24px`/600) + address line
    ("412 Meadow St · 3-story masonry · partial collapse").
  - *Incident Commander* — bordered top/bottom; name `BC Reyes · Car 1` (`16px`/600) with a
    **`3px` solid `--accent` underline**; below it "Level IV · 24 personnel · OP 2 of 3".
  - *Metrics grid* — 2×2 cards (`12px` radius): **Apparatus 9** · on scene, **Shore points 6**
    · 2 cutting, **Positions 8** · filled, **Open hazards 2** · monitored. Numbers `24px`/600
    tabular-nums.
  - *Span of control* — note: "Operations runs **6 direct reports** — approaching the NIMS
    1:7 limit. Consider a Branch." The "6 direct reports" is colored with the caution token.
- **Workspace:**
  - *Header* — segmented control **Org Chart / Hazard Log** (Org Chart active; Hazard Log is
    a stub tab) + hint text "Drag a card by its grip to reparent · tap to assign & edit".
  - *Roster strip* — "Roster — drag to assign" + draggable pill chips:
    **Engine 30** (3 crew), **Ladder 5** (4 crew), **Medic 9** (2 crew), **Rescue 4** (4 crew),
    **Battalion 2** (chief), **Squad 6** (5 crew). Chips have a grip glyph; rig sub-label in mono.
  - *Org chart* — scroll viewport containing a zoomable canvas: an SVG connector layer beneath a
    recursive flex tree of node cards. **Zoom control docked bottom-left** (− / % / + / Fit).

### B · The floor (phone)
**Purpose:** Responders on scene read the structure and make quick assignments.

**Layout:**
- **Bezel** `392px`, `46px` radius; **screen** `36px` radius, height `812px`, Dynamic Island,
  status bar showing `13:52` + signal/wifi/battery glyphs.
- **Org header** — "Command — Org Chart" + a **My role** button (jumps to / opens the IC node).
- **Same org chart** as desktop, but: no roster strip and no grab handles. Interactions are
  **tap to open sheet** and **hold-to-drag** to move a card. The node sheet is a **bottom
  sheet** instead of a docked panel.

### Shared element · the node card
The atomic unit of the chart. Grid `auto / 1fr` (status dot + body), `218px` wide,
`min-height 64px`, `12px` radius, `--surface-card` bg, `--border` stroke, `--shadow`.

- **Status dot** — `9px`, top-aligned. **Assigned** → `--status-secured-text` (green) with a
  soft ring; **unassigned** → `--text-tertiary`, no ring.
- **Eyebrow** — the ICS class label (e.g. "Group — functional", "Section", "Staging" shown as
  "Operations"), `10px`/600/`.07em` uppercase, tertiary.
- **Title** — the position title (`13.5px`/600, balanced wrap).
- **Leader** — `assignedResources[0]` name + mono sub (`12.5px`); "Unassigned" italic tertiary
  when empty.
- **Meta badges** (pill, `10.5px`) — `+N resources` (extra assignments beyond the lead),
  `Div N · X side` (divisions, mono, blue/process token), `Span N · caution|over limit`
  (amber/red span tokens).
- **Variants:**
  - `is-ic` (root) — **`--accent` border, accent-colored title + leader.** The single gold accent.
  - `is-staff` (command staff: Safety / PIO / Liaison) — **dashed** border, `196px` wide, sits
    in a side cluster, excluded from span count.
  - `is-workstation` (Cutting Station) — **dashed** border, `--surface-elevated` bg; a work area,
    not a command box.
  - `is-resource` (a single apparatus/crew) — `188px`, `min-height 52px`, slightly recessed bg,
    **leader name in mono**.
- **Grab handle** — desktop only, appears on hover at the card's right edge (`22px`, grip glyph),
  `cursor: grab`. Hidden in read-only.
- **Compact density** shrinks cards (node `198px`, resource `172px`, staff `178px`) and gutters.

### Shared element · the node sheet
Opens on tap/click of any node. **Desktop:** right-docked inspector, `380px`, **non-modal** (no
dim, chart stays usable), slides in from the right (`translateX(102% → 0)`, `200ms`
`cubic-bezier(.2,0,.2,1)`). **Phone:** bottom sheet, `max-height 78%`, `20px` top radius, grip
handle, slides up (`translateY(102% → 0)`, `220ms`); scrim dims to `rgba(0,0,0,.5)`.

Sheet contents (top → bottom):
- **Head** — eyebrow (ICS class, + "· span N caution/over" when relevant) + position title
  (`19px`/600) + close ×.
- **Assigned** — list of resources; first carries a **Lead** tag (gold). Each row has a *Clear*
  action (editable surfaces).
- **Assign** — text input ("Name or rig…") + **Assign** button (Enter also commits) + a pool of
  one-tap pills from the roster.
- **Direct reports** — list of child positions with their leaders (when any).
- **Manage structure** (editable) — 2×2 grid: **Add sub-role**, **Rename**, **Move under…**,
  **Remove**. *Move* is disabled on the root; *Remove* is disabled on the root and on built-in
  positions.
- **Role history** (FieldShore K-13) — timestamped log of who held the position (e.g. IC: "13:02
  Assumed command — BC Reyes · Car 1"; "12:41 Initial IC — transferred — Capt. Vega · Rescue 1").

---

## Interactions & Behavior

### Drag to restructure (the core interaction)
Hand-rolled Pointer-Events drag (no library). A floating **ghost** card follows the pointer and
names the pending action; valid targets get a green outline, invalid ones dim, and the lifted
card fades.

- **Initiation:** desktop = press the **grip handle** (drag starts immediately past a 3px
  threshold); phone = **hold `200ms`** on the card body (a horizontal swipe before arming is let
  through as a scroll).
- **Drop targets** (resolved from live geometry under the pointer):
  - **Lead** — drop a *resource* on the **top half** of a node → that resource becomes the node's
    leader (`assignedResources[0]`). Node shows a dotted split line; ghost reads "Lead {title}".
  - **Subordinate** — drop on a node → reparent the dragged position (or, for a roster chip, create
    a new single-resource child) under it. Ghost reads "Subordinate of {title}".
  - **Reorder** — drop in a **gap** between siblings → reorder within the same parent. Gaps render
    as hot bars (vertical between horizontal siblings, horizontal between stacked ones).
- **Guards:** no cycles (can't drop a node onto itself or a descendant); the IC root can't be
  dragged; command-staff/single-resources don't count toward span.
- **Edge-pan:** dragging near a viewport edge auto-scrolls (`48px` band).
- **Roster chips → node:** *lead* assigns the rig as leader; *subordinate* spawns a single-resource
  child and assigns the rig to it.

### Zoom & pan
Per-surface zoom control (bottom-left): **−/+** step `0.15`, **Fit** (fits chart to viewport and
centers on the IC), and **ctrl/⌘ + wheel** inside the viewport. Scale clamps **0.4–1.6**. The
canvas uses `transform: scale()` from `transform-origin: 0 0`; connectors are recomputed from
**untransformed** layout geometry so they never detach on zoom. Desktop opens ~`0.95`, phone ~`0.7`.

### Connectors
SVG paths drawn from real node positions (not guessed), stroke `1.6`, color =
`color-mix(--text-secondary 50%)`. Three styles (a design choice — pick one for the app; the
prototype defaults to **elbow**):
- **Elbow** — orthogonal: down-stem, horizontal bus, vertical drop to each child.
- **Bracket** — same path with rounded `9px` corners.
- **Taper** — straight diagonals from the bus to each child top.
Command staff use a **dashed L-connector** from the parent's right edge. Deep groups whose
children are all single resources collapse to a **vertical spine** (stacked list).

### Assign / manage (sheet)
- **Assign:** type a name/rig + Enter or **Assign**; or tap a roster pool pill. Duplicate labels are
  ignored. **Clear** removes a resource.
- **Add sub-role:** opens an inline picker from the **position library** (Search/Medical Group
  Supervisor, Division Supervisor, Branch Director, Planning Section Chief, Liaison Officer, Strike
  Team Leader, Task Force Leader) → adds the chosen position as a child.
- **Rename:** inline input prefilled with the current title.
- **Move under…:** lists valid parents (excludes self, descendants, single-resources, command
  staff) → reparents.
- **Remove:** confirm step; removes the position **and its whole subtree**. Blocked for root and
  built-in positions.

### Span-of-control (NIMS doctrine)
Span = a node's direct reports **excluding command staff and single resources**. Optimal **5**,
acceptable **3–7**. The card shows a badge and the sheet eyebrow annotates: **6–7 → "caution"**
(amber, `--status-cutting-text`), **>7 → "over limit"** (red, `--danger-text`). In the seed,
Operations runs **6** → caution fires, and the rail nudges the IC to add a Branch.

### Exploration toolbar (REMOVE for production)
- **Theme** (Dark / Light / Sunlight / Broadcast) — these are FieldShore's real themes; wire to the
  **app's existing theme system**, don't rebuild this control. Default surface here is **Dark**.
- **Connectors** (Elbow / Bracket / Taper) — an internal design decision; pick one (recommend
  **Elbow**) and hard-set it, or expose in settings if desired.
- **Density** (Comfortable / Compact) — likewise a product decision; Comfortable is the default.
- **Reset incident** — re-seeds the demo data; demo-only.
- **"Live model" note** — demo annotation; remove.

### Motion & accessibility
Transitions: cards/borders `120–130ms`; sheets `200–220ms` `cubic-bezier(.2,0,.2,1)`; gap bars
`100ms`. All transitions are disabled under `prefers-reduced-motion: reduce`. Nodes are real
`<button>`s with `:focus-visible` rings; connectors are decorative (the tree is the semantic
structure). Drag surfaces set `touch-action: none` and disable text selection.

---

## State Management

**One store, two views.** A single in-memory store holds the incident; the desktop and phone views
both subscribe and re-render on any change (tiny pub/sub). Recreate this as one shared
store/state slice feeding both surfaces — not two independent component states.

**Position shape** (keyed by `id`):
```
{ id, title, kind, parentId, order, builtIn, side, floor, assignedResources: [{ ref, value, label, sub }] }
```
- `kind` ∈ the ICS taxonomy: `command`, `command-staff`, `section`, `branch`, `division`,
  `group`, `unit`, `staging`, `workstation`, `strike-team`, `task-force`, `single-resource`.
- `parentId` is `null` only for the IC root. `order` sorts siblings (fractional reorder).
- `builtIn` positions can't be removed. `floor`/`side` annotate Divisions. `assignedResources[0]`
  is the **leader**.

**Derived (compute, don't store):** the tree (`childrenOf`), the leader (`assignedResources[0]`),
the span count + level (`spanOf` / `spanLevel`), ancestor checks (cycle guard), subtree ids.

**Mutations (store API):** `reparent(id, newParentId)`, `reorder(id, parentId, index)`,
`assign(id, resource)`, `clear(id, label?)`, `addChild(parentId, title, kind)`, `rename(id, title)`,
`remove(id)` (drops the subtree, respects `builtIn`), `reset()`. Each mutation emits → all views
re-render. No async/data-fetching in the prototype; in the app these map to your incident/positions
API.

**View-local state (not in the store):** open sheet id, in-flight drag (pressed source, armed flag,
current drop target), and zoom scale per surface.

**Seed incident** (the demo state — *Meadowville Collapse*, Level IV, 24 personnel, OP 2 of 3,
IC = BC Reyes · Car 1):
- **Command staff:** Safety Officer (Capt. Nolan · Engine 4), Public Information Officer (unassigned).
- **Operations Section Chief** (Capt. Vega · Rescue 1) → 6 direct reports:
  - **Rescue Group** (Lt. Okafor) → Rescue 2 (4 crew), Engine 7 (3 crew)
  - **Shoring Group** (Lt. Briggs) → Truck 3 (4 crew), Engine 12 (3 crew)
  - **Search Group** (Lt. Hale) → K-9 Unit 2
  - **Staging** (FF Dunn) + Engine 19, Engine 22, Medic 4
  - **Cutting Station** (FF Castro) — workstation
  - **Division 2 Supervisor** (Capt. Ng · Truck 8, floor 2 / C side) → Truck 8 (4 crew)
- **Roster (checked in, unplaced):** Engine 30, Ladder 5, Medic 9, Rescue 4, Battalion 2, Squad 6.
- **Role history** seeded for IC, Operations, Shoring.

---

## Design Tokens

Map these to the app's existing tokens. FieldShore ships **four themes**; the board defaults to
**Dark**. Values below are Dark (the design default) with the **Light** baseline noted — the
**Sunlight** (high-glare/max-contrast) and **Broadcast** (projector/wall, pure-black) palettes are
in `command-board/org-chart-compat.css`.

**Surfaces & strokes**
| token | Dark | Light |
|---|---|---|
| `--surface-bg` | `#14171B` | `#F7F6F3` |
| `--surface-card` | `#1B1F25` | `#FFFFFF` |
| `--surface-elevated` | `#262C34` | `#FFFFFF` |
| `--border` (`--surface-stroke`) | `rgba(255,255,255,.10)` | `rgba(0,0,0,.08)` |
| `--border-strong` | `rgba(255,255,255,.20)` | `rgba(0,0,0,.18)` |

**Accent (the single gold — IC + primary actions)**
| token | Dark | Light |
|---|---|---|
| `--accent` | `#E2A93B` | `#8C6700` |
| `--on-accent` (`--accent-ink`) | `#1A1305` | `#FFFFFF` |

**Text**
| token | Dark | Light |
|---|---|---|
| `--text-primary` | `#ECEBE8` | `#1A1A1A` |
| `--text-secondary` | `#A6AAA6` | `#5C5C5C` |
| `--text-tertiary` | `#71756F` | `#8A8A8A` |

**Status (used for dots, badges, drag feedback)** — board aliases `--st-*-line` to these:
| meaning | token | Dark | Light |
|---|---|---|---|
| secured / assigned / valid-drop (green) | `--status-secured-text` | `#34D399` | `#065F46` |
| caution / span (amber) | `--status-cutting-text` | `#FBBF24` | `#92400E` |
| in-process / division loc (blue) | `--status-process-text` | `#60A5FA` | `#1D4ED8` |
| danger / over-limit / remove (red) | `--danger-text` | `#F87171` | `#B91C1C` |

**Typography**
- **UI font** `--font-ui` = **Geist Variable** (system-ui fallback).
- **Mono/numeral font** `--font-mono` = **Inter Variable** — used for rig names, sub-labels,
  metric numbers, timestamps, division badges. (Inter is used as the *numeric/mono* face here, not
  the UI face.)
- Scale: section/eyebrow labels `10–11px` / 600–700 / `.06–.16em` uppercase · node title `13.5px`/600
  · leader `12.5px` · body/sheet rows `13–14px` · sheet title `19px`/600 · incident name & metric
  numbers `24px`/600 (numbers tabular-nums) · base `14px`.

**Radius** — node/metric/manage cards `12px` · window `14px` · phone screen `36px` · inputs/buttons
`10px` · segmented controls `9–10px` · pills/chips/dots `999px`.

**Shadow** — `--shadow` cards (Dark `0 1px 2px rgba(0,0,0,.40)`, Light `0 1px 2px rgba(0,0,0,.06)`)
· `--shadow-lg` / `--shadow-modal` sheet & ghost (Dark `0 12px 40px rgba(0,0,0,.50)`).

**Spacing** — rail padding `20px`, rail gap `18px` · card padding `~11–13px` · tier gap (parent→child
vertical) `40px` comfortable / `30px` compact · sibling gutter `~28px` (card `padding: 0 14px`) ·
metric grid gap `10px`.

> Note on the token slice: this project's synced DS (`styles.css` → `tokens/default-theme.css`) ships
> only the **Light** theme on `:root` plus the color/shadow families. The board's
> `org-chart-compat.css` (a) aliases the board's legacy token names to the DS tokens and (b)
> reconstructs the Dark/Sunlight/Broadcast palettes. In the app, use the full token set from source
> (`src/app/tokens.css`) and you can drop that compat layer.

---

## Assets
- **No raster images.** All iconography is **inline SVG**:
  - Node/sheet action icons (grip, assign, rename, move, add, history, remove) — defined in the
    `ICON` map at the top of `command-board/org-view.js`.
  - Phone status-bar glyphs (signal, wifi, battery) — inline in `Command Board.html`.
  - Window traffic-light dots — CSS circles.
- **Fonts** — Geist (UI) and Inter (numerals/mono), self-hosted woff2 under `fonts/` with
  `fonts/fonts.css`. Subsets: latin, latin-ext, cyrillic(-ext), greek(-ext for Inter), vietnamese.
  In the app, use the codebase's existing Geist/Inter setup.

---

## Files
All paths are inside this handoff bundle.

**Prototype (`command-board/`):**
- `Command Board.html` — page shell: both device frames, the (demo-only) exploration toolbar, and the
  script that instantiates the two views against one store and wires the toolbar.
- `org-model.js` — the data model: ICS taxonomy + labels, the seeded incident, the roster, role
  history, tree/span helpers, and the live store (mutations + pub/sub).
- `org-view.js` — the view engine: one reusable interactive chart (render → SVG connectors → drag/drop
  → zoom → node sheet), instantiated for desktop and phone.
- `org-chart-redesign.css` — all board styling (chrome, frames, chart, node cards, drag feedback,
  zoom, sheet).
- `org-chart-compat.css` — token compatibility layer (legacy aliases + reconstructed Dark/Sunlight/
  Broadcast palettes). *Temporary — see the Design Tokens note.*

**Design-system slice (so the prototype runs offline):**
- `styles.css` — imports the token + font slice the board needs.
- `tokens/default-theme.css` — FieldShore Light-theme color tokens on `:root`.
- `fonts/` — Geist + Inter woff2 + `fonts.css`.

---

*Self-sufficient spec: a developer who wasn't in the design session should be able to build this from
this README alone, using the prototype to confirm exact values and behavior.*
