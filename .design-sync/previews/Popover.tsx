import { Popover } from 'fieldshore-v4';
import { useRef } from 'react';

// Popover — the desktop twin of Sheet: an anchored dropdown beside its trigger
// for single-select pickers on wider surfaces. Rendered open, anchored to a
// real trigger button so the floating panel shows beside it.

const Row = ({ label, sub, selected }: { label: string; sub?: string; selected?: boolean }) => (
  <button
    type="button"
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      width: '100%',
      textAlign: 'left',
      padding: '10px 14px',
      border: 'none',
      borderBottom: '1px solid var(--border)',
      background: selected ? 'var(--surface-selected, rgba(140,103,0,0.08))' : 'transparent',
    }}
  >
    <span style={{ font: 'var(--type-body)', color: 'var(--text-primary)' }}>{label}</span>
    {sub && <span style={{ font: 'var(--type-caption)', color: 'var(--text-secondary)' }}>{sub}</span>}
  </button>
);

const Trigger = ({ label }: { label: string }) => (
  <span
    style={{
      display: 'inline-flex',
      gap: 8,
      alignItems: 'center',
      padding: '10px 14px',
      borderRadius: 'var(--radius-control)',
      border: '1px solid var(--border)',
      font: 'var(--type-body)',
      color: 'var(--text-primary)',
      background: 'var(--surface)',
    }}
  >
    {label} ▾
  </span>
);

export const StrutDropdown = () => {
  const anchor = useRef<HTMLButtonElement>(null);
  return (
    <div style={{ width: 280, paddingBottom: 180 }}>
      <button ref={anchor} type="button" style={{ all: 'unset', cursor: 'default' }}>
        <Trigger label="LongShore 812" />
      </button>
      <Popover open onClose={() => {}} title="Select strut" anchor={anchor}>
        <Row label="LongShore 812" sub="6 ft – 16 ft · Engine 7" selected />
        <Row label="LongShore 1224" sub="12 ft – 24 ft · Rescue 1" />
        <Row label="ShoreShield 3-Post" sub="6×6 footer · Squad 3" />
      </Popover>
    </div>
  );
};

export const DivisionDropdown = () => {
  const anchor = useRef<HTMLButtonElement>(null);
  return (
    <div style={{ width: 280, paddingBottom: 160 }}>
      <button ref={anchor} type="button" style={{ all: 'unset', cursor: 'default' }}>
        <Trigger label="Division 2 · Side A" />
      </button>
      <Popover open onClose={() => {}} title="Select division" anchor={anchor}>
        <Row label="Division 1 · Side A" sub="2 shore points" />
        <Row label="Division 2 · Side A" sub="3 shore points" selected />
        <Row label="Division 2 · Side C" sub="1 shore point" />
      </Popover>
    </div>
  );
};
