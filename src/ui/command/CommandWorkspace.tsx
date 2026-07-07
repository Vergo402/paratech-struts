import { Segmented } from '@ui/primitives';
import { OrgChart, OrgWorkspaceActions } from './OrgChart';
import { HazardLog } from './HazardLog';

export type WorkspaceView = 'org' | 'hazard';

const VIEW_OPTIONS = [
  { value: 'org' as const, label: 'Org Chart' },
  { value: 'hazard' as const, label: 'Hazard Log' },
];

/**
 * The Command Deck workspace (desktop ≥1024px) — the right pane beside the
 * situation rail. ONE header row (#434): the Segmented view swap left, the org
 * actions (My role · full-screen) right — the standing "Tap a position…" hint is
 * gone (the node cards carry their own press affordance). The FULL composition
 * renders in place (no route change), so the rail's datums stay pinned while the
 * IC works.
 */
export function CommandWorkspace({
  view,
  onView,
  onOpenNode,
}: {
  view: WorkspaceView;
  onView: (v: WorkspaceView) => void;
  onOpenNode: (id: string) => void;
}) {
  return (
    <div className="fs-cmd-ws">
      <div className="fs-cmd-ws-head">
        <Segmented options={VIEW_OPTIONS} value={view} onChange={onView} aria-label="Command workspace view" />
        {view === 'org' && <OrgWorkspaceActions />}
      </div>
      <div className="fs-cmd-ws-body">
        {view === 'org' ? <OrgChart onOpenNode={onOpenNode} /> : <HazardLog />}
      </div>
    </div>
  );
}
