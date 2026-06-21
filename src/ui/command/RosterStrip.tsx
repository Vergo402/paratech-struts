import type { OrgResourceRef } from '@core/schema';
import { positionForResource } from '@core/org';
import { useApparatus, useOrg } from '@ui/hooks';
import type { OrgDragApi } from './useOrgDragDrop';

/**
 * The roster strip (#323) — apparatus chips the IC drags straight onto a position
 * card to assign it (drop on the top half = supervisor, bottom half = add a
 * subordinate). Same source as the assign sheet (`useApparatus().roster`); apparatus
 * only (named individuals stay free-text in the assign sheet). A chip shows its
 * current command home so the IC sees where a rig already sits before moving it.
 */
export function RosterStrip({ dnd }: { dnd: OrgDragApi }) {
  const { roster } = useApparatus();
  const positions = useOrg();
  if (roster.length === 0) return null;
  return (
    <div className="fs-org-roster">
      <span className="fs-org-roster-label">Available rigs</span>
      {roster.map((app) => {
        const resource: OrgResourceRef = { ref: 'apparatus', value: app.id, label: app.name };
        const home = positionForResource(positions, resource);
        return (
          <button
            key={app.id}
            type="button"
            className="fs-org-roster-chip"
            title="Drag onto a position to assign"
            onPointerDown={(e) => dnd.startChip(e, resource)}
          >
            {app.name}
            {home && <span className="fs-org-roster-at">· {home.title}</span>}
          </button>
        );
      })}
    </div>
  );
}
