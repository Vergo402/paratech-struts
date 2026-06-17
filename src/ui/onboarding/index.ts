// ui/onboarding — the first-run experience (welcome → checklist hub → guided
// Quick Find tips). Composes existing primitives; reaches data only through
// @ui/hooks (useOnboarding). The host is the one mount point (shell).
export { OnboardingHost } from './OnboardingHost';
export { LESSON_QUICK_FIND } from './tours';
