import { TextField } from 'fieldshore-v4';

// TextField — the data-entry primitive (input.md). Label always visible.
// Validation is inline + specific: --danger border + adjacent message, never
// color alone, never a toast. type='password' adds a labeled show/hide reveal.

const wrap = { width: 360 } as const;

export const Default = () => (
  <div style={wrap}>
    <TextField label="Department name" value="Hartsdale Fire District" onChange={() => {}} />
  </div>
);

export const Empty = () => (
  <div style={wrap}>
    <TextField
      label="Shore point label"
      value=""
      placeholder="e.g. SP-14"
      helper="Shown on the card and the cut sheet."
      onChange={() => {}}
    />
  </div>
);

export const Error = () => (
  <div style={wrap}>
    <TextField
      label="Invite code"
      value="7Q2"
      error="Invite codes are 6 characters."
      inputMode="text"
      onChange={() => {}}
    />
  </div>
);

export const Password = () => (
  <div style={wrap}>
    <TextField
      label="Password"
      type="password"
      value="strut-812"
      autoComplete="current-password"
      onChange={() => {}}
    />
  </div>
);

export const Disabled = () => (
  <div style={wrap}>
    <TextField
      label="Apparatus"
      value="Engine 7"
      disabled
      helper="Set on the Inventory tab."
      onChange={() => {}}
    />
  </div>
);
