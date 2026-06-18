import { useMemo } from 'react';
import { useStore } from 'zustand';
import { apparatusStore, inventoryStore } from '@data/store';
import type { Apparatus } from '@core/schema';
import { newId } from '@core/id';

// The apparatus roster + add/remove, behind the @ui/hooks seam (ui never imports
// @data directly). `remove` injects the inventory store so the roster store can
// guard against deployed stock + cascade-clear an empty rig in one transaction.

export interface ApparatusApi {
  roster: Apparatus[];
  add(name: string, type: Apparatus['type']): Promise<Apparatus>;
  remove(id: string): Promise<void>;
}

export function useApparatus(): ApparatusApi {
  const roster = useStore(apparatusStore.store, (s) => s.roster);
  const actions = useMemo(
    () => ({
      add: async (name: string, type: Apparatus['type']): Promise<Apparatus> => {
        const a: Apparatus = { id: `app-${newId()}`, name: name.trim(), type };
        await apparatusStore.addApparatus(a);
        return a;
      },
      remove: (id: string) => apparatusStore.removeApparatus(id, inventoryStore),
    }),
    [],
  );
  return { roster, ...actions };
}
