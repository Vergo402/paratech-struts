import { Segmented } from 'fieldshore-v4';

// Segmented — always-visible inline single-select, 2–5 options, exactly one
// selected. Selection commits in place. Three redundant selected signals; color
// is never the only one.

const wrap = { width: 360 } as const;

export const ShoreType = () => (
  <div style={wrap}>
    <Segmented
      aria-label="Shore type"
      value="t-shore"
      onChange={() => {}}
      options={[
        { value: 't-shore', label: 'T-Shore' },
        { value: 'double-t', label: 'Double-T' },
        { value: '3-post', label: '3-Post' },
      ]}
    />
  </div>
);

export const HeaderWood = () => (
  <div style={wrap}>
    <Segmented
      aria-label="Header wood"
      value="4x4"
      onChange={() => {}}
      options={[
        { value: 'none', label: 'None' },
        { value: '4x4', label: '4×4' },
        { value: '6x6', label: '6×6' },
      ]}
    />
  </div>
);

export const Side = () => (
  <div style={wrap}>
    <Segmented
      aria-label="Division side"
      value="a"
      onChange={() => {}}
      options={[
        { value: 'a', label: 'Side A' },
        { value: 'b', label: 'Side B' },
        { value: 'c', label: 'Side C' },
        { value: 'd', label: 'Side D' },
      ]}
    />
  </div>
);

export const TwoUp = () => (
  <div style={wrap}>
    <Segmented
      aria-label="Measurement form"
      value="feet-inches"
      onChange={() => {}}
      options={[
        { value: 'inches', label: 'Inches' },
        { value: 'feet-inches', label: 'Feet · Inches' },
      ]}
    />
  </div>
);

export const Standard = () => (
  <div style={wrap}>
    <Segmented
      aria-label="View"
      size="standard"
      value="board"
      onChange={() => {}}
      options={[
        { value: 'board', label: 'Board' },
        { value: 'list', label: 'List' },
      ]}
    />
  </div>
);
