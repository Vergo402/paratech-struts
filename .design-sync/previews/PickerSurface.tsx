import { PickerSurface } from 'fieldshore-v4';
import { useRef } from 'react';

// PickerSurface — the surface-adaptive single-select container: a bottom Sheet
// on phone, an anchored Popover dropdown on desktop (≥768px). Same children,
// one render of the option rows. Rendered open with realistic picker rows.

const Row = ({ label, sub, selected }: { label: string; sub?: string; selected?: boolean }) => (
  <button
    type="button"
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      width: '100%',
      textAlign: 'left',
      padding: '14px 16px',
      border: 'none',
      borderBottom: '1px solid var(--border)',
      background: selected ? 'var(--surface-selected, rgba(140,103,0,0.08))' : 'transparent',
    }}
  >
    <span style={{ font: 'var(--type-body)', color: 'var(--text-primary)' }}>{label}</span>
    {sub && <span style={{ font: 'var(--type-caption)', color: 'var(--text-secondary)' }}>{sub}</span>}
  </button>
);

export const ShoreTypePicker = () => {
  const anchor = useRef<HTMLButtonElement>(null);
  return (
    <div style={{ width: 300, minHeight: 200 }}>
      <button ref={anchor} type="button" style={{ all: 'unset' }} />
      <PickerSurface open onClose={() => {}} title="Shore type" anchor={anchor}>
        <Row label="T-Shore" sub="4×4 header · single span" selected />
        <Row label="Double-T Shore" sub="4×4 or 6×6 · wide span" />
        <Row label="3-Post Vertical" sub="6×6 footer · USACE spec" />
        <Row label="Raker Shore" sub="Sloped wall support" />
      </PickerSurface>
    </div>
  );
};

export const ApparatusPicker = () => {
  const anchor = useRef<HTMLButtonElement>(null);
  return (
    <div style={{ width: 300, minHeight: 200 }}>
      <button ref={anchor} type="button" style={{ all: 'unset' }} />
      <PickerSurface open onClose={() => {}} title="Source apparatus" anchor={anchor}>
        <Row label="Engine 7" sub="4 LongShore 812 available" selected />
        <Row label="Rescue 1" sub="2 LongShore 1224 available" />
        <Row label="Squad 3" sub="6×6 lumber · base plates" />
      </PickerSurface>
    </div>
  );
};
