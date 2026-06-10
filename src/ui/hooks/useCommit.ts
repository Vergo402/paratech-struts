import type { FieldShoreEvent } from '@core/schema';
import { operationStore, type CommitResult } from '@data/store';

/**
 * The mutation doorway. Every screen dispatches events through this — never
 * through @data directly (invariant 3). Resolves AFTER the durable local
 * write lands (L-4), so callers may read committed state synchronously.
 * Richer per-workflow action creators land with their screens (S4–S6).
 */
export function useCommit(): (event: FieldShoreEvent) => Promise<CommitResult> {
  return operationStore.commit;
}
