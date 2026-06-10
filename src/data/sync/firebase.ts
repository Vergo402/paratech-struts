// PLACEHOLDER — the Firebase service lands here in a later session (scope
// decision 1, settled with Alex 2026-06-10). This file (with syncService.ts)
// will be the ONLY place in the codebase that imports Firebase (invariant 1,
// lint-enforced). The real session brings: modular v9 SDK (tree-shaken), the
// RTDB event-log transport (ADR-009), Zod→security-rules generation (L-5),
// listener teardown + the empty-first-snapshot guard (L-6), and the
// /diagnostics/sync/ ledger (L-5/L-8).
export {};
