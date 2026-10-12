# FieldShore — Project Guide

## What This Is

A PWA for USAR/FEMA firefighters to select Paratech rescue struts by measurement, manage inventory across apparatus, and run shoring operations with ICS/NIMS command structure. Built for field use on mobile — works offline.

**Live:** https://vergo402.github.io/paratech-struts/

**Deployment status (2026-10-09): beta only — no users.** Alex is the sole tester; no department has onboarded. The v3 site above and its Firebase project `paratech-c3ab4` are reference/archive, not a fielded app: route every fix to v4 (`src/`, Firebase `fieldshore-database`), never patch v3 for "production" reasons. `hfd217` in the v3 database is Alex's own test department. Re-check this line before calling anything production-critical.

## Architecture

- **3-file split** (refactored from single-file in v2.0.1):
  - `index.html` (~770 lines) — HTML shell, modals, forms
  - `app.js` (~8,800 lines) — All application logic, constants, Firebase integration
  - `style.css` (~2,200 lines) — All styles
- **Service worker:** `sw.js` — offline caching with stale-while-revalidate
- **Backend:** Firebase Realtime Database (compat SDK v9.23.0) — project `paratech-c3ab4`
- **Hosting:** GitHub Pages (auto-deploys on push to `main`)
- **No build step (v3 root app).** Edit files, push, done. **v4 under `src/` is a Vite/TS build — see "v4 Build & Architecture" below.**
- **v3 app internals** (key files, tabs, `app.js` constants + functions, Firebase data structure, Known Patterns & Gotchas, local serve) live in `.claude/rules/v3-app.md`, a path-scoped rule that loads itself when you touch the v3 root files. Authoritative copy for v3 work: CLAUDE.md on `main` (the `fieldshore-main/` worktree).

### v4 Build & Architecture (active on `v4-redesign`)

This branch is a **dual-app repo** (`package.json`: "v3 ships from root; v4 lives under src/"):

- **v3** — the root `index.html` / `app.js` / `style.css` / `sw.js` above. Still ships to GitHub Pages. No build step.
- **v4** — a **Vite 6 + TypeScript + React 18** app rooted at `src/app/`, not yet deployed (Phase I). Stack: TanStack Router + Query, Dexie (IndexedDB), Zustand, Zod, Tailwind 4, Radix UI. Tests via Vitest + Testing Library. `vite-plugin-pwa` (Workbox) replaces the hand-written `sw.js` for v4 — the one invariant kept: Firebase realtime traffic is never cached.

**Commands (from repo root):**

| Command | Does |
|---|---|
| `npm run dev` | Vite dev server on **:5199**, `host: true` (reach from a phone at `http://<mac>.local:5199`) |
| `npm test` / `npm run test:watch` | Vitest once / watch mode |
| `npm run build` | `tsc --noEmit && vite build` → `dist/` (gitignored) |
| `npm run typecheck` / `npm run lint` | Types only / ESLint |

**Delegation:** agent routing (task type → agent → model tier → oversight) lives in `.claude/agents/DELEGATION.md` — consult it when planning any substantive task.

**Layout & gotchas:**
- `src/core` (pure logic: load tables, reducers, schema) · `src/data` (store + data/sync seam) · `src/ui` (components by feature) · `src/app` (shell + routes). Path aliases: `@core` `@data` `@ui` `@app`.
- Tests are colocated `*.test.ts(x)`. Load-table catalogs are pinned by `src/core/load/struts.test.ts` + `plates.test.ts` — keep them green.
- **Installing an npm dep (e.g. a font) needs a Vite dev-server restart** — HMR won't re-optimize. Preview MCP can't drive TanStack `<Link>` (use `location.assign`) or Sheet scrim-close (reload).

### Remote

| Name | Repo | Purpose |
|------|------|---------|
| `origin` | `Vergo402/paratech-struts` | Single repo (SSH) |

Uses SSH authentication. Branching workflow: `main` = production, feature branches for new work.

**Push on commit (standing rule, 2026-06-07):** whenever you commit, push to the same branch in the same step — do not ask separately about pushing. (Commit only when Alex asks; but a commit implies its push.) Never commit or push to `main` outside the release/merge process.

## GitHub Project — Status Tracking

There are **two separate project boards**. Always use the one that matches the branch being worked on:

| Board | Project # | URL | Used for |
|-------|-----------|-----|----------|
| FieldShore Roadmap (v3) | `1` | https://github.com/users/Vergo402/projects/1 | v3 issues — bugs, features, releases on `main` |
| v4 Redesign Roadmap | `2` | https://github.com/users/Vergo402/projects/2 | v4 issues — all work on `v4-redesign` branch |

When starting work on any GitHub issue (whether via `/plan-release`, `/plan-v4`, or ad-hoc), set its Project Status to **In Progress** using the correct board:

- **v3 board (project 1):** project-id `PVT_kwHODy7CN84BYNd6` · Status field-id `PVTSSF_lAHODy7CN84BYNd6zhTU44c` · options Todo `f75ad846` / In Progress `47fc9ee4` / Done `98236657`
- **v4 board (project 2):** project-id `PVT_kwHODy7CN84BYV37` · Status field-id `PVTSSF_lAHODy7CN84BYV37zhTcaGE` · options Todo `f75ad846` / In Progress `47fc9ee4` / Done `98236657` · item-lookup + edit commands for both boards: `.claude/plans/board-commands.md`

**New issues created mid-session** must be added to the correct board as sub-issues of the current parent issue — never left as standalone issues.

### Closing issues

- **v4 issues (`v4-redesign` branch):** Close manually with `gh issue close NUMBER --repo Vergo402/paratech-struts` as soon as the work is done. Do NOT rely on `Closes #N` in commit messages — that keyword only fires on merge to the default branch (`main`), and v4 won't merge for a long time.
- **v3 issues (`main` branch):** `Closes #N` in the commit message works correctly on merge to main. Manual close is also fine.

The board Status updates to Done automatically when the issue closes.

## Versioning & Release Process

Follow [semver](https://semver.org/): MAJOR.MINOR.PATCH

On every change:
0. **Ensure the `v{VERSION}` Release option exists in the [FieldShore Roadmap Project](https://github.com/users/Vergo402/projects/1)** before any `/plan-release` scope-in or Project field-edit. Add via the web UI: project settings → fields → "Release" → "+ Add option". **Never** use `gh api graphql ... updateProjectV2Field` to add a single option — the mutation replaces the entire options list (set-and-replace semantics). See `feedback_project_field_mutations.md` memory.
1. Update version in **3 places:**
   - `index.html` header label: `<div class="version-label">v{VERSION}</div>` 
   - `app.js`: `const APP_VERSION = '{VERSION}'` (near the top of the file)
   - `sw.js` cache name: `const CACHE_NAME = 'fieldshore-v{VERSION}';`
2. Work on a feature branch — do NOT push directly to `main` unless Alex explicitly says to
3. When ready, merge to `main` (which auto-deploys via GitHub Pages)
4. Create GitHub release with notes
5. **Update user manual** (see below)

**PATCH** (x.x.+1): bug fixes, label changes, UI tweaks
**MINOR** (x.+1.0): new features
**MAJOR** (+1.0.0): breaking changes, major restructuring

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

## Mockup Fidelity in Development (standing rule, 2026-06-22)

When Alex accepts a `show_widget` mockup, the built implementation **must match it as
closely as possible.** If you can't match it directly, find another way to accomplish
the same design. If something is *genuinely* impossible — treat "impossible" with deep
skepticism, because nothing ever is — stop and tell Alex what happened plus your
recommendations; **never silently ship a build that diverges from the accepted mockup.**
Before calling it done, **verify the built UI against the accepted mockup yourself**
(drive the preview / screenshot) — do not rely on a sub-agent's self-reported
screenshots. (Companion to the mockup-first rule in the global CLAUDE.md; the
regression that prompted this: a Cutting Station hero shipped as a card-in-a-card with
the cut length doubled, nothing like the approved mockup, because a sub-agent's
screenshot was trusted without an independent check.)

## How We Talk — Plain Language for Alex (standing rule, 2026-06-08)

Alex is a firefighter (USAR/FEMA) **and a tech-savvy power user of decades — but from
the user side, not the engineering/IT-internals side.** Assume full fluency with
*using* software: apps, phones, files, accounts, syncing, offline, settings. The wall
is the **under-the-hood engineering jargon** — architecture, data structures, the
plumbing. Translate only that. Do not explain user-level concepts, do not condescend,
do not pad. Calibrate the altitude; never dumb it down.

In **conversation** — chat replies, planning discussions, triage and gate write-ups,
code-review explanations, summaries of what an agent found:

- **Plain first, term in parentheses.** Lead with the meaning, then tuck the
  engineering term in parens so it's available but never in the way. E.g. "all the
  cloud-saving code lives in one swappable spot (a 'data/sync seam')."
- **Give the "so what," not a tutorial.** Say what the thing is and why it matters to
  the app. Skip the walk-through of concepts he already owns.
- **Analogies only when they truly fit — and as a one-liner, not a lecture.** Use
  ICS / shoring / fireground comparisons when the mapping is genuinely strong; skip
  them when forced. (Strong: a data/sync seam ≈ Operations going through one liaison
  instead of calling vendors directly — swap the vendor, Ops never knows.)
- **The glossary is the bridge.** `docs/PLAIN-LANGUAGE-GLOSSARY.md` translates the
  recurring engineering terms. Point Alex there; add new ones as they come up.
- **This applies to `AskUserQuestion` too — the question AND every option's label and
  description (reinforced 2026-06-16).** A multiple-choice question is conversation: if
  Alex can't decide from the option text because it's full of jargon ("headless auth
  core", "RBAC", "the seam"), the question failed. Frame each option in plain language —
  what he'd see or do and why — before offering the choice.

**Scope — conversation only.** This does NOT change how design docs, plans, specs,
ADRs, commit messages, or code comments are written — those keep their precise
vocabulary (v4 doc voice is governed by
`docs/v4-design/07-design-system/voice-and-tone.md`). The job is to pitch our
back-and-forth at the right altitude, not to dumb anything down.

## History & status

### v3.5.2 → v3.17.2 — see `.claude/plans/CONSOLIDATED-STATUS.md`

The per-release "What shipped" view from v3.5.2 onward lives in **`.claude/plans/CONSOLIDATED-STATUS.md`** to keep this file scannable. Covers: XSS hotfix, v3.10.x audit minor + safety hotfix, v3.11.x Hartsdale field feedback + rename + Surfside hotfixes + security/correctness patch, v3.12.0 Command tab + dual-write + hazard log, v3.13.0–v3.14.3 desktop view + viewport-fill, v3.15.0 numbered divisions + offline hardening, v3.16.x SmartArt org chart + desktop polish + transaction resync, v3.17.x pre-v4 bundle + FAB fixes. The v3.11.2 multi-role audit report at `.claude/audits/v3.11.2/SUMMARY.md` is the canonical view of which audit findings closed in v3.11.3 vs deferred to v4.0. Per-release detail for v3.5.2 → v3.9.1 is in its Appendix A.

### ⏳ Still pending — v4.0.0 (major restructure)

v4 phase status, the locked-ADR summary, the scope/interaction decisions and the original v4.0.0 backlog notes live in `.claude/rules/v4-phase-status.md` — a path-scoped rule that loads itself when you touch `src/`, `docs/v4-design/` or `.claude/audits/phase-j/`; open it first in any v4 planning session.
Current state: Phase J Stage B — gates #262 and #264 closed; next #265 rollback plan → #263 manual → Stage C #267 → #268.

## Audits — see .claude/audits/AUDIT-INDEX.md (findings ledger, round-2 deep audit, the v3.3.0 audit team roster).
