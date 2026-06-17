import { useEffect } from 'react';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { useOnboarding } from '@ui/hooks';
import { Welcome } from './Welcome';
import { ChecklistHub } from './ChecklistHub';
import { Coachmark } from './Coachmark';
import { QUICK_FIND_TOUR, LESSON_QUICK_FIND, LESSON_WELCOME } from './tours';
import './onboarding.css';

/**
 * OnboardingHost — the single first-run surface, mounted once in the shell so it
 * survives tab changes (the Quick Find lesson routes to /quickfind and back). It
 * renders nothing unless the tour is 'active' (set only by a deliberate account
 * creation, or a Settings replay), so the guest cold-open is never touched. Order
 * of precedence: a focused lesson → the welcome intro → the checklist hub.
 */
export function OnboardingHost() {
  const ob = useOnboarding();
  const navigate = useNavigate();
  const pathname = useLocation({ select: (l) => l.pathname });
  const runningQuickFind = ob.status === 'active' && ob.focusLesson === LESSON_QUICK_FIND;

  // Route to the lesson's screen before its coachmark queries anchors.
  useEffect(() => {
    if (runningQuickFind) navigate({ to: '/quickfind' });
  }, [runningQuickFind, navigate]);

  if (ob.status !== 'active') return null;

  if (ob.focusLesson === LESSON_QUICK_FIND) {
    // Hold the coachmark until we've actually arrived — never mount it on the
    // outgoing screen and burn its anchor-retry budget mid-route-change (phone is
    // the floor; a slow transition must not drop the first tip).
    if (pathname !== '/quickfind') return null;
    return (
      <Coachmark
        steps={QUICK_FIND_TOUR}
        onComplete={() => ob.endLesson(LESSON_QUICK_FIND, true)}
        onExit={() => ob.endLesson(LESSON_QUICK_FIND, false)}
      />
    );
  }

  if (!ob.doneLessons.includes(LESSON_WELCOME)) {
    return <Welcome onDone={() => ob.markLessonDone(LESSON_WELCOME)} onSkip={() => ob.dismiss()} />;
  }

  return (
    <ChecklistHub
      doneLessons={ob.doneLessons}
      onStartLesson={(id) => ob.startLesson(id)}
      onClose={() => ob.finish()}
    />
  );
}
