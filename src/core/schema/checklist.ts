import { z } from 'zod';

// The doctrine-attestation tree (nested-checklist.md, #196). One primitive backs
// three screens — the IC Command Checklist, the Task Level Checklist, and the
// ORM/TCRM briefing — so the TEMPLATE (the tree of sections + leaves) is defined
// once here. A department may fork and author its own (ADR-020); `source` carries
// the provenance so a tailored step never reads as FieldShore-asserted doctrine.
//
// Templates are department config (a meta-row library, not the event log). The
// ATTESTATIONS — who checked which leaf, when — are op-scoped events folded into
// OperationState.checklists (core/checklist/reducer.ts). Two layers, kept apart.

export const ChecklistId = z.enum(['ic-command', 'task-level', 'orm-tcrm']);
export type ChecklistId = z.infer<typeof ChecklistId>;

// 'fieldshore-baseline' = the shipped tree, unedited. 'department' = forked once a
// dept edits it (Settings editor, Session 3). The badge reads off this.
export const ChecklistProvenance = z.enum(['fieldshore-baseline', 'department']);
export type ChecklistProvenance = z.infer<typeof ChecklistProvenance>;

// A node is a LEAF (checkable, attested) when it has no children, and a SECTION
// (roll-up, derived count) when it has children — the leaf-vs-section rule
// (nested-checklist.md). Same shape either way; depth is content, not a type.
export interface ChecklistNode {
  id: string; //    stable across edits — attestations key on it
  label: string;
  children?: ChecklistNode[];
}
export const ChecklistNode: z.ZodType<ChecklistNode> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    children: z.array(ChecklistNode).optional(),
  }),
);

export const ChecklistTemplate = z.object({
  id: ChecklistId,
  title: z.string().min(1),
  source: ChecklistProvenance,
  // Per-screen default (nested-checklist.md OQ2): IC Command's four long phases on,
  // the shallow Task Level / ORM off. The active branch never auto-collapses.
  autoCollapseCompleted: z.boolean(),
  nodes: z.array(ChecklistNode),
});
export type ChecklistTemplate = z.infer<typeof ChecklistTemplate>;
