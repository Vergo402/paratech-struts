import { z } from 'zod';

// A rig in the department roster. Persisted as a meta-JSON list (data/store's
// apparatusStore), NOT a Dexie table — the roster is small and list-all-only, so
// the meta-row pattern (onboardingStore) avoids a schema migration. `id` is the
// identity; InventoryItem.apparatus (name) is a denormalized display copy keyed
// back here by apparatusId.
//
// `type` is free text (#321 P5 inc4b), NOT a closed enum of APPARATUS_TYPES: a
// department can add its own apparatus types (apparatusTypesStore), so a rig may
// carry a custom type name. The built-in catalog (load/apparatus.ts) + the dept
// vocabulary together drive the picker; this schema only requires a non-empty string.
export const Apparatus = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string().min(1),
});
export type Apparatus = z.infer<typeof Apparatus>;
