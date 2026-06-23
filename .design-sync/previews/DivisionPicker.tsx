import { DivisionPicker } from 'fieldshore-v4';

// DivisionPicker — the floor picker for the Add Shore Point form (#220). A
// labeled trigger that opens a surface-adaptive picker (bottom sheet on phone,
// anchored dropdown on desktop) listing the operation's floors, with "Add floor
// above / below". The at-rest trigger is what the card shows.

export const Ground = () => (
  <div style={{ width: 240 }}>
    <DivisionPicker value={1} onChange={() => {}} />
  </div>
);

export const UpperFloor = () => (
  <div style={{ width: 240 }}>
    <DivisionPicker value={2} onChange={() => {}} />
  </div>
);

export const SubDivision = () => (
  <div style={{ width: 240 }}>
    <DivisionPicker value={-1} onChange={() => {}} />
  </div>
);
