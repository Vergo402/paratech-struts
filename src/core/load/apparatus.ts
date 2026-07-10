// Apparatus types — the NIMS resource kinds a department's rigs can be. Ported
// from v3 APPARATUS_TYPES_DEFAULT (app.js:3360) MINUS "Task Force": NIMS treats a
// Task Force as a resource *configuration* (a mix of kinds assembled for a
// purpose), not an apparatus kind, so it has no place in this list (ADR-008,
// decision 7). Names are spelled out — no acronyms (ADR-008). Array order is the
// picker's listing order.
export const APPARATUS_TYPES = ['Chief', 'Engine', 'Ladder', 'Rescue', 'Squad', 'Other'] as const;
