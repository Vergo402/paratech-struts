# Board Commands

Moved from CLAUDE.md 2026-10-12. Set a GitHub issue's Project Status to In Progress on the board that matches the branch (ids and option ids are inline in CLAUDE.md "GitHub Project — Status Tracking").

```bash
# v3 issue (project 1)
gh project item-list 1 --owner Vergo402 --limit 200 --format json \
  | jq -r '.items[] | select(.content.number == ISSUE_NUMBER) | .id'
gh project item-edit --id <item-id> --project-id PVT_kwHODy7CN84BYNd6 \
  --field-id PVTSSF_lAHODy7CN84BYNd6zhTU44c \
  --single-select-option-id 47fc9ee4

# v4 issue (project 2)
gh project item-list 2 --owner Vergo402 --limit 400 --format json \
  | jq -r '.items[] | select(.content.number == ISSUE_NUMBER) | .id'
gh project item-edit --id <item-id> --project-id PVT_kwHODy7CN84BYV37 \
  --field-id PVTSSF_lAHODy7CN84BYV37zhTcaGE \
  --single-select-option-id 47fc9ee4
```
