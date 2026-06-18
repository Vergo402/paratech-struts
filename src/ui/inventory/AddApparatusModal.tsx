import { useState } from 'react';
import { Modal, Button, TextField } from '@ui/primitives';
import { BottomSheetPicker } from '@ui/picker';
import { APPARATUS_TYPES, type ApparatusType } from '@core/load';

// Add an apparatus — name + NIMS type. A form Modal (ADR-016: pins header/footer,
// scrolls body); the type picker is the surface-adaptive BottomSheetPicker.

export interface AddApparatusModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (name: string, type: ApparatusType) => Promise<void> | void;
}

const TYPE_OPTIONS = APPARATUS_TYPES.map((t) => ({ value: t, label: t }));

export function AddApparatusModal({ open, onClose, onAdd }: AddApparatusModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ApparatusType>('Engine');

  const close = () => {
    setName('');
    setType('Engine');
    onClose();
  };

  const submit = async () => {
    if (!name.trim()) return;
    await onAdd(name.trim(), type);
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add apparatus"
      variant="form"
      footer={
        <>
          <Button variant="secondary" onPress={close}>
            <span data-modal-cancel>Cancel</span>
          </Button>
          <Button variant="primary" onPress={submit} disabled={!name.trim()} disabledReason="Enter a name">
            Add
          </Button>
        </>
      }
    >
      <TextField label="Apparatus name" value={name} onChange={setName} placeholder="e.g. Engine 1" />
      <BottomSheetPicker label="Type" options={TYPE_OPTIONS} value={type} onSelect={setType} />
    </Modal>
  );
}
