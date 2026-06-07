# UI Primitive: The Picker

> Copied from Section II of `v4-master-plan.md`. This file serves a double purpose: (1) it is the picker primitive spec; (2) it sets the **standard of detail** for every other primitive in this folder. When you write `sheet.md` or `card.md` or any other primitive doc, this is the level of detail expected.

---

## Purpose

A "picker" is any UI that asks the operator to choose one or many items from a defined set.

The reason v3 feels vibe coded is not that any single screen is bad. It's that **the same conceptual action looks different in five different places.** Selecting an apparatus, selecting a strut, selecting a role, selecting a base plate, and selecting a department all use distinct UI patterns. The reference apps the industry uses do not do this; FieldShore should not either.

v4 ships exactly four picker variants. Choosing between them is a rule, not a judgment call.

---

## The Four Variants

| Variant | When | Examples | Touch target | Open animation | Dismiss |
|---|---|---|---|---|---|
| **Inline segmented** | 2 to 4 options, mutually exclusive, parent screen visible at all times | Theme (System / Light / Dark); Apparatus tabs; wood size (4×4 / 6×6) | 44pt each, 48pt vertical | None, always visible | n/a |
| **Bottom sheet picker** | 5 to 7 options, single select, parent screen stays visible | Base plate, wood size, incident level (NIMS Level I–V), role for assignment | 56pt rows | Slide up from bottom edge over 200ms, scrim fades 0→40% | Backdrop tap, swipe down, system back |
| **Full screen list** | 8+ options OR options need search/filter OR rich preview content | Strut combinations, apparatus list at scale, shore point picker for cross op move | 56pt rows | Push from right (phone), modal sheet (tablet/laptop) | "Done" button left, Cancel right |
| **Power select** | Fallback ONLY when accessibility tech (VoiceOver/TalkBack) is in use OR operator has explicitly enabled "Native Controls" in Settings | Any of the above | OS default | OS default | OS default |

### The 8-options boundary

Between bottom sheet picker and full screen list, the boundary is **8 options**. This comes from Miller's Law, the cognitive science finding that most people can hold about five to seven distinct items in working memory at once. At 8 the operator is past that comfortable span and needs structural help (search, scroll, grouping) rather than a flat list.

---

## Universal Rules (apply to every picker variant)

1. **Search appears when item count exceeds 7.** A search input that's never used is just clutter; a list of 200 strut combinations without search is hostile.

2. **Selection commits immediately for single select; multi select shows a primary "Apply" button.** No "Save" / "Cancel" / "Are you sure" for single select pickers. Trust the user; the doubt free escape principle (Principle 6) handles regret.

3. **Every picker exposes its current value above itself when collapsed.** The "Base plate" label shows "8×8 round" next to it, not just the picker affordance.

4. **Keyboard escapes always work.** Esc dismisses, arrow keys navigate, Enter commits.

5. **VoiceOver / TalkBack announces:** "Picker, [field name], currently [value]. Double tap to change."

6. **Outdoor readable mode** (a brightness and contrast boost we will spec in Phase E) **does not break picker affordances.** Borders thicken, type weight bumps, shadows drop, but the picker stays a picker.

7. **The bottom sheet picker uses a 64pt drag handle visible at the top edge.** Dragging is the gesture you teach once and never re teach.

8. **A picker invoked for a grouped shore type applies to all siblings at once.** When a picker is opened in a grouped-shore creation context — choosing the T-Shore wood size for a group of 3 — it asks **once** and applies to **every member of the group**, never three times. The picker carries an inline note stating the scope (*"Applies to all 3 members of this T-Shore group"*) so the operator sees that one choice fans out (synthesis §3.5, rec **K-6**). This is the picker side of the grouped-shore phase split that [`card.md`](card.md) / [`slider.md`](slider.md) own for status; the group-vs-individual workflow detail is finalized in Phase G.

---

## Explicit Preservation: Plate Connector Picker

**Per Alex's direction: the v3 plate connector picker is NOT changing in v4.**

The base plate selector in v3 (a bottom sheet grid of plate cards with image thumbnails) is **not** one of the four variants above. It is a distinct **"visual grid picker"** pattern, designed deliberately, audited, and hardened for iOS in v3.5.1 (`touch-action: pan-y` + `transform: translateZ(0)` + visibility toggle).

v4 inherits the plate picker's behavior verbatim. The picker doctrine names the "visual grid picker" pattern so future image card selectors (e.g. apparatus thumbnails if we ever add photos) have a consistent reference, but it does not redesign the plate picker. The wood size selector keeps its grid with image affordance.

**Visual polish only. Interaction stays.**

---

## Surface Adaptations

| Surface | Behavior |
|---|---|
| **Phone (team officer)** | Bottom sheets fill 60vh max, scrim covers parent. Full screen lists push from right with native back gesture. |
| **Tablet (CP)** | Bottom sheets become center popover sheets anchored to the triggering control. Full screen lists become modal sheets at 600pt wide max. |
| **Laptop (Toughbook)** | Full screen lists become floating panels next to the triggering control. Keyboard first; Tab cycles options. |
| **Broadcast TV** | Pickers never render. Pickers are interactive primitives, and broadcast view is read only. Current selected value renders large; the picker affordance does not. |

---

## Accessibility Floor

- Every picker passes WCAG 2.1 AA (we aim for AAA on the bottom sheet handle and primary affordances).
- VoiceOver and TalkBack scripts are documented per variant in `07-design-system/accessibility.md` (Phase E).
- Touch targets meet 44pt minimum on phone, 56pt minimum on tablet and laptop.
- Color is never the only differentiator (every selected state also has a checkmark, weight change, or border).
- Reduce Motion respect: animations drop to instant when the OS reports `prefers-reduced-motion`.

---

## Anti Patterns (do not do these)

- **Dropdown that opens upward at the bottom of the screen.** Use bottom sheet instead.
- **Native `<select>` styled to look custom.** Either fully custom or fully native, no in between.
- **Picker that requires three taps to select an option.** One tap to open, one tap to select. Done.
- **Search input that triggers loading state.** All picker data is local; no async lookups in a picker.
- **"Are you sure?" before applying a picker selection.** Principle 6.

---

## Open Questions for Phase E

These get resolved when the design system phase fills out the rest of the primitives:

- Exact `font-size` and `letter-spacing` per surface.
- Exact corner radius (likely 12pt, but TBD).
- Exact shadow elevation for the bottom sheet.
- The visual grid picker spec (currently inherited from v3; needs documented in this doctrine when v4 polishes it visually).
- Empty state copy when a picker has no options (e.g., department roster picker before any users exist).

---

## Why This File Exists in Phase A

The picker doctrine is in Phase A, not Phase E where it ultimately lives, to set the **standard of detail** for every essay agent and every downstream session. When an agent reads the principles and this picker spec, they understand the kind of work expected. Every primitive will eventually have a doc at this level of detail. Multiply this by roughly 15 primitives and you have roughly 220 pages of design doc. That is the floor, not the ceiling.
