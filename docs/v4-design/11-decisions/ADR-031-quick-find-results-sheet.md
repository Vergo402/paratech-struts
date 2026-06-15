# ADR-031: Quick Find results render in a dismissible sheet

> Architecture Decision Record. Amends the Quick Find IA spec ([`08-information-architecture/10-quick-find.md`](../08-information-architecture/10-quick-find.md) §The results, §Composed primitives, four-surface table, OQ1) and extends [ADR-016](ADR-016-modal-vs-sheet-rules.md) (a sheet may also be a read-only *output* surface). Born from the Phase I Block 0 build ([#320](https://github.com/Vergo402/paratech-struts/issues/320)) when Alex drove the screen on a phone.

---

## Status

- [x] Proposed
- [x] Accepted *(Phase I Block 0 — Alex, 2026-06-15)*

**Date:** 2026-06-15
**Author:** Claude Opus 4.8 (Phase I Block 0 session)
**Reviewer(s):** Alex (directed the change live during the build)

---

## Context

Block 0 first shipped Quick Find with the results as an **in-page card stack below the Find Struts button**, per the gate-passed spec. Driving it on a phone, Alex found that in **Safari** with the deduction panel collapsed, tapping Find Struts *appeared to produce no struts*: the form fills the viewport, so the results render **below the fold** — and Safari's address bar + toolbar eat ~25% of the height, pushing them further off. v3 had hidden this with an auto-scroll (`scrollResultsIntoView('quickResults')`, app.js:438); v4 had not ported it.

Two fixes were weighed: **(A)** port v3's auto-scroll — keep the in-column stack, glide to the first match; **(B)** present the results in a **dismissible sheet** that rises from the bottom.

Alex chose B, on a principled reading rather than aesthetics: **Quick Find's output is terminal and non-actionable.** In calculator mode there is no Deploy — there is nothing you can *do* with a result from this screen (deploy lives in Operations). A sheet's modality says exactly that — *here is the answer; read it and dismiss it* — and segregates the lookup from the workspace. The auto-scroll worked too, but it left the result an in-column stack that reads like the actionable `ShorePointCard` workspace in Operations — the very confusion the calculator should avoid.

---

## Decision

1. **Quick Find results render in a dismissible [`Sheet`](../03-primitives/sheet.md)**, raised by **Find Struts**; dismiss (handle-drag / scrim / Esc) returns to the calculator. The sheet is bottom-anchored and always rises into view, so the result **cannot land below the fold** on any viewport.
2. **The Gold / Grey / LockStroke system filter moves into the sheet** (above the card stack) so the result is narrowable **in place** — no dismiss-and-re-search to refilter. Filter changes stay live inside the sheet.
3. **Re-search model:** the form sits behind the sheet, so measurement / deduction / load edits happen after dismiss, then Find Struts re-raises the sheet. This **supersedes the Block-0 "live-update after the first search" intent** — that only made sense with the results in-column. (v3 also re-searched per tap.)
4. **Unchanged from the spec:** catalog mode (`null` inventory), display-only `RecommendationCard`s (no Deploy / no apparatus-source line), capacity demoted, the liability disclaimer and unrated/over-capacity warning gates riding each card.
5. **One presentation across surfaces** — the same `Sheet` primitive (bottom-anchored on phone, centered on wider surfaces, as the spec already treats the picker). No separate desktop results-pane is built.

---

## Rationale

- **The modality is the message.** The sheet is not decoration — it encodes *terminal, non-actionable output*. Operations is the workspace; Quick Find tells you what fits. Segregating the answer matches the screen's nature (the guest cold-open / standalone calculator).
- **Solves the bug by construction**, not by a scroll heuristic: a bottom-anchored sheet rises into view regardless of how short Safari's chrome makes the viewport.
- **Cheap, reuses doctrine.** The `Sheet` primitive already exists (no new component); filter-in-sheet keeps the one genuinely-useful refinement reachable without leaving the result.

---

## Consequences

- **Amends [`10-quick-find.md`](../08-information-architecture/10-quick-find.md):** results = dismissible sheet (not an in-column `RecommendationCard` stack); the system filter relocates from the form into the sheet; the four-surface table's "results compute beside / in a second pane" gives way to the sheet on every surface; **per-screen OQ1 (filter-chip placement) is resolved** — the filter rides in the result sheet.
- **Extends [ADR-016](ADR-016-modal-vs-sheet-rules.md):** a sheet may serve as a **read-only output surface** for terminal, non-actionable calculator output — not only a picker / contextual-choose. *Operations' Add-Shore-Point inline find is unaffected* — there the results **are** actionable (Deploy) and stay in their existing surface.
- The `RecommendationCard` is **unchanged** (display-only when `onDeploy`/`source` are omitted) — same component, new container.
- **Not foreclosed:** if Quick Find ever gains a per-result action (e.g. "size this into a new shore point"), the sheet can carry a footer action.
- 380 unit/component tests pass; typecheck + lint clean. Live-verified on the phone viewport: Find Struts raises the sheet into view, the in-sheet filter narrows in place (5 → 2 on Grey), console clean.
