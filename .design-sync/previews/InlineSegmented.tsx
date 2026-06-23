import { InlineSegmented } from 'fieldshore-v4';

// InlineSegmented — picker variant 1: 2–5 options, single-select, always
// visible. A labeled field wrapper around the Segmented primitive; the value
// is exposed by construction. `trailing` carries the ledger value on the
// label line.

const wrap = { width: 320 } as const;

export const ShoreType = () => (
  <div style={wrap}>
    <InlineSegmented
      label="Shore type"
      value="t-shore"
      onChange={() => {}}
      options={[
        { value: 'vertical', label: 'Vertical' },
        { value: 't-shore', label: 'T-Shore' },
        { value: 'double-t', label: 'Double-T' },
        { value: '3-post', label: '3-Post' },
      ]}
    />
  </div>
);

export const Footer = () => (
  <div style={wrap}>
    <InlineSegmented
      label="Footer lumber"
      value="6x6"
      onChange={() => {}}
      options={[
        { value: 'none', label: 'None' },
        { value: '4x4', label: '4×4' },
        { value: '6x6', label: '6×6' },
      ]}
      trailing={<span style={{ font: 'var(--type-body)', color: 'var(--text-secondary)' }}>−5½″</span>}
    />
  </div>
);

export const Operational = () => (
  <div style={wrap}>
    <InlineSegmented
      label="Deploy from"
      value="engine"
      onChange={() => {}}
      size="operational"
      options={[
        { value: 'engine', label: 'Engine 7' },
        { value: 'rescue', label: 'Rescue 1' },
      ]}
    />
  </div>
);
