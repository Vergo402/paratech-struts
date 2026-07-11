import { z } from 'zod';
import { Eighths, System } from './common';

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

// The building face or corner a shore addresses (ADR-008 §4). Sides A/B/C/D with A
// the address/street side, B–D clockwise viewed from above; the four corners sit
// between adjacent faces. A structured locator, separate from the floor-numbered
// `division` and the free-text `area` (SIM-IV O-9). Order = the picker's bird's-eye
// reading (faces, then corners).
export const BuildingSide = z.enum(['A', 'B', 'C', 'D', 'A/B', 'B/C', 'C/D', 'D/A']);
export type BuildingSide = z.infer<typeof BuildingSide>;

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
// LEGACY (pre-ADR-033): the payload of the legacy StrutDeployed event and the
// shape the reducer projects into a one-element deployedBom for old logs. New
// deploys carry the full bill of materials (DeployedBom) below.
export const DeployedStrut = z.object({
  model: z.string(), // e.g. "LS 203"
  source: z.string(), // apparatus name, e.g. "Rescue 2"
  inventoryId: z.string(), // the stock record it was pulled from (L-8 ID round-trip)
});
export type DeployedStrut = z.infer<typeof DeployedStrut>;

// ADR-033 — a deployed shore is a sourced bill of materials. Each physical
// component (the strut + 0–2 base plates + 0–2 extensions) records its OWN
// apparatus source + stock-record id, so different rigs can supply different
// pieces of one shore. The store consumes/restores each component from its own
// rig inside one atomic transaction; the UI renders the list and lets any piece
// be re-pointed later (ComponentResourced).
export const DeployedComponentRole = z.enum(['strut', 'top-plate', 'bottom-plate', 'extension']);
export type DeployedComponentRole = z.infer<typeof DeployedComponentRole>;

// `source` is the apparatus NAME, or the 'untracked' sentinel for an off-book
// piece the crew physically used but that isn't in tracked stock. The invariant:
// inventoryId ABSENT ⟺ untracked — no decrement on deploy, no restore on return.
export const UNTRACKED_SOURCE = 'untracked';

export const DeployedComponent = z.object({
  role: DeployedComponentRole,
  model: z.string().optional(), // strut — Paratech model, e.g. "LS 203"
  plateId: z.string().optional(), // plate roles — BASE_PLATES id
  length: z.number().int().optional(), // extension — length in inches
  system: System.optional(), // strut + extension
  source: z.string(), // apparatus name | UNTRACKED_SOURCE
  inventoryId: z.string().optional(), // absent ⟺ untracked (no stock consequence)
});
export type DeployedComponent = z.infer<typeof DeployedComponent>;

// One physical shore-member's full assembly; the strut is always element-present.
export const DeployedBom = z.array(DeployedComponent).min(1);
export type DeployedBom = z.infer<typeof DeployedBom>;

export const PendingReason = z.enum(['no-match', 'no-inventory', 'over-capacity']);
export type PendingReason = z.infer<typeof PendingReason>;

export const ShorePoint = z.object({
  id: z.string(),
  opId: z.string(),
  // Per-op created-order number — the crew's stable radio handle ("shore point 7").
  // Assigned at creation as max(existing seq)+1 so it SURVIVES deletion (a deleted
  // number is never reused); SHARED across a grouped shore's members (one physical
  // shore = one number; the groupIndex badge distinguishes its struts). Optional for
  // event-replay safety — every runtime point gets one (AddShorePointModal).
  seq: z.number().int().positive().optional(),
  division: z.string(), // floor-based, e.g. "1", "2", "Roof"
  building: z.string().optional(), // only when the operation is multi-building
  area: z.string().optional(),
  side: BuildingSide.optional(), // A–D face / corner (SIM-IV O-9) — separate from area
  shoreType: ShoreTypeId,
  // grouping (KB-7) — a multi-strut shore type writes one point per strut, all
  // sharing a groupId; one group per PHYSICAL shore (a 3-Post = 3 points badged
  // 1/3..3/3). Single-strut shores (T-Shore) are never grouped.
  groupId: z.string().optional(),
  groupIndex: z.number().int().positive().optional(), // 1-based
  groupTotal: z.number().int().positive().optional(),
  // ADR-012 — exact eighths; the engine receives requiredLength = measurementEighths / 8 (RAW, L-2)
  measurementEighths: Eighths,
  deductions: Deductions,
  label: z.string().optional(),
  // The crew/apparatus assigned to work this point (v3 `group`; ADR-008
  // `assignedResource`). Crew accountability — reassignable throughout the op,
  // NOT locked at Pending. The Command roll-up ("who's on what") is Phase I.
  assignedResource: z.string().optional(),
  // Operator's estimated load (lbs) — planning input to the strut search's
  // capacity gating (findForShorePoint passes it to the engine). Absent = 0
  // (capacity demoted, ADR-012). Locked post-Pending like the measurement.
  estimatedLoad: z.number().nonnegative().optional(),
  status: ShorePointStatus,
  // The deployed bill of materials (ADR-033) — strut + plates + extensions, each
  // with its own source/inventoryId. The reducer normalizes legacy StrutDeployed
  // events into a one-element BOM, so every projected deployed point reads here.
  deployedBom: DeployedBom.optional(),
  pendingReason: PendingReason.optional(),
  // Cutting-queue bookkeeping (#222). cuttingStartedAt stamps FIFO order when the
  // point enters `cutting` (the Cutting Station orders by it); cuttingDone is the
  // internal "saw ran" flag ON the `cutting` state — NOT a lane. Both are reducer-
  // managed on the status change (entering cutting stamps; stepping out clears),
  // except cuttingDone which the cutter toggles via a ShorePointEdited patch.
  cuttingStartedAt: z.number().int().nonnegative().optional(),
  cuttingDone: z.boolean().optional(),
  // Multi-saw claim (#354). The id of the saw (roster id 'A'/'B'/…) currently
  // working this cut. Set by CuttingClaimed when a free saw pulls the point off
  // the shared queue; PERSISTED on the point so an out-of-order finish never
  // reshuffles who-owns-what (a claim is not derived from queue position). Cleared
  // when the point steps OUT of cutting (→ strutset); kept across cutting→runner as
  // history (the point leaves the queue, freeing the saw). Absent ⟺ unclaimed.
  sawId: z.string().optional(),
  // Soft-delete flag (#319, ADR-030). Set = the point is deleted but RETAINED in
  // the projection so it can be restored and so its seq stays a high-water mark
  // (a deleted number is never reused). Reducer-managed via ShorePointDeleted /
  // ShorePointRestored only — NOT user-editable, so absent from ShorePointPatch.
  // Distinct from the card's presentational `removed` (the #222 cut-list sense).
  deletedAt: z.number().int().nonnegative().optional(),
  // Physical location of the shore (#441). coords = device GPS fix captured at
  // creation (or via the card's Capture-location action); w3w = the what3words
  // 3m-square words for those coords ("filled.count.soap", no /// prefix) — the
  // radio callout. Converted online; absent w3w with coords present = conversion
  // pending (offline / no key). One fix per GROUP — the capture fans the same
  // patch to every member. Location metadata, NOT a sizing field: applies in any
  // status (like label/assignedResource, exempt from the #220 field-lock).
  coords: z.object({ lat: z.number(), lng: z.number() }).optional(),
  w3w: z.string().optional(),
});
export type ShorePoint = z.infer<typeof ShorePoint>;

// The fields editable while a shore point is still Pending (#220). Shore type +
// measurement lock once it advances past Pending — enforced in the reducer.
// building/area/label follow the OperationEdited.location convention:
// `null` clears the field, `undefined` (absent) = no change.
export const ShorePointPatch = z
  .object({
    division: z.string(),
    building: z.string().nullable(),
    area: z.string().nullable(),
    side: BuildingSide.nullable(),
    shoreType: ShoreTypeId,
    measurementEighths: Eighths,
    deductions: Deductions,
    label: z.string().nullable(),
    assignedResource: z.string().nullable(),
    estimatedLoad: z.number().nonnegative().nullable(),
    // The cutter's "Mark Cut Done" toggle (#222) — applies on the `cutting` state,
    // not gated by the Pending field-lock. true = saw ran; false = clear it.
    cuttingDone: z.boolean(),
    // Location capture (#441) — like label/assignedResource, applies in any status
    // (a fix can resolve after deploy). null clears both together on a re-capture.
    coords: z.object({ lat: z.number(), lng: z.number() }).nullable(),
    w3w: z.string().nullable(),
  })
  .partial();
export type ShorePointPatch = z.infer<typeof ShorePointPatch>;
