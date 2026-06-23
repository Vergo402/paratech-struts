import { BuildingPicker } from 'fieldshore-v4';

// BuildingPicker — the building picker for the Add Shore Point form (multi-
// building ops). A labeled trigger that opens a surface-adaptive picker listing
// the buildings already placed in the op, plus "Add building" by name. The
// at-rest trigger is what the card shows.

const buildings = ['North Tower', 'South Tower', 'Parking Structure'];

export const Selected = () => (
  <div style={{ width: 240 }}>
    <BuildingPicker value="North Tower" buildings={buildings} onChange={() => {}} />
  </div>
);

export const Unselected = () => (
  <div style={{ width: 240 }}>
    <BuildingPicker value="" buildings={buildings} onChange={() => {}} />
  </div>
);
