import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { InlineSegmented } from '@ui/picker';
import { Button } from '@ui/primitives';
import { useOnboarding } from '@ui/hooks';
import { LESSON_QUICK_FIND } from '@ui/onboarding';
import { FeedbackSheet } from '@ui/settings/FeedbackSheet';

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
  const [feedbackOpen, setFeedbackOpen] = useState(false);

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
        <Button variant="secondary" onPress={() => setFeedbackOpen(true)}>
          Send feedback
        </Button>
      </section>

      <section className="flex flex-col gap-3">
        <h2 style={{ font: 'var(--type-headline-2)' }}>Reference materials</h2>
        <p className="text-ink-tertiary" style={{ font: 'var(--type-body-lg)' }}>
          Field doctrine and technical references.
        </p>
        <a
          href="https://web.archive.org/web/2*/https://www.usace.army.mil/Portals/2/docs/Emergency%20Ops/US%26R/Shoring_Operations_Guide_2009.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="fs-button fs-button--secondary fs-button--std"
        >
          USACE Shoring Operations Guide (PDF, via archive)
        </a>
        <a
          href="https://www.fema.gov/emergency-managers/national-preparedness/frameworks/national-urban-search-rescue-response-system"
          target="_blank"
          rel="noopener noreferrer"
          className="fs-button fs-button--secondary fs-button--std"
        >
          FEMA US&amp;R Response System
        </a>
      </section>

      <FeedbackSheet open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  );
}
