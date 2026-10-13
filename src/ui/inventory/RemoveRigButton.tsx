import { useState } from 'react';
import type { StockRow } from '@core/schema';
import { Button, Modal } from '@ui/primitives';

/**
 * Remove an apparatus (#513). An EMPTY rig goes at once (nothing to lose); a
 * STOCKED rig goes only behind a destructive confirm, because removing it deletes
 * every line it carries (the store cascades + tombstones them in the cloud). It is
 * disabled — with its reason shown beside it — while any unit of the rig is
 * deployed, mirroring the store's L-8 guard; a rejection that slips past that
 * (a race with a deploy) is surfaced inside the confirm instead of vanishing.
 * Per-line Remove is deliberately not offered (v4.1 idea).
 */
export interface RemoveRigButtonProps {
  rigId: string;
  rigName: string;
  /** The stock lines on this rig (already scoped by the caller). */
  items: StockRow[];
  onRemove: (rigId: string) => Promise<void> | void;
  /** Fired after the rig is gone — the caller drops its scope selection. */
  onRemoved: () => void;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function RemoveRigButton({ rigId, rigName, items, onRemove, onRemoved }: RemoveRigButtonProps) {
  // The confirm is frozen on the rig it was opened for: if a peer removes the active rig while
  // the dialog is open, the props fall to the next rig, but this dialog must keep naming — and
  // acting on — the rig the user actually agreed to remove.
  const [target, setTarget] = useState<{ rigId: string; rigName: string; itemCount: number; units: number } | null>(
    null,
  );
  // `open` drives the dialog; `target` is deliberately NOT cleared on close — the Modal animates out
  // for ~190 ms and must keep rendering the rig it was showing (clearing it blanked the body to
  // "0 items (0 units) stocked on  ..." mid-fade). The next open overwrites it.
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stocked = items.length > 0;
  const hasDeployed = items.some((i) => i.held > 0);
  const units = items.reduce((sum, i) => sum + i.quantity, 0);

  function close() {
    setOpen(false);
    setError(null);
  }

  async function confirm() {
    // `target` outlives the dialog (close animation), so gate on `open`: a stray tap on the fading
    // destructive button must never remove the rig.
    if (!open || !target) return;
    setError(null);
    try {
      await onRemove(target.rigId);
    } catch (e) {
      setError(
        /deployed equipment/.test(e instanceof Error ? e.message : '')
          ? "Couldn't remove — equipment from this rig is still deployed."
          : `Couldn't remove ${target.rigName}. Try again.`,
      );
      return;
    }
    close();
    onRemoved();
  }

  return (
    <div className="fs-inv-remove">
      <Button
        variant="tertiary"
        destructive
        disabled={hasDeployed}
        disabledReason="Return deployed equipment first."
        onPress={() => {
          if (stocked) {
            setTarget({ rigId, rigName, itemCount: items.length, units });
            setOpen(true);
          } else {
            // Fire-and-forget is safe here: an empty rig holds nothing, so the L-8 guard cannot trip.
            void onRemove(rigId);
            onRemoved();
          }
        }}
      >
        Remove {rigName}
      </Button>
      <Modal
        open={open}
        onClose={close}
        title={`Remove ${target?.rigName ?? rigName}?`}
        variant="destructive"
        footer={
          <>
            <Button variant="secondary" onPress={close}>
              <span data-modal-cancel>Cancel</span>
            </Button>
            <Button variant="primary" destructive onPress={confirm}>
              Remove {target?.rigName ?? rigName}
            </Button>
          </>
        }
      >
        <p>
          {plural(target?.itemCount ?? 0, 'item', 'items')} ({plural(target?.units ?? 0, 'unit', 'units')}) stocked on{' '}
          {target?.rigName} will be removed from inventory. This cannot be undone.
        </p>
        {error && (
          <p role="alert" className="fs-modal-error">
            {error}
          </p>
        )}
      </Modal>
    </div>
  );
}
