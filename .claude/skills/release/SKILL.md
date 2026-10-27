---
name: release
description: "Version bump and release steps for every fieldshore change: the 3 version locations, feature branch, merge to main, GitHub release, user-manual parity. Use when bumping the version, shipping, tagging, or releasing."
---

# Release checklist

On every change:
0. **Ensure the `v{VERSION}` Release option exists in the [FieldShore Roadmap Project](https://github.com/users/Vergo402/projects/1)** before any `/plan-release` scope-in or Project field-edit. Add via the web UI: project settings → fields → "Release" → "+ Add option". **Never** use `gh api graphql ... updateProjectV2Field` to add a single option — the mutation replaces the entire options list (set-and-replace semantics).
1. Update version in **3 places:**
   - `index.html` header label: `<div class="version-label">v{VERSION}</div>` 
   - `app.js`: `const APP_VERSION = '{VERSION}'` (near the top of the file)
   - `sw.js` cache name: `const CACHE_NAME = 'fieldshore-v{VERSION}';`
2. Work on a feature branch — do NOT push directly to `main` unless Alex explicitly says to
3. When ready, merge to `main` (which auto-deploys via GitHub Pages)
4. Create GitHub release with notes
5. **Update user manual** (see "User Manual — Auto-Update Rule" in CLAUDE.md)

## Version tiers (semver MAJOR.MINOR.PATCH)

- **PATCH** (x.x.+1): bug fixes, label changes, UI tweaks
- **MINOR** (x.+1.0): new features
- **MAJOR** (+1.0.0): breaking changes, major restructuring
