---
name: feedbackreview
description: "Review the Paratech Struts Firebase feedback database, create GitHub issues for new items, and draft a plan to fix them. Use this skill whenever Alex says 'review feedback', 'feedback review', 'check feedback and plan fixes', 'what's new in feedback', 'triage feedback', or '/feedbackreview'. This is the full feedback pipeline — from Firebase to GitHub issues to a fix plan."
---

# Feedback Review Pipeline

This skill runs the full feedback-to-plan pipeline for the Paratech Strut Selector app:

1. **Pull** all feedback from Firebase
2. **Triage** entries by category and severity
3. **Sync** new items to GitHub issues (skip duplicates)
4. **Draft** a versioned plan to address the issues

The goal is to turn raw user feedback into an actionable development plan in one pass. Alex is a firefighter who built this app for his department — keep everything clear and non-jargony.

---

## Phase 1: Pull & Triage Feedback

### Fetch from Firebase

```bash
curl -s "https://paratech-c3ab4-default-rtdb.firebaseio.com/feedback.json"
```

Each entry has: `category` (bug/feature), `text`, `appVersion`, `deptId`, `deptName`, `timestamp`.

### Fetch existing GitHub issues

```bash
gh issue list --repo Vergo402/paratech-struts --state all --limit 200 --json number,title,body,state,labels
```

### Triage

Present Alex a summary table of ALL feedback entries, organized by category:

```
## Feedback Summary

### Bugs (X items)
| # | Date | Version | Dept | Description | GitHub Issue |
|---|------|---------|------|-------------|--------------|
| 1 | 2026-05-10 | v1.8.0 | hfd217 | Short description... | #12 or NEW |

### Feature Requests (X items)
| # | Date | Version | Dept | Description | GitHub Issue |
|---|------|---------|------|-------------|--------------|
...
```

For the "GitHub Issue" column:
- If the feedback text already appears in an existing issue body, show the issue number (e.g., `#7`)
- If it's new, show `NEW`

A feedback entry is a **duplicate** if any existing issue body contains the exact feedback `text` field.

---

## Phase 2: Create GitHub Issues

For each NEW (non-duplicate) feedback entry, create a GitHub issue.

**Label:** `bug` for bugs, `enhancement` for features.

**Title format:** Under 70 characters. Prefix with `Bug:` or `Feature:`.

**Body format:**
```
**Source:** In-app feedback (v{appVersion}, dept {deptId}, {date})

**Description:** {text}
```

Convert the timestamp to YYYY-MM-DD for the date.

```bash
gh issue create --repo Vergo402/paratech-struts \
  --title "Bug: short summary" \
  --label "bug" \
  --body "**Source:** In-app feedback (v1.8.0, dept hfd217, 2026-05-10)

**Description:** The full feedback text here"
```

After creating issues, show Alex what was created:

```
### Issues Created
| Issue | Title | Label |
|-------|-------|-------|
| #13 | Bug: Shore point collapses on entry | bug |
| #14 | Feature: Add runner role | enhancement |

### Duplicates Skipped: X
```

**Important:** Ask Alex for confirmation before creating the issues. Show the list of what you plan to create and wait for a "yes" before running the `gh issue create` commands.

---

## Phase 3: Draft Fix Plan

After issues are synced, draft a plan to address them. This follows the project's plan format (see `.claude/plans/` for examples).

### Determine the version number

- Read the current version from `sw.js` (the `CACHE_NAME` line)
- **PATCH** bump (x.x.+1) if all items are bug fixes
- **MINOR** bump (x.+1.0) if there are new features
- Use the next appropriate version number for the plan

### Plan structure

Save the plan to `.claude/plans/` with a descriptive filename. Use this template:

```markdown
# Plan: v{VERSION} — {Short Theme}

## Context
{1-2 sentences on what triggered this — e.g., "X new feedback items from Firebase, covering Y bugs and Z feature requests."}

---

## Feedback Triage

### Bugs for this release
{List each bug with symptom, investigation steps, and fix approach}

### Features for this release
{List each feature with description and implementation approach}

### Deferred
{Any items that are too large or complex for this release — note why and suggest which future version}

---

## Implementation

### Bug/Feature 1: {title}
**Issue:** #{number}
**Symptom:** {what the user sees}
**Investigate:** {where to look in the code — be specific about functions/line ranges}
**Fix:** {proposed approach}

### Bug/Feature 2: {title}
...

---

## Files to Modify

| File | Changes |
|------|---------|
| `index.html` | {specific changes} |
| `sw.js` | Cache name bump to v{VERSION} |

---

## Release Checklist
- [ ] Version bump in 3 places (index.html header, index.html feedback appVersion, sw.js cache name)
- [ ] Test each fix
- [ ] Push to main
- [ ] Create GitHub release v{VERSION}
- [ ] Close resolved issues
```

### Making the plan useful

The plan needs to be specific enough that a future Claude session can pick it up and execute. That means:

- **Name the functions** involved in each bug/feature. Read `index.html` to find relevant code — search for keywords from the feedback text.
- **Give line number ranges** where the fix likely lives (these shift between versions, so give function names too).
- **Separate quick fixes from larger work.** Bugs and small features go in the immediate release. Major features (redesigns, new systems) get deferred with a note about scope.
- **Consider dependencies** between items. If Feature A requires Bug B to be fixed first, note that.

### Severity-based ordering

Address items in this priority order:
1. Bugs that cause data loss or incorrect behavior
2. Bugs that affect usability
3. Small features that improve existing workflows
4. Large features that add new capabilities

---

## Phase 4: Report to Alex

Finish with a clean summary:

```
## Feedback Review Complete

- **Feedback entries reviewed:** X
- **New issues created:** Y
- **Duplicates skipped:** Z
- **Plan saved to:** .claude/plans/{filename}.md
- **Target version:** v{VERSION}

### What's in the plan:
- {X bugs to fix}
- {Y features to add}
- {Z items deferred}

Ready to start working on the plan? Just say "go" or "start the plan."
```

---

## Notes

- The repo is `Vergo402/paratech-struts` — use SSH, already configured
- The app is a single-file PWA: everything lives in `index.html`
- Version must be updated in 3 places on every release (see CLAUDE.md)
- Work on a feature branch, not directly on `main`, unless Alex says otherwise
- `docs/feedback.sh` in the docs folder is a standalone script that does the Firebase pull — you can use it for reference but this skill does its own fetch with more processing
