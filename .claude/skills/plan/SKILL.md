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
cat "/Users/alex/Library/CloudStorage/OneDrive-Personal/Claude OS/CLAUDE.md"
cat /Users/alex/.claude/projects/-Users-alex-Library-CloudStorage-OneDrive-Personal-Claude-OS-Field-Shore/memory/MEMORY.md
ls /Users/alex/.claude/projects/-Users-alex-Library-CloudStorage-OneDrive-Personal-Claude-OS-Field-Shore/memory/
```

Extract for the rest of the session:
- **Release checklist** (CLAUDE.md) — 3-place version bump, user manual rule for MINOR/MAJOR
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
gh project item-list 1 --owner Vergo402 --limit 200 --format json | \
  jq '.items[] | select(.["status"] != "Done")'
```

For ship-bugs mode, filter further:
- `Source` in {bug, feedback}
- `Release` = "Backlog" OR matches next-release pointer

For plan-release mode, include everything not Done.

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

### P2: ...

## Files to modify
| File | Changes |
|---|---|
| `app.js` | … |
| `sw.js` | CACHE_NAME → v{VERSION} |
| `index.html` | version label → v{VERSION} |

## Release checklist
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

For each in-scope item:
```bash
gh project item-edit --id <item-id> --project-id PVT_kwHODy7CN84BYNd6 \
  --field-id PVTSSF_lAHODy7CN84BYNd6zhTU5j0 \
  --single-select-option-id <release-option-id-for-vX.Y.Z>
```

Status auto-syncs to Done when issue closes (Project default rule).

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

#### B1. Run `/feedbackreview` (with recency soft-gate)

Find the most recent feedback-themed plan file:

```bash
ls -t .claude/plans/v*-feedback*.md 2>/dev/null | head -1
ls -t .claude/plans/archive/v*-feedback*.md 2>/dev/null | head -1
stat -f "%m" .claude/plans/v3.12.0-feedback-command-tab.md
```

- < 60 min ago → skip by default
- 1–24h → ask
- > 24h or never → run by default

Invoke `/feedbackreview` via the Skill tool. Capture: new issues created, plan filename, theme summary. The skill also pushes new items to the Project.

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

```
## Proposed Scope — v{X.Y.Z}

**Bump:** {PATCH/MINOR/MAJOR} — {reasoning}

### In scope (N items)
| # | Source | Item | Why now |
|---|---|---|---|

### Deferred (M items → v{X.Y+1.0})

### File impact
- `app.js` — {…}

### Agents to dispatch (auto-detected)
- `devops-resilience`, `mobile-ux`, `qa-driver`, `release-manager`, …

Approve, redirect, or cancel?
```

**GATE 1: no `.claude/plans/` files written yet.** If redirected, loop back to B2.

#### B5. Draft plan file

Once GATE 1 approved:

For any in-scope item lacking a GitHub issue (e.g., audit findings still in the ledger):

```bash
gh issue create --repo Vergo402/paratech-struts \
  --title "{title}" --label "{label}" --body "..."
```

Add to the Project, set `Release = v{VERSION}` + `Status = Todo` + `Severity` + `Component` + `Source = audit` (or whichever applies).

Save plan to `.claude/plans/v{VERSION}-{theme}.md` (theme is 2-3 word kebab-case slug).

Plan structure: same as Mode A, plus sections for `## Feedback triage`, `## Audit items addressed`, `## Verification plan` (preview UI driver flows for each item), `## Agent review` (placeholder for Phase B6).

#### B6. Agent dispatch → **GATE 2**

Per `feedback_agent_gate` memory: **every MINOR/MAJOR runs code-auditor + battalion-chief + mobile-ux BEFORE implementation**. PATCH gets code-auditor only (but we're in plan-release mode, so this is MINOR/MAJOR).

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
| User manual updates | `manual-writer` |

**Always include** `release-manager` and `qa-driver`. Cap typically ≤ 5 agents total.

Dispatch in parallel — single message with multiple `Agent` tool calls. Each agent receives: plan path, scope (1-2 sentences), asked to return APPROVE / CONCERNS / BLOCK + top concern + detailed findings.

Recursion cap: depth 1. An agent may suggest one more agent; that agent may not suggest a third.

Modify the plan file in place to address BLOCK findings (mandatory) and CONCERNS (resolve or document explicit deferral). Fill in the "Agent review" section with the final verdict table.

If an agent errors: report, offer retry/skip/abort, don't abort the whole phase.

If an agent suggests a new persona: surface with 1-line rationale, draft only on explicit approval, save to `.claude/agents/{name}.md`.

Present hybrid summary + final plan → **GATE 2**.

#### B7. Finalize

Order matters (each step independently reversible until the next runs):

1. **Archive superseded plans** — `mv .claude/plans/v{X.Y.Z}-*.md .claude/plans/archive/` (except the new one). Idempotent.

2. **Project field-fill** — for each in-scope item:
   ```bash
   gh project item-edit --id <item-id> --project-id PVT_kwHODy7CN84BYNd6 \
     --field-id <release-field-id> \
     --single-select-option-id <release-option-id-for-vX.Y.Z>
   ```
   Status stays Todo until execution; Release = v{VERSION} marks it scoped.

3. **CONSOLIDATED-STATUS narrative update** — append a per-release narrative paragraph. No item bullets (Project owns those).

4. **Report**:
   ```
   ## Planning Complete — v{VERSION}

   Plan: .claude/plans/v{VERSION}-{theme}.md
   In scope: {N} items (see Project filter: Release=v{VERSION})
   Agents: {N} approve, {M} concerns, {K} block
   New agents drafted: {0 or list}

   Next: run /plan in ship mode to execute (or `git checkout -b feature/v{VERSION}-{theme}`).
   ```

---

## Project field reference

When editing Project items via `gh project item-edit`, you need the field IDs:

| Field | Field ID | Type |
|---|---|---|
| Status | `PVTSSF_lAHODy7CN84BYNd6zhTU44c` | single-select (Todo/In Progress/Done — auto-syncs) |
| Release | `PVTSSF_lAHODy7CN84BYNd6zhTU5j0` | single-select |
| Source | `PVTSSF_lAHODy7CN84BYNd6zhTU5G0` | single-select |
| Severity | `PVTSSF_lAHODy7CN84BYNd6zhTU5G8` | single-select |
| Component | `PVTSSF_lAHODy7CN84BYNd6zhTU5IU` | single-select |

Project ID: `PVT_kwHODy7CN84BYNd6` (number 1, owner Vergo402).

Option IDs are listed in `.claude/scripts/backfill-project.sh` (or query via `gh project field-list 1 --owner Vergo402 --format json`).

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
