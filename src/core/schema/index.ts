// core/schema — the single source of truth for v4 domain types + validation.
// Zod schemas here generate both the TypeScript types and (in a later session,
// L-5) the Firebase security rules, so client and server validate identically.
export * from './common';
export * from './operation';
export * from './shorepoint';
export * from './org';
export * from './hazard';
export * from './checklist';
export * from './inventory';
export * from './apparatus';
export * from './apparatusTypes';
export * from './customTitle';
export * from './event';
export * from './department';
