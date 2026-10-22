import { NestedChecklist } from '@ui/primitives';
import { useChecklists, useChecklistTemplate, useCommandSelf } from '@ui/hooks';

// The Task Level Checklist drawer body (#204). Scoped to THIS officer's account
// (instanceId = the signed-in account id, the device uid for guests — the same "me"
// as ICS positions, ADR-024 follow-up / #550), NOT one operation-wide shared tree
// (gate review M13) — so two Group Supervisors never attest the same tree. Two
// levels, one section open at a time on phone. Template is the EFFECTIVE one
// (department fork or baseline). Records doctrine progress; never gates work.
// (A richer per-Group/per-task binding is v4.1, #564.)
export function TaskLevelChecklist() {
  const template = useChecklistTemplate('task-level');
  const { selfKey } = useCommandSelf();
  const { attestations, check, uncheck } = useChecklists('task-level', selfKey ?? '');
  if (!selfKey) return null; // nothing to scope an attestation to until a key resolves
  return <NestedChecklist template={template} attestations={attestations} onCheck={check} onUncheck={uncheck} />;
}
