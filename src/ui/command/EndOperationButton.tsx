import { useState } from 'react';
import { newId } from '@core/id';
import { Button, Modal } from '@ui/primitives';
import { useOperation, useCommit, useDeviceUid } from '@ui/hooks';

/** End Operation — the IC-gated destructive action (the board's OperationEnded path).
 *  Self-contained (button + confirm modal + commit) so the layout can place it last
 *  in either the phone column or the Deck rail. */
export function EndOperationButton() {
  const operation = useOperation();
  const commit = useCommit();
  const getUid = useDeviceUid();
  const [open, setOpen] = useState(false);
  if (!operation) return null;

  const endOperation = async () => {
    const result = await commit({
      type: 'OperationEnded',
      id: newId(),
      opId: operation.id,
      at: Date.now(),
      by: await getUid(),
    });
    if (result.ok) setOpen(false);
  };

  return (
    <>
      <Button variant="secondary" destructive fullWidth onPress={() => setOpen(true)}>
        End Operation
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="End Operation?"
        variant="destructive"
        footer={
          <>
            <Button variant="secondary" onPress={() => setOpen(false)}>
              <span data-modal-cancel>Cancel</span>
            </Button>
            <Button variant="primary" destructive onPress={endOperation}>
              End Operation
            </Button>
          </>
        }
      >
        <p>This archives every shore point and ends the active operation. You can start a new one afterward.</p>
      </Modal>
    </>
  );
}
