# ADR-029: Shore-point created-order number — system-tinted corner tab

> Architecture Decision Record. Adds a stable per-point number to the `ShorePointCard` ([card.md](../03-primitives/card.md)) and a `seq` field to the `ShorePoint` schema. Born from the Phase H slice re-drive ([#248](https://github.com/Vergo402/paratech-struts/issues/248)); tracked as [#318](https://github.com/Vergo402/paratech-struts/issues/318).

---

## Status

- [x] Proposed
- [x] Accepted *(Phase H re-drive — Alex, 2026-06-14)*

**Date:** 2026-06-14
**Author:** Claude Opus 4.8 (Phase H re-drive session)
**Reviewer(s):** Alex (chose placement + the system-tint by eye from live mockups)

---

## Context

Shore-point cards titled only `label · type` ("B-2 · T-Shore"), with no number. Alex wanted each point to carry a **created-order number** so crews have a fixed radio handle — "go to shore point 7." We explored placement and color live (eight placements → corner tab vs leading chip; then the coloring question).

Two real wrinkles surfaced for coloring the number by the strut **system** (the operationally useful idea — system-at-a-glance):
- The three system colors are **Gold = `--accent`** (the brand accent itself), **Grey = `--text-secondary`** (the neutral / "no strut" tone), and **LockStroke = `--sys-lockstroke`** (cyan). Two of the three are already spoken for, so a system-tinted number is ambiguous (Grey-system ≡ pending) and collides (Gold-system ≡ accent).

Alex chose the system-tint anyway, accepting the tradeoff; the design resolves the ambiguity with a state distinction rather than dropping the tint.

---

## Decision

1. **Stable per-op number** on `ShorePoint.seq` (optional int). Assigned at creation as **`max(existing seq) + 1`** — *max, not count*, so a number **survives deletion** (delete `#3` of {1,2,3} → next add is `#4`, never a reused `#3`). Computed in `AddShorePointModal` via the pure `nextSeqBase` helper (`core/operation`).
2. **Numbering is per physical shore.** A grouped multi-strut shore (3-Post / Double-T → N points sharing a `groupId`, KB-7) shares **one** number across its members; the existing `1 / 3` group badge distinguishes the struts.
3. **Placement: top-left corner tab**, displayed `#N`, `--font-mono` tabular, scaling to 3 digits.
4. **Color: tinted by the deployed strut's system, with a ghost default.**
   - **No strut assigned → ghost outline** (transparent, hairline border, muted text).
   - **Deployed → solid fill** in the system color: gold (`--accent`), grey (`--text-secondary`), LockStroke (`--sys-lockstroke`).
   - **Outline-vs-fill** is what removes the Grey-system-vs-pending ambiguity (a hollow tab is never a Grey fill), and the fill "lighting up" signals the point is equipped.
   - The system key resolves from the deployed model via `strutSysKey` (`struts.ts`), shared with `RecommendationCard` (one derivation: `system === 'LockStroke' ? 'lockstroke' : color`).

---

## Rationale

- **The number is identity, not status.** It's text (Principle 9 — never color-only), stable, and per physical shore — exactly how a crew references a point on the radio. `max+1` is the one-line rule that makes "point 7" mean point 7 forever.
- **System-tint earns its keep only with the ghost state.** A naive system fill fails (grey ≡ pending, gold ≡ accent). The ghost-when-empty → fill-when-deployed lifecycle turns the failure into a feature: the tab is a *strut-presence* signal as well as an identity.
- **One color source.** Reusing `strutSysKey` keeps the tab and the rec card's system identity in lockstep — no second mapping to drift.
- A neutral marker was the conservative recommendation; Alex's system-tint is a richer signal and is safe with the mitigation.

---

## Consequences

- **Schema:** `ShorePoint.seq?` (optional for event-replay safety; every runtime point gets one). No change to the deploy path — system is resolved at render from the catalog by model.
- **New:** `nextSeqBase` (`core/operation/seq.ts`); `strutSysKey` / `sysKeyOf` (`core/load/struts.ts`, the rec card now reuses them).
- **Card:** `.fs-spc-tab` (ghost + `is-gold`/`is-grey`/`is-lockstroke`); the card gains top padding (`:has(.fs-spc-tab)`) so the headline clears the tab. Inks are theme-paired for AA across dark/light/sunlight/broadcast (`wcag-contrast.mjs`): gold uses `--on-accent` (broadcast falls back to a dark ink, which broadcast omits); grey uses `--surface-card` (collapses to black-on-white in sunlight); lockstroke uses `--sys-lockstroke-bg` (broadcast override since its bg token is transparent).
- **Numbering quirk:** the number is *monotonic*, not *gap-free* — deletions leave gaps (`#1 #2 #4`). Intended: a stable handle beats a tidy sequence.
- 368 unit/component tests pass; typecheck + lint clean. Live-verified on the slice (real Add flow → ghost `#1`; gallery shows ghost/gold/grey/cyan + a 3-digit number) in dark / light / sunlight — all tab inks legible.
