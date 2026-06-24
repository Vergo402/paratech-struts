import { useState } from 'react';
import { Modal, Button, TextField } from '@ui/primitives';
import { BottomSheetPicker } from '@ui/picker';
import { useApparatusTypes } from '@ui/hooks';

// Add an apparatus — name + NIMS type. A form Modal (ADR-016: pins header/footer,
// scrolls body); the type picker is the surface-adaptive BottomSheetPicker. The type
// list = the built-in catalog + the department's custom apparatus types (#321 inc4b).

export interface AddApparatusModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (name: string, type: string) => Promise<void> | void;
}

export function AddApparatusModal({ open, onClose, onAdd }: AddApparatusModalProps) {
  const { allNames } = useApparatusTypes();
  const typeOptions = allNames.map((t) => ({ value: t, label: t }));
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('Engine');

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
      <BottomSheetPicker label="Type" options={typeOptions} value={type} onSelect={setType} />
    </Modal>
  );
}
