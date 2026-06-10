import { z } from 'zod';
import { Eighths } from './common';

// ---- Status — the seven-state lifecycle (ADR-008 rename: v3 `strutplaced` →
// v4 `strutset`). Declaration order IS the lifecycle order; STATUS_IDS exposes
// it as the canonical ordered tuple that core/shorepoint/status.ts builds
// STATUS_ORDER + the transition guard from. This enum is the single source. ----
export const ShorePointStatus = z.enum([
  'pending',
  'process',
  'strutset',
  'cutting',
  'runner',
  'secured',
  'returned',
]);
export type ShorePointStatus = z.infer<typeof ShorePointStatus>;

/** The 7 status ids in lifecycle order (e.g. STATUS_IDS[0] === 'pending'). */
export const STATUS_IDS = ShorePointStatus.options;

// ---- Shore type + wood sizes (mirror SHORE_TYPES / WOOD_SIZES in core/load) ----
export const ShoreTypeId = z.enum(['t-shore', 'double-t', '3-post']);
export type ShoreTypeId = z.infer<typeof ShoreTypeId>;

export const WoodSizeId = z.enum(['none', '4x4', '6x6']);
export type WoodSizeId = z.infer<typeof WoodSizeId>;

// What the operator SELECTED for each deduction slot. The exact catalog heights
// are resolved at compute time by the reducer (L-2 — store the choice, deduct
// the exact value, floor only the final effective length). topPlate/bottomPlate
// are BASE_PLATES ids (validated against the catalog in the reducer).
export const Deductions = z.object({
  headerWood: WoodSizeId,
  footerWood: WoodSizeId,
  topPlate: z.string(), // base-plate id
  bottomPlate: z.string(), // base-plate id
});
export type Deductions = z.infer<typeof Deductions>;

export const NO_DEDUCTIONS: Deductions = {
  headerWood: 'none',
  footerWood: 'none',
  topPlate: 'none',
  bottomPlate: 'none',
};

// The strut identity a deployed shore point carries cradle-to-grave (card.md).
export const DeployedStrut = z.object({
  model: z.string(), // e.g. "LS 203"
  source: z.string(), // apparatus name, e.g. "Rescue 2"
  inventoryId: z.string(), // the stock record it was pulled from (L-8 ID round-trip)
});
export type DeployedStrut = z.infer<typeof DeployedStrut>;

export const PendingReason = z.enum(['no-match', 'no-inventory']);
export type PendingReason = z.infer<typeof PendingReason>;

export const ShorePoint = z.object({
  id: z.string(),
  opId: z.string(),
  division: z.string(), // floor-based, e.g. "1", "2", "Roof"
  building: z.string().optional(), // only when the operation is multi-building
  area: z.string().optional(),
  shoreType: ShoreTypeId,
  // grouping — a grouped shore type (T-Shore ×N) writes N linked points sharing groupId
  groupId: z.string().optional(),
  groupIndex: z.number().int().positive().optional(), // 1-based
  groupTotal: z.number().int().positive().optional(),
  // ADR-012 — exact eighths; the engine receives requiredLength = measurementEighths / 8 (RAW, L-2)
  measurementEighths: Eighths,
  deductions: Deductions,
  label: z.string().optional(),
  status: ShorePointStatus,
  deployedStrut: DeployedStrut.optional(),
  pendingReason: PendingReason.optional(),
});
export type ShorePoint = z.infer<typeof ShorePoint>;

// The fields editable while a shore point is still Pending (#220). Shore type +
// measurement lock once it advances past Pending — enforced in the reducer.
export const ShorePointPatch = z
  .object({
    division: z.string(),
    building: z.string().optional(),
    area: z.string().optional(),
    shoreType: ShoreTypeId,
    measurementEighths: Eighths,
    deductions: Deductions,
    label: z.string().optional(),
  })
  .partial();
export type ShorePointPatch = z.infer<typeof ShorePointPatch>;
