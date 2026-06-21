// core/hazard — the pure ICS-208 hazard register (no React, no data layer). The
// schema lives in core/schema/hazard.ts (re-exported here for convenience); this
// module is the reducer + the open-first severity sort + the Division resolution
// that the reducer (P2) and the UI (P9) build on.
export type { Hazard, Hazards, HazardType, HazardSeverity } from '../schema/hazard';
export * from './reducer';
