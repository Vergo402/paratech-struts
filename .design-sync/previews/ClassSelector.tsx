import { ClassSelector } from 'fieldshore-v4';

// ClassSelector — the wrapping ICS-class chip row at the top of the Add-position
// sheet (#323). A radiogroup: exactly one class selected, arrow keys roam. Value
// is the class-group key. Realistic ICS 300 class taxonomy; selected chip carries
// the gold accent.

const wrap = { width: 360 } as const;

// The full taxonomy admitted under Command — wraps to multiple rows.
export const UnderCommand = () => (
  <div style={wrap}>
    <ClassSelector
      value="group"
      onChange={() => {}}
      groups={[
        { key: 'command-staff', label: 'Command Staff', kinds: ['command-staff'] },
        { key: 'section', label: 'Section', kinds: ['section'] },
        { key: 'branch', label: 'Branch', kinds: ['branch'] },
        { key: 'division', label: 'Division', kinds: ['division'] },
        { key: 'group', label: 'Group', kinds: ['group'] },
        { key: 'unit', label: 'Unit', kinds: ['unit'] },
        { key: 'staging', label: 'Staging', kinds: ['staging'] },
      ]}
    />
  </div>
);

// A narrow set under Operations — Division / Group / Cutting Station.
export const UnderOperations = () => (
  <div style={wrap}>
    <ClassSelector
      value="cutting"
      onChange={() => {}}
      groups={[
        { key: 'division', label: 'Division', kinds: ['division'] },
        { key: 'group', label: 'Group', kinds: ['group'] },
        { key: 'cutting', label: 'Cutting Station', kinds: ['workstation'] },
        { key: 'resources', label: 'Resources', kinds: ['single-resource'] },
      ]}
    />
  </div>
);

// First chip selected — the radiogroup at its starting position.
export const SectionLevel = () => (
  <div style={wrap}>
    <ClassSelector
      value="branch"
      onChange={() => {}}
      groups={[
        { key: 'branch', label: 'Branch', kinds: ['branch'] },
        { key: 'division', label: 'Division', kinds: ['division'] },
        { key: 'group', label: 'Group', kinds: ['group'] },
      ]}
    />
  </div>
);
