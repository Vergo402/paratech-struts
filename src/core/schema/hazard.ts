import { z } from 'zod';

// The ICS-208 hazard register, event-sourced like everything else (ADR-009). A
// hazard is one entry in the open-first-by-severity list; it is logged, mitigated
// (reversible), and reopened — never a gate (no safety-hold; Principle 10). Stored
// keyed-by-id on OperationState.hazards (core/hazard/reducer.ts folds it).
export const HazardType = z.enum([
  'structural', // collapse, void, overload, leaning wall
  'utility', //    gas, electrical, water
  'atmospheric', //O2 / CO / dust / IDLH
  'fall', //       edge, hole, height
  'other',
]);
export type HazardType = z.infer<typeof HazardType>;

export const HazardSeverity = z.enum(['low', 'medium', 'high']);
export type HazardSeverity = z.infer<typeof HazardSeverity>;

export const Hazard = z.object({
  id: z.string(), //                    crypto.randomUUID (newId), minted by the caller
  type: HazardType,
  location: z.string().min(1), //       free text (v3 schema); resolved to a Division for SP-card badges
  severity: HazardSeverity,
  notes: z.string().optional(),
  reportedBy: z.string(), //            the per-device uid (deferred-auth-friendly attribution)
  reportedAt: z.number().int(), //      epoch ms
  // Mitigation stamp — set by HazardMitigated, cleared by HazardReopened (a hazard
  // with mitigatedAt set is "mitigated"; absent ⟺ still open).
  mitigatedBy: z.string().optional(),
  mitigatedAt: z.number().int().optional(),
});
export type Hazard = z.infer<typeof Hazard>;

// Keyed-object storage — the same concurrent-safe model as positions/shorePoints.
export type Hazards = Record<string, Hazard>;
