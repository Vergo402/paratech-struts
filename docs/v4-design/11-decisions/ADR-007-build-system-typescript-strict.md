# ADR-007: Build system + TypeScript strict

> Architecture Decision Record. The Phase H build-stack record: adopt Vite + TypeScript strict from line one for v4.0 and retire v3's no-build single-file architecture. Closes board [#242](https://github.com/Vergo402/paratech-struts/issues/242) (build tooling) **and** [#244](https://github.com/Vergo402/paratech-struts/issues/244) (TypeScript). Companions: [ADR-005](ADR-005-single-package-pwa.md) (single package — same eleven seams + `data/` boundary), [ADR-023](ADR-023-component-state-stack.md) (the component/state stack on top).

---

## Status

- [x] Accepted

**Date:** 2026-06-09
**Author:** Claude Opus 4.8 (architect agent, drafting)
**Reviewer(s):** Alex — Phase H foundation mini-gate PASSED 2026-06-10

---

## Context

v3 has no build step: edit `app.js` (~8,800 lines), push, GitHub Pages deploys. That served the prototype phase. The Round-2 audit found ~100 unique issues, and ~30% of them are exactly the class a compiler catches: the `customRoles`-array assumption, inventory-item shape drift, role assignment to a deleted role, and the `escapeHtml`/`escapeAttr` + null-guard hand-discipline that v3 enforces site-by-site by eye. The architecture (01), data-resilience (09), implementation (10), and tech-debt (12) essays converged on Vite + TypeScript strict + a real CI pipeline; the skeptic (08, rec H-12) dissented ("preserve single-file unless the architecture names a blocked capability"). The synthesis weighed this as a productive conflict (§2.8) and **confirmed at the Phase D gate (PR #282) that the build system + TS strict are adopted for v4.0**. This ADR is the formal record, pending the Phase H foundation mini-gate. It closes board [#242](https://github.com/Vergo402/paratech-struts/issues/242) and [#244](https://github.com/Vergo402/paratech-struts/issues/244).

---

## Decision

**Adopt Vite + TypeScript strict from line one for v4.0; retire v3's no-build single-file architecture.** TypeScript strict means `strict`, `noImplicitAny`, `strictNullChecks`, and `noUncheckedIndexedAccess` all on. The codebase is the eleven module seams below, each held to an **800-line file ceiling — no file grows past 800 lines without an explicit seam decision.**

---

## Rationale

- **~30% of the v3 audit findings are the class TypeScript catches at compile time** (synthesis §2.8). The hand-discipline that v3 spends on `escapeHtml`/`escapeAttr` and null-guards becomes compile-time enforcement — and JSX defaults plus a `react/no-danger` lint retire the escaping discipline entirely (synthesis §4 Tech debt).
- **The single-file architecture *is* the root cause** of half the audit findings (synthesis §1.2). v4 is no longer the prototype phase; the file is the bug surface.
- **The cost is accepted and bounded:** a ~17-minute push-to-prod loop vs. v3's ~15-minute. The skeptic is technically right that tree-shaking and HMR are not user features — and operationally wrong: the audit ledger is the capability gap the skeptic asked for (synthesis §2.8).
- **The 800-line ceiling is the durable guardrail** against a new monolith. It forces a seam decision instead of organic growth — the discipline that the 8,800-line `app.js` lacked.

**The eleven module seams (verbatim, synthesis §4 — identical to [ADR-005](ADR-005-single-package-pwa.md)):**
`core/load`, `core/shorepoint`, `core/operation`, `data/sync`, `data/store`, `ui/quickfind`, `ui/operations`, `ui/inventory`, `ui/command`, `ui/settings`, `ui/checklists`, plus `ui/picker` primitives.

The `data/` boundary is enforced identically to [ADR-005](ADR-005-single-package-pwa.md): **no Firebase import outside the `data/` seams (`data/sync`, `data/store`)**, and **no React inside `core/*`**. Vite's TypeScript handling (esbuild in dev, Rollup for the production build) plus ESLint `no-restricted-imports` make the boundary a compile/lint failure, not a convention.

---

## Alternatives Considered

- **Preserve v3's no-build single-file architecture (skeptic, essay 08 rec H-12).** Rejected (synthesis §2.8): the audit ledger names the capability gap the skeptic demanded — ~30% of findings are compile-time-catchable. The no-build model served the prototype; v4 is past it.
- **esbuild raw / Webpack / Parcel.** Rejected (essay 01 §4): Vite's dev server (single-digit-ms HMR), native TS handling, Rollup production build with proper splitting, and the plugin ecosystem (`vite-plugin-pwa` retires the hand-maintained `sw.js` cache bump) are the reachable-FAANG-bar floor; the others trade one of those away.
- **JavaScript with JSDoc types (no TypeScript).** Rejected: JSDoc does not give `strictNullChecks` / `noUncheckedIndexedAccess` teeth, which is precisely the audit-finding class (shape drift, deleted-role assignment) being closed.

---

## Consequences

**Positive:**
- The audit-finding class (shape drift, null deref, deleted-role assignment, XSS-by-string-concat) moves from runtime + hand-discipline to compile time + JSX defaults.
- `vite-plugin-pwa` retires the manual `CACHE_NAME` bump-per-release; cache invalidation becomes automatic on the manifest hash (the Firebase WebSocket exclusion stays as a Workbox route rule).
- The 800-line ceiling keeps any single file from becoming the next `app.js`.

**Negative:**
- A build step and a ~2-minute-longer push-to-prod loop (~17 vs. ~15 min) — the accepted cost of trading hand-discipline for compile-time enforcement.
- A real CI pipeline (typecheck, lint, the boundary check, the load-table snapshot test) is now a prerequisite to ship — more infrastructure than v3 carried.

**Neutral:**
- Storage moves `localStorage` → IndexedDB (Dexie) and the database stays RTDB ([ADR-009](ADR-009-database-firebase-rtdb.md)); those are independent of the build choice but ride the same v4.0 cutover.

---

## Related

- **Principles:** 11 (the tooling disappears — the build is invisible to the firefighter), 12 (the data class justifies typed domain math the SME can read and trust).
- **Other ADRs:** [ADR-005](ADR-005-single-package-pwa.md) (same eleven seams, same `data/` boundary, same 800-line ceiling — one codebase), [ADR-009](ADR-009-database-firebase-rtdb.md) (the `data/sync` seam the boundary protects; Zod-generated security rules ride the build), [ADR-023](ADR-023-component-state-stack.md) (the stack the build compiles), [ADR-006](ADR-006-reserved-schema-fields.md) (the Zod schemas strict-TS validates).
- **Board issues closed:** [#242](https://github.com/Vergo402/paratech-struts/issues/242) (build tooling), [#244](https://github.com/Vergo402/paratech-struts/issues/244) (TypeScript).
- **Open questions resolved:** [#11](../99-open-questions.md) (build tooling: Vite, esbuild, or no-build → Vite), [#12](../99-open-questions.md) (TypeScript adoption → yes, strict).
- **Synthesis:** §1.2 (monolith retires + seam list), §2.8 (build vs. no-build), §4 Architecture / Tech debt.

---

## Notes

This ADR took the long-reserved number 007 named throughout the synthesis (§2.8, §4) and the matrix (A-4, H-12, J-3, L-20). The database-evaluation reference doc and [ADR-009](ADR-009-database-firebase-rtdb.md) §Notes flag that "ADR-007" once appeared as a placeholder for the database decision; that collision was resolved by moving the database choice to 009, leaving 007 for the build-system decision as the synthesis fixes it. The eleven-seam list and `data/` boundary are stated identically here and in [ADR-005](ADR-005-single-package-pwa.md); any future edit must change both files.
