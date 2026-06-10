# ADR-023: Component & state stack

> Architecture Decision Record. The Phase H record of the v4.0 component + state libraries: Radix headless + Tailwind v4 + TanStack Router + TanStack Query + Zustand + Zod. Closes board [#243](https://github.com/Vergo402/paratech-struts/issues/243). Sits on top of [ADR-005](ADR-005-single-package-pwa.md) (single package) and [ADR-007](ADR-007-build-system-typescript-strict.md) (Vite + TS strict); fills the `ui/*` seams.

---

## Status

- [x] Accepted

**Date:** 2026-06-09
**Author:** Claude Opus 4.8 (architect agent, drafting)
**Reviewer(s):** Alex — Phase H foundation mini-gate PASSED 2026-06-10

---

## Context

Phase E authored 15 v4 primitives ([`03-primitives/*.md`](../03-primitives/)) and a from-scratch token system ([`preview/tokens.css`](../preview/tokens.css), four themes, one gold accent — [ADR-011](ADR-011-color-token-system.md)). Phase H needs the libraries those primitives are built on. The architecture (01), implementation (10), and tech-debt (12) essays converged on the same "boring stack" (synthesis §1.2, §4): Radix headless, Tailwind, TanStack Router + Query, Zustand, Zod. The component-library strategy was a standing open question (#13: fully custom, Radix headless, Shadcn, or Tailwind). The synthesis named the stack in §4 (Architecture) and the choice was **confirmed at the Phase D gate (PR #282)**. This ADR is the formal record, pending the Phase H foundation mini-gate. It closes board [#243](https://github.com/Vergo402/paratech-struts/issues/243).

---

## Decision

**Adopt Radix headless primitives + Tailwind v4 + TanStack Router + TanStack Query + Zustand + Zod for v4.0.** Radix supplies *behavior and accessibility*, not appearance: the Phase-E design tokens ([`preview/tokens.css`](../preview/tokens.css)) drive all styling, and the 15 v4 primitives ([`03-primitives/*.md`](../03-primitives/)) are built **on** Radix behavior, not replaced by a pre-styled kit.

---

## Rationale

- **Headless, not styled, is the load-bearing call.** The 15 primitives and the four-theme token system are the design signal (synthesis "visual signal is the work," §4). Radix gives WAI-ARIA-correct behavior (focus trap, roving tabindex, dismiss semantics) under primitives the tokens style — so the design system stays the source of truth for appearance and Radix is the source of truth for behavior.
- **The stack is well-understood and well-documented** (roughly the Linear/Vercel stack, essay 01 §5): Zustand for app state (active operation, current user, role assignments), TanStack Query for the Firebase-as-server-cache story (optimistic updates, invalidation, offline persistence pairing with IndexedDB), TanStack Router for typed routes + route-level loaders + search-params-as-first-class (link to a specific operation/shore point), Zod for one schema used three ways (TS type, form validator, Firebase write validator — synthesis §1.9 closes the v3.8.2 silent-failure class).
- **Tailwind v4 consumes the tokens** (`preview/tokens.css`) as CSS variables — utilities reference the token values, so a theme swap is a token change, not a utility rewrite.
- **Zod is the seam between the build and the data layer** — the same schema strict-TS ([ADR-007](ADR-007-build-system-typescript-strict.md)) validates, the form validates, and the generated `database.rules.json` ([ADR-009](ADR-009-database-firebase-rtdb.md)) asserts against.

---

## Alternatives Considered

- **Shadcn/ui.** Rejected: it ships *styled* components (copy-in Radix + Tailwind with an opinionated look). v4's appearance is the four-theme token system and the 15 primitives — Shadcn's styling is lock-in we'd fight, not a head start. We take the same underlying Radix + Tailwind without the style layer.
- **Material UI (MUI).** Rejected: brand mismatch. MUI carries Material Design's visual language and theming model, which contradicts the from-scratch FieldShore identity ([ADR-011](ADR-011-color-token-system.md), [ADR-013](ADR-013-brand-emblem-full-color.md)) and the field-conditions tap geometry (56/60 pt targets, synthesis §1.5).
- **Fully custom (no headless library).** Rejected: re-deriving correct focus management, dismiss semantics, and ARIA for every primitive is exactly the accessibility-finding class the audit caught in v3; Radix is the audited behavior layer that lets the team spend its effort on the tokens and the field UX.
- **Redux / MobX / Recoil for state.** Rejected (essay 01 §5): the Redux complexity tax does not pay off at this scale; Zustand + TanStack Query split app-state from server-cache cleanly. (Jotai is held in reserve for cheap one-off atoms, not part of the committed stack.)

---

## Consequences

**Positive:**
- The design system owns appearance; Radix owns behavior — a clean split that keeps the tokens authoritative and the accessibility correct.
- One Zod schema spans type, form, and write validation — the v3.8.2 rule-drift class is structurally closed.
- The stack is the documented Linear/Vercel combination — low ramp for a future contributor or Claude session.

**Negative:**
- Building primitives *on* Radix (rather than adopting a styled kit like Shadcn) is more up-front work — each of the 15 primitives is a real implementation against Radix behavior. The Phase-E specs are the blueprint that makes it mechanical.
- Tailwind v4 is recent; pinning and a token-bridge check are prudent during the slice.

**Neutral:**
- The Flatfile-style column-mapper (Inventory import, [#307](https://github.com/Vergo402/paratech-struts/issues/307)) is a separate library/build call ([#36](../99-open-questions.md)) — the same component-library class as this ADR, decided in the slice, not here.

---

## Related

- **Principles:** 11 (the design system is the signal; the library disappears), 12 (the data class drives the typed-schema-everywhere discipline Zod gives), and the accessibility throughline behind Radix (field-conditions, synthesis §1.5).
- **Other ADRs:** [ADR-005](ADR-005-single-package-pwa.md) (the `ui/*` seams this fills), [ADR-007](ADR-007-build-system-typescript-strict.md) (Vite + TS strict the stack compiles under; Zod-validated), [ADR-011](ADR-011-color-token-system.md) (the four-theme tokens Tailwind consumes), [ADR-019](ADR-019-side-drawer-primitive.md) (the 15th primitive, also built on Radix behavior), [ADR-009](ADR-009-database-firebase-rtdb.md) (TanStack Query pairs with the IndexedDB/event-log layer; Zod generates the rules).
- **Board issue closed:** [#243](https://github.com/Vergo402/paratech-struts/issues/243).
- **Open questions resolved:** [#13](../99-open-questions.md) (component-library strategy → Radix headless + Tailwind, reject Shadcn/Material).
- **Synthesis:** §1.2 (the boring stack), §1.9 (one Zod schema, generated rules), §4 Architecture (the stack list).

---

## Notes

"Radix headless" means Radix Primitives (the unstyled behavior layer), not Radix Themes (the styled layer) — the distinction is the whole decision. The 15 primitives include the side-drawer ([ADR-019](ADR-019-side-drawer-primitive.md)); each Phase-E primitive spec maps to one Radix-backed `ui/` component. Jotai is mentioned in essay 01 as a reserve for one-off atoms; it is intentionally *not* in this ADR's committed stack — add it only if a controlled-primitive case in the slice needs it, which is a slice call, not a foundation decision.
