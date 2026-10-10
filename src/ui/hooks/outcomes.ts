/** Whether an event took effect in the canonical fold (#499). Mirrors the store's outcome map. */
export type EventOutcome = 'applied' | 'no-effect';

/** Shared empty map — the loading / unmocked default, so callers can always `.get()`. */
export const NO_OUTCOMES: ReadonlyMap<string, EventOutcome> = new Map();
