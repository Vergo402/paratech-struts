# FieldShore — Project Guide

## What This Is

A PWA for USAR/FEMA firefighters to select Paratech rescue struts by measurement, manage inventory across apparatus, and run shoring operations with ICS/NIMS command structure. Built for field use on mobile — works offline.

**Live:** https://vergo402.github.io/paratech-struts/

**Deployment status (2026-10-09): beta only — no users.** Alex is the sole tester; no department has onboarded. The v3 site above and its Firebase project `paratech-c3ab4` are reference/archive, not a fielded app: route every fix to v4 (`src/`, Firebase `fieldshore-database`), never patch v3 for "production" reasons. `hfd217` in the v3 database is Alex's own test department. Re-check this line before calling anything production-critical.

---

## Architecture

- **3-file split** (refactored from single-file in v2.0.1):
  - `index.html` — HTML shell, modals, forms
  - `app.js` — All application logic, constants, Firebase integration
  - `style.css` — All styles
- **Service worker:** `sw.js` — offline caching with stale-while-revalidate
- **Backend:** Firebase Realtime Database (compat SDK v9.23.0) — project `paratech-c3ab4`
- **Hosting:** GitHub Pages (auto-deploys on push to `main`)
- **No build step.** Edit files, push, done.
- **v3 app internals** (key files, tabs, `app.js` constants + functions, Firebase data structure, Known Patterns & Gotchas, local serve) live in `.claude/rules/v3-app.md`, a path-scoped rule that loads itself when you touch the v3 root files. Line counts are not recorded here (they drift): run `wc -l`.

### Remote

| Name | Repo | Purpose |
|------|------|---------|
| `origin` | `Vergo402/paratech-struts` | Single repo (SSH) |

Uses SSH authentication. Branching workflow: `main` = production, feature branches for new work.

---

## GitHub Project — Status Tracking

When starting work on any GitHub issue (whether via the fieldshore worktree's `/plan-release` or ad-hoc), set its Project Status to **In Progress**:

```bash
# Find the item ID first
gh project item-list 1 --owner Vergo402 --limit 200 --format json \
  | jq -r '.items[] | select(.content.number == ISSUE_NUMBER) | .id'

# Set Status → In Progress
gh project item-edit --id <item-id> --project-id PVT_kwHODy7CN84BYNd6 \
  --field-id PVTSSF_lAHODy7CN84BYNd6zhTU44c \
  --single-select-option-id 47fc9ee4
```

This applies to all work — the fieldshore worktree's `/plan-release` handles it at scope-in and execution start, but ad-hoc fixes must also set it. Status → Done auto-syncs when the issue closes.

---

## Versioning & Release Process

Follow [semver](https://semver.org/): MAJOR.MINOR.PATCH

On every change:
0. **Ensure the `v{VERSION}` Release option exists in the [FieldShore Roadmap Project](https://github.com/users/Vergo402/projects/1)** before any scope-in (the fieldshore worktree's `/plan-release` or ad-hoc) or Project field-edit. Add via the web UI: project settings → fields → "Release" → "+ Add option". **Never** use `gh api graphql ... updateProjectV2Field` to add a single option — the mutation replaces the entire options list (set-and-replace semantics).
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
| `docs/FieldStruts-User-Manual.docx` | Printable/shareable manual — **same text PLUS embedded app screenshots** |

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

---

## History & status

Per-release "what shipped" (v3.5.2 onward, with history tables) lives in `.claude/plans/CONSOLIDATED-STATUS.md`; the v3.11.2 multi-role audit report is `.claude/audits/v3.11.2/SUMMARY.md`.

## Audit references

Entry point `.claude/audits/AUDIT-INDEX.md` (links the findings ledger `findings-ledger.md` and the round-2 deep audit `v3.5.1-deep-audit-round2.md`); the comprehensive plan is `.claude/plans/MASTER-PLAN.md`; the superseded round-1 plans are in `.claude/plans/archive/`.

The 6-role Production Audit Team (v3.3.0) table and pass rules are in `.claude/audits/AUDIT-INDEX.md` § "Production Audit Team (v3.3.0)".
