import { z } from 'zod';
import { ShorePoint, ShorePointStatus, ShorePointPatch, DeployedStrut } from './shorepoint';

// ADR-009 — the event log is the spine. Every mutation is one immutable, append-
// only event; current state is a projection (core/operation/projection.ts). The
// audit log IS this log filtered — not a second path. Every event carries who
// (`by` = the per-device uid) and when (`at` = epoch ms).
const base = {
  id: z.string(), // event id (crypto.randomUUID)
  opId: z.string(),
  at: z.number().int(),
  by: z.string(),
} as const;

export const OperationCreated = z.object({
  type: z.literal('OperationCreated'),
  ...base,
  name: z.string().min(1),
  multiBuilding: z.boolean(),
  inlineDeploy: z.boolean().optional(), // absent on pre-feature events → reducer defaults true
  location: z.string().optional(),
});

export const OperationEdited = z.object({
  type: z.literal('OperationEdited'),
  ...base,
  name: z.string().min(1).optional(),
  multiBuilding: z.boolean().optional(),
  inlineDeploy: z.boolean().optional(), // the mid-incident flip
  location: z.string().nullable().optional(), // null clears the location
});

export const OperationEnded = z.object({
  type: z.literal('OperationEnded'),
  ...base,
});

// A floor added to the operation's division list (#220 — the v3 grow-the-
// building model, app.js addFloorAbove/Below). Additive on purpose: two
// devices concurrently adding "floor above" both emit { division: N } and the
// reducer converges (idempotent) — an edited full array would clobber.
// Division 0 does not exist (1 = Ground, −1 = Basement).
export const DivisionAdded = z.object({
  type: z.literal('DivisionAdded'),
  ...base,
  division: z
    .number()
    .int()
    .refine((n) => n !== 0, 'division 0 does not exist'),
});

export const ShorePointAdded = z.object({
  type: z.literal('ShorePointAdded'),
  ...base,
  shorePoint: ShorePoint, // grouped adds emit one event per member (shared groupId)
});

export const ShorePointEdited = z.object({
  type: z.literal('ShorePointEdited'),
  ...base,
  spId: z.string(),
  patch: ShorePointPatch,
});

// Soft-delete (#319, ADR-030): the point is RETAINED in the projection with a
// deletedAt stamp, not filtered out — so it stays restorable and its seq remains
// a high-water mark (a deleted number is never reused). Pending-only, like before.
// `hard: true` is the exception — a STRUCTURAL removal (a strut dropped when a
// shore's type changes to fewer struts) that filters the point out for good; not
// user-facing, never surfaces in the Deleted list.
export const ShorePointDeleted = z.object({
  type: z.literal('ShorePointDeleted'),
  ...base,
  spId: z.string(),
  hard: z.boolean().optional(),
});

// Undo of ShorePointDeleted (#319) — clears the deletedAt stamp, returning the
// point to its lane. No time limit (always-reversible, ADR-010); not a timed undo.
export const ShorePointRestored = z.object({
  type: z.literal('ShorePointRestored'),
  ...base,
  spId: z.string(),
});

// A non-inventory status transition (both directions, ADR-010). Inventory-
// consequential moves are StrutDeployed / StrutReturned below, not this.
export const ShorePointStatusChanged = z.object({
  type: z.literal('ShorePointStatusChanged'),
  ...base,
  spId: z.string(),
  from: ShorePointStatus,
  to: ShorePointStatus,
});

// Deploy = the atomic pending→process move: records the strut on the point AND
// decrements that apparatus's available stock. Un-deploy is StrutReturned.
export const StrutDeployed = z.object({
  type: z.literal('StrutDeployed'),
  ...base,
  spId: z.string(),
  deployedStrut: DeployedStrut,
});

export const StrutReturned = z.object({
  type: z.literal('StrutReturned'),
  ...base,
  spId: z.string(),
});

// The terminal, inventory-consequential move (#224): Shore Secured → Strut
// Equipment Returned. Like StrutReturned it restores stock through the same L-8
// transaction, but it KEEPS deployedStrut on the point (the returned card shows
// the equipment as history) and the status it lands on is `returned`, not
// `pending`. Strut-only restore today (mirrors today's deploy footprint); widens
// to the full bill-of-materials (extensions + connectors + base plates) when the
// inventory build lands (#330 / ADR-033), symmetric with deploy at one seam.
// Named `Reclaimed` to leave the `Equipment*` deploy/return names free for that
// build (ADR-033 renames StrutDeployed/Returned → EquipmentDeployed/Returned).
export const EquipmentReclaimed = z.object({
  type: z.literal('EquipmentReclaimed'),
  ...base,
  spId: z.string(),
});

export const FieldShoreEvent = z.discriminatedUnion('type', [
  OperationCreated,
  OperationEdited,
  OperationEnded,
  DivisionAdded,
  ShorePointAdded,
  ShorePointEdited,
  ShorePointDeleted,
  ShorePointRestored,
  ShorePointStatusChanged,
  StrutDeployed,
  StrutReturned,
  EquipmentReclaimed,
]);
export type FieldShoreEvent = z.infer<typeof FieldShoreEvent>;
