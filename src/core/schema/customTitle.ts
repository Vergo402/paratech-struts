import { z } from 'zod';
// Direct-file import (not the schema barrel) keeps this a leaf edge alongside org.ts.
import { OrgPositionKind } from './org';

// A department-defined ICS title that augments the built-in POSITION_LIBRARY catalog
// (#323). It carries an ICS class (`kind`) so its placement derives from the class —
// the same rule the built-ins follow. `members` is the team composition, present ONLY
// for kind ∈ {strike-team, task-force}: the unit slots that auto-spawn under the team
// leader when the template is placed on the chart. Persisted as a meta-JSON list
// (data/store's customTitlesStore), mirroring the apparatus roster — small, list-all,
// no schema migration.
export const TeamMember = z.object({
  type: z.string(), //         an apparatus type (APPARATUS_TYPES) — the slot's unit kind
  count: z.number().int().min(1),
});
export type TeamMember = z.infer<typeof TeamMember>;

export const CustomTitle = z.object({
  id: z.string(),
  title: z.string().min(1),
  kind: OrgPositionKind,
  members: z.array(TeamMember).optional(),
});
export type CustomTitle = z.infer<typeof CustomTitle>;
