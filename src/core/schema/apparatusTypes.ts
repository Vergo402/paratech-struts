import { z } from 'zod';

// A department-defined apparatus type (#321 P5 inc4b) that augments the built-in
// APPARATUS_TYPES catalog (load/apparatus.ts) — e.g. "Water Tender", "Crane", "Drone".
// Persisted as a meta-JSON list (data/store's apparatusTypesStore) + cloud-synced as a
// whole-blob LWW, mirroring the custom-titles library. `id` is the identity; `name` is
// the display + the value stored on a rig's Apparatus.type.
export const ApparatusTypeCustom = z.object({
  id: z.string(),
  name: z.string().min(1).max(40),
});
export type ApparatusTypeCustom = z.infer<typeof ApparatusTypeCustom>;
