import { Segmented } from '@ui/primitives';
import { OrgChart } from './OrgChart';
import { HazardLog } from './HazardLog';

export type WorkspaceView = 'org' | 'hazard';

const VIEW_OPTIONS = [
  { value: 'org' as const, label: 'Org Chart' },
  { value: 'hazard' as const, label: 'Hazard Log' },
];

/**
 * The Command Deck workspace (desktop ≥1024px) — the right pane beside the
 * situation rail. A Segmented header swaps between the org chart (default) and the
 * hazard log, rendering the FULL composition in place (no route change), so the
 * six datums in the rail stay pinned while the IC works. Org chart = read view
 * (P6); Hazard Log register = P9 (placeholder here); Edit structure = P7.
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
        {view === 'org' && <span className="fs-cmd-ws-hint">Tap a position to assign or edit</span>}
      </div>
      <div className="fs-cmd-ws-body">
        {view === 'org' ? <OrgChart onOpenNode={onOpenNode} /> : <HazardLog />}
      </div>
    </div>
  );
}
