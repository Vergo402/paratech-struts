---
name: design-idea
description: "Capture a design-exploration idea straight onto the v4 GitHub board as a tracked issue (nested under epic #383, Todo), and cross-index it in the design docket. Use whenever Alex says '/design-idea', '📌 idea:', 'capture this idea', 'design idea:', or flags a surface/layout/interaction he wants mocked up in Claude Design later. The board is the source of truth — never just a local note. v4-redesign branch only."
---

# Design Idea — capture straight to the board

One job, fast: turn a design idea into a **tracked GitHub issue on the v4 board** the instant Alex flags it, so it can never be lost in a local file. Each idea becomes a child of epic **#383 `[Design] Exploration backlog`**, parked in **Todo**, ready for `/ship-design-ideas` to send to Claude Design.

**Branch guard:** run `git branch --show-current`; if it is not `v4-redesign`, stop and say so. This skill only operates on the v4 board (Project #2).

## If invoked BARE (no idea text)

Show the open queue, don't create anything:
```bash
gh issue list --repo Vergo402/paratech-struts --label design-idea --state open \
  --json number,title --jq '.[] | "#\(.number)  \(.title)"'
```
Print them under "Open design ideas (unshipped close on resolve)" + the count. Done.

## With idea text — capture it

### 1. Shape the idea (keep Alex's wording; don't redesign it)
From the text + current context derive:
- **Title** — `[Design] <concise imperative>`, < 70 chars, Alex's vocabulary, filler trimmed.
- **What** — the change, one line.
- **Where** — the component/screen (infer from the file we're in or the text; e.g. `operations/CuttingStation`, `Quick Find`). If genuinely unknowable, write `Where: (unscoped)` — do NOT interrogate for a fast capture.
- **Why** — the rationale / what's wrong now (field-use reason if he gave one).

Only ask a clarifying question if you cannot tell **what he means at all** — never to formalize a clear one-liner.

### 2. Create the issue → board → Todo → nest under #383

Verified IDs (Project #2): node `PVT_kwHODy7CN84BYV37`, Status field `PVTSSF_lAHODy7CN84BYV37zhTcaGE`, Status options `Todo=f75ad846`, `In Progress=47fc9ee4`, `Done=98236657`. Epic parent = **#383**.

```bash
# (a) create — body is What/Where/Why + the parent line
URL=$(gh issue create --repo Vergo402/paratech-struts \
  --title "[Design] <title>" \
  --label v4 --label design-idea \
  --body "$(cat <<'EOF'
**What:** <the change>
**Where:** <component/screen>
**Why:** <rationale / what's wrong now>

_Captured via /design-idea for Claude Design exploration._

Sub-issue of #383 ([Design] Exploration backlog).
EOF
)")
NEW=$(echo "$URL" | grep -oE '[0-9]+$')

# (b) add to board #2, get the item id
gh project item-add 2 --owner Vergo402 --url "$URL" >/dev/null
ITEM=$(gh project item-list 2 --owner Vergo402 --limit 400 --format json \
  | jq -r --argjson n "$NEW" '.items[] | select(.content.number == $n) | .id')

# (c) Status = Todo (parked — it's a captured idea, not active work)
gh project item-edit --id "$ITEM" --project-id PVT_kwHODy7CN84BYV37 \
  --field-id PVTSSF_lAHODy7CN84BYV37zhTcaGE --single-select-option-id f75ad846 >/dev/null

# (d) nest under epic #383 (native sub-issue link — required by CLAUDE.md)
PID=$(gh api graphql -f query='query($o:String!,$r:String!,$n:Int!){repository(owner:$o,name:$r){issue(number:$n){id}}}' -F o=Vergo402 -F r=paratech-struts -F n=383 --jq '.data.repository.issue.id')
CID=$(gh api graphql -f query='query($o:String!,$r:String!,$n:Int!){repository(owner:$o,name:$r){issue(number:$n){id}}}' -F o=Vergo402 -F r=paratech-struts -F n=$NEW --jq '.data.repository.issue.id')
gh api graphql -f query='mutation($p:ID!,$c:ID!){addSubIssue(input:{issueId:$p, subIssueId:$c}){issue{number}}}' -F p=$PID -F c=$CID >/dev/null
```

### 3. Cross-index in the design docket
Add one row to the **`Phase I design items`** table in `docs/v4-design/98-design-docket.md`, matching the docket's exact format — canonical home is the new issue:
```
| <item, Alex's one line> | #<NEW> | YYYY-MM-DD |
```
(Use the section's existing column shape; the canonical-home column gets `#<NEW>`.) Then commit ONLY the docket via pathspec (push-on-commit rule):
```bash
git add docs/v4-design/98-design-docket.md
git commit -m "[#383] docket: capture <six-word summary>"
git push origin v4-redesign
```

### 4. Confirm
One line: `📌 #<NEW> "[Design] <title>" — on the board (Todo), under #383, docketed. <URL>`

## Notes
- **Board is the ledger** — the issue exists before anything else; if any later step fails, the idea is already tracked.
- **Closing:** v4 issues do NOT auto-close from commits — when an idea is resolved, close it manually (`gh issue close <N> --repo Vergo402/paratech-struts`); the board flips to Done and it drops off the next `/ship-design-ideas`.
- Never `gh api graphql ... updateProjectV2Field` to change board options (set-and-replace wipes the list — CLAUDE.md).
