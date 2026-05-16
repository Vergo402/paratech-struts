---
name: feedbackreview
description: "Pull feedback from Firebase, create GitHub issues, clear transferred entries, and draft a fix plan. Use this skill whenever Alex says 'review feedback', 'feedback review', 'check feedback', 'triage feedback', or '/feedbackreview'."
---

# Feedback Review Pipeline

Pull feedback from Firebase, transfer each entry to a GitHub issue, delete transferred entries from Firebase, and draft a versioned fix plan.

---

## Phase 1: Pull Feedback

### Fetch from Firebase (authenticated)

```bash
firebase database:get /feedback --project paratech-c3ab4
```

The REST endpoint requires auth — always use the Firebase CLI (logged in locally).

Each entry has: `category` (bug/feature), `text`, `appVersion`, `deptId`, `timestamp`.

### Handle empty queue

If the result is `null` or empty, report "No new feedback" and stop.

### Present summary

Show Alex a table of what's in the queue:

```
## Feedback Queue (X items)

### Bugs (X)
| # | Date | Version | Dept | Description |
|---|------|---------|------|-------------|
| 1 | 2026-05-16 | v3.7.5 | hfd217 | Short description... |

### Feature Requests (X)
| # | Date | Version | Dept | Description |
|---|------|---------|------|-------------|
...
```

Convert timestamps to YYYY-MM-DD. Filter out obvious test entries (e.g. "test feedback", dept "test353").

---

## Phase 2: Create GitHub Issues

For each feedback entry, create a GitHub issue.

**Label:** `bug` for bugs, `enhancement` for features.

**Title format:** Under 70 characters. Prefix with `Bug:` or `Feature:`.

**Body format:**
```
**Source:** In-app feedback (v{appVersion}, dept {deptId}, {date})

**Description:** {text}
```

```bash
gh issue create --repo Vergo402/paratech-struts \
  --title "Bug: short summary" \
  --label "bug" \
  --body "$(cat <<'EOF'
**Source:** In-app feedback (v3.7.5, dept hfd217, 2026-05-16)

**Description:** The full feedback text here
EOF
)"
```

After creating issues, show what was created:

```
### Issues Created
| Issue | Title | Label |
|-------|-------|-------|
| #64 | Bug: Inventory not updating on shore point creation | bug |
| #65 | Feature: Individual wood cut tracking | enhancement |
```

---

## Phase 3: Clear Transferred Feedback

Delete all transferred entries from Firebase in a single batch update. Keep any entries that failed to create as issues.

```bash
firebase database:update --force --project paratech-c3ab4 /feedback \
  --data '{ "-entryKey1": null, "-entryKey2": null }'
```

Also delete any test entries that were filtered out in Phase 1.

Confirm to Alex: "Cleared X entries from Firebase feedback queue."

---

## Phase 4: Draft Fix Plan

### Determine the version number

- Read the current version from `sw.js` (the `CACHE_NAME` line)
- **PATCH** bump (x.x.+1) if all items are bug fixes
- **MINOR** bump (x.+1.0) if there are new features

### Plan structure

Save the plan to `.claude/plans/` with a descriptive filename:

```markdown
# Plan: v{VERSION} — {Short Theme}

## Context
{1-2 sentences — how many items, what triggered this.}

---

## Feedback Triage

### Bugs for this release
{List each bug with symptom, investigation steps, and fix approach}

### Features for this release
{List each feature with description and implementation approach}

### Deferred
{Items too large for this release — note why and which future version}

---

## Implementation

### Bug/Feature 1: {title}
**Issue:** #{number}
**Symptom:** {what the user sees}
**Investigate:** {where to look — name functions, file, line ranges}
**Fix:** {proposed approach}

### Bug/Feature 2: {title}
...

---

## Files to Modify

| File | Changes |
|------|---------|
| `app.js` | {specific changes} |
| `sw.js` | Cache name bump to v{VERSION} |

---

## Release Checklist
- [ ] Version bump in 3 places (index.html header, app.js appVersion, sw.js cache name)
- [ ] Test each fix
- [ ] Push to main
- [ ] Create GitHub release v{VERSION}
- [ ] Close resolved issues
```

### Making the plan useful

- **Name the functions** involved. Read `app.js` to find relevant code.
- **Give line number ranges** (these shift, so include function names too).
- **Separate quick fixes from larger work.** Bugs and small features go in the immediate release. Major features get deferred.
- **Consider dependencies** between items.

### Severity-based ordering

1. Bugs that cause data loss or incorrect behavior
2. Bugs that affect usability
3. Small features that improve existing workflows
4. Large features that add new capabilities

---

## Phase 5: Report

```
## Feedback Review Complete

- **Feedback entries processed:** X
- **Issues created:** Y
- **Test entries discarded:** Z
- **Firebase queue cleared:** Yes
- **Plan saved to:** .claude/plans/{filename}.md
- **Target version:** v{VERSION}

### What's in the plan:
- {X bugs to fix}
- {Y features to add}
- {Z items deferred}

Ready to start working on the plan? Just say "go."
```

---

## Notes

- Repo: `Vergo402/paratech-struts` (SSH)
- 3-file split: `index.html`, `app.js`, `style.css`
- Version bumped in 3 places every release (see CLAUDE.md)
- Work on feature branches, not directly on `main`
