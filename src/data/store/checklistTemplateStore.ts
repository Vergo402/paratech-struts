import { createStore, type StoreApi } from 'zustand/vanilla';
import { z } from 'zod';
import { ChecklistTemplate, type ChecklistId, type ChecklistNode } from '@core/schema';
import { BASELINE_TEMPLATES } from '@core/checklist';
import { type FieldShoreDB } from './db';

// The department's checklist library (#230, ADR-020). Departments fully author the
// three checklists (IC Command / Task Level / ORM-TCRM); a checklist is the shipped
// FieldShore baseline until the department edits it, at which point it FORKS — the
// override is stored and its `source` flips to 'department' so crews see "Customized
// by <dept>" and never mistake a tailored step for FieldShore-asserted doctrine
// (Principle 1). Durable copy is ONE json row in `meta` (the customTitlesStore
// pattern): validate on boot, durable write THEN setState (L-4).
//
// ADR-020 wants template edits AUDITED (who/when). Auth + the audit log are stubbed
// this phase, so edits persist locally; the audited-surfacing is deferred to the
// audit-log build. (Attestations already carry by/at via their events.)

export const CHECKLIST_TEMPLATES_KEY = 'fieldshore_checklist_templates';

export type ChecklistOverrides = Partial<Record<ChecklistId, ChecklistTemplate>>;

export interface ChecklistTemplateState {
  overrides: ChecklistOverrides;
}

export interface ChecklistTemplateStoreApi {
  store: StoreApi<ChecklistTemplateState>;
  boot(): Promise<void>;
  /** The live template: a department fork if one exists, else the FieldShore baseline. */
  effective(id: ChecklistId): ChecklistTemplate;
  /** Fork-on-edit: persist `nodes` as the department's tree for this checklist. The
   *  editor composes the new tree from the pure @core/checklist helpers (add /
   *  rename / remove / moveBefore / nudge) and hands the whole result here. */
  setNodes(id: ChecklistId, nodes: ChecklistNode[]): Promise<void>;
  /** Discard the fork — restore the shipped FieldShore baseline. */
  reset(id: ChecklistId): Promise<void>;
}

// A wrong-shape row degrades to "no overrides" (every checklist falls back to its
// baseline) rather than dead-ending boot.
const Overrides = z.record(ChecklistTemplate).catch({});

export function createChecklistTemplateStore(db: FieldShoreDB): ChecklistTemplateStoreApi {
  const store = createStore<ChecklistTemplateState>(() => ({ overrides: {} }));

  function persist(overrides: ChecklistOverrides): Promise<unknown> {
    return db.meta.put({ key: CHECKLIST_TEMPLATES_KEY, value: JSON.stringify(overrides) });
  }

  function effective(id: ChecklistId): ChecklistTemplate {
    return store.getState().overrides[id] ?? BASELINE_TEMPLATES[id];
  }

  return {
    store,
    effective,

    async boot() {
      let overrides: ChecklistOverrides = {};
      const row = await db.meta.get(CHECKLIST_TEMPLATES_KEY);
      if (row) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(row.value);
        } catch {
          parsed = undefined;
        }
        overrides = Overrides.parse(parsed) as ChecklistOverrides;
      }
      store.setState({ overrides }, true);
    },

    // Fork-on-edit: stamp source='department', persist the override, then mirror to
    // memory (L-4 — durable write first).
    async setNodes(id, nodes) {
      const forked: ChecklistTemplate = { ...effective(id), source: 'department', nodes };
      const overrides = { ...store.getState().overrides, [id]: forked };
      await persist(overrides);
      store.setState({ overrides }, true);
    },

    async reset(id) {
      const overrides = { ...store.getState().overrides };
      delete overrides[id];
      await persist(overrides);
      store.setState({ overrides }, true);
    },
  };
}

/** The app's singleton checklist-template store, bound to the singleton DB. */
// The dept-scoped singleton lives in registry.ts (recreated per-department on a
// switch); this file exports only the factory + helpers.
