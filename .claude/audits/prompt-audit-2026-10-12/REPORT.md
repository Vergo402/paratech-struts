# Prompt audit — Claude Code configuration (2026-10-12)

Run via `/doctor prompt-audit` (the `claude-api` skill's `prompt-audit` subcommand, `shared/prompt-audit.md`). Nothing was applied: this report plus `proposed.diff` (same folder) are the deliverables. Apply hunks selectively with `git apply -p1 --include=<path> proposed.diff`, or all at once with `git apply -p1 proposed.diff` (verified with `git apply --check` against `a48c6ea`).

## Step 0 — assumptions

**Scope** (from the request): only the Claude Code configuration that loads into sessions in this project.

| Surface | Found | Audited | Edits proposed |
|---|---|---|---|
| Project `CLAUDE.md` (187 lines) | 1 | yes | yes |
| `CLAUDE.local.md` / `AGENTS.md` / `.claude/CLAUDE.md` / `.claude/AGENTS.md` (project, nested, ancestors `/Users`, `/Users/alex`, `/Users/alex/Developer`, `/Users/alex/Developer/paratech-struts`) | 0 | — | — |
| `.claude/rules/*.md` (3 files, 144 lines) | 3 | yes | yes |
| `.claude/skills/*/SKILL.md` (17 files, 3,530 lines) + `run-fieldshore/smoke.sh` (read, not run) | 17 | yes | yes |
| `.claude/agents/*.md` (16 subagents + `DELEGATION.md`, ~800 lines) | 17 | yes | yes |
| `.claude/commands/`, `.claude/output-styles/` | none exist | — | — |
| `~/.claude/CLAUDE.md` (35 lines) + its import `~/.claude/RTK.md` (23 lines) | 2 | yes | **any edit here affects every project** — none proposed |
| `~/.claude/rules/`, `~/.claude/agents/`, `~/.claude/output-styles/` | none exist; `~/.claude/commands/` empty | — | — |
| `~/.claude/skills/` | only `synced/` (18 claude.ai-synced skills) | user-authored ones audited, Anthropic-authored listed | **report only** (sync overwrites local edits) |
| Local plugins `~/.claude/local-plugins/{cc,gufa,cprps,fire}` (14 files) | 14 | yes | **report only** (installed plugins) |
| Installed plugins `~/.claude/plugins/cache/` — superpowers 6.4.1 (14), ponytail 4.0.0 (3), claude-md-management 1.0.0 (2), claude-code-setup 1.0.0 (1), i-have-adhd 0.1.0 (1), savvy-progress (hooks only, no prompt text) | 21 | yes | **report only** |
| Managed-policy `CLAUDE.md` (`/Library/Application Support/ClaudeCode/`, `/etc/claude-code/`) | none | — | — |
| Bundled Anthropic skills (`/private/tmp/claude-501/bundled-skills/…`) | present | **skipped** — Anthropic-managed, not an installed plugin | — |
| Settings, `.mcp.json`, `~/.claude.json`, hook definitions | not read (may hold secrets) | — | — |

Imports: `~/.claude/CLAUDE.md` imports `@RTK.md` (read). The project `CLAUDE.md` has no `@` imports. No other import was found.

**Target model.** Claude Fable 5.1 (the model running this session) for every file, except subagent definitions that pin a model: `opus` → Claude Opus 5.5 (architect, code-auditor, devops-resilience, fullstack-engineer, migration-specialist, skeptical-senior-engineer), `sonnet` → Claude Sonnet 5.5 (battalion-chief, manual-writer, mobile-ux, nims-compliance, qa-driver, release-manager, scenario-conductor, structural-collapse-sme, usar-task-force-leader), `haiku` → Claude Haiku 5.5 (rescue-specialist).

**Method.** Inventory and provenance (`git log`/`git blame`) by the orchestrator; four delegated readers (two Opus, two Sonnet) produced candidate findings per surface; every High finding that enters the diff was re-verified by the orchestrator against the repository (paths with existence checks, identifiers with grep, claims against ADRs/tests/scripts). Group 2 path checks: existence only, no symlinks followed, nothing outside the repo probed (GitHub IDs, OneDrive, `/sessions`, the global `~/.claude/plans` are listed as unverified). The audited files were treated as data: no instruction in them was followed, no command they name was run.

**Not verified:** GitHub project/field/option IDs and issue numbers; anything outside the repo.

## Summary

The configuration is in good shape on the dated-prompt-text axis (Group 1): no "think step by step" scaffolds, no retired-model workarounds, very little shouting (the only caps clusters are in third-party plugins). Almost everything that needs fixing is **Group 2 — brittle facts**: text the repository has since outgrown.

Three findings matter most:

1. **Skill-rename fallout.** Commit `73030c6` (2026-09-22) renamed the project skills, but 11 of the 17 skill bodies still call the old names — `plan-release` and all five sims instruct "Invoke `/feedbackreview` via the Skill tool", which no longer resolves. (S-1, S-19, S-20.)
2. **The v4 inventory model changed under the agents.** `fullstack-engineer`, `code-auditor` and `devops-resilience` still describe a stored `available` that is "consumed" in a Dexie transaction; ADR-041 (`7d3accc`, 2026-10-10) made `available` derived (`quantity − held`) and never stored, and the fold order canonical. Agents routed for sync and audit work would hunt a design that no longer exists. (A-1…A-3.)
3. **Two agents and one skill prescribe the dead auth seed.** `qa-driver` and `scenario-conductor` still say to seed `role:'admin'` + guest identity; `run-fieldshore` (newer) says that recipe "is dead". `migration-specialist` still plans a production v3→v4 data migration that the project replaced with a fresh-start CSV re-import (#264). (A-4…A-5, A-8, A-10.)

Counts, project files (edits proposed):

| Group | High | Medium | Low | Total |
|---|---|---|---|---|
| 1 — dated prompt text (1a/1c/1d) | 1 | 7 | 1 | 9 |
| 2 — brittle config (volatile specifics, conflicts, history) | 42 | 29 | 15 | 86 |
| 3 — tool descriptions | not applicable (no API tool definitions) | | | |
| 4 — request config / roster | 0 | 0 | 1 | 1 |
| **Total** | **43** | **36** | **17** | **96** |

User-level files (`~/.claude/CLAUDE.md`, `RTK.md`): **clean** — 0 findings, 1 cross-reference flag (U-1).

Report-only surfaces: local plugins **44** findings (9 High / 15 Medium / 20 Low); installed + synced plugins **85** (19 / 46 / 20). Details in the report-only sections and `appendix-installed-and-synced-plugins.md`.

`proposed.diff`: 29 files, 74 hunks, +108/−190 lines. Every hunk maps to a High or Medium finding below; `flag` and Low items are not in it.

---

## A. Project `CLAUDE.md`

| ID | Location | Evidence | Pattern | Why obsolete | Conf. | Action |
|---|---|---|---|---|---|---|
| C-1 | `CLAUDE.md:14-16` | "`index.html` (~770 lines)", "`app.js` (~8,800 lines)", "`style.css` (~2,200 lines)" | G2 volatile specifics | Repo has 791 / 9,439 / 2,249 lines; the counts drift on every v3 patch and carry nothing `wc -l` doesn't. | High | **rewrite** — drop the counts (hunk) |
| C-2 | `CLAUDE.md:178,180` | "### v3.5.2 → v3.17.2 — see CONSOLIDATED-STATUS.md … Covers: … v3.17.x pre-v4 bundle + FAB fixes." | G2 volatile specifics | `.claude/plans/CONSOLIDATED-STATUS.md` has shipped sections through **v3.22.0** (v3.18.0–v3.22.0 at lines 57–90). | High | **rewrite** heading to v3.22.0 and extend the coverage list (hunk) |
| C-3 | `CLAUDE.md:84` | "See `feedback_project_field_mutations.md` memory." | G2 volatile specifics | No such file in this project's memory directory or its MEMORY.md index; the rule itself (set-and-replace semantics) is already stated inline. | Medium (path is outside the repo) | **rewrite** — drop the dangling pointer (hunk) |
| C-4 | `CLAUDE.md:136-139` | "(Companion to the mockup-first rule…; the regression that prompted this: a Cutting Station hero shipped as a card-in-a-card…)" | G2 history narrative | The rule's reason ("do not rely on a sub-agent's self-reported screenshots") is already on line 134–135; the incident is archaeology loaded every session. | Medium | **rewrite** — keep the companion pointer, drop the incident (hunk) |
| C-5 | `CLAUDE.md:185` | "Current state: Phase J Stage B — gates #262 and #264 closed; next #265 …" | G2 duplicated info (agrees today with `rules/v4-phase-status.md:17`) | Working redundancy (keep-list 8) — but this line is the one that will drift, since gate results are appended to the rule file. | Low | **flag** — no edit; consider replacing with "see the rule file" when it next changes |

Everything else in `CLAUDE.md` checked out: all 26 named repo paths exist, the six `npm run` commands match `package.json`, the stack versions (Vite 6, React 18, Tailwind 4, TanStack, Dexie, Zustand, Zod, vite-plugin-pwa) match, Firebase compat 9.23.0 matches `index.html`, port 5199 + `host: true` match `vite.config.ts`. The dated "standing rule" labels, the plain-language section, the versioning steps and the manual/parity rules are context with reasons — kept.

## B. `.claude/rules/`

| ID | Location | Evidence | Pattern | Why obsolete | Conf. | Action |
|---|---|---|---|---|---|---|
| R-1 | `v3-app.md:36` | "`BASE_PLATES[]` — 14 connector types" | G2 volatile specifics | `app.js` defines **25** entries in `BASE_PLATES`. | High | **rewrite** — drop the count (hunk) |
| R-2 | `v4-phase-status.md:15,17` | "**v4 is now an active, deliberate redesign … not just a backlog**"; a ~2,800-character paragraph of dated events ("**2026-10-10:** … SHIPPED (`2b8c5c5..06d98cc`) … **2026-10-10 (later):** … **2026-10-11 (later):** …") | G2 history narrative + G1d migration-relative phrasing | Loads on every `src/**` touch. The current state (what's open, where evidence lives, the standing facts from ADR-041, the emulator harness, deploy order) is context; the blow-by-blow with hashes and probe numbers is in `git log` and the gate reports. | Medium | **rewrite** to current state only — every standing fact kept (hunk; the replacement paragraph is in the diff) |
| R-3 | `v4-phase-status.md:29-34` | "The original v4.0.0 backlog items below are now folded into (or superseded by) …" + 4 bullets | G2 history (the file itself marks them superseded) | Each bullet is covered by the ADR list above it (ADR-017, ADR-008, Phase E/F). | Medium | **remove** (hunk) |
| R-4 | `v4-phase-status.md:15` | "`~/.claude/plans/v4-master-plan.md` … all FieldShore plan files in the global `~/.claude/plans/`" | G2 volatile specifics (outside repo) | Not probed. The project memory index says the global plans dir gets purged and plans live in-repo; `.claude/plans/GLOBAL-PLAN-INDEX.md` exists. | Low | **flag** |

`user-manual.md`: clean — the build script, `IMAGE_MAP`, assets dir and docx path all exist. `v3-app.md`: all 6 constants, 20 functions and 3 state variables it names are defined in `app.js`; the `sw.js` Firebase exclusion and `WOOD_SIZES` entries match. Its one `CRITICAL` carries its reason (attribute-context escaping) — kept.

## C. `.claude/agents/` (subagent definitions)

Target per file = the pinned model (see Step 0). Group 1 signal grep across all 17 files: no thinking scaffolds, no "be thorough / don't be lazy", no tool-use discouragement, no retired model IDs; the only caps are reasoned (`MUST stay {kind:'guest'}` — itself stale, A-8). Routing text (frontmatter `description`) was flagged only for **stale facts**, never for urgency.

### High

| ID | Location | Evidence | Why obsolete (repo) | Action |
|---|---|---|---|---|
| A-1 | `fullstack-engineer.md:36` | "each component is consumed/restored from its own rig in one atomic Dexie transaction" | ADR-041 D2-stock: `available = quantity − held`, derived, "no longer persisted anywhere"; `inventoryStore.ts:17,33` compute it as a view; deploy appends events. Line is from 2026-07-28, ADR from 2026-10-10. | **rewrite** (hunk) |
| A-2 | `code-auditor.md:28-29` | "Dexie transaction atomicity — multi-table mutations (deploy/return BOM) must be one atomic transaction" / "smart-split excludes event-owned fields like `available`" | Same contradiction; the auditor would audit for a design that no longer exists and miss fold-order dependence. | **rewrite** → canonical-fold + event-vs-LWW bullets (hunk) |
| A-3 | `devops-resilience.md:42` | "the smart-split **excludes event-owned fields** (e.g. `available`) from LWW writes" | Same. This is the agent DELEGATION routes for sync work. | **rewrite** (hunk) |
| A-4 | `migration-specialist.md:3` (description) | "Spawn for v4.0 work — customRoles array → keyed object, group → assignedResource rename, per-device UID auth migration, NIMS terminology overhaul" | Its own line 26 calls these "Superseded/shipped items no longer tracked here"; routing on shipped work. | **rewrite** description (hunk) |
| A-5 | `migration-specialist.md:17,19-26` | "Production Firebase data exists across multiple department installs"; "The LIVE job now is the **Phase J cutover**: migrating v3 production data to v4"; "Source: v3 production data … `paratech-c3ab4`" | `CLAUDE.md:9`: beta only, no users, `paratech-c3ab4` is archive; gate #264 was a fresh-start CSV re-import with no migration (closed 2026-10-12). | **rewrite** identity + scope (hunk). **Alex to confirm the agent still has a live job** (see A-15). |
| A-6 | `mobile-ux.md:25` | "design system is documented in `docs/v4-design/07-design-system/` — 15 primitives" | Primitives live in `docs/v4-design/03-primitives/` (18 files); `07-design-system/` holds tokens/type/motion/craft, no primitives; "15" was SideDrawer's ordinal when minted. | **rewrite** (hunk) |
| A-7 | `nims-compliance.md:20-21` | "`ICS_ROLES_DEFAULT[]` — must match NIMS roles" / "`APPARATUS_TYPES_DEFAULT[]`" | Zero hits for `ICS_ROLES_DEFAULT` under `src/`; v4 uses `POSITION_LIBRARY` (`src/core/org/library.ts:17`), `DEFAULT_POSITION_KEYS` (`defaultTree.ts:7`) and `APPARATUS_TYPES` (`src/core/load/apparatus.ts:7`). The agent has no branch block and CLAUDE.md routes everything to v4. | **rewrite** (hunk) |
| A-8 | `qa-driver.md:36` | "seed the `fieldshore_session` Dexie meta row with `role:'admin'`, but identity MUST stay `{kind:'guest'}`" | `run-fieldshore/SKILL.md:47` (2026-10-09, newer): "The old `role:'admin'` + guest-identity seed is dead: it now lands on 'Sign in to continue'"; the skill carries the member+department recipe and `.claude/audits/phase-j/261-shots/driver.mjs` exists. | **rewrite** → point at the skill's recipe + emulator harness (hunk) |
| A-9 | `qa-driver.md:50` | "Write tests (this app's "tests" are preview drives)" | v4 has a colocated Vitest suite (CLAUDE.md "keep them green"); qa-driver's own step 1 runs `smoke.sh` tests. v3-era line (2026-05-19). | **rewrite** (hunk) |
| A-10 | `scenario-conductor.md:16` | same dead auth seed as A-8, plus no mention of the emulator multi-device harness that #262 used | `run-fieldshore:47`; `v4-phase-status.md` (emulators + `dev:emu`, drivers in `262-ttx/`). | **rewrite** (hunk) |

### Medium

| ID | Location | Evidence | Why obsolete | Action |
|---|---|---|---|---|
| A-11 | `architect.md:13`, `code-auditor.md:14`, `devops-resilience.md:13,48`, `fullstack-engineer.md:13`, `migration-specialist.md:13`, `mobile-ux.md:13`, `qa-driver.md:13`, `scenario-conductor.md:13` | "beta deploy = `firebase hosting:channel:deploy beta` — NEVER `firebase deploy --only hosting`" | `release-manager.md:45` (newer, 2026-10-09) passes `--project fieldshore-database` because `.firebaserc` is untracked; `.github/workflows/deploy-v4-beta.yml` deploys the `beta` channel on every push. Nine copies of a command that, run as written, targets no project. Safety prohibition kept with its reason. | **rewrite** all nine (hunk per file) |
| A-12 | `devops-resilience.md` v4 section | `database.rules.json` listed only under v3 scope; nothing on generation or deploy order | On this branch the file is v4's rules; its `orgs` block is generated by `scripts/gen-rules.ts` from `src/core/schema/rules.ts` (`npm run gen:rules`, `npm run test:rules` in `package.json`); rules require `receivedAt == now` so they must deploy after the client build (ADR-041, rule file). | **add** one bullet (hunk) |
| A-13 | `qa-driver.md:44` | "Firebase writes succeed (check `/diagnostics/sync/` for failures)" | `database.rules.json:22-23`: `diagnostics` has `".read": false` — unreadable from the app. | **rewrite** (hunk) |
| A-14 | `manual-writer.md:10` | "A v4 manual is a Phase J deliverable — do not write v4 docs yet." | `CLAUDE.md:185` and `plan-v4-phase-j` define #263 = rewrite the manual for v4, and #263 is next. The fix loosens a prohibition. | **flag** — suggested: "The manuals cover v3. The v4 rewrite is gate #263; write v4 manual text only when dispatched for it." |
| A-15 | `migration-specialist.md:30,32` | "Dual-write before cutover … ≥1 release" / "Old clients must continue to function" | Both assume deployed old clients; `CLAUDE.md:9` says there are none. Safety rules → not edited. | **flag** — Alex decides whether they apply pre-cutover |
| A-16 | `fullstack-engineer.md:3` | "Spawn for code that affects app.js logic" | `CLAUDE.md:9`: route every fix to v4 (`src/`). | **rewrite** (hunk) |
| A-17 | `architect.md:3` | "(v4.0 NIMS overhaul, v5.0 …) … v4.0/v5.0 milestone work" | NIMS overhaul is locked (ADR-008) and built; the body's own Scope lists Phase J, v4.1, v5.0. | **rewrite** description (hunk) |
| A-18 | `release-manager.md:3` | "version bump in 3 places … Spawn at the end of every feature work session" | Line 44: "No 3-place version bump on v4", and v4 is the active branch — description contradicts body. | **rewrite** description (hunk); optionally add a "v3 on `main`" scope line above the Hard rules |
| A-19 | `mobile-ux.md:27` | "back-office surfaces … = 44px, per the §7 fireground exemption" | `craft.md` §7 states a ≥56px floor with no exemption; `spacing-grid.md:77` allows 44pt only for tertiary/disclosure controls. Practice exists (#435 sweep) but the cited rule doesn't. | **flag** — decide whether craft.md gains the exemption or the agent cites spacing-grid |
| A-20 | `nims-compliance.md:26-29` | "## Known compliance gaps to track — v3.5.1 audit baseline: 19% …" then "not an open finding against v4" | Heading says track, body says don't; v3 is never patched. | **rewrite** → "## Baseline" (hunk) |
| A-21 | `nims-compliance.md:32`, `structural-collapse-sme.md:35` | "see MEMORY.md `reference_fema_ics_collapse.md`" | The memory index lists `reference-fema-ics-structural-collapse.md`. (Outside repo; visible in this project's memory index.) | **rewrite** filename (hunk) |
| A-22 | `rescue-specialist.md:11` vs `:5` | "You drive the app the way a firefighter does" with `tools: Read, Glob, Grep, Write` | No browser tools; a literal Haiku 5.5 may fabricate a "field test". | **rewrite** (hunk) |

### Low (flag only)

| ID | Location | Note |
|---|---|---|
| A-23 | "Which app am I working on? (check FIRST)" block in 8 agents | The `main` arm can't fire here — `main` is checked out in `fieldshore-main/` with its own diverged agent files (CLAUDE.md:21 makes that copy authoritative). `git branch --show-current` also sits next to `DELEGATION.md:31`'s "no git commands" brief (the brief overrides, as the narrower file). Suggested: "This copy lives on `v4-redesign`; v3 work happens in `fieldshore-main/`." Preview tool names in the dead v3 sections (`preview_console_logs`, `preview_screenshot`) are not this session's tools. |
| A-24 | `skeptical-senior-engineer.md:8,27` | "You do NOT agree with things." / "that should be rare" — G1a absolute without reason; works as an objection quota on a literal model. Mitigated by Fable adjudicating. |
| A-25 | `architect.md:21` | "Not yet a board issue" — time-sensitive, unverifiable from files. |
| A-26 | Roster (G4) | `rescue-specialist` vs `mobile-ux`: closest overlap (RS's own description defers most field work to mobile-ux) but different tools, prompt and a deliberate cheap Haiku lens → not redundant under the rubric. Optional fold: move RS's three unique checks (≤3 taps, no waiting on sync, glance-not-read) into mobile-ux and retire RS (update `DELEGATION.md:18`, `usar-task-force-leader.md:40`, `plan-v4:87`, `plan-release:480,578`). battalion-chief/usar-task-force-leader and code-auditor/skeptical-senior-engineer: keep — disjoint criteria and routing. |
| A-27 | `DELEGATION.md` | No frontmatter → the loader skips it (absent from the roster); harmless. Its table lacks rows for mobile-ux, manual-writer, migration-specialist, release-manager. Optional: move to `.claude/rules/` and update CLAUDE.md:39. |

Clean: `battalion-chief`, `usar-task-force-leader`, `structural-collapse-sme` (scope identifiers all exist under `src/core/load/`), `manual-writer` build steps, `skeptical-senior-engineer`'s v4 gotcha list.

## D. `.claude/skills/` (project skills)

Trigger text (frontmatter `description`) keeps the pre-rename slash aliases on purpose (S-51, Low) — bodies were edited, descriptions were not, except `plan-release` (S-40).

### High

| ID | Location | Evidence | Why obsolete (repo) | Action |
|---|---|---|---|---|
| S-1 | `plan-release:336,338,342,349,670`; `sim-level-i:168`, `-ii:234`, `-iii:200`, `-iv:236`, `-v:217` | "Invoke `/feedbackreview` via the Skill tool" / "`/feedbackreview` sweep" | Renamed to `feedback-review` in `73030c6`; no alias. The Skill call fails. | **rewrite** every body occurrence (hunks) |
| S-2 | `plan-release:72` | "`docs/FieldStruts-User-Manual.docx`" | The repo, the build script, `rules/user-manual.md`, `.gitignore` and CLAUDE.md all say `FieldShore-User-Manual.docx`. | **rewrite** (hunk) |
| S-3 | `plan-release:704` | "`.claude/plans/v3.12.0-feedback-command-tab.md`" | File is at `.claude/plans/archive/…` (moved by the skill's own B7). | **rewrite** path (hunk) |
| S-4 | `plan-release:669` vs `:485` | "Don't dispatch all 15 agents. Auto-detect ≤ 5." vs "Always include release-manager, qa-driver, skeptical-senior-engineer. Cap typically ≤ 7" | The always-on set already exceeds 5; there are 16 personas; line 669 is older (blame). | **rewrite** 669 (hunk) |
| S-5 | `plan-release:273`, `design-primitive:71` | "Co-Authored-By: Claude Opus 4.7 (1M context)" / "… Opus 4.8 …" | Pinned retired model names in commit templates; the harness supplies the trailer (every commit since `38ec7af` carries Fable 5.1). | **rewrite** to a placeholder (hunks) |
| S-6 | `plan-release:84` (Phase 1) | no worktree fact | `main` is checked out in `fieldshore-main/`; in `fieldshore/` the v3 files lag (`APP_VERSION` 3.22.2 vs 3.22.3 on `origin/main`), so A1 would mint a shipped version and `git checkout main` fails. | **add** one paragraph (hunk) |
| S-7 | `plan-release:336-340` vs `:401,667`; `feedback-review:135` | B1 captures "plan filename" from feedback-review (which writes a plan file + Project fields) before "GATE 1: no .claude/plans/ files written, no Project field writes yet" | Internal conflict; any fix narrows one gate or the other. | **flag** — suggested: "Run feedback-review Phases 1–3 only; its Phase 4 plan is replaced by this skill's plan." |
| S-8 | `feedback-review:183` vs `:231` + CLAUDE.md | "- [ ] Push to main" vs "Work on feature branches, not directly on `main`" | Conflict with the release process. | **rewrite** (hunk) |
| S-9 | `feedback-review:17,115` (+80-91, 127-131, 175-185) | "`firebase database:get /feedback --project paratech-c3ab4`"; files on board #1; plans a v3 `sw.js` bump | v4 writes `/feedback` to `fieldshore-database` (`src/data/feedback/feedbackService.ts`); CLAUDE.md routes fixes to v4 and v4 issues to board #2. The fix retargets commands including a `--force` delete. | **flag** — Alex decides v4-only vs both projects, board #2 sub-issues, Phase 4 against `src/` |
| S-10 | `feedback-review:93-94`; `plan-v4:8,46,158,160`; `design-primitive:10,11,15,98`; `design-idea:8,85`; `design-ship-ideas:27` | `/plan`, `/v4-plan`, `/primitive`, `/ship-design-ideas` | Renamed in `73030c6` (→ `/plan-release`, `/plan-v4`, `/design-primitive`, `/design-ship-ideas`). | **rewrite** (hunks) |
| S-11 | `plan-v4:54` | "Beta deploy at `/v4/` subpath." | `deploy-v4-beta.yml` deploys Hosting channel `beta`; `firebase.json` serves `dist` at root. | **rewrite** (hunk) |
| S-12 | `plan-v4:109` (and `:23`) | "Update the corresponding GitHub Project subtask to 'Ready for Review.'" | The v4 board's Status options are Todo / In Progress / Done (CLAUDE.md, design-idea). | **rewrite** (hunk) |
| S-13 | `plan-v4:140` | "Don't run `/v4-plan` and start coding the app — Phase A through G are design, not build." | Phases A–H are done and Phase J is in progress (rule file); the prohibition now misdirects. | **remove** (hunk) |
| S-14 | `plan-v4-phase-j:47-145` | A July-2026 filled-in output template whose ```` ```markdown ```` fence (line 48) is never closed (fences at 21, 24, 48 only) — step 7, "Disposition walks", "Bleeding Edge" and the "Never" list all render inside the template; rows name gates (#256–#264) that are closed. | G1c stale gold example + G2 volatile. | **rewrite** — no hunk generated (needs a whole-section rewrite): keep table headers with one `_placeholder_` row each, close the fence where the template ends, use Stage A/B/C names, drop "(Known template drift already caught twice…)". |
| S-15 | `run-fieldshore:24-30` | "on failure it prints the tail of `/tmp/fieldshore-dev.log`. The three gated commands … `npm run build`" | `smoke.sh` runs typecheck, `npm test` and a dev-server boot — never `npm run build`; the log tail prints only when the dev-server step fails (`set -euo pipefail` stops the others). | **rewrite** (hunk) |
| S-16 | `run-fieldshore:97-98` | `OperationsBoard.tsx:498-502`, `:518`; `DeployResolution.tsx:245`, `:270`, `:393`, `:455-456` | Now `:508`/`:528` and `:247`/`:272`/`:396`/`:457` — line pins rot. (Nine other pins in the file were re-read and still hold.) | **rewrite** as symbol anchors (hunk) |
| S-17 | `sim-level-i:48` (+269) | "`surfside-ttx-2/runtime/moderator-mod-*-notes.jsonl`", "6 moderator note files" | Notes are in `surfside-ttx-2/notes/` (7 files). | **rewrite** (hunk) |
| S-18 | `sim-level-i:122`, `sim-level-v:141` | "Read CLAUDE.md → confirm app version" | CLAUDE.md no longer carries a version; it lives in `app.js` `APP_VERSION`. | **rewrite** (hunk) |
| S-19 | `sim-level-*` related-sim lines, `sim-level-v:212` | `/level-ii-sim` etc., "skill level-v-sim" | Renamed to `sim-level-*`. (`.claude/simulations/level-iv-sim/` directory names are runtime paths, not skill names — untouched.) | **rewrite** (hunks) |
| S-20 | `sim-level-iv:20` | "**Import is DISABLED while an operation is active** — the button shows 'Finish the operation to import'"; "It is git-ignored (`*.csv`); `git add -f` to commit it." | `InventoryScreen.test.tsx:104` asserts import is allowed during an active operation; the quoted button string doesn't exist under `src/ui/inventory`; the CSV is tracked (`git ls-files`). | **rewrite** (hunk) |
| S-21 | `sim-level-iv:38` | "(`src/data/sync/syncService.ts:157-159`)" cited for the `flush()` body | :151 is the interface member; the implementation is elsewhere. | **rewrite** to a symbol anchor (hunk) |
| S-22 | `sim-level-iv:368` vs `:20` | "`millbrook-inventory.xlsx`" vs "CSV, not the `.xlsx`" | Internal conflict. | **rewrite** (hunk) |
| S-23 | `sim-level-v:322` vs `sim-level-i:78` | "`sim-millbrook-fd` — shared across all 5 simulation types" | Level I uses `sim-surfside-ttx-2-v4`. | **rewrite** (hunk) |
| S-24 | `design-docket:21-27` | routes to "Riding S11" and a riding-session fallback | The docket has no S11 section; S10 and S12 landed 2026-06-11 — three of six routes point nowhere. | **rewrite** to three routes (hunk) |
| S-25 | `design-docket:30,39,42` | "post a one-paragraph comment on #248" | `00-INDEX.md:30`: #248 closed. Retargets a network call. | **flag** — comment on the active gate in the rule file, or drop the comment |
| S-26 | `sim-level-i/ii/iii/v` bodies | target the v3 root app (`npx serve -l 8095 .`, Settings → Department Code, localStorage `activeOperation`) | CLAUDE.md marks v3 archive; `sim-level-iv:16` says the sims now run against v4; v4 has no Department Code field and imports CSV. | **flag** — retire these four or re-point them using sim-level-iv's cleaned Phase 1–2 |
| S-27 | sims' MASTER-PLAN phase columns (i:164…, ii:242-305, iii:208-258, iv:244-280, v:179…) | mappings to `MASTER-PLAN.md` phase labels | `MASTER-PLAN.md` is dated 2026-05-19; `sim-level-iv:370` itself says the labels are stale for v4. | **rewrite** column as "v4 design ref (docs/v4-design file / ADR / board #2 issue)" — apply with the S-26 decision; no hunk |
| S-28 | `sim-level-iv:14-45` vs body | a v4 override block ("this block wins", "substitute a 3-Post", struck-through corrections) over a body that still says "T-Shore group of 3", `strutplaced`, "6-status", "v4.0 early Phase I" (≈20 lines) | G1d patch accretion + migration-relative phrasing; repo backs the override (`shorepoint/reducer.ts:165-167`, `status.ts` 7 statuses incl. `strutset`). | **rewrite** — fold the override into the body (T-Shore→3-Post, `strutplaced`→`strutset`, 6→7 statuses, N/A list → U-9 only, drop strike-throughs/dates, baseline "current v4-redesign build"); no hunk (whole-file) |
| S-29 | `sim-level-iv:356` vs `:45`, `run-fieldshore:43,93`, CLAUDE.md | "Participants use preview_click and preview_fill only." | Tab switches need `location.assign` (TanStack `<Link>` can't be clicked through the preview tools). Fix loosens a prohibition. | **flag** — suggested: "the one allowed page-eval is `location.assign('/<tab>')`" |
| S-30 | `plan-v4:23` | "`gh project item-list <PROJECT_ID> --owner Vergo402`" with `PVT_…` | `gh project item-list` takes the project **number**; `plan-v4-phase-i:20` and `design-idea:55` use `2`. | **rewrite** (hunk, shares the line with S-12) |

### Medium

| ID | Location | Evidence | Pattern / why | Action |
|---|---|---|---|---|
| S-31 | `plan-v4:46-53, 57-101, 141, 154-160` | dispatch matrices for finished Phases B/C/D; "Don't dispatch fewer than the 12 essays in Phase C"; "Why this skill exists … `/plan` keeps shipping v3.20+ patches" | G2 history — ~70 lines of completed-phase choreography load on every v4 session. | **remove** / collapse rows A–H to one "Done" row (hunks) |
| S-32 | `plan-v4:22,133` | "rebase or merge" / "Cherry-pick or rebase v3 patches" | G2 wrong degrees of freedom — the branch is published and every push deploys the beta; history uses merges. | **rewrite** → merge, never rebase (hunk) |
| S-33 | `plan-v4:42` | `--search "[Phase B]"`; a memory link on the OneDrive-era project slug | G2 volatile — slug no longer matches the repo path (plan-release's own rule). | **rewrite** (hunk) |
| S-34 | `plan-release:381-384, 521, 626-634, 646, 676` | "Opus 4.7", "Sonnet 4.6", "Haiku 4.5", "Opus 4.6 Legacy" | G2 pinned model names — but `plan-release:584-592` sets the board's **Model** field from these literal option labels. Renaming in the skill without renaming the board options breaks the field write. | **flag** — rename the board's Model options first (web UI), then the skill in one change |
| S-35 | `plan-release:456` | "**This is the critical step the user explicitly flagged: …**" | G1a pressure + history. | **rewrite** (hunk) |
| S-36 | `plan-release:701` | "Alex is a firefighter, not a developer — explanations clear, jargon-free." | G2 conflict with CLAUDE.md "How We Talk" (2026-06-08, newer): tech-savvy power user, term in parens, never dumb it down. | **remove** (hunk) |
| S-37 | `plan-release:59-60` | "(see the May-2026 path migration that broke a hardcoded slug)" | G2 history. | **rewrite** (hunk) |
| S-38 | `plan-release:56` | "`cat CLAUDE.md …`" | CLAUDE.md is already in context. | **rewrite** (hunk) |
| S-39 | `plan-release:3` (description) | generic triggers ('start planning', 'what should we work on next', 'fix the bugs', 'triage issues') | G2 routing conflict — sends generic requests to the v3 workflow while v4 is the active project. | **rewrite** description as v3-explicit (hunk) |
| S-40 | `plan-release:75-80, 262, 464, 675, 702`; `feedback-review:96` | memory filenames such as `feedback_code_quality.md` | G2 volatile — don't match this project's memory index (e.g. `feedback-code-quality-structural-fix-first.md`); outside repo. | **flag** |
| S-41 | `feedback-review:78-81` | "(REQUIRED — do not skip)"; "exactly what let #285 slip through in May 2026" | G1a pressure + history. | **rewrite** (hunk) |
| S-42 | `feedback-review:193` | "Consider dependencies between items." | G1c padding. | **remove** (hunk) |
| S-43 | `design-primitive:24` | "#197-overstep failure mode" | G2 history. | **rewrite** (hunk) |
| S-44 | `run-fieldshore:40-43, 91-93`; sims i:108,252; ii:408; iii:349; iv:203,356; v:143,152-153,164,312 | `preview_snapshot`, `preview_eval`, `preview_click`, `preview_fill`, `preview_console_logs` | G2 volatile — this session's preview tools are `read_page`, `computer`, `read_console_messages`, `javascript_tool`. Tool names belong to an installed MCP, so not "contradicted by the repo". | **rewrite** function-first ("accessibility tree (read_page / preview_snapshot)") — wording only; no hunk |
| S-45 | `run-fieldshore:34` | "(a 2026-08-17 agent popped a months-old stash … reported 'Nothing was lost')" | G2 history — reason already stated; DELEGATION.md item 5 says the same. | **rewrite** (hunk) |
| S-46 | `run-fieldshore:47` | "recipe proven 2026-08-05 against `34c0822` … The old … seed is dead: it now lands…" | G1d migration-relative phrasing. | **rewrite** (hunk) |
| S-47 | `plan-v4-phase-j:151,161` | "(Proven in the #491 walk: …)", "(Proven the hard way in #261: …)" | G2 history — each section already states its reason. | **remove** both (hunk) |
| S-48 | sims' anti-pattern blocks (i:249-258 ×8 "DO NOT", ii:405-416 ×10, iii:346-355 ×8, iv:353-361 ×7, v:309-316 ×6); UI-only rule restated 7× in sim-level-i | G1a pressure + G1c repetition | **rewrite** each block as plain "Run rules", UI-only stated once with its reason (e.g. sim-level-v: "Participants act only through the app's UI — if the UI can't do something, that's a finding. Run Phase 2 before Phase 4. Keep to 3 shore points. Advance the clock only after acknowledgment. Moderators observe and log; they never interrupt."); no rule removed; no hunk |
| S-49 | `sim-level-i:91,108,201,251` | "Updated constraint", "Critical update for re-run", "(new for re-run)" | G1d migration-relative phrasing. | **rewrite** as current rules; no hunk (apply with S-26) |

### Low (flag only)

| ID | Location | Note |
|---|---|---|
| S-50 | renamed skills' descriptions | Pre-rename slash aliases kept as trigger phrases — routing text, left alone. |
| S-51 | `run-fieldshore:14,56` | "Verified on Node v26 / npm 11.12" (CI uses Node 22); "(added 2026-10-09)". |
| S-52 | `design-ship-ideas:12,47,57-63,74` | DesignSync tool / `/design-sync` not in this session's lists — installed tooling, unverifiable from the repo. |
| S-53 | `plan-v4:114` | ScheduleWakeup tool — same. |
| S-54 | several | Unverified GitHub IDs (design-idea:34, design-primitive:79-84, feedback-review:86-90, plan-release:535-602, plan-v4:151) and issue numbers. The v3/v4 Status IDs match CLAUDE.md. |
| S-55 | sims i:266, ii:424, iii:167,363, v:141,324 | "App version baseline v3.17.2" vs app.js 3.22.2 — moot under S-26. |
| S-56 | `plan-v4-phase-j:132-143` | "Bleeding Edge" prompt — the pick was already made (cut-list optimization, v4.1) per memory. |
| S-57 | `plan-release:703` | dated "v4.0 reframe (2026-05-17)" history inside a v3 skill. |
| S-58 | `plan-v4:10,18` | `~/.claude/plans/v4-master-plan.md` — same as R-4. |
| S-59 | `plan-v4-phase-i` | clean. `design-idea`, `design-ship-ideas`: clean apart from the renames. |

## E. User-level files (`~/.claude/CLAUDE.md`, `~/.claude/RTK.md`) — affect every project

**Clean.** No Group 1 patterns (the rules carry their reasons; the "under 200 words" subagent-return cap is an interface contract with a stated purpose, not an output ceiling). Every skill it names (`cc:task-observer`, `cc:plan-conventions`, `cc:skill-conventions`, `cc:new-skill`, `cc:commands`) exists under `~/.claude/local-plugins/cc/skills/`; `@RTK.md` resolves. No conflict with the project CLAUDE.md (the mockup rules agree — working redundancy).

| ID | Location | Note |
|---|---|---|
| U-1 | `~/.claude/CLAUDE.md:3-5` ("invoke the `cc:task-observer` skill before beginning work") | Not cruft itself, but it loads a 1,010-line skill (~12.7K tokens) at the start of every task session in every project, and 10–15% of that skill cannot apply in Claude Code (L-1…L-3 below). The fix belongs in the plugin skill, not here. **flag** |

## F. Report-only — local plugins (`~/.claude/local-plugins/`)

Installed plugins: findings only, no edits proposed. 44 findings (9 High / 15 Medium / 20 Low); Groups 3–4 n/a. Command-map drift for local skills: none (13 on disk = 13 map rows; the 15 FieldShore project rows match). Highest-impact items:

| ID | File:lines | Finding (what the fix would be) | Conf. |
|---|---|---|---|
| L-1 | `cc/task-observer:27-29` | Points to an "Environment Compatibility" section and a "handoff doc mode" that don't exist anywhere in the file. | High |
| L-2 | `cc/task-observer:846-848, 537` vs `:894` | "Do not edit skill files in place" vs "In interactive runs, apply it to the live file once the user approves" — opposite rules for one action (the first only makes sense on Cowork's read-only mount). User decides; :894 matches skill-conventions and `new-skill`. | High |
| L-3 | `cc/task-observer:523-563` (+25-29, 683-686, 883-892) | ~45 lines of Cowork-only staging (read-only mount, `EROFS`, `present_files`, upload) that cannot run in Claude Code; the stated live path `.claude/skills/{skill}/SKILL.md` is the one `skill-conventions` forbids. Would collapse to ~3 lines. | High |
| L-4 | `cc/task-observer:740-741` | Names Cowork's `create-shortcut`/`set_scheduled_task`, then cron; this harness has scheduled-task tools and the `schedule`/`loop` skills. | High |
| L-5 | `gufa/cba-sync:79` vs `cba-verify` checks 1–8 | Cites "cba-verify checks 9–10", which do not exist. | High |
| L-6 | `gufa/cba-sync:64` vs `cba-verify:56` | cba-sync makes a live ALTERNATE section a **blocking** gate; cba-verify says "FYI for committee decision, not a blocker". | High |
| L-7 | `gufa/cba-sync:80` vs `cba-verify:56` | "the two ALTERNATE sections" vs cba-verify saying one was promoted and is no longer an alternate. | High |
| L-8 | `cc/new-skill:23-24` | Step 1 `mkdir -p …/<domain>/…` runs before step 2 "if the domain doesn't exist" — the new-domain branch can never fire (no `plugin.json`/marketplace entry/install for a new domain). Swap the steps. | High |
| L-9 | `fire/inspection-timesheet:16-22, 237-245` vs description | Body uses a `/sessions/[SESSION_ID]/mnt` mount plus an osascript hop; the description says the weekly task runs locally in Claude Code, where the Mac path is directly reachable. | High |
| L-10 | `cc/task-observer:219-308, 379-381` | ~80 lines of shell the model must execute (numbering scan, collision assert, post-write verify) sharing variables across separate Bash calls (state doesn't persist → `PROPOSED=$((MAX+1))` becomes 1 and falsely fires COLLISION). Belongs in one script; keep the collision guard. | Medium |
| L-11 | `cc/task-observer:408-410, 46-47` + `cc/close` | "Surface all observations at the end of the session" — Claude Code sessions have no "end"; `/cc:close` never calls this. Unreachable step. | Medium |
| L-12 | `cc/task-observer:33-62` | "Rules in a skill get skipped while the output is being produced" (older-model claim) + a six-item self-enforcement list that restates :310-335 / :393-400 and spawns empty `## Pre-flight` scaffolds in new skills (new-skill:46, skill-conventions:60). | Medium |
| L-13 | `cc/task-observer:647-652, 711-761` | Four marker files and a 30-day suppression rule govern one offer to schedule; the 7-day fallback can put a ~250-line interactive review ahead of the user's first request in every repo. | Medium |
| L-14 | `cc/close:85,122` | "200-line cap … skill files must stay ≤200 lines" — the user's own skills exceed it (task-observer 1010, inspection-timesheet 278, command-map 213); only MEMORY.md has a stated reason. | Medium |
| L-15 | `cc/skill-conventions:40` | Rule 4 (descriptions list the namespaced slash form) is unmet by 8 of 13 descriptions, including the rule's own example. | Medium |
| L-16 | `cc/rtk:16-23` | Symptom table lacks the `(N filtered)` / `[+N hidden: rtk recall <id>]` markers seen on `ls`/`grep` this session — an **add**. | Medium |
| L-17 | `fire/inspection-timesheet:227-229` | "CRITICAL — always zip to /tmp first…" shouts the mount routing (no reason given); the real constraint is raw `zip` (ink traces contain bare `"` that XML serializers escape). | Medium |
| L-18 | `gufa/cba-verify:20,56,61`; `cba-sync:40,45,56,72,79` | Migration-relative phrasing and dated incident text ("was promoted … no longer", "Root-caused and fixed by hand 2026-07-17", "REGEN MODEL (2026-07-16)"). | Medium |
| L-19 | `gufa/cba-sync:66,77`; `cba-verify:27,63` | Dangling `cba-fiscal-bridge` skill — not in local-plugins, the session list, or the command map. | Medium |
| L-20 | `cc/plan-conventions:56-60` | Says the listed steps satisfy the mockup rule without the global rule's item 4 (PNG copy via `SendUserFile`) or the comparison-card captures. Conflict by omission; no git to order them. | Low |
| L-21…L-44 | task-observer (:105-212 bullet wall, :239/:246/:344/:869 stale cross-refs, :346-377 handoff-doc flows, :779-791 "known system skills" list, :219-227/:468-504/:995-1010 repetition), cba-sync paths (:72), cba-verify hardcoded counts (:47,56), new-skill duplication (:19,27,46,72), inspection-timesheet unused recipients (:276-278), close prohibitions (:24,32), skill-conventions unreasoned NEVER (:20), rtk volatile facts (:10,43,69), commands "print to stdout" (:8), command-map non-local rows (:3), handoff edge case (:99-100), startup emphasis cluster (:10-12,22,28), shift-scan Cowork clauses (:12,50) and `.w2w_creds.json` location (:18,69) | Low |

task-observer inapplicability estimate: ~72 lines hard-inapplicable in Claude Code (7% of lines, 12% of bytes) + ~31 conditional lines; ~80 lines of shell that should be a script. Per-file verdict: task-observer heavily reducible (~450–550 lines would carry the same Claude Code behavior); cba-sync three High cross-skill contradictions; new-skill one ordering bug; inspection-timesheet one harness contradiction; cba-verify, close, skill-conventions, rtk, commands, plan-conventions, handoff, startup, shift-scan near-clean.

## G. Report-only — installed plugins and claude.ai-synced skills

85 findings (19 High / 46 Medium / 20 Low); full text with evidence in `appendix-installed-and-synced-plugins.md`. By group: 1a 5/3/2, 1b 6/3/0, 1c 0/8/4, 1d 0/2/3, 1e 1/4/1, 1f 0/1/0, 2 7/24/10, 3 0/1/0. This is where the Group 1 patterns live — mostly in `superpowers` and `i-have-adhd`, both injected into every session:

| ID | File | Finding | Conf. |
|---|---|---|---|
| P-1 | `superpowers/using-superpowers:10-16,20` | "If you think there is even a 1% chance a skill might apply … you ABSOLUTELY MUST invoke the skill. … YOU DO NOT HAVE A CHOICE. … This is not negotiable." — G1a shouted booster loaded every session; on Fable 5.1 it over-triggers skills and sets an anxious register. | High |
| P-2 | `i-have-adhd:37,105-117` | Numeric caps ("Cap lists at 5 items", "under two minutes"), forbidden-opener/closer lists and "no recap" suppressors — G1f/G1d. Note: the skill's own rule 6 ("A rule fights the harness … the system prompt outranks this skill") already resolves its apparent conflict with the "Alex" opener and the superpowers announce rule — the reader rated that conflict High; it is Low in practice. | High / Low |
| P-3 | `ponytail/ponytail:54-59`; `ponytail-help:39` | "at most three short lines" hard cap; "Default mode = full, auto-active every session" conflicts with superpowers' TDD gates. | High |
| P-4 | `superpowers/verification-before-completion`, `systematic-debugging`, `test-driven-development`, `writing-skills` | Iron-Law / "NO X WITHOUT Y" / "Delete it. Start over." ultimatums and ALWAYS/ANY/ESPECIALLY clusters — G1a/1e pressure written against under-triggering models. | High |
| P-5 | `superpowers/brainstorming:67,117,219`; `executing-plans:24-25` = `subagent-driven-development:14-15` | Sentence/word ceilings ("2-3 sentences", "narrate at most one short line") — G1f, identical text duplicated in two skills. | High |
| P-6 | `superpowers/subagent-driven-development:235-244` | Wait choreography ("wait in bounded stretches (five to ten minutes)") conflicts with this harness's background-notification contract. | High |
| P-7 | `superpowers/requesting-code-review:28` vs `subagent-driven-development:290,323` | Defaults BASE to `HEAD~1`; the executors forbid exactly that. | High |
| P-8 | `claude-code-setup/claude-automation-recommender:15-16,155,160` | "1-2 of each type" cap stated three times. | High |
| P-9 | synced `send-to-wife:8,43-45` vs `:54` | Text says it "opens iMessage pre-filled … ready to send"; the AppleScript `send messageText to targetBuddy` **sends immediately**, with no confirm gate, and a bare pasted link counts as a trigger. Safety-relevant contract mismatch. | High |
| P-10 | synced `voice-dispatch:181` vs `send-to-wife:3,76` | Routes every "tell Katie" to send-to-wife, which accepts only URLs. | High |
| P-11 | synced `medic-shift-scan` (62 lines) vs `local-plugins/cprps/shift-scan` (83) | Two loaded copies of one skill that disagree on rules ("On-demand only — no automatic runs" vs "plus a daily scheduled quiet scan"; scoring differs). | High |
| P-12 | synced `cba-sync:77` vs `cba-verify` | Same "checks 9–10" ghost as L-5; and the ALTERNATE blocking/FYI conflict (L-6). | High |
| P-13 | twin diffs | cba-verify / cba-sync: synced ≡ local except a source-of-truth paragraph (agree). fire-inspection-timesheet: identical body, only the scheduled-task name differs. The synced custom copies are absent from this session's skill list, so the drift bites only where the claude.ai copies load. | — |

Anthropic-authored synced skills (listed, not audited): docs (6), import-memory (89), learn (78), morning (152), skill-creator (485), mcp-builder (236), web-artifacts-builder (73), docx (91), pdf (314), pptx (241), xlsx (99), frontend-design (42, tagged custom — reported as an extra in the appendix).

## H. Proposed diff — `proposed.diff`

29 files, 74 hunks, +108/−190. Dry-run: `git apply --check -p1 proposed.diff` passes on `a48c6ea`. One finding per hunk except where two findings share a line (plan-v4:23 S-12+S-30; plan-v4:42 S-31+S-33; sim-level-iv:20 S-20 both halves).

| File | Hunks cover |
|---|---|
| `CLAUDE.md` | C-1, C-2, C-3, C-4 |
| `.claude/rules/v3-app.md` | R-1 |
| `.claude/rules/v4-phase-status.md` | R-2, R-3 |
| `.claude/agents/architect.md` | A-11, A-17 |
| `.claude/agents/code-auditor.md` | A-2, A-11 |
| `.claude/agents/devops-resilience.md` | A-3, A-11 (×2), A-12 |
| `.claude/agents/fullstack-engineer.md` | A-1, A-11, A-16 |
| `.claude/agents/migration-specialist.md` | A-4, A-5, A-11 |
| `.claude/agents/mobile-ux.md` | A-6, A-11 |
| `.claude/agents/nims-compliance.md` | A-7, A-20, A-21 |
| `.claude/agents/qa-driver.md` | A-8, A-9, A-11, A-13 |
| `.claude/agents/release-manager.md` | A-18 |
| `.claude/agents/rescue-specialist.md` | A-22 |
| `.claude/agents/scenario-conductor.md` | A-10, A-11 |
| `.claude/agents/structural-collapse-sme.md` | A-21 |
| `.claude/skills/plan-release/SKILL.md` | S-1, S-2, S-3, S-4, S-5, S-6, S-35, S-36, S-37, S-38, S-39 |
| `.claude/skills/feedback-review/SKILL.md` | S-8, S-10, S-41, S-42 |
| `.claude/skills/plan-v4/SKILL.md` | S-10, S-11, S-12, S-13, S-30, S-31, S-32, S-33 |
| `.claude/skills/plan-v4-phase-j/SKILL.md` | S-47 |
| `.claude/skills/design-docket/SKILL.md` | S-24 |
| `.claude/skills/design-primitive/SKILL.md` | S-5, S-10, S-43 |
| `.claude/skills/design-idea/SKILL.md`, `design-ship-ideas/SKILL.md` | S-10 |
| `.claude/skills/run-fieldshore/SKILL.md` | S-15, S-16, S-45, S-46 |
| `.claude/skills/sim-level-i/SKILL.md` | S-1, S-17, S-18, S-19 |
| `.claude/skills/sim-level-ii/SKILL.md`, `sim-level-iii/SKILL.md` | S-1, S-19 |
| `.claude/skills/sim-level-iv/SKILL.md` | S-1, S-19, S-20, S-21, S-22 |
| `.claude/skills/sim-level-v/SKILL.md` | S-1, S-18, S-19, S-23 |

**Needs a decision before any edit (flag):** A-14, A-15, A-19, S-7, S-9, S-25, S-26, S-29, S-34. **High/Medium with no hunk (whole-section rewrites, replacement described above):** S-14, S-27, S-28, S-44, S-48, S-49.

## I. Verification notes (Step 7)

- Every hunk's source line was asserted by prefix before replacement (the edit scripts fail loudly on drift), and the whole diff dry-runs against the working tree.
- Stale-fact findings were checked against the repository, not the model: `wc -l`, `grep` for identifiers, `git ls-files`, the ADR text, the test that asserts import-during-operation, `smoke.sh`, `package.json`, `vite.config.ts`, `database.rules.json`, the deploy workflow.
- Provenance: `git blame`/`git log` ordered every conflict in the diff (older passage rewritten to the newer); conflicts that history could not order, or whose fix loosens a prohibition, are flags.
- Not re-probed behaviorally: the Group 1 items in third-party plugins (report-only). If `superpowers` or `i-have-adhd` are ever forked, re-test each cut on a scratch session before deleting.
- Re-run this audit at the next model release and after the Phase J cutover, when the v3 sections of the agents and the four v3-targeted sims (S-26) become decisions rather than findings.
