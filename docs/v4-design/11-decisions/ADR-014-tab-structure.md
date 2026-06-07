# ADR-014: Tab structure — keep the v3 five-tab spine; nest, do not expand

> Architecture Decision Record. The reasoning and the full tab map live in [`08-information-architecture/00-ia-foundation.md`](../08-information-architecture/00-ia-foundation.md) §Tab structure; this ADR records the decision.

---

## Status

- [x] Proposed
- [ ] Accepted *(awaiting the Phase F foundation mini-gate — Alex)*

**Date:** 2026-06-07
**Author:** Claude Opus 4.8 (Phase F foundation session)
**Reviewer(s):** Alex (Phase F foundation gate — pending)

---

## Context

Phase F specs every v4 screen across four surfaces. Before any screen spec can say where it lives, v4 must fix its top-level shape. v3 ships five bottom-nav tabs (`index.html`, `app.js` `showTab()`): **Quick Find · Operations · Command · Inventory · Settings**. Phase F also introduces screens v3 lacks — three D6 checklist screens, the D7 auth/dept/admin screens, and several first-class screens the synthesis named (Cutting Station, Org Chart, Hazard Log, Roster). The question: do these become new tabs, or nest under the existing five? This is [`99-open-questions.md`](../99-open-questions.md) #4 (checklist placement) and #26 (org-chart placement), and the precondition for [ADR-015](ADR-015-navigation-pattern.md)/[ADR-016](ADR-016-modal-vs-sheet-rules.md).

---

## Decision

**Keep the v3 five-tab spine in its v3 DOM order — Quick Find · Operations · Command · Inventory · Settings — and nest every new screen under one of the five.** No screen becomes a sixth tab. SitStat is the Command home composition; Cutting Station is a workstation under Operations; checklists nest (IC Command under Command, Task Level under Operations, ORM/TCRM as a button-bar on active-op screens); auth screens are pre-shell; Broadcast is a projection mode, not a tab.

---

## Rationale

- **The five tabs are the right seams.** They line up 1:1 with the synthesis module boundaries ([`06-synthesis.md`](../06-synthesis.md) §1.2) and with the four-role surface model ([Principle 2](../02-principles.md)).
- **Muscle memory is an asset to preserve, not spend.** Hartsdale runs this layout today; the skeptic's preservation list names Quick Find and the shore-point lifecycle as the two things v4 must not re-teach ([`05-essays/08-skeptical-review.md`](../05-essays/08-skeptical-review.md)).
- **NIMS doctrine already says where the new operational objects go** ([ADR-008](ADR-008-nims-org-structure.md)): Cutting Station is a workstation under Operations; the org chart belongs to Command.
- **Five reachable bottom-nav destinations honor phone-is-the-floor** ([Principle 2](../02-principles.md)). A sixth tab crowds the 56pt targets; a chrome-only Command band assumes a tablet.
- **Nesting keeps the tab count stable while the app grows** — new capability lands as a tab-home composition, sub-screen, workstation, or overlay, not as nav-bar sprawl.

---

## Alternatives Considered

- **A four-tab spine that dissolves Command into a SitStat chrome layer over Operations.** Rejected — Command holds distinct objects (org chart, role history, IC Command Checklist, ICS-201/203/207) that need a home surface, not a header band; it breaks v3 muscle memory; and phone-is-the-floor needs a reachable bottom-nav destination for the IC, not a tablet-assumed top band.
- **A sixth (or seventh) tab for Cutting Station / Checklists / Roster.** Rejected — crowds the bottom nav, weakens the 56pt targets, and contradicts NIMS placement (Cutting Station is a workstation *under* Operations, not a peer of it).

---

## Consequences

- **Positive:** zero re-teaching of the top-level model; stable nav as the app grows; clean mapping for [ADR-015](ADR-015-navigation-pattern.md) (nav) and [ADR-016](ADR-016-modal-vs-sheet-rules.md) (overlays).
- **Negative:** some tabs (Operations, Command) carry heavier compositions (a tab home + nested sub-screens + workstations), which the per-screen specs must keep legible on the phone floor. The Org Chart inherits the **K-12 ≤ 7-cards-×-2-levels tablet-portrait budget** to stay scroll-free.
- **Neutral:** Broadcast is defined as a projection mode, not a destination; three constitution-named screens resolve as non-screens (SitStat → Command, After-Action → Audit Log, Activity Feed → not created).

---

## Related

- **Principles:** 2 (designed for the role), 4 (one canonical action), 11 (earns its place quietly).
- **Other ADRs:** [ADR-008](ADR-008-nims-org-structure.md) (NIMS placement of Cutting Station / org chart); anchors [ADR-015](ADR-015-navigation-pattern.md) and [ADR-016](ADR-016-modal-vs-sheet-rules.md).
- **Open questions resolved:** [`99-open-questions.md`](../99-open-questions.md) #4 (checklist IA placement), #26 (org-chart/dashboard/pocket-lock placement).
- **Open questions surfaced:** none (the K-12 layout budget is an Org-Chart-spec constraint, not a new OQ).

---

## Notes

Detail — the full tab map, the non-screen decisions, and the K-12 constraint — lives in [`00-ia-foundation.md`](../08-information-architecture/00-ia-foundation.md). This ADR is the one-paragraph decision; the foundation doc is the worked reasoning.
