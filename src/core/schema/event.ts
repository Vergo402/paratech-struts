import { z } from 'zod';
import { ShorePoint, ShorePointStatus, ShorePointPatch, DeployedStrut, DeployedBom } from './shorepoint';

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

// Re-open a previously ended operation (ADR-036) — flips an archived op's status
// back to `active` so the board can pick it up again. Mirrors OperationEnded; the
// store rejects it when another op is already active (one active op at a time).
// NOT a timed undo (ADR-010) — an explicit, confirmed action on an archived record.
export const OperationReopened = z.object({
  type: z.literal('OperationReopened'),
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

// LEGACY (pre-ADR-033) — single-strut deploy/un-deploy. Retained as union members
// so an existing local event log still projects (the reducer maps a legacy
// StrutDeployed into a one-element deployedBom). The app no longer EMITS these;
// new deploys write EquipmentDeployed / EquipmentReturned below.
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

// ADR-033 — Deploy = the atomic pending→process move: records the full bill of
// materials on the point AND decrements EACH component's available stock from its
// own rig, all inside one transaction (all-or-nothing). Un-deploy is
// EquipmentReturned (process→pending, restores every component).
export const EquipmentDeployed = z.object({
  type: z.literal('EquipmentDeployed'),
  ...base,
  spId: z.string(),
  deployedBom: DeployedBom,
});

export const EquipmentReturned = z.object({
  type: z.literal('EquipmentReturned'),
  ...base,
  spId: z.string(),
});

// ADR-033 — re-point ONE already-deployed component to a different rig (or to/from
// untracked) after deploy, identified by its index in the point's deployedBom. The
// store restores the old source's unit (if tracked) and consumes the new source's
// (if tracked) atomically; the reducer swaps that component's source/inventoryId.
export const ComponentResourced = z.object({
  type: z.literal('ComponentResourced'),
  ...base,
  spId: z.string(),
  componentIndex: z.number().int().nonnegative(),
  source: z.string(),
  inventoryId: z.string().optional(), // absent ⟺ now untracked
});

// The terminal, inventory-consequential move (#224): Shore Secured → Equipment
// Returned. Like EquipmentReturned it restores stock through the same L-8
// transaction (looping every tracked component of the BOM), but it KEEPS
// deployedBom on the point (the returned card shows the equipment as history) and
// the status it lands on is `returned`, not `pending`.
export const EquipmentReclaimed = z.object({
  type: z.literal('EquipmentReclaimed'),
  ...base,
  spId: z.string(),
});

export const FieldShoreEvent = z.discriminatedUnion('type', [
  OperationCreated,
  OperationEdited,
  OperationEnded,
  OperationReopened,
  DivisionAdded,
  ShorePointAdded,
  ShorePointEdited,
  ShorePointDeleted,
  ShorePointRestored,
  ShorePointStatusChanged,
  StrutDeployed,
  StrutReturned,
  EquipmentDeployed,
  EquipmentReturned,
  EquipmentReclaimed,
  ComponentResourced,
]);
export type FieldShoreEvent = z.infer<typeof FieldShoreEvent>;
