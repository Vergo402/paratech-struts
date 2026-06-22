import { NestedChecklist } from '@ui/primitives';
import { useChecklists, useChecklistTemplate } from '@ui/hooks';
import { ICS201Brief } from './ICS201Brief';

// The IC Command Checklist drawer body (#203): the live ICS-201 brief above the
// deep four-phase attestation tree. Instance is the operation (one per incident).
// The template is the EFFECTIVE one (department fork or baseline), so an edit in
// Settings takes effect live. The checklist RECORDS progress; never gates (P10).
export function ICCommandChecklist({ instanceId }: { instanceId: string }) {
  const template = useChecklistTemplate('ic-command');
  // IC-gated surface, so the attester defaults to Incident Commander when this
  // device has not self-declared a different My Role.
  const { attestations, check, uncheck } = useChecklists('ic-command', instanceId, 'Incident Commander');
  return (
    <div className="fs-cmd-checklist">
      <ICS201Brief />
      <NestedChecklist template={template} attestations={attestations} onCheck={check} onUncheck={uncheck} />
    </div>
  );
}
