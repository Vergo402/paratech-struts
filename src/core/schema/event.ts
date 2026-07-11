import { z } from 'zod';
import { ShorePoint, ShorePointStatus, ShorePointPatch, DeployedStrut, DeployedBom } from './shorepoint';
import { OrgPosition, OrgResourceRef } from './org';
import { Hazard } from './hazard';

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
  coords: z.object({ lat: z.number(), lng: z.number() }).optional(), // from address autocomplete
});

export const OperationEdited = z.object({
  type: z.literal('OperationEdited'),
  ...base,
  name: z.string().min(1).optional(),
  multiBuilding: z.boolean().optional(),
  inlineDeploy: z.boolean().optional(), // the mid-incident flip
  location: z.string().nullable().optional(), // null clears the location
  coords: z.object({ lat: z.number(), lng: z.number() }).nullable().optional(), // null clears
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

// A saw added to the operation's Cutting Station roster (#354). Idempotent by
// sawId: re-applying an event whose saw is already on the roster no-ops (safe
// replay; the DivisionAdded model). Add-only for v4.0 — saw removal is deferred
// (YAGNI; a downed saw's claimed cut would need re-homing). 'A' is implicit
// (reducer-seeded), so the first emitted SawAdded is normally 'B'.
export const SawAdded = z.object({
  type: z.literal('SawAdded'),
  ...base,
  sawId: z.string().min(1),
});

// A new operational period started — the IC's OP rollover (#395). Period 1 is
// implicit (reducer-seeded on OperationCreated at its `at`, the divisions/saws
// model), so the first emitted OperationPeriodStarted is normally period 2.
// Idempotent by periodNumber (a re-applied event whose period already exists
// no-ops), so two devices rolling over concurrently converge. The period a given
// OTHER event belongs to is DERIVED (periodOf, core/operation) from this marker's
// `at` — not stamped on every event (ADR-039, the D-10 intent without the field).
export const OperationPeriodStarted = z.object({
  type: z.literal('OperationPeriodStarted'),
  ...base,
  periodNumber: z.number().int().min(2),
  plannedDurationMs: z.number().int().positive().optional(), // omitted → no progress bar / amber
  iapRef: z.string().optional(), //                            ICS-202 / IAP reference, free text
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

// A saw claims a cut off the shared Cutting Station queue (#354). Stamps `sawId`
// onto the `cutting` point so the claim is PERSISTED, not derived from queue
// position — an out-of-order finish therefore never reshuffles who-owns-what, and
// a free saw never steals the cut another saw is mid-way through. Non-inventory →
// the store's plain-append path. The reducer clears sawId when the point steps out
// of cutting (applyCuttingFields); sending to runner keeps it as history.
export const CuttingClaimed = z.object({
  type: z.literal('CuttingClaimed'),
  ...base,
  spId: z.string(),
  sawId: z.string().min(1),
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
  // The team's recorded acknowledgment when deploying into the LongShore unrated
  // zone (>16 ft, no published working load — engine flags it `unrated`). #76:
  // the ack was UI-only and unpersisted; it now rides the immutable event so the
  // store's deploy guard can re-verify it off-UI (a peer/replay must carry it too).
  // Absent ⟺ not acknowledged; meaningful only for an unrated configuration.
  unratedAcknowledged: z.boolean().optional(),
  // The team's recorded acknowledgment when deploying FEWER struts than the
  // estimated load requires (per-strut over-capacity — the strut's share of the
  // load exceeds its rated capacity). Same doctrine as unratedAcknowledged: rides
  // the immutable event so the store's deploy guard re-verifies it off-UI.
  overCapacityAcknowledged: z.boolean().optional(),
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

// The terminal, inventory-consequential move (#224): Wood Shore Secured → Equipment
// Returned. Like EquipmentReturned it restores stock through the same L-8
// transaction (looping every tracked component of the BOM), but it KEEPS
// deployedBom on the point (the returned card shows the equipment as history) and
// the status it lands on is `returned`, not `pending`.
export const EquipmentReclaimed = z.object({
  type: z.literal('EquipmentReclaimed'),
  ...base,
  spId: z.string(),
});

// ── ICS org chart (#323) — granular, keyed-object, concurrent-safe events. The
// default tree seeds on OperationCreated (no migration); these grow/shrink/assign
// it. All non-inventory → the store's plain-append path (no new store branch).

// Add a position from the library or a custom one. Idempotent by id: re-applying an
// event whose position.id already exists no-ops (safe replay; DivisionAdded model).
export const PositionAdded = z.object({
  type: z.literal('PositionAdded'),
  ...base,
  position: OrgPosition, // id minted by the caller (newId())
});

// Remove a position AND its whole subtree (the reducer does the BFS — one event,
// deterministic fold). Built-in default nodes are protected in the reducer.
export const PositionRemoved = z.object({
  type: z.literal('PositionRemoved'),
  ...base,
  positionId: z.string(),
});

export const PositionRenamed = z.object({
  type: z.literal('PositionRenamed'),
  ...base,
  positionId: z.string(),
  title: z.string().min(1),
});

// Move a position under a new parent. The cycle guard (isAncestorOrSelf) is a
// FOLD-TIME reducer rule, so a cycle-creating reparent is dropped even under replay.
export const PositionReparented = z.object({
  type: z.literal('PositionReparented'),
  ...base,
  positionId: z.string(),
  newParentId: z.string(),
});

// A single position's new sibling rank (fractional) — no sibling renumber, so two
// concurrent reorders in different branches never collide.
export const PositionReordered = z.object({
  type: z.literal('PositionReordered'),
  ...base,
  positionId: z.string(),
  order: z.number(),
});

// Assign a resource (a roster rig / individual / device) to a position. Appended to
// assignedResources; the reducer dedups by ref+value.
export const ResourceAssigned = z.object({
  type: z.literal('ResourceAssigned'),
  ...base,
  positionId: z.string(),
  resource: OrgResourceRef,
});

// Clear an assignment. `resource` present → remove that one (ref+value match);
// absent → clear all resources on the position.
export const ResourceCleared = z.object({
  type: z.literal('ResourceCleared'),
  ...base,
  positionId: z.string(),
  resource: OrgResourceRef.optional(),
});

// The device (`by`) self-declares its ICS position (v3 openMyRoleModal). null =
// "clear my role". A device-scoped projection slice, separate from the IC's org.
export const MyRoleSet = z.object({
  type: z.literal('MyRoleSet'),
  ...base,
  positionId: z.string().nullable(),
});

// ── Command transfer (ADR-021, #225) — the two-party handshake. Initiate sets a
// pending transfer (command does NOT move); the named incoming Accepts (command
// moves), or either side Declines/Cancels. The append-only sequence IS the
// transfer-of-command record (closes v3's no-handoff-record gap). Non-inventory.

// The outgoing IC names the incoming commander. The six-datum ICS-201 brief is
// DERIVED at render time (live SitStat), never stored on the event.
export const CommandTransferInitiated = z.object({
  type: z.literal('CommandTransferInitiated'),
  ...base,
  toResource: OrgResourceRef, // the named incoming commander (individual or device)
  // #425 — the 4-digit accept code for individual/apparatus targets (no uid to
  // verify pre-auth): the outgoing IC's device shows it, the incoming commander
  // types it to unlock Accept/Decline; everyone else sees only a quiet pending
  // line. A fat-finger gate, NOT authentication (the log is member-readable) —
  // canAccept's soft claim is unchanged; the check is UI-only (ADR-021 addendum).
  // Absent on device-targeted transfers and on every pre-#425 event (legacy
  // pendings keep the old loud-banner behavior). Emitters spread it conditionally
  // — RTDB rejects undefined.
  claimCode: z.string().regex(/^\d{4}$/).optional(),
});

// The incoming accepts → the reducer moves the IC node's leader + clears pending.
// Guarded at fold time (a matching pending must exist; pre-auth device-uid soft check).
export const CommandTransferAccepted = z.object({
  type: z.literal('CommandTransferAccepted'),
  ...base,
});

export const CommandTransferDeclined = z.object({
  type: z.literal('CommandTransferDeclined'),
  ...base,
});

export const CommandTransferCancelled = z.object({
  type: z.literal('CommandTransferCancelled'),
  ...base,
});

// ── ICS-208 hazard register (#296) — granular, keyed-object, concurrent-safe.
// Non-inventory → the store's plain-append path. A hazard is incident truth; it is
// NEVER a gate (no safety-hold; Principle 10) — only logged, mitigated, reopened.

// Log a hazard. Idempotent by id: re-applying an event whose hazard.id already
// exists no-ops (safe replay; the DivisionAdded/PositionAdded model).
export const HazardLogged = z.object({
  type: z.literal('HazardLogged'),
  ...base,
  hazard: Hazard, // id minted by the caller (newId())
});

// Mark a hazard mitigated — stamps mitigatedBy=`by`, mitigatedAt=`at`. Reversible.
export const HazardMitigated = z.object({
  type: z.literal('HazardMitigated'),
  ...base,
  hazardId: z.string(),
});

// Reopen a mitigated hazard — clears the mitigation stamp (always-reversible,
// ADR-010; not a timed undo).
export const HazardReopened = z.object({
  type: z.literal('HazardReopened'),
  ...base,
  hazardId: z.string(),
});

// ── Checklist attestation (#203/#204/#205, nested-checklist.md) — a leaf check is
// an op-scoped, append-only attestation. `instanceId` scopes it: the op for the
// IC Command Checklist (one per incident), the Group/task for the Task Level
// Checklist (per-Group, M13), the briefing session for ORM/TCRM. `role` is the
// attester's spelled-out ICS title at check time (`by` is the device uid). Un-check
// is its OWN event (never an erasure) — reversibility is the re-tap (ADR-010,
// Principle 6). Never a gate: a checked step records, it does not block (Principle 10).
export const ChecklistItemChecked = z.object({
  type: z.literal('ChecklistItemChecked'),
  ...base,
  checklistId: z.string(),
  instanceId: z.string(),
  itemId: z.string(),
  role: z.string(),
});

export const ChecklistItemUnchecked = z.object({
  type: z.literal('ChecklistItemUnchecked'),
  ...base,
  checklistId: z.string(),
  instanceId: z.string(),
  itemId: z.string(),
  role: z.string(),
});

// ORM/TCRM briefing session wrapper (#205). Begin/End bracket a briefing; the
// timestamps + briefer (`by`) are the who-briefed-which-crew record (D7.5). The
// briefing's STEPS are ChecklistItem* events with checklistId 'orm-tcrm' and
// instanceId = the briefingId. A briefing records — it never gates work (Principle 10).
export const BriefingStarted = z.object({
  type: z.literal('BriefingStarted'),
  ...base,
  briefingId: z.string(),
});

export const BriefingEnded = z.object({
  type: z.literal('BriefingEnded'),
  ...base,
  briefingId: z.string(),
});

export const FieldShoreEvent = z.discriminatedUnion('type', [
  OperationCreated,
  OperationEdited,
  OperationEnded,
  OperationReopened,
  DivisionAdded,
  SawAdded,
  OperationPeriodStarted,
  ShorePointAdded,
  ShorePointEdited,
  ShorePointDeleted,
  ShorePointRestored,
  ShorePointStatusChanged,
  CuttingClaimed,
  StrutDeployed,
  StrutReturned,
  EquipmentDeployed,
  EquipmentReturned,
  EquipmentReclaimed,
  ComponentResourced,
  PositionAdded,
  PositionRemoved,
  PositionRenamed,
  PositionReparented,
  PositionReordered,
  ResourceAssigned,
  ResourceCleared,
  MyRoleSet,
  CommandTransferInitiated,
  CommandTransferAccepted,
  CommandTransferDeclined,
  CommandTransferCancelled,
  HazardLogged,
  HazardMitigated,
  HazardReopened,
  ChecklistItemChecked,
  ChecklistItemUnchecked,
  BriefingStarted,
  BriefingEnded,
]);
export type FieldShoreEvent = z.infer<typeof FieldShoreEvent>;
