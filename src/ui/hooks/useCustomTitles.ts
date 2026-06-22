import { useMemo } from 'react';
import { useStore } from 'zustand';
import { customTitlesStore } from '@data/store';
import type { CustomTitle, OrgPositionKind, TeamMember } from '@core/schema';
import { newId } from '@core/id';

// The department custom ICS-title library, behind the @ui/hooks seam (ui never imports
// @data directly). `add` returns the created title so the add-position sheet can reuse
// its title/kind/members to place the position immediately.

export interface CustomTitlesApi {
  titles: CustomTitle[];
  add(title: string, kind: OrgPositionKind, members?: TeamMember[]): Promise<CustomTitle>;
  remove(id: string): Promise<void>;
}

export function useCustomTitles(): CustomTitlesApi {
  const titles = useStore(customTitlesStore.store, (s) => s.titles);
  const actions = useMemo(
    () => ({
      add: async (title: string, kind: OrgPositionKind, members?: TeamMember[]): Promise<CustomTitle> => {
        const t: CustomTitle = {
          id: `ct-${newId()}`,
          title: title.trim(),
          kind,
          ...(members && members.length ? { members } : {}),
        };
        await customTitlesStore.addTitle(t);
        return t;
      },
      remove: (id: string) => customTitlesStore.removeTitle(id),
    }),
    [],
  );
  return { titles, ...actions };
}
