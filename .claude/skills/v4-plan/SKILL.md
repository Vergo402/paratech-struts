---
name: v4-plan
description: "FieldShore v4 long-design workflow. Loads the v4 redesign plan, the v4-design folder, and the current phase state. Dispatches the appropriate agents for the active phase, handles gate notifications, and keeps the v4-redesign branch on rails. Different from /plan, which is for v3 release work. Use this skill whenever Alex says '/v4-plan', '/v4', 'continue v4', 'v4 status', 'next v4 phase', 'dispatch v4 essays', 'v4 gate', or 'where are we on v4'."
---

# FieldShore v4 — Long-Design Workflow

> Sibling skill to `/plan` (which is for v3 release work). This skill is shaped for the months-long v4 redesign with its 10-phase arc, multi-agent dispatch, and gate notification protocol.

The constitution lives at `~/.claude/plans/keen-whistling-pancake.md` — read it first every session. The folder `docs/v4-design/` (on the `v4-redesign` branch) is its execution.

---

## Phase 0 — Session-start ritual

Run these in parallel at the very start of every v4 session:

1. **Read the plan:** `~/.claude/plans/keen-whistling-pancake.md` (the constitution).
2. **Read the INDEX:** `docs/v4-design/00-INDEX.md` (current phase status).
3. **Read the open questions:** `docs/v4-design/99-open-questions.md`.
4. **Check the branch:** `git rev-parse --abbrev-ref HEAD` — must be `v4-redesign`. If on `main`, switch.
5. **Check for v3 patches to rebase:** `git fetch origin main && git log --oneline v4-redesign..origin/main` — if commits exist, rebase or merge before starting work (~5 min cost).
6. **Project state:** `gh project item-list <PROJECT_ID> --owner Vergo402 --format json` for the v4 Roadmap project — see what's open, blocked, ready-for-review.

After these run, you know exactly where v4 is.

---

## Phase 1 — Identify the active phase

Look at INDEX status table. The active phase is the one marked 🟡 In progress, or the next ⚪ Not started after the most recent 🟢 Done.

**Phase 1.5 — Surface the backlog when no phase is actively in progress.** If the most recent phase is 🟢 Done and the next phase is ⚪ Not started, check the INDEX's "Active Backlog" section and run `gh issue list --label v4 --state open --search "[Phase B]"` (or whichever phase is most-recently-Done). Show Alex the open follow-up issues and ask which single one to work next, unless Alex explicitly opts into a batch session (e.g., "work all of these today," "batch the next three"). Default rhythm is one issue per session — see [feedback_one_issue_per_session](~/.claude/projects/-Users-alex-Library-CloudStorage-OneDrive-Personal-Claude-OS-Field-Shore/memory/feedback_one_issue_per_session.md). Each issue's body (Goal / Function / How-to) is the durable record; load that with `gh issue view <number>` before planning.

| Active phase | What this skill does next |
|---|---|
| **A — Foundation** | Verify branch + folder skeleton exist; seed any missing files; ensure GitHub Project is set up; create `/v4-plan` skill if not present. Fire gate notification when done. |
| **B — Reference Teardown** | Dispatch 1 agent (general-purpose with WebFetch) to populate `04-references/*.md` per template. Dispatch second agent for `positioning.md` after individuals exist. Fire gate when done. |
| **C — Brainstorm Essays** | Dispatch 12 agents in parallel per the D4 matrix in the plan. Each gets the briefing packet (principles, primitives doctrine, reference teardowns, lens charter). Each writes 5,000+ words with 250-word exec summary + numbered recs. Fire gate when all essays committed. |
| **D — Synthesis** | Dispatch 1 synthesis agent to read all essays + reference positioning. Output `06-synthesis.md` + `06-coverage-matrix.md`. Fire gate. |
| **E — Design System** | Sequential sessions. Each session produces 1–2 design system spec files at picker-level depth. Color → Type → Spacing → Motion → Primitives. |
| **F — IA per Screen** | Sequential sessions. Each session does 2–3 screens × 4 surfaces. |
| **G — Workflow Design** | Sequential sessions. Each session does 1–2 workflows with state diagrams, screen-by-screen wireframes, accessibility scripts. |
| **H — Vertical Slice** | Build "Start operation → Add shore point → Deploy strut" end-to-end. Resolve PWA-vs-RN, build tooling, TS, component library decisions as ADRs. |
| **I — Whole-App Build** | One workflow per session. Beta deploy at `/v4/` subpath. |
| **J — Cutover** | Merge `v4-redesign` to `main`. Migration path, manual rewrite, rollback plan. |

---

## Phase 2 — Agent dispatch matrices

### Phase B — Reference Teardown

One general-purpose agent per product (parallelize) with WebFetch + WebSearch. Briefing packet:
- Read `02-principles.md` and `03-primitives/picker.md` from this folder.
- Real product names used directly under nominative fair use (ADR-001). The discipline: describe behavior not brand, never disparage, cite public sources only, no trademarked taglines presented as endorsements, no implied sponsorship/partnership.
- Fixed template per file (see D2 in the plan).
- Output: one markdown file per product in `04-references/` (slugs: `tablet-command.md`, `first-due.md`, `rednmx.md`, `iamresponding.md`, `rapidsos.md`, `fire-rescue-systems.md`).
- Archive.org snapshots preferred for citations; live links acceptable when archive snapshot unavailable.

After individual teardowns exist, dispatch second agent for `positioning.md` (2-axis chart + "FieldShore's place").

### Phase C — Brainstorm Essays (12 agents in parallel)

All 12 agents dispatched in a single message via parallel tool calls. Each:
- Receives: `01-context.md`, `02-principles.md`, `03-primitives/picker.md`, all of `04-references/`, the lens-specific charter, the file path to write.
- Targets: 5,000+ words minimum, 250-word executive summary, numbered recommendations (recommendations are what feeds the synthesis coverage matrix).
- Writes to its assigned file in `05-essays/`.

| # | Agent | File |
|---|---|---|
| 1 | architect | `05-essays/01-architecture.md` |
| 2 | mobile-ux | `05-essays/02-visual-language.md` |
| 3 | battalion-chief | `05-essays/03-ic-workflow.md` |
| 4 | usar-task-force-leader | `05-essays/04-future-scale.md` |
| 5 | nims-compliance | `05-essays/05-nims-doctrine.md` |
| 6 | structural-collapse-sme | `05-essays/06-domain-ux.md` |
| 7 | rescue-specialist | `05-essays/07-field-conditions.md` |
| 8 | skeptical-senior-engineer | `05-essays/08-skeptical-review.md` |
| 9 | devops-resilience | `05-essays/09-data-resilience.md` |
| 10 | fullstack-engineer | `05-essays/10-implementation.md` |
| 11 | scenario-conductor | `05-essays/11-scenario-stress.md` |
| 12 | code-auditor | `05-essays/12-tech-debt.md` |

### Phase D — Synthesis

One synthesis agent. Reads all 12 essays + reference positioning. Outputs:
- `06-synthesis.md` — convergent themes / productive conflicts / surprises / recommended path / open questions.
- `06-coverage-matrix.md` — every numbered recommendation from every essay, status: `accepted` / `deferred` / `rejected` / `merged-with-N`. Each rejection has a one-line reason.

Synthesis is not allowed to silently drop a recommendation. Coverage matrix is the audit trail.

---

## Phase 3 — Gate notification protocol

When a phase reaches its gate, do ALL of the following before stopping:

1. Update `00-INDEX.md` to mark the phase status as 🚦 Gate ready for review.
2. Update the corresponding GitHub Project subtask to "Ready for Review."
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
- **Cherry-pick or rebase v3 patches** at session start. ~5 min cost; keeps v4 from drifting from v3 reality.

---

## Anti-patterns (do not do these)

- Don't run `/v4-plan` and start coding the app — Phase A through G are design, not build.
- Don't dispatch fewer than the 12 essays in Phase C — losing a lens loses an insight.
- Don't merge `v4-redesign` to `main` until Phase J explicitly approves it.
- Don't ask Alex "what phase are we in?" — the INDEX tells you.
- Don't update the principles file without an ADR explaining why.

---

## Variables this skill expects

- `PROJECT_ID` — GitHub Project ID for the v4 Roadmap view (set during Phase A). v4 project is `PVT_kwHODy7CN84BYV37` (project #2).
- Reference products list (real names): Tablet Command, First Due, RedNMX (Alpine Software), IAMResponding, RapidSOS, Fire Rescue Systems.

---

## Why this skill exists

The existing `/plan` skill is shaped for v3's PATCH/MINOR/MAJOR release cadence. v4 is fundamentally different: long design phases, multi-agent fan-out/fan-in, gate-based progression, no merge to main for the foreseeable future. `/v4-plan` is the workflow tuned for that shape.

Both skills coexist. `/plan` keeps shipping v3.20+ patches. `/v4-plan` carries v4 through its arc.
