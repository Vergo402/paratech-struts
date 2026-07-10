# Design-Import Inventory — Claude Design → repo reconciliation

**Date:** 2026-07-02 · **Design project:** "FieldShore v4 — Code Components" (`322a8afa-146a-4aa7-a525-673e5d1fb509`)
**Purpose:** Phase 1 gate deliverable — everything Alex authored in Claude Design, classified,
diffed against the repo, with build recommendations. Per Alex: bring over **everything else
first, Command Board next**; extend-vs-replace decided from the diff below.

**Preservation status:** Command Board prototype (5 files) + all three handoff READMEs +
DESIGN-SYNC-NOTES.md saved under `artifacts/`. Large exploration HTMLs remain in the Design
project (stable, owner-writable) — fetch at build time per item. `DesignSync get_file` caps
at 256 KiB; anything larger must be rebuilt from its handoff README (none identified yet).

---

## Classification counts (decision aid)

| Bucket | Count | Meaning |
|---|---|---|
| **A · Buildable features** | 8 | Command Board + Ops tri-view + 6 Ideas — discrete, spec'd, actionable |
| **B · Umbrella reference** | 1 | Complete App v2 — a 23-screen composition; a *direction*, not one feature |
| **C · Superseded iterations** | ~9 | Ops studies v1s/variants that led to the "Recommended v2" — reference only |
| **D · Scaffolding/assets** | ~5 | Queue render, canvas, plate PNGs (assets for #384), earlier org-chart copy |

---

## A · Buildable features

### A1 · Command Board — ICS Org Chart redesign ⭐ (Alex: build AFTER the "everything else" set)

**Design side:** full working prototype (`command-board/`, 5 files, preserved) + self-sufficient
spec (`design_handoff_command_board/README.md`, preserved). Desktop command-post + phone floor
off ONE shared store; node-card variants; docked/bottom node sheet; drag-to-restructure
(lead/subordinate/reorder); zoom (−/+/Fit/wheel); SVG connectors; span-of-control doctrine;
incident rail w/ 2×2 metrics; roster strip; density modes; role history.

**Repo side (post-#396):** already has the org data model (kinds incl. branch/strike-team/
task-force/workstation, keyed positions, `assignedResources[]`, leader=first, fractional order,
role history via event log), the full drag system (`useOrgDragDrop.ts` — lead top-half /
subordinate / gap-reorder / ghost / cycle guards / edge-pan), roster strip, span calc
(`core/org/span.ts`, caution 6–7 / over >7), Segmented Org/Hazard header, NodeSheet with
manage grid, pinch-zoom + fit-on-open.

**Verdict: EXTEND — do not replace.** The prototype's store API maps 1:1 onto the repo's
event-sourced org store (which also carries cloud sync + tests the prototype lacks). The
concrete deltas to port (the diff Alex asked for):

| # | Delta | Repo status | Prototype source |
|---|---|---|---|
| 1 | SVG connector layer (elbow default; dashed staff-L; spine collapse) | CSS-only connectors (`command.css:525` "no SVG") — behaviors exist, layer doesn't | `org-view.js drawLinks()` + `_localBox()` (untransformed geometry = zoom-immune) |
| 2 | Zoom controls: −/+ steps (0.15), Fit button, ctrl/⌘+wheel, clamp 0.4–1.6 | pinch + auto-fit-on-open only; no buttons/wheel | `org-view.js setScale()/fit()` |
| 3 | Desktop NodeSheet = right-docked NON-modal inspector (380px) | always bottom `Sheet` | prototype `.win .sheet` CSS; repo already has ADR-019 `SideDrawer` — reuse it |
| 4 | Node card: status dot (assigned/unassigned), `+N resources` badge, `Div N · side` badge, recessed mono single-resource style, dashed workstation border | `is-filled` class exists w/ NO css; badges missing; `side`/`floor` modeled but never rendered | `org-chart-redesign.css` node section |
| 5 | Incident rail: 2×2 metrics (Apparatus/Shore points/Positions/Hazards) + span-of-control advisory ("consider a Branch") + IC accent underline treatment | rail exists w/ different tiles; no positions count, no span note | `Command Board.html` deck-rail |
| 6 | NodeSheet content: inline assign input + roster-pool pills; direct-reports as a LIST | assign = nested AssignResourceSheet; reports = count only | `org-view.js _renderSheetBody()` |
| 7 | Density modes (comfortable/compact) | missing | `.density-compact` CSS + `--tier-gap` |
| 8 | "My role" jump-to-node on phone | button exists but opens role-declaration picker instead | prototype `data-myrole` handler (note: repo behavior may be intentional — confirm w/ Alex) |

Effort: L (one solid session, mostly UI-layer; no schema/event changes except possibly none).

### A2 · Operations tri-view — Division / Board / List (the "Recommended" direction)

**Design side:** `FieldShore Operations (Recommended) v2.html` (+ iPad variants in
`FieldShore Ops - 3 Views x 2 Devices.html`), spec'd in `design_handoff_fieldshore/README.md`
(preserved). Three coordinated views of shore points:
- **Division view** — points laid out by BUILDING LEVEL (DIV 2 / DIV 1 / SUB 1 stacked bays,
  grade separator line, sub-level striped) — a genuinely new spatial paradigm
- **Board view** — kanban lanes by status w/ horizontal-scroll cards
- **List view** — grouped + sortable (Status/Level/Crew/Measure)
Plus: ops toolbar (role chip, elapsed, counts, view segmented), alert banner w/ ACK, flag
(swipe/long-press) treatment.

**Repo side:** `OperationsBoard` exists with board + "Mine" lens (#370) — a different, narrower
take. No Division-by-level view, no List view, no view segmented control, no alert banner.

**Verdict:** biggest single build in the "everything else" set; supersedes/absorbs the current
board as ONE of three views. Effort: XL (multi-session). Needs its own plan + mockup-fidelity
pass per view. Recommend building AFTER the small Ideas (quick wins first) but FIRST among the
big items, per Alex's "everything else first" ordering.

### A3–A8 · The six Idea explorations (all OPEN on the board, sub-issues of #383)

| Issue | What | Where | Design artifact | Effort |
|---|---|---|---|---|
| **#389** Cutting Station empty state | calm "No cuts queued" instead of null render | operations/CuttingStation | `Idea 389….html` | S |
| **#392** Command nav icon → hierarchy tree | swap tab glyph | app shell nav | `Idea 392….html` | S |
| **#409** In-stock-first connector picker | sort in-inventory plates to top, grey rest | QF deduction + deploy pickers | `Idea 409….html` | S–M |
| **#384** Photo plate thumbnails | real photos replace letter swatches | picker/VisualGridPicker, PlateSwatch | `Idea 384….html` + **24 plate PNGs already in Design project `plates/`** | M |
| **#391** Collapsible nav bar | hide nav to reclaim space on dense screens | app shell (bottom nav / desktop side nav) | `Idea 391….html` | M |
| **#390** Saw-station scoped view | per-station (A/B/+N) screen: own cut + full queue | operations/CuttingStation | `Idea 390….html` | M–L |

Suggested order (quick wins → structural): #389 → #392 → #409 → #384 → #391 → #390.

## B · Umbrella reference

**`FieldShore - Complete App v2.html`** + `design_handoff_fieldshore/README.md` — all 23
screens (Auth, QF, Ops ×3 views ×2 devices, Command ×3 devices, Cut Table, Inventory,
Settings) as one pannable canvas. **Not a single buildable item** — it's the coherence
reference the features above live inside. Use per-section when building A-items; audit v4
screens against it opportunistically.

⚠️ **Token-mapping caveat:** the handoff names IBM Plex Sans/Mono + Archivo and slightly
different surface hexes (#181B20 vs the app's #14171B, etc.). Same rule as the Command Board
handoff: **the app's `src/app/tokens.css` (Geist/Inter, 4 themes) is the source of truth** —
map handoff tokens to app tokens, don't import the handoff palette. (Its status-color table
also mixes light-theme pairs under a dark heading — auto-generated inconsistency; trust the
app tokens + the rendered prototypes, not that table.)

## C · Superseded iterations (reference only — no build)

`FieldShore Ops - 4 Directions.html` (+`-print` variant), `…D1 x D3 Merge.html`,
`…List Grouping.html`, `…Board + Command iPad.html` (+`copy`), `FieldShore - Complete App.html`
(v1), `FieldShore Operations (Recommended).html` (v1), `design_handoff_fieldshore_v4/`
(earlier handoff generation). These are the exploration trail that produced the v2s. Keep in
Design for provenance; nothing to build.

## D · Scaffolding / assets

- `plates/*.png` (24) — **real assets for #384**; fetch at build time (binary)
- `Design Exploration Queue.html`, `Canvas.dc.html`, `exploration-chrome.css`,
  `exploration-quiet.js`, `support.js`, `screenshots/phone-board.png` — session scaffolding
- `uploads/FieldShore Design System/Org Chart Redesign.*` — earlier command-board copy,
  superseded by `command-board/`
- `DESIGN-SYNC-NOTES.md` (preserved) — also fixes the recurring validator warning: 12
  component-local vars need `/* @kind color */` annotations in source (NOT :root hoisting) +
  dedupe the double `--org-line`/`--org-gap` in `.fs-org`

---

## Recommended sequence (for the gate)

1. **Worktree setup** (`design-import` branch off `v4-redesign`)
2. **Quick-win Ideas:** #389 → #392 → #409 → #384 (S/M each, independent, each verifiable
   against its Design mockup)
3. **#391 collapsible nav → #390 saw-station view** (M/M–L, touch shell + cutting station)
4. **A2 Operations tri-view** (XL — own mini-plan; Division view first, it's the novel one)
5. **A1 Command Board EXTEND** (L — the 8 deltas above)
6. **Ride-along:** design-sync warning fix (@kind annotations) + full resync at the end so
   the Design project reflects the rebuilt components
