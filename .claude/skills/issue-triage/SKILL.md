---
name: issue-triage
description: "Review open GitHub issues, triage bugs vs enhancements, and execute a phased fix-and-release cycle. Bugs get patched first with a PATCH release, then enhancements get planned for a MINOR release and presented to Alex for review. Use this skill whenever Alex says 'triage issues', 'fix the bugs', 'work through the issues', 'patch the bugs', 'start on issues', 'what issues are open', '/issue-triage', or wants to systematically work through the GitHub issue backlog."
---

# Issue Triage & Fix Cycle

This skill runs a two-phase development cycle: patch bugs first, then plan enhancements. It's designed to be the "what do I work on next?" answer — pull open issues, prioritize, fix, release, repeat.

---

## Phase 1: Pull & Triage Open Issues

### Fetch all open issues

```bash
gh issue list --repo Vergo402/paratech-struts --state open --limit 100 --json number,title,body,labels,createdAt
```

### Categorize

Split issues into two buckets based on labels:
- **Bugs** — label `bug`
- **Enhancements** — label `enhancement`

### Prioritize bugs by severity

Read each bug's description and assign a priority:

1. **P1 — Data/Algorithm** — Wrong results, data loss, broken core features (strut finder, inventory, Firebase sync). These affect safety — a wrong strut recommendation on a rescue scene is dangerous.
2. **P2 — Workflow Blockers** — Features that exist but don't work (buttons that do nothing, views that don't render, forms that can't submit).
3. **P3 — UX/Polish** — Sorting order, label text, cosmetic issues. App works but is annoying or confusing.

### Present the triage to Alex

Show a summary table before doing any work:

```
## Open Issues Triage

### Bugs (X open) — Patch Release v{PATCH}
| Priority | Issue | Title |
|----------|-------|-------|
| P1 | #16 | Extension rules wrong for grey and gold struts |
| P2 | #11 | Cannot open layout cards under Command tab |
| P3 | #14 | Quick Add plates not sorted alphabetically |

### Enhancements (X open) — Minor Release v{MINOR}
| Issue | Title |
|-------|-------|
| #18 | Pending card when no equipment available |
| #22 | ICS/NIMS hierarchy chart |

Plan: Fix all P1/P2/P3 bugs → release v{PATCH} → then draft enhancement plans for your review.
```

Wait for Alex to confirm the triage looks right before proceeding. He may want to re-prioritize, defer some bugs, or promote an enhancement to the bug batch.

---

## Phase 2: Draft Bug Patch Plan

Once Alex confirms the triage, draft a plan for the PATCH release.

### Determine version

Read the current version from `sw.js` (`CACHE_NAME` line). Bump the PATCH number (e.g., 1.9.0 → 1.9.1).

### Investigate each bug

For every bug in the patch, read `index.html` and find the relevant code. The plan needs to be specific enough that a future session (or this one) can execute it without re-investigating. For each bug:

- **Name the function(s)** involved
- **Quote the problematic line(s)** or describe the logic error
- **Describe the fix** concretely — not "fix the sorting" but "sort `BASE_PLATES` by `name` using `localeCompare` before the render loop at line ~2461"
- **Note any ripple effects** — will fixing this break something else? Are there multiple render paths that need the same fix?

### Plan format

Save to `.claude/plans/` with the naming pattern `v{VERSION}-bug-patch.md`:

```markdown
# Plan: v{VERSION} — Bug Patch

## Context
{X} open bugs triaged from GitHub issues. Fixing in priority order.

---

## Bugs (Priority Order)

### P1: {Title}
**Issue:** #{number}
**Symptom:** {what the user sees}
**Root Cause:** {what's wrong in the code — function name, line, logic error}
**Fix:** {exactly what to change}
**Test:** {how to verify it's fixed}

### P2: {Title}
...

---

## Files to Modify
| File | Changes |
|------|---------|
| `index.html` | {specific changes per bug} |
| `sw.js` | Cache name bump to v{VERSION} |

## Release Checklist
- [ ] Version bump in 3 places
- [ ] Each bug fix verified
- [ ] No regressions
- [ ] Push to main
- [ ] Create GitHub release v{VERSION}
- [ ] Close resolved issues
```

### Present the plan and get approval

Show Alex the plan and ask if he wants to proceed. He may want to adjust scope, skip a bug, or add something.

---

## Phase 3: Execute Bug Fixes

Once Alex approves the plan, fix the bugs in priority order.

### Work on a feature branch

```bash
git checkout -b bugfix/v{VERSION}
```

### Fix each bug

Work through the plan top to bottom. After each fix:
- Briefly confirm what was changed
- Note if the fix was different from what was planned (and why)

### Version bump

Update version in all 3 places:
1. `index.html` header label: `<div ...>v{VERSION}</div>` (search for the version div around line ~966)
2. `index.html` feedback appVersion: `appVersion: '{VERSION}'` (search for `appVersion`)
3. `sw.js` cache name: `const CACHE_NAME = 'paratech-struts-v{VERSION}';`

### Commit, merge, release

```bash
git add index.html sw.js
git commit -m "v{VERSION} — Bug fixes

{one-line summary per bug fixed}

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

git checkout main
git merge bugfix/v{VERSION}
git push origin main
```

Create the GitHub release:
```bash
gh release create v{VERSION} --title "v{VERSION}" --notes "{release notes with bug list}"
```

Close each fixed issue:
```bash
gh issue close {number} --repo Vergo402/paratech-struts
```

### Report results

```
## Patch Released: v{VERSION}

### Bugs Fixed
| Issue | Title | Status |
|-------|-------|--------|
| #16 | Extension rules wrong | Fixed & closed |
| #11 | Command cards not clickable | Fixed & closed |

### Release
- Version: v{VERSION}
- Commit: {hash}
- Live at: https://vergo402.github.io/paratech-struts/
```

---

## Phase 4: Draft Enhancement Plans

After the bug patch is released, shift to enhancements. These get a MINOR version bump (e.g., 1.9.0 → 1.10.0 or 2.0.0 depending on scope).

### Group enhancements by theme

Related enhancements should be grouped into coherent releases rather than tackled individually. Common themes:
- **External Equipment** — editable after done, Quick Add menu, dept-or-apparatus
- **Roles & Personnel** — individual roles, Runner role, ICS hierarchy chart
- **Navigation & UI** — drill-down stops at Area, team on card
- **Operations** — pending equipment cards, notifications

### For each group, draft a plan

Each enhancement plan should include:
- **What changes** from the user's perspective
- **How it works** in the code — which functions, what new data structures, any Firebase schema changes
- **Scope estimate** — small (< 1 hour), medium (1-3 hours), large (3+ hours)
- **Dependencies** — does this need another enhancement first?
- **Mockup/description** of the UI change if it's visual

### Present ALL enhancement plans to Alex for review

Do NOT start implementing enhancements. Present the grouped plans and let Alex decide:
- Which groups to tackle first
- Which to defer or skip entirely
- Whether the grouping makes sense
- Whether any enhancements should be split or combined differently

Format:

```
## Enhancement Plans for Review

### Group A: External Equipment Improvements (3 issues)
**Issues:** #13, #20, #21
**Scope:** Medium (~2 hours)
**Summary:** {what changes}
**Plan:** {implementation approach}

### Group B: Roles & Personnel (4 issues)
**Issues:** #19, #22, #25, #26
**Scope:** Large (~4 hours)
**Summary:** {what changes}
**Plan:** {implementation approach}

Which group(s) do you want to tackle first? Or should I adjust any of these plans?
```

Wait for Alex's decision before writing a formal plan file or starting any implementation.

---

## Notes

- The repo is `Vergo402/paratech-struts` (SSH, already configured)
- Everything lives in `index.html` (~360KB single file) — no build step
- Version must be updated in 3 places on every release (see CLAUDE.md)
- Work on feature branches, not directly on `main`
- Alex is a firefighter, not a developer — keep explanations clear and jargon-free
- Bug #16 (extension rules) is safety-critical — wrong strut recommendations on a rescue scene are dangerous. Always prioritize correctness of the strut selection algorithm.
- When closing issues, verify the fix actually addresses the reported symptom, not just related code
- The app is a PWA — after pushing to main, the service worker update means users need to refresh twice (or close and reopen) to get the new version. Mention this in release notes.
