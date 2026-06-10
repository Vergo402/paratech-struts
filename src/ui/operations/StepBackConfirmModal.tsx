import { useState } from 'react';
import type { ShorePoint } from '@core/schema';
import { newId } from '@core/id';
import { Button, Modal } from '@ui/primitives';
import { commitHaptic } from '@ui/primitives/haptics';
import { useCommit, useDeviceUid } from '@ui/hooks';

/**
 * Step-back confirm (#221 step 3-R) — un-deploying a strut RETURNS inventory,
 * so unlike every other lifecycle reversal it earns the destructive modal
 * gate (ADR-010/ADR-016: the only reversal that confirms is one that mutates
 * inventory). Confirm commits StrutReturned: the store transaction restores
 * the stock count and the reducer reverts the point to Pending.
 */
export interface StepBackConfirmModalProps {
  /** The In Process point to un-deploy; null renders nothing (closed). */
  shorePoint: ShorePoint | null;
  onClose: () => void;
  /** Fires after a successful return — the board announces + re-expands Pending. */
  onReturned?: (sp: ShorePoint) => void;
}

export function StepBackConfirmModal({ shorePoint, onClose, onReturned }: StepBackConfirmModalProps) {
  const commit = useCommit();
  const getUid = useDeviceUid();
  const [error, setError] = useState<string | null>(null);

  async function handleReturn() {
    if (!shorePoint) return;
    const result = await commit({
      type: 'StrutReturned',
      id: newId(),
      opId: shorePoint.opId,
      at: Date.now(),
      by: await getUid(),
      spId: shorePoint.id,
    });
    if (result.ok) {
      commitHaptic();
      onReturned?.(shorePoint);
      handleClose();
    } else {
      setError(result.reason);
    }
  }

  function handleClose() {
    setError(null);
    onClose();
  }

  const model = shorePoint?.deployedStrut?.model ?? 'strut';
  const source = shorePoint?.deployedStrut?.source;

  return (
    <Modal
      open={!!shorePoint}
      onClose={handleClose}
      title={`Return ${model} to inventory?`}
      variant="destructive"
      footer={
        <>
          <Button variant="secondary" onPress={handleClose}>
            <span data-modal-cancel>Cancel</span>
          </Button>
          <Button variant="primary" destructive onPress={handleReturn}>
            Return &amp; Step Back
          </Button>
        </>
      }
    >
      <p>
        Stepping back will un-deploy this strut and return it to {source ? <strong>{source}</strong> : 'inventory'}
        &rsquo;s available count. The shore point goes back to Pending.
      </p>
      {error && <p role="alert" className="fs-modal-error">{error}</p>}
    </Modal>
  );
}
