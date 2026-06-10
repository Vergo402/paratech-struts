import type { ShorePoint } from '@core/schema';
import { divisionLabel } from '@core/operation';
import { newId } from '@core/id';
import { Button, Modal } from '@ui/primitives';
import { commitHaptic } from '@ui/primitives/haptics';
import { useCommit, useDeviceUid } from '@ui/hooks';

/**
 * Delete confirm (#220) — Pending-only and TERMINAL, so it earns the
 * destructive modal gate (ADR-016; everyday advances never confirm).
 * Delete is removed from the card after the first advance — the board only
 * offers it on Pending cards.
 */
export interface DeleteShorePointModalProps {
  /** The point to delete; null renders nothing (closed). */
  shorePoint: ShorePoint | null;
  onClose: () => void;
}

export function DeleteShorePointModal({ shorePoint, onClose }: DeleteShorePointModalProps) {
  const commit = useCommit();
  const getUid = useDeviceUid();

  async function handleDelete() {
    if (!shorePoint) return;
    const result = await commit({
      type: 'ShorePointDeleted',
      id: newId(),
      opId: shorePoint.opId,
      at: Date.now(),
      by: await getUid(),
      spId: shorePoint.id,
    });
    if (result.ok) {
      commitHaptic();
      onClose();
    }
  }

  const identity = shorePoint
    ? [shorePoint.label, divisionLabel(shorePoint.division), shorePoint.area].filter(Boolean).join(' · ')
    : '';

  return (
    <Modal
      open={!!shorePoint}
      onClose={onClose}
      title="Delete Shore Point?"
      variant="destructive"
      footer={
        <>
          <Button variant="secondary" onPress={onClose}>
            <span data-modal-cancel>Cancel</span>
          </Button>
          <Button variant="primary" destructive onPress={handleDelete}>
            Delete
          </Button>
        </>
      }
    >
      <p>
        This permanently removes <strong>{identity}</strong> from the operation. A shore point can
        only be deleted while it is Pending.
      </p>
    </Modal>
  );
}
