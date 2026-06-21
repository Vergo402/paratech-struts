import { useState } from 'react';
import type { OrgResourceRef } from '@core/schema';
import { sameResource, positionForResource } from '@core/org';
import { Sheet, TextField, Button } from '@ui/primitives';
import { useApparatus, useOrg } from '@ui/hooks';
import { useOrgCommit } from './useOrgCommit';

/** Assign apparatus (from the roster) or a named individual to a position. Tapping a
 *  rig toggles it on/off this position; the node sheet shows the current assignments
 *  with clear. Stays open for multi-add. */
export function AssignResourceSheet({
  open,
  onClose,
  positionId,
  positionTitle,
}: {
  open: boolean;
  onClose: () => void;
  positionId: string;
  positionTitle: string;
}) {
  const positions = useOrg();
  const { roster } = useApparatus();
  const emit = useOrgCommit();
  const [name, setName] = useState('');

  const assigned = positions[positionId]?.assignedResources ?? [];
  const has = (r: OrgResourceRef) => assigned.some((a) => sameResource(a, r));
  const toggle = (r: OrgResourceRef) =>
    emit(has(r) ? { type: 'ResourceCleared', positionId, resource: r } : { type: 'ResourceAssigned', positionId, resource: r });

  const addIndividual = () => {
    const n = name.trim();
    if (!n) return;
    emit({ type: 'ResourceAssigned', positionId, resource: { ref: 'individual', value: n, label: n } });
    setName('');
  };

  return (
    <Sheet open={open} onClose={onClose} title={`Assign to ${positionTitle}`}>
      <div className="fs-cmd-eyebrow" style={{ marginBottom: 'var(--space-2)' }}>
        Apparatus on roster
      </div>
      {roster.length === 0 ? (
        <p className="fs-cmd-roster-empty">No apparatus on the roster yet.</p>
      ) : (
        <ul className="fs-assign-list">
          {roster.map((app) => {
            const r: OrgResourceRef = { ref: 'apparatus', value: app.id, label: app.name };
            const home = positionForResource(positions, r);
            const onHere = has(r);
            return (
              <li key={app.id}>
                <button type="button" className={`fs-assign-row${onHere ? ' is-on' : ''}`} onClick={() => toggle(r)}>
                  <span className="fs-assign-name">{app.name}</span>
                  <span className="fs-assign-meta">
                    {onHere ? '✓ assigned here' : home ? `at ${home.title}` : 'unassigned'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="fs-cmd-eyebrow" style={{ margin: 'var(--space-4) 0 var(--space-2)' }}>
        Individual
      </div>
      <div className="fs-assign-individual">
        <TextField label="Name" value={name} onChange={setName} placeholder="e.g. FF Lopez" size="standard" />
        <Button variant="secondary" size="standard" disabled={!name.trim()} onPress={addIndividual}>
          Add
        </Button>
      </div>
    </Sheet>
  );
}
