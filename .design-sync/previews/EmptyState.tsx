import { EmptyState } from 'fieldshore-v4';

// EmptyState — the designed surface for absence. Says WHAT the emptiness is,
// then WHY / what's next. No fill, no border, never --danger, at most one action.

export const FirstRun = () => (
  <div style={{ width: 340 }}>
    <EmptyState
      variant="first-run"
      headline="No operations yet"
      reason="Start an operation to begin tracking shore points"
      action={{ label: 'Start operation', onPress: () => {} }}
    />
  </div>
);

export const Filtered = () => (
  <div style={{ width: 340 }}>
    <EmptyState
      variant="filtered"
      headline="No shore points match"
      reason="Clear the Cutting Station filter to see all points"
      action={{ label: 'Clear filter', onPress: () => {} }}
    />
  </div>
);

export const UpstreamBlocked = () => (
  <div style={{ width: 340 }}>
    <EmptyState
      variant="upstream-blocked"
      headline="No struts in inventory"
      reason="Import an apparatus to deploy from the field"
      action={{ label: 'Import inventory', onPress: () => {} }}
    />
  </div>
);

export const AllClear = () => (
  <div style={{ width: 340 }}>
    <EmptyState
      variant="all-clear"
      headline="All equipment returned"
      reason="Every strut from this operation is back in inventory"
    />
  </div>
);
