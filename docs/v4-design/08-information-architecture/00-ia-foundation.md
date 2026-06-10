# Information Architecture: Foundation

> Phase F foundation spec — the **"picker.md of Phase F."** It is to the screen specs what [`picker.md`](../03-primitives/picker.md) is to the primitives: the worked example that sets the depth bar, plus the cross-cutting decisions every screen inherits so no per-screen spec re-derives them.
> Authored at the depth of [`picker.md`](../03-primitives/picker.md) / [`card.md`](../03-primitives/card.md).
> Anchors three ADRs: **[ADR-014](../11-decisions/ADR-014-tab-structure.md)** (tab structure), **[ADR-015](../11-decisions/ADR-015-navigation-pattern.md)** (navigation), **[ADR-016](../11-decisions/ADR-016-modal-vs-sheet-rules.md)** (modal-vs-sheet). The reasoning lives here; the ADRs record the decisions.
> Source: [`06-synthesis.md`](../06-synthesis.md) §1.2 (workflow surfaces), §1.3 (cold-open), §1.8 (four surfaces / progressive density), §1.10 (visible safety), §2.5 (command transfer), §2.7 (the card tear), §3.2 (Cutting Station); [`02-principles.md`](../02-principles.md) Principles 2, 4, 7, 9, 10, 11; [`04-references/nims-org-structure.md`](../04-references/nims-org-structure.md) ([ADR-008](../11-decisions/ADR-008-nims-org-structure.md)); the v3 screen reality (`index.html` 5-tab shell, `app.js` `showTab()`).

---

## Purpose

Phase F turns the locked primitives ([`03-primitives/`](../03-primitives/)) and decisions (the ADRs, [`06-synthesis.md`](../06-synthesis.md)) into a **per-screen information-architecture spec** for every screen across the four surfaces (phone / tablet / laptop / broadcast-TV). The screen specs are the blueprint Phase G (workflows) and Phase H (the vertical slice) build against.

Sixteen of those screens are the everyday app; a handful more are first-class surfaces the synthesis named but the original issue list missed (Cutting Station, Org Chart, Hazard Log, Accountability). Every one of them shares the same skeleton — the same tab spine, the same navigation model, the same overlay rules, the same four-surface density logic. **This document owns that shared skeleton.** A screen spec that needed to re-argue "is this a sheet or a modal?" or "what does the tablet add?" would re-litigate a settled question; instead it **cites this file** and spends its words on what is genuinely particular to that screen.

This is the same discipline the primitive cascade enforced — [`accessibility.md`](../07-design-system/accessibility.md) consolidated every primitive's a11y *by reference, not restatement*, and the duplication it removed is the duplication the screen specs must also avoid.

### How a screen spec uses this file

Every spec authored from [`_TEMPLATE.md`](_TEMPLATE.md) cites four things here and does **not** restate them:
1. its **tab** and how it is reached (§Tab structure / the tab map),
2. its **navigation** behavior across surfaces (§Navigation pattern),
3. its **modal-vs-sheet row** (§Modal-vs-sheet — one row per screen),
4. the **four-surface density framework** (§Four surfaces) and the **persistent-chrome contract** (§Persistent chrome).

---

## Tab structure → [ADR-014](../11-decisions/ADR-014-tab-structure.md)

### Decision: keep the v3 five-tab spine; nest, do not expand.

v4 keeps the five bottom-nav tabs v3 ships, in the **v3 DOM order** (`index.html`):

> **Quick Find · Operations · Command · Inventory · Settings**

(The order is locked explicitly here — v3's markup is **Command *before* Inventory**; do not silently re-order it.) Every new first-class screen **nests** under one of the five as a tab-home composition, a sub-screen, a workstation, or an overlay. **None becomes a sixth tab.**

**Why.** The five tabs are the right NIMS-and-workflow seams: they line up 1:1 with the synthesis's module boundaries ([`06-synthesis.md`](../06-synthesis.md) §1.2), and they map to the four-role surface model (Principle 2) — Quick Find is the cold-open and the team-officer's calculator, Operations is the team-officer's live home, Command is the IC's home, Inventory and Settings are setup/config. Hartsdale has v3 muscle memory for exactly this layout; changing the tab count spends that for no doctrine reason. The skeptic's preservation list ([`05-essays/08-skeptical-review.md`](../05-essays/08-skeptical-review.md)) names Quick Find and the shore-point lifecycle as the two things v4 must *not* re-teach.

### The single alternative considered, and rejected

**A four-tab spine that dissolves Command into a SitStat chrome layer over Operations.** The IC's SitStat home (rec C-1) and the persistent Safety-Officer/OP header (§1.10) could in principle be a chrome band, freeing a tab. **Rejected:** Command holds genuinely distinct objects — the org chart, role history, the IC Command Checklist, ICS-201/203/207 assembly — that need a *home surface*, not just a header; collapsing it breaks the muscle memory the retraining gate protects; and **phone is the floor** (§Four surfaces) means the IC needs a reachable bottom-nav destination, not a tablet-assumed top band. Five tabs hold.

### The tab map — where every screen lives

**Pre-shell (routed before the shell mounts — but never a wall; see §Navigation / guest-first):**

| Screen | Issue | Placement |
|---|---|---|
| Login / Register | [#206](https://github.com/Vergo402/paratech-struts/issues/206) | Pre-shell auth route — reached *forward* from a dismissible "Sign in to sync" banner or Settings, never a gate at cold-open. |
| Department Setup | [#207](https://github.com/Vergo402/paratech-struts/issues/207) | Pre-shell on first dept creation; thereafter from Settings. |
| Invite Code Entry | [#208](https://github.com/Vergo402/paratech-struts/issues/208) | Pre-shell on join; thereafter from Settings. |

**The five tabs:**

| Tab | Screens nested under it |
|---|---|
| **Quick Find** | **Quick Find** ([#198](https://github.com/Vergo402/paratech-struts/issues/198)) — the cold-open guest landing; renders [`RecommendationCard`](../03-primitives/card.md)s. |
| **Operations** | **Operations** ([#199](https://github.com/Vergo402/paratech-struts/issues/199), tab home — [`ShorePointCard`](../03-primitives/card.md) status lanes + building→division→area→resource drilldown) · **Cutting Station** (new sub-issue — a workstation under Operations per [ADR-008](../11-decisions/ADR-008-nims-org-structure.md); absorbs v3's Cut Table) · **Task Level Checklist** ([#204](https://github.com/Vergo402/paratech-struts/issues/204) — reached via a **side-drawer** side-tab on the active-operation screen, [ADR-019](../11-decisions/ADR-019-side-drawer-primitive.md)) · **ORM / TCRM** ([#205](https://github.com/Vergo402/paratech-struts/issues/205) — a button-bar entry on any active-operation screen, not a tree screen). |
| **Command** | **Command** ([#201](https://github.com/Vergo402/paratech-struts/issues/201); **its home composition *is* SitStat** — the six canonical datums, rec C-1) · **IC Command Checklist** ([#203](https://github.com/Vergo402/paratech-struts/issues/203) — reached via a **side-drawer** side-tab, [ADR-019](../11-decisions/ADR-019-side-drawer-primitive.md)) · **Org Chart** (new sub-issue — a screen-level composition shown as a sheet/modal, K-12 7×2 tablet-portrait budget) · **Hazard Log** (new sub-issue — ICS-208, one tap from SitStat, feeds SP hazard badges) · command transfer (an interaction off the persistent IC header, detailed in Phase G). |
| **Inventory** | **Inventory** ([#200](https://github.com/Vergo402/paratech-struts/issues/200) — apparatus scope + the preserved visual-grid plate/wood picker sheet) · **Accountability** ([#297](https://github.com/Vergo402/paratech-struts/issues/297), formerly Roster — per-row sync state, the PAR test case, rec I-7). |
| **Settings** | **Settings** ([#202](https://github.com/Vergo402/paratech-struts/issues/202); themes, Native Controls, dept registration entry) · **User Manager** ([#209](https://github.com/Vergo402/paratech-struts/issues/209), admin) · **Cross-Dept Invite** ([#210](https://github.com/Vergo402/paratech-struts/issues/210), v4.5) · **Audit Log** ([#211](https://github.com/Vergo402/paratech-struts/issues/211); After-Action folds in as its laptop surface). |

**Cross-surface (not a tab):** **Broadcast View** ([#213](https://github.com/Vergo402/paratech-struts/issues/213)) is a **read-only projection mode** of any screen, selected as a display mode (cast from a tablet/laptop), never navigated to. This doc defines the broadcast adapter once (§Four surfaces); each screen spec fills its own broadcast column.

### Three constitution-named screens that do NOT become screens

- **SitStat** → **folds into Command** ([#201](https://github.com/Vergo402/paratech-struts/issues/201)). SitStat *is* the Command tab's home composition (six datums above the fold, rec C-1); it is not a separate destination. Making it one would be the §2.7 tear in a different costume.
- **After-Action** → **folds into Audit Log** ([#211](https://github.com/Vergo402/paratech-struts/issues/211)) as its laptop surface. After-action export is "filters and formatting, not data collection" ([`06-synthesis.md`](../06-synthesis.md) §3.6). Promote to its own thin spec only if the ICS-201/214 assembly view earns separate treatment.
- **Activity Feed** → **not created.** A running feed conflicts with Principle 10 (the app never becomes a comms channel — no chat, no push). "What happened" is a *read projection of the event log*, already covered by the Audit Log and per-node role history. This is a deliberate non-screen decision, recorded so a later session doesn't re-add it.

### The binding layout constraint to carry forward

The **K-12 tablet-portrait budget**: the Org Chart default preset must render **≤ 7 cards across 2 levels in tablet portrait without scroll** (Meadowville OP2 was the test that tore). This caps the default rendering and forces tap-to-descend rather than an infinite-canvas org tree. The Org Chart spec owns the detail; it is flagged here because it shapes the Command tab's composition.

---

## Navigation pattern → [ADR-015](../11-decisions/ADR-015-navigation-pattern.md)

### Bottom nav

Phone shows a **fixed bottom tab bar, five tabs, always visible**, that **never animates** — it is the app's stable frame, the one thing that does not move while everything inside it does ([`motion.md`](../07-design-system/motion.md) §What does not move). Tab switch is instant (v3 `showTab()` toggles `.active`; no transition). The active tab carries `aria-current="page"`. Targets are ≥ 56pt ([`spacing-grid.md`](../07-design-system/spacing-grid.md) §Touch targets).

**The bottom nav is navigation, not a [`segmented`](../03-primitives/segmented.md) control** — [`segmented.md`](../03-primitives/segmented.md) explicitly hands the bottom nav to this doc and excludes it from the segmented vocabulary. Do not build it as a `radiogroup`/`tablist`; it is an app-shell frame whose items route to top-level destinations.

### Drilldown and back

Within a tab, deeper content is reached by **push navigation, one level at a time**, with a **breadcrumb back-path** (v3's `drilldownBreadcrumb`: building → division → area → resource). System/Android back pops one level; the **tab bar stays mounted** (drilldown is *within* a tab, never a new tab). The [`list.md`](../03-primitives/list.md) tree "drills in one level at a time" — the same model.

**Within-screen scope ≠ navigation.** Filtering by apparatus, status, or assigned scope is a [`segmented`](../03-primitives/segmented.md) scope control (`tablist`) or a [filter chip set](../03-primitives/input.md), not a drilldown level. **Overlays never count as nav levels** — one [`sheet`](../03-primitives/sheet.md) / [`modal`](../03-primitives/modal.md) at a time; dismiss returns to the scroll position you left.

### Navigation across the four surfaces

| Surface | Navigation model |
|---|---|
| **Phone (team officer)** | Bottom tab bar (5). Drilldown = push + breadcrumb. **The floor.** |
| **Tablet (CP)** | The tab bar becomes a **320pt left rail** ([`spacing-grid.md`](../07-design-system/spacing-grid.md) §Surface breakpoints); the drilldown tree renders **expanded in the rail** ([`list.md`](../03-primitives/list.md)) — both panes visible at once. Same five destinations. |
| **Laptop (Toughbook)** | Left rail **plus a command palette** (Cmd/Ctrl+K, rec C-9): jump-to-screen, jump-to-shore-point, run-action — every action reachable in < 3 keystrokes. Full keyboard parity (the [`card.md`](../03-primitives/card.md) Advance/Step-back keyboard equivalents apply). |
| **Broadcast TV** | **No navigation.** A read-only projection of one chosen screen, driven by the casting device. No tab bar, no rail, no palette. |

### Cold-open and the guest-first routing (the auth question for ADR-015)

The app boots to **guest mode and lands on Quick Find** (or the last-used tab) with **no authentication wall**. This follows Principle 11 ("the app earns its place quietly … no onboarding flows that delay the IC reaching the shore-point list") and the local-first posture ([`06-synthesis.md`](../06-synthesis.md) §1.3): a firefighter who opens the app at a collapse must reach the work, not a login form. Auth ships in v4.0 (D7), but the **interface for it is reached forward, not as a gate**:

```
boot
 └─ (one-time silent v3→v4 migration, if local v3 data present)
     └─ shell mounts in GUEST mode → [Quick Find]
          ├─ "Sign in to sync" banner (dismissible, persistent-until-actioned) ──► Login/Register (#206)
          └─ Settings ──► Login/Register · Department Setup (#207) · Invite Code (#208)
                              └─ on success → shell in AUTHED mode (founding Admin claimed once via a one-time banner)
```

Guest state persists locally (local-first), so even first-run dept creation/join is deferrable — the operator can run an entire local operation as a guest and claim/sync later. The auth screens are **pre-shell full-screen routes**, not overlays.

---

## Modal-vs-sheet rules → [ADR-016](../11-decisions/ADR-016-modal-vs-sheet-rules.md)

This ADR **ratifies and applies** the doctrine already settled in [`sheet.md`](../03-primitives/sheet.md) and [`modal.md`](../03-primitives/modal.md) — it does not re-decide it. The boundary, verbatim from those files:

- **[Sheet](../03-primitives/sheet.md)** = choose / enter / review, non-destructive, parent stays in context, ≤ 60vh, rises to the thumb. The everyday rhythm.
- **[Modal](../03-primitives/modal.md)** = destructive/terminal confirm, **or** inventory-consequential confirm, **or** a form too large for a 60vh sheet, **or** a blocking alert. Centered, two-handed, rare.
- **Slide-to-advance** ([`card.md`](../03-primitives/card.md) / [`slider.md`](../03-primitives/slider.md), [ADR-010](../11-decisions/ADR-010-status-commit-model.md)) = the everyday status commit, reversible from the card — **no overlay at all.**
- **[WarningGate](../03-primitives/warning-gate.md)** = a persistent safety disclosure riding the `RecommendationCard` (unrated zone, over-capacity, the liability disclaimer) — not an overlay, never auto-dismisses.

### The per-screen application table (each screen spec cites its row)

| Screen | Overlay surfaces it raises | Surface type |
|---|---|---|
| **Quick Find** | wood/plate picker; fraction sub-control | **Sheet** (picker / visual-grid picker). Unrated-zone / over-capacity / disclaimer = **WarningGate** on the card, not an overlay. |
| **Operations** | Start Operation; Add Shore Point; Assign Equipment; End Operation; un-deploy | Start Op + Add SP = **full-screen-form modal** (> 60vh). Assign Equipment = **sheet**. End Operation = **destructive/terminal modal**. Un-deploy / inventory-decrementing return = **inventory-consequential modal**. Status advance = **slide on the card** (no overlay). |
| **Cutting Station** | mark-cut-done; priority override | Advance = **slide**. Reorder = **drag (tablet) / read-only (phone)**. Off-queue = **red-slash card state** ([`card.md`](../03-primitives/card.md)). No overlay. |
| **Task Level Checklist** | reached via a **side-drawer** (edge side-tab) | **Side-drawer** — the third overlay type, a companion panel ([`side-drawer.md`](../03-primitives/side-drawer.md), [ADR-019](../11-decisions/ADR-019-side-drawer-primitive.md)): phone = scrimmed, tablet/laptop = beside a **live** canvas. Leaf checks = **tap-toggle in place** inside it ([`nested-checklist.md`](../03-primitives/nested-checklist.md)); no confirm. |
| **IC Command Checklist** | reached via a **side-drawer** (edge side-tab) | **Side-drawer** ([`side-drawer.md`](../03-primitives/side-drawer.md), [ADR-019](../11-decisions/ADR-019-side-drawer-primitive.md)) — same companion treatment as the Task Level Checklist. Leaf checks = **tap-toggle in place** ([`nested-checklist.md`](../03-primitives/nested-checklist.md)); no confirm. |
| **ORM / TCRM** | the briefing surface | **Full-screen-form modal** (or a pushed route — see [`modal.md`](../03-primitives/modal.md) OQ2). Begin/End-briefing are buttons. |
| **Command / SitStat** | command transfer; role assignment | Transfer = **single action → optional full-screen takeover** (§2.5), not a stacked modal. Role assignment = **sheet**. |
| **Org Chart** | reparent; promote; node history | Pick/reparent = **sheet**; **modal** only when destructive (removing an assigned supervisor). Node history = **sheet** (inline panel on tablet). |
| **Hazard Log** | Add Hazard; ICS-208 export | Add Hazard = **sheet** (v3's modal re-sorts to a sheet per [`modal.md`](../03-primitives/modal.md) §v3 grounding). Export = sheet action / direct. |
| **Inventory** | plate/wood picker; Add Apparatus / External / Individual | Pickers = **sheet** (visual-grid preserved verbatim). Add Apparatus = **full-screen-form modal** if large. Delete = **destructive modal**. |
| **Accountability** | per-row sync detail | **Sheet**. No destructive overlay in the common path. |
| **Settings** | dept registration; theme; toggles | Toggles/segmented commit in place. Delete/leave dept = **destructive modal** (48pt non-operational targets). |
| **User Manager** | assign role; create/edit role; promote; revoke; delete role | Assign role / create-edit role / promote = **sheet**. Revoke / delete role = **destructive modal**. |
| **Cross-Dept Invite** | generate / enter code | **Sheet**. |
| **Audit Log** | — | Inline scope segmented + filter input; no destructive overlay. |
| **Login / Register · Dept Setup · Invite Code** | the forms | **Pre-shell full-screen routes**, not overlays. |
| **Broadcast View** | — | Renders **no interactive primitives** — no sheet, no modal, ever. |

---

## The four surfaces — progressive density, one app

The single canonical reference every screen spec links to instead of re-deriving. It consolidates [`spacing-grid.md`](../07-design-system/spacing-grid.md) §Surface breakpoints and the surface-adaptation tables in [`card.md`](../03-primitives/card.md) / [`list.md`](../03-primitives/list.md), framed for IA.

| Dimension | Phone (team officer) | Tablet (CP) | Laptop (Toughbook) | Broadcast TV |
|---|---|---|---|---|
| **Width / layout** | 320–430pt, single column | 768–1200pt, 320pt rail + pane | 1200pt+, 2–3 column | 1920×1080, grid, generous margin |
| **Role served** | the next single decision; usable phone-only (**FLOOR**) | the resource board; glance across the room | dense + keyboard; audit / IAP / after-action | one board legible at 8–12 ft |
| **Navigation** | bottom tabs; push drilldown | left rail; expanded tree | rail + command palette | none (cast target) |
| **Density** | one thing at a time | board + status summary bar (rec G-15) | multi-column sortable tables | status-card grid |
| **Touch / input** | 56pt / **60pt status** / 8pt dead zone | 56pt + drag affordances | 56pt + full keyboard parity | none |
| **Interactive primitives** | all | all | all + keyboard equivalents | **none** |
| **Type floor** | field-readable ramp ([`typography.md`](../07-design-system/typography.md)) | same | same | **≥ 32pt**, nothing sub-32pt |
| **Motion** | full ([`motion.md`](../07-design-system/motion.md)) | full | full | **zero**; periodic refresh poll |

### The governing rule (stated once, loudly)

> **Phone is the floor.** Every workflow is fully usable on the phone alone. Tablet, laptop, and broadcast are **progressive-density enhancements of the same screen — never parallel designs, never assumptions** ([`06-synthesis.md`](../06-synthesis.md) §1.8; [`sheet.md`](../03-primitives/sheet.md) / [`modal.md`](../03-primitives/modal.md) restate it). One event-log projection, four density adapters. If a capability exists only above the phone (Cutting Station drag-reorder, rec G-16; the laptop command palette), the phone has a working equivalent (slide-to-advance; tap navigation).

---

## Persistent chrome (the contract every IC-facing screen honors)

Some elements are not part of any one screen — they ride the shell. Each screen spec assumes their presence rather than redrawing them.

- **Safety Officer + OP-period header.** On every IC-facing screen, the persistent header shows the **Safety Officer's name and status** and the **operational-period indicator with elapsed time** — no navigation required to find who is watching safety (§1.10, rec C-6). One tap on the Safety Officer opens the **Hazard Log**.
- **Sync indicator.** The ambient local-first sync state is **one quiet indicator** (Principle 8), never a blocking modal and never a spinner ([`loading-state.md`](../03-primitives/loading-state.md) draws the loading-vs-sync-indicator line). It lives in the shell chrome; the **Accountability** screen ([#297](https://github.com/Vergo402/paratech-struts/issues/297)) is where per-row sync detail is read.
- **"Sign in to sync" banner.** The guest-mode forward path to auth (§Navigation) — dismissible, persistent-until-actioned, never a wall.
- **Pocket lock** (rec G-13). A global behavior, not a screen: a proximity-triggered overlay that suppresses interaction when the phone is pocketed/covered, dismissed by a swipe-up from a bottom handle. This doc names it as shell chrome; **Phase H wires the sensor + gesture** (open question carried below).
- **No life-safety signal ever rides the chrome** (Principle 10): no PAR/evac/mayday, no push notification during an operation. The chrome carries status and context, not comms.

---

## Cross-cutting empty / error / loading posture

So each screen spec states only what is particular to it:

- **Empty** ([`empty-state.md`](../03-primitives/empty-state.md)): **settle before empty** — never flash an empty state during a load. Pick the variant by *why* it is empty (first-run / filtered / upstream-blocked / all-clear). A **safety or rating omission is never a neutral "no results"** — it defers to the [`warning-gate`](../03-primitives/warning-gate.md) (Principle 7/10; e.g. "no struts fit" surfaces the boundary, it doesn't look like missing data).
- **Error**: inline ([`input.md`](../03-primitives/input.md) `aria-invalid` + a specific message), or a [`warning-gate`](../03-primitives/warning-gate.md), or — only for an unrecoverable system condition — a blocking-alert [`modal`](../03-primitives/modal.md). **Never a bare `alert()`** (the v3 debt does not carry forward).
- **Loading** ([`loading-state.md`](../03-primitives/loading-state.md)): **local-first makes a loader the exception** — most reads are instant, so show nothing. Name a loading treatment only where a genuine wait exists (first Firebase hydration, an Excel import, a cast handshake). Determinate over indeterminate; failure resolves inline.

---

## Screen inventory & sequencing

The full Phase F screen set (issue numbers; ✚ = new sub-issue filed this session; ✗ = not created):

**Quick Find:** Quick Find (#198).
**Operations:** Operations (#199) · Cutting Station ✚ · Task Level Checklist (#204) · ORM/TCRM (#205).
**Command:** Command/SitStat (#201) · IC Command Checklist (#203) · Org Chart ✚ · Hazard Log ✚.
**Inventory:** Inventory (#200) · Accountability ✚ (formerly Roster).
**Settings:** Settings (#202) · User Manager (#209) · Cross-Dept Invite (#210, v4.5) · Audit Log (#211, After-Action folded).
**Cross-surface:** Broadcast View (#213).
**Pre-shell:** Login/Register (#206) · Dept Setup (#207) · Invite Code (#208).
**Not created:** Demo Mode (#212, closed — demo dropped) · Activity Feed (Principle 10) · SitStat (folds into #201) · After-Action (folds into #211).

**Recommended session order** (2–3 screens each; slice-critical first — the Phase H slice "Start operation → Add shore point → Deploy strut" exercises Operations, Quick Find, Cutting Station, Command/SitStat):

1. **Operations (#199) + Cutting Station ✚** — coupled by the event-log projection and the off-queue red-slash.
2. **Quick Find (#198) + Inventory (#200)** — the `RecommendationCard` deploy surface and the stock it pulls from.
3. **Command/SitStat (#201) + Org Chart ✚ + Hazard Log ✚** — SitStat surfaces both.
4. **IC Command Checklist (#203) + Task Level (#204) + ORM/TCRM (#205)** — batch; all compose [`nested-checklist`](../03-primitives/nested-checklist.md).
5. **Accountability ✚ (formerly Roster) + Settings (#202).**
6. **Login/Register (#206) + Dept Setup (#207) + Invite Code (#208)** — pre-shell, guest-first.
7. **User Manager (#209) + Audit Log (#211) + Cross-Dept Invite (#210)**, then **Broadcast View (#213) last** (a projection over screens that must exist first).

The full **Phase F gate** ([#217](https://github.com/Vergo402/paratech-struts/issues/217)) — Alex walks every screen spec — comes at the **end** of Phase F. This foundation has its own **mini-gate** first (ADR-014/015/016 + the template), because every screen depends on it.

---

## Anti-patterns (do not do these)

- **A sixth tab.** New screens nest; the spine is five (ADR-014).
- **Re-deriving the tab map, the nav model, the modal-vs-sheet rule, or the four-surface table in a screen spec.** Cite this file.
- **An auth wall at cold-open.** Guest-first; auth is reached forward (Principle 11, ADR-015).
- **Treating broadcast as an authored screen.** It is a read-only projection adapter; it renders no interactive primitive.
- **Re-adding Activity Feed / in-app comms.** Principle 10; the event-log projection covers "what happened."
- **A status overlay.** Status advances by a slide on the card, never a sheet or modal (ADR-010).
- **Building the bottom nav as a segmented control.** It is an app-shell frame ([`segmented.md`](../03-primitives/segmented.md)).

---

## Open questions for downstream

1. **Pocket-lock geometry** — the proximity threshold + swipe-up dismiss are affordance geometry, wired in the vertical slice (Phase H). The *placement* (global shell chrome) is fixed here. (Carries [`99-open-questions.md`](../99-open-questions.md) #26's pocket-lock thread into Phase H.)
2. **Tablet popover anchoring** — whether a tablet center-popover sheet tethers to its trigger with a pointer is a per-screen IA call ([`sheet.md`](../03-primitives/sheet.md) OQ3); each spec states it.
3. **When a full-screen-form modal should instead be a pushed route** (Start Operation, Add Shore Point at full step-count) — [`modal.md`](../03-primitives/modal.md) OQ2; resolved in the Operations spec.
4. **After-Action as its own spec vs. the Audit Log laptop surface** — folded here; revisit if the ICS-201/214 assembly view earns separate treatment.
