---
name: plan
description: "Unified release workflow: ship open bugs as a PATCH, or plan the next MINOR/MAJOR release. Reads the FieldShore Roadmap GitHub Project as the single source of truth for tracked items. Use this skill whenever Alex says 'plan the next release', 'start planning', 'what should we work on next', 'fix the bugs', 'ship the open bugs', 'triage issues', 'patch the bugs', 'what issues are open', '/plan', '/issue-triage', or '/work'."
---

# Release Workflow — Plan or Ship

One skill, two modes. The GitHub Project (`Vergo402` → Project #1, "FieldShore Roadmap") is the source of truth for every tracked item. CONSOLIDATED-STATUS.md is per-release narrative only. Plan files in `.claude/plans/` are frozen specs (immutable after ship; archived).

The workflow branches early on intent so the daily bug-shipping flow doesn't pay for full multi-source planning.

---

## Phase 0 — Intent

Detect what Alex is asking for:

| Said | Mode |
|---|---|
| "ship the open bugs", "fix the bugs", "patch the bugs", "triage issues", "/issue-triage" | **ship-bugs** |
| "plan the next release", "start planning", "what should we work on next", "/plan" | **plan-release** |
| "/work" or ambiguous | ask explicitly |

If ambiguous:
```
Two modes:

A. Ship open bugs now (PATCH release).
   Pulls Project items where Source=bug AND Status=Todo.
   Fixes, version-bumps, merges, ships, closes issues.

B. Plan the next release (MINOR/MAJOR).
   Pulls Project items + audits + Firebase feedback + agent review.
   Writes a frozen plan spec; doesn't execute.

Which? [A/B]
```

Then proceed to Phase 1.

---

## Phase 1 — State snapshot

### Read project state (both modes)

```bash
gh project item-list 1 --owner Vergo402 --limit 200 --format json
```

This is the source of truth for tracked items. Returns items with fields: `Status`, `Release`, `Source`, `Severity`, `Component`, linked issue number/URL.

### Read behavioral context (both modes)

```bash
cat CLAUDE.md
cat /Users/alex/.claude/projects/-Users-alex-Developer-paratech-struts-main/memory/MEMORY.md
ls /Users/alex/.claude/projects/-Users-alex-Developer-paratech-struts-main/memory/
```

Extract for the rest of the session:
- **Release checklist** (CLAUDE.md) — 3-place version bump; user-manual rule for MINOR/MAJOR updates **both** `docs/USER-MANUAL.md` AND `docs/FieldStruts-User-Manual.docx` (rebuild via `.claude/scripts/build-user-manual-docx.py` + refresh `docs/manual-assets/` screenshots), covering the whole release not just the headline feature; NO manual update for PATCH
- **Architecture gotchas** (CLAUDE.md) — CSS stacking, plate picker, Firebase + SW, local-first writes, escapeHtml/escapeAttr
- **Terminology rules** (CLAUDE.md) — Footer/Sole Plate/Header/Group conventions
- **Code-quality** (`feedback_code_quality.md`) — lead with structural fix, not patch
- **Safety defaults** (`feedback_safety_defaults.md`) — ask before changing auto-fills
- **Verification standard** (`feedback_verification_standard.md`) — drive real preview UI
- **Version-bump rule** (`feedback_version_bumps.md`) — every fix bumps PATCH in 3 places
- **Permissions** (`permissions.md`) — allowed to add/edit/run; ask before delete
- **Release housekeeping** (`feedback_release_housekeeping.md`) — auto-run housekeeping on push to main
- **Strategic roadmap** (MEMORY.md) — current local-first v4.0 pivot
- **Current version** (MEMORY.md) — cross-check against version sources

### Version drift check (both modes)

```bash
grep "CACHE_NAME" sw.js
grep -n 'class="version-label"' index.html
grep -n "APP_VERSION = " app.js
head -5 .claude/plans/CONSOLIDATED-STATUS.md
```

If the four disagree, flag as a finding before continuing.

### Git state (both modes)

```bash
git status --short
git branch --show-current
git log --oneline -5
```

- Dirty working tree → warn, allow.
- Off `main` → warn, allow.
- Uncommitted `.claude/plans/` changes → warn harder (stale planning inputs).

### Plan mode extras

Skip these in ship-bugs mode.

```bash
ls -1 .claude/plans/*.md           # active plans (supersession graph)
ls -1 .claude/audits/              # audit corpus
cat .claude/audits/AUDIT-INDEX.md
cat .claude/audits/findings-ledger.md
ls -1 .claude/agents/              # available personas
```

Read first ~40 lines of each active plan for canonical-source declarations.

---

## Phase 2 — Triage

### Pull candidate items from the Project

```bash
# Open items only (Status != Done)
gh project item-list 1 --owner Vergo402 --limit 200 --format json --jq \
  '.items[] | select(.status != "Done")'
```

For ship-bugs mode, filter further:
- `Source` in {bug, feedback}
- `Release` = "Backlog" OR matches next-release pointer (the next PATCH version)

For plan-release mode, candidate set = everything not Done. Within the candidates:
- `Release = Backlog` items are unassigned and eligible to scope into the current target version.
- `Release = v{X.Y.Z}` items where v{X.Y.Z} **matches** the target version are already-scoped (re-confirm with Alex).
- `Release = v{X.Y.Z}` items where v{X.Y.Z} **doesn't match** the target are pre-committed elsewhere — **surface, do NOT silently re-scope**. Ask: "Item #N is scoped to v3.18.0. Move to v{target}?"

### Severity & priority

Severity field exists on every item. If unset, infer from labels:
- `bug` + safety-critical keywords (data/algorithm/sync) → P1 / Critical
- `bug` + workflow-blocker → P2 / High
- `bug` + cosmetic/polish → P3 / Medium
- `enhancement` → P4 / Low (planning queue, not ship queue)
- `audit` Critical/High from ledger → P1 / P2

Write derived severity back to the Project via `gh project item-edit`.

### Dedupe across sources

The Project is the dedupe anchor, but a single issue might have audit findings AND feedback motivation. Annotate, don't split.

### Present triage (both modes)

```
## Triage — {N} open items

### Bugs ({K} items, PATCH-eligible)
| Priority | Issue | Title | Component |
|---|---|---|---|
| P1 | #88 | Operations tab freeze | UI |
| P2 | #14 | Quick Add plates not sorted | UI |

### Enhancements ({M} items, MINOR-eligible)
| Issue | Title | Component |
|---|---|---|
| #22 | ICS hierarchy chart | ICS |

### Audit findings ({L} items)
| Finding | File:line | Severity |
|---|---|---|
| F-1C-7 | app.js:1247 | High |
```

Wait for Alex to confirm the triage. He may re-prioritize, defer, or promote items.

---

## Phase 3 — Branch on intent

### Mode A: Ship bugs

#### A1. Derive PATCH version

Current version from `sw.js` `CACHE_NAME`. Bump PATCH (e.g., v3.16.4 → v3.16.5).

#### A2. Draft PATCH plan file

```
.claude/plans/v{VERSION}-bug-patch.md
```

For each bug in scope: investigate, name function(s), quote problematic line, describe concrete fix. The plan must be specific enough that execution doesn't re-investigate.

Plan structure:

```markdown
# Plan: v{VERSION} — Bug Patch

## Context
{N} open bugs from the Project (Source=bug, Release=Backlog).
Fixing in priority order; PATCH release.

## Bugs (priority order)

### P1: {Title}
**Issue:** #{number}
**Symptom:** {what user sees}
**Root cause:** {function, file:line, logic error}
**Fix:** {exact change}
**Verification:** {preview UI driver flow}
**Agent:** {persona} · **Model:** {tier} · **Effort:** {sizing} · **Owner:** {github-login}

### P2: ...

## Files to modify
| File | Changes |
|---|---|
| `app.js` | … |
| `sw.js` | CACHE_NAME → v{VERSION} |
| `index.html` | version label → v{VERSION} |

## Release checklist
- [ ] **Step 0 — `v{VERSION}` Release option exists in the Project** (web UI: settings → fields → Release → "+ Add option"). Never `updateProjectV2Field` for this — set-and-replace semantics wipe the field. See `feedback_project_field_mutations.md`.
- [ ] Version bump in 3 places (sw.js, index.html, app.js APP_VERSION)
- [ ] Each bug verified via preview UI driver
- [ ] No regressions
- [ ] Feature branch merged to main
- [ ] GitHub release v{VERSION} created
- [ ] In-scope issues closed (auto via `Closes #N`)
- [ ] Project items: Status=Done, Release=v{VERSION}
- [ ] CONSOLIDATED-STATUS narrative updated
```

Present plan, get approval.

#### A3. Execute

Set every in-scope item to **In Progress** before starting code work:

```bash
gh project item-edit --id <item-id> --project-id PVT_kwHODy7CN84BYNd6 \
  --field-id PVTSSF_lAHODy7CN84BYNd6zhTU44c \
  --single-select-option-id 47fc9ee4
```

```bash
git checkout -b bugfix/v{VERSION}
```

Fix each bug top-to-bottom. After each fix, briefly confirm what changed (and note if the actual fix diverged from the plan and why).

Version bump:
1. `sw.js`: `CACHE_NAME = 'fieldshore-v{VERSION}'`
2. `index.html` line ~74: `<div class="version-label">v{VERSION}</div>`
3. `app.js`: `APP_VERSION = '{VERSION}'`

**Verification gate (per `feedback_verification_standard`):**
Drive the real preview UI for every changed user flow. eval/spy tests are NOT sufficient.

#### A4. Ship

```bash
git add {specific files}
git commit -m "v{VERSION} — {summary}

{per-bug one-liners with Closes #N}

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"

git checkout main
git merge --no-ff bugfix/v{VERSION} -m "Merge v{VERSION} — {summary}"
git push origin main

gh release create v{VERSION} --title "v{VERSION} — {summary}" --notes "{notes with bug list}"
```

#### A5. Project housekeeping

For each in-scope item, set Release, Agent, Model, and Effort:
```bash
# Release
gh project item-edit --id <item-id> --project-id PVT_kwHODy7CN84BYNd6 \
  --field-id PVTSSF_lAHODy7CN84BYNd6zhTU5j0 \
  --single-select-option-id <release-option-id-for-vX.Y.Z>

# Agent
gh project item-edit --id <item-id> --project-id PVT_kwHODy7CN84BYNd6 \
  --field-id PVTSSF_lAHODy7CN84BYNd6zhTVWwQ \
  --single-select-option-id <agent-option-id>

# Model
gh project item-edit --id <item-id> --project-id PVT_kwHODy7CN84BYNd6 \
  --field-id PVTSSF_lAHODy7CN84BYNd6zhTVXlA \
  --single-select-option-id <model-option-id>

# Effort
gh project item-edit --id <item-id> --project-id PVT_kwHODy7CN84BYNd6 \
  --field-id PVTSSF_lAHODy7CN84BYNd6zhTVXl4 \
  --single-select-option-id <effort-option-id>
```

Assign the underlying issue to the responsible dev (Project surfaces it automatically):
```bash
gh issue edit <number> --repo Vergo402/paratech-struts --add-assignee <github-login>
```

Status auto-syncs to Done when issue closes (Project default rule). Status was already set to In Progress in A3.

If any items lack a Severity or Component, set them now while context is fresh.

#### A6. CONSOLIDATED-STATUS narrative update

Append a short paragraph to the per-release narrative section. No item bullets — those live in the Project. Two or three sentences: what shipped, what was learned, what's deferred and why.

#### A7. Report

```
## Patched v{VERSION}

Bugs fixed: #N1, #N2, ...
Project items updated: {K}
GitHub release: https://github.com/Vergo402/paratech-struts/releases/tag/v{VERSION}

Deferred to next release: #N3 (reason)
```

---

### Mode B: Plan release

#### B1. Run `/feedbackreview` (always)

Invoke `/feedbackreview` via the Skill tool. No recency check, no soft-gate — every plan-release run starts by draining the Firebase feedback queue. If the queue is empty, the skill returns "No new feedback" in seconds and the cost is negligible. If the queue has items, they get triaged into the unified open-items matrix in B2 instead of being missed.

Capture from the skill output: new issues created, plan filename, theme summary. The skill also pushes new items to the Project.

If `/feedbackreview` errors (Firebase auth, etc.), surface verbatim and offer to continue without.

#### B2. Reconcile open items

Build a unified open-items matrix from:
- Project items (already gathered in Phase 1)
- Audit findings still marked open in `findings-ledger.md` (synthesize Project items if missing)
- `/feedbackreview` output from B1

Dedupe: same item across sources keeps highest priority (audit > feedback > issue > prior plan).

Respect canonical-source declarations (e.g., MASTER-PLAN line 7 names `v4.0.0-plan.md` canonical for v4.0 scope).

#### B3. Identify next planned release

Read `CONSOLIDATED-STATUS.md` and `v4.0.0-plan.md` for the next release pointer.

Edge cases:
- Next planned already shipped → walk Alex through "advance the pointer."
- Current vs. planned mismatch → ask: "plan next-next, or plan a continuation patch?"
- Empty in-scope after dedup → ask: "no open items match. Propose a different release?"

Derive semver per `release-manager` criteria:
- **PATCH** — bug fixes, copy changes, no UI workflow change
- **MINOR** — new features, UI additions, no breaking changes
- **MAJOR** — breaking changes, migrations, paradigm shifts

#### B4. Present scope → **GATE 1**

For each in-scope item, the table must show its **current Release field value** so re-scopes are visible:

```
## Proposed Scope — v{X.Y.Z}

**Bump:** {PATCH/MINOR/MAJOR} — {reasoning}

### In scope (N items)
| # | Issue | Title | Source | Current Release | Agent | Model | Effort | Owner | Action |
|---|---|---|---|---|---|---|---|---|---|
| 1 | #79 | assignedApparatus keyed object | audit | Backlog | migration-specialist | Opus 4.7 | Extra high | Vergo402 | scope into v{X.Y.Z} |
| 2 | #107 | external eq return path | audit | v3.17.0 | fullstack-engineer | Sonnet 4.6 | Medium | Vergo402 | already scoped (no change) |
| 3 | #200 | newly-discovered listener leak | audit | (none — new) | devops-resilience | Sonnet 4.6 | Low | Vergo402 | create issue + scope |
| 4 | #150 | NIMS cutover prep | feedback | v3.18.0 | nims-compliance + fullstack-engineer | Opus 4.7 1M | Max | Vergo402 | **MOVE FROM v3.18.0** — confirm? |

### Deferred (M items → v{X.Y+1.0})

### File impact
- `app.js` — {…}

### Agents to dispatch (auto-detected — Phase B6 review pass)
- `devops-resilience`, `mobile-ux`, `qa-driver`, `release-manager`, …

Approve, redirect, or cancel?
```

The **Agent / Model / Effort / Owner** columns are auto-detected per the heuristics in the "Auto-detection" section below the field reference. If an item's dominant work changes (e.g., audit finding turns out to need a UI rebuild, not just a Firebase tweak), update the column before approving.

Cross-release moves (the `**MOVE FROM**` row above) require explicit Alex confirmation per item — never silently re-scope a pre-committed item.

**GATE 1: no `.claude/plans/` files written, no Project field writes yet.** If redirected, loop back to B2.

#### B5. Draft plan file + scope items in Project

Once GATE 1 approved, perform **both** actions:

**(a) Create issues for items that don't have one** (audit findings still in the ledger, etc.):

```bash
gh issue create --repo Vergo402/paratech-struts \
  --title "{title}" --label "{label}" --body "..."
gh project item-add 1 --owner Vergo402 --url <new-issue-url>
```

**(b) For every in-scope item — both newly-created AND existing Project items at Backlog (or being moved per B4 confirmation):**

Set **Status (→ In Progress) + Release + Agent + Model + Effort** in one batch per item:

```bash
# Status → In Progress
gh project item-edit --id <item-id> --project-id PVT_kwHODy7CN84BYNd6 \
  --field-id PVTSSF_lAHODy7CN84BYNd6zhTU44c \
  --single-select-option-id 47fc9ee4

# Release
gh project item-edit --id <item-id> --project-id PVT_kwHODy7CN84BYNd6 \
  --field-id PVTSSF_lAHODy7CN84BYNd6zhTU5j0 \
  --single-select-option-id <release-option-id-for-v{VERSION}>

# Agent (from B4 table)
gh project item-edit --id <item-id> --project-id PVT_kwHODy7CN84BYNd6 \
  --field-id PVTSSF_lAHODy7CN84BYNd6zhTVWwQ \
  --single-select-option-id <agent-option-id>

# Model (from B4 table)
gh project item-edit --id <item-id> --project-id PVT_kwHODy7CN84BYNd6 \
  --field-id PVTSSF_lAHODy7CN84BYNd6zhTVXlA \
  --single-select-option-id <model-option-id>

# Effort (from B4 table)
gh project item-edit --id <item-id> --project-id PVT_kwHODy7CN84BYNd6 \
  --field-id PVTSSF_lAHODy7CN84BYNd6zhTVXl4 \
  --single-select-option-id <effort-option-id>
```

Assign the dev team member responsible via the GitHub Issue (Project surfaces it automatically):

```bash
gh issue edit <number> --repo Vergo402/paratech-struts --add-assignee <github-login>
```

Default owner is `Vergo402` unless Alex specifies otherwise during B4. For pre-assigned issues, leave the assignee alone.

Also set `Severity` + `Component` + `Source` if missing. Status is set to In Progress at scope-in (step b above) — items are committed to this release, so they're in progress.

**This is the critical step the user explicitly flagged: items don't drift back to Backlog because the Release field is set HERE, at scope-in, not after ship. Agent / Model / Effort / Assignee follow the same rule — set them at scope-in so the Project shows a complete assignment view, not after execution.**

Save plan to `.claude/plans/v{VERSION}-{theme}.md` (theme is 2-3 word kebab-case slug).

Plan structure: same as Mode A, plus sections for `## Feedback triage`, `## Audit items addressed`, `## Verification plan` (preview UI driver flows for each item), `## Agent review` (placeholder for Phase B6).

#### B6. Agent dispatch → **GATE 2**

Per `feedback_agent_gate` memory: **every MINOR/MAJOR runs code-auditor + battalion-chief + mobile-ux + skeptical-senior-engineer BEFORE implementation**. PATCH gets code-auditor + skeptical-senior-engineer only (but we're in plan-release mode, so this is MINOR/MAJOR).

The `skeptical-senior-engineer` is the counterweight: it pushes back on necessity, complexity, hidden costs, and unstated assumptions in the plan. It runs alongside the other reviewers, never instead of one. Its job is to ask "why are we doing this?" while the others ask "are we doing this right?"

Auto-detect additional agents from scope:

| If scope touches… | Add |
|---|---|
| Load tables, shore types, deductions, struts | `structural-collapse-sme` |
| ICS roles, NIMS terms, apparatus, org chart | `nims-compliance` |
| XSS, race conditions, listeners, security | `code-auditor` (always for MINOR/MAJOR) |
| Firebase, service worker, offline, schema, migrations | `devops-resilience` |
| UI, CSS, touch targets, accessibility | `mobile-ux` (always for MINOR/MAJOR) |
| Multi-agency, federal scope, large deployments | `usar-task-force-leader` |
| Command transfer, IC workflow, SitStat | `battalion-chief` (always for MINOR/MAJOR) |
| Surfside-scale stress testing | `scenario-conductor` |
| Field stress (gloves, sun, dropped phones) | `rescue-specialist` |
| Schema cutover, dual-write, rollback | `migration-specialist` |
| Cross-file design, paradigm shifts | `architect` |
| User manual updates (.md + .docx, MINOR/MAJOR) | `manual-writer` |

**Always include** `release-manager`, `qa-driver`, and `skeptical-senior-engineer`. Cap typically ≤ 7 agents total.

Dispatch in parallel — single message with multiple `Agent` tool calls. Each agent receives: plan path, scope (1-2 sentences), asked to return APPROVE / CONCERNS / BLOCK + top concern + detailed findings.

Recursion cap: depth 1. An agent may suggest one more agent; that agent may not suggest a third.

Modify the plan file in place to address BLOCK findings (mandatory) and CONCERNS (resolve or document explicit deferral). Fill in the "Agent review" section with the final verdict table.

If an agent errors: report, offer retry/skip/abort, don't abort the whole phase.

If an agent suggests a new persona: surface with 1-line rationale, draft only on explicit approval, save to `.claude/agents/{name}.md`.

Present hybrid summary + final plan → **GATE 2**.

#### B7. Finalize

Order matters (each step independently reversible until the next runs):

1. **Archive superseded plans** — `mv .claude/plans/v{X.Y.Z}-*.md .claude/plans/archive/` (except the new one). Idempotent.

2. **Verify Project field-fill** — Release, Agent, Model, Effort were set in B5 at scope-in. Verify every in-scope item has all four plus an assignee:
   ```bash
   gh project item-list 1 --owner Vergo402 --format json --limit 200 --jq \
     ".items[] | select(.release == \"v{VERSION}\") | {number: .content.number, title: .content.title, agent: .agent, model: .model, effort: .effort, assignees: .content.assignees}"
   ```
   Any item with a `null` Agent/Model/Effort or empty `assignees` is an oversight from B5 — fill it now via `gh project item-edit` / `gh issue edit`. Common gap: a B6 agent fold-in added a new item that didn't go through the B4 auto-detection pass. Status should already be In Progress from B5; verify and fix any that are still Todo.

3. **CONSOLIDATED-STATUS narrative update** — append a per-release narrative paragraph. No item bullets (Project owns those).

4. **Report**:
   ```
   ## Planning Complete — v{VERSION}

   Plan: .claude/plans/v{VERSION}-{theme}.md
   In scope: {N} items (see Project filter: Release=v{VERSION})
   Assignment: {X} owned by Vergo402, {Y} by …
   Model mix: {N1} Opus 4.7 1M · {N2} Opus 4.7 · {N3} Sonnet 4.6 · {N4} Haiku 4.5
   Effort mix: {N1} Max · {N2} Extra high · {N3} High · {N4} Medium · {N5} Low
   Review agents (B6): {N} approve, {M} concerns, {K} block
   New agents drafted: {0 or list}

   Next: run /plan in ship mode to execute (or `git checkout -b feature/v{VERSION}-{theme}`).
   ```

---

## Project field reference

When editing Project items via `gh project item-edit`, you need the field IDs:

| Field | Field ID | Type |
|---|---|---|
| Status | `PVTSSF_lAHODy7CN84BYNd6zhTU44c` | single-select — set to In Progress at scope-in/execution start; Done auto-syncs on issue close |
| Release | `PVTSSF_lAHODy7CN84BYNd6zhTU5j0` | single-select |
| Source | `PVTSSF_lAHODy7CN84BYNd6zhTU5G0` | single-select |
| Severity | `PVTSSF_lAHODy7CN84BYNd6zhTU5G8` | single-select |
| Component | `PVTSSF_lAHODy7CN84BYNd6zhTU5IU` | single-select |
| **Agent** | `PVTSSF_lAHODy7CN84BYNd6zhTVWwQ` | single-select — primary subagent persona |
| **Model** | `PVTSSF_lAHODy7CN84BYNd6zhTVXlA` | single-select — Claude model tier (matches the in-editor picker) |
| **Effort** | `PVTSSF_lAHODy7CN84BYNd6zhTVXl4` | single-select — reasoning-effort tier (matches the in-editor picker) |
| Assignees | `PVTF_lAHODy7CN84BYNd6zhTU44Y` | native GitHub field — dev team member responsible (set via `gh issue edit --add-assignee`) |

Project ID: `PVT_kwHODy7CN84BYNd6` (number 1, owner Vergo402).

Option IDs are listed in `.claude/scripts/backfill-project.sh` (or query via `gh project field-list 1 --owner Vergo402 --format json`).

### Status option IDs

**Status** (`PVTSSF_lAHODy7CN84BYNd6zhTU44c`):

| Status | Option ID |
|---|---|
| Todo | `f75ad846` |
| In Progress | `47fc9ee4` |
| Done | `98236657` |

### Assignment-field option IDs

**Agent** (`PVTSSF_lAHODy7CN84BYNd6zhTVWwQ`):

| Agent | Option ID |
|---|---|
| architect | `52c52e5f` |
| battalion-chief | `38251cee` |
| code-auditor | `c0038ac1` |
| devops-resilience | `b86a4511` |
| fullstack-engineer | `84c07f9b` |
| manual-writer | `521627f8` |
| migration-specialist | `4b4ee56b` |
| mobile-ux | `81f49c4a` |
| nims-compliance | `cb74b3d8` |
| qa-driver | `351f199a` |
| release-manager | `dc981981` |
| rescue-specialist | `e51c7375` |
| scenario-conductor | `99863371` |
| structural-collapse-sme | `7b39d1dd` |
| usar-task-force-leader | `94e40a39` |
| general-purpose | `31d120c4` |

**Model** (`PVTSSF_lAHODy7CN84BYNd6zhTVXlA`) — mirrors the Claude Code model picker (Models menu, ⇧⌘I):

| Model | Option ID |
|---|---|
| Opus 4.7 | `3050dd5b` |
| Opus 4.7 1M | `17993ea2` |
| Sonnet 4.6 | `1e38b345` |
| Haiku 4.5 | `1aacd747` |
| Opus 4.6 Legacy | `1622589c` |

**Effort** (`PVTSSF_lAHODy7CN84BYNd6zhTVXl4`) — mirrors the Claude Code effort picker (Effort menu, ⇧⌘E):

| Effort | Option ID |
|---|---|
| Low | `e7e7fdf8` |
| Medium | `f90a7518` |
| High | `3b27edcd` |
| Extra high | `aa236408` |
| Max | `c708dbf5` |

### Auto-detection — Agent / Model / Effort

Infer at scope-in. Surface in the GATE 1 / plan table; Alex can override before commit.

**Agent (primary implementer)** — pick the persona whose description best matches the dominant work:

| Scope dominated by… | Agent |
|---|---|
| UI, CSS, touch targets, accessibility, visual polish | `mobile-ux` |
| Schema cutover, dual-write, rollback, data migration | `migration-specialist` |
| Firebase, service worker, offline, listener lifecycle | `devops-resilience` |
| ICS roles, NIMS terms, apparatus, doctrine | `nims-compliance` (review) + `fullstack-engineer` (impl) |
| Load tables, strut math, shore types, deductions | `structural-collapse-sme` (review) + `fullstack-engineer` (impl) |
| Cross-file design, paradigm shift, modularization | `architect` (plan) + `fullstack-engineer` (impl) |
| User manual updates (.md + .docx, MINOR/MAJOR) | `manual-writer` |
| Surfside-scale stress test | `scenario-conductor` |
| IC workflow, command transfer, SitStat | `battalion-chief` (review) + `fullstack-engineer` (impl) |
| Multi-agency / federal scope | `usar-task-force-leader` (review) |
| Generic feature work, plain bug fix | `fullstack-engineer` (default) |

If a review-only persona owns the item (e.g., `nims-compliance` for a doctrine change), set Agent to the implementer (usually `fullstack-engineer`) and capture the review persona in the plan-file "Agent review" section instead. Agent field tracks **who's doing the work**, not who's reviewing.

**Model** — pick the smallest model that can do the job correctly. Options match the Claude Code picker:

| Work shape | Model |
|---|---|
| Trivial copy/label/style change, single-line fix, mechanical | `Haiku 4.5` |
| Standard feature work, well-understood, single-file or small multi-file | `Sonnet 4.6` |
| Architecture work, multi-file refactor, doctrine cutover, safety-critical math, migrations | `Opus 4.7` |
| Whole-codebase audits, planning sessions spanning many large files, anything that needs to hold the entire app.js + audits + plans in context | `Opus 4.7 1M` |
| Avoid by default — only when reproducing pre-4.7 behavior matters | `Opus 4.6 Legacy` |

**Effort** — reasoning-effort tier, matching the Claude Code picker. Pick by the depth of reasoning the work needs, not wall-clock time:

| Work shape | Effort |
|---|---|
| Mechanical, well-specified, no judgment calls | `Low` |
| Standard implementation, normal review depth | `Medium` |
| Multi-file refactor, careful sequencing, real design judgment | `High` |
| Paradigm shift, doctrine work, safety-critical math, large surface area | `Extra high` |
| Release-defining or novel work where depth-of-reasoning trumps cost | `Max` |

Effort doesn't have to match Model. A `Haiku 4.5 · Max` item is a mechanical change where every detail matters; an `Opus 4.7 · Medium` item is a complex domain but routine for that domain.

**Assignees (dev team member)** — set via the GitHub Issue, not the Project field directly:

```bash
gh issue edit <number> --repo Vergo402/paratech-struts --add-assignee <github-login>
```

Default to `Vergo402` (Alex) unless he specifies otherwise. The Project surfaces issue assignees automatically. For unassigned items, leave blank rather than guessing.

Adding a new issue to the Project:
```bash
gh project item-add 1 --owner Vergo402 --url <issue-url>
```
Returns the item ID needed for subsequent `item-edit` calls.

---

## Anti-patterns

- **Don't re-investigate findings.** The skill composes from the Project + ledger; it doesn't re-audit.
- **Don't write the plan file before GATE 1** (plan-release mode). Hold in memory until GATE 1 approval.
- **Don't auto-archive on every invocation.** Only in Phase B7 after GATE 2.
- **Don't dispatch all 15 agents.** Auto-detect ≤ 5.
- **Don't fail silently on `/feedbackreview` errors.** Surface and offer to continue.
- **Don't trust a single version source.** Always reconcile all four; flag drift.
- **Don't fold non-canonical plans.** Respect canonical declarations.
- **Don't let agent recommendations recurse infinitely.** Cap at depth 1.
- **Don't duplicate Project state in CONSOLIDATED-STATUS.** Item-level details live in the Project; status doc is narrative only.
- **Don't ship a Mode-A bug fix without a preview UI driver flow.** Per `feedback_verification_standard`.
- **Don't leave Agent / Model / Effort / Assignee blank.** Set all four at scope-in (B5 or A5). Blank fields make the Project's filter-by-owner / filter-by-model views useless. If genuinely unknown, default to `fullstack-engineer` / `Sonnet 4.6` / `Medium` / `Vergo402` and revise in B6.
- **Don't leave Status as Todo once work begins.** Set to In Progress at scope-in (plan mode B5) or execution start (ship-bugs mode A3). Items sitting at Todo while being actively worked look stale on the board.

---

## Edge cases

- **Empty next-release scope** (plan mode) — walk Alex through advancing the pointer.
- **In-progress release** — ask supersede or new patch.
- **Conflicting canonical declarations** — surface; don't auto-resolve.
- **No GitHub access** — skip auto-issue-creation and Project sync; list manual followups.
- **Doc drift across version sources** — flag, don't block.
- **Same-session re-invoke** (plan mode) — Phase B7 archive is idempotent; if no plan changes, second run stops at B4.
- **Agent unavailable** — report, retry/skip/abort, don't abort phase.
- **Bug fix without a clear Project item** (ship mode) — file the issue first, add to Project, then plan.

---

## Notes

- Repo: `Vergo402/paratech-struts` (SSH, single repo).
- Project: `Vergo402` → #1, "FieldShore Roadmap". Linked to the repo for discoverability.
- 3-file split: `index.html`, `app.js`, `style.css` + `sw.js`.
- Version bumped in 3 places every release (CLAUDE.md).
- Work on feature branches, not directly on `main`.
- Alex is a firefighter, not a developer — explanations clear, jargon-free.
- Verification: drive the real preview UI per `feedback_verification_standard`.
- v4.0 reframe (2026-05-17): scope pulled back from federal/USAR to local Type IV-V. Federal scope deferred to v5.x.
- Plan template reference: `.claude/plans/v3.12.0-feedback-command-tab.md` (most complete recent example).
- Backfill script: `.claude/scripts/backfill-project.sh` (rerunnable; idempotent for already-added items).
