import { z } from 'zod';

export const OperationStatus = z.enum(['active', 'ended']);
export type OperationStatus = z.infer<typeof OperationStatus>;

// An active shoring operation. `multiBuilding` gates the Building field in the
// Add-Shore-Point workflow (#220). `name` is the primary identifier everywhere.
export const Operation = z.object({
  id: z.string(),
  name: z.string().min(1),
  multiBuilding: z.boolean(),
  location: z.string().optional(),
  status: OperationStatus,
  createdAt: z.number().int(), // epoch ms
});
export type Operation = z.infer<typeof Operation>;
