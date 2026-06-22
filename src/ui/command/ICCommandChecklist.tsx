import { BASELINE_TEMPLATES } from '@core/checklist';
import { NestedChecklist } from '@ui/primitives';
import { useChecklists } from '@ui/hooks';
import { ICS201Brief } from './ICS201Brief';

// The IC Command Checklist drawer body (#203): the live ICS-201 brief above the
// deep four-phase attestation tree. Instance is the operation (one per incident).
// The checklist RECORDS doctrine progress; it never gates work (Principle 10).
const IC_TEMPLATE = BASELINE_TEMPLATES['ic-command'];

export function ICCommandChecklist({ instanceId }: { instanceId: string }) {
  // IC-gated surface, so the attester defaults to Incident Commander when this
  // device has not self-declared a different My Role.
  const { attestations, check, uncheck } = useChecklists('ic-command', instanceId, 'Incident Commander');
  return (
    <div className="fs-cmd-checklist">
      <ICS201Brief />
      <NestedChecklist template={IC_TEMPLATE} attestations={attestations} onCheck={check} onUncheck={uncheck} />
    </div>
  );
}
