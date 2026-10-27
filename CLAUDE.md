# FieldShore — Project Guide

## What This Is

**Live:** https://vergo402.github.io/paratech-struts/

**Deployment status (2026-10-09): beta only — no users.** Alex is the sole tester; no department has onboarded. The v3 site above and its Firebase project `paratech-c3ab4` are reference/archive, not a fielded app: route every fix to v4 (`src/`, Firebase `fieldshore-database`), never patch v3 for "production" reasons. `hfd217` in the v3 database is Alex's own test department. Re-check this line before calling anything production-critical.

## Architecture

- **No build step (v3 root app).** Edit files, push, done. **v4 under `src/` is a Vite/TS build — see "v4 Build & Architecture" below.**
- **v3 app internals** (key files, tabs, `app.js` constants + functions, Firebase data structure, Known Patterns & Gotchas, local serve) live in `.claude/rules/v3-app.md`, a path-scoped rule that loads itself when you touch the v3 root files. Authoritative copy for v3 work: CLAUDE.md on `main` (the `fieldshore-main/` worktree).

### v4 Build & Architecture (active on `v4-redesign`)

This branch is a **dual-app repo** (`package.json`: "v3 ships from root; v4 lives under src/"):

- **v3** — the root `index.html` / `app.js` / `style.css` / `sw.js` above. Still ships to GitHub Pages. No build step.
- **v4** — rooted at `src/app/`, not yet deployed (Phase I). Invariant kept from `sw.js`: Firebase realtime traffic is never cached.

**Delegation:** agent routing (task type → agent → model tier → oversight) lives in `.claude/agents/DELEGATION.md` — consult it when planning any substantive task.

**Layout & gotchas:**
- Keep the load-table catalog tests (`src/core/load/struts.test.ts` + `plates.test.ts`) green.
- **Installing an npm dep (e.g. a font) needs a Vite dev-server restart** — HMR won't re-optimize. Preview MCP can't drive TanStack `<Link>` (use `location.assign`) or Sheet scrim-close (reload).

### Remote

Uses SSH authentication. Branching workflow: `main` = production, feature branches for new work.

**Push on commit (standing rule, 2026-06-07):** whenever you commit, push to the same branch in the same step — do not ask separately about pushing. (Commit only when Alex asks; but a commit implies its push.) Never commit or push to `main` outside the release/merge process.

## GitHub Project — Status Tracking

There are **two separate project boards**. Always use the one that matches the branch being worked on:

| Board | Project # | URL | Used for |
|-------|-----------|-----|----------|
| FieldShore Roadmap (v3) | `1` | https://github.com/users/Vergo402/projects/1 | v3 issues — bugs, features, releases on `main` |
| v4 Redesign Roadmap | `2` | https://github.com/users/Vergo402/projects/2 | v4 issues — all work on `v4-redesign` branch |

Set each issue's Status to **In Progress** when starting it. Status field ids, item-lookup/edit commands and closing-issue rules: see `.claude/skills/board-status/SKILL.md`.

**Gotcha:** `Closes #N` in a commit only fires on merge to `main`, so v4 issues (`v4-redesign` branch) must be closed manually with `gh issue close` when the work is done.

**New issues created mid-session** must be added to the correct board as sub-issues of the current parent issue — never left as standalone issues.

## Versioning & Release Process

**Never** use `gh api graphql ... updateProjectV2Field` to add a single option — the mutation replaces the entire options list (set-and-replace semantics).

Work on a feature branch — do NOT push directly to `main` unless Alex explicitly says to.

Release procedure (version bump on every change): see `.claude/skills/release/SKILL.md`.

### User Manual — Auto-Update Rule

There are **two** user-manual deliverables and **both must stay in sync**:

| File | What it is |
|------|------------|
| `docs/USER-MANUAL.md` | Canonical text manual (the source of truth) |
| `docs/FieldShore-User-Manual.docx` | Printable/shareable manual — **same text PLUS embedded app screenshots** |

**Both must be updated and committed on every MINOR or MAJOR release** — never just the `.md`. A MINOR/MAJOR is not "done" until both manuals reflect it. The trigger is the **whole release**, not only the headline feature: when a MINOR/MAJOR drops, the manual update must account for **all** the work that shipped in it — backend/Firebase changes, security-rule changes, sync/offline behavior, schema migrations, new constants, and every UI change — anything a user could notice or that changes documented behavior. Roll it all into the one manual update for that release.

Update both whenever any of the following change:
- Features added, removed, or modified (any MINOR or MAJOR release)
- Shore types, ICS roles, apparatus types, or other operational constants
- UI workflow changes (new screens, changed navigation, status lifecycle)
- Shore point lifecycle statuses
- Settings options
- Backend/data behavior a user can observe (offline/sync messaging, auth/login flow, security-rule effects, import/export behavior)

**Do NOT update either manual for PATCH releases** (bug fixes only). PATCH releases keep the manuals' `major.minor` version as-is.

The six-step update procedure (edit, version fields, history row, rebuild the .docx, refresh screenshots, ship in the same commit) is the path-scoped rule `.claude/rules/user-manual.md`, which loads when you touch `docs/USER-MANUAL.md` or `docs/manual-assets/`.

### v3 → v4 Parity Matrix — Sync Rule

The v4 redesign (`v4-redesign` branch) forked at **v3.19.1**, so every v3 feature shipped after that fork must be carried into the v4 design or it will be silently lost when v4 is built. The living matrix at **`docs/v4-design/12-parity/v3-feature-parity.md`** (on `v4-redesign`) tracks this.

**On every v3 MINOR or MAJOR release**, add/refresh that feature's row in the parity matrix — what shipped, its v4 coverage (Covered / Deferred / Gap / Decided-drop), and the v4 design-doc reference. Same discipline as the user-manual rule above: the release isn't "done" until the matrix reflects it. (PATCH releases: only if they change user-facing behavior the matrix tracks.) This is the concrete instrument behind the Phase J parity gate, [#256](https://github.com/Vergo402/paratech-struts/issues/256).

## Conversation style

The mockup-first rule and the `Alex,` reply opener live in the user-scope `~/.claude/CLAUDE.md`; the plain-language rules live here, in "How We Talk" below.

## How We Talk — Plain Language for Alex (standing rule, 2026-06-08)

Alex is a USAR/FEMA firefighter and a tech-savvy power user of decades — from the user side, not the engineering side. He is fluent with *using* software; the wall is under-the-hood engineering jargon (architecture, data structures, plumbing). Translate only that: no condescension, no padding, never dumb it down.

- **Plain first, term in parentheses.** Lead with the meaning, then tuck the engineering term in parens (e.g. "all the cloud-saving code lives in one swappable spot (a 'data/sync seam')").
- **Give the "so what," not a tutorial.** Say what the thing is and why it matters to the app; skip concepts he already owns.
- **Analogies only when the ICS / shoring / fireground mapping is exact** — one line, not a lecture; skip forced ones.
- **The glossary is the bridge.** Point Alex to `docs/PLAIN-LANGUAGE-GLOSSARY.md` and add new terms as they come up.
- **`AskUserQuestion` counts as conversation (2026-06-16).** The question and every option's label and description must be plain language — what he'd see or do and why. If he can't decide from the option text, the question failed.
- **Scope: conversation only** — chat replies, planning, triage and gate write-ups, review explanations, summaries of agent findings. Design docs, plans, specs, ADRs, commit messages and code comments keep their precise vocabulary (v4 doc voice: `docs/v4-design/07-design-system/voice-and-tone.md`).

## History & status

### v3.5.2 → v3.22.3 — see `.claude/plans/CONSOLIDATED-STATUS.md` (v3.11.2 audit: `.claude/audits/v3.11.2/SUMMARY.md`)

### ⏳ Still pending — v4.0.0 (major restructure)

v4 phase status, the locked-ADR summary, the scope/interaction decisions and the original v4.0.0 backlog notes live in `.claude/rules/v4-phase-status.md` — a path-scoped rule that loads itself when you touch `src/`, `docs/v4-design/` or `.claude/audits/phase-j/`; open it first in any v4 planning session.
Current state (2026-10-12): Phase J — gates #262 and #264 and Stage C #266 closed; open: #265 rollback plan, #263 manual, #267 merge to `main`, #268 tag v4.0.0.

## Audits — see .claude/audits/AUDIT-INDEX.md (findings ledger, round-2 deep audit, the v3.3.0 audit team roster).
