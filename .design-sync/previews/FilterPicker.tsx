import { FilterPicker } from 'fieldshore-v4';

// FilterPicker — the single-select filter pill on the Operations board filterbar
// (#347). A labeled trigger that opens a PickerSurface (Sheet on phone, Popover
// on desktop). Closed state — the at-rest pill — is what the card shows.

export const DivisionAll = () => (
  <div style={{ width: 220 }}>
    <FilterPicker
      label="Division"
      value={null}
      placeholder="All divisions"
      options={[
        { value: '1', label: 'Division 1' },
        { value: '2', label: 'Division 2' },
        { value: 'roof', label: 'Roof' },
      ]}
      onChange={() => {}}
    />
  </div>
);

export const StatusSelected = () => (
  <div style={{ width: 220 }}>
    <FilterPicker
      label="Status"
      value="cutting"
      placeholder="All statuses"
      options={[
        { value: 'pending', label: 'Pending Equipment' },
        { value: 'strutset', label: 'Strut Set' },
        { value: 'cutting', label: 'Cutting Station' },
        { value: 'secured', label: 'Wood Shore Secured' },
      ]}
      onChange={() => {}}
    />
  </div>
);
