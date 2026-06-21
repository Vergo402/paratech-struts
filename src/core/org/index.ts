// core/org — pure ICS org-chart algebra (no React, no data layer). The schema lives
// in core/schema/org.ts (re-exported here for convenience); this module is the tree
// math, span-of-control, the default tree, the resource link, and the position
// library that the reducer (P1) and the UI (P5+) build on.
export type { OrgPosition, OrgPositions, OrgPositionKind, OrgResourceRef } from '../schema/org';
export * from './defaultTree';
export * from './tree';
export * from './span';
export * from './resource';
export * from './library';
export * from './orgReducer';
