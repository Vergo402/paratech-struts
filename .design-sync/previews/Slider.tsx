import { Slider } from 'fieldshore-v4';

// Slider — slide-to-commit (ADR-010). Commits ONE discrete lifecycle step, never
// a value. Advance slides right; step-back mirrors left as secondary. Tone tints
// the whole bar with the destination status. Disabled shows the gate reason.

const wrap = { width: 360 } as const;

export const Advance = () => (
  <div style={wrap}>
    <Slider label="Slide to set Equipment Assigned" tone="process" onCommit={() => {}} />
  </div>
);

export const AdvanceCutting = () => (
  <div style={wrap}>
    <Slider label="Slide to set Cutting Station" tone="cutting" onCommit={() => {}} />
  </div>
);

export const StepBack = () => (
  <div style={wrap}>
    <Slider
      label="Slide back to Pending Equipment"
      direction="stepback"
      tone="pending"
      onCommit={() => {}}
    />
  </div>
);

export const Secured = () => (
  <div style={wrap}>
    <Slider label="Slide to set Wood Shore Secured" tone="secured" onCommit={() => {}} />
  </div>
);

export const Disabled = () => (
  <div style={wrap}>
    <Slider
      label="Slide to set Strut Set"
      disabled
      disabledReason="No fitting strut in inventory for 47 3/8″."
      onCommit={() => {}}
    />
  </div>
);
