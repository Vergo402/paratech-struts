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
  // Deploy mode (per-op, flippable mid-incident via Edit Operation). true = v3
  // one-step: Find Available Struts + Deploy live in the Add Shore Point form.
  // false = v4 two-step: describe → Pending → Assign Equipment sheet. The
  // two-step Assign sheet stays available in BOTH modes.
  inlineDeploy: z.boolean(),
  location: z.string().optional(),
  // Map coordinates for `location`, captured when the address is picked from
  // Google Places autocomplete (StartOperationModal). Absent for a hand-typed
  // location — the field works offline without it. Stored for a future map view.
  coords: z.object({ lat: z.number(), lng: z.number() }).optional(),
  divisions: z.array(z.number().int()),
  // The Cutting Station saw roster (#354) — the ids of the saws on this op's cut
  // station ('A', 'B', …). Initialized to ['A'] by the reducer (one saw, the common
  // case) and grown via SawAdded events — never written whole, like `divisions`, so
  // concurrent adds converge and legacy ops (no SawAdded) project a single Saw A for
  // free (no migration). Single-device for v4.0; cross-tablet live mirroring is #369.
  saws: z.array(z.string()),
  status: OperationStatus,
  createdAt: z.number().int(), // epoch ms
  // Operational-period projection (#395). Period 1 is reducer-seeded on
  // OperationCreated (startedAt = createdAt), grown via OperationPeriodStarted —
  // never written whole, like `divisions`/`saws`, so legacy ops (no rollover event)
  // project a single period for free (no migration). `currentPeriod` = the highest
  // period number reached. `periodOf` (core/operation) maps any event's `at` to its
  // period from this list — periods are NOT stamped on every event (ADR-039).
  currentPeriod: z.number().int().min(1),
  periods: z.array(
    z.object({
      number: z.number().int().min(1),
      startedAt: z.number().int(), // epoch ms
      plannedDurationMs: z.number().int().positive().optional(),
      iapRef: z.string().optional(),
    }),
  ),
});
export type Operation = z.infer<typeof Operation>;
export type OperationPeriod = Operation['periods'][number];
