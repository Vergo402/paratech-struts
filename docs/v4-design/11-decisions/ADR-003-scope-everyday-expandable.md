# ADR-003: Scope — everyday plus expandable

## Status

- [x] Accepted

**Date:** 2026-05-21
**Author:** Alex (decision) + Claude Opus 4.6 (analysis, drafting)
**Reviewer(s):** Alex (final call)

---

## Context

The 2026-05-17 local-first pivot correctly pulled v4 scope back from federal-first planning. The Surfside TTX-2 simulation had been driving v4 design even though it was intended as an upper-bound stress test, and the everyday use case was getting buried under federal-scale machinery. The pivot refocused on Level IV-V structural collapse incidents: car into building, residential partial collapse, light commercial partial collapse. That was the right call.

The language that followed was not. The pivot was recorded across several files as "Level IV-V only," with hard ceilings: "NOT state, IST, or federal scale," "not on the roadmap," "not on the table." That framing treated Level V as a ceiling rather than a starting point.

The Phase B positioning work (#274) surfaced the problem. A tool that only works at Level IV-V abandons command at the exact moment the incident escalates and the tool becomes most valuable. A Level IV residential collapse gets a second alarm and becomes Level III. A Level III warehouse job draws mutual aid from three counties and becomes Level II. The IC does not switch apps when the incident grows. The interface should contract and expand alongside ICS itself.

The v3 codebase already handles Level I scale. The Surfside TTX-2 ran 250 shore points across a federal task force operating around the clock. The simulation infrastructure covers the full range: Level V (Verplanck, 3 shore points), Level IV (Hamden, 8 shore points), Level III (Meadowville, 25 shore points), Level II (Riverside, 60 shore points), Level I (Surfside, 250 shore points). The ceiling is artificial.

---

## Decision

v4 designs for Level IV-V as the everyday case with on-demand expansion through Level III, II, and I. The interface contracts and expands alongside ICS itself. Single team officer with two shore points on a phone is the starting state; federal task force with 250 shore points on a Surfside-scale broadcast board is the upper design ceiling. Every v4 interface decision must hold at both ends.

---

## Rationale

- About 99% of structural-collapse responses are Level IV or V. The everyday case drives defaults, onboarding, and first impressions. A team officer arriving first due with two shore points is the design anchor.

- The remaining 1% is where command needs the tool most. A tool that stops scaling at Level IV forces a revert to paper at the moment the incident complexity makes paper hardest to manage. The cost of that revert is highest when the stakes are highest.

- Local-first architecture is correct for both ends. Offline-first serves the solo team officer on a phone with no cell signal and the comms-degraded large-scale incident where network connectivity is unreliable. The architectural decision does not change with incident scale.

- The simulation infrastructure already validates the full range. Acknowledging the design ceiling costs nothing because the stress tests already enforce it. Every major milestone runs Level V through Level III simulations; Level I (Surfside) runs before MINOR and MAJOR releases.

---

## Alternatives Considered

- **Keep "Level IV-V only" framing.** Rejected: creates a self-imposed ceiling that silos the product against scale-up moments. Forces a future "v5 is for big incidents" split that fragments the user base and requires command to switch tools mid-incident.

- **Design for Level I first, scale down.** Rejected: federal-first design produced the scope creep that triggered the 2026-05-17 pivot. The everyday case should drive the interface; the interface should merely not break at scale. Designing from the top down optimizes for the 1% case at the expense of the 99%.

- **Separate apps for different incident levels.** Rejected: ICS itself does not change systems when an incident escalates. The IC promotes the org chart, not the software. The tool should follow the same principle.

---

## Consequences

**Positive:**
- Every Phase C essay, Phase E screen, and Phase F workflow is evaluated against "does this hold at both ends?" No future ADR needed to unlock federal scale.
- The simulation stress tests (Level V through I) become design validation, not just technical stress tests. A Phase E screen that passes Verplanck but breaks at Meadowville is a design failure, not a stretch-goal miss.

**Negative:**
- "Must not break at Level I" adds a constraint to every interface decision. Some designs that would be simpler for Level V alone will need progressive disclosure or graceful complexity scaling. That cost is real, and it applies from Phase C onward.

**Neutral:**
- Federal IST workflows, state mutual-aid authentication, and FEMA demob lifecycle stay deferred to v5. The design ceiling is raised; the implementation timeline is not. We still don't have a single department's buy-in, and building federal-scale features before local-scale adoption would repeat the mistake the pivot corrected.

---

## Related

- Principles: Principle 4 (one canonical action per state — must hold from 2 shore points to 250), Principle 8 (local-first, with sync-realism — correct for both the everyday case and the comms-degraded large-scale case).
- Other ADRs: ADR-002 (Principle 1 scope clarification — same pattern of clarifying a rule that was being applied too broadly; the pivot was right, the language around it was not).
- Open questions resolved: none directly, but prevents the class of "do we support this at Level III?" questions that would otherwise recur in every Phase C essay and Phase E screen review.
- Open questions surfaced: none.

---

## Notes

The positioning doc (`04-references/positioning.md`) already landed the reframe language in #274: "Level IV-V is the everyday case but the interface expands on demand through Level III, II, and I." This ADR codifies that decision and extends it to the three files that still carried the old ceiling language.

Cross-file syncs performed in this same commit:
- `docs/v4-design/01-context.md` — scope section reframed from "NOT federal" to "everyday + expandable"
- `/Users/alex/.claude/plans/v4-master-plan.md` — 3 ceiling-language sites updated (D7 revision notes, D7 scope clarification, What This Plan Does Not Do)
- `project_local_first_pivot.md` — frontmatter description updated, ADR-003 reframe note appended
