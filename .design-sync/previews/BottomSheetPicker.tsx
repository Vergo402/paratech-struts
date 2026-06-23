import { BottomSheetPicker } from 'fieldshore-v4';

// BottomSheetPicker — picker variant 2: 5–7 options, single-select, parent
// stays visible. The collapsed trigger always shows the current value. Each
// card renders the populated trigger; tapping it opens the sheet (or desktop
// dropdown via PickerSurface).

const wrap = { width: 300 } as const;

export const StrutSystem = () => (
  <div style={wrap}>
    <BottomSheetPicker
      label="Strut system"
      value="longshore"
      onSelect={() => {}}
      options={[
        { value: 'longshore', label: 'LongShore', sub: 'Up to 16 ft span' },
        { value: 'acme', label: 'Acme Threaded' },
        { value: 'mega', label: 'MegaShore' },
        { value: 'super', label: 'SuperShore' },
        { value: 'longstroke', label: 'LongStroke' },
      ]}
    />
  </div>
);

export const WoodSize = () => (
  <div style={wrap}>
    <BottomSheetPicker
      label="Header lumber"
      value="6x6"
      onSelect={() => {}}
      options={[
        { value: 'none', label: 'None' },
        { value: '4x4', label: '4×4', sub: 'deducts 3½″' },
        { value: '6x6', label: '6×6', sub: 'deducts 5½″' },
      ]}
    />
  </div>
);

export const Apparatus = () => (
  <div style={wrap}>
    <BottomSheetPicker
      label="Source apparatus"
      value="e7"
      onSelect={() => {}}
      options={[
        { value: 'e7', label: 'Engine 7', sub: '12 LongShore 812 stocked' },
        { value: 'l3', label: 'Ladder 3' },
        { value: 'r1', label: 'Rescue 1', sub: '6 LongShore base' },
        { value: 'sq4', label: 'Squad 4' },
        { value: 'tf2', label: 'Task Force 2' },
      ]}
    />
  </div>
);
