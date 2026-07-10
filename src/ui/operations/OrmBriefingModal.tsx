import type { Briefing } from '@core/checklist';
import { Button, Modal, NestedChecklist } from '@ui/primitives';
import { useChecklists, useChecklistTemplate } from '@ui/hooks';
import { clockTime } from '@ui/util/time';

// The ORM/TCRM risk briefing (#205) as a full-screen form Modal (per the
// modal-vs-sheet doctrine for forms — NOT a sheet). The 4-step briefing + 5 crew
// questions are tap-to-attest signed leaves; Begin/End bracket the session
// (timestamps = the who-briefed-which-crew record). HARD INVARIANT: a briefing
// RECORDS that it happened — it NEVER gates crew entry, deployment, or any status
// advance (Principle 10). The "Speak" step names the radio/face-to-face stop
// authority; it does not implement an app block. (Flag for the Phase J audit.)

export function OrmBriefingModal({
  open,
  briefing,
  onClose,
  onEnd,
}: {
  open: boolean;
  briefing: Briefing | null;
  onClose: () => void;
  onEnd: () => void;
}) {
  const template = useChecklistTemplate('orm-tcrm');
  const { attestations, check, uncheck } = useChecklists('orm-tcrm', briefing?.id ?? '');

  return (
    <Modal
      open={open && !!briefing}
      onClose={onClose}
      title="Risk briefing (ORM / TCRM)"
      variant="form"
      footer={
        <Button variant="primary" onPress={onEnd}>
          End Briefing
        </Button>
      }
    >
      {briefing && (
        <div className="fs-orm">
          <div className="fs-orm-session">
            <span>
              Briefing started <span className="fs-orm-time">{clockTime(briefing.startedAt)}</span>
            </span>
          </div>
          <NestedChecklist template={template} attestations={attestations} onCheck={check} onUncheck={uncheck} />
          <p className="fs-orm-note">
            Records that the briefing happened — it never blocks crew entry, deployment, or any status advance.
          </p>
        </div>
      )}
    </Modal>
  );
}
