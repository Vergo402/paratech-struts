import { useQuery } from '@tanstack/react-query';
import type { ArchivedOperationSummary, OperationState } from '@core/operation';
import { operationStore } from '@data/store';

// Read-side hooks for the Past-operations archive (#238). Cold path — the event
// log is retained, so a finished incident is always re-projectable. Invalidate
// ['archive'] after an OperationEnded / OperationReopened commit so the list and
// any open drill-in refresh.

/** The finished-incident list, newest-ended first. */
export function usePastOperations() {
  return useQuery<ArchivedOperationSummary[]>({
    queryKey: ['archive'],
    queryFn: () => operationStore.readArchive(),
  });
}

/** One finished incident re-projected read-only; disabled until an id is set. */
export function useArchivedOperation(opId: string | null) {
  return useQuery<OperationState>({
    queryKey: ['archive', opId],
    queryFn: () => operationStore.readOperation(opId!),
    enabled: opId != null,
  });
}
