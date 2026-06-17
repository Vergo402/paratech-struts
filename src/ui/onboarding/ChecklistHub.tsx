import type { ReactNode } from 'react';
import { Badge, Button, Card, Modal } from '@ui/primitives';
import { useDepartment } from '@ui/hooks';
import { LESSON_QUICK_FIND } from './tours';

/**
 * ChecklistHub — the getting-started home (a form Modal: a focused panel that
 * scrolls). Professional, no gamification: a plain progress count, tappable
 * lessons, and disabled "coming soon" rows for the screens still being built.
 * Closing it (Done / Esc) marks the tour seen; it stays replayable from Settings.
 */
function CheckMark({ done }: { done: boolean }) {
  return done ? (
    <svg className="fs-ob-check is-done" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M7 12.5l3 3 7-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ) : (
    <svg className="fs-ob-check" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function Row({
  done,
  title,
  desc,
  onPress,
  trailing,
  muted,
}: {
  done: boolean;
  title: string;
  desc: string;
  onPress?: () => void;
  trailing?: ReactNode;
  muted?: boolean;
}) {
  return (
    <Card className={`fs-ob-row${muted ? ' fs-ob-row--muted' : ''}`} onPress={onPress}>
      <CheckMark done={done} />
      <span className="fs-ob-row-text">
        <span className="fs-ob-row-title">{title}</span>
        <span className="fs-ob-row-desc">{desc}</span>
      </span>
      {trailing}
    </Card>
  );
}

export interface ChecklistHubProps {
  doneLessons: string[];
  onStartLesson: (id: string) => void;
  onClose: () => void;
}

export function ChecklistHub({ doneLessons, onStartLesson, onClose }: ChecklistHubProps) {
  const { department } = useDepartment();
  const quickFindDone = doneLessons.includes(LESSON_QUICK_FIND);
  const deptDone = department != null;

  // Progress counts only the trackable starter tasks (coming-soon excluded).
  const tracked = [quickFindDone, deptDone];
  const completed = tracked.filter(Boolean).length;
  const total = tracked.length;
  const pct = Math.round((completed / total) * 100);

  return (
    <Modal
      open
      variant="form"
      title="Getting started"
      onClose={onClose}
      footer={
        <Button variant="primary" size="standard" onPress={onClose}>
          <span data-modal-cancel>Done</span>
        </Button>
      }
    >
      <div className="fs-ob-hub">
        <div className="fs-ob-progress">
          <div className="fs-ob-progress-track">
            <span className="fs-ob-progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <p className="fs-ob-progress-label">
            {completed} of {total} done
          </p>
        </div>

        <Row
          done={quickFindDone}
          title="Run your first Quick Find"
          desc="Turn a measurement into a strut pick."
          onPress={() => onStartLesson(LESSON_QUICK_FIND)}
        />
        <Row
          done={deptDone}
          title="Set up your department"
          desc={deptDone ? (department?.name ?? 'Department set') : 'Create or join one to sync your work.'}
        />

        <h3 className="fs-ob-soon-head">Coming soon</h3>
        <Row done={false} title="Operations" desc="Track shore points cradle to grave." muted trailing={<Badge variant="label">Coming soon</Badge>} />
        <Row done={false} title="Inventory" desc="Manage struts across your rigs." muted trailing={<Badge variant="label">Coming soon</Badge>} />
        <Row done={false} title="Command" desc="Run the ICS board and org chart." muted trailing={<Badge variant="label">Coming soon</Badge>} />
      </div>
    </Modal>
  );
}
