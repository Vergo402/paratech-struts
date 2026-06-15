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
  /**
   * The full In-Process set to un-deploy together. For a grouped physical shore
   * (Double-T / 3-Post) this is every deployed member, so the shore is never
   * left as orphaned standing struts — the set stays married cradle-to-grave.
   * Omitted / empty falls back to just `shorePoint`.
   */
  groupMembers?: ShorePoint[];
  onClose: () => void;
  /** Fires after a successful return with the number un-deployed — the board
   *  announces + re-expands Pending. */
  onReturned?: (sp: ShorePoint, count: number) => void;
}

export function StepBackConfirmModal({ shorePoint, groupMembers, onClose, onReturned }: StepBackConfirmModalProps) {
  const commit = useCommit();
  const getUid = useDeviceUid();
  const [error, setError] = useState<string | null>(null);

  // Un-deploy the whole grouped shore as one. Fall back to the single point.
  const members = groupMembers && groupMembers.length > 0 ? groupMembers : shorePoint ? [shorePoint] : [];
  const count = members.length;

  async function handleReturn() {
    if (!shorePoint) return;
    // Inventory-consequential events commit one at a time — each runs its own
    // L-8 stock transaction — so loop single commits rather than commitMany.
    const uid = await getUid();
    let ok = 0;
    let lastReason: string | null = null;
    for (const m of members) {
      const result = await commit({
        type: 'StrutReturned',
        id: newId(),
        opId: m.opId,
        at: Date.now(),
        by: uid,
        spId: m.id,
      });
      if (result.ok) ok++;
      else lastReason = result.reason;
    }
    if (ok > 0) {
      commitHaptic();
      onReturned?.(shorePoint, ok);
      handleClose();
    } else {
      setError(lastReason ?? 'Return failed');
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
      title={count > 1 ? `Return ${count} struts to inventory?` : `Return ${model} to inventory?`}
      variant="destructive"
      footer={
        <>
          <Button variant="secondary" onPress={handleClose}>
            <span data-modal-cancel>Cancel</span>
          </Button>
          <Button variant="primary" destructive onPress={handleReturn}>
            {count > 1 ? 'Return All & Step Back' : 'Return & Step Back'}
          </Button>
        </>
      }
    >
      {count > 1 ? (
        <p>
          Stepping back will un-deploy all {count} struts in this shore and return them to inventory&rsquo;s
          available count. The whole shore goes back to Pending.
        </p>
      ) : (
        <p>
          Stepping back will un-deploy this strut and return it to {source ? <strong>{source}</strong> : 'inventory'}
          &rsquo;s available count. The shore point goes back to Pending.
        </p>
      )}
      {error && <p role="alert" className="fs-modal-error">{error}</p>}
    </Modal>
  );
}
