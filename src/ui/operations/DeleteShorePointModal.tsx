import { useState } from 'react';
import type { ShorePoint } from '@core/schema';
import { divisionLabel } from '@core/operation';
import { newId } from '@core/id';
import { Button, Modal } from '@ui/primitives';
import { commitHaptic } from '@ui/primitives/haptics';
import { useCommit, useCommitMany, useDeviceUid, useShorePoints } from '@ui/hooks';

/**
 * Delete confirm (#220) — Pending-only. Soft-delete since #319: the point is
 * recoverable from the board's Deleted section, but removing active work is a
 * deliberate move, so it keeps the confirm gate (ADR-016; everyday advances
 * never confirm). Delete is offered only on Pending cards. Group-aware (audit
 * W5): deleting any member of a multi-strut shore removes the whole physical
 * shore in one batch, so a partial shore is never orphaned.
 */
export interface DeleteShorePointModalProps {
  /** The point to delete; null renders nothing (closed). */
  shorePoint: ShorePoint | null;
  onClose: () => void;
}

export function DeleteShorePointModal({ shorePoint, onClose }: DeleteShorePointModalProps) {
  const shorePoints = useShorePoints();
  const commit = useCommit();
  const commitMany = useCommitMany();
  const getUid = useDeviceUid();
  const [error, setError] = useState<string | null>(null);

  // The physical shore being deleted: every live member sharing the groupId
  // (Double-T/3-Post), or just this point when it's a standalone shore. Deleting
  // any member removes the WHOLE shore so a partial can't be orphaned (audit W5).
  const members =
    shorePoint && shorePoint.groupId
      ? shorePoints.filter((p) => p.groupId === shorePoint.groupId && p.deletedAt == null)
      : shorePoint
        ? [shorePoint]
        : [];

  function close() {
    setError(null);
    onClose();
  }

  async function handleDelete() {
    if (!shorePoint || members.length === 0) return;
    setError(null);
    const uid = await getUid();
    const at = Date.now();
    const result =
      members.length > 1
        ? await commitMany(
            members.map((m) => ({
              type: 'ShorePointDeleted' as const,
              id: newId(),
              opId: m.opId,
              at,
              by: uid,
              spId: m.id,
            })),
          )
        : await commit({
            type: 'ShorePointDeleted',
            id: newId(),
            opId: shorePoint.opId,
            at,
            by: uid,
            spId: shorePoint.id,
          });
    if (result.ok) {
      commitHaptic();
      close();
    } else {
      // #421 — a member of this shore still holds deployed equipment; the store
      // rejected the whole batch. Keep the modal open and say so honestly.
      setError('One or more struts of this shore still hold deployed equipment — return it first.');
    }
  }

  const identity = shorePoint
    ? [shorePoint.label, divisionLabel(shorePoint.division), shorePoint.area].filter(Boolean).join(' · ')
    : '';

  return (
    <Modal
      open={!!shorePoint}
      onClose={close}
      title="Delete Shore Point?"
      variant="destructive"
      footer={
        <>
          <Button variant="secondary" onPress={close}>
            <span data-modal-cancel>Cancel</span>
          </Button>
          <Button variant="primary" destructive onPress={handleDelete}>
            Delete
          </Button>
        </>
      }
    >
      <p>
        {members.length > 1 ? (
          <>
            This removes all <strong>{members.length}</strong> struts of <strong>{identity}</strong> from the board.
          </>
        ) : (
          <>
            This deletes <strong>{identity}</strong> from the board.
          </>
        )}{' '}
        You can restore it from the <strong>Deleted</strong> section below. A shore point can only be deleted while it
        is Pending.
      </p>
      {error && <p role="alert" className="fs-modal-error">{error}</p>}
    </Modal>
  );
}
