import { useCallback, useState, type ReactNode } from 'react';
import type { ShorePoint } from '@core/schema';
import { divisionLabel } from '@core/operation';
import { cutLengthInches } from '@core/shorepoint';
import { Button, EmptyState, MeasurementValue } from '@ui/primitives';
import { useIsDesktop } from '@ui/primitives/useMediaQuery';
import { ShorePointCard, SHORE_TYPE_LABELS, CuttingControls } from './ShorePointCard';

/**
 * CuttingStation — the cut-the-strut-to-length workstation (21-cutting-station.md,
 * workflow #222). A FIFO queue of `cutting` shore points, cut length the one
 * promoted number, each card worked Mark Cut Done → Send to Runner. Presentational:
 * the board owns every commit and passes the queue (pre-sorted) + handlers in.
 *
 * Surface-adaptive (#354, ADR-032): **phone is the floor** — a single-column queue,
 * unchanged. **Tablet/desktop (≥768px, useIsDesktop)** is the real cut-table surface
 * (a propped tablet, both the cutter's hands on the saw + strut), so the screen
 * splits into a large hero "cut this now" card (the queue head) + a compact "up
 * next" list. The hero hosts the SAME ShorePointCard slide controls — nothing about
 * the commit changes, only the framing.
 *
 * Single station for v4.0 (OQ4). The multi-saw "named-saw" model (Saw A / Saw B,
 * one shared queue) is DESIGNED and written into 21-cutting-station.md but DEFERRED
 * — it needs real-time multi-device sync (#369). Tablet drag-reorder is likewise a
 * deferred enhancement: the grip handle renders, but there is no reorder mechanism
 * wired yet (see the ponytail TODO below).
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

/**
 * The hero / up-next subtitle — "Div 2 · A-side · 3-Post 1 / 3". Composes the same
 * location fields the card's identity line uses (building → division → area), then
 * the shore type, then the group position. Distinct from the card's own line, which
 * leans on the assigned resource; here the cutter wants WHERE + WHICH cut.
 */
function cutSubtitle(sp: ShorePoint): string {
  const loc = [
    ...(sp.building ? [sp.building] : []),
    divisionLabel(sp.division),
    ...(sp.area ? [sp.area] : []),
    `${SHORE_TYPE_LABELS[sp.shoreType]}${
      sp.groupIndex && sp.groupTotal ? ` ${sp.groupIndex} / ${sp.groupTotal}` : ''
    }`,
  ];
  return loc.join(' · ');
}

/** The drag-handle grip glyph (six dots). VISUAL ONLY in v4.0 — see the TODO. */
function GripIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="9" cy="6" r="1.6" />
      <circle cx="15" cy="6" r="1.6" />
      <circle cx="9" cy="12" r="1.6" />
      <circle cx="15" cy="12" r="1.6" />
      <circle cx="9" cy="18" r="1.6" />
      <circle cx="15" cy="18" r="1.6" />
    </svg>
  );
}

export function CuttingStation({
  queue,
  sent,
  onMarkCutDone,
  onClearCutDone,
  onSendToRunner,
  onStepBack,
}: CuttingStationProps) {
  const isDesktop = useIsDesktop();
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

  // The one interactive cut card — shared by both surfaces (phone column + tablet
  // hero). Same slides, same handlers; only the wrapper differs.
  const cutCard = (sp: ShorePoint) => (
    <ShorePointCard
      shorePoint={sp}
      cuttingStation
      onMarkCutDone={onMarkCutDone}
      onClearCutDone={onClearCutDone}
      onAdvance={onSendToRunner}
      onStepBack={handleStepBack}
    />
  );

  const removedCards = removed.map((sp) => (
    <div key={`removed-${sp.id}`} className="fs-cutstation-removed">
      <ShorePointCard shorePoint={sp} removed />
      <Button variant="secondary" onPress={() => dismiss(sp.id)}>
        Dismiss
      </Button>
    </div>
  ));

  // The read-only sent-to-runner tail (cuttingStation gates out the board's
  // interactive runner/secured controls, #223/#224). Shared by both surfaces.
  const sentTail = sent.length > 0 && (
    <div className="fs-cutstation-sent">
      <h2 className="fs-cutstation-subhead">Sent to runner</h2>
      <div role="list">
        {sent.map((sp) => (
          <div key={sp.id} role="listitem">
            <ShorePointCard shorePoint={sp} cuttingStation />
          </div>
        ))}
      </div>
    </div>
  );

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

          {isDesktop && queue.length > 0 ? (
            <TabletSplit
              queue={queue}
              sentTail={sentTail}
              removedCards={removedCards}
              onMarkCutDone={onMarkCutDone}
              onClearCutDone={onClearCutDone}
              onSendToRunner={onSendToRunner}
              onStepBack={handleStepBack}
            />
          ) : (
            <>
              <div className="fs-cutstation-queue" role="list">
                {queue.map((sp) => (
                  <div key={sp.id} role="listitem" data-sp-id={sp.id}>
                    {cutCard(sp)}
                  </div>
                ))}
                {removedCards}
              </div>
              {sentTail}
            </>
          )}
        </>
      )}
    </section>
  );
}

/**
 * The tablet / desktop two-column split: the queue head as a large hero "cut this
 * now" card on the left, the rest of the queue as a compact "up next" list on the
 * right (with the sent tail beneath it). Phone never reaches here.
 */
function TabletSplit({
  queue,
  sentTail,
  removedCards,
  onMarkCutDone,
  onClearCutDone,
  onSendToRunner,
  onStepBack,
}: {
  queue: ShorePoint[];
  sentTail: ReactNode;
  removedCards: ReactNode[];
  onMarkCutDone: (sp: ShorePoint) => void | Promise<void>;
  onClearCutDone: (sp: ShorePoint) => void | Promise<void>;
  onSendToRunner: (sp: ShorePoint) => void | Promise<void>;
  onStepBack: (sp: ShorePoint) => void;
}) {
  const [hero, ...rest] = queue;
  // Caller renders TabletSplit only for a non-empty queue, but noUncheckedIndexedAccess
  // still types `hero` as possibly-undefined — guard so the rest of the body is clean.
  if (!hero) return null;
  // The hero shelf is the wood CUT length (×8 lands on an exact eighth; round only
  // defends float noise — cutLengthInches already floors to ⅛″, no double-floor).
  const heroEighths = Math.round(cutLengthInches(hero) * 8);

  return (
    <div className="fs-cutstation-split">
      {/* Left — the hero "cut this now" card. The big number + subtitle ARE the
          hero; the cutter's slides sit beneath via <CuttingControls> — the SAME
          slide pair the card uses, WITHOUT re-embedding the card (that doubled the
          cut length + location — regression caught 2026-06-22). */}
      <div className="fs-cutstation-hero" data-sp-id={hero.id}>
        <span className="fs-cutstation-hero-badge">Cut this now</span>
        <p className="fs-cutstation-hero-label">Cut length</p>
        <p className="fs-cutstation-hero-num">
          <MeasurementValue eighths={heroEighths} />
        </p>
        <p className="fs-cutstation-hero-where">{cutSubtitle(hero)}</p>
        <div className="fs-cutstation-hero-slide">
          <CuttingControls
            sp={hero}
            onMarkCutDone={onMarkCutDone}
            onClearCutDone={onClearCutDone}
            onSendToRunner={onSendToRunner}
            onStepBack={onStepBack}
          />
        </div>
      </div>

      {/* Right — "up next" + the read-only sent tail, scrollable. */}
      <div className="fs-cutstation-upnext">
        <p className="fs-cutstation-upnext-head">The queue · up next</p>
        <div role="list">
          {rest.length === 0 && (
            <p className="fs-cutstation-row-where" style={{ padding: 'var(--space-2)' }}>
              Nothing waiting — this is the last cut.
            </p>
          )}
          {rest.map((sp) => (
            <div key={sp.id} role="listitem" data-sp-id={sp.id} className="fs-cutstation-row">
              {/* ponytail: visual-only drag handle. There is no reorder mechanism
                  in the store yet (priority-override + cut routing is OQ4 / Phase G);
                  wire drag-to-reorder here once one exists. The handle ships now so
                  the affordance is in place and the tablet layout reads as designed. */}
              <span className="fs-cutstation-grip" aria-hidden="true">
                <GripIcon />
              </span>
              <span className="fs-cutstation-row-body">
                <span className="fs-cutstation-row-num">
                  <MeasurementValue eighths={Math.round(cutLengthInches(sp) * 8)} />
                </span>
                <span className="fs-cutstation-row-where">{cutSubtitle(sp)}</span>
              </span>
            </div>
          ))}
        </div>
        {removedCards}
        {sentTail}
      </div>
    </div>
  );
}
