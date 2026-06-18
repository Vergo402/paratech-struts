import { useCallback, useState } from 'react';
import type { ShorePoint } from '@core/schema';
import { Button, EmptyState } from '@ui/primitives';
import { ShorePointCard } from './ShorePointCard';

/**
 * CuttingStation — the cut-the-strut-to-length workstation (21-cutting-station.md,
 * workflow #222). A FIFO queue of `cutting` shore points, cut length the one
 * promoted number, each card worked Mark Cut Done → Send to Runner. Presentational:
 * the board owns every commit and passes the queue (pre-sorted) + handlers in.
 *
 * Single station for v4.0 (OQ4); tablet drag-reorder + the optional actual-cut
 * input are deferred enhancements (noted in the docket). Phone-functional first.
 */
export interface CuttingStationProps {
  /** Active cuts — status === 'cutting', already FIFO-sorted by cuttingStartedAt. */
  queue: ShorePoint[];
  /** Read-only tail — points sent onward (runner / secured) that came through here. */
  sent: ShorePoint[];
  onMarkCutDone: (sp: ShorePoint) => void | Promise<void>;
  onClearCutDone: (sp: ShorePoint) => void | Promise<void>;
  onSendToRunner: (sp: ShorePoint) => void | Promise<void>;
  onStepBack: (sp: ShorePoint) => void | Promise<void>;
}

export function CuttingStation({
  queue,
  sent,
  onMarkCutDone,
  onClearCutDone,
  onSendToRunner,
  onStepBack,
}: CuttingStationProps) {
  // A card stepped back OUT of cutting leaves the queue, but Principle 10 forbids
  // a silent vanish: hold a brief red-slash snapshot the cutter sees (and dismisses).
  // The card's real status already changed on the board — this is signal, not state.
  const [removed, setRemoved] = useState<ShorePoint[]>([]);

  const handleStepBack = useCallback(
    (sp: ShorePoint) => {
      setRemoved((r) => (r.some((s) => s.id === sp.id) ? r : [...r, sp]));
      void onStepBack(sp);
    },
    [onStepBack],
  );
  const dismiss = useCallback((id: string) => setRemoved((r) => r.filter((s) => s.id !== id)), []);

  const empty = queue.length === 0 && sent.length === 0 && removed.length === 0;

  return (
    <section className="fs-cutstation" aria-label="Cutting Station">
      <h1 className="fs-cutstation-title">✂ Cutting Station</h1>

      {empty ? (
        <EmptyState
          variant="first-run"
          headline="No cuts in queue"
          reason="Move a shore point to Cutting Station on the Operations board to queue it"
        />
      ) : (
        <>
          <p className="fs-cutstation-count" role="status">
            {queue.length} {queue.length === 1 ? 'cut' : 'cuts'} in queue
          </p>

          <div className="fs-cutstation-queue" role="list">
            {queue.map((sp) => (
              <div key={sp.id} role="listitem" data-sp-id={sp.id}>
                <ShorePointCard
                  shorePoint={sp}
                  cuttingStation
                  onMarkCutDone={onMarkCutDone}
                  onClearCutDone={onClearCutDone}
                  onAdvance={onSendToRunner}
                  onStepBack={handleStepBack}
                />
              </div>
            ))}

            {removed.map((sp) => (
              <div key={`removed-${sp.id}`} className="fs-cutstation-removed">
                <ShorePointCard shorePoint={sp} removed />
                <Button variant="secondary" onPress={() => dismiss(sp.id)}>
                  Dismiss
                </Button>
              </div>
            ))}
          </div>

          {sent.length > 0 && (
            <div className="fs-cutstation-sent">
              <h2 className="fs-cutstation-subhead">Sent to runner</h2>
              <div role="list">
                {sent.map((sp) => (
                  <div key={sp.id} role="listitem">
                    {/* cuttingStation keeps this tail READ-ONLY: it gates out the
                        board's interactive runner/secured controls (#223/#224). */}
                    <ShorePointCard shorePoint={sp} cuttingStation />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
