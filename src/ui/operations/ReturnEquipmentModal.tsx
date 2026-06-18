import { useState } from 'react';
import type { ShorePoint } from '@core/schema';
import { deployedStrutOf } from '@core/shorepoint';
import { newId } from '@core/id';
import { Button, Modal } from '@ui/primitives';
import { commitHaptic } from '@ui/primitives/haptics';
import { useCommit, useDeviceUid } from '@ui/hooks';

/**
 * Remove & Return confirm (#224) — the terminal, inventory-consequential move:
 * Shore Secured → Strut Equipment Returned. Like the un-deploy step-back it earns
 * the destructive modal gate (ADR-010/ADR-016: the only moves that confirm are the
 * ones that mutate inventory), but this one is FINAL — "This cannot be undone"
 * (Shore Secured is the last reversible state). Confirm commits EquipmentReclaimed:
 * the store transaction restores the strut to its source apparatus's available
 * count and the reducer flips the point to `returned`, keeping the strut on the
 * card as history.
 *
 * Individual — one point per confirm (post-cutting phase split). Unlike the grouped
 * un-deploy in StepBackConfirmModal, there is no group loop here.
 */
export interface ReturnEquipmentModalProps {
  /** The Shore Secured point to return; null renders nothing (closed). */
  shorePoint: ShorePoint | null;
  onClose: () => void;
  /** Fires after a successful return — the board announces + opens the Returned lane. */
  onReturned?: (sp: ShorePoint) => void;
}

export function ReturnEquipmentModal({ shorePoint, onClose, onReturned }: ReturnEquipmentModalProps) {
  const commit = useCommit();
  const getUid = useDeviceUid();
  const [error, setError] = useState<string | null>(null);

  async function handleReturn() {
    if (!shorePoint) return;
    const result = await commit({
      type: 'EquipmentReclaimed',
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

  const deployed = shorePoint ? deployedStrutOf(shorePoint) : undefined;
  const model = deployed?.model ?? 'strut';
  const source = deployed?.source;

  return (
    <Modal
      open={!!shorePoint}
      onClose={handleClose}
      title="Return equipment to inventory?"
      variant="destructive"
      footer={
        <>
          <Button variant="secondary" onPress={handleClose}>
            <span data-modal-cancel>Cancel</span>
          </Button>
          <Button variant="primary" destructive onPress={handleReturn}>
            Confirm Return
          </Button>
        </>
      }
    >
      <p>
        {model} — with its plates and extensions — will be returned, each piece to its source truck
        {source ? <> (the strut to <strong>{source}</strong>)</> : ''}&rsquo;s available count.
      </p>
      <p>This cannot be undone.</p>
      {error && <p role="alert" className="fs-modal-error">{error}</p>}
    </Modal>
  );
}
