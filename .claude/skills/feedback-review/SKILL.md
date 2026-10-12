---
name: feedback-review
description: "Pull feedback from Firebase, create GitHub issues, clear transferred entries, and draft a fix plan. Use this skill whenever Alex says 'review feedback', 'feedback review', 'check feedback', 'triage feedback', or '/feedbackreview'. Branch-aware: v3 project + board on main, v4 project + board on v4-redesign."
---

# Feedback Review Pipeline

Pull feedback from Firebase, transfer each entry to a GitHub issue, delete transferred entries from Firebase, and draft a versioned fix plan.

> **Intake-only mode:** when invoked with the argument `intake-only` (`/plan-release` step B1 passes it), run Phases 1, 2, 3 and 5 and skip Phase 4 entirely — no plan file is written, and the Phase 5 report omits the "Plan saved to", "Target version" and "What's in the plan" lines.

---

## Branch selection (follow the branch)

The first step of Phase 1 is to read the current branch:

```bash
git branch --show-current
```

Set these variables from the result; every Firebase and board command below uses them:

| Branch | `$FB_PROJECT` | Board (`$BOARD`) | `$PROJECT_ID` | `$STATUS_FIELD` | `$TODO_OPT` |
|---|---|---|---|---|---|
| `main` (the `fieldshore-main/` worktree) | `paratech-c3ab4` | FieldShore Roadmap (`1`) | `PVT_kwHODy7CN84BYNd6` | `PVTSSF_lAHODy7CN84BYNd6zhTU44c` | `f75ad846` |
| `v4-redesign` | `fieldshore-database` | v4 Redesign Roadmap (`2`) | `PVT_kwHODy7CN84BYV37` | `PVTSSF_lAHODy7CN84BYV37zhTcaGE` | `f75ad846` |

```bash
# main
FB_PROJECT=paratech-c3ab4; BOARD=1; PROJECT_ID=PVT_kwHODy7CN84BYNd6
STATUS_FIELD=PVTSSF_lAHODy7CN84BYNd6zhTU44c; TODO_OPT=f75ad846
# v4-redesign
FB_PROJECT=fieldshore-database; BOARD=2; PROJECT_ID=PVT_kwHODy7CN84BYV37
STATUS_FIELD=PVTSSF_lAHODy7CN84BYV37zhTcaGE; TODO_OPT=f75ad846
PARENT=<number of the current Phase J parent issue on board #2 — ask Alex if unclear>
```

- On `v4-redesign`, v4 writes `/feedback` to the `fieldshore-database` project (`src/data/feedback/feedbackService.ts`), and every new issue is also added as a sub-issue of the current Phase J parent (`$PARENT`) — never left standalone (CLAUDE.md).
- On any other branch, stop and ask Alex which app's feedback queue to review.

---

## Phase 1: Pull Feedback

### Fetch from Firebase (authenticated)

```bash
firebase database:get /feedback --project $FB_PROJECT
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
# Create the issue and CAPTURE its URL (gh issue create prints the URL on success)
url=$(gh issue create --repo Vergo402/paratech-struts \
  --title "Bug: short summary" \
  --label "bug" \
  --body "$(cat <<'EOF'
**Source:** In-app feedback (v3.7.5, dept hfd217, 2026-05-16)

**Description:** The full feedback text here
EOF
)")
```

### Add every new issue to the roadmap board

Creating the issue is not enough — it must be logged on the branch's board (`$BOARD`: FieldShore Roadmap #1 on
`main`, v4 Redesign Roadmap #2 on `v4-redesign`) or it goes untracked.
For each issue created above, using the captured `$url`:

```bash
item=$(gh project item-add $BOARD --owner Vergo402 --url "$url" --format json | jq -r '.id')
if [ "$BOARD" = 1 ]; then   # Source field exists on board #1 (main) only
  gh project item-edit --id "$item" --project-id $PROJECT_ID \
    --field-id PVTSSF_lAHODy7CN84BYNd6zhTU5G0 --single-select-option-id a3d8760a   # Source = feedback
fi
gh project item-edit --id "$item" --project-id $PROJECT_ID \
  --field-id $STATUS_FIELD --single-select-option-id $TODO_OPT   # Status = Todo

# v4-redesign only: nest under the current Phase J parent (native sub-issue link — required by CLAUDE.md)
if [ "$BOARD" = 2 ]; then
  NEW=$(echo "$url" | grep -oE '[0-9]+$')
  PID=$(gh api graphql -f query='query($o:String!,$r:String!,$n:Int!){repository(owner:$o,name:$r){issue(number:$n){id}}}' -F o=Vergo402 -F r=paratech-struts -F n=$PARENT --jq '.data.repository.issue.id')
  CID=$(gh api graphql -f query='query($o:String!,$r:String!,$n:Int!){repository(owner:$o,name:$r){issue(number:$n){id}}}' -F o=Vergo402 -F r=paratech-struts -F n=$NEW --jq '.data.repository.issue.id')
  gh api graphql -f query='mutation($p:ID!,$c:ID!){addSubIssue(input:{issueId:$p, subIssueId:$c}){issue{number}}}' -F p=$PID -F c=$CID >/dev/null
fi
```

Set **Status = Todo** here; `/plan-release` flips it to In Progress at scope-in and Status → Done auto-syncs on
close. Component/Severity/Effort/**Release** are assigned later during `/plan-release` — and remember new Release
options (e.g. a new `vX.Y.Z`) are added via the **web UI only**, never the GraphQL field mutation (it
set-and-replaces the entire option list). See the `feedback_project_field_mutations` memory.

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
firebase database:update --force --project $FB_PROJECT /feedback \
  --data '{ "-entryKey1": null, "-entryKey2": null }'
```

Also delete any test entries that were filtered out in Phase 1.

Confirm to Alex: "Cleared X entries from Firebase feedback queue."

---

## Phase 4: Draft Fix Plan

> **Intake-only mode:** if the skill was invoked with `intake-only`, skip this phase entirely — write no plan file and go straight to Phase 5.

### Determine the version number

On `main` only — on `v4-redesign` there is no version bump: the plan targets `src/` and says so.

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
- [ ] Merge the feature branch to `main` (release process)
- [ ] Create GitHub release v{VERSION}
- [ ] Close resolved issues
```

### Making the plan useful

- **Name the functions** involved. Read `app.js` to find relevant code.
- **Give line number ranges** (these shift, so include function names too).
- **Separate quick fixes from larger work.** Bugs and small features go in the immediate release. Major features get deferred.

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
