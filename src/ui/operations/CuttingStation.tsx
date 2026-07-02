import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { ShorePoint } from '@core/schema';
import { divisionLabel, sideLabel, assignSaws, rosterOf } from '@core/operation';
import { cutLengthInches } from '@core/shorepoint';
import { Button, EmptyState, MeasurementValue } from '@ui/primitives';
import { useIsDesktop } from '@ui/primitives/useMediaQuery';
import { ShorePointCard, SHORE_TYPE_LABELS, CuttingControls } from './ShorePointCard';

/**
 * CuttingStation — the cut-the-strut-to-length workstation (21-cutting-station.md,
 * workflow #222 / #354). A FIFO queue of `cutting` shore points, cut length the one
 * promoted number, each card worked Mark Cut Done → Send to Runner. Presentational:
 * the board owns every commit and passes the queue (pre-sorted) + handlers in.
 *
 * ONE hero+list layout on BOTH surfaces (#354): a big "cut this now" hero (the cut a
 * saw is on) + a compact, read-only "up next" list. Phone stacks it to one column,
 * tablet/desktop (≥768px, useIsDesktop) lays the hero(es) and list side by side.
 * HERO-ONLY INTERACTIVE — only a hero hosts the slide controls (<CuttingControls>);
 * the up-next rows are read-only (grip + cut length + subtitle). The hero NEVER
 * embeds a whole <ShorePointCard> (that doubled the cut length + location — a
 * regression caught 2026-06-22); it hosts only <CuttingControls>.
 *
 * MULTI-SAW (#354, single-device): when more than one saw runs, each saw pulls the
 * top UNCLAIMED cut off the one shared queue and KEEPS it until that cut is sent to
 * Runner (the claim is persisted per point — assignSaws / core/operation/saw). On
 * tablet, every saw's current cut is a hero (a row of per-saw heroes) over the
 * shared up-next list. On phone, ONE saw's hero shows (the selected saw) and the
 * up-next list marks cuts claimed by OTHER saws as "on Saw B" (muted). N=1 is the
 * overwhelmingly common case and renders EXACTLY like the approved single-saw
 * hero+list — the saw chrome (chips, badges, "on Saw B") appears only with a 2nd saw.
 * Cross-tablet live mirroring of claims is the sync build (#369), out of scope.
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
  /** The op's saw roster (#354). Absent/empty → one default saw 'A' (legacy safety). */
  saws?: string[];
  /** Add a saw to the roster (auto-named A/B/C…). Absent → the + Add saw control hides. */
  onAddSaw?: () => void | Promise<void>;
  /** Persist a saw's claim of a cut (CuttingClaimed). The station auto-claims the top
   *  unclaimed cut for each free saw; absent → no claiming (read-only demo). */
  onClaim?: (sp: ShorePoint, sawId: string) => void | Promise<void>;
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
    ...(sp.side ? [sideLabel(sp.side)] : []),
    ...(sp.area ? [sp.area] : []),
    `${SHORE_TYPE_LABELS[sp.shoreType]}${
      sp.groupIndex && sp.groupTotal ? ` ${sp.groupIndex} / ${sp.groupTotal}` : ''
    }`,
  ];
  return loc.join(' · ');
}

/** Cut length in eighths — × 8 lands on an exact eighth (cutLengthInches already
 *  floors to ⅛″); round only defends float noise. No double-floor. */
function cutEighths(sp: ShorePoint): number {
  return Math.round(cutLengthInches(sp) * 8);
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
  saws,
  onAddSaw,
  onClaim,
}: CuttingStationProps) {
  const isDesktop = useIsDesktop();
  const roster = rosterOf(saws);
  const multiSaw = roster.length > 1;
  // Resolve the saw roster against the FIFO queue: each saw's current cut (hero) +
  // the shared unclaimed list. Honors persisted claims first, then hands each free
  // saw the next top-unclaimed cut (assignSaws is pure + tested).
  const { heroBySaw, unclaimed, pendingClaims } = assignSaws(queue, roster);

  // Auto-claim: persist any fresh claim assignSaws computed (a free saw took the next
  // unclaimed cut). The reducer stamps sawId; the next render re-derives stably so a
  // finish never reshuffles. Keyed on the claim pairs so it fires once per change.
  const claimKey = Object.entries(pendingClaims)
    .map(([s, sp]) => `${s}:${sp.id}`)
    .join('|');
  useEffect(() => {
    if (!onClaim) return;
    for (const [sawId, sp] of Object.entries(pendingClaims)) void onClaim(sp, sawId);
    // pendingClaims is re-derived each render; claimKey captures its identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimKey, onClaim]);

  // Phone: which saw this view acts as. Default the first saw; clamp if it leaves
  // the roster. (Single-device for v4.0 — this is a per-view selection, not synced.)
  const [viewSaw, setViewSaw] = useState(roster[0] ?? 'A');
  const activeSaw = roster.includes(viewSaw) ? viewSaw : (roster[0] ?? 'A');

  // A card stepped back OUT of cutting leaves the queue, but Principle 10 forbids
  // a silent vanish: hold a brief red-slash snapshot the cutter sees (and dismisses).
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

  // ---- shared building blocks (hero, up-next row) ----------------------------

  /** A "cut this now" hero — the big cut-length number + subtitle + the SAME
   *  <CuttingControls> the card uses (never the whole card — that doubles the
   *  measurement). Badged with the saw name only when more than one saw runs. */
  const hero = (sp: ShorePoint, sawId: string | null) => (
    <div className="fs-cutstation-hero" data-sp-id={sp.id} data-saw={sawId ?? undefined}>
      <span className="fs-cutstation-hero-badge">
        {sawId && multiSaw ? `Saw ${sawId} · cut this now` : 'Cut this now'}
      </span>
      <p className="fs-cutstation-hero-label">Cut length</p>
      <p className="fs-cutstation-hero-num">
        <MeasurementValue eighths={cutEighths(sp)} />
      </p>
      <p className="fs-cutstation-hero-where">{cutSubtitle(sp)}</p>
      {sp.cuttingDone && <p className="fs-cutstation-hero-cutdone">✓ Cut done</p>}
      <div className="fs-cutstation-hero-slide">
        <CuttingControls
          sp={sp}
          onMarkCutDone={onMarkCutDone}
          onClearCutDone={onClearCutDone}
          onSendToRunner={onSendToRunner}
          onStepBack={handleStepBack}
        />
      </div>
    </div>
  );

  /** An idle-saw hero placeholder — the saw is free but the queue has no unclaimed
   *  cut left for it. Keeps the per-saw column present so the roster reads true. */
  const idleHero = (sawId: string) => (
    <div className="fs-cutstation-hero is-idle" data-saw={sawId}>
      <span className="fs-cutstation-hero-badge">{multiSaw ? `Saw ${sawId}` : 'Saw'}</span>
      <p className="fs-cutstation-hero-where">No cut claimed — this saw is free.</p>
    </div>
  );

  /** A read-only up-next row. `onSawId` (another saw owns it) mutes it + names the
   *  saw; otherwise it reads "up next". */
  const upNextRow = (sp: ShorePoint, onSawId?: string | null) => (
    <div
      key={sp.id}
      role="listitem"
      data-sp-id={sp.id}
      className={`fs-cutstation-row${onSawId ? ' is-on-other-saw' : ''}`}
    >
      <span className="fs-cutstation-grip" aria-hidden="true">
        <GripIcon />
      </span>
      <span className="fs-cutstation-row-body">
        <span className="fs-cutstation-row-num">
          <MeasurementValue eighths={cutEighths(sp)} />
        </span>
        <span className="fs-cutstation-row-where">
          {cutSubtitle(sp)}
          {onSawId ? <span className="fs-cutstation-row-onsaw"> · on Saw {onSawId}</span> : null}
        </span>
      </span>
    </div>
  );

  // ---- the saw-roster header control (only when relevant) --------------------
  const sawRoster = (multiSaw || onAddSaw) && (
    <div className="fs-cutstation-saws" role="group" aria-label="Saw roster">
      {multiSaw &&
        roster.map((sawId) => {
          // On phone, the chips SELECT which saw this view acts as; on tablet every
          // saw has its own hero, so the chips are just the roster (non-selecting).
          const selectable = !isDesktop;
          const selected = selectable && sawId === activeSaw;
          return selectable ? (
            <button
              key={sawId}
              type="button"
              className={`fs-cutstation-saw-chip${selected ? ' is-selected' : ''}`}
              aria-pressed={selected}
              onClick={() => setViewSaw(sawId)}
            >
              Saw {sawId}
            </button>
          ) : (
            <span key={sawId} className="fs-cutstation-saw-chip is-static">
              Saw {sawId}
            </span>
          );
        })}
      {onAddSaw && (
        <button
          type="button"
          className="fs-cutstation-saw-add"
          onClick={() => void onAddSaw()}
          aria-label="Add a saw"
        >
          + Add saw
        </button>
      )}
    </div>
  );

  // ---- per-surface body ------------------------------------------------------

  // The hero(es) for the current surface + saw count.
  let heroes: ReactNode;
  // The up-next list as an array of rows — unclaimed cuts, plus (phone, multi-saw)
  // the other saws' active cuts shown muted so this saw's cutter sees they're handled.
  let upNextRows: ReactNode[];

  if (isDesktop && multiSaw) {
    // Tablet/desktop, >1 saw: one hero per saw (idle placeholder if free), then the
    // shared up-next = unclaimed only.
    heroes = (
      <div className="fs-cutstation-heroes">
        {roster.map((sawId) => {
          const sp = heroBySaw[sawId];
          return <div key={sawId}>{sp ? hero(sp, sawId) : idleHero(sawId)}</div>;
        })}
      </div>
    );
    upNextRows = unclaimed.map((sp) => upNextRow(sp));
  } else if (isDesktop) {
    // Tablet/desktop, exactly 1 saw: the existing single hero + up-next, unchanged.
    const sp = heroBySaw[activeSaw] ?? queue[0]!;
    heroes = hero(sp, null);
    upNextRows = unclaimed.map((s) => upNextRow(s));
  } else {
    // Phone, any saw count: one saw's hero (the selected saw) + the up-next list.
    // With >1 saw, the OTHER saws' active cuts also appear, muted "on Saw B".
    const sp = heroBySaw[activeSaw] ?? null;
    heroes = sp ? hero(sp, activeSaw) : idleHero(activeSaw);
    const otherSawCuts = multiSaw
      ? roster
          .filter((s) => s !== activeSaw)
          .map((s) => ({ sp: heroBySaw[s], sawId: s }))
          .filter((x): x is { sp: ShorePoint; sawId: string } => x.sp != null)
      : [];
    upNextRows = [
      ...otherSawCuts.map(({ sp: osp, sawId }) => upNextRow(osp, sawId)),
      ...unclaimed.map((s) => upNextRow(s)),
    ];
  }

  return (
    <section className="fs-cutstation" aria-label="Cutting Station">
      <div className="fs-cutstation-head">
        <h1 className="fs-cutstation-title">✂ Cutting Station</h1>
        {sawRoster}
      </div>

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

          {queue.length > 0 ? (
            <div className="fs-cutstation-split">
              <div className="fs-cutstation-heroside">{heroes}</div>
              <div className="fs-cutstation-upnext">
                <p className="fs-cutstation-upnext-head">The queue · up next</p>
                <div role="list">
                  {/* An empty up-next reads honestly — nothing left to work. With one
                      saw it's "the last cut"; with more, the rest are all claimed. */}
                  {upNextRows.length === 0 ? (
                    <p className="fs-cutstation-row-where" style={{ padding: 'var(--space-2)' }}>
                      {multiSaw
                        ? 'Nothing waiting — every cut is claimed.'
                        : 'Nothing waiting — this is the last cut.'}
                    </p>
                  ) : (
                    upNextRows
                  )}
                </div>
                {removedCards}
                {sentTail}
              </div>
            </div>
          ) : (
            <>
              {removedCards}
              {sentTail}
            </>
          )}
        </>
      )}
    </section>
  );
}
