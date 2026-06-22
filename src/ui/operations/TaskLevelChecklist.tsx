import { BASELINE_TEMPLATES } from '@core/checklist';
import { NestedChecklist } from '@ui/primitives';
import { useChecklists, useDeviceUidValue } from '@ui/hooks';

// The Task Level Checklist drawer body (#204). Scoped to THIS device's officer
// (instanceId = the device uid), NOT one operation-wide shared tree (gate review
// M13) — so two Group Supervisors never attest the same tree. Two levels, one
// section open at a time on phone. Records doctrine progress; never gates work.
// (A richer per-Group/per-task binding can replace the uid scope when a task
// entity exists; the uid keeps each officer's list separate today.)
const TASK_TEMPLATE = BASELINE_TEMPLATES['task-level'];

export function TaskLevelChecklist() {
  const uid = useDeviceUidValue();
  const { attestations, check, uncheck } = useChecklists('task-level', uid ?? '');
  if (!uid) return null; // nothing to scope an attestation to until the uid resolves
  return <NestedChecklist template={TASK_TEMPLATE} attestations={attestations} onCheck={check} onUncheck={uncheck} />;
}
