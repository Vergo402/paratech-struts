---
name: v4-phase-i-plan
description: "Build a consolidated Phase I priority list by reading all three sources of design items (99-open-questions.md, gaps register, design docket). Use whenever Alex says '/v4-phase-i-plan', 'phase I planning', 'consolidate the Phase I backlog', or wants a unified view of pending Phase I work. v4-redesign branch only."
---

# Phase I Consolidated Planning

One job: read the three living sources of Phase I design items, consolidate them into a single priority list, and surface blockers vs. nice-to-have for Alex's next Phase I session.

## If invoked

1. **Branch guard.** `git branch --show-current` must be `v4-redesign`. If not, stop — never run from another branch.

2. **Read all three sources** (in order):
   - `docs/v4-design/99-open-questions.md` — extract all items with Phase I relevance
   - `docs/v4-design/13-slice/_PHASE-H-GATE-SCRIPT.md` — extract the gaps register; note which are Phase I blockers
   - `docs/v4-design/98-design-docket.md` — extract items marked `📋 Pending | Phase I queue` or `🔄 In Progress`

3. **Consolidate into one backlog** organized by priority:
   - **🔴 Blockers:** Items that block other Phase I work (dependencies, critical path)
   - **🟡 Core Phase I:** Items needed for Phase I completeness / shipped scope
   - **🟢 Enhancements:** Nice-to-have polish, optimizations, deferred improvements
   - **⚪ Not Yet Ready:** Items awaiting decisions, deferred beyond Phase I, unclear scope

4. **For each item, note:**
   - Source (OQ#XX, gaps#XX, docket, ad hoc)
   - GitHub tracking (is it in an issue? #NNN? or docs-only?)
   - Effort (small / medium / large, rough estimate)
   - Dependencies (blocks what? blocked by what?)

5. **Output format:**
   ```markdown
   # Phase I Consolidated Backlog

   ## 🔴 Blockers (do these first)
   | Item | Source | GitHub | Effort | Dependencies |
   |---|---|---|---|---|
   ...

   ## 🟡 Core Phase I (needed for completeness)
   ...

   ## 🟢 Enhancements (if capacity)
   ...

   ## ⚪ Not Yet Ready
   ...

   ## GitHub Tracking Status
   [Summary of which items need GitHub issues created]

   ## Recommended Next Steps
   [Alex's first 1–3 items to tackle, in order, with rationale]
   ```

6. **Do NOT commit.** This is a planning output, not a permanent file. Show Alex the consolidated list in the response. If Alex approves, he'll decide whether to create issues or update the docket.

## Never

- Never run from a branch other than `v4-redesign`.
- Never commit the output (it's analysis, not a new source of truth).
- Never drop items from any source — the backlog is cumulative.
