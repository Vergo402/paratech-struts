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
   - cards / badges / shore-point or recommendation card visuals, desktop / breakpoints / laptop-tablet layout, measurement entry / keypad, or a named Phase I screen (Cutting Station, Command/SitStat, Inventory, Accountability, Quick Find results) → **Phase I design items**
   - cosmetic / visual-only nit explicitly deferred — phrasing like "polish", "post-build", "after the build", "defer", "cosmetic" → **Post-build polish**
   - anything else, or genuinely unclear → **Unscheduled / watch**

4. **Canonical home.**
   - If it's a **gate-drive observation** (something Alex saw using the app): capture it through the `design-idea` skill first — it files a tracked issue under epic #383 on the v4 board — then home = that issue (`#NNN`). Never comment on #248 (the Phase H gate, closed 2026-06-15).
   - If it landed in **Post-build polish**: home = `#341` (the polish epic) — not ad hoc.
   - Otherwise: home = `ad hoc (Alex, YYYY-MM-DD)` — the docket header says ad-hoc rows are promoted to `99-open-questions.md` or a board issue when first worked. Do NOT edit `99-open-questions.md` from this skill.

5. **Append the row** to that section's table: `| <item> | <canonical home> | YYYY-MM-DD |`.

6. **Commit + push** (push-on-commit standing rule), touching ONLY the docket (pathspec add — never `git add -A`):
   ```bash
   git add docs/v4-design/98-design-docket.md
   git commit -m "[#NNN] docket: <six-word item summary>"
   git push origin v4-redesign
   ```
   (Prefix with the item's home issue: the design-idea issue for a gate-drive add, `#341` for Post-build polish, otherwise the then-active v4 epic from `00-INDEX.md`.)

7. **Confirm + show running list:**
   - First line: the row as written + which section it landed in.
   - Then: a table of **all items in the docket** (including ad hoc, struck rows hidden) organized by section, with columns `| Section | Version | Issue # | Item | Status | Deferred To |`. 
     - Extract the issue number from each canonical home.
     - Version is always **v4**.
     - **Status:** Infer from the docket or audit context: `✅ Done` (struck items), `🔄 In Progress` (explicitly marked), `📋 Pending` (queued within Phase I), `⏳ Deferred` (pushed beyond Phase I), `❓ Decision Awaiting` (ADR owed).
     - **Deferred To:** Show the target phase/epic. If "Pending" (Phase I queue), show "Phase I queue". If "Deferred" beyond Phase I, show the destination (e.g., "Phase J", "#341", "Phase K"). If neither, leave blank.
   - Group by section in the order they appear in the docket file.

## Never

- Never resolve, redesign, or scope the item here — that happens in its design pass.
- Never touch v3 root files, `99-open-questions.md`, or any other doc from this skill.
- Never ask clarifying questions unless the item is unintelligible — default to **Unscheduled / watch** and move on.
