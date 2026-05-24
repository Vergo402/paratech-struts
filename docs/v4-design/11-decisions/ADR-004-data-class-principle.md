# ADR-004: Add Principle 12, "Built for a data problem nothing else is built for"

## Status

- [x] Accepted

**Date:** 2026-05-23
**Author:** Alex (insight from #273 and #280, principle wording) + Claude Opus 4.7 (ADR drafting)
**Reviewer(s):** Alex (final call)

---

## Context

Issue #280, filed 2026-05-22 out of the Phase B sign off work on #273, named a foundation point that the 11 principles do not cover. The other principles describe how the app behaves: defer to doctrine, calm in chaos, doubt free defaults, visible safety, respect the radio. None of them name what the app is built for at the operational layer.

Phase C dispatches 12 essay agents in parallel against one briefing packet. Principles are the part of the packet the agents quote from. If the data class point is not in the principles, the architect agent picks a generic incident management data model, the devops resilience agent solves the wrong sync problem, the mobile UX agent draws screens that look like a competitor with a strut tab welded on, and the skeptical senior engineer has nothing to push back on when the question is "are we just rebuilding incident management." Synthesis cannot fix that after the fact across 12 essays.

---

## Decision

Add a 12th principle to `02-principles.md` that names structural collapse as a different data class from the rest of the fire service, names what that demands from the app, and points at wildland as the only adjacent precedent. The principle becomes part of the Phase C briefing packet and the bar that every Phase E and Phase F decision gets checked against.

---

## Rationale

- The plan calls the principles "the constitution every downstream decision is checked against." A foundation point that sets the entire operational model belongs in the constitution.
- A sibling foundation doc was considered and rejected because the briefing packet quotes from the principle list. A doc that lives next to the principles is one click further away and easier for an agent to miss.
- The 11 principles are about behavior. The 12th is about what the app is built for. Different axis, not a sharpening of an existing principle.
- Cost of adding it now is one principle plus this ADR. Cost of not adding it is roughly 12 essays written against the wrong frame and a synthesis pass that cannot rescue them.

---

## Alternatives Considered

- **Sibling foundation doc at `01a-data-class.md`.** Rejected because briefing packets quote from the principles file. A sibling doc is one extra read step for every agent and easy to skip.
- **Sharpen Principle 1.** Rejected because Principle 1 is about language (use NIMS and USACE terms verbatim). The data class point is about what the operational model demands. Folding the two together blurs both.
- **Defer to Phase D synthesis.** Rejected for the reason in Context. The framing has to be in the briefing packet, not added afterward.

---

## Consequences

**Positive:**
- Every Phase C essay starts from the same framing on what the app is for at the operational layer.
- Every Phase E primitive and Phase F screen gets checked against the same constraint without having to relitigate it each time.
- The competitive position gets harder to copy, because copying it means rebuilding the operational model from scratch against a segment a platform vendor cannot justify.

**Negative:**
- The principle count goes from 11 to 12. The plan and the INDEX both reference "11 principles" or "Eleven Principles" in several places. Those references get updated in the same commit.
- One more thing every essay agent has to internalize.

**Neutral:**
- The principle does not change any v3 behavior. It frames v4 design decisions only.
- Principle 12 does not carry a "Rejected" line, by Alex's call. The other 11 do. The format is not a hard rule, and the principle reads cleanly without one.

---

## Related

- Principles: this ADR adds Principle 12. It does not change the other 11.
- Other ADRs: ADR-001 (relaxed the codename rule before Phase C), ADR-002 (Principle 1 scope clarification), ADR-003 (scope, everyday plus expandable). This sits alongside them as a pre Phase C cleanup.
- Open questions resolved: #280 (data class point becomes a first class part of the design).
- Open questions surfaced: none.

---

## Notes

The Phase C briefing packet now includes: 12 principles, primitive doctrine (picker as worked example), all 6 reference teardowns, the positioning doc, and the lens charter per agent. The 12th principle is the single addition.

References in the plan file and the INDEX that said "11 principles" or "Eleven Principles" were swept in this same commit. `keen-whistling-pancake.md` Section I header and two other references updated; `02-principles.md` header changed from "Eleven Principles" to "Twelve Principles."
