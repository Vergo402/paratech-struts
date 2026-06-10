// core/load — the safety-critical selection engine + its frozen data tables.
// Pure: no React, no Firebase, no data/ui. L-1 (conservative floor) and L-2
// (deduct-once, floor-only-the-display) live here and are pinned by tests.
export * from './tables';
export * from './struts';
export * from './plates';
export * from './engine';
