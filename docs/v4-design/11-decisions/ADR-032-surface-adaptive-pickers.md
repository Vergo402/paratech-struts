# ADR-032: Surface-adaptive pickers — anchored dropdown on desktop, bottom sheet on phone

> Architecture Decision Record. **Realizes** (does not supersede) `03-primitives/picker.md` + `sheet.md` §Surface adaptations and `07-design-system/architecture.md` ("layout adapts by surface; the seams do not fork"). Born from the Phase I Operations desktop review when Alex drove the built app.

---

## Status

- [x] Proposed
- [x] Accepted *(Phase I — Alex, 2026-06-15)*

**Date:** 2026-06-15
**Author:** Claude Opus 4.8 (Phase I session)
**Reviewer(s):** Alex (directed the change live)

---

## Context

The Phase H slice built every picker phone-first: a bottom **sheet** that rises from the viewport bottom on *all* surfaces. On desktop that's wrong — a selectable menu should **drop down anchored to its control**, not rise from the bottom. The design docs already said so: `picker.md`/`sheet.md` §Surface adaptations specify pickers becoming a "center popover anchored to the triggering control" (tablet) and a "floating panel beside the trigger, keyboard-first" (laptop); `picker.md` even lists "dropdown that opens upward at the bottom of the screen" as an anti-pattern. The slice simply never built the desktop variant. Three gaps blocked it: no JS surface-detection hook existed (surface was CSS-media-query-only — `theme.tsx` used `matchMedia` for color-scheme only), Radix Popover wasn't installed, and the pickers hard-wired `<Sheet>`.

**Scope:** the three **list** pickers — Group/apparatus (`BottomSheetPicker`), `DivisionPicker`, `BuildingPicker`. The visual plate/wood grid (`VisualGridPicker`) is **deferred** (see Decision 4).

---

## Decision

1. **Pickers are surface-adaptive: a bottom `Sheet` on phone, an anchored `Popover` dropdown on desktop (≥768px).** A new `PickerSurface` primitive switches between them on `useIsDesktop()`; the list pickers render their option rows **once** and hand them to `PickerSurface` as children. **The phone path is byte-identical** — `Sheet.tsx`, `overlay.ts`, `.fs-sheet` CSS untouched.

2. **`useMediaQuery` / `useIsDesktop` is the sanctioned JS-surface mechanism — bounded.** It mirrors ONE CSS breakpoint into JS so a component can swap a *structural* choice CSS can't make (a different overlay **primitive**). The boundary: **CSS for styling adaptations; the JS hook ONLY when the choice is structural (a different primitive / different DOM), never to re-do what a media query can.** It lives in **`ui/primitives`**, not `ui/hooks` — it is a pure presentation hook (imports only `react`); `ui/hooks` is the `@data` seam, and importing its barrel from a primitive would couple primitives to the data layer (against the primitives "no `@data` ever" rule). *(This places it differently from the build plan, which named `ui/hooks`; the boundary made primitives the correct home.)*

3. **The `Popover` primitive** (Radix `@radix-ui/react-popover`, `^1.1`) is Sheet's API twin (`{ open, onClose, title, anchor, children }`). `side="bottom"` makes it a true dropdown (Radix auto-flips up only when there's no room — the correct fallback, not the bottom-rise anti-pattern); **non-modal**, **no scrim** (the parent stays in context — the conventional desktop dropdown). The existing trigger button is the anchor, kept verbatim (anchored via `virtualRef`, never prop-injected, so it keeps its hand-authored `aria-expanded` + open-only `onClick`). It **mirrors Sheet's overlay-claim lifecycle** (`claimOverlay`/`releaseOverlay` + the `isTopOverlay`/`overlayContains` guards) so a dropdown opened inside the Add-Shore-Point form Modal **peels on Esc first** instead of closing the form, and a click in the portaled panel never reads as the Modal's outside-dismiss. Keyboard: Tab cycles rows + Enter/Space commit + Esc closes + focus returns to the trigger — all free from Radix; arrow-key roving deferred (the doctrine's "Tab cycles … Enter commits" floor is met).

4. **768/1200 consolidated to one branch.** `picker.md` splits tablet ("center popover, scrim dims") from laptop ("floating panel beside, keyboard-first"). One `≥768px` Popover serves both; the scrim/placement nuance is a CSS tunable deferred (shipped **scrimless** — the user asked for "a drop down list," and a scrimless anchored dropdown is the conventional affordance).

5. **`VisualGridPicker` (plate/wood grid) deferred.** It is a thumbnail **grid**, not a "drop down list" (`picker.md` §Explicit Preservation carves it out as a preserved-verbatim special case), and the single most iOS-fragile file (the v3.5.1 L-9 hardening: mounted-always `visibility` toggle, `touch-action`/`translateZ`, the bespoke scroll-lock defeat). Re-housing it on desktop means re-proving all of that on a second surface for a component doctrine says "do not modernize." It keeps rising from the bottom on desktop for now — a defensible inconsistency (different primitive, different surface rule). Full desktop consistency for it is a separate scoped task with its own iOS re-verification.

---

## Consequences

- **New:** `ui/primitives/useMediaQuery.ts` (`useMediaQuery` + `useIsDesktop`), `ui/primitives/Popover.tsx`, `ui/primitives/PickerSurface.tsx`, `.fs-popover` CSS; dep `@radix-ui/react-popover@^1.1.16` (a new Vite optimize entry — dev server must restart).
- **Changed:** `BottomSheetPicker`, `DivisionPicker`, `BuildingPicker` swap `<Sheet>` → `<PickerSurface anchor={triggerRef}>` (rows + add-action blocks unchanged). `BottomSheetPicker` keeps its now-slightly-misnamed name (renaming ripples through the barrel/gallery/`SheetPickerOption` re-exports — not worth the churn).
- **Realizes** picker.md/sheet.md §Surface adaptations + architecture.md line 132 (one-line "implemented via `useIsDesktop` + `Popover`/`PickerSurface`" notes added to each). The Operations board filters (native `<select>`) and `InlineSegmented` (inline) were already correct — unchanged.
- **Phone path proven identical in test:** jsdom has no `matchMedia` → `useIsDesktop()` falls back to `false` → the existing `BottomSheetPicker`/`VisualGridPicker`/`overlay-nesting` tests render the Sheet branch unchanged and stay green. New tests (`useMediaQuery.test.tsx`, `PickerSurface.test.tsx`) stub `matchMedia` to desktop and assert the `.fs-popover` marker (so a forgotten stub fails loud) + the Esc-peel-inside-a-form-Modal case. 386 tests pass; typecheck + lint + build clean.
