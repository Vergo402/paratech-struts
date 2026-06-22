import { NestedChecklist } from '@ui/primitives';
import { useChecklists, useChecklistTemplate, useDeviceUidValue } from '@ui/hooks';

// The Task Level Checklist drawer body (#204). Scoped to THIS device's officer
// (instanceId = the device uid), NOT one operation-wide shared tree (gate review
// M13) — so two Group Supervisors never attest the same tree. Two levels, one
// section open at a time on phone. Template is the EFFECTIVE one (department fork
// or baseline). Records doctrine progress; never gates work. (A richer
// per-Group/per-task binding can replace the uid scope when a task entity exists.)
export function TaskLevelChecklist() {
  const template = useChecklistTemplate('task-level');
  const uid = useDeviceUidValue();
  const { attestations, check, uncheck } = useChecklists('task-level', uid ?? '');
  if (!uid) return null; // nothing to scope an attestation to until the uid resolves
  return <NestedChecklist template={template} attestations={attestations} onCheck={check} onUncheck={uncheck} />;
}
