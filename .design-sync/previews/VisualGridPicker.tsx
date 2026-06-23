import { VisualGridPicker } from 'fieldshore-v4';

// VisualGridPicker — the v3 plate/wood picker carried forward verbatim. Each
// card shows the populated trigger with the selected connector; a tap opens
// the body-portaled grid of swatches. `trailing` carries the deduction ledger
// value on the label line; ops-mode `availableIds` splits stocked vs. not.

const wrap = { width: 300 } as const;

const PLATES = [
  { id: 'none', name: 'None' },
  { id: 'multi-base', name: 'Multi-Base', sub: '−3½″' },
  { id: 'longshore-base', name: 'LongShore base', sub: '−5″' },
  { id: 'swivel', name: 'Swivel base', sub: '−4″' },
  { id: 'pin-base', name: 'Pin base', sub: '−2½″' },
  { id: 'wedge', name: 'Wedge plate', sub: '−1½″' },
] as const;

export const TopConnector = () => (
  <div style={wrap}>
    <VisualGridPicker
      label="Top connector"
      value="multi-base"
      onSelect={() => {}}
      options={PLATES}
    />
  </div>
);

export const WithDeductionLedger = () => (
  <div style={wrap}>
    <VisualGridPicker
      label="Sole plate"
      value="longshore-base"
      onSelect={() => {}}
      options={PLATES}
      trailing={<span style={{ font: 'var(--type-body)', color: 'var(--text-secondary)' }}>−5″</span>}
    />
  </div>
);

export const OpsInStock = () => (
  <div style={wrap}>
    <VisualGridPicker
      label="Base plate"
      value="swivel"
      onSelect={() => {}}
      options={PLATES}
      availableIds={new Set(['multi-base', 'swivel'])}
    />
  </div>
);
