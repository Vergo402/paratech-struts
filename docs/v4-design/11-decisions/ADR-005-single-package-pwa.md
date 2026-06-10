# ADR-005: Single-package v4.0 PWA; monorepo + React Native deferred to v5

> Architecture Decision Record. The first of the Phase H foundation ADRs — the build-stack decisions that gate the vertical slice. Formal record of the synthesis §2.1 resolution ("Position B"). Companions: [ADR-006](ADR-006-reserved-schema-fields.md) (schema reservations), [ADR-007](ADR-007-build-system-typescript-strict.md) (build system + TS strict), [ADR-023](ADR-023-component-state-stack.md) (component/state stack).

---

## Status

- [x] Accepted

**Date:** 2026-06-09
**Author:** Claude Opus 4.8 (architect agent, drafting)
**Reviewer(s):** Alex — Phase H foundation mini-gate PASSED 2026-06-10

---

## Context

v3 is a single `app.js` (~8,800 lines). The architecture essay (01) proposed a pnpm + Turborepo monorepo with four apps and seven packages — including a React Native shell and a shared `core` package with zero React/Firebase — with RN shipping at v5.0 against that core. The implementation essay (10), backed by the skeptic (08), argued the monorepo buys nothing for the web app today and costs a week of wiring plus ongoing complexity; one repo with two source folders is enough until the RN fork. The synthesis weighed these as a productive conflict (§2.1) and **confirmed at the Phase D gate (PR #282) that Position B is the v4.0 path**. This ADR is the formal record of that confirmed decision, pending the Phase H foundation mini-gate. It closes board [#240](https://github.com/Vergo402/paratech-struts/issues/240).

---

## Decision

**v4.0 ships as a single package with two entry points (`src/app/`, `src/site/`) under one Vite config — not a monorepo, not React Native.** The Turborepo monorepo and the React Native shell are the v5.0 fork. Package-boundary discipline (no React in the `core` seams, no Firebase outside the `data` seams) is enforced by folder structure plus ESLint import rules, not by separate packages.

---

## Rationale

- The monorepo tooling serves the RN unlock, not the v4.0 web app. It costs setup and ongoing build-graph complexity for zero v4.0 benefit. This is consistent with [ADR-003](ADR-003-scope-everyday-expandable.md): "raise the ceiling, not the timeline."
- The package boundaries the architecture essay wants are about *import discipline*, not *deployment units*. ESLint `no-restricted-imports` rules plus a CI boundary check (`Firebase only inside data/`, `no React inside core/`) enforce them inside one package exactly as well as separate `packages/` would — without the wiring.
- The folders extract cleanly into a Turborepo at v5.0 without losing git history (a `git mv` of `src/core/` → `packages/core/`). The seam discipline is what makes that extraction mechanical rather than a rewrite.
- The eleven module seams (below) are named identically in [ADR-007](ADR-007-build-system-typescript-strict.md) so the two foundation ADRs describe one codebase, not two.

**The eleven module seams (verbatim, synthesis §4):**
`core/load`, `core/shorepoint`, `core/operation`, `data/sync`, `data/store`, `ui/quickfind`, `ui/operations`, `ui/inventory`, `ui/command`, `ui/settings`, `ui/checklists`, plus `ui/picker` primitives.

The `data/` boundary is the load-bearing rule: **no Firebase import lives outside the `data/` seams (`data/sync`, `data/store`)** — the same `data/sync` repository seam [ADR-009](ADR-009-database-firebase-rtdb.md) defines so a future backend swap is a transport change. `core/*` holds the pure domain (load tables, shore-point math, operation logic) with no React and no Firebase.

---

## Alternatives Considered

- **pnpm + Turborepo monorepo at v4.0 (essay 01, Position A).** Rejected for v4.0: the tooling is the RN unlock, not a web prerequisite; it costs a week of wiring and standing complexity the single web app never recovers. Adopted at v5.0, not before.
- **React Native at v4.0.** Rejected: RN serves the two phone OSes but the Toughbook and broadcast-TV surfaces still need a web target; shipping native first means writing the web target twice. The PWA serves all four surfaces from one build (§1.8).
- **No package boundaries at all (true single file, v3-style).** Rejected: the 800-line ceiling and the seam list ([ADR-007](ADR-007-build-system-typescript-strict.md)) exist precisely because the v3 monolith is the root cause of half the audit findings.

---

## Consequences

**Positive:**
- One Vite config, one deploy, one mental model for the v4.0 build. The vertical slice starts without monorepo plumbing.
- The `data/` boundary and the eleven seams give v5.0 a clean extraction line — `git mv` per seam, history intact.

**Negative:**
- Boundary discipline rides on ESLint + a CI check rather than hard package walls; a contributor *could* import Firebase into `ui/` until the lint rule trips. The CI boundary check (synthesis tech-debt §4, essay 01 rec 29) is the backstop.

**Neutral:**
- The v5.0 monorepo + RN fork is now an explicit, scheduled future, not an open question. The two source folders (`src/app/`, `src/site/`) are the only intra-package split v4.0 carries.

---

## Related

- **Principles:** 11 (earns its place quietly — no tooling the user never benefits from), 12 (the data class drives the seams, not the framework).
- **Other ADRs:** [ADR-003](ADR-003-scope-everyday-expandable.md) (ceiling-not-timeline frame this applies), [ADR-007](ADR-007-build-system-typescript-strict.md) (same eleven seams + same `data/` boundary + 800-line ceiling), [ADR-009](ADR-009-database-firebase-rtdb.md) (the `data/sync` seam this enforces), [ADR-023](ADR-023-component-state-stack.md) (the stack that fills the `ui/*` seams).
- **Board issue closed:** [#240](https://github.com/Vergo402/paratech-struts/issues/240).
- **Open questions resolved:** [#8](../99-open-questions.md) (PWA vs React Native at v4 → PWA at v4.0, RN at v5.0).
- **Synthesis:** §1.2 (monolith retires), §2.1 (Position B), §4 Architecture (the seam list verbatim).

---

## Notes

This ADR took the long-reserved number 005 named throughout the synthesis (§2.1, §4) and the matrix (A-1, J-19). The future-scale essay 04 and the matrix occasionally point `agencyId`/schema language at "ADR-005"; that content is [ADR-006](ADR-006-reserved-schema-fields.md)'s — ADR-005 is the single-package decision, as the synthesis fixes it (§2.1 line 121). The seam list here is the canonical copy; [ADR-007](ADR-007-build-system-typescript-strict.md) repeats it verbatim and any future edit must change both.
