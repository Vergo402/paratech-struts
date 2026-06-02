# ADR-013: Brand identity — full-color FS emblem (exempt from the one-accent rule)

## Status

- [ ] Proposed
- [x] Accepted *(Alex, in-session direction — 2026-06-02)*

**Date:** 2026-06-02
**Author:** Claude Opus 4.8 (Phase E logo session)
**Reviewer(s):** Alex (chose the direction and the materials directly)

---

## Context

Open question #10 resolved (2026-05-31) to a **new identity, not a refresh**, with the constraint that the mark "must live within the locked gold-on-slate color system (no competing brand color)." [`color.md`](../07-design-system/color.md) encodes that as an anti-pattern: *"A second accent … is forbidden — the new brand mark must live within gold-on-slate."* Principle: the UI carries **exactly one accent** (the gold) so FieldShore never reads as a saturated dispatch console.

During the Phase E logo session Alex specified the concept and then the materials: an **"FS" monogram built from real shoring components** — a **gold LongShore** as the vertical of the F, **two aluminum struts** as the arms (each strut capped by a **steel 6″ rigid base plate** at both ends), and an **S of cut 4×4 lumber fastened with plywood gusset plates** (3×3 nail pattern). Rendered honestly, that is a **multi-color** mark (gold + aluminum + steel + wood + plywood + nails). When asked directly, Alex confirmed full-color and approved the recommended resolution.

---

## Decision

The FieldShore brand identity is a **full-color illustrative emblem** — the "FS" built from real shoring materials — and it is **exempt from the "exactly one accent" rule** that governs the product UI. It is paired with a **simplified single-ink mark** (themed via `--accent`) that is the functional mark wherever the emblem can't go: favicon, app-icon, dense UI, and light surfaces. Full spec: [`logo-and-mark.md`](../07-design-system/logo-and-mark.md).

---

## Rationale

- **The emblem encodes the product.** Struts + gusseted lumber *are* the domain; a flat monogram can't carry the gold-LongShore-vs-aluminum-strut distinction Alex wants. The identity should reinforce the mnemonic.
- **The one-accent rule protects UI calm, not the logo.** It exists so screens don't read as a saturated CAD console (Principle 3). A single, contained, intentional brand emblem on a splash/login/about surface does not reintroduce color noise into the working screens — the emblem is not UI chrome.
- **In-product discipline is preserved by the mono mark.** Everywhere the mark touches actual UI (nav, favicon, app icon, dense lists, light theme) it is the single-ink mark that inherits `--accent`, so the token system stays honest.
- Owner's call. Alex overrode the synthesis "refresh" once already (Open Q#10); this is the same owner decision one layer deeper.

---

## Alternatives Considered

- **Monochrome gold-on-slate mark** (the original Open Q#10 / color.md constraint). Rejected by Alex — one ink can't carry the gold-LongShore / aluminum-strut / wood-S material story; the distinction would have to come from form alone.
- **Gold + neutral grey only (no wood).** Rejected — the S is lumber; wood is intrinsic to the concept, and dropping it would make the S read as just more metal.
- **Full-color everywhere (no mono mark).** Rejected — the emblem collapses below ~48px and can't theme; favicon/app-icon/light UI need the single-ink reduction.

---

## Consequences

- **Positive:** a distinctive, domain-true identity that no competitor in the reference corpus could wear; it reads as a shoring instrument, not generic public-safety software.
- **Negative:** the emblem does **not** recolor by theme (it is authored for the slate ground); on light surfaces it sits on a slate chip or yields to the mono mark. Its multi-color detail collapses below ~48px. Two marks now exist to maintain. [`color.md`](../07-design-system/color.md)'s "no second brand color" anti-pattern is **amended** — scoped so the rule still binds all product UI; only the brand emblem is exempt.
- **Neutral:** the brand palette introduces aluminum/steel greys, a wood tan, and a plywood tan that exist **only** in the emblem and nowhere in the UI token system.

---

## Related

- Principles: 1 (use the domain's real things), 3 (calm in chaos — preserved for UI).
- Other ADRs: builds on [`ADR-011`](ADR-011-color-token-system.md) (the gold/slate tokens the gold member and slate ground reuse); amends color.md's brand-mark anti-pattern.
- Open questions resolved: #10 (re-resolved one level deeper — the new identity is a **full-color emblem**, not a monochrome mark).
- Open questions surfaced: light-surface treatment of the emblem (slate chip vs. mono mark) — answered in `logo-and-mark.md`; final favicon raster sizes deferred to Phase H.
