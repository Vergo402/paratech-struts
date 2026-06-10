import { z } from 'zod';

// The three Paratech strut systems (color is the real field-ID attribute):
//   AcmeThread (Grey) · LongShore (Gold) · LockStroke (Grey).
// LockStroke shares AcmeThread's load table.
export const System = z.enum(['AcmeThread', 'LongShore', 'LockStroke']);
export type System = z.infer<typeof System>;

// ADR-012 — measurements are exact eighths-of-an-inch integers. Never a float;
// rounding (floor) happens only at the display/effective-length boundary (L-2).
export const Eighths = z.number().int().nonnegative();
export type Eighths = z.infer<typeof Eighths>;
