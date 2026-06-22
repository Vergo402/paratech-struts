// core/checklist - the doctrine-attestation algebra (no React, no data layer).
// The template tree schema lives in core/schema/checklist.ts (re-exported via the
// schema barrel); this module is the attestation reducer slice, the derived-count
// progress helpers, and the FieldShore-baseline templates the UI renders.
export * from './reducer';
export * from './progress';
export * from './baseline';
