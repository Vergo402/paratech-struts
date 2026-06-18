import { z } from 'zod';
// Direct-file import (not the load barrel) keeps this a leaf edge — load/apparatus
// imports nothing, so schema→load here cannot cycle through struts→schema.
import { APPARATUS_TYPES } from '../load/apparatus';

// A rig in the department roster. Persisted as a meta-JSON list (data/store's
// apparatusStore), NOT a Dexie table — the roster is small and list-all-only, so
// the meta-row pattern (onboardingStore) avoids a schema migration. `id` is the
// identity; InventoryItem.apparatus (name) is a denormalized display copy keyed
// back here by apparatusId.
export const Apparatus = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(APPARATUS_TYPES),
});
export type Apparatus = z.infer<typeof Apparatus>;
