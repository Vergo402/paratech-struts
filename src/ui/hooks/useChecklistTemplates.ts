import { useMemo } from 'react';
import { useStore } from 'zustand';
import { checklistTemplateStore } from '@data/store';
import { BASELINE_TEMPLATES } from '@core/checklist';
import type { ChecklistId, ChecklistNode, ChecklistTemplate } from '@core/schema';

const IDS: ChecklistId[] = ['ic-command', 'task-level', 'orm-tcrm'];

/** The effective (department-forked or FieldShore-baseline) template for one
 *  checklist. The runtime checklists read THIS — not the baseline constant — so a
 *  department edit in Settings takes effect live. */
export function useChecklistTemplate(id: ChecklistId): ChecklistTemplate {
  return useStore(checklistTemplateStore.store, (s) => s.overrides[id] ?? BASELINE_TEMPLATES[id]);
}

export interface ChecklistTemplatesApi {
  templates: ChecklistTemplate[];
  /** Persist a fully-composed tree for one checklist (the editor builds it with the
   *  pure @core/checklist helpers). Forks from baseline on first edit. */
  setNodes(id: ChecklistId, nodes: ChecklistNode[]): Promise<void>;
  reset(id: ChecklistId): Promise<void>;
}

/** The department editor's view (#230): all three effective templates + the
 *  authoring actions (fork-on-edit happens in the store). */
export function useChecklistTemplates(): ChecklistTemplatesApi {
  const overrides = useStore(checklistTemplateStore.store, (s) => s.overrides);
  const templates = useMemo(() => IDS.map((id) => overrides[id] ?? BASELINE_TEMPLATES[id]), [overrides]);
  const actions = useMemo(
    () => ({ setNodes: checklistTemplateStore.setNodes, reset: checklistTemplateStore.reset }),
    [],
  );
  return { templates, ...actions };
}
