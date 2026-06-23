import { Sheet } from 'fieldshore-v4';

// Sheet — the bottom-anchored slide-up surface for everyday choices: pickers,
// short forms, action lists. Parent stays visible; non-destructive only.
// Rendered open with realistic rows so the card shows the open state.

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

export const StrutPicker = () => (
  <Sheet open onClose={() => {}} title="Select strut">
    <Row label="LongShore 812" sub="6 ft – 16 ft · Engine 7" selected />
    <Row label="LongShore 1224" sub="12 ft – 24 ft · Rescue 1" />
    <Row label="ShoreShield 3-Post" sub="6×6 footer · Squad 3" />
  </Sheet>
);

export const ActionList = () => (
  <Sheet open onClose={() => {}} title="SP-22 · 3-Post">
    <Row label="Mark strut set" sub="Cutting Station next" />
    <Row label="Send back to Pending Equipment" />
    <Row label="View deployed BOM" sub="3 components · 2 rigs" />
  </Sheet>
);

export const ConnectorPicker = () => (
  <Sheet open onClose={() => {}} title="Base plate">
    <Row label="Acme Threaded Adjustable" sub={'3.5" – 5.5"'} />
    <Row label="Flat Base Plate" sub={'0.75" height'} selected />
    <Row label="Swivel Combi-Head" sub={'1.25" height'} />
  </Sheet>
);
