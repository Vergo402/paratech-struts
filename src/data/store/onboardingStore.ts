import { createStore, type StoreApi } from 'zustand/vanilla';
import { z } from 'zod';
import { db as defaultDb, type FieldShoreDB } from './db';

// data/store — the first-run onboarding progress (account-creation welcome →
// checklist hub → guided Quick Find tips). Decoupled from session.ts on purpose:
// it tracks "has this device's user been shown the tour" + which lessons they
// finished, not identity. Resting state is 'unseen'; start() flips it to
// 'active' once, only from a clean slate, so a returning member who already
// finished is never re-greeted (the auto-launch never fights guest cold-open —
// the Principle-11 reconciliation: it appears only after a DELIBERATE account
// creation, and is always skippable).
//
// Durable copy is ONE json row in `meta` (ONBOARDING_KEY); persistence is
// per-device, which is correct for "seen the tour on this device" (no cross-
// device sync needed — // ponytail: meta→RTDB only if it ever matters). Mirrors
// sessionStore: validate the row on boot (trust boundary), durable write THEN
// setState (L-4).

export const ONBOARDING_KEY = 'fieldshore_onboarding_progress';

export type OnboardingStatus = 'unseen' | 'active' | 'completed' | 'dismissed';

export interface OnboardingState {
  status: OnboardingStatus;
  /** Lesson ids the user has finished — 'welcome' (the intro) + per-screen ids. */
  doneLessons: string[];
  /** The member's ICS position focus (Settings) — tailors later lessons. */
  roleFocus: string | null;
  /** When set, the host opens that lesson directly instead of the hub. */
  focusLesson: string | null;
}

export interface OnboardingStoreApi {
  store: StoreApi<OnboardingState>;
  /** Hydrate from the persisted meta row. */
  boot(): Promise<void>;
  /** First account creation → auto-launch, but only from a clean 'unseen'
   *  slate (never clobbers a completed/dismissed member). */
  start(): Promise<void>;
  /** Mark the welcome intro or a lesson finished. */
  markLessonDone(id: string): Promise<void>;
  /** Open a specific lesson directly (hub tap / Settings replay-lesson). */
  startLesson(id: string): Promise<void>;
  /** Leave a lesson back to the hub. `done` records completion. */
  endLesson(id: string, done: boolean): Promise<void>;
  /** Finished the hub — terminal, replayable from Settings. */
  finish(): Promise<void>;
  /** Skipped — terminal. */
  dismiss(): Promise<void>;
  /** Settings → replay the whole tour from the welcome intro. */
  replayTour(): Promise<void>;
  /** Settings → store the member's ICS focus. */
  setRoleFocus(roleFocus: string | null): Promise<void>;
}

const DEFAULT: OnboardingState = {
  status: 'unseen',
  doneLessons: [],
  roleFocus: null,
  focusLesson: null,
};

// Each field .catch()-degrades independently: a partial or wrong-shape row never
// dead-ends boot — it falls back to the resting default (= re-offer the tour),
// which is safe (the worst case is showing it once more, never losing real data).
const Schema = z.object({
  status: z.enum(['unseen', 'active', 'completed', 'dismissed']).catch('unseen'),
  doneLessons: z.array(z.string()).catch([]),
  roleFocus: z.string().nullable().catch(null),
  focusLesson: z.string().nullable().catch(null),
});

export function createOnboardingStore(db: FieldShoreDB = defaultDb): OnboardingStoreApi {
  const store = createStore<OnboardingState>(() => ({ ...DEFAULT }));

  // put (not add) — the row is overwritten on every transition.
  function persist(next: OnboardingState): Promise<unknown> {
    return db.meta.put({ key: ONBOARDING_KEY, value: JSON.stringify(next) });
  }

  // Durable write THEN setState (L-4), mirroring sessionStore's mutators.
  async function set(patch: Partial<OnboardingState>): Promise<void> {
    const next = { ...store.getState(), ...patch };
    await persist(next);
    store.setState(next, true);
  }

  return {
    store,

    async boot() {
      let state: OnboardingState = { ...DEFAULT };
      const row = await db.meta.get(ONBOARDING_KEY);
      if (row) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(row.value);
        } catch {
          parsed = undefined;
        }
        const result = Schema.safeParse(parsed);
        if (result.success) state = result.data;
      }
      store.setState(state, true);
    },

    async start() {
      if (store.getState().status !== 'unseen') return;
      await set({ status: 'active', focusLesson: null });
    },

    markLessonDone(id) {
      const done = store.getState().doneLessons;
      if (done.includes(id)) return Promise.resolve();
      return set({ doneLessons: [...done, id] });
    },

    startLesson(id) {
      return set({ status: 'active', focusLesson: id });
    },

    endLesson(id, done) {
      const cur = store.getState().doneLessons;
      const doneLessons = done && !cur.includes(id) ? [...cur, id] : cur;
      return set({ focusLesson: null, doneLessons });
    },

    finish() {
      return set({ status: 'completed', focusLesson: null });
    },

    dismiss() {
      return set({ status: 'dismissed', focusLesson: null });
    },

    replayTour() {
      return set({ status: 'active', doneLessons: [], focusLesson: null });
    },

    setRoleFocus(roleFocus) {
      return set({ roleFocus });
    },
  };
}

/** The app's singleton onboarding store, bound to the singleton DB. */
export const onboardingStore = createOnboardingStore();
