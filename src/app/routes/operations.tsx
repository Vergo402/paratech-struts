import { EmptyState } from '@ui/primitives';

/** Operations stub — the board + Start Operation workflow is S4 (#219). */
export function OperationsScreen() {
  return (
    <EmptyState
      variant="first-run"
      headline="No operations yet"
      reason="Start Operation arrives in the next build session"
    />
  );
}
