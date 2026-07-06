import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@ui/primitives';
import { useOnboarding } from '@ui/hooks';
import { LESSON_QUICK_FIND } from '@ui/onboarding';
import { FeedbackSheet } from '@ui/settings/FeedbackSheet';
import { SettingsGroup, SettingsRow, SettingsPageTitle } from './SettingsRows';

/** Help & reference — the guided tour, lessons, and the user guide (50-settings.md
 *  §Help/§Reference), composed per craft.md Stage 1b: one gold primary (Replay the
 *  tour), everything else quiet card rows. The role-focus choice renders as two
 *  selection rows (check marks the current focus) instead of a segmented control. */
export function HelpReferencePage() {
  const { roleFocus, replayTour, startLesson, setRoleFocus } = useOnboarding();
  const navigate = useNavigate();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="fs-set-pagehead">
          <SettingsPageTitle>Help &amp; reference</SettingsPageTitle>
          <Button variant="primary" onPress={() => void replayTour()}>
            Replay the tour
          </Button>
        </div>
        <p className="fs-set-pagesub">Tours run on real screens — nothing you tap during one is saved.</p>
      </div>

      <SettingsGroup label="Guided tours">
        <SettingsRow
          label="Quick Find walkthrough"
          description="Sizing a strut, step by step"
          onPress={() => void startLesson(LESSON_QUICK_FIND)}
        />
        <SettingsRow
          label="Field — measure and shore"
          description="Guided experience for your role on scene"
          trailing={roleFocus === 'field' ? 'check' : null}
          pressed={roleFocus === 'field'}
          onPress={() => void setRoleFocus('field')}
        />
        <SettingsRow
          label="Command — IC and org"
          description="Guided experience for running the board"
          trailing={roleFocus === 'command' ? 'check' : null}
          pressed={roleFocus === 'command'}
          onPress={() => void setRoleFocus('command')}
        />
      </SettingsGroup>

      <SettingsGroup label="Get help">
        <SettingsRow
          label="Open user guide"
          description="The full manual, works offline"
          onPress={() => navigate({ to: '/help' })}
        />
        <SettingsRow
          label="Send feedback"
          description="Goes straight to the FieldShore team"
          onPress={() => setFeedbackOpen(true)}
        />
      </SettingsGroup>

      <SettingsGroup label="Reference materials" description="Field doctrine and technical references.">
        <SettingsRow
          label="USACE Shoring Operations Guide"
          description="PDF, opens in the browser (via archive)"
          trailing="external"
          href="https://web.archive.org/web/2*/https://www.usace.army.mil/Portals/2/docs/Emergency%20Ops/US%26R/Shoring_Operations_Guide_2009.pdf"
        />
        <SettingsRow
          label="FEMA US&R Response System"
          description="Program overview"
          trailing="external"
          href="https://www.fema.gov/emergency-managers/national-preparedness/frameworks/national-urban-search-rescue-response-system"
        />
      </SettingsGroup>

      <FeedbackSheet open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  );
}
