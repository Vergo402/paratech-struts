import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { ShorePoint } from '@core/schema';
import { divisionLabel, sideLabel, assignSaws, rosterOf } from '@core/operation';
import { cutLengthInches } from '@core/shorepoint';
import { Button, EmptyState, MeasurementValue } from '@ui/primitives';
import { useIsDesktop } from '@ui/primitives/useMediaQuery';
import { usePeerCuts } from '@ui/hooks';
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
  // Cuts that arrived from another device since this cutter last left the station
  // (#404) — the "someone sent you work" badge. Clears on unmount (usePeerCuts).
  const newPeerCuts = usePeerCuts();
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

  // Phone + multi-saw = the #390 two-screen flow (Idea 390, supersedes the #375
  // chips): null = the pick-your-station screen; a saw id = the view locked to
  // that saw. Single-saw phone and desktop never see the select screen. Clamped
  // if the chosen saw leaves the roster. (Single-device for v4.0 — a per-view
  // selection, not synced.)
  const [viewSaw, setViewSaw] = useState<string | null>(null);
  const activeSaw = viewSaw && roster.includes(viewSaw) ? viewSaw : (roster[0] ?? 'A');
  const phoneScoped = multiSaw && !isDesktop;

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
      <p className="fs-cutstation-hero-num">
        <MeasurementValue eighths={cutEighths(sp)} />
      </p>
      <p className="fs-cutstation-hero-label">Cut length</p>
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

  /** A read-only up-next row — an unclaimed cut in the shared queue. (Other saws'
   *  claimed cuts are never rows: #390 reduces each to one muted sentence.) */
  const upNextRow = (sp: ShorePoint) => (
    <div key={sp.id} role="listitem" data-sp-id={sp.id} className="fs-cutstation-row">
      <span className="fs-cutstation-grip" aria-hidden="true">
        <GripIcon />
      </span>
      <span className="fs-cutstation-row-body">
        <span className="fs-cutstation-row-num">
          <MeasurementValue eighths={cutEighths(sp)} />
        </span>
        <span className="fs-cutstation-row-where">{cutSubtitle(sp)}</span>
      </span>
    </div>
  );

  // ---- the saw-roster header control ------------------------------------------
  // Desktop: static roster chips + add. Phone: chips are superseded by the #390
  // select screen — only single-saw phone keeps "+ Add saw" here (that's how the
  // 2nd saw is born); multi-saw phone manages stations on the select screen.
  const sawRoster = ((isDesktop && (multiSaw || onAddSaw)) || (!isDesktop && !multiSaw && onAddSaw)) && (
    <div className="fs-cutstation-saws" role="group" aria-label="Saw roster">
      {isDesktop &&
        multiSaw &&
        roster.map((sawId) => (
          <span key={sawId} className="fs-cutstation-saw-chip is-static">
            Saw {sawId}
          </span>
        ))}
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

  // The "N new" peer-cut badge (#404) — shared by every header variant below.
  const peerBadge = newPeerCuts > 0 && (
    <span
      className="fs-cutstation-newbadge"
      role="status"
      aria-label={`${newPeerCuts} new ${newPeerCuts === 1 ? 'cut' : 'cuts'} sent from another device`}
    >
      {newPeerCuts} new
    </span>
  );

  // ---- per-surface body ------------------------------------------------------

  // The hero(es) for the current surface + saw count.
  let heroes: ReactNode;
  // The up-next list as an array of rows — the shared unclaimed cuts. On the
  // phone scoped view (#390), other saws' active cuts are NOT rows — each is one
  // muted sentence below the list, so they can't be grabbed by mistake.
  let upNextRows: ReactNode[];
  let otherSawLines: ReactNode = null;

  if (queue.length === 0) {
    // Nothing to cut — the split (heroes + up-next) never renders, but heroes was
    // computed EAGERLY below and the single-saw desktop branch dereferenced
    // queue[0] on an empty queue (crash surfaced by the #389 empty-state work).
    heroes = null;
    upNextRows = [];
  } else if (isDesktop && multiSaw) {
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
    // Phone (#390): the view is locked to ONE saw — its hero (or a calm per-saw
    // all-clear) + the shared pending list. Other saws' active cuts are each one
    // muted sentence, never selectable rows.
    const sp = heroBySaw[activeSaw] ?? null;
    heroes = sp ? (
      hero(sp, activeSaw)
    ) : phoneScoped ? (
      <EmptyState
        variant="all-clear"
        headline={`Saw ${activeSaw} is clear`}
        reason="Nothing claimed and nothing waiting — stand by for the next shore point"
      />
    ) : (
      idleHero(activeSaw)
    );
    upNextRows = unclaimed.map((s) => upNextRow(s));
    if (phoneScoped) {
      const otherBusy = roster
        .filter((s) => s !== activeSaw)
        .map((s) => ({ sawId: s, sp: heroBySaw[s] }))
        .filter((x): x is { sawId: string; sp: ShorePoint } => x.sp != null);
      otherSawLines = otherBusy.length > 0 && (
        <p className="fs-cutstation-mutedline">
          {otherBusy.map(({ sawId, sp: osp }) => (
            <span key={sawId}>
              Saw {sawId} is on its own cut{osp.seq ? ` (SP-${osp.seq})` : ''} — not in your queue.
            </span>
          ))}
        </p>
      );
    }
  }

  // #390 screen 1 — pick your station (phone, multi-saw, work present). Each card
  // names the saw, its current cut, and the shared backlog; picking locks the view.
  if (phoneScoped && viewSaw === null && queue.length > 0) {
    return (
      <section className="fs-cutstation" aria-label="Cutting Station">
        <div className="fs-cutstation-head">
          <div className="fs-cutstation-titlerow">
            <h1 className="fs-cutstation-title">✂ Cutting Station</h1>
            {peerBadge}
          </div>
        </div>
        <p className="fs-cutstation-select-intro">
          You’re assigned to a saw. Pick it — you’ll see only your cut and the shared pending
          list.
        </p>
        <div className="fs-cutstation-select">
          {roster.map((sawId) => {
            const sp = heroBySaw[sawId] ?? null;
            return (
              <button
                key={sawId}
                type="button"
                className="fs-cutstation-stationcard"
                onClick={() => setViewSaw(sawId)}
              >
                <span className="fs-cutstation-station-letter">Saw {sawId}</span>
                {sp ? (
                  <span className="fs-cutstation-station-now">
                    Cutting <MeasurementValue eighths={cutEighths(sp)} />
                    {sp.seq ? ` · SP-${sp.seq}` : ''}
                  </span>
                ) : (
                  <span className="fs-cutstation-station-now is-idle">Idle — no cut claimed</span>
                )}
                <span className="fs-cutstation-station-sub">
                  {unclaimed.length} waiting in the shared queue
                </span>
              </button>
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
      </section>
    );
  }

  return (
    <section className="fs-cutstation" aria-label="Cutting Station">
      <div className="fs-cutstation-head">
        <div className="fs-cutstation-titlerow">
          {phoneScoped && queue.length > 0 ? (
            // #390 screen 2 — locked to one saw: back to the station list + which
            // saw you are, always in the header.
            <>
              <button
                type="button"
                className="fs-cutstation-back"
                onClick={() => setViewSaw(null)}
              >
                ‹ Stations
              </button>
              <h1 className="fs-cutstation-title">Saw {activeSaw}</h1>
            </>
          ) : (
            <h1 className="fs-cutstation-title">✂ Cutting Station</h1>
          )}
          {peerBadge}
        </div>
        {sawRoster}
      </div>

      {empty ? (
        // #389: the queue fills from ANOTHER screen, so an idle station is
        // upstream-blocked, not first-run (Idea 389 exploration, variant A).
        <EmptyState
          variant="upstream-blocked"
          headline="No cuts queued"
          reason="Cuts arrive when a shore point is moved to Cutting Station on the Operations board"
        />
      ) : queue.length === 0 && sent.length > 0 ? (
        // #389 variant C: work existed and ALL of it went to the runner — a calm
        // all-clear (never shown to a station that had no work; that reads as A).
        <>
          <EmptyState
            variant="all-clear"
            headline="All cuts done"
            reason="Every queued cut has been sent to the runner"
          />
          {removedCards}
          {sentTail}
        </>
      ) : (
        <>
          <p className="fs-cutstation-count" role="status">
            {queue.length} {queue.length === 1 ? 'cut' : 'cuts'} in queue
          </p>

          {queue.length > 0 ? (
            <div className="fs-cutstation-split">
              <div className="fs-cutstation-heroside">{heroes}</div>
              <div className="fs-cutstation-upnext">
                <p className="fs-cutstation-upnext-head">
                  {phoneScoped ? 'Pending · shared queue' : 'The queue · up next'}
                </p>
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
                {otherSawLines}
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
