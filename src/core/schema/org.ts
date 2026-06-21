import { z } from 'zod';

// The ICS org chart, event-sourced like everything else (ADR-009). A position is
// one node in an arbitrary-depth tree; `kind` is the full ICS taxonomy and drives
// rendering (command-staff to the side, workstation card vs command box), the
// span-of-control count, and which library positions may be added beneath it.
// Stored keyed-by-id on OperationState.positions (no v3 dual array+keyed cruft).
export const OrgPositionKind = z.enum([
  'command', //          Incident Commander (the single root)
  'command-staff', //    Safety Officer / Public Information Officer / Liaison Officer
  'section', //          Operations / Planning / Logistics / Finance Section Chief
  'branch', //           Branch Director (span-of-control relief layer)
  'division', //         geographic — Division Supervisor (numbered by floor)
  'group', //            functional — Rescue / Shoring / Search … Group Supervisor
  'unit', //             Unit Leader (Planning / Logistics / Finance units)
  'staging', //          Staging Area Manager
  'workstation', //      Cutting Station — a card like Staging, NOT a command box (ADR-008)
  'strike-team', //      Strike Team Leader (5 same-type resources)
  'task-force', //       Task Force Leader (mixed resources)
  'single-resource', //  a single apparatus/crew placed directly
]);
export type OrgPositionKind = z.infer<typeof OrgPositionKind>;

// What an assigned resource points at. Designed so the deferred auth layer needs no
// reshape — the device keeps riding the per-device uid.
//   apparatus  → Apparatus.id (the roster id); label = rig name
//   individual → free-text person name (no people roster in v4.0); value === label
//   device     → the per-device uid (the "self / My Role" assignment); label = name
// `label` is denormalized at assign time so the chart renders without a roster join
// and an archived op still reads after a rig is renamed/removed.
export const OrgResourceRef = z.object({
  ref: z.enum(['apparatus', 'individual', 'device']),
  value: z.string(),
  label: z.string(),
});
export type OrgResourceRef = z.infer<typeof OrgResourceRef>;

export const OrgPosition = z.object({
  id: z.string(),
  title: z.string().min(1), //          spelled-out NIMS title (ADR-008) or a custom title
  kind: OrgPositionKind,
  parentId: z.string().nullable(), //   null ⟺ the root (Incident Commander)
  builtIn: z.boolean(), //              seeded by the default tree — protected from removal
  // Sibling order: a sparse rank so reorder/insert is ONE position's event, never a
  // renumber of siblings (concurrent-safe — see PositionReordered).
  order: z.number(),
  // Multi-resource per position: leader = assignedResources[0] (drives the node's
  // headline name + the gold IC accent); the rest are staff/resources. Staging holds
  // many rigs; a Group has a Supervisor + crew.
  assignedResources: z.array(OrgResourceRef).default([]),
  side: z.enum(['A', 'B', 'C', 'D']).optional(), // geographic locator — kind 'division' only
  floor: z.number().int().optional(), //            division floor number (division.ts scheme)
});
export type OrgPosition = z.infer<typeof OrgPosition>;

// Keyed-object storage: assign/reparent/remove are O(1) by id and concurrent-safe
// (two events touching different ids never collide). Children/subtree are DERIVED
// (core/org/tree.ts), never stored — no parent/child list to keep in sync.
export type OrgPositions = Record<string, OrgPosition>;
