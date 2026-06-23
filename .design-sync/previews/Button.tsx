import { Button } from 'fieldshore-v4';

// Button — emphasis is fill → outline → text, never color. `destructive` swaps
// the accent for --danger. Operational size (56pt) is the field default.

export const Primary = () => (
  <Button variant="primary" onPress={() => {}}>
    Deploy strut
  </Button>
);

export const Secondary = () => (
  <Button variant="secondary" onPress={() => {}}>
    Add shore point
  </Button>
);

export const Tertiary = () => (
  <Button variant="tertiary" onPress={() => {}}>
    Cancel
  </Button>
);

export const Destructive = () => (
  <Button variant="primary" destructive onPress={() => {}}>
    Delete shore point
  </Button>
);

export const Disabled = () => (
  <Button variant="primary" disabled disabledReason="Assign equipment first" onPress={() => {}}>
    Mark strut set
  </Button>
);

export const FullWidth = () => (
  <div style={{ width: 320 }}>
    <Button variant="primary" fullWidth size="operational" onPress={() => {}}>
      Start operation
    </Button>
  </div>
);
