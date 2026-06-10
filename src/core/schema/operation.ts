import { z } from 'zod';

export const OperationStatus = z.enum(['active', 'ended']);
export type OperationStatus = z.infer<typeof OperationStatus>;

// An active shoring operation. `multiBuilding` gates the Building field in the
// Add-Shore-Point workflow (#220). `name` is the primary identifier everywhere.
// `divisions` is the operation's floor list (v3 grow-the-building model):
// positive = floors (1 = Ground), negative = Sub Divisions (−1 = Basement),
// never 0. Initialized to [1] by the reducer on OperationCreated and grown
// via DivisionAdded events — never written whole (concurrent adds converge).
export const Operation = z.object({
  id: z.string(),
  name: z.string().min(1),
  multiBuilding: z.boolean(),
  location: z.string().optional(),
  divisions: z.array(z.number().int()),
  status: OperationStatus,
  createdAt: z.number().int(), // epoch ms
});
export type Operation = z.infer<typeof Operation>;
