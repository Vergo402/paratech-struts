import type { FieldShoreEvent } from '../schema';
import { operationReducer, EMPTY_OPERATION_STATE, type OperationState } from './reducer';

/**
 * Recompute the current operation state by folding the event log (ADR-009: the
 * log is the device's source of truth; state is a projection). data/store calls
 * this on boot to rebuild from IndexedDB. Deterministic — same events in the same
 * order always yield the same state, which is what keeps every device in sync.
 */
export function projectOperation(events: readonly FieldShoreEvent[]): OperationState {
  return events.reduce(operationReducer, EMPTY_OPERATION_STATE);
}
