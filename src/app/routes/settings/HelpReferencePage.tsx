import { useNavigate } from '@tanstack/react-router';
import { InlineSegmented } from '@ui/picker';
import { Button } from '@ui/primitives';
import { useOnboarding } from '@ui/hooks';
import { LESSON_QUICK_FIND } from '@ui/onboarding';

// The role-guided tour split (ADR — ICS position). Two buckets for the slice —
// the field role (measure & shore) vs the command role (IC & org).
const ROLE_OPTIONS = [
  { value: 'field', label: 'Field — measure & shore' },
  { value: 'command', label: 'Command — IC & org' },
] as const;
type RoleFocus = (typeof ROLE_OPTIONS)[number]['value'];

/** Help & reference — the guided tour, lessons, and the user guide (50-settings.md
 *  §Help/§Reference). Reference doctrine links + Feedback join here in Inc 4. */
export function HelpReferencePage() {
  const { roleFocus, replayTour, startLesson, setRoleFocus } = useOnboarding();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6">
      <h1 style={{ font: 'var(--type-headline-1)' }}>Help &amp; reference</h1>
      <section className="flex flex-col gap-3">
        <p className="text-ink-tertiary" style={{ font: 'var(--type-body-lg)' }}>
          A walkthrough on real screens — nothing you tap during it is saved.
        </p>
        <Button variant="primary" onPress={() => void replayTour()}>
          Replay the tour
        </Button>
        <Button variant="secondary" onPress={() => void startLesson(LESSON_QUICK_FIND)}>
          Quick Find walkthrough
        </Button>
        <InlineSegmented
          label="Guided experience for my role"
          options={ROLE_OPTIONS}
          value={(roleFocus ?? '') as RoleFocus}
          onChange={(next) => void setRoleFocus(next)}
        />
        <Button variant="secondary" onPress={() => navigate({ to: '/help' })}>
          Open user guide
        </Button>
      </section>
    </div>
  );
}
