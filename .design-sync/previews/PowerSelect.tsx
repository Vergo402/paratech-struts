import { PowerSelect } from 'fieldshore-v4';

// PowerSelect — picker variant 4: the OS-native fallback used when
// VoiceOver/TalkBack is active or "Native controls" is on. A thin labeled
// <select>; the OS supplies the picker UI.

const wrap = { width: 300 } as const;

export const StrutSystem = () => (
  <div style={wrap}>
    <PowerSelect
      label="Strut system"
      value="longshore"
      onChange={() => {}}
      options={[
        { value: 'longshore', label: 'LongShore' },
        { value: 'acme', label: 'Acme Threaded' },
        { value: 'mega', label: 'MegaShore' },
        { value: 'super', label: 'SuperShore' },
      ]}
    />
  </div>
);

export const Deduction = () => (
  <div style={wrap}>
    <PowerSelect
      label="Sole plate"
      value="multi-base"
      onChange={() => {}}
      options={[
        { value: 'none', label: 'None' },
        { value: 'multi-base', label: 'Multi-Base (−3½″)' },
        { value: 'longshore-base', label: 'LongShore base (−5″)' },
        { value: 'swivel', label: 'Swivel base (−4″)' },
      ]}
    />
  </div>
);
