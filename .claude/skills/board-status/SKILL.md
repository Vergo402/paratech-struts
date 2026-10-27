---
name: board-status
description: "Update the fieldshore GitHub Project board: status field ids, moving cards, closing issues. Use when asked to update the board, move an issue, or close out work."
---

# Board status

When starting work on any GitHub issue (whether via `/plan-release`, `/plan-v4`, or ad-hoc), set its Project Status to **In Progress** using the correct board:

- **v3 board (project 1):** project-id `PVT_kwHODy7CN84BYNd6` · Status field-id `PVTSSF_lAHODy7CN84BYNd6zhTU44c` · options Todo `f75ad846` / In Progress `47fc9ee4` / Done `98236657`
- **v4 board (project 2):** project-id `PVT_kwHODy7CN84BYV37` · Status field-id `PVTSSF_lAHODy7CN84BYV37zhTcaGE` · options Todo `f75ad846` / In Progress `47fc9ee4` / Done `98236657` · item-lookup + edit commands for both boards: `.claude/plans/board-commands.md`

### Closing issues

- **v4 issues (`v4-redesign` branch):** Close manually with `gh issue close NUMBER --repo Vergo402/paratech-struts` as soon as the work is done. Do NOT rely on `Closes #N` in commit messages — that keyword only fires on merge to the default branch (`main`), and v4 merges to `main` only at the Phase J cutover (#267).
- **v3 issues (`main` branch):** `Closes #N` in the commit message works correctly on merge to main. Manual close is also fine.

The board Status updates to Done automatically when the issue closes.
