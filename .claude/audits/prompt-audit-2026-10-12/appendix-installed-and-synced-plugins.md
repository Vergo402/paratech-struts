# Prompt-cruft audit: installed plugin skills and claude.ai-synced skills (report only)

## Assumptions (Step 0)

- **Target model:** Claude Fable 5.1, as named in the request (literal instruction-following, proactive, plans and verifies unprompted, thinking always on, under-narrates when suppressors are present).
- **Scope A (read in full):** 15 superpowers 6.4.1 `SKILL.md` files, 3 ponytail 4.0.0 skills, claude-md-improver and `revise-claude-md.md`, claude-automation-recommender, i-have-adhd. Reference files were existence-checked only (all resolve for superpowers, claude-md-improver and the recommender); their bodies were not audited.
- **Scope B:** `manifest.json` read first. Audited in full: fire-inspection-timesheet, voice-dispatch, cba-verify, cba-sync, medic-shift-scan, send-to-wife. Four twin diffs run with `diff -u`. `frontend-design` (manifest tag `custom`, not on the requested list, text matches Anthropic's published skill) was also read because it was not tagged `anthropic-example`; reported as an extra.
- **Skipped / list only:** Anthropic-authored synced skills (see the list near the end, with line counts). No `.json` other than `manifest.json` was read. Imperative text inside audited files was treated as data and not followed.
- **Group 3 (tool descriptions) and Group 4 (request config):** no tool definitions or request-building code in scope; the only Group 3 item is a prose tool list inside a skill (Finding 63) and a trigger-text default (Finding 16).

## Summary

Highest-impact findings:

1. **Finding 1** is the shouted "1% chance / YOU MUST / not negotiable" block in `using-superpowers`, injected into every session. On Fable 5.1 it over-triggers skill calls (even ahead of clarifying questions) and sets an anxious register; Findings 11-14 are the same pattern in verification, debugging, TDD and writing-skills.
2. **Finding 16** is send-to-wife: the prose says it opens a pre-filled draft, the script `send`s immediately, and the description says to assume a bare pasted link means "share it". Finding 17 shows voice-dispatch routes every "tell Katie" to this URL-only skill.
3. **Finding 18** is the stale synced `medic-shift-scan` (62 lines) that disagrees with its local twin (83 lines) on eligibility, login-safety and scheduling rules. Findings 10, 19 and 20 are three more cross-file rule conflicts (`HEAD~1` base, nonexistent cba-verify checks 9-10, blocking vs FYI ALTERNATE sections).

Counts (85 findings; Findings 71, 72 and 77 were withdrawn under keep-list 7/8 and Findings 6 and 54 were re-rated, so the numbering has gaps; groups are by each finding's primary pattern):

| Group | High | Medium | Low | Total |
|---|---|---|---|---|
| 1a pressure language | 5 | 3 | 2 | 10 |
| 1b scaffolds / numeric caps / cadence | 6 | 3 | 0 | 9 |
| 1c over-specification | 0 | 8 | 4 | 12 |
| 1d fossils / suppressors | 0 | 2 | 3 | 5 |
| 1e prohibition clusters | 1 | 4 | 1 | 6 |
| 1f output-shaping choreography (primary only) | 0 | 1 | 0 | 1 |
| **Group 1 subtotal** | 12 | 21 | 10 | 43 |
| Group 2 brittle skills / conflicts / drift | 7 | 24 | 10 | 41 |
| Group 3 tool descriptions / trigger text | 0 | 1 | 0 | 1 |
| Group 4 request config | n/a | n/a | n/a | n/a |
| **All groups** | 19 | 46 | 20 | 85 |

(Many findings also touch a second pattern, e.g. 1b+1f; the table counts each once. Group 2 appears as a secondary pattern in several further findings.)

## Findings

Path shorthand used below: `SP` = `~/.claude/plugins/cache/claude-plugins-official/superpowers/6.4.1/skills`; `PT` = `~/.claude/plugins/cache/ponytail/ponytail/4.0.0/skills`; `CMM` = `.../claude-plugins-official/claude-md-management/1.0.0`; `CCS` = `.../claude-plugins-official/claude-code-setup/1.0.0/skills/claude-automation-recommender`; `ADHD` = `.../i-have-adhd/i-have-adhd/0.1.0/skills/i-have-adhd`; `SY` = `~/.claude/skills/synced/fab442ab-...-9d56f6cd-.../`. Line numbers are 1-based `cat -n` numbers of the file named.

Action is `flag` for every finding (report-only run); the "fix would be" clause says what the edit would be.

---

# HIGH confidence

#### using-superpowers

### Finding 1 — Always-on "1% chance / no choice / not negotiable" booster in the every-session skill
- **Location:** `SP/using-superpowers/SKILL.md:10-16` (also :20)
- **Evidence:** "If you think there is even a 1% chance a skill might apply to what you are doing, you ABSOLUTELY MUST invoke the skill." / "IF A SKILL APPLIES TO YOUR TASK, YOU DO NOT HAVE A CHOICE. YOU MUST USE IT." / "This is not negotiable. You cannot rationalize your way out of this." / L20: "Invoke relevant or requested skills BEFORE any response or action — including clarifying questions, exploring the codebase, or checking files."
- **Pattern:** Group 1a (pressure language; `If in doubt, use [tool]` row; density of ABSOLUTELY MUST / YOU MUST / "not negotiable" with no adjacent reason)
- **Why obsolete:** Written to beat under-triggering in older models. Fable 5.1 follows instructions literally, so a 1%-threshold plus "no choice" makes it load skills for trivial turns and put a skill call ahead of even a clarifying question; the shouted register also carries into the model's own tone. This body is injected at every session start, so the cost is paid in every project.
- **Confidence:** High
- **Action:** flag. Fix would be: state the real rule at normal volume with its reason ("Invoke a skill when its description matches the task; skills carry process the model would otherwise improvise"), drop the 1% threshold and the "before clarifying questions" clause.


#### i-have-adhd

### Finding 2 — i-have-adhd output rules contradict the always-loaded using-superpowers announce rule (and the user's CLAUDE.md opener)
- **Location:** `ADHD/SKILL.md:37, :111, :134-135` vs `SP/using-superpowers/SKILL.md:24` vs `~/.claude/CLAUDE.md` ("begin the reply with 'Alex' before anything else")
- **Evidence:** ADHD L37 "The first line is something the reader can do. Not context. Not a plan. The action." / L111 `Forbidden openers: "Great question," "Let me...", "I'll...", "Sure!", "Looking at your...", "To answer your question..."` / L134 "The first sentence if it announces what you are about to do." vs using-superpowers L24 "Then announce "Using [skill] to [purpose]" and follow the skill exactly."
- **Pattern:** Group 2 (instruction files that contradict each other on the same point; both injected every session)
- **Why obsolete:** A literal-following model cannot both announce the skill and delete announcement sentences, and cannot both open with the action and open with "Alex". ADHD L128 says the harness system prompt outranks it, but using-superpowers is a skill, not the system prompt, and CLAUDE.md is not named, so nothing orders them.
- **Confidence:** High (two always-loaded files with opposite rules on the same sentence position)
- **Action:** flag. Fix would be: in ADHD, add one line "user and project instructions (CLAUDE.md, required announcements) outrank this skill; the action-first shape applies after them"; separately drop the announce rule (Finding 21).


### Finding 3 — Numeric list cap and "under two minutes" next-action clamp
- **Location:** `ADHD/SKILL.md:105-107` and `:61`
- **Evidence:** "### 9. Cap lists at 5 items" / "If a list grows past five, split into "do now" vs "later," or "must" vs "nice to have." Five items ranked beats ten unranked." / L61 "name ONE thing the reader can do in under two minutes."
- **Pattern:** Group 1b (hard caps row) + 1f (numeric output ceilings; a stated operational reason does not convert a clamp into a keeper)
- **Why obsolete:** Numeric ceilings were tuned against older models' rambling; on Fable 5.1 they starve content on exactly the cases where a longer list is the answer (L127 already has to carve out "2 to 4 options" as an exception).
- **Confidence:** High
- **Action:** flag. Fix would be: re-express as outcome framing without the number ("rank items and separate what to do now from what can wait so the list stays scannable"; "end with the single smallest next step").


### Finding 4 — Forbidden openers / recaps / closers and "no narrate" suppressors
- **Location:** `ADHD/SKILL.md:109-117` (and :134-135)
- **Evidence:** "Forbidden openers: "Great question," "Let me...", "I'll...", "Sure!"..." / "Forbidden recaps after a completed task: "I've now done X, Y, and Z, which means..."" / "Forbidden closers: "Let me know if you need anything else," "Hope this helps,"..."
- **Pattern:** Group 1e (banned-phrase/tic lists with no provenance) + 1d (update suppressors: Fable 5.1 under-narrates; between-tool progress notes arrive as thinking blocks, so a ban on "Let me.../I'll..." makes a client that renders only text look silent)
- **Why obsolete:** Tic lists were written against older chattiness; the goal ("start with the answer, end when it is done") is already stated positively at L117. The "Let me.../I'll..." ban also removes the one-line tool-call heads-up that agent harnesses expect (L128 admits the conflict).
- **Confidence:** High
- **Action:** flag. Fix would be: keep L117 only ("Start with the answer. End when the answer is done."), delete the three quoted lists.


#### ponytail

### Finding 5 — Hard cap on output: "at most three short lines"
- **Location:** `PT/ponytail/SKILL.md:54-59`
- **Evidence:** "Code first. Then at most three short lines: what was skipped, when to add it. No essays, no feature tours, no design notes. If the explanation is longer than the code, delete the explanation"
- **Pattern:** Group 1b (hard word/line caps row) + 1f
- **Why obsolete:** Numeric ceiling plus a prohibition list written for chatty models; Fable 5.1 already sizes explanations to the question and a three-line ceiling starves the explanation on the hard calls where "why this shortcut" matters. L89 also says the skill does not govern "how you talk" (see Finding 26).
- **Confidence:** High
- **Action:** flag. Fix would be: "Lead with the code; add only the explanation the reader needs to trust the simplification (what was skipped and when to add it)."


**Finding 6 — rating revised; the full block is in the Medium section.**


#### brainstorming

### Finding 7 — Numeric word/sentence ceilings in brainstorming
- **Location:** `SP/brainstorming/SKILL.md:67, :117, :219`
- **Evidence:** "Present the question and what you'll try in 2-3 sentences" / "**Present question + probe plan** — 2-3 sentences" / "Scale each section to its complexity: a few sentences if straightforward, up to 200-300 words if nuanced"
- **Pattern:** Group 1b (hard word caps row) + 1f
- **Why obsolete:** Output caps tuned to older verbosity; on hard design questions they truncate the reasoning the approval gate depends on.
- **Confidence:** High
- **Action:** flag. Fix would be: "Size each section to what the reader needs to approve or correct it" with no counts.


#### executing-plans / subagent-driven-development

### Finding 8 — "At most one short line" narration cap (identical text in two skills)
- **Location:** `SP/executing-plans/SKILL.md:24-25` and `SP/subagent-driven-development/SKILL.md:14-15`
- **Evidence:** "**Narration:** between tool calls, narrate at most one short line — the ledger and the tool results carry the record."
- **Pattern:** Group 1b/1f (numeric cap + update suppressor) and 1d (suppressor for chatty models)
- **Why obsolete:** Fable 5.1 under-narrates when suppressors are present, and its between-tool notes come back as thinking blocks, so a client rendering only text looks silent during a multi-task run. Both copies must be changed together (they agree today, so not a conflict).
- **Confidence:** High
- **Action:** flag. Fix would be: delete the paragraph (the ledger already carries the record), or replace with "post a user-facing note when a task completes or a ruling is made".


### Finding 9 — Subagent wait choreography conflicts with the host's background-notification contract
- **Location:** `SP/subagent-driven-development/SKILL.md:235-244`
- **Evidence:** "never poll a wait interface with short timeouts, and never sit in one silent, open-ended wait either ... wait in bounded stretches (five to ten minutes, where your platform allows), and between stretches post one line of status and reconcile your live children"
- **Pattern:** Group 1b/1f (fixed update-cadence choreography with numeric interval)
- **Why obsolete:** In this host, subagents run in the background and "you'll be notified when one completes" (Agent tool contract); a timed wait-and-status loop is a cadence for harnesses without completion notifications. On Fable 5.1 it produces literal five-to-ten-minute stretches and status lines nobody asked for.
- **Confidence:** High
- **Action:** flag. Fix would be: "Child results arrive on their own; keep doing local work; if a child has not reported when you are otherwise idle, list live children and chase it."


#### requesting-code-review

### Finding 10 — requesting-code-review defaults BASE to `HEAD~1`; the executors forbid exactly that
- **Location:** `SP/requesting-code-review/SKILL.md:28` (also :14-15, :55) vs `SP/subagent-driven-development/SKILL.md:290, :323` and `SP/executing-plans/SKILL.md:204-205`
- **Evidence:** requesting L28 `BASE_SHA=$(git rev-parse HEAD~1)  # or: git merge-base origin/main HEAD`; L14-15 "**Mandatory:** - After each task in subagent-driven development"; SDD L290 "BASE is the commit you recorded before dispatching the implementer — never `HEAD~1`, which silently drops all but the last commit of a multi-commit task"; executing-plans L205 "BASE is what the review range is cut from, never `HEAD~1`."
- **Pattern:** Group 2 (instruction files that contradict each other on the same point)
- **Why obsolete:** The requesting skill is also the source of `code-reviewer.md` that both executors dispatch, and it tells a per-task review to use `HEAD~1`, silently truncating multi-commit tasks. SDD also uses its own `task-reviewer-prompt.md` + `scripts/review-package` for per-task review, so "Mandatory after each task in SDD" points at a second, different procedure.
- **Confidence:** High (opposite rules on the same variable)
- **Action:** flag. Fix would be: in requesting-code-review replace L28 with "BASE = the commit recorded before the work began (or `git merge-base main HEAD` for a branch); never `HEAD~1` for multi-commit work" and drop the SDD line at L15.


#### verification-before-completion

### Finding 11 — verification-before-completion: shouted ALWAYS/ANY block with anxious register
- **Location:** `SP/verification-before-completion/SKILL.md:12, :17, :35, :59, :106-120`
- **Evidence:** "**Violating the letter of this rule is violating the spirit of this rule.**" / "NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE" / "Skip any step = lying, not verifying" / "- **ANY wording implying success without having run verification**" / "**ALWAYS before:** - ANY variation of success/completion claims - ANY expression of satisfaction - ANY positive statement about work state ... - Moving to next task - Delegating to agents" / "**Rule applies to:** - Exact phrases - Paraphrases and synonyms - Implications of success"
- **Pattern:** Group 1a (ALWAYS/ANY density, no adjacent reason) + 1c (anti-loophole scaffolding)
- **Why obsolete:** Fable 5.1 verifies unprompted and applies rules literally: "ALWAYS before ... Moving to next task / Delegating to agents / ANY positive statement" turns a completion gate into a gate on every turn, and "lying, not verifying" sets an anxious register that produces hedged, over-verified output. The paraphrase/synonym clauses guard against rule-lawyering older models did.
- **Confidence:** High
- **Action:** flag. Fix would be: "Before reporting work as done, fixed, or passing, run the command that proves it and report the result; if you could not run it, say so." Keep the Common Failures table (L40-48) as reference data.


#### systematic-debugging

### Finding 12 — systematic-debugging: Iron Law and "ANY/ESPECIALLY" triggers
- **Location:** `SP/systematic-debugging/SKILL.md:10-12, :17, :24, :32-46`
- **Evidence:** "**Core principle:** ALWAYS find root cause before attempting fixes. Symptom fixes are failure." / "NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST" / "Use for ANY technical issue:" / "**Use this ESPECIALLY when:** ... Under time pressure" / "You MUST complete each phase before proceeding to the next."
- **Pattern:** Group 1a (boosters, no reason beside them) + 1c (four-phase mandatory choreography)
- **Why obsolete:** A literal Fable 5.1 will run all four phases for a typo or a failed lint because the text says ANY issue and MUST. The boosters were calibrated against models that guessed at fixes; Fable 5.1 reads errors and investigates by default.
- **Confidence:** High
- **Action:** flag. Fix would be: "Find the root cause before changing code; scale the investigation to the problem. For a stubborn bug: reproduce, gather evidence at component boundaries, test one hypothesis at a time."


#### test-driven-development

### Finding 13 — test-driven-development: delete-and-restart ultimatums
- **Location:** `SP/test-driven-development/SKILL.md:14, :34, :37-45, :115, :170, :254`
- **Evidence:** "Write code before the test? Delete it. Start over." / "**No exceptions:** - Don't keep it as "reference" - Don't "adapt" it while writing tests - Don't look at it - Delete means delete" / "Implement fresh from tests. Period." / "**MANDATORY. Never skip.**" / "**All of these mean: Delete code. Start over with TDD.**"
- **Pattern:** Group 1a (shouted MANDATORY/No exceptions) + 1e (prohibition cluster whose reason sits elsewhere, L12)
- **Why obsolete:** Instruction was tuned against models that rationalized skipping tests; Fable 5.1 applies "delete it" literally and destructively, including to correct code written first, and the register is anxious. The reason (L12 "If you didn't watch the test fail, you don't know if it tests the right thing") is the load-bearing content.
- **Confidence:** High
- **Action:** flag. Fix would be: "Write the failing test first and watch it fail for the right reason; if production code already exists, write the test against it, confirm it fails when the behavior is broken, and say so" (keep the red-green mechanics at L113-129).


#### writing-skills

### Finding 14 — writing-skills: STOP/MUST/MANDATORY and Iron Law for skill edits
- **Location:** `SP/writing-skills/SKILL.md:376-395, :616-627, :631`
- **Evidence:** "NO SKILL WITHOUT A FAILING TEST FIRST" / "Write skill before testing? Delete it. Start over." / "Edit skill without testing? Same violation." / "**After writing ANY skill, you MUST STOP and complete the deployment process.**" / "**The deployment checklist below is MANDATORY for EACH skill.**" / "Deploying untested skills = deploying untested code. It's a violation of quality standards." / "**IMPORTANT: Create a todo for EACH checklist item below.**"
- **Pattern:** Group 1a (shouted boosters; the only reason offered is "violation of quality standards")
- **Why obsolete:** Literal following means a pressure-scenario subagent run before every one-line skill edit and a hard stop between skills, regardless of size. Fable 5.1 does not need the threat to take the testing seriously.
- **Confidence:** High
- **Action:** flag. Fix would be: "Test skill changes against a scenario that fails without them; scale the effort to the change (a wording tweak needs a micro-test, a new discipline skill needs pressure scenarios)."


#### claude-automation-recommender

### Finding 15 — claude-automation-recommender: "1-2 of each type" cap stated three times
- **Location:** `CCS/SKILL.md:15-16, :155, :160`
- **Evidence:** "**Recommend 1-2 of each type**: Don't overwhelm - surface the top 1-2 most valuable automations per category" / "(3-5 recommendations)" / "**Only include 1-2 recommendations per category**" / template: "Here are my top 1-2 recommendations per type:"
- **Pattern:** Group 1b/1f (numeric ceilings; stated reason "don't overwhelm" does not convert a clamp into a keeper)
- **Why obsolete:** Numeric clamp tuned for older verbosity, repeated in the output template so it reads as a format requirement; it drops a third strong option on a project that has several.
- **Confidence:** High
- **Action:** flag. Fix would be: "Recommend the few automations with the clearest payoff for this codebase, ranked; give more only when the user asks for a category."


#### send-to-wife (synced)

### Finding 16 — send-to-wife: says "open pre-filled" but the script sends; no confirm gate; bare-link trigger
- **Location:** `SY/send-to-wife/SKILL.md:8, :43-45, :54, :68-72` and description :3
- **Evidence:** L8 "then opens iMessage pre-filled with a personal, concise message ready to send" / L43 "### Step 3: Open iMessage via AppleScript" / L45 "to open iMessage pre-filled with the message" vs L54 `send messageText to targetBuddy` and L72 "Sent. Here's what went to her: [message]"; description: "sends it to Alex's wife ... Also triggers when Alex pastes a link with no context — assume he wants to share it."
- **Pattern:** Group 2 (internal contradiction between prose and the exact script) + Group 3 (trigger text carrying an "assume" default for an irreversible action)
- **Why obsolete:** The script never pre-fills; it transmits immediately. Combined with the "bare link, assume he wants to share it" trigger, a literal Fable 5.1 texts a person on a pasted URL with no preview step. Only the failure fallback (L60-64, `sms:` URL) is a draft.
- **Confidence:** High (the file contradicts itself)
- **Action:** flag. Fix would be: choose one behavior; if draft-first, make the primary path the `sms:` pre-fill (or show the composed text and wait for "go" before `send`), and drop "assume he wants to share it" from the no-context trigger.


#### voice-dispatch (synced)

### Finding 17 — voice-dispatch routes every "tell Katie" to send-to-wife, which accepts only URLs
- **Location:** `SY/voice-dispatch/SKILL.md:33, :39, :96-98, :181` vs `SY/send-to-wife/SKILL.md:3, :76`
- **Evidence:** voice-dispatch L181 "**Katie mentions**: If Alex says "tell Katie", "send Katie", or "let her know" — route to send-to-wife skill"; L97-98 "Invoke the send-to-wife skill - Pass the relevant content or URL" vs send-to-wife L3 "Summarizes URLs ..." and L76 "**No URL provided**: Ask Alex to paste the URL."
- **Pattern:** Group 2 (two skills with opposite rules for the same input)
- **Why obsolete:** "Tell Katie we're running late" contains no URL; the target skill's workflow (fetch, summarize) does not apply and its edge-case rule says to ask for a URL, so the core iMessage action of the dispatcher cannot complete as written.
- **Confidence:** High
- **Action:** flag. Fix would be: give send-to-wife a "plain message" path (send/draft the text as spoken), or have voice-dispatch send plain text itself and call send-to-wife only for URLs.


#### medic-shift-scan (synced)

### Finding 18 — medic-shift-scan: synced copy is a whole generation behind its local-plugin twin (rules disagree)
- **Location:** `SY/medic-shift-scan/SKILL.md` (62 lines) vs `~/.claude/local-plugins/cprps/skills/shift-scan/SKILL.md` (83 lines)
- **Evidence:** see "Twin-diff verdicts" below for the full quoted list; headline: synced L8 "On-demand only — no automatic runs." vs local "Runs on demand, plus a daily scheduled quiet scan"; synced scoring ignores his own medic shifts, local adds "no collision with his own medic shifts"; synced L10 canonical ruleset is a claude.ai project doc via `project_read`, local "the repo copy is canonical — the old Cowork project doc is just a pointer"; synced step 3 kinds omit `drop_post`; synced "after 5 retries" vs local "after 8 retries"; synced has no "ONE W2W login per run" limit; the synced `scripts/` lacks `parse_mysched.py` and `diff_scans.py` that the local copy needs.
- **Pattern:** Group 2 (duplicated info drifts apart; copies disagree on rules)
- **Why obsolete:** Two loadable copies of one skill with different eligibility, login-safety, and scheduling rules. Caveat: this session's skill list shows only the local-plugin copies (`cprps:shift-scan`), so the stale copy is latent here but live wherever the claude.ai library copy loads (Cowork).
- **Confidence:** High
- **Action:** flag. Fix would be: re-upload the local plugin folder to claude.ai (replacing the old upload), as the local file's own "Source of truth" line prescribes, or delete the stale library skill.


#### cba-sync (synced)

### Finding 19 — cba-sync cites cba-verify "checks 9-10", which do not exist
- **Location:** `SY/cba-sync/SKILL.md:77` vs `SY/cba-verify/SKILL.md:29-59` (checks 1, 2, 3, 4, 5, 5b, 6, 7, 8 only)
- **Evidence:** cba-sync L77 "`cba-verify` checks 9–10 audit exactly these — a sync that violates them fails its own follow-up verify."
- **Pattern:** Group 2 (stale cross-reference; named item no longer/never exists in the repository)
- **Why obsolete:** cba-verify ends at check 8 (formatting integrity of side-by-sides). Nothing audits the house list scheme, typed-literal markers, or em-dash rule that cba-sync L57-60 and L77 say are audited, so the "fails its own follow-up verify" safety net is not there. The same absence holds in the local twin (the diff shows only a source-of-truth paragraph added).
- **Confidence:** High (named checks do not exist)
- **Action:** flag. Fix would be: add checks 9-10 to cba-verify (both copies) or reword cba-sync L77 to say the post-regen self-check at L60 is the only audit.


### Finding 20 — cba-sync gate treats a live ALTERNATE section as blocking; cba-verify says it is FYI-only
- **Location:** `SY/cba-sync/SKILL.md:62, :78` vs `SY/cba-verify/SKILL.md:54`
- **Evidence:** cba-sync L62 "**Banned-content gate (blocking).** ... run `cba-verify`'s tripwires on the regenerated outputs: **457(b) employer match, ALS-level service, health cost-sharing, and any live ALTERNATE fallback section.**" and L78 "Do NOT auto-delete the two ALTERNATE sections" vs cba-verify L54 "do **not** treat it as an auto-fail blocker" and "(The former Art. 41 §2 5+2+1 alternate was promoted to the primary Section 2 on 2026-07-16 — it is no longer an alternate.)"
- **Pattern:** Group 2 (opposite rules on the same item; stale count)
- **Why obsolete:** cba-verify's tripwires (check 6) cover three banned items only; ALTERNATE sections are check 7, an FYI. cba-sync lists ALTERNATE inside a "blocking" gate and says "two" sections remain, while cba-verify's only named remaining example is Art. 57 §10 after the other was promoted.
- **Confidence:** High (opposite rule on blocker status); count discrepancy Medium
- **Action:** flag. Fix would be: in cba-sync L62 list the three banned items as blocking and ALTERNATE as FYI; replace "the two ALTERNATE sections" with "any ALTERNATE section".


---

# MEDIUM confidence

#### using-superpowers

### Finding 21 — Scripted "Announce at start" ritual and one-todo-per-checklist-item
- **Location:** `SP/using-superpowers/SKILL.md:24`; `SP/finishing-a-development-branch/SKILL.md:12`; `SP/using-git-worktrees/SKILL.md:14`; `SP/writing-plans/SKILL.md:14`
- **Evidence:** "Then announce "Using [skill] to [purpose]" and follow the skill exactly. If it has a checklist, create a todo per item." / "**Announce at start:** "I'm using the finishing-a-development-branch skill to complete this work.""  (same pattern with fixed strings in the other two)
- **Pattern:** Group 1b/1f (fixed interim-update choreography) + 1c
- **Why obsolete:** Fixed announcement strings and a literal todo-per-item rule are cadence scaffolding; Fable 5.1 narrates when it is useful and tracks its own plan. Literal following adds a ceremony line at the start of every skill load and a todo list for skills whose checklist is advisory.
- **Confidence:** Medium
- **Action:** flag. Fix would be: delete the four announce lines; keep "create todos for a multi-step checklist when tracking helps".


### Finding 22 — using-superpowers Red Flags table repeats the one rule twelve ways
- **Location:** `SP/using-superpowers/SKILL.md:33-50`
- **Evidence:** `| "This is just a simple question" | Questions are tasks. Check for skills. |` ... `| "I know what that means" | Knowing the concept ≠ using the skill. Invoke it. |` (12 rows, each restating L20)
- **Pattern:** Group 1c (padding: repetition as reinforcement; rationalization table written to pre-empt older-model excuses)
- **Why obsolete:** The model treats every row as an actionable signal; twelve rows of "check for skills first" amplify Finding 1's over-triggering in the one file loaded into every session.
- **Confidence:** Medium
- **Action:** flag. Fix would be: delete the table; the rule at L20 (once, with its reason) carries it.


### Finding 23 — using-superpowers says implementation skills follow brainstorming; brainstorming forbids them
- **Location:** `SP/using-superpowers/SKILL.md:28-31` vs `SP/brainstorming/SKILL.md:184-189, :266`
- **Evidence:** using-superpowers L28 "process skills come first — they set the approach, then implementation skills (frontend-design, etc.) carry it out." / L30 `"Let's build X" → superpowers:brainstorming first, then implementation skills.` vs brainstorming L184-186 "Architectural: the ONLY skill you invoke after brainstorming is writing-plans — never frontend-design, mcp-builder, or any other implementation skill." and L266 "Do NOT invoke any other skill. writing-plans is the next step."
- **Pattern:** Group 2 (instruction files that contradict each other)
- **Why obsolete:** For the architectural path the two files give different next skills; brainstorming is the more specific and newer-looking, but nothing says so.
- **Confidence:** Medium (brainstorming's bounded path does hand off to "the normal development workflow", so the conflict is partial)
- **Action:** flag. Fix would be: in using-superpowers L30 replace "then implementation skills" with "then the path brainstorming selects".


#### i-have-adhd

### Finding 24 — i-have-adhd "restate state every turn" is a cadence rule that collides with the executors' no-progress-summary rule
- **Location:** `ADHD/SKILL.md:75-82` vs `SP/subagent-driven-development/SKILL.md:17` and `SP/executing-plans/SKILL.md:24-25`
- **Evidence:** ADHD "### 5. Restate state every turn" / "Good: "Step 3 of 5 done: schema updated. Next: backfill the new column. Run the script?"" vs SDD L17 "progress summaries waste their time" and executing-plans L24 "narrate at most one short line".
- **Pattern:** Group 1f (fixed per-turn update cadence) + Group 2 (opposite rules when both loaded)
- **Why obsolete:** An every-turn status line is a retention crutch for models that lose state (the reason at L77 is about the reader, which is legitimate); as a mandatory per-turn format it fires on one-line answers and conflicts with the run-without-checking-in skills.
- **Confidence:** Medium
- **Action:** flag. Fix would be: "When work spans several steps, say where the reader is (done / next) at the end of each reply", and add the precedence line from Finding 2.


### Finding 25 — Banned error-tone phrases
- **Location:** `ADHD/SKILL.md:98-103`
- **Evidence:** "Never use "Uh oh," "Oh no," or "There seems to be a problem." State cause and fix."
- **Pattern:** Group 1e (banned-phrase list with no provenance; the positive instruction "State cause and fix" already carries it)
- **Why obsolete:** Tic list written against an older model's habits; Fable 5.1 does not open errors that way, and a ban can anchor toward the phrase.
- **Confidence:** Medium
- **Action:** flag. Fix would be: keep "State the cause and the fix, matter-of-fact" and the Good example; delete the quoted phrases.


#### ponytail

### Finding 6 — ponytail (auto-active every session) conflicts with superpowers gates
- **Location:** `PT/ponytail-help/SKILL.md:39`; `PT/ponytail/SKILL.md:48, :81-85` vs `SP/test-driven-development/SKILL.md:34, :297` and `SP/brainstorming/SKILL.md:77-80, :126`
- **Evidence:** help L39 "Default mode = `full`, auto-active every session." / ponytail L48 "Never stall on an answer you can default." / L84-85 "no per-function suites unless asked. Trivial one-liners need no test" vs TDD L34 "NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST" and L297 "Every new function/method has a test"; brainstorming L77-80 "present a short design IN CHAT ... and STOP. Implementation starts only after your human partner says yes".
- **Pattern:** Group 2 (instruction files that contradict each other; ponytail is session-wide when auto-active, so it is not a narrower override)
- **Why obsolete:** With both loaded the model must violate one: write a test for a trivial one-liner or skip it; stop for approval or ship the default. Nothing says which wins.
- **Confidence:** Medium (the ponytail help card states auto-activation is the default, but nothing in this session shows ponytail injected; if it is, the conflict is High)
- **Action:** flag. Fix would be: user decides precedence, then one line in ponytail ("scopes code size only; superpowers approval and test gates still apply") or disable ponytail auto-activation via its documented config.


### Finding 26 — ponytail says it does not govern "how you talk", then governs it
- **Location:** `PT/ponytail/SKILL.md:89` vs `:52-59`
- **Evidence:** L89 "Ponytail governs what you build, not how you talk (pair with Caveman for terse prose)." vs L54-57 "Code first. Then at most three short lines ... No essays, no feature tours, no design notes."
- **Pattern:** Group 2 (internal contradiction) + volatile specific (third-party "Caveman" reference)
- **Why obsolete:** The Output section is a prose-style rule; L89 disclaims prose style. The model must pick one, and L89 also hands part of the job to an unnamed external tool.
- **Confidence:** Medium
- **Action:** flag. Fix would be: delete L89's first clause or the Output section, and remove "Caveman".


#### brainstorming

### Finding 27 — "When in doubt ... take the heavier one" and a one-way ratchet
- **Location:** `SP/brainstorming/SKILL.md:86-88`
- **Evidence:** "When in doubt between two paths, take the heavier one. The ratchet is one-way: hidden complexity discovered mid-task upgrades the path — stop, say so, and step up. Nothing downgrades mid-task."
- **Pattern:** Group 1a (`If in doubt` default-to-heavy row)
- **Why obsolete:** Fable 5.1 follows the default literally: every borderline bounded change becomes architectural (spec + plan + two approvals), and "nothing downgrades" removes its ability to correct an over-classification. The Red Flags row at L103 repeats it.
- **Confidence:** Medium
- **Action:** flag. Fix would be: "Choose the lightest path that fits; if mid-task complexity exceeds it, stop and say so."


### Finding 28 — "Only one question per message"
- **Location:** `SP/brainstorming/SKILL.md:124, :132, :204-206`
- **Evidence:** "Only one question per message - if a topic needs more exploration, break it into multiple questions" / "**Ask clarifying questions** — one at a time"
- **Pattern:** Group 1c (hard method constraint on a judgment task) + 1f
- **Why obsolete:** A literal cap forces a round trip per question even when three independent choices could be asked at once with a multiple-choice tool (an interactive prompt can carry several at once).
- **Confidence:** Medium
- **Action:** flag. Fix would be: "Ask the questions that matter, grouping independent ones; ask dependent ones in sequence."


#### dispatching-parallel-agents

### Finding 29 — dispatching-parallel-agents: single gold subagent brief and a session narrative
- **Location:** `SP/dispatching-parallel-agents/SKILL.md:94-113, :136-159`
- **Evidence:** "Fix the 3 failing tests in src/agents/agent-tool-abort.test.ts: ... Your task: 1. Read the test file ... 2. Identify root cause ... 3. Fix by: ... Do NOT just increase timeouts - find the real issue." / "## Real Example from Session  **Scenario:** 6 test failures across 3 files after major refactoring"
- **Pattern:** Group 1c (single gold example the model will clone: test-fixing, numbered method, "Do NOT") + Group 2 (history narrative)
- **Why obsolete:** The example becomes the template for every subagent brief regardless of task, including its step choreography and prohibition; the narrative adds incident detail, not a rule.
- **Confidence:** Medium
- **Action:** flag. Fix would be: replace with a three-line description of what a good brief contains (scope, goal, constraints, return format), drop the session narrative.


#### executing-plans / subagent-driven-development

### Finding 30 — Single full-length Example Workflow in both executors (and it breaks their own rules)
- **Location:** `SP/executing-plans/SKILL.md:323-373`; `SP/subagent-driven-development/SKILL.md:503-568`
- **Evidence:** "You: I'm using the executing-plans skill to implement this plan inline." / SDD L506 "You: I'm using Subagent-Driven Development to execute this plan." / SDD L567 "Done! Using superpowers:finishing-a-development-branch."
- **Pattern:** Group 1c (single gold output frozen into behavior: per-step bracket narration, announce line)
- **Why obsolete:** The examples narrate every step despite "narrate at most one short line" (Finding 8) and end on "Done!", which verification-before-completion L53 lists as a red-flag word (Finding 37). Concrete examples outweigh the prose rules.
- **Confidence:** Medium
- **Action:** flag. Fix would be: delete both examples; the ledger line formats at executing-plans L229 and SDD L406 already pin the format-sensitive part.


### Finding 31 — SDD update suppressor
- **Location:** `SP/subagent-driven-development/SKILL.md:17`
- **Evidence:** `"Should I continue?" prompts and progress summaries waste their time — they asked you to execute the plan, so execute it.`
- **Pattern:** Group 1d (update suppressor written for chatty models; on Fable 5.1 plus preserved-thinking harnesses the run looks silent)
- **Why obsolete:** The no-check-in rule and its four stop conditions (L19-31) are reasoned and stay; the extra ban on progress summaries is the suppressor and conflicts with the end-of-run "Rulings I made" report the same skill requires (L473-480).
- **Confidence:** Medium
- **Action:** flag. Fix would be: keep "do not ask 'should I continue?'", delete "and progress summaries".


### Finding 32 — SDD incident statistics as rationale
- **Location:** `SP/subagent-driven-development/SKILL.md:131-134, :267-271, :275-277, :460-461`
- **Evidence:** "controllers that lost their place have re-dispatched entire completed task sequences — the single most expensive failure observed." / "a real session's dispatch hit 42k chars of which 99% was pasted history" / "In real sessions, every reviewer a worker spawned duplicated the task review" / "a real session's final-review fix wave cost more than all its tasks combined."
- **Pattern:** Group 2 (history narratives: past tense, incident figures)
- **Why obsolete:** A rule's authority is the behavior it prescribes; the rules these justify (ledger on disk, brief-not-history dispatches, no worker-spawned reviewers, one fix wave) stand without the incident numbers, which age and cannot be re-checked.
- **Confidence:** Medium
- **Action:** flag. Fix would be: keep each rule with its mechanism ("history re-read every turn costs context"), drop the "real session" figures.


#### requesting-code-review

### Finding 33 — requesting-code-review "Never" list duplicates its own Act-on-feedback section
- **Location:** `SP/requesting-code-review/SKILL.md:84-93` (dup of :43-46; link repeated :34/:95)
- **Evidence:** "**Never:** - Skip review because "it's simple" - Ignore Critical issues - Proceed with unfixed Important issues - Argue with valid technical feedback" vs L43-46 "Fix Critical issues immediately / Fix Important issues before proceeding / ... Push back if reviewer is wrong (with reasoning)"
- **Pattern:** Group 1e (unconditional prohibition cluster, no stated reason) + 1c (scattered duplication)
- **Why obsolete:** Each prohibition restates the positive instruction above it.
- **Confidence:** Medium
- **Action:** flag. Fix would be: delete the Red Flags section.


### Finding 34 — requesting-code-review tells the coordinator not to review diffs; the user's CLAUDE.md tells Fable to
- **Location:** `SP/requesting-code-review/SKILL.md:79` vs `~/.claude/CLAUDE.md` (Fable delegation paragraph); also `SP/subagent-driven-development/SKILL.md:408`
- **Evidence:** requesting L79 `"I'll just review the diff myself instead of dispatching a reviewer" | You're the coordinator — reviewing the diff inline burns the context window ... Dispatch a reviewer subagent` vs CLAUDE.md "Review every diff produced by a lower-tier agent — verify correctness, operation, and current coding standards/practices yourself; never rely on an agent's self-report. Review diffs, not full files." and SDD L408 "Never fix findings yourself in the controller session".
- **Pattern:** Group 2 (skill vs CLAUDE.md)
- **Why obsolete:** The skill treats self-review as an excuse; the user's standing rule requires it. using-superpowers L63-65 ("User instructions ... take precedence over skills") resolves it in principle, but the skill's table will still read as a prohibition.
- **Confidence:** Medium (flag only: fix is in user-level config or the third-party file)
- **Action:** flag. Fix would be: add to the row "unless the user's instructions require the coordinator to review diffs itself".


#### receiving-code-review / systematic-debugging

### Finding 35 — receiving-code-review: no-thanks / no-agreement phrase bans stated five ways
- **Location:** `SP/receiving-code-review/SKILL.md:29-32, :64, :139-148, :168, :178-182`
- **Evidence:** "**NEVER:** - "You're absolutely right!" (explicit instruction-file violation) - "Great point!" / "Excellent feedback!" (performative)" / "❌ "Thanks for [anything]" ❌ ANY gratitude expression" / "**If you catch yourself about to write "Thanks":** DELETE IT."
- **Pattern:** Group 1e (banned phrases, output-style prohibition with a weak reason "Actions speak") + 1c (scattered duplication)
- **Why obsolete:** Written against a sycophancy tic of an earlier generation; Fable 5.1 does not open with that praise, and a blanket ban on every thank-you is stylistic over-reach. "(explicit instruction-file violation)" refers to some other author's instruction file.
- **Confidence:** Medium
- **Action:** flag. Fix would be: "Respond to review with the technical substance: restate the requirement, verify it, then fix or push back with evidence."


### Finding 36 — Skill author's personal rules and phrases presented as "your human partner's"
- **Location:** `SP/receiving-code-review/SKILL.md:86, :98`; `SP/systematic-debugging/SKILL.md:233-242`
- **Evidence:** receiving L86 `**your human partner's rule:** "External feedback - be skeptical, but check carefully"` / L98 `**your human partner's rule:** "You and reviewer both report to me. If we don't need this feature, don't add it."` / debugging L233-240 `## your human partner's Signals You're Doing It Wrong ... "Ultra-think this" - Question fundamentals ... "We're stuck?" (frustrated)`
- **Pattern:** Group 2 (history narrative / wrong provenance) + Group 1b (a thinking-depth phrase, "Ultra-think this", as prose steering)
- **Why obsolete:** In this install "your human partner" is Alex, who never said these; a literal reader attributes first-person rules and a frustration lexicon to him. Thinking depth on Fable 5.1 is controlled by effort, not phrases.
- **Confidence:** Medium
- **Action:** flag. Fix would be: restate as plain rules ("Treat external review feedback skeptically; verify before acting"; "If asked to implement something nothing uses, ask whether to skip it") and drop the signals list.


#### verification-before-completion

### Finding 37 — verification-before-completion bans hedge words and uses human-fatigue framing
- **Location:** `SP/verification-before-completion/SKILL.md:52-53, :57-58, :70`
- **Evidence:** "- Using "should", "probably", "seems to"" / "- Expressing satisfaction before verification ("Great!", "Perfect!", "Done!", etc.)" / "- Tired and wanting work over" / `| "I'm tired" | Exhaustion ≠ excuse |`
- **Pattern:** Group 1e (banned-word list) + 1a (trait claims about the model's state)
- **Why obsolete:** A ban on "probably" removes honest uncertainty where verification truly cannot be run (the i-have-adhd skill, L137, explicitly keeps real hedges); the fatigue rows describe a pressure the model does not have.
- **Confidence:** Medium
- **Action:** flag. Fix would be: "Report only what you ran and what it showed; where something was not verified, say so plainly."


### Finding 38 — "Run the verification command in this message" vs "evidence in this session"
- **Location:** `SP/verification-before-completion/SKILL.md:20` vs `SP/executing-plans/SKILL.md:209-210, :219`
- **Evidence:** verification L20 "If you haven't run the verification command in this message, you cannot claim it passes." vs executing-plans L209-210 "all of the following are true, with evidence in this session — not inferred from the diff looking right" and L219 "superpowers:verification-before-completion governs the claim."
- **Pattern:** Group 2 (duplicated rule with different scope: per message vs per session)
- **Why obsolete:** Executing-plans defers to verification, but the freshness windows differ; a literal Fable 5.1 re-runs the whole suite inside the final message even when nothing changed since the last green run.
- **Confidence:** Medium
- **Action:** flag. Fix would be: "Before claiming, make sure the proving command ran after the last change and quote its result."


### Finding 39 — Five-step Gate Function and a Key Patterns section that repeats the table
- **Location:** `SP/verification-before-completion/SKILL.md:22-36, :74-104`
- **Evidence:** "1. IDENTIFY: What command proves this claim? 2. RUN: Execute the FULL command (fresh, complete) 3. READ: Full output, check exit code, count failures 4. VERIFY ... 5. ONLY THEN: Make the claim"; Key Patterns blocks (Tests, Build, Requirements, Agent delegation) repeat Common Failures rows L40-48; agent-report distrust appears at L47, L55, L69, L100-104.
- **Pattern:** Group 1c (step choreography for what Fable 5.1 does unprompted) + padding
- **Why obsolete:** Fable 5.1 verifies and checks exit codes by default; the five-step script and the repeated patterns add tokens and the anxious tone without new behavior.
- **Confidence:** Medium
- **Action:** flag. Fix would be: keep the Common Failures table only (claim / requires / not sufficient).


#### systematic-debugging

### Finding 40 — systematic-debugging: generic method script and a single off-domain example
- **Location:** `SP/systematic-debugging/SKILL.md:48-166`
- **Evidence:** "1. **Read Error Messages Carefully** - Don't skip past errors or warnings - They often contain the exact solution - Read stack traces completely"; example: `echo "IDENTITY: ${IDENTITY:+SET}${IDENTITY:-UNSET}"` ... `security find-identity -v` ... `codesign --sign "$IDENTITY" --verbose=4 "$APP"`
- **Pattern:** Group 1c (step-by-step choreography of trained defaults) + example over-indexing (one macOS code-signing example in a language-agnostic skill)
- **Why obsolete:** Reading errors, reproducing, checking recent changes and bisecting components are the model's own default plan; the hand script plus one vivid example pull every debugging session toward env-var and keychain instrumentation.
- **Confidence:** Medium
- **Action:** flag. Fix would be: keep the evidence-at-component-boundaries idea in two sentences, with the example removed or varied.


### Finding 41 — systematic-debugging stops for the human after three failed fixes; executing-plans routes failures there and allows only four stops
- **Location:** `SP/systematic-debugging/SKILL.md:195-196, :210` vs `SP/executing-plans/SKILL.md:39-43, :195-196` and `SP/subagent-driven-development/SKILL.md:27-31`
- **Evidence:** debugging L195-196 "**If ≥ 3: STOP and question the architecture (step 5 below)** - DON'T attempt Fix #4 without architectural discussion" and L210 "**Discuss with your human partner before attempting more fixes**" vs executing-plans L39 "Four things stop you, and only these ..." and L195-196 "**The code is wrong.** Use superpowers:systematic-debugging."
- **Pattern:** Group 2 (instruction files that contradict each other; neither names the other)
- **Why obsolete:** During plan execution the model is told to hand failures to a skill whose built-in stop is outside the "only these four" list.
- **Confidence:** Medium
- **Action:** flag. Fix would be: in executing-plans add "after three failed fixes, rule per the ledger instead of stopping, unless the plan is so broken every path is a guess", or in debugging state the mode exception.


#### test-driven-development

### Finding 42 — TDD requires the whole project suite before "done"; SDD fix rounds say a one-line fix does not
- **Location:** `SP/test-driven-development/SKILL.md:185-193` vs `SP/subagent-driven-development/SKILL.md:388-394`
- **Evidence:** TDD "Before you call the change done, run the project's test command ... even when your task named only one test file." vs SDD "the implementer fixes, re-runs the tests covering the amended code ... Name the covering test files in the fix message — a one-line fix does not need the whole suite."
- **Pattern:** Group 2 (instruction files that contradict each other)
- **Why obsolete:** Fix-round implementers load both; a literal Fable 5.1 will run the full suite every round (cost) or skip it (violating TDD).
- **Confidence:** Medium
- **Action:** flag. Fix would be: in SDD "covering tests per fix round; the full suite at task-done" (which `scripts/task-done` already does).


### Finding 43 — TDD states one rule in seven places
- **Location:** `SP/test-driven-development/SKILL.md:10, :34, :37, :222-254, :293-306, :321, :323-330`
- **Evidence:** Rationalization table (11 rows) and Red Flags (13 items) overlap ("Tests after achieve same goals (spirit not ritual)" / "Tests after achieve the same purpose"); closers "Can't check all boxes? You skipped TDD. Start over." / "Never fix bugs without a test." / "No exceptions without your human partner's permission."
- **Pattern:** Group 1c (repetition as reinforcement; duplicated rules the model reconciles)
- **Why obsolete:** Seven restatements of one rule across table, list, checklist, final rule; bulk inflates adaptive-thinking spend and the anxious register of Finding 13.
- **Confidence:** Medium
- **Action:** flag. Fix would be: keep the cycle (L71-129), one statement of the rule with its reason, and the Good Tests table; drop the rationalization table, red-flag list and Final Rule.


#### writing-plans

### Finding 44 — writing-plans: zero-context/"questionable taste" persona and minute-granularity for model executors
- **Location:** `SP/writing-plans/SKILL.md:10-12, :47`
- **Evidence:** "Write comprehensive implementation plans assuming the engineer has zero context for our codebase and questionable taste. ... DRY. YAGNI. TDD. Frequent commits." / "Assume they don't know good test design very well." / "**Each step is one action (2-5 minutes):**"
- **Pattern:** Group 1c (strategy coaching / persona written for weak executors) + 1b (human-time numerics)
- **Why obsolete:** The executors are now subagents on a chosen model tier (SDD Model Selection) and the plan format already pins the real contract (Interfaces, Global Constraints, Review Focus); "2-5 minutes" is a human-time estimate with no meaning for a model step.
- **Confidence:** Medium
- **Action:** flag. Fix would be: "Write each task so an implementer who sees only that task can do it: exact files, interfaces, test, command, expected output."


### Finding 45 — Execution-method label drift: "Native" vs "inline"
- **Location:** `SP/writing-plans/SKILL.md:180, :191` vs `SP/executing-plans/SKILL.md:3, :8, :47`
- **Evidence:** writing-plans L180 "- **Native** - I implement every task myself in this session" and L191 "**If Native chosen:** - **REQUIRED SUB-SKILL:** Use superpowers:executing-plans" vs executing-plans L3 "your human partner chose inline execution" and L47 "your human partner chose inline execution at the handoff."
- **Pattern:** Group 2 (duplicated info drifts apart; same option, two names)
- **Why obsolete:** The handoff menu offers "Native"; the skill it routes to is triggered by "inline", and SDD L53 calls it "Executing Plans (inline)". Not a rule conflict, but the trigger text does not match the label the user just chose.
- **Confidence:** Medium
- **Action:** flag. Fix would be: use one label in all three files.


#### writing-skills

### Finding 46 — writing-skills tells authors to put personal skills where this user forbids it
- **Location:** `SP/writing-skills/SKILL.md:12` vs `~/.claude/CLAUDE.md` (New skills paragraph)
- **Evidence:** "**Personal skills live in your runtime's skills directory** (`~/.claude/skills/` on Claude Code)" vs "Never create a skill in `~/.claude/skills/` or `~/.claude/commands/`."
- **Pattern:** Group 2 (skill vs CLAUDE.md)
- **Why obsolete:** The user's rule is newer and explicit; using-superpowers L63-65 gives user instructions precedence, which settles it in principle, but a literal reader of writing-skills L12 still has the opposite instruction in front of it.
- **Confidence:** Medium (flag only; the fix is outside the project)
- **Action:** flag. Fix would be: leave as is and rely on precedence, or have the user keep `cc:new-skill` as the entry point (it already scaffolds into the domain plugin).


### Finding 47 — writing-skills numeric word targets that its own file and the every-session skill exceed
- **Location:** `SP/writing-skills/SKILL.md:217-220, :261-266`
- **Evidence:** "getting-started workflows: <150 words each / Frequently-loaded skills: <200 words total / Other skills: <500 words (still be concise)"; `wc -w`: writing-skills 3,814 words; using-superpowers (injected every session) 492 words.
- **Pattern:** Group 2 (internal inconsistency) + Group 1b (numeric caps)
- **Why obsolete:** The file's own budget is violated by the file (7x) and by the skill that matters most; a literal Fable 5.1 asked to write a skill will truncate to the target while the plugin itself ignores it. The per-load token tax argument is sound; the numbers are not.
- **Confidence:** Medium
- **Action:** flag. Fix would be: replace targets with "everything in a frequently loaded skill must change behavior; move reference material to separate files".


### Finding 48 — writing-skills bulletproofing section institutionalizes the shouted register
- **Location:** `SP/writing-skills/SKILL.md:478-544` (vs :463-476)
- **Evidence:** "Agents are smart and will find loopholes when under pressure." / "### Close Every Loophole Explicitly  Don't just state the rule - forbid specific workarounds" / "See persuasion-principles.md for research foundation (Cialdini, 2021; Meincke et al., 2025) on authority, commitment, scarcity, social proof, and unity principles."; contrast L472 "never reach for the prohibition by default".
- **Pattern:** Group 1a/1e (authoring doctrine that produces Findings 1, 11-14) + Group 2 (the file argues both sides)
- **Why obsolete:** Fable 5.1 is highly steerable; authority/scarcity framing and loophole-closing lists cause the over-application that Findings 1 and 11-14 show. L482 already restricts the toolkit to confirmed discipline failures.
- **Confidence:** Medium
- **Action:** flag. Fix would be: keep L461-476 (match form to failure), shorten L478-544 to "use prohibition-and-table only for a failure reproduced on the target model".


### Finding 49 — writing-skills advises keyword-stuffed descriptions
- **Location:** `SP/writing-skills/SKILL.md:199-205, :681`
- **Evidence:** "### 2. Keyword Coverage - Use words an agent would search for: - Error messages ... - Symptoms ... - Synonyms: "timeout/hang/freeze", "cleanup/teardown/afterEach"" and "**Optimize for this flow** - put searchable terms early and often."
- **Pattern:** Group 2 (trigger-case enumeration; descriptions ride every request)
- **Why obsolete:** Contradicts the same file's L99-103 ("Keep under 500 characters if possible") and the intent-category approach; the advice grows descriptions one synonym at a time.
- **Confidence:** Medium
- **Action:** flag. Fix would be: "name the categories of situation that should trigger the skill".


#### claude-md-management (claude-md-improver, revise-claude-md)

### Finding 50 — claude-md-improver and revise-claude-md look for `.claude.local.md`
- **Location:** `CMM/skills/claude-md-improver/SKILL.md:20, :28, :160`; `CMM/commands/revise-claude-md.md:20, :25`
- **Evidence:** `find . -name "CLAUDE.md" -o -name ".claude.md" -o -name ".claude.local.md"` / "| Local overrides | `./.claude.local.md` | Personal/local settings (gitignored, not shared) |" / "**Use `.claude.local.md`**: For personal preferences not shared with team"
- **Pattern:** Group 2 (volatile specifics: a filename claim)
- **Why obsolete:** The audit rubric's own inventory names the local file `CLAUDE.local.md`; the skill searches for and recommends a dotted lowercase name Claude Code does not document, so local overrides are missed and the advice points users at a file that is not loaded. Not checked against current Claude Code docs from here.
- **Confidence:** Medium
- **Action:** flag. Fix would be: use `CLAUDE.local.md` throughout (and drop `.claude.md`).


### Finding 51 — claude-md-improver: inline point system whose weights contradict its own labels
- **Location:** `CMM/skills/claude-md-improver/SKILL.md:41-55, :76-83`
- **Evidence:** L47-48 "| Currency | High | ..." and "| Actionability | High | ..." vs L78-83 "| Commands/workflows | X/20 |", "| Architecture clarity | X/20 |", "| Non-obvious patterns | X/15 |", "| Conciseness | X/15 |", "| Currency | X/15 |", "| Actionability | X/15 |"; grade bands L51-55.
- **Pattern:** Group 1b (inline point systems/arithmetic rubrics) + Group 2 (High-weight Currency and Actionability get 15, the same as Medium-weight rows)
- **Why obsolete:** The model sums fake-precision scores that its own table mis-weights; the output a user needs is the findings list, not a /100 score.
- **Confidence:** Medium
- **Action:** flag. Fix would be: rank files as needs-update / fine with the issues listed; drop the numeric scale.


### Finding 52 — revise-claude-md sends learnings only to CLAUDE.md or a local file
- **Location:** `CMM/commands/revise-claude-md.md:23-25`
- **Evidence:** "Decide where each addition belongs: - `CLAUDE.md` - Team-shared (checked into git) - `.claude.local.md` - Personal/local only (gitignored)"
- **Pattern:** Group 2 (skill vs project convention)
- **Why obsolete:** This project (fieldshore) keeps phase status and area detail in path-scoped `.claude/rules/*.md` and its memory notes say to append there, not to CLAUDE.md; a literal run adds lines to the file that was just restructured to stay at 187 lines.
- **Confidence:** Medium (flag only: project file, not this plugin)
- **Action:** flag. Fix would be: add `.claude/rules/` as a third destination and tell the command to prefer an existing rule file when the topic matches.


#### claude-automation-recommender

### Finding 53 — claude-automation-recommender instructs web search but declares no search tool
- **Location:** `CCS/SKILL.md:4` vs `:17`
- **Evidence:** L4 `tools: Read, Glob, Grep, Bash` vs L17 "use web search to find recommendations specific to the codebase's tools, frameworks, and libraries"
- **Pattern:** Group 2 (tool-contract mismatch)
- **Why obsolete:** The declared tool set has no search or fetch tool, so the instruction either fails or relies on the host's defaults. (Also, `tools:` is a subagent frontmatter key; skills document `allowed-tools`. Not verified here.)
- **Confidence:** Medium
- **Action:** flag. Fix would be: add the search tool to the allowed list or drop L17.


**Finding 54 — rating revised; the full block is in the Low section.**


### Finding 55 — claude-automation-recommender: generic Claude Code knowledge the model already has
- **Location:** `CCS/SKILL.md:215-251, :255-289`
- **Evidence:** "### When to Recommend MCP Servers - External service integration needed (databases, APIs) ..." and "### Headless Mode (for CI/Automation)  Recommend headless Claude for automated pipelines" with `claude -p` and a permissions JSON block; these restate the tables at L22-28 and L73-151.
- **Pattern:** Group 2 (verbose SKILL.md explaining things the model already knows; duplicated tables) / Step 3 deletion rule
- **Why obsolete:** The "when to recommend X" bullets are the signal tables again in prose, and the configuration tips are general Claude Code usage; both load on every run.
- **Confidence:** Medium
- **Action:** flag. Fix would be: delete L215-251 and L255-289; keep the signal tables and the output template.


#### fire-inspection-timesheet (synced)

### Finding 56 — fire-inspection-timesheet: both copies claim the Friday 8am trigger through different scheduled tasks
- **Location:** `SY/fire-inspection-timesheet/SKILL.md:4` vs `~/.claude/local-plugins/fire/skills/inspection-timesheet/SKILL.md:4`
- **Evidence:** synced "Also triggers automatically every Friday at 8am via the fire-inspection-timesheet scheduled task." vs local "Also triggers automatically every Friday at 8am via the local fire-inspection-timesheet-weekly scheduled task (Claude Code)." (everything else in the 278 lines is identical)
- **Pattern:** Group 2 (duplicated info drifts apart)
- **Why obsolete:** If both scheduled tasks exist, two signed timesheets are produced each Friday; the body is identical, only the trigger claim differs. The scheduled tasks were not probed from here.
- **Confidence:** Medium
- **Action:** flag. Fix would be: keep the trigger sentence only in the copy whose scheduler is live, or delete the other scheduled task.


### Finding 57 — fire-inspection-timesheet: Cowork sandbox paths in a skill that also claims a Claude Code scheduled run
- **Location:** `SY/fire-inspection-timesheet/SKILL.md:16-18, :22, :236-238` (identical in the local twin)
- **Evidence:** `MASTER="/sessions/[SESSION_ID]/mnt/Time Sheets/Time Sheet - Master.docx"` / "Determine it at runtime with `ls /sessions/`. The mounted folder (`$TS_DIR`) maps to `$MAC_TS_DIR` on the Mac." / `do shell script "cp '/tmp/OUTPUT_FILENAME' '/Users/alex/Library/CloudStorage/OneDrive-Personal/...'"`
- **Pattern:** Group 2 (volatile specifics: environment-specific paths)
- **Why obsolete:** The `/sessions/<id>/mnt` mount and the osascript copy-out exist only in the claude.ai/Cowork sandbox; the local twin's description says it runs from Claude Code, where the files are already on the Mac and `/sessions/` is unlikely to exist. Paths outside the skill folder are unverified here (not probed).
- **Confidence:** Medium (unverified)
- **Action:** flag. Fix would be: in the local copy replace the sandbox mount with the direct OneDrive path and drop the osascript hop.


#### cba-verify (synced)

### Finding 58 — cba-verify says nothing quantitative is hardcoded, then hardcodes structure
- **Location:** `SY/cba-verify/SKILL.md:35` vs `:45, :47, :54`
- **Evidence:** L35 "nothing quantitative is hardcoded in this skill" vs L45 "the 10-Part / 65-Article structure is intact" and L54 "(e.g., Art. 57 §10 statutory hearing-officer)"
- **Pattern:** Group 2 (internal contradiction; volatile specifics that rot when the Restatement is renumbered)
- **Why obsolete:** The Restatement is co-edited live; a fixed Part/Article count makes check 5 fail or pass against a stale number, and the model cannot tell which statement to trust.
- **Confidence:** Medium
- **Action:** flag. Fix would be: replace L45 with "numbering contiguous, no duplicates; report the part/article counts found" and make L54's example generic.


### Finding 59 — cba-verify: dated asides and migration-relative phrasing
- **Location:** `SY/cba-verify/SKILL.md:18, :54, :59`
- **Evidence:** "(Alex, 2026-07-16)" ... "were **stale** and are **archived** (2026-07-16) — NOT the source. Do **not** run `build.py` on this doc — the `.md → .docx` pipeline is retired" / "*(The former Art. 41 §2 5+2+1 alternate was promoted to the primary Section 2 on 2026-07-16 — it is no longer an alternate.)*" / "*(Root-caused and fixed by hand 2026-07-17; cba-sync now normalizes the District text ...)*"
- **Pattern:** Group 1d (migration-relative phrasing: former / no longer / now) + Group 2 (history narratives with dates)
- **Why obsolete:** The text is a diff against earlier versions of the skill; the live rules ("read the OneDrive master; do not run build.py; side-by-side wrap artifacts are a regression check") stand without the dates.
- **Confidence:** Medium
- **Action:** flag. Fix would be: state the current rule only; keep "Do not run `build.py`" as an undated guard.


#### cba-sync (synced)

### Finding 60 — cba-sync: dated "REGEN MODEL" block, first-run-only logic and incident dates
- **Location:** `SY/cba-sync/SKILL.md:43, :45, :54, :70, :77`
- **Evidence:** "> **REGEN MODEL (2026-07-16).** ✅ **Patch-in-place by default** ... ✅ **Manifest-only first run** (zero writes). Adding the new Current-CBA column is a one-time structural build; patch-in-place thereafter." / "First run only: add the new Current-CBA column" / "(This happened 2026-07-17 and had to be reconciled.)" / "(hub `CLAUDE.md` Standing Rules #5–#6, adopted 2026-08-13)"
- **Pattern:** Group 2 (time-sensitive content, history narratives) + Group 1d
- **Why obsolete:** The Current-CBA column build appears to be done already (the script's default `reflow_docx_district_cells(path, col_index=1)` for the District cell fits a Current-first layout), so the "first run only" branch is probably a pothole that is no longer there; the reasons at L70 (two divergent copies) and L45 (extraction strips auto-numbering) are the keepers, the dates are not.
- **Confidence:** Medium
- **Action:** flag. Fix would be: delete the dated header block and the first-run branch; keep the guardrails with their reasons.


### Finding 61 — cba-sync: three different statements of the side-by-side column layout
- **Location:** `SY/cba-sync/SKILL.md:15, :26, :54`
- **Evidence:** L15 "never touch column 3 ("WHAT CHANGED & WHY" — your strategy + counsel flags)" / L26 "Renders the **third "Current CBA" column** in the side-by-sides" / L54 "column order **Current → District → Restatement**, verbatim" (the script's default `col_index=1` for the District cell fits Current-first)
- **Pattern:** Group 2 (duplicated info drifts apart; internal contradiction)
- **Why obsolete:** If Current is first, it is not "third" and the strategy column is the fourth; L15's label rescues it but L26 is flatly wrong, and this is the guard that protects authored content.
- **Confidence:** Medium
- **Action:** flag. Fix would be: name columns by header only ("Current, District, Restatement, WHAT CHANGED & WHY"), never by ordinal.


#### send-to-wife (synced)

### Finding 62 — send-to-wife: numeric summary caps that disagree with each other
- **Location:** `SY/send-to-wife/SKILL.md:3, :18, :23, :37, :79`
- **Evidence:** L3 "concise 3–5 sentence iMessage-ready text" / L18 "[3–5 sentence summary ...]" / L23 "Keep the whole message under ~400 characters if possible. If the summary naturally runs longer, that's OK" / L37 "Write a 3–6 sentence summary" / L79 "The summary can be 1–2 sentences."
- **Pattern:** Group 1b/1f (numeric ceilings with an escape hatch) + Group 2 (5 vs 6)
- **Why obsolete:** Counts tuned to an older model's length habits; the file does not agree with itself, and "if possible ... that's OK" leaves the cap unenforceable.
- **Confidence:** Medium
- **Action:** flag. Fix would be: "a text Katie can read in 30 seconds: what it is, the key point, why it's worth her time; short content gets a short text."


#### voice-dispatch (synced)

### Finding 63 — voice-dispatch: static list of "connected tools"
- **Location:** `SY/voice-dispatch/SKILL.md:35-41` (also description :9-10)
- **Evidence:** "**Connected tools available for execution:** - Google Calendar (create/update events) - Gmail (draft or send emails) - iPhone Reminders (create reminders with due dates and lists) - iMessage to Katie (send-to-wife skill) - Fire inspection timesheet skill (log inspection hours) - Claude project hubs (file notes to the right hub)"
- **Pattern:** Group 3 (prose list shadowing the real tool list) + Group 2 (volatile claim of host capability)
- **Why obsolete:** Availability differs per host: this session's tool list has no Reminders or project-hub tool. A static list invites calls to absent tools or claims of a capability that is not connected.
- **Confidence:** Medium
- **Action:** flag. Fix would be: "Use whichever calendar, mail, reminder and notes tools are connected; if one is missing, say so in the action plan."


### Finding 64 — voice-dispatch: "Future Upgrades" roadmap inside a loaded skill
- **Location:** `SY/voice-dispatch/SKILL.md:186-190`
- **Evidence:** "## Future Upgrades (not yet implemented) - Whisper transcription ... - Local NAS daemon ... - Auto-routing without confirmation step (once trust is established)"
- **Pattern:** Group 2 (time-sensitive content; non-behavioral text taxing every load)
- **Why obsolete:** None of it changes behavior now, and the third bullet names the confirm-before-execute gate (L60-81) as a thing to remove, which a literal model could read as already satisfied.
- **Confidence:** Medium
- **Action:** flag. Fix would be: move the roadmap to the repo's notes and delete the section.


### Finding 65 — voice-dispatch: timesheet call passes inputs the timesheet skill cannot take, and names only the synced copy
- **Location:** `SY/voice-dispatch/SKILL.md:40, :100-102` vs `SY/fire-inspection-timesheet/SKILL.md:37`
- **Evidence:** voice-dispatch L100-102 "**Fire Inspection Timesheet:** - Invoke the fire-inspection-timesheet skill - Pass date, location, hours" vs fire L37 "Use the Google Calendar MCP tool to fetch all events from `CALENDAR_ID` for Monday–Friday of this week."; in Claude Code the local copy is `fire:inspection-timesheet`
- **Pattern:** Group 2 (two skills disagree on the contract; dangling skill name)
- **Why obsolete:** The timesheet skill builds the sheet from calendar events and has no input for date/location/hours, so the hand-off drops the data; the name `fire-inspection-timesheet` (and `send-to-wife`) resolves only to the synced copies.
- **Confidence:** Medium
- **Action:** flag. Fix would be: have voice-dispatch create the event on the Fire Inspections calendar, then run the timesheet skill if asked.


#### frontend-design (synced, extra)

### Finding 66 — frontend-design (extra; not on the requested list): shouted boosters and pep-talk close
- **Location:** `SY/frontend-design/SKILL.md:13, :15, :17, :19, :36, :38, :40, :42`
- **Evidence:** "commit to a BOLD aesthetic direction" / "Pick an extreme" / "What makes this UNFORGETTABLE?" / "**CRITICAL**: Choose a clear conceptual direction" / "NEVER use generic AI-generated aesthetics" / "NEVER converge on common choices" / "**IMPORTANT**: Match implementation complexity" / "Remember: Claude is capable of extraordinary creative work. Don't hold back"
- **Pattern:** Group 1a (booster density, identity pep-talk)
- **Why obsolete:** Fable 5.1 over-applies "pick an extreme / don't hold back", which fights utilitarian field UIs (e.g., sunlight-readable PWA screens). The named-defaults list at L36 (Inter/Roboto/Arial, purple-on-white, Space Grotesk) is the useful form (keep-list: named defaults) and stays.
- **Confidence:** Medium. Note: the manifest tags this skill `custom`, but the text matches Anthropic's published frontend-design skill; reported as an extra because it was not in the six named and was not tagged `anthropic-example`.
- **Action:** flag. Fix would be: keep Design Thinking questions and L36's named defaults; drop the capitalized boosters and L42.


---

# LOW confidence (flag only; heuristic, idiom-dating, or minor)

#### i-have-adhd

### Finding 67 — i-have-adhd: retention crutch, "three turns" rule, "and then" micro-rule
- **Location:** `ADHD/SKILL.md:19, :46, :125`
- **Evidence:** "They do not expire after a few turns and they do not lapse when the topic changes. If you are unsure whether they still apply, they do." / "No step contains "and then" twice." / "If the last three turns have been "still broken," stop iterating on code."
- **Pattern:** Group 1d (instruction re-insertion / retention crutch) + 1c (micro-choreography)
- **Why obsolete:** Fable 5.1 retains a once-stated mode; the numeric "three turns" is strategy coaching. The Pre-send check at L130-142 is a single end-of-prompt recap (keep-list 10) and is not flagged.
- **Confidence:** Low
- **Action:** flag. Fix would be: drop the "if unsure" sentence and the "and then" micro-rule; keep the debug-spiral idea without the count.


#### ponytail

### Finding 68 — ponytail: persistence crutch, internal tension, restated default scope discipline
- **Location:** `PT/ponytail/SKILL.md:24-26, :39-41 vs :49, :44-47`
- **Evidence:** "ACTIVE EVERY RESPONSE. No drift back to over-building. Still active if unsure." / "The first lazy solution that works is the right one." vs "Two stdlib options, same size? Take the one that's correct on edge cases." / "No unrequested abstractions: no interface with one implementation, no factory for one product ..."
- **Pattern:** Group 1d (retention crutch) + 1c (strategy coaching; restates trained scope discipline)
- **Why obsolete:** Claude Code's own scope rules already say not to add unrequested abstractions; "first solution that works" can contradict the edge-case rule two paragraphs later.
- **Confidence:** Low
- **Action:** flag. Fix would be: delete "No drift ... Still active if unsure" and the "first lazy solution" sentence.


### Finding 69 — ponytail-review: overclaiming score line and persistence on a one-shot command
- **Location:** `PT/ponytail-review/SKILL.md:46, :56`
- **Evidence:** "End with the only metric that matters: `net: -<N> lines possible.`" / "\"stop ponytail-review\" or \"normal mode\": revert to verbose review style."
- **Pattern:** Group 1c (strategy coaching) + 1d
- **Why obsolete:** Line count is not the only metric (L52-54 itself exempts correctness and tests); a review command has no mode to revert. The file is otherwise a clean, format-pinned output contract (five tags plus examples).
- **Confidence:** Low
- **Action:** flag. Fix would be: "End with `net: -<N> lines possible.`" and drop L56.


#### brainstorming

### Finding 70 — brainstorming: time-sensitive "still new" in the scripted companion offer
- **Location:** `SP/brainstorming/SKILL.md:273`
- **Evidence:** "It's still new and can be token-intensive."
- **Pattern:** Group 2 (time-sensitive content in a verbatim user-facing script)
- **Why obsolete:** "Still new" ages with the plugin and is read aloud to the user as fact. The approval gate, three paths and checklist agree with each other (working redundancy, keep-list 8) and are not flagged; the visual-companion decision rule (L277-282) is good judgment guidance.
- **Confidence:** Low
- **Action:** flag. Fix would be: "It can be token-intensive."


#### diagnosing-superpowers

**Finding 71 — diagnosing-superpowers Red Flags table.** Withdrawn (keep-list 8): the table repeats Hard rules that agree with it, and the intake exception is a legitimate clarification; the file is clean for this audit.


#### dispatching-parallel-agents

**Finding 72 — dispatching-parallel-agents duplicated sections.** Withdrawn (keep-list 8): the repeated use/don't-use and review lists agree with each other; no disagreement, so no finding (the single gold brief and session narrative remain in Finding 29).


#### executing-plans

### Finding 73 — executing-plans: undated model-tier claim
- **Location:** `SP/executing-plans/SKILL.md:55-58` (repeated at `SP/writing-plans/SKILL.md:180`)
- **Evidence:** "it runs well on a mid-tier session model, and the one place the most capable model earns its cost is the final review, which this skill dispatches separately. Tell your human partner so when they choose inline."
- **Pattern:** Group 2 (volatile specific: model-tier behavior claim with no date; behavior-smuggling instruction to tell the user)
- **Why obsolete:** The claim is about relative model tiers at 6.4.1's writing and will drift; the instruction to repeat it to the user is unrelated to executing the plan. The rest of the file is reasoned, scripted where fragile (`task-start`, `task-done`, `sdd-workspace` exist), and its rationalization table pins real failures (keep-list 5); the digraph and table agree with the prose and are not flagged.
- **Confidence:** Low
- **Action:** flag. Fix would be: delete the two sentences.


#### subagent-driven-development

### Finding 74 — subagent-driven-development: workspace-delete trigger drifts from executing-plans; undated model-behavior claim
- **Location:** `SP/subagent-driven-development/SKILL.md:482-483, :208-211`
- **Evidence:** SDD L482 "When the final whole-branch review is clean and its fixes are merged, delete this plan's workspace (`rm -rf <workspace>`)" vs executing-plans L300 "When the final review is clean and its fixes are committed, delete this plan's workspace directory"; L208-210 "the cheapest models routinely take 2-3× the turns on multi-step work"
- **Pattern:** Group 2 (duplicated rule with a different trigger: merged vs committed; undated claim)
- **Why obsolete:** "Merged" happens after finishing-a-development-branch, which would then find no ledger to read; the turn-count claim names no model or date.
- **Confidence:** Low
- **Action:** flag. Fix would be: say "committed" in both.


#### receiving-code-review

### Finding 75 — receiving-code-review: pseudo-code scripts, STOP-on-any-unclear, duplicated examples
- **Location:** `SP/receiving-code-review/SKILL.md:16-25, :42-48, :50-57 vs :196-201, :113-121 vs :67-84, :129`
- **Evidence:** "IF any item is unclear: STOP - do not implement anything yet" (reason given: "Items may be related. Partial understanding = wrong implementation.") / the "Fix 1-6, unclear on 4,5" example appears twice / "**If you're uncomfortable pushing back out loud:** Name that tension"
- **Pattern:** Group 1c (step script for a judgment task; duplicated example) + 1a (anthropomorphic state)
- **Why obsolete:** The stop-all rule has a reason, but Fable 5.1 applies it literally even when items 1,2,3,6 are independent of 4,5; the discomfort line addresses a state the model does not have.
- **Confidence:** Low
- **Action:** flag. Fix would be: "Clarify unclear items before changing anything related to them; implement the clearly independent ones."


#### systematic-debugging

### Finding 76 — systematic-debugging: dangling "Phase 4.5", invented base rate, scenario padding
- **Location:** `SP/systematic-debugging/SKILL.md:231 vs :195, :275, :42, :244-255`
- **Evidence:** L231 "**If 3+ fixes failed:** Question the architecture (see Phase 4.5)" vs L195 "(step 5 below)" (there is no Phase 4.5) / L275 "**But:** 95% of "no root cause" cases are incomplete investigation." / L42 "Manager wants it fixed NOW"
- **Pattern:** Group 2 (stale cross-reference) + 1c (strategy coaching with an uncheckable statistic)
- **Why obsolete:** The reference points at nothing; the 95% figure has no source and pushes the model away from a legitimate "environmental or timing" conclusion.
- **Confidence:** Low
- **Action:** flag. Fix would be: "(step 5 above)"; delete the 95% sentence.


#### test-driven-development

**Finding 77 — test-driven-development digraph and examples.** Withdrawn (keep-list 8): the digraph agrees with the prose and the Good/Bad code pairs are format-pinning examples (keep-list 7); bulk and language choice alone are not findings.


#### using-git-worktrees

### Finding 78 — using-git-worktrees: ecosystem setup script and test-command list
- **Location:** `SP/using-git-worktrees/SKILL.md:104-119, :125-128, :142-157`
- **Evidence:** "if [ -f package.json ]; then npm install; fi ... if [ -f requirements.txt ]; then pip install -r requirements.txt; fi ... poetry install ... go mod download" and "npm test / cargo test / pytest / go test ./..."
- **Pattern:** Group 2 (verbose SKILL.md explaining things the model knows; Step 3 deletion rule)
- **Why obsolete:** The model knows each ecosystem's setup; the script auto-runs `pip install -r` into whatever interpreter is active. The Step 0 submodule guard and sandbox fallback are exact scripts for fragile git state and stay; the Quick Reference table agrees with the steps.
- **Confidence:** Low
- **Action:** flag. Fix would be: "Run the project's normal setup and baseline test command."


#### writing-plans

### Finding 79 — writing-plans: duplicated trait claim and a fixed "five"
- **Location:** `SP/writing-plans/SKILL.md:30, :81, :163`
- **Evidence:** "You reason best about code you can hold in context at once, and your edits are more reliable when files are focused." (also brainstorming L229) / "The five input classes or failure modes ..." / "The five uncovered ones most likely to bite a person"
- **Pattern:** Group 1a (trait claim about the model) + 1b (fixed count)
- **Why obsolete:** The reasoning behind small files is sound but is a claim about an older context regime; a fixed five can force padding or truncate a sixth real risk. The plan header, Interfaces and Global Constraints blocks are real contracts and stay.
- **Confidence:** Low
- **Action:** flag. Fix would be: "list the input classes most likely to bite, most likely first".


#### writing-skills

### Finding 80 — writing-skills: unverified context claim and self-contradicting flowchart rule
- **Location:** `SP/writing-skills/SKILL.md:288, :310-313`
- **Evidence:** "`@` syntax force-loads files immediately, consuming 200k+ context before you need them." / "**Never use flowcharts for:** ... Linear instructions → Numbered lists"
- **Pattern:** Group 2 (volatile claim without verification date; internal inconsistency with sibling skills that use digraphs for linear flows)
- **Why obsolete:** The size claim is undated; brainstorming, executing-plans, SDD and TDD each carry a digraph that duplicates a linear checklist, which this rule forbids.
- **Confidence:** Low
- **Action:** flag. Fix would be: drop "200k+" or date it.


#### claude-md-management

### Finding 81 — claude-md-improver / revise-claude-md: brevity-as-criterion, `#` shortcut, tool list
- **Location:** `CMM/skills/claude-md-improver/SKILL.md:46, :99, :157-158`; `CMM/commands/revise-claude-md.md:3, :19, :29`
- **Evidence:** "| Conciseness | Medium | No verbose explanations or obvious info? |" / "**Keep it concise**: CLAUDE.md should be human-readable; dense is better than verbose" / "`#` key shortcut: During a Claude session, press `#` to have Claude auto-incorporate learnings into CLAUDE.md" / revise: `allowed-tools: Read, Edit, Glob` but L19 runs `find`; L29 "**Keep it concise** - one line per concept."
- **Pattern:** Group 1c ("make it short" frame; the audit rubric says cruft is not length) + Group 2 (unverified product claim; tool list lacks Bash)
- **Why obsolete:** A conciseness score pushes the model to shorten files like this project's detailed CLAUDE.md; the `#` shortcut is undated product behavior not verified here.
- **Confidence:** Low
- **Action:** flag. Fix would be: replace the Conciseness criterion with "every line changes behavior"; verify or drop the `#` tip; add Bash to the command's allowed tools.


#### claude-automation-recommender

### Finding 54 — Output template shows an install command that is not complete
- **Location:** `CCS/SKILL.md:173`
- **Evidence:** "**Install**: `claude mcp add context7`"
- **Pattern:** Group 2 (command that does not work as written)
- **Why obsolete:** `claude mcp add` is recalled to need a server name plus a command or URL (and transport); if so the bare form is missing the launch argument and the user-facing output tells the reader to run something that errors. Not verified from here; reference files not re-read.
- **Confidence:** Low (command form recalled from the installed tool, not verifiable from the repository; also listed under Unverified)
- **Action:** flag. Fix would be: give the full command from `references/mcp-servers.md` or say "see references".


### Finding 82 — claude-automation-recommender: unverified catalog names and flags, scripted preamble/closer, skills path convention
- **Location:** `CCS/SKILL.md:92-100, :160, :181, :210-212, :261, :286`
- **Evidence:** "Create skills in `.claude/skills/<name>/SKILL.md`" and plugin names "skill-development / plugin-dev, commit / commit-commands, writing-rules / hookify, anthropic-agent-skills - Core skills bundle" / "**Debugging**: Use `--mcp-debug` flag" / `"Bash(npm test:*)"` / scripted "I've analyzed your codebase and identified the top automations ..." and "**Want more?** ... **Want help implementing any of these?**"
- **Pattern:** Group 2 (volatile specifics not verified; project-convention mismatch: this user's rule is a category prefix for project skills) + 1d (scripted preamble/closer)
- **Why obsolete:** Plugin names, the `--mcp-debug` flag and the `:*` permission suffix are undated claims; the preamble/closer conflict with i-have-adhd Rule 10 when both are active. The five reference files it points to exist.
- **Confidence:** Low
- **Action:** flag. Fix would be: verify the names/flags against current docs or point to the reference files; drop the scripted preamble/closer.


#### fire-inspection-timesheet (synced)

### Finding 83 — fire-inspection-timesheet: unenforced "master is the most recent timesheet" and unexplained script ban
- **Location:** `SY/fire-inspection-timesheet/SKILL.md:62, :265 vs :225-244, :251-257`
- **Evidence:** L265 "The master (`Time Sheet - Master.docx`) is always the most recently completed timesheet." vs Step 4 writes only `YYYY-MM-DD-Vergo.docx`; L62 "Do NOT use pack.py or unpack.py — work directly with zip/unzip."; checks 4 and 7 at L254/L257 both say no prior-week data remains.
- **Pattern:** Group 2 (unenforced claim; rule without its reason; duplicate check)
- **Why obsolete:** No step promotes the new sheet to Master, so the sentence describes a manual habit; the pack/unpack ban lacks the reason given elsewhere (L229, ink delta `"` characters). The XML regexes, row/paraId structure and raw-`zip` instruction are exact scripts for a fragile operation and stay (the CRITICAL at L227 carries its reason).
- **Confidence:** Low
- **Action:** flag. Fix would be: add the reason to L62; state how the master gets refreshed or drop the claim.


#### cba-verify (synced)

### Finding 84 — cba-verify: booster density on the "every figure" rule
- **Location:** `SY/cba-verify/SKILL.md:33-39`
- **Evidence:** "discover EVERY figure from the master and reconcile; no fixed list. Total coverage of quantitative drift is the goal — never a preset checklist." / "d. **Never silo to a subset** — every `%`, `$`, stipend, hour, day, multiplier, and count in the contract is in scope"
- **Pattern:** Group 1a (booster repetition; the rule is stated at L33, L35 and L37)
- **Why obsolete:** Fable 5.1 is exhaustive by default; the reason (negotiated numbers must match everywhere before they reach the table) is the keeper. The read-only and financial-model fences are repeated (L3, L11, L14, L25, L61, L69, L72) but agree and guard a high-stakes read, so keep-list 3/8 applies and they are not findings.
- **Confidence:** Low
- **Action:** flag. Fix would be: one sentence "Extract every quantitative value from the master; no preset list".


#### cba-sync (synced)

### Finding 85 — cba-sync: retired-skill reference and "zero tolerance"
- **Location:** `SY/cba-sync/SKILL.md:38, :60`
- **Evidence:** "(This absorbs the `cba-ledger` role.)" / "Zero tolerance before hand-off."
- **Pattern:** Group 1d (migration-relative phrasing) + 1a
- **Why obsolete:** Refers to a skill the model never saw; "zero tolerance" restates the self-check at L60 as a threat. Preview-and-confirm, snapshot-before-overwrite and never-touch-authored-content are destructive-write guards stated several times (L11, L51, L67-68, L74) with agreeing wording; kept per keep-list 3/8. The two named script functions exist (`normalize(paras)`, `reflow_docx_district_cells(path, col_index=1)` in `scripts/normalize_district.py`).
- **Confidence:** Low
- **Action:** flag. Fix would be: delete L38's parenthetical.


#### send-to-wife (synced)

### Finding 86 — send-to-wife: banned filler phrases, one article's lesson generalized, hardcoded number repeated
- **Location:** `SY/send-to-wife/SKILL.md:3, :11, :37, :39-40, :48, :63, :70`
- **Evidence:** "No filler phrases ("In this video...", "The article explores...", "Overall...")" / "if the article is about government overreach, policy implications, legal rights, or systemic issues, lead with that. Don't soften it into generic advice (e.g., "privacy is important")." / the phone number appears in the description, L11, L48, L63 (different format: `sms:(914)755-6463`) and L70; also in voice-dispatch L33
- **Pattern:** Group 1e (banned-phrase list; positive instruction "Lead with the substance" already there) + Group 2 (recency trap; duplicated volatile fact)
- **Why obsolete:** The "lead with overreach" rule reads as one session's stumble turned into a standing editorial slant for every URL; a single phone number kept in five formats drifts silently.
- **Confidence:** Low
- **Action:** flag. Fix would be: delete the filler list and the slant paragraph; keep the number once (L48) and reference it.


#### voice-dispatch (synced)

### Finding 87 — voice-dispatch: parse script, undefined convention, archive step without a source, duplicated hub list
- **Location:** `SY/voice-dispatch/SKILL.md:45-56, :104-106, :125-171, :16-18, :24-31 vs :141-148, :33`
- **Evidence:** "Action type ... Hub ... Key details ... Urgency" analysis script / "Use Alex's bracket-tag naming convention if creating a new conversation reference" (never defined) / Step 5 "move both the .m4a and .txt files from the inbox into the processed folder" vs intake "he pastes the text here" / "Use the Filesystem MCP tool to move the files."
- **Pattern:** Group 1c (script for a judgment task the model does by default) + Group 2 (dangling reference; step presumes an input path the intake does not establish)
- **Why obsolete:** No step identifies which inbox file a pasted transcript came from, and the file move depends on a connector this host may not have. The hub taxonomy, slug table, filename scheme and the draft-unless-"send" Gmail rule are real author-only context and stay; the confirm-before-execute flow is a sound gate.
- **Confidence:** Low
- **Action:** flag. Fix would be: define the bracket-tag convention or drop it; make Step 5 conditional on the files being reachable.


#### medic-shift-scan (synced)

### Finding 88 — medic-shift-scan (synced copy): dated attributions
- **Location:** `SY/medic-shift-scan/SKILL.md:10, :32`
- **Evidence:** "The scripts implement the rule as of 2026-07-19" / "(Alex 2026-07-19: meetings are not shifts)"
- **Pattern:** Group 2 (time-sensitive content / history narrative)
- **Why obsolete:** Dates add no rule; the stale-copy problem is Finding 18. The body is otherwise clean: NEVER-pick-up and no-password-echo hard limits carry their reasons, run steps are exact script invocations for a login-fragile scrape, and the failure-mode list is calibrated.
- **Confidence:** Low
- **Action:** flag. Fix would be: handled by replacing the copy (Finding 18).


---

# Counts per group and confidence

| Group | High | Medium | Low | Total |
|---|---|---|---|---|
| 1a pressure language | 5 | 3 | 2 | 10 |
| 1b scaffolds / numeric caps / cadence | 6 | 3 | 0 | 9 |
| 1c over-specification | 0 | 8 | 4 | 12 |
| 1d fossils / suppressors | 0 | 2 | 3 | 5 |
| 1e prohibition clusters | 1 | 4 | 1 | 6 |
| 1f output-shaping choreography (primary only) | 0 | 1 | 0 | 1 |
| **Group 1 subtotal** | 12 | 21 | 10 | 43 |
| Group 2 brittle skills / conflicts / drift | 7 | 24 | 10 | 41 |
| Group 3 tool descriptions / trigger text | 0 | 1 | 0 | 1 |
| Group 4 request config | n/a | n/a | n/a | n/a |
| **All groups** | 19 | 46 | 20 | 85 |

---

# Twin-diff verdicts (synced copy vs local-plugin twin)

Method: `diff -u` of the two `SKILL.md` files (md5 differs for all four). Caveat for all four: this session's available-skills list shows only the local-plugin copies (`gufa:cba-verify`, `gufa:cba-sync`, `cprps:shift-scan`, `fire:inspection-timesheet`); the synced custom copies do not appear, so drift is latent here and live wherever the claude.ai library copies load (Cowork).

**1. cba-verify (synced) vs `gufa/skills/cba-verify`: AGREE on every rule.** Only difference is a 2-line paragraph added to the local copy after the frontmatter:
`+**Source of truth: this plugin folder (`~/.claude/local-plugins/gufa/skills/cba-verify/`).** Keep a copy uploaded to the claude.ai skills library so Cowork can run it: after any edit here, zip this folder and upload it in claude.ai Settings (replacing the old upload) so the two stay identical. Claude Code then lists it twice (`gufa:` and `anthropic-skills:`); that is expected.`
No finding for the copy itself (keep-list 8: agreeing copies).

**2. cba-sync (synced) vs `gufa/skills/cba-sync`: AGREE on every rule.** Identical single addition (same "Source of truth" paragraph with `cba-sync` in the path). Both copies share Findings 19, 20, 60, 61.

**3. medic-shift-scan (synced, 62 lines) vs `cprps/skills/shift-scan` (83 lines): DISAGREE on rules (High, Finding 18).** Differing lines, synced then local:
- Mode: "On-demand only — no automatic runs." / "Runs on demand, plus a daily scheduled quiet scan (see Scheduled quiet mode)."
- Eligibility: "scoring each posting against his Hartsdale FD schedule" / "scoring each posting against his Hartsdale FD schedule and his own booked medic shifts" (local description adds "no collision with his own medic shifts, classifies coworker posts Drop vs Trade, diffs against the last scan").
- Canonical ruleset: "**Canonical ruleset lives in the project doc `claude/shift-pickup-rules.md`** ... The scripts implement the rule as of 2026-07-19" / "**Canonical ruleset: `$SKILL_DIR/shift-pickup-rules.md`** (shipped from the repo; the repo copy is canonical — the old Cowork project doc is just a pointer)".
- Source of truth: none stated / "**Source of truth: the git repo at `/Users/alex/Developer/Medic Shifts`.** This plugin copy is synced from it; edit there, then re-copy".
- Hard limits: synced has no equivalent of "NEVER created in scheduled runs" or "ONE W2W login per run — repeated logins trigger a captcha lockout."
- Fetch: "pulls the monthly tradeboard for the current month + 3" / "in All, Drop, Trade, and TD views (16 fetches ...)".
- Kinds: "`open`, `trade_post` (coworker's post — may require a swap; always report separately)" / adds `drop_post` ("coworker drop or TD post — clean pickup possible"); local also adds "Exit 2 = W2W markup drift — stop and report".
- Steps: synced has 10 steps with `project_read`/`project_write` snapshot (`claude/medic-shift-last-scan.json`); local has 11 steps with `parse_mysched.py`, a family-events step, `diff_scans.py` writing `last-scan.json` at the repo root, and a hold lifecycle ("skip any whose description already carries the same w2w_id").
- Retries: "A month won't validate after 5 retries" / "after 8 retries".
- Local-only sections: "## Scheduled quiet mode" (PushNotification rules, "Silence must mean 'no news', never 'it broke'") and failure modes for `parse_tb` exit 2 and `parse_mysched`.
- Data notes: local adds "Gaps are TRUE elapsed hours (DST-aware)" and "DROP = clean pickup ... TRADE = swap required ... Both eligible, always distinguished."
- Scripts: synced `scripts/` has `build_tracker.py`, `parse_tb.py`, `score_shifts.py`, `w2w_fetch.py`; local also has `parse_mysched.py` and `diff_scans.py`.

**4. fire-inspection-timesheet (synced) vs `fire/skills/inspection-timesheet`: body AGREES (278 lines identical); two frontmatter lines differ.**
- `name: fire-inspection-timesheet` / `name: inspection-timesheet` (expected: plugin naming drops the domain word).
- Description trigger sentence: "Also triggers automatically every Friday at 8am via the fire-inspection-timesheet scheduled task." / "Also triggers automatically every Friday at 8am via the local fire-inspection-timesheet-weekly scheduled task (Claude Code)."
Both copies claim the Friday 8am trigger through different scheduled-task names (Finding 56, Medium). Both bodies keep Cowork-only `/sessions/<id>/mnt` paths (Finding 57).

---

# Per-file verdicts (SKILL.md line counts)

Superpowers 6.4.1 (`SP/<skill>/SKILL.md`):
- `using-superpowers` (65): dated, shouted, loaded every session; Findings 1, 2, 21, 22, 23. Worst file per token.
- `brainstorming` (285): reasoned approval gate is sound; numeric caps, default-to-heavy and one-question rules need work; Findings 7, 23, 27, 28, 70 (Low).
- `diagnosing-superpowers` (120): clean; exact privacy/scrub procedure, reasoned prohibitions, and all 18 referenced files exist (Finding 71 withdrawn).
- `dispatching-parallel-agents` (167): single gold brief and session narrative; Finding 29 (Finding 72 withdrawn).
- `executing-plans` (373): mostly reasoned, scripts exist; narration cap, example, model-tier remark; Findings 8, 30, 73.
- `finishing-a-development-branch` (225): clean apart from the announce ritual (Finding 21); exact scripts for fragile git state are correct to keep.
- `receiving-code-review` (205): banned-phrase style rules, misattributed "your human partner's rule"; Findings 35, 36, 75.
- `requesting-code-review` (95): `HEAD~1` conflict and duplicate Never list; Findings 10, 33, 34.
- `subagent-driven-development` (568): large but mostly reasoned; Findings 8, 9, 30, 31, 32, 74.
- `systematic-debugging` (283): boosters and a generic method script; Findings 12, 36, 40, 41, 76.
- `test-driven-development` (330): delete-and-restart register, seven-fold repetition; Findings 13, 42, 43 (Finding 77 withdrawn).
- `using-git-worktrees` (167): exact detection/guard scripts are correct; Findings 21 (announce), 78 (setup script).
- `verification-before-completion` (120): ALWAYS/ANY density; Findings 11, 37, 38, 39. Common Failures table is a good keeper.
- `writing-plans` (192): plan-header contract is sound; persona and label drift; Findings 21, 44, 45, 79.
- `writing-skills` (681, 3,814 words): self-contradicting authoring doctrine; Findings 14, 46, 47, 48, 49, 80.

Ponytail 4.0.0 (`PT/<skill>/SKILL.md`):
- `ponytail` (93): Findings 5, 6, 26, 68.
- `ponytail-help` (58): clean (reference card; env var, config path and GitHub URL unverified).
- `ponytail-review` (56): clean apart from Low Finding 69; format-pinned output contract is a keeper.

Other plugins:
- `claude-md-improver` (179): Findings 50, 51, 81.
- `revise-claude-md.md` (54): Findings 50, 52, 81.
- `claude-automation-recommender` (289): Findings 15, 53, 55 (Medium), 54, 82 (Low).
- `i-have-adhd` (142): injected every session; Findings 2, 3, 4, 24, 25, 67. The five-facts context, destructive-action override and rule/harness override (L119-128) are good keeps.

Synced user-authored (`SY/<skill>/SKILL.md`):
- `fire-inspection-timesheet` (278): exact XML scripts and the CRITICAL zip rule (with reason) are correct to keep; Findings 56, 57, 83.
- `voice-dispatch` (190): sound confirm-before-execute gate and author-only context; Findings 17, 63, 64, 65, 87.
- `cba-verify` (75): high-stakes read-only skill, mostly keep-list material; Findings 19 (as target), 20, 58, 59, 84.
- `cba-sync` (78): destructive-write guards correct to keep; Findings 19, 20, 60, 61, 85.
- `medic-shift-scan` (62): body clean for its generation; stale versus twin; Findings 18, 88.
- `send-to-wife` (79): Findings 16, 17, 62, 86.
- `frontend-design` (42, extra): Finding 66.

# Anthropic-authored synced skills (listed, bodies not audited)

Tagged `anthropic-example`: docs (6), import-memory (89), learn (78), web-artifacts-builder (73), mcp-builder (236), morning (152), skill-creator (485). Tagged `anthropic`: xlsx (99), pdf (314), pptx (241), docx (91).

# Unverified (not probed, per instructions)

- Paths and IDs inside the synced skills: OneDrive `GUFA_*` files and the `04 - GUFA` folder, the hub `CBA/` and `00_CURRENT_NEGOTIATION/` folders, `Documents/Claude Cowork/Work/...`, Google Calendar IDs, `/Users/alex/Developer/Medic Shifts`, iCloud `VoiceDispatch/`, `/sessions/<id>/mnt`, claude.ai project doc `claude/shift-pickup-rules.md`.
- Whether the scheduled tasks `fire-inspection-timesheet` and `fire-inspection-timesheet-weekly` exist and are both enabled.
- Third-party product claims not checked against current Claude Code docs: `.claude.local.md` vs `CLAUDE.local.md` (Finding 50), the `#` memory shortcut, `--mcp-debug`, `claude mcp add <name>` form (Finding 54), `tools:` vs `allowed-tools:` in skill frontmatter (Finding 53), the `:*` permission suffix.
- Whether the synced custom copies are loaded in Claude Code in this install (they are absent from this session's skill list).
- Reference-file bodies (superpowers prompts/templates/`code-reviewer.md`/`implementer-prompt.md`, claude-md-improver references, recommender references) were not read.
