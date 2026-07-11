import { useMemo } from 'react';
import { useStore } from 'zustand';
import { operationStore } from '@data/store';
import { checklistInstance, type ChecklistInstance } from '@core/checklist';
import { newId } from '@core/id';
import { useCommit } from './useCommit';
import { useDeviceUid } from './useDeviceUid';
import { useCommandSelf } from './useCommandSelf';
import { useMyRole } from './useMyRoles';

/** One checklist instance's attestations + the tap-toggle actions. `instanceId`
 *  scopes the instance: the operation id for the IC Command Checklist, a Group/task
 *  id for the Task Level Checklist. `fallbackRole` is the spelled-out title stamped
 *  when this device has no explicit My Role (e.g. the IC Command Checklist is
 *  IC-gated, so its caller passes "Incident Commander"). */
export interface ChecklistApi {
  attestations: ChecklistInstance; // itemId -> { by, role, at }
  check(itemId: string): Promise<void>;
  uncheck(itemId: string): Promise<void>;
}

export function useChecklists(
  checklistId: string,
  instanceId: string,
  fallbackRole = 'Unassigned',
): ChecklistApi {
  const attestations = useStore(operationStore.store, (s) => checklistInstance(s, checklistId, instanceId));
  const opId = useStore(operationStore.store, (s) => s.operation?.id);
  const positions = useStore(operationStore.store, (s) => s.positions);
  const { selfKey } = useCommandSelf();
  const myRolePid = useMyRole(selfKey ?? undefined);
  const getUid = useDeviceUid();
  const commit = useCommit();

  // The attester's spelled-out ICS title at check time (ADR-008). My Role wins when
  // set; otherwise the screen's known context (fallbackRole).
  const role = (myRolePid && positions[myRolePid]?.title) || fallbackRole;

  const actions = useMemo(() => {
    async function emit(type: 'ChecklistItemChecked' | 'ChecklistItemUnchecked', itemId: string): Promise<void> {
      if (!opId) return; // no active op -> nothing to attest against
      await commit({
        type,
        id: newId(),
        opId,
        at: Date.now(),
        by: await getUid(),
        checklistId,
        instanceId,
        itemId,
        role,
      });
    }
    return {
      check: (itemId: string) => emit('ChecklistItemChecked', itemId),
      uncheck: (itemId: string) => emit('ChecklistItemUnchecked', itemId),
    };
  }, [commit, getUid, opId, checklistId, instanceId, role]);

  return { attestations, ...actions };
}
