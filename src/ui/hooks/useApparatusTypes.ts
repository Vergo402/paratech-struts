import { useMemo } from 'react';
import { useStore } from 'zustand';
import { apparatusTypesStore } from '@data/store';
import type { ApparatusTypeCustom } from '@core/schema';
import { APPARATUS_TYPES } from '@core/load';
import { newId } from '@core/id';

// The department apparatus-type vocabulary, behind the @ui/hooks seam (#321 inc4b).
// `types` = the dept-added entries (what the editor lists + can remove). `allNames` =
// the built-in catalog followed by the custom names — the full pick-list for the
// add-apparatus / add-title type pickers. `add` trims, rejects empty + case-insensitive
// duplicates (against built-ins AND existing customs), returns { ok, reason }.

export interface ApparatusTypesApi {
  types: ApparatusTypeCustom[];
  allNames: string[];
  add(name: string): Promise<{ ok: boolean; reason?: string }>;
  remove(id: string): Promise<void>;
}

export function useApparatusTypes(): ApparatusTypesApi {
  const types = useStore(apparatusTypesStore.store, (s) => s.types);
  const allNames = useMemo(() => [...APPARATUS_TYPES, ...types.map((t) => t.name)], [types]);
  const actions = useMemo(
    () => ({
      add: async (name: string): Promise<{ ok: boolean; reason?: string }> => {
        const trimmed = name.trim();
        if (!trimmed) return { ok: false, reason: 'Enter a type name.' };
        if (trimmed.length > 40) return { ok: false, reason: 'That type name is too long (max 40).' };
        const existing = [
          ...APPARATUS_TYPES,
          ...apparatusTypesStore.store.getState().types.map((t) => t.name),
        ];
        if (existing.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
          return { ok: false, reason: `“${trimmed}” already exists.` };
        }
        await apparatusTypesStore.addType({ id: `at-${newId()}`, name: trimmed });
        return { ok: true };
      },
      remove: (id: string) => apparatusTypesStore.removeType(id),
    }),
    [],
  );
  return { types, allNames, ...actions };
}
