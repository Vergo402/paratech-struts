---
name: design-docket
description: "Rapidly add an item to the v4 design docket (docs/v4-design/98-design-docket.md), or show the docket when invoked bare. Use whenever Alex says '/design-docket', 'add to the design docket', 'bring this to design', 'design item', 'put that on the design list', or describes a visual/layout/interaction concern he wants captured for a later design pass. v4-redesign branch only."
---

# Design Docket — rapid add

One job, done fast: capture a design item into `docs/v4-design/98-design-docket.md` in a single short turn. No plan mode, no ceremony. The docket is a **curation index, not a source of truth** — read its header once if unfamiliar.

## If invoked BARE (no item given)

Read `docs/v4-design/98-design-docket.md` and show Alex a compact summary: per-section counts + the open (unstruck) rows, one line each. Do not commit anything. Done.

## If an item was given (args or the surrounding message)

1. **Branch guard.** `git branch --show-current` must be `v4-redesign`. If not, stop and say so — never add from another branch.

2. **Tighten the item to one line.** Keep Alex's meaning and vocabulary; trim filler. Do NOT redesign or expand it — capture, don't solve.

3. **Pick the section** (default, don't interrogate):
   - cards / badges / recommendation or shore-point card visuals → **Riding S12**
   - desktop / breakpoints / laptop-tablet layout → **Riding S11**
   - measurement entry / keypad → **Riding S10**
   - a named Phase I screen (Cutting Station, Command/SitStat, Inventory, Accountability, Quick Find results) → **Phase I design items**
   - anything else, or genuinely unclear → **Unscheduled / watch**
   If a riding session (S10/S11/S12) has already landed, its items go to **Phase I design items** instead.

4. **Canonical home.**
   - If it's a **gate-drive observation** (something Alex saw using the app): post a one-paragraph comment on [#248](https://github.com/Vergo402/paratech-struts/issues/248) (`gh issue comment 248 --repo Vergo402/paratech-struts`) and cite `#248 (YYYY-MM-DD)` as the home.
   - Otherwise: home = `ad hoc (Alex, YYYY-MM-DD)` — the docket header says ad-hoc rows are promoted to `99-open-questions.md` or #248 when first worked. Do NOT edit `99-open-questions.md` from this skill.

5. **Append the row** to that section's table: `| <item> | <canonical home> | YYYY-MM-DD |`.

6. **Commit + push** (push-on-commit standing rule), touching ONLY the docket (pathspec add — never `git add -A`):
   ```bash
   git add docs/v4-design/98-design-docket.md
   git commit -m "[#248] docket: <six-word item summary>"
   git push origin v4-redesign
   ```
   (If #248 is closed by the time this runs, use the then-active v4 epic from `00-INDEX.md` in the prefix.)

7. **Confirm in one line:** the row as written + which section it landed in. Nothing else.

## Never

- Never resolve, redesign, or scope the item here — that happens in its design pass.
- Never touch v3 root files, `99-open-questions.md`, or any other doc from this skill.
- Never ask clarifying questions unless the item is unintelligible — default to **Unscheduled / watch** and move on.
