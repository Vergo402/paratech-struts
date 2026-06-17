import { useStore } from 'zustand';
import { onboardingStore, type OnboardingState } from '@data/store';

/**
 * The first-run onboarding seam for the UI: the live progress state plus the
 * transition actions, all behind one hook so screens never import @data
 * (invariant 3). State is a live subscription (the host re-renders as the tour
 * advances); the actions are the singleton store's stable methods.
 */
export interface OnboardingApi extends OnboardingState {
  start: () => Promise<void>;
  markLessonDone: (id: string) => Promise<void>;
  startLesson: (id: string) => Promise<void>;
  endLesson: (id: string, done: boolean) => Promise<void>;
  finish: () => Promise<void>;
  dismiss: () => Promise<void>;
  replayTour: () => Promise<void>;
  setRoleFocus: (roleFocus: string | null) => Promise<void>;
}

export function useOnboarding(): OnboardingApi {
  const state = useStore(onboardingStore.store);
  return {
    ...state,
    start: onboardingStore.start,
    markLessonDone: onboardingStore.markLessonDone,
    startLesson: onboardingStore.startLesson,
    endLesson: onboardingStore.endLesson,
    finish: onboardingStore.finish,
    dismiss: onboardingStore.dismiss,
    replayTour: onboardingStore.replayTour,
    setRoleFocus: onboardingStore.setRoleFocus,
  };
}
