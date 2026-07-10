# Handoff: FieldShore Design System & Complete App

> [Preserved verbatim from claude.ai/design project "FieldShore v4 — Code Components",
> path design_handoff_fieldshore/README.md, fetched 2026-07-02. Full content below.]

## Overview

FieldShore is a **real-time USAR/FEMA rescue shoring command system** for structural collapse operations. The design covers seven core sections (Auth, Quick Find, Operations, Command, Cut Table, Inventory, Settings) deployed across **phone, iPad, and desktop** platforms.

This handoff includes:
- **Complete app prototype** showing all screens and states (23 mobile/tablet/desktop layouts)
- **Design system with 100+ components** and 309 design tokens (colors, spacing, typography, shadows)
- **Command Board aesthetic**: surgical toolbar, minimal controls, instant recognition, clean hierarchy
- **Operations workflows**: Division/Board/List views for managing shore points in real time
- **Org chart & ICS structure**: Draggable nodes, role management, incident tracking

## About the Design Files

The files in this bundle are **design references created in HTML/CSS/JavaScript** — high-fidelity prototypes showing intended look, behavior, layout, and interactions. They are **not production code to copy directly**.

Your task: **Recreate these designs in the target codebase** using its established environment (React, Vue, native iOS/Android, etc.) and existing patterns, libraries, and design system.

## Fidelity

**High-fidelity (hifi).** Pixel-perfect mockups with final colors (6-color palette), typography (3-weight system), spacing (8px grid), shadows, borders, and hover/active states.

## Screens / Views (summary index — see prototype for full detail)

### Auth Section (Phone only)
- Login Screen — department ID entry; dark theme (bg #181B20, card #20242B, text #E9EAEC, accent #E2A93B); Archivo logo, IBM Plex Sans body, IBM Plex Mono values
- Welcome Screen — first-launch onboarding; 2-col tile grid (Quick Find, Operations, Command, Inventory)

### Quick Find Section (Phone & iPad)
- Input Screen — strut calculator; measurement input (feet/inches/fraction), load card, system chips (Gold/Grey/LockStroke), deduction toggle, FAB "Quick Start"
- Results Sheet (phone overlay) — bottom sheet 68% max height, filter tabs, result cards w/ left-border accent, gold/grey badges, best card green border
- iPad Two-Column — input rail (380px) + results main

### Operations Section (Phone & iPad)
- Toolbar — op name + role chip ("YOU RUNNER"), elapsed mono, counts, Division/Board/List segmented toggle, FAB "+ Shore Point"
- Alert Banner — critical issues ("Verify physical strut"), red iconbox, ACK button
- **Division View** — shore points BY BUILDING LEVEL (DIV 2 / DIV 1 / SUB 1 stacked); level header (big mono number) + flex-wrap bay of 105px point cards; grade separator ("Grade · Ground" dashed accent line); sub-level darker bg w/ diagonal stripe; card = ID + measurement (mono 15px) + status badge, 3px left border in status color, flagged = red
- **Board View** — kanban by status (Pending → Cutting → Runner → Process → Strut Set → Secured); 6 lanes, lane header = count + abbrev, horizontal-scroll 116px cards
- **List View** — grouped list, sort by Status/Level/Crew/Measure; group headers w/ colored dot + count; full-width cards
- iPad Operations — all three views scaled (Division full grid, Board 6-col, List table-like)

### Command Section (Phone, iPad, Desktop)
- Dashboard (phone) — IC-only; metrics grid (elapsed/apparatus/shore points), sections: Apparatus chips, External Equipment, Individuals, My Role, ICS Organization link, Hazard Log link; "End Op" red button
- Org Chart (phone) — legend (Active green / Staged gold / Unassigned grey); recursive indented tree w/ left-border connectors, dot + role + name + chevron collapse
- iPad Split — dashboard rail (310px) + org chart main
- Desktop Full — top nav bar (52px) + sidebar (272px) + org chart main

### Cut Table Section (Phone & iPad)
- Queue (phone) — Cutting section + Cut Complete section; cut card = ID/crew mono, location 15px, measurement mono 24px, "Mark Cut Complete" accent button; empty state dashed border
- iPad Detail — left rail (440px) queue + right detail of one point w/ Actual Cut Length input (3 fields) + Mark Complete / Send to Runner

### Inventory Section (Phone, iPad, Desktop)
- Apparatus List (phone) — My Apparatus / External tabs; expandable cards; equipment rows "2 avail · 1 deployed" mono
- Add Equipment Sheet — bottom sheet 72%, 3-col item grid (name / spec / qty mono accent), Done button
- iPad/Desktop — rail + detail with +/− buttons

### Settings Section (Phone & iPad)
- Settings List — sections: Department (Name, ID), Appearance (Theme), Equipment (Apparatus Types), App (Updates, Feedback, Data Mgmt), Account (Log Out red)
- iPad split — categories rail + detail

## Interactions & Behavior (key values)
- Bottom tab bar 5 tabs; active = accent #E2A93B
- Sticky toolbars; segmented controls w/ accent-sub active state
- Bottom sheets: 220ms cubic-bezier(.2,0,.2,1), drag handle, 160ms scrim, 68–78% max height phone
- Hover: border-strong 120ms; focus 2px accent outline
- Measurement input: mono 22px/600, blink cursor 1s step-end, active = accent border + accent-subtle bg
- Buttons: primary accent bg #E2A93B text #1A1305 hover brightness(1.06); secondary accent text; outline stroke border; danger #F87171
- Toggles: 38×22px, accent on
- Motion: 120–160ms UI, 220ms sheets; prefers-reduced-motion respected

## State Management (per-section state vars)
- Auth: departmentId, isLoading, error, isAuthenticated
- Quick Find: opening, estimatedLoad, selectedSystems, includeDeductions, results, isLoading
- Operations: operationId, viewMode (Division/Board/List), shorePoints, filters, alerts, isLoading; density compact/normal; real-time refresh
- Command: operationId, isIC, apparatus, individuals, orgChart, hazards, editMode
- Cut Table: cuttingQueue, completeQueue, selectedPointId, actualMeasure
- Inventory: apparatus, selectedApparatus, equipment, deployments, showAddSheet
- Settings: departmentName, theme, apparatus, showExportModal

## Design Tokens (handoff palette — NOTE: map to app tokens, see integration note)
- Accent #E2A93B; accent-subtle rgba(226,169,59,.10)
- Text: primary #E9EAEC / secondary #A0A6AE / tertiary #6C727A
- Surfaces: bg #181B20 / card #20242B / card-hi #262C34
- Status pairs: Pending #4B5563/#F3F4F6 · Process #1D4ED8/#EFF6FF · Strut Set #5B21B6/#F5F3FF · Cutting #92400E/#FEF3C7 · Runner #9A3412/#FFEDD5 · Secured #065F46/#ECFDF5 · Returned #57534E/#F5F5F4 · Waiting #7A5A00/#FBEFC4
- LockStroke #0E7490/#ECFEFF; Danger #F87171/#FEF2F2
- Stroke rgba(255,255,255,.07) / strong .12; Scrim rgba(0,0,0,.40)
- Spacing 8px grid (8/12/16/20/24/32/48/56/64)
- Type: IBM Plex Sans (UI) + Archivo (headings 600–800) + IBM Plex Mono (values); scale XS 9.5px → XXL 21–24px; mono values 12–32px
- Radius: 6–7 / 8–9 / 10–12 / 14–16 / 24 / 999px
- Shadows: flat cards; FAB 0 8px 22px rgba(0,0,0,.4); sheet 0 -2px 16px; modal 0 8px 32px
- Motion: cubic-bezier(.2,0,.2,1); 120/130/160/220ms; cursor blink 1s step-end

## Assets
- Inline SVG icons only (search, bars, org, package, settings, plus, chevrons, dots)
- No external images in core UI
- Fonts: Geist Variable (design), IBM Plex Sans/Mono (fallback/body), Archivo (headings)

## Files in This Handoff
- FieldShore - Complete App v2.html — all 23 screens on one pannable canvas
- FieldShore Operations (Recommended) v2.html — Operations tri-view detail (phone + iPad)
- styles.css / tokens/default-theme.css / _ds_bundle.css / _ds_manifest.json — DS slice
- _preview/ — 100+ component previews
- DESIGN-SYNC-NOTES.md, guidelines/docs/

## Integration Notes
1. Start with the HTML prototypes as visual spec; 2. reference tokens; 3. use component previews as library map; 4. 8px spacing grid; 5. implement transitions/focus/hover; 6. phone 390 / iPad 768–1024 / desktop 1280+; 7. implement listed state vars; 8. compare against prototypes.
