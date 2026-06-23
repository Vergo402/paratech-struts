import { Toggle } from 'fieldshore-v4';

// Toggle — one thing on/off. State lives in thumb position (left off, right on),
// never color alone. Label is a stable noun phrase; the whole row is the target.

export const Off = () => (
  <div style={{ width: 360 }}>
    <Toggle checked={false} onChange={() => {}} label="Sync over cellular" />
  </div>
);

export const On = () => (
  <div style={{ width: 360 }}>
    <Toggle checked onChange={() => {}} label="Sync over cellular" />
  </div>
);

export const WithHelper = () => (
  <div style={{ width: 360 }}>
    <Toggle
      checked
      onChange={() => {}}
      label="After-action email"
      helper="Send the incident records to IC and Operations when the operation closes."
    />
  </div>
);

export const Standard = () => (
  <div style={{ width: 360 }}>
    <Toggle checked={false} onChange={() => {}} label="Show metric channels" size="standard" />
  </div>
);

export const Disabled = () => (
  <div style={{ width: 360 }}>
    <Toggle
      checked={false}
      onChange={() => {}}
      disabled
      label="Auto-advance shore points"
      helper="Assign an Operations Section role first."
    />
  </div>
);
