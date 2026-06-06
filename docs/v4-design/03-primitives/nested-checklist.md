# UI Primitive: The Nested Checklist

> Phase E primitive spec ([#196](https://github.com/Vergo402/paratech-struts/issues/196)). The **doctrine attestation tree** — a multi-level list of checkable steps where each leaf records *who* attested it and *when*, and each parent rolls up its children's progress. Authored at the depth of [`picker.md`](picker.md).
> Source: the plan's **D6** (`keen-whistling-pancake.md` §III.D6 + §IV Phase E) — the checklist feature definition — plus essays [`05-essays/03-ic-workflow.md`](../05-essays/03-ic-workflow.md) (the IC's phase-by-phase checklist) and [`05-essays/06-domain-ux.md`](../05-essays/06-domain-ux.md). Governed by **Principle 1** (*defer to doctrine, not invention*), **Principle 7** (*visible safety*), **Principle 4** (*one canonical action*), **Principle 9** (*no mystery meat — color is never the only signal*), and **Principle 3** (*calm in chaos*). Attribution follows **D7.5** (audit logging) and is consistent with [ADR-008](../11-decisions/ADR-008-nims-org-structure.md) (spelled-out role titles). Like [`sheet.md`](sheet.md), [`modal.md`](modal.md), and [`badge.md`](badge.md), it mints **no token of its own** — every value is owned by a sibling and cited (`--icon-size-*` / `--icon-stroke-*` [`iconography.md`](../07-design-system/iconography.md), `--space-*` and the 56pt operational row [`spacing-grid.md`](../07-design-system/spacing-grid.md), `--motion-micro` [`motion.md`](../07-design-system/motion.md), the count badge [`badge.md`](badge.md), tabular figures [`typography.md`](../07-design-system/typography.md), `--accent` [`color.md`](../07-design-system/color.md)).

---

## Purpose

A nested checklist is a **tree of doctrine steps** the operator works top-down: each leaf is a single action to attest ("Determine location," "Establish perimeter," "Speak — anyone can stop the operation"), and each parent is a grouping that shows how far its children have gotten ("Phase I — Size up, 8 of 13"). The operator *checks the leaf*; the tree *rolls up the count*.

Every other primitive in this folder earns its doc by **retiring v3 sprawl** — [`badge.md`](badge.md) collapses two dozen tag classes, [`card.md`](card.md) is rebuilt from `renderResults()`, [`picker.md`](picker.md) unifies five inconsistent selectors. **This primitive is the inverse.** A repo grep for `checklist` / `nested-check` / `orm` / `tcrm` across `app.js`, `index.html`, and `style.css` returns nothing but base64 image data — **there is no v3 nested-checklist to retire.** The checklist feature was scoped to v3.20.0 (Bucket 1) but that release shipped external-equipment plumbing instead; the feature is now deferred to v4.1 (see [`voice-and-tone.md`](../07-design-system/voice-and-tone.md) OQ3).

So this doc does its job *before* the feature exists. Its purpose is to define **one component that three different screens will share**, so the sprawl that produced two dozen badge classes never gets a chance to start here. Three D6 screens — the IC Command Checklist, the Task Level Checklist, and the ORM / TCRM briefing — are otherwise three good opportunities to invent three different checkbox-tree UIs. This primitive forecloses that: there is exactly one nested checklist, ruled here, rendered the same way on every screen that needs a tree of attested steps. It also **reserves the attribution data shape** (the D6 `{ checked, by, at }` record, expanded for D7) so the eventual v4.1 feature, the Phase F screens, and any v3 prototype all write the same structure — the schema-reservation discipline essay 04 used for the data model, applied to a UI primitive.

---

## What it backs — one primitive, three screens

The primitive is screen-agnostic; these three D6 screens are its consumers. Their **information architecture is Phase F** and their **workflows are Phase G** — this doc owns the *component*, not the screens or their (paraphrased-doctrine) content.

| Screen | Surface (primary) | Depth | What the tree holds |
|---|---|---|---|
| **IC Command Checklist** | Tablet (command post); broadcast | **Deep — 3–4 levels** | Phases I–IV → assessments → sub-items (Size up → primary assessment → determine location …) |
| **Task Level Checklist** | Phone (team officer) | 2 levels | Assessment / Search / Access / Extricate / All-clear → their steps |
| **ORM / TCRM briefing** | Phone (Rescue Group Supervisor) | **Shallow — 1–2 levels** | The 4-step briefing (Explain · List · Ask · Speak) + the five team-member questions |

**Depth is content, not a different component.** The same primitive renders the ORM's near-flat four-step list and the IC Command's four-phase tree; only the data nests deeper. The ORM screen's *begin-briefing / end-briefing timestamp logging* (D6) is screen logic owned by Phase G, not the primitive — the primitive contributes the step list, not the session wrapper.

---

## The leaf-vs-section boundary

**Whether a node is a checkable leaf or a roll-up section is a rule, not a judgment call** — the same discipline [`badge.md`](badge.md) draws between badge and chip and [`sheet.md`](sheet.md) / [`modal.md`](modal.md) draw between their surfaces:

| It is a **leaf** (checkable) when… | It is a **section** (roll-up) when… |
|---|---|
| It is one doctrine action a person performs and attests | It groups other nodes |
| Checking it records an attestation (who + when) | It owns no attestation of its own |
| It has no children | It has children and a derived progress count |
| Its state is `checked` / `unchecked` | Its state is *computed* from its descendants |

> **Only leaves are checkable. A section's state is derived from its leaves and is never set by a single tap.**

This is the load-bearing domain rule of the primitive, and it is a deliberate **departure from the consumer tri-state checkbox** (where tapping a parent checks all children). Here, **there is no one-tap "check the whole phase."** Each doctrine step is an individual attestation tied to a named role and a timestamp (D7.5); a single gesture that marked thirteen size-up items "done by Rescue Group Supervisor at 14:32" would be a false record at the exact moment the record matters most — after-action and liability review (Principle 7 — *visible safety*; Principle 1 — defer to doctrine, do not shortcut it). A section *shows* `mixed` progress; it is not a control you can `mixed`-toggle.

---

## Anatomy

| Property | Value | Token / source |
|---|---|---|
| Row (leaf) height | **56pt** — the operational tap target; the **whole row toggles**, not the box | [`spacing-grid.md`](../07-design-system/spacing-grid.md) §Touch targets (G-1 operational floor) |
| Checkbox glyph | **24px**, an icon — outlined when unchecked, filled when checked | `--icon-size-md` — [`iconography.md`](../07-design-system/iconography.md) |
| Checkbox stroke / join | 1.5px stroke, 2px join radius | `--icon-stroke-default` / `--icon-radius` — [`iconography.md`](../07-design-system/iconography.md) |
| Checked fill | **`--accent`** — the active/filled icon color (same language as a filled nav icon) | [`iconography.md`](../07-design-system/iconography.md) §Color application; `--accent` [`color.md`](../07-design-system/color.md) |
| Check / fill animation | **100ms** fill cross-fade, on commit only | `--motion-micro` / `--ease-micro` — [`motion.md`](../07-design-system/motion.md) ("checkbox / icon fill") |
| Disclosure chevron | Chevron (down = open, right = closed); rotates over `--motion-micro` | "Chevron" utility glyph — [`iconography.md`](../07-design-system/iconography.md) |
| Indent per level | **16pt** per nesting level (aligns nesting to the card's horizontal grid) | `--space-4` — [`spacing-grid.md`](../07-design-system/spacing-grid.md) |
| Section label | 14 / 500 | `--type-body-medium` — [`typography.md`](../07-design-system/typography.md) |
| Leaf label | 14 / 400 | `--type-body` — [`typography.md`](../07-design-system/typography.md) |
| Progress count | A **count badge** — "8 / 13", tabular figures so it does not jitter as it climbs | [`badge.md`](badge.md) §Count badge; `font-variant-numeric: tabular-nums` [`typography.md`](../07-design-system/typography.md) |
| Attribution line | role + time beneath a checked leaf; time in **Geist Mono** | `--type-caption` + `--type-mono` — [`typography.md`](../07-design-system/typography.md) |
| Completion mark | the **Checkmark** glyph at section level when 100% | "Checkmark" utility glyph — [`iconography.md`](../07-design-system/iconography.md) |

The checklist is a **flat surface, not an elevated one**: it lives inline on its screen, never casts a shadow (shadows are the sheet's and modal's — [`spacing-grid.md`](../07-design-system/spacing-grid.md) §Elevation), and it mints no geometry of its own — every dimension above is a value a sibling already owns.

---

## The checkbox — three states, never color alone

A leaf checkbox has exactly three visual states, and each carries a **shape signal plus a text/semantic signal** so the state survives glare and colorblindness with zero information lost (Principle 9):

| State | Glyph | Color | Announced |
|---|---|---|---|
| **Unchecked** | empty square, outlined | `--text-secondary` stroke | "unchecked" |
| **Checked** | square **filled** + checkmark | `--accent` fill | "checked" + its attribution |
| **Indeterminate** *(sections only)* | square with a **centered horizontal bar** | `--accent` bar on outlined box | the section's progress count (never "mixed") |

- **The fill is the only animation a checkbox plays** — a 100ms `--motion-micro` cross-fade from outline to fill on the tap that commits it, the exact micro-interaction [`iconography.md`](../07-design-system/iconography.md) names as the canonical use of `--motion-micro`. No scale, no bounce, no checkmark "draw-on." On first render the box appears already in its stored state — a fill that plays on list load reads as load-state noise ([`motion.md`](../07-design-system/motion.md)).
- **Tap toggles; tapping again un-checks** — and that is *correct here*, where [`card.md`](card.md) deliberately forbids tap-to-advance for shore-point status. The difference is consequence: advancing a shore point is a safety-consequential state change, so it demands a deliberate slide ([ADR-010](../11-decisions/ADR-010-status-commit-model.md)); checking a doctrine step is a **reversible attestation** whose cost-to-undo is a re-tap. A wet-screen ghost-tap that checks "interviewed witnesses" is corrected with one more tap and re-attributed — no harm done. So the checklist uses the lightest commit gesture (tap), and the doubt-free-escape principle (Principle 6) is satisfied by the toggle itself, not a slide or a confirm.
- **The indeterminate bar is a section indicator, not a control.** It appears on a section whose leaves are partly checked; it is purely informational and rides the section's text progress count. It is **never** an `aria-checked="mixed"` interactive checkbox (see Accessibility).

---

## Attribution — every check is signed

This is the primitive's safety contract and the reason it is not just a list of boxes. **Every leaf check records who attested it and when** (Principle 7 — visible safety; D7.5 — audit logging). The record is reserved here so the v4.1 feature, the Phase F screens, and any v3 prototype write the same shape:

```
leaf record (reserved):
{
  checked: true,
  by:      <userUID>,        // D7: the authenticated user
  role:    "rescue-group-supervisor",  // D7.5: role at time of check
  device:  <deviceId>,       // D6 v1 attribution, retained
  at:      <timestamp>
}
```

- D6 v1 stored `by: deviceId` only. v4 expands it per D6's own "v4 expansion" note (*role-attributed checking … instead of just device*) and D7.5 (UID + role + device + timestamp). The primitive renders, and reserves, the fuller record.
- **The attribution is visible on the card, not buried in a log.** A checked leaf shows a caption beneath its label: the **role spelled out** (per [ADR-008](../11-decisions/ADR-008-nims-org-structure.md) / [`voice-and-tone.md`](../07-design-system/voice-and-tone.md) — "Rescue Group Supervisor," never "RGS") and the time in Geist Mono ("Rescue Group Supervisor · 14:32"). At-a-glance, the IC sees not just *what* is done but *who* attested it — the operational thread, the checklist analog of [`card.md`](card.md)'s cradle-to-grave deployed-strut line.
- **Un-checking clears the attribution and is itself an audited event** (the log records the un-check, its actor, and time — D7.5). A check is never silently erasable.

---

## Nesting, roll-up, and disclosure

- **3+ levels of nesting** (D6). Each level indents `--space-4` (16pt). The tree carries the IC Command Checklist's four-phase depth and the ORM's near-flat depth with the same rules.
- **Sections roll up a derived count** — "Phase I: 8 / 13" — rendered as a [count badge](badge.md) with tabular figures so the number climbs in place without the row reflowing. A 100%-complete section also shows the [Checkmark](../07-design-system/iconography.md) glyph. The count is the calm, honest progress signal — **not** a filling progress bar that animates (motion's anti-pattern; [ADR-010](../11-decisions/ADR-010-status-commit-model.md) retired progress-line animation system-wide).
- **Disclosure collapses a section to its header + count.** The chevron's rotation is the only motion (`--motion-micro`); **the content snaps open/closed — it does not animate its height.** Animated height on a long doctrine list is the same expense [`motion.md`](../07-design-system/motion.md) refuses for card reorder (it snaps), and a 4-phase IC checklist is long enough to feel it.
- **Auto-collapse completed branches (configurable, D6).** When every leaf in a section is checked, the section *may* auto-collapse to its one-line "complete" summary, keeping the operator's focus on the active phase. **The active (incomplete) branch never auto-collapses** — hiding the next undone step would violate visible safety (Principle 7). The default and the per-screen override are a Phase F IA decision (the IC Command's four long phases likely default on; the shallow ORM likely off).

---

## v3 grounding — net-new, defined first

Unlike every sibling, this primitive has **no v3 antecedent to carry forward or retire** (grep confirmed). Its only distant v3 relatives are structurally different:

| v3 element | Relationship |
|---|---|
| `toggleSection()` collapsible operation sections (`sectionCollapsedState`) | Shares the *collapse* idea only — not a checklist, not attributed, not nested-checkable. The disclosure behavior here is specified fresh against [`motion.md`](../07-design-system/motion.md). |
| Plain form `<input type="checkbox">` (settings) | Single, unattributed, ungrouped. Not this primitive. |

**What this closes is not a debt but a risk.** Three D6 screens are three chances to invent three checkbox-tree UIs with three indent scales, three checkbox styles, and three attribution formats — the exact pattern that produced v3's two dozen badge classes ([`badge.md`](badge.md)). Defining the primitive in Phase E, before any of the three screens is built in Phase F, is how that sprawl is prevented instead of later retired.

### Reconciling D6's raw numbers to the locked design system

D6 was written before Phase E locked the token scales, so three of its checkbox dimensions are **superseded by the tokens** — reconciled here the way [`spacing-grid.md`](../07-design-system/spacing-grid.md) reconciled the scattered touch-target numbers (B-6 / G-1 / G-17):

| D6 said | Reconciled to | Why |
|---|---|---|
| "Sunlight: checkboxes thicken to 32pt" | `--icon-size-md` (24px) **+ `--icon-stroke-heavy` (2px)** | [`iconography.md`](../07-design-system/iconography.md): the artboard never changes between surfaces; **stroke** thickens in sunlight, size holds. The *row* stays the 56pt operational target. |
| "Broadcast: 48pt checkboxes" | `--icon-size-xl` (48px) | Matches [`iconography.md`](../07-design-system/iconography.md)'s broadcast sizing exactly — no reconciliation needed beyond naming the token. |
| "Broadcast: 24pt body type" | `--type-display-2` (32pt) floor | [`typography.md`](../07-design-system/typography.md): no sub-32pt text ever renders on broadcast. |
| "Broadcast: no animations" | `--motion-instant` | [`motion.md`](../07-design-system/motion.md): broadcast resolves every duration token to zero. |

---

## Universal rules

1. **Only leaves are checkable; a section's state is derived.** There is no one-tap "complete the phase" — each doctrine step is attested individually.
2. **Every check is signed** — who (role, spelled out) and when (mono timestamp), visible on the row and written to the audit log (Principle 7; D7.5). A check with no attribution is forbidden.
3. **Three distinct checkbox states, each with shape + text, never color alone** (Principle 9): outlined / filled-with-check / centered-bar. The screen reader hears the state word, not the hue.
4. **Tap toggles a leaf; re-tap un-checks.** This is the right gesture *because* a checklist attestation is reversible at re-tap cost — unlike the safety-consequential shore-point status, which uses a deliberate slide ([`card.md`](card.md) / [ADR-010](../11-decisions/ADR-010-status-commit-model.md)). Never import the slide here; never add an "Are you sure?" to a toggle (Principle 6).
5. **The whole 56pt row is the target**, not the 24px box — gloves and wet screens miss small boxes ([`spacing-grid.md`](../07-design-system/spacing-grid.md)).
6. **Doctrine content is verbatim or paraphrase-then-approved, never invented** (Principle 1). The primitive renders a tree; the *strings* are sourced doctrine run past Alex before they ship (D6; [`voice-and-tone.md`](../07-design-system/voice-and-tone.md)).
7. **Progress is a count, not a bar.** "8 / 13" tabular; no animated progress line, no fill-up (Principle 3; [`motion.md`](../07-design-system/motion.md); [ADR-010](../11-decisions/ADR-010-status-commit-model.md)).
8. **Collapse snaps; only the chevron animates** (`--motion-micro`). No height animation on a long list.
9. **The active branch never auto-collapses.** Auto-collapse is for *completed* branches only — the next undone step is always visible (Principle 7).
10. **No celebration on completion.** Finishing Phase IV swaps in a "complete" count and checkmark — no confetti, no chime, no flourish (Principle 3 — calm; Principle 11 — earns its place quietly; [`voice-and-tone.md`](../07-design-system/voice-and-tone.md) — never cute).
11. **Mints no token.** Every dimension is cited from a sibling scale; reaching for an off-grid checkbox size or indent is the signal to use the nearest token, not invent one.

---

## Surface adaptations

| Surface | Behavior |
|---|---|
| **Phone (team officer)** | The **Task Level Checklist** and **ORM / TCRM** live here. Full-width 56pt rows, single column. Indent compresses but stays on the 16pt grid; visible depth is capped so a deep branch keeps its leaf labels readable (the active section focuses, ancestors collapse to headers). One section open at a time is the comfortable default. |
| **Tablet (command post)** | The **IC Command Checklist** lives here. Multiple phases visible at once, wider indent, room for the full attribution caption without truncation. The Operations Section Chief reads the Task Level tree alongside the resource board. |
| **Laptop (Toughbook)** | Keyboard-first: arrow keys move between rows, **Space / Enter toggles the focused leaf**, Enter on a section header expands/collapses (inherits the v3 delegated Enter/Space handler — [`accessibility.md`](../07-design-system/accessibility.md)). The dense audit/after-action view and the eventual ICS-201 auto-populate (D6 v4 expansion) are this surface's affairs. |
| **Broadcast TV** | **Read-only — renders, like [`badge.md`](badge.md), because it is mostly read-only content.** Shows phase headers + completion counts + checkboxes at `--icon-size-xl` (48px), body ≥32pt (`--type-display-2`), **zero motion** (`--motion-instant`). It is a snapshot of attested progress on the ~15s poll — **no toggle affordance renders** (the board cannot attest; attestation happens on the phone/tablet). The completion % per phase is the whole-room glance. |

The **sunlight** theme thickens the checkbox stroke to `--icon-stroke-heavy` (2px) and bumps type weight one step ([`typography.md`](../07-design-system/typography.md)); the box size and the 56pt row are unchanged.

---

## Accessibility floor

- **Each leaf is a real checkbox**: `role="checkbox"` + `aria-checked="true|false"`, with an accessible name that is its doctrine label. The whole row is the control; the 24px box is decoration within it.
- **Sections are not checkboxes.** A section is a `group` (its header a heading/disclosure with `aria-expanded`) whose accessible name carries the **progress as words** — "Phase I, Size up, 8 of 13 complete." It is deliberately **not** an `aria-checked="mixed"` control, because it is not a control: you cannot attest a whole phase in one action (see The leaf-vs-section boundary). The visual indeterminate bar is decorative; the group's spoken count carries the meaning. *(This is the one place the primitive departs from D6's literal "every item is a checkbox" — leaves are checkboxes, sections are progress-bearing groups; rationale above.)*
- **Attribution is announced with the state**, following the registry grammar — the checked leaf reads "Checkbox, Determine location, checked, Rescue Group Supervisor 14:32. Double tap to uncheck." The role is the spelled-out word, the time the field-spoken value (per [ADR-012](../11-decisions/ADR-012-measurement-precision-eighth-inch.md) number-reading rules).
- **Keyboard parity with every gesture**: Space/Enter toggles a focused leaf, Enter expands/collapses a focused section, arrows move row-to-row — no toggle is pointer-only ([`accessibility.md`](../07-design-system/accessibility.md) §Focus & keyboard).
- **Reduced motion loses nothing**: the fill cross-fade collapses to an instant swap and the chevron snaps; because the state is a glyph + a word, the new state is fully legible the instant it changes ([`motion.md`](../07-design-system/motion.md)).
- **`aria-live="polite"`** confirms a check the same way a status commit is announced — once, politely, never assertive for a routine attestation ([`accessibility.md`](../07-design-system/accessibility.md) anti-patterns).
- The leaf-checkbox and section-group scripts are registered in [`accessibility.md`](../07-design-system/accessibility.md) §Screen-reader scripts (this primitive's entry).

---

## Anti-patterns (do not do these)

- **A one-tap "check the whole phase."** A section is a roll-up, not a bulk-attest control — it would write a false signed record across every child (the leaf-vs-section rule; Principle 7).
- **A check with no attribution.** Every check records who + when; an anonymous check defeats the audit purpose (D7.5).
- **Color-only checked state.** A filled box with no checkmark and no announced "checked" fails in sun and for colorblind operators (Principle 9).
- **Slide-to-toggle a checklist item.** The slide is reserved for safety-consequential status ([`card.md`](card.md) / [ADR-010](../11-decisions/ADR-010-status-commit-model.md)); a reversible attestation uses the lightest gesture, a tap.
- **An "Are you sure?" on a toggle.** Reversibility (re-tap) replaces confirmation (Principle 6).
- **Inventing or rewording doctrine inline.** Content is sourced and paraphrase-then-approved (Principle 1; D6).
- **An animated progress bar or fill-up for section progress.** Use the tabular count; no progress-line animation anywhere in v4 ([ADR-010](../11-decisions/ADR-010-status-commit-model.md); [`motion.md`](../07-design-system/motion.md)).
- **Animating section collapse height.** Snap the content; rotate only the chevron.
- **Auto-collapsing the active branch.** Completed branches only — the next undone step stays visible (Principle 7).
- **A completion celebration** — confetti, a chime, a flourish on finishing a phase (Principle 3; Principle 11; [`voice-and-tone.md`](../07-design-system/voice-and-tone.md)).
- **An `aria-checked="mixed"` on a non-interactive section.** Sections are groups with a spoken count, not tri-state controls.
- **An off-grid checkbox size or indent.** 24px box (`--icon-size-md`), 16pt indent (`--space-4`), 56pt row — never a hand-picked value.
- **A toggle target smaller than the row.** The whole 56pt row toggles; a tiny 24px hit area fails gloves and wet screens.

---

## Open questions for downstream

1. **The indeterminate-bar glyph.** The centered "partial" bar on a `mixed` section is not in [`iconography.md`](../07-design-system/iconography.md)'s ~46-glyph inventory (which has Checkmark but no minus/partial). It needs adding to the utility set, drawn to `--icon-stroke-default` — flagged here, an icon-set addition Phase F can fold in (iconography reserves that the Phase F screen pass "may add or consolidate icons").
2. **Auto-collapse defaults per screen.** On for the IC Command's four long phases, off for the shallow ORM — the exact default and the user override are a Phase F IA decision.
3. **ICS-201 auto-populate.** Driving form fields from checklist state is a D6 *v4 expansion* — a Phase G workflow, not a primitive concern. The reserved attribution record is what makes it possible.
4. **Concurrent multi-user editing.** Two devices checking the same operation's checklist (D6 v4 expansion) reconcile through the `data/sync` seam ([ADR-009](../11-decisions/ADR-009-database-evaluation.md)); optimistic UI + conflict behavior is a Phase G/H call.
5. **Per-department editable checklists.** A D6 v4 expansion (custom checklists per call type) — the primitive renders any tree; the content editor is a later feature, out of Phase E scope.
6. **Phone visible-depth cap.** Exactly how many nesting levels stay visible before ancestors collapse to focus the active branch is affordance geometry for the vertical slice (Phase H), like the sheet's swipe threshold and the card's slide mechanics.
7. **The checklist content itself.** The paraphrased doctrine strings (IC Command, Task Level, ORM) are deferred to v4.1 with the feature ([`voice-and-tone.md`](../07-design-system/voice-and-tone.md) OQ3). This doc specs the component; the words come later, run past Alex before they ship.
