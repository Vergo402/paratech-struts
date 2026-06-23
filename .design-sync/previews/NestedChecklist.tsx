import { NestedChecklist } from 'fieldshore-v4';

// NestedChecklist — the doctrine-attestation tree (#196). Leaves are the only
// checkable nodes; sections roll up a derived count. Every check shows who
// attested it and when. Presentational — takes a template + attestations as props.

const template = {
  id: 'ic-command' as const,
  title: 'IC Command Checklist',
  source: 'fieldshore-baseline' as const,
  autoCollapseCompleted: false,
  nodes: [
    {
      id: 'size-up',
      label: 'Size-up',
      children: [
        { id: 'su-360', label: 'Complete 360 walk-around' },
        { id: 'su-hazards', label: 'Identify hazards · mark utilities' },
        { id: 'su-collapse', label: 'Note collapse pattern · void spaces' },
      ],
    },
    {
      id: 'establish-command',
      label: 'Establish command',
      children: [
        { id: 'ec-ics', label: 'Declare ICS · assign Operations' },
        { id: 'ec-divisions', label: 'Set divisions by floor · sides A–D' },
        { id: 'ec-accountability', label: 'Start accountability board' },
      ],
    },
    {
      id: 'shoring',
      label: 'Shoring operations',
      children: [
        { id: 'sh-safety', label: 'Assign Safety Officer' },
        { id: 'sh-cutting', label: 'Stand up Cutting Station' },
      ],
    },
  ],
};

const attestations = {
  'su-360': { by: 'dev-01', role: 'Incident Commander', at: 1718900000000 },
  'su-hazards': { by: 'dev-02', role: 'Safety Officer', at: 1718901200000 },
  'su-collapse': { by: 'dev-01', role: 'Incident Commander', at: 1718902100000 },
  'ec-ics': { by: 'dev-01', role: 'Incident Commander', at: 1718903000000 },
};

export const ICCommand = () => (
  <div style={{ width: 360 }}>
    <NestedChecklist
      template={template}
      attestations={attestations}
      onCheck={() => {}}
      onUncheck={() => {}}
    />
  </div>
);

export const ReadOnlyBroadcast = () => (
  <div style={{ width: 360 }}>
    <NestedChecklist
      template={template}
      attestations={attestations}
      onCheck={() => {}}
      onUncheck={() => {}}
      readOnly
    />
  </div>
);
