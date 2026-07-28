# Plan: #280 — Structural Collapse Design Foundation Essay

## Context

During Phase B positioning work (#273), a foundational insight emerged: structural collapse is a fundamentally different *data problem* than any other incident type, and that distinction should be explicitly documented as a design foundation before Phase E/F work begins. The current `02-principles.md` describes HOW to build FieldShore but says nothing about WHAT it's building for. This plan produces both the essay and the principles update that makes the WHY explicit.

Phase C essays are officially gated on Phase B completion, but this one is a deliberate exception — the insight emerged from Phase B and will inform the remaining Phase B corrections (#269–#279) and every Phase C–J decision that follows.

---

## Status — DEFERRED (gated on Phase B)

**Do not execute until #269–#279 are closed.**

The essay draws directly from `positioning.md` and the competitive framing that #270, #273, #278, and #279 are still correcting. Writing against in-progress Phase B docs creates revision risk. Decision made 2026-05-22: wait for Phase B to close cleanly, then execute this plan as written.

Gate: all of #269–#279 closed → resume here.

**First action when executing:** post a comment to #280 noting the deferral decision so the issue doesn't look stale:
> Deferring until Phase B (#269–#279) closes. The essay draws from positioning.md and framing that's still being corrected; writing against in-progress Phase B docs creates revision risk. Will resume once Phase B gates are clear.

---

## Branch

`v4-redesign` — no version bump, no production code changes, docs only.

---

## File 1 — `docs/v4-design/05-essays/01-architecture.md` (new)

Write the essay in the existing Phase C slot that best fits: `01-architecture.md`. This insight IS the architectural foundation — the data model observation that every other structural decision follows from.

**Required structure (per Phase C spec):**
- 250-word executive summary at the top
- Full essay body (target 5,000+ words)
- Numbered recommendations section at the end

**Content the essay must cover:**

1. **The data class distinction** — most incident types share a predictable, narrow data model (unit assignments, a status board, a linear workflow). Structural collapse does not: every measurement is unique, inputs arrive simultaneously from multiple work areas, and nothing from the generic incident management model transfers.

2. **The wildland parallel** — wildland is the only other widespread incident type in the same data class (expanding, simultaneous, multi-area inputs). It attracted purpose-built tooling (CAD dispatch, IRWIN, ICS-209 workflows) decades ago because scale made the investment obvious. Structural collapse sits in the same class but at a scale that hasn't justified that investment from anyone else — until now.

3. **What the data model demands from the app** — trace how the data class drives specific existing features: grouped shore points, phase-based individual tracking (v3.8.0), simultaneous multi-area input, visible load math. These are not feature additions; they are minimum viable expressions of what the data model requires.

4. **The design constraint** — every screen and workflow should be evaluated against the question "does this work for an incident where every data point is unique, simultaneous, and spread across multiple areas?" A design that works for a generic status board may fail completely here.

5. **The competitive moat** — any competitor could build here, but building here means starting over on the underlying data model against a segment that hasn't grown large enough to justify it for a broad-platform vendor. FieldShore's defensibility is the data model, not the feature set.

6. **Application to Phase E/F** — as information architecture (E) and workflows (F) open, this constraint must be applied explicitly to every screen and flow, not treated as implicit background.

**Principles cited (required per invocation rules):**
- Principle 7 (Visible safety) — the data class demands that load math, deductions, and uncertainty surface immediately
- Principle 8 (Local-first, with sync-realism) — simultaneous multi-area input demands local-first writes; sync-realism acknowledges the operational environment
- Principle 4 (One canonical action per state) — the complexity of the data model makes single-action-per-state more important, not less

---

## File 2 — `docs/v4-design/02-principles.md` (edit)

Add a "What we're building for" preamble section before the 11 principles.

**Reasoning:** The issue explicitly notes that the 11 principles describe HOW to build FieldShore; this insight describes WHAT FieldShore is building for. These are different things. Adding a 12th principle would mix levels of abstraction — principles are design rules, not purpose statements. A preamble preserves the document's structure while giving the insight the right level of prominence.

**What to add:** A 2–3 paragraph preamble (before the numbered list) that:
- Names the data class distinction in plain language
- States that all 11 principles exist to serve this specific problem
- Gives the team one sentence to reach for in any design discussion: "FieldShore is purpose-built for the one incident type where the data model itself is the hard problem."

Do not add a 12th principle. Do not modify any of the 11 existing principles.

---

## Verification

No preview UI to drive. Verify by:
1. Confirming `docs/v4-design/05-essays/01-architecture.md` exists and opens cleanly in VS Code / any markdown renderer
2. Confirming `docs/v4-design/02-principles.md` renders correctly with the preamble above the numbered list and 11 principles intact
3. Confirming the essay's exec summary is ≤ 250 words and the body reaches 5,000+ words
4. Confirming the essay's numbered recommendations section exists

---

## Commit

Single commit on `v4-redesign`:
```
#280 — design foundation essay + principles preamble

docs/v4-design/05-essays/01-architecture.md: new essay, structural
collapse as a unique data class (~5,000 words)

docs/v4-design/02-principles.md: add "What we're building for"
preamble before the 11 principles

Closes #280
```

---

## No-ops

- No version bump
- No CONSOLIDATED-STATUS update (v4 branch docs; no production release)
- No user manual changes
- No Project field changes needed at plan time (set to In Progress at execution start)
