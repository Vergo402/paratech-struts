import { CuttingControls } from 'fieldshore-v4';

// CuttingControls — the Cutting Station slide pair for a point in `cutting`: the
// two-step #222 commit. Before the saw runs it's "Slide to mark Cut Done" + a
// step-back to Strut Set; once cut, it flips to "Slide to send to Runner" + a
// step-back that clears Cut Done. Static commit handlers — the screenshot freezes
// each state. Tones tint the whole bar to the destination status hue.
const noop = () => {};

const NONE = { headerWood: '4x4', footerWood: '4x4', topPlate: 'multi', bottomPlate: 'multi' };

// A T-Shore point at the Cutting Station — 93 5/8″ opening, shore point 7.
const base = {
  id: 'sp7',
  opId: 'op1',
  seq: 7,
  division: '2',
  shoreType: 't-shore',
  measurementEighths: 93 * 8 + 5,
  deductions: NONE,
  status: 'cutting',
};

export const BeforeCut = () => (
  // Saw hasn't run: mark Cut Done, or step back to Strut Set.
  <CuttingControls
    sp={{ ...base, cuttingDone: false }}
    onMarkCutDone={noop}
    onClearCutDone={noop}
    onSendToRunner={noop}
    onStepBack={noop}
  />
);

export const CutDone = () => (
  // Cut Done flagged: send to Runner, or step back to clear Cut Done.
  <CuttingControls
    sp={{ ...base, cuttingDone: true }}
    onMarkCutDone={noop}
    onClearCutDone={noop}
    onSendToRunner={noop}
    onStepBack={noop}
  />
);
