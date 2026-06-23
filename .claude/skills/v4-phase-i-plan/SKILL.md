---
name: v4-phase-i-plan
description: "Build a consolidated Phase I priority list by reading all four sources of Phase I work (99-open-questions.md, gaps register, design docket, and the live v4 GitHub board). Use whenever Alex says '/v4-phase-i-plan', 'phase I planning', 'consolidate the Phase I backlog', or wants a unified view of pending Phase I work. v4-redesign branch only."
---

# Phase I Consolidated Planning

One job: read the four living sources of Phase I work — three design docs plus the live v4 GitHub board — consolidate them into a single priority list, and surface blockers vs. nice-to-have for Alex's next Phase I session.

## If invoked

1. **Branch guard.** `git branch --show-current` must be `v4-redesign`. If not, stop — never run from another branch.

2. **Read all four sources** (in order):
   - `docs/v4-design/99-open-questions.md` — extract all items with Phase I relevance
   - `docs/v4-design/13-slice/_PHASE-H-GATE-SCRIPT.md` — extract the gaps register; note which are Phase I blockers. **The numbered bullets are a frozen point-in-time gate snapshot — do NOT read them for current status. Read the "Resolution status" addendum blockquote for what's shipped vs. still-open; the bullets are intentionally never updated.**
   - `docs/v4-design/98-design-docket.md` — extract items marked `📋 Pending | Phase I queue` or `🔄 In Progress`
   - **v4 GitHub board (Project 2)** — the live status of every tracked Phase I issue:
     ```bash
     gh project item-list 2 --owner Vergo402 --limit 400 --format json \
       | jq -r '.items[] | select(.status != "Done") | "\(.status)\t#\(.content.number)\t\(.content.title)"'
     ```
     Keep the Phase I rows (title contains "Phase I" or is active Phase I build scope); ignore Phase J / roadmap rows. This is the **live source of truth for issue status** — the three docs only mention issue numbers in passing and go stale.

3. **Consolidate into one backlog** organized by priority:
   - **🔴 Blockers:** Items that block other Phase I work (dependencies, critical path)
   - **🟡 Core Phase I:** Items needed for Phase I completeness / shipped scope
   - **🟢 Enhancements:** Nice-to-have polish, optimizations, deferred improvements
   - **⚪ Not Yet Ready:** Items awaiting decisions, deferred beyond Phase I, unclear scope

4. **For each item, note:**
   - Source (OQ#XX, gaps#XX, docket, board, ad hoc)
   - GitHub tracking — issue #NNN and its **board status** (Todo / In Progress / Done / not-on-board / docs-only)
   - Effort (small / medium / large, rough estimate)
   - Dependencies (blocks what? blocked by what?)

5. **Reconcile docs ⇄ board.** Cross-walk the doc items against the board:
   - **Board-only items** — a non-Done Phase I issue with no row in any of the three docs → fold it into the backlog. This is the whole reason for the board read; doc-only runs miss these (e.g. the build / sim / decision issues).
   - **Status mismatches** — flag ONLY a *true* status conflict: a **live** doc and the board disagree about the **same issue number's** status (a doc says open, the board says Done/closed, or the reverse) → list under "GitHub Tracking Status." Trust the board for status. The docs are not mirrors of the board — each plays a distinct role, so most apparent differences are **not** mismatches. **Do NOT flag any of these** (they are expected, not drift):
     - The **frozen gaps-register bullets** — they're a snapshot, never live (read its addendum instead, per step 2). A frozen bullet "not matching" the board is a category error, not a finding.
     - **Scope / granularity differences** — a narrow struck docket observation (e.g. "theme picker shipped, needs polish," pointer #248) vs. a broader board issue tracking the *full* build (e.g. #321 "Build the Settings tab") are two different things, both correct. Only flag when the two genuinely describe the **same** unit of work.
     - **Pointer-lineage overlaps** — two registers referencing the same origin (e.g. both note "was gaps #8") while pointing at different issues, where each issue is legitimately distinct (one shipped, one is a new design-exploration). Note it as context if helpful, but it is not a mismatch.

6. **Output format:**
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
   [Summary of which items need GitHub issues created, which board-only items were folded in, and any doc⇄board status mismatches]

   ## Recommended Next Steps
   [Alex's first 1–3 items to tackle, in order, with rationale]
   ```

7. **Do NOT commit.** This is a planning output, not a permanent file. Show Alex the consolidated list in the response. If Alex approves, he'll decide whether to create issues or update the docket.

## Never

- Never run from a branch other than `v4-redesign`.
- Never commit the output (it's analysis, not a new source of truth).
- Never drop items from any source — the backlog is cumulative.
- Never write to the board or close issues from this skill — it reads board status, it does not change it.
