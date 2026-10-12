---
name: plan-v4
description: "FieldShore v4 long-design workflow. Loads the v4 redesign plan, the v4-design folder, and the current phase state. Dispatches the appropriate agents for the active phase, handles gate notifications, and keeps the v4-redesign branch on rails. Different from /plan, which is for v3 release work. Use this skill whenever Alex says '/v4-plan', '/v4', 'continue v4', 'v4 status', 'next v4 phase', 'dispatch v4 essays', 'v4 gate', or 'where are we on v4'."
---

# FieldShore v4 — Long-Design Workflow

> Sibling skill to `/plan-release` (which is for v3 release work). This skill is shaped for the months-long v4 redesign with its 10-phase arc, multi-agent dispatch, and gate notification protocol.

The constitution is now in-repo (the old `~/.claude/plans/v4-master-plan.md` was purged): context in `docs/v4-design/01-context.md`, principles in `docs/v4-design/02-principles.md`, phase table in `docs/v4-design/00-INDEX.md`, locked decisions as ADRs in `docs/v4-design/11-decisions/`. Read those first every session; the folder `docs/v4-design/` (on the `v4-redesign` branch) is the execution.

---

## Phase 0 — Session-start ritual

Run these in parallel at the very start of every v4 session:

1. **Read the constitution:** `docs/v4-design/01-context.md` (context) and `docs/v4-design/02-principles.md` (the principles).
2. **Read the INDEX:** `docs/v4-design/00-INDEX.md` (current phase status).
3. **Read the open questions:** `docs/v4-design/99-open-questions.md`.
4. **Check the branch:** `git rev-parse --abbrev-ref HEAD` — must be `v4-redesign`. If on `main`, switch.
5. **Check for v3 patches to rebase:** `git fetch origin main && git log --oneline v4-redesign..origin/main` — if commits exist, merge `origin/main` into `v4-redesign` before starting work (never rebase — the branch is published) (~5 min cost).
6. **Project state:** `gh project item-list 2 --owner Vergo402 --limit 400 --format json` for the v4 Roadmap project — see what's open and blocked.

After these run, you know exactly where v4 is.

### Phase 0.5 — External-input triage (when Alex brings outside documents)

When Alex drops externally-generated specs, audits, or action plans (files from Downloads, another AI's output, a consultant doc), do NOT plan from them directly — a document's specificity is not evidence of its currency or fit. Before any planning:

1. **Fact-check which codebase/version it describes.** Outside docs routinely analyze v3's root files and call them "v4".
2. **Diff its proposals against locked ADRs and shipped work** (`docs/v4-design/11-decisions/`, the INDEX). Flag every conflict.
3. **Ask Alex which conflicts are deliberate re-opens vs. artifacts of missing context** — surface them as explicit confirm/revise questions (per the confirm-specs-before-plan rule).
4. **Treat the underlying intent as the requirement, not the document's plan structure.** Never inherit its schedule, sequencing, or scope without checking against the repo's decisions.

---

## Phase 1 — Identify the active phase

Look at INDEX status table. The active phase is the one marked 🟡 In progress, or the next ⚪ Not started after the most recent 🟢 Done.

**Phase 1.5 — Surface the backlog when no phase is actively in progress.** If the most recent phase is 🟢 Done and the next phase is ⚪ Not started, check the INDEX's "Active Backlog" section and run `gh issue list --label v4 --state open --search "[Phase J]"` (or whichever phase is most-recently-Done). Show Alex the open follow-up issues and ask which single one to work next, unless Alex explicitly opts into a batch session (e.g., "work all of these today," "batch the next three"). Default rhythm is one issue per session. Each issue's body (Goal / Function / How-to) is the durable record; load that with `gh issue view <number>` before planning.

| Active phase | What this skill does next |
|---|---|
| **A–H** | Done — see `docs/v4-design/00-INDEX.md`. |
| **I — Whole-App Build** | One workflow per session. Beta = Firebase Hosting preview channel `beta`, redeployed on every push to `v4-redesign` (`.github/workflows/deploy-v4-beta.yml`). |
| **J — Cutover** | Merge `v4-redesign` to `main`. Migration path, manual rewrite, rollback plan. |

---

## Phase 3 — Gate notification protocol

When a phase reaches its gate, do ALL of the following before stopping:

1. Update `00-INDEX.md` to mark the phase status as 🚦 Gate ready for review.
2. Leave the phase's board items In Progress; the gate-notification sub-issue stays open until Alex signs off.
3. Post a chat message to Alex with:
   - Phase name and what was produced.
   - File paths to read first.
   - The question(s) that need his answer.
4. Set `ScheduleWakeup` 1200s+ out as a fallback ping.

Alex is never waiting on a gate without knowing it's ready.

### Issue lifecycle

- **Sub-issues** (deliverables, gate-notification) close when their individual work item is complete.
- **Parent issue** closes when *both* conditions hold: (a) the last step of the phase is complete, and (b) the next phase has begun. Closing the parent earlier is premature; leaving it open after the next phase is in flight is stale bookkeeping.
- **Gate-notification sub-issue** is its own marker — it stays open until Alex's actual sign-off action lands (e.g., Approve review on the gate PR, or explicit "approved" in chat). Closing the parent does not close the gate notification; the gate notification is the audit trail for sign-off itself.

---

## Phase 4 — Continuous discipline

- **No commits to `main` from this skill, ever.** Only `v4-redesign`.
- **Real names of reference apps are allowed under nominative fair use (ADR-001).** Describe behavior, never disparage, cite public sources, no trademarked taglines presented as endorsements, no implied sponsorship.
- **Every committed design decision becomes an ADR** in `11-decisions/`.
- **Every state-changing session updates the INDEX.** The INDEX is the truth.
- **Every open question gets resolved or deferred before its phase gate.** No leaks across phases.
- **Merge v3 patches** (`origin/main`) into `v4-redesign` at session start — never rebase; the branch is published and every push deploys the beta. ~5 min cost; keeps v4 from drifting from v3 reality.
- **Rename this session's plan file before finishing.** Harness plan-mode files in `~/.claude/plans/` get random names. At session end, rename yours to the descriptive convention (`v4-phase-…`, `v4-issue-…`, `v4-adr-…`), update any references, and append the old→new pair to `.claude/plans/GLOBAL-PLAN-INDEX.md`. The old master plan `v4-master-plan.md` was purged; its in-repo successors are `docs/v4-design/01-context.md`, `02-principles.md` and `00-INDEX.md`. There is no harness setting for plan-file naming.

---

## Anti-patterns (do not do these)

- Don't merge `v4-redesign` to `main` until Phase J explicitly approves it.
- Don't ask Alex "what phase are we in?" — the INDEX tells you.
- Don't update the principles file without an ADR explaining why.
- Don't let parallel agents touch git. Every brief for a parallel dispatch forbids all git commands (stash/checkout/restore/reset/clean/commit) — a sibling's state-restoring command silently reverts the others' uncommitted work. Use worktree isolation if an agent genuinely needs git; see `.claude/agents/DELEGATION.md` oversight item 5.

---

## Variables this skill expects

- `PROJECT_ID` — GitHub Project ID for the v4 Roadmap view (set during Phase A). v4 project is `PVT_kwHODy7CN84BYV37` (project #2).
- Reference products list (real names): Tablet Command, First Due, RedNMX (Alpine Software), IAMResponding, RapidSOS, Fire Rescue Systems.

