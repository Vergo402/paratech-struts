import { useEffect, useState } from 'react';
import type { Operation } from '@core/schema';
import { newId } from '@core/id';
import { Button, Modal, TextField, Toggle } from '@ui/primitives';
import { commitHaptic } from '@ui/primitives/haptics';
import { useCommit, useDeviceUid, useSession } from '@ui/hooks';
import { AddressField } from './AddressField';

export interface StartOperationModalProps {
  open: boolean;
  onClose: () => void;
  /** When truthy the modal pre-populates for editing. */
  operation?: Operation | null;
}

export function StartOperationModal({ open, onClose, operation }: StartOperationModalProps) {
  const commit = useCommit();
  const getUid = useDeviceUid();
  const { identity } = useSession();
  const editing = !!operation;

  const [name, setName] = useState('');
  const [multiBuilding, setMultiBuilding] = useState(false);
  const [inlineDeploy, setInlineDeploy] = useState(true); // new ops default to one-step inline
  const [location, setLocation] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(operation?.name ?? '');
    setMultiBuilding(operation?.multiBuilding ?? false);
    setInlineDeploy(operation?.inlineDeploy ?? true);
    setLocation(operation?.location ?? '');
    setCoords(operation?.coords ?? null);
  }, [open, operation]);

  const trimmedName = name.trim();
  const canSubmit = trimmedName.length > 0;

  async function handleSubmit() {
    if (!canSubmit) return;
    const uid = await getUid();

    if (editing) {
      const patch: Record<string, unknown> = {};
      if (trimmedName !== operation!.name) patch.name = trimmedName;
      if (multiBuilding !== operation!.multiBuilding) patch.multiBuilding = multiBuilding;
      if (inlineDeploy !== operation!.inlineDeploy) patch.inlineDeploy = inlineDeploy;
      const newLoc = location.trim() || null;
      const oldLoc = operation!.location ?? null;
      if (newLoc !== oldLoc) patch.location = newLoc;

      // Coordinates ride with the location. Cleared text drops them; a manually
      // edited address (no re-pick) also drops them since they'd be stale.
      const newCoords = newLoc ? coords : null;
      const oldCoords = operation!.coords ?? null;
      if (newCoords?.lat !== oldCoords?.lat || newCoords?.lng !== oldCoords?.lng) {
        patch.coords = newCoords;
      }

      if (Object.keys(patch).length === 0) {
        onClose();
        return;
      }

      const result = await commit({
        type: 'OperationEdited',
        id: newId(),
        opId: operation!.id,
        at: Date.now(),
        by: uid,
        ...patch,
      } as Parameters<typeof commit>[0]);

      if (result.ok) {
        commitHaptic();
        onClose();
      }
    } else {
      const result = await commit({
        type: 'OperationCreated',
        id: newId(),
        opId: newId(),
        at: Date.now(),
        by: uid,
        name: trimmedName,
        multiBuilding,
        inlineDeploy,
        location: location.trim() || undefined,
        coords: location.trim() ? (coords ?? undefined) : undefined,
        // A signed-in founder holds IC by ACCOUNT (follows their devices); a guest by
        // device. `by` stays the per-device uid (provenance) either way.
        ...(identity.kind === 'member'
          ? { account: { id: identity.accountId, label: identity.displayName } }
          : {}),
      });

      if (result.ok) {
        commitHaptic();
        onClose();
      }
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit Operation' : 'Start Operation'}
      variant="form"
      footer={
        <Button
          variant="primary"
          fullWidth
          disabled={!canSubmit}
          disabledReason="Enter an operation name"
          onPress={handleSubmit}
        >
          {editing ? 'Save' : 'Start Operation'}
        </Button>
      }
    >
      <div className="fs-ops-form">
        <TextField
          label="Operation name"
          value={name}
          onChange={setName}
          placeholder="e.g. Cascade Building Fire"
        />
        {/* "Utilize Pending Card" is the user-facing inverse of inlineDeploy:
            ON = use the Pending card (two-step), OFF = find + deploy in the form
            (one-step). The data field stays inlineDeploy; only the display flips. */}
        <Toggle
          label="Utilize Pending Card"
          helper={
            <>
              <u>On</u>: save a Pending card; assign equipment from the board later. Best for large
              incidents where struts are retrieved by a separate group.
              <br />
              <u>Off</u>: find and deploy struts right in the form. Best for small incidents.
            </>
          }
          checked={!inlineDeploy}
          onChange={(next) => setInlineDeploy(!next)}
        />
        <Toggle
          label="Multi-building"
          helper="Enable per-building grouping for shore points"
          checked={multiBuilding}
          onChange={setMultiBuilding}
        />
        <AddressField
          label="Location / address"
          value={location}
          onChange={(v) => {
            setLocation(v);
            setCoords(null); // typed text no longer matches picked coordinates
          }}
          onPick={(pick) => setCoords(pick.coords)}
          placeholder="Optional"
        />
      </div>
    </Modal>
  );
}
