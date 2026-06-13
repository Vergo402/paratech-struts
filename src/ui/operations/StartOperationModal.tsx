import { useEffect, useState } from 'react';
import type { Operation } from '@core/schema';
import { newId } from '@core/id';
import { Button, Modal, TextField, Toggle } from '@ui/primitives';
import { commitHaptic } from '@ui/primitives/haptics';
import { useCommit, useDeviceUid } from '@ui/hooks';

export interface StartOperationModalProps {
  open: boolean;
  onClose: () => void;
  /** When truthy the modal pre-populates for editing. */
  operation?: Operation | null;
}

export function StartOperationModal({ open, onClose, operation }: StartOperationModalProps) {
  const commit = useCommit();
  const getUid = useDeviceUid();
  const editing = !!operation;

  const [name, setName] = useState('');
  const [multiBuilding, setMultiBuilding] = useState(false);
  const [inlineDeploy, setInlineDeploy] = useState(true); // new ops default to one-step inline
  const [location, setLocation] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(operation?.name ?? '');
    setMultiBuilding(operation?.multiBuilding ?? false);
    setInlineDeploy(operation?.inlineDeploy ?? true);
    setLocation(operation?.location ?? '');
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
        <Toggle
          label="Find & deploy in the form"
          helper="On: size, find struts, and deploy right in the shore point form — best for small ops. Off: save a Pending card and assign equipment from the board — best for large ops with a retrieval crew. Change anytime by editing the operation."
          checked={inlineDeploy}
          onChange={setInlineDeploy}
        />
        <Toggle
          label="Multi-building"
          helper="Enable per-building grouping for shore points"
          checked={multiBuilding}
          onChange={setMultiBuilding}
        />
        <TextField
          label="Location / address"
          value={location}
          onChange={setLocation}
          placeholder="Optional"
        />
      </div>
    </Modal>
  );
}
