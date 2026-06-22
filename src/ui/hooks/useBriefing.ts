import { useMemo } from 'react';
import { useStore } from 'zustand';
import { operationStore } from '@data/store';
import { activeBriefing, type Briefing } from '@core/checklist';
import { newId } from '@core/id';
import { useCommit } from './useCommit';
import { useDeviceUid } from './useDeviceUid';

/** The ORM/TCRM briefing session wrapper (#205). `active` is the most-recent
 *  un-ended session (null = none). `begin` resumes the active session if one
 *  exists, else starts a new one and returns its id; `end` brackets it. */
export interface BriefingApi {
  active: Briefing | null;
  begin(): Promise<string | null>;
  end(briefingId: string): Promise<void>;
}

export function useBriefing(): BriefingApi {
  const active = useStore(operationStore.store, (s) => activeBriefing(s));
  const opId = useStore(operationStore.store, (s) => s.operation?.id);
  const getUid = useDeviceUid();
  const commit = useCommit();

  const actions = useMemo(
    () => ({
      begin: async (): Promise<string | null> => {
        if (!opId) return null;
        // Resume the active session rather than spawn a duplicate.
        const current = activeBriefing(operationStore.store.getState());
        if (current) return current.id;
        const briefingId = newId();
        const r = await commit({
          type: 'BriefingStarted',
          id: newId(),
          opId,
          at: Date.now(),
          by: await getUid(),
          briefingId,
        });
        return r.ok ? briefingId : null;
      },
      end: async (briefingId: string): Promise<void> => {
        if (!opId) return;
        await commit({ type: 'BriefingEnded', id: newId(), opId, at: Date.now(), by: await getUid(), briefingId });
      },
    }),
    [opId, getUid, commit],
  );

  return { active, ...actions };
}
