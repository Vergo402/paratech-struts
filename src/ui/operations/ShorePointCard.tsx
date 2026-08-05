import { useMemo, useState } from 'react';
import type { ShorePoint } from '@core/schema';
import { strutSysKey } from '@core/load';
import {
  bomModelLabel,
  cutTooSmall,
  deployedStrutOf,
  pendingNeedModels,
} from '@core/shorepoint';
import { Badge, Button, Card, MeasurementValue, Slider } from '@ui/primitives';
import { SHORE_TYPE_LABELS, cardLocation, cardLabelType, cardValueEighths, isCutPhase } from './cardParts';
import { CapacityFlag, type CapacityFlagValue } from './CapacityFlag';

// Short display labels live in cardParts (shared by all three views); re-exported
// here for the existing callers that import them from ShorePointCard.
export { SHORE_TYPE_LABELS };

/** The Quick View drawer title for a shore point — "#7 · B-2 · 3-Post" (the #N and
 *  label are optional). One source of truth for the OperationsBoard + archive drawers. */
export function shorePointDrawerTitle(sp: Pick<ShorePoint, 'seq' | 'label' | 'shoreType'>): string {
  return `${sp.seq != null ? `#${sp.seq} · ` : ''}${sp.label ? `${sp.label} · ` : ''}${SHORE_TYPE_LABELS[sp.shoreType]}`;
}

// Descriptions carry the consequence / next step ONLY — the title above the
// callout states the condition once (#432, mess-map #15: no title echo).
const PENDING_REASON_COPY = {
  'no-match': 'Nothing fits this opening at this load',
  'no-inventory': 'No apparatus stock to pull from',
  'over-capacity': 'Estimated load exceeds the 4-strut limit — escalate to engineering',
} as const;

// Waiting-callout headline per reason (handoff §1.1). The description below it
// stays the verbatim PENDING_REASON_COPY string — the title is the new framing.
const PENDING_REASON_TITLE: Record<keyof typeof PENDING_REASON_COPY, string> = {
  'no-inventory': 'Waiting for inventory',
  'no-match': 'No matching strut',
  'over-capacity': 'Over capacity',
};

// Name the strut(s) a no-inventory point is waiting on — answers "what equipment?"
// (Alex). Up to two models joined by "or"; a longer list collapses to "+N more".
function needLine(models: string[]): string {
  if (models.length === 0) return PENDING_REASON_COPY['no-inventory'];
  if (models.length <= 2) return `Needs ${models.join(' or ')} — none on scene`;
  return `Needs ${models[0]} or ${models[1]} (+${models.length - 2} more) — none on scene`;
}

/**
 * Status-hook classes for a point — appends the WAITING presentation when a
 * pending point carries a reason (S12 design audit: waiting cards read amber —
 * badge, stripe, shelf, callout, dots — but waiting is a presentation of
 * pending, never a lifecycle status; lanes and lockstep see only `pending`).
 * Shared by the card, the rolodex tabs, and the pager dots.
 */
export function statusClasses(sp: Pick<ShorePoint, 'status' | 'pendingReason'>): string {
  return `is-${sp.status}${sp.status === 'pending' && sp.pendingReason ? ' is-waiting' : ''}`;
}

// The clamp/strut glyph in the waiting callout (handoff JSX 212–215).
function WaitIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 22h14M5 2h14M17 22v-4.17a2 2 0 0 0-.59-1.42L12 12l-4.41 4.41A2 2 0 0 0 7 17.83V22M7 2v4.17a2 2 0 0 0 .59 1.42L12 12l4.41-4.41A2 2 0 0 0 17 6.17V2" />
    </svg>
  );
}

// #441 — the shore point's radio-callout location row. Three states: words chip
// (copyable ///what.three.words), coords-only chip (fix saved, conversion pending —
// still copyable, still radio-usable), or the quiet Capture-location action when
// no fix exists yet. Never blocks anything; absent handler = no button (archive).
export function W3wChip({
  sp,
  onCapture,
}: {
  sp: Pick<ShorePoint, 'w3w' | 'coords'>;
  onCapture?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const text = sp.w3w
    ? `///${sp.w3w}`
    : sp.coords
      ? `${sp.coords.lat.toFixed(5)}, ${sp.coords.lng.toFixed(5)}`
      : null;

  if (text) {
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        /* clipboard unavailable (http / permissions) — the words stay readable */
      }
    };
    return (
      <button type="button" className="fs-spc-w3w" onClick={copy} aria-label={`Copy location ${text}`}>
        {sp.w3w ? (
          <>
            <span className="fs-spc-w3w-slashes" aria-hidden="true">
              {'///'}
            </span>
            <span className="fs-spc-w3w-words">{sp.w3w}</span>
          </>
        ) : (
          <span className="fs-spc-w3w-words">{text}</span>
        )}
        <span className="fs-spc-w3w-copy">{copied ? 'Copied' : 'Copy'}</span>
      </button>
    );
  }

  if (!onCapture) return null;
  return (
    <button type="button" className="fs-spc-w3w fs-spc-w3w--capture" onClick={onCapture}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11Z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
      Capture location
    </button>
  );
}

/**
 * ShorePointCard — the lifecycle card (card.md). Presentational: the board
 * owns every modal and commit. Pending Equipment shipped with #220; Equipment Assigned and the
 * Strut Set step-back ship with the deploy workflow (S6, #221): the advance
 * slide commits the next status, the step-back slide mirrors it (ADR-010
 * always-reversible — the board decides whether a step-back needs the
 * inventory-consequential confirm modal). Cutting onward is workflow #222.
 *
 * Deliberately NOT `Card onPress` — the card hosts its own buttons (stripe,
 * expand, actions) and onPress would render the card itself as a <button>
 * (nested-interactive). The stripe is the card.md 4pt status bar with the
 * 16pt full-height tap zone: a real button on pending (one-handed reach for
 * the primary action), decorative once the primary action is the slide.
 */
export interface ShorePointCardProps {
  shorePoint: ShorePoint;
  /** Pending only — opens the pre-populated Edit modal (#220 3-R). */
  onEdit?: (sp: ShorePoint) => void;
  /** Pending only — opens the destructive Delete confirm. */
  onDelete?: (sp: ShorePoint) => void;
  /** Deployed only — opens the read-only Quick View detail (ADR-019 drawer). Does
   *  no mutation, so it renders under readOnly (archive) too. Absent on cards that
   *  don't host the drawer (e.g. the Cutting Station). */
  onOpenDetail?: (sp: ShorePoint) => void;
  /** Pending primary action — opens the Assign Equipment sheet (#221). */
  onAssignEquipment?: (sp: ShorePoint) => void;
  /** Advance to the next lifecycle status — Strut Set (from process), Cutting (from
   *  strutset, group-wide), Runner (Send to Runner, from a cut-done cutting card). */
  onAdvance?: (sp: ShorePoint) => void | Promise<void>;
  /** Step back one status — the board routes: process → confirm modal, others → direct. */
  onStepBack?: (sp: ShorePoint) => void | Promise<void>;
  /** Cutting Station only — render the cutter's controls (Mark Cut Done → Send to
   *  Runner) instead of leaving the `cutting` card read-only on the board (#222). */
  cuttingStation?: boolean;
  /** Cutting Station only — commits the Mark Cut Done flag (cuttingDone:true). */
  onMarkCutDone?: (sp: ShorePoint) => void | Promise<void>;
  /** Cutting Station only — clears the Mark Cut Done flag (step-back from cut-done). */
  onClearCutDone?: (sp: ShorePoint) => void | Promise<void>;
  /** Wood Shore Secured only — opens the Remove & Return confirm modal (#224). The only
   *  forward path from secured; inventory-consequential and terminal. */
  onRemoveReturn?: (sp: ShorePoint) => void;
  /** Set while a grouped point's mates are still Pending (workflow #221 OQ2 — group advances together). */
  advanceDisabledReason?: string;
  /** #441 — the quiet "Capture location" action for a point with no GPS fix yet.
   *  The board fans the capture to the whole group; absent (archive, Cutting
   *  Station) → no button, the chip still renders when words/coords exist. */
  onCaptureLocation?: (sp: ShorePoint) => void;
  /**
   * The over-capacity / unrated flag, computed by the board where the full group is
   * known (deployedCapacityFlag + deployedStrutCount, H1/#415), so the card, List row,
   * Division tile, Cutting Station and archive all show the SAME flag (H2/#416).
   * Omit → NO flag. There is deliberately no local fallback: computing one here can
   * only divide by the planned groupTotal, which is the #415 false-SAFE (SME-1).
   */
  capacityFlag?: CapacityFlagValue;
  /**
   * Presentational only — no slice schema state yet. The gallery and the future
   * cut-list workflow (#222) drive these; struck through with a corner-to-corner
   * slash + "Removed from cut list" chip; slides + the pending action area drop.
   */
  removed?: boolean;
  /**
   * Presentational only — no slice schema state yet. Surfaces a "⚠ Hazard" pill
   * after the status badge (the gallery + future hazard-log workflow set it).
   */
  hazard?: boolean;
  /** Focus/selected styling — accent border, no scale change (design-system
   *  ShorePointCard `active`; States doctrine in the styleguide README). */
  active?: boolean;
  /** Small explanatory caption under the controls (design-system `caption`). */
  caption?: string;
  /**
   * Frozen archive view (#238) — suppress EVERY interactive affordance (the stripe
   * button, the expand head, all slides, the Cutting-Station controls, the secured
   * Remove&Return button), keeping only presentational content. A re-opened or
   * active op is driven from the board; the read-only drill-in renders the same
   * card statically.
   */
  readOnly?: boolean;
}

export function ShorePointCard({
  shorePoint: sp,
  onEdit,
  onDelete,
  onOpenDetail,
  onAssignEquipment,
  onAdvance,
  onStepBack,
  cuttingStation = false,
  onMarkCutDone,
  onClearCutDone,
  onRemoveReturn,
  advanceDisabledReason,
  onCaptureLocation,
  capacityFlag: capacityFlagProp,
  removed = false,
  hazard = false,
  active = false,
  caption,
  readOnly = false,
}: ShorePointCardProps) {
  const [expanded, setExpanded] = useState(false);
  // readOnly (#238 archive) collapses to the presentational case everywhere an
  // interactive region branches on `pending` / status — one gate, no per-region edits.
  const interactive = !readOnly;
  const pending = sp.status === 'pending';
  const waiting = pending && !!sp.pendingReason;
  // A no-inventory wait names the strut(s) that fit (catalog-only — no inventory
  // dep, deterministic on the opening). Memoized so it runs only for waiting cards.
  const needModels = useMemo(
    () => (sp.pendingReason === 'no-inventory' ? pendingNeedModels(sp) : []),
    [sp],
  );
  // The strut member of the deployed BOM (ADR-033). Phase 3 enriches this card to
  // render the full bill (plates + extensions + per-component source); for now the
  // header/model lines read the strut exactly as before.
  const deployedStrut = deployedStrutOf(sp);

  // Persistent at-a-glance safety flag on a DEPLOYED card (2026-07-02 audit #7, v3
  // parity): 'unrated' / 'over-capacity'. The CALLER computes it, because only the
  // caller can see the whole group and divide the load by the struts ACTUALLY
  // STANDING (H1/#415) — Board, List, Division, Cutting Station and the archive all
  // thread it, so a point flags identically wherever it shows (H2/#416).
  //
  // NO local fallback (SME-1, 2026-07-28). The old `deployedCapacityFlag(sp)` fallback
  // divided by the PLANNED groupTotal, which is the exact false-SAFE #415 closed — a
  // 1-of-3 partial deploy read clean. A card with no flag threaded now shows no flag
  // at all: silent-absent is honest, silent-SAFE is not.
  const capacityFlag = capacityFlagProp ?? null;

  // Created-order number tab (top-left): a ghost outline while no strut is
  // assigned, then FILLS with the deployed strut's SYSTEM color (gold/grey/
  // lockstroke) once equipped — outline-vs-fill keeps a Grey-system point distinct
  // from a pending one. The number is text, so identity is never color-only
  // (Principle 9). Stable across deletion + shared within a group (schema seq).
  const tabSysKey = deployedStrut?.model ? strutSysKey(deployedStrut.model) : null;
  const numberTab =
    sp.seq != null ? (
      <span
        className={`fs-spc-tab${tabSysKey ? ` is-${tabSysKey}` : ' is-empty'}`}
        aria-label={`Shore point number ${sp.seq}`}
      >
        #{sp.seq}
      </span>
    ) : null;

  // Card identity (Alex 2026-07-03): the LOCATION is the primary/focus line; the
  // label + type ride the secondary line; the assigned apparatus is a top-right
  // pill (below), not inline. Shared across all three views via cardParts.
  const location = cardLocation(sp);
  const labelType = cardLabelType(sp);

  // Cut length once cutting, else effective strut length — shared with List/Division
  // via cardValueEighths so all three print the same number (#361, audit #416 D3).
  const valueEighths = cardValueEighths(sp);

  // The strut model rides the tertiary length line once deployed (bomModelLabel)
  // — except at the Cutting Station, where the value is the cut length alone
  // ("cutting only needs the cut length", Alex). Pending has no strut.
  const showStrutModel = !!deployedStrut && sp.status !== 'cutting';

  // Anatomy v2 (#432, mess-map #13): ONE composed header — the #N tab rides
  // inline with the location line, the meta pills drop BELOW it and render only
  // when present (an empty row otherwise reserved ~22px of dead card space).
  const hasMeta = !!sp.assignedResource || !!(sp.groupIndex && sp.groupTotal) || waiting || hazard;
  const headContent = (
    <>
      {/* Location leads (the focus); label · type on the secondary line. */}
      <span className="fs-spc-identity">
        {numberTab}
        <span className="fs-spc-identity-text">
          <span className="fs-spc-title">{location || '—'}</span>
          {labelType && <span className="fs-spc-where">{labelType}</span>}
        </span>
      </span>
      {hasMeta && (
        <span className="fs-spc-meta">
          {sp.assignedResource ? (
            <span className="fs-spc-appar">{sp.assignedResource}</span>
          ) : null}
          {sp.groupIndex && sp.groupTotal ? (
            // Labeled dominant/denominator (#6): "POST 2/3", never a bare "2 / 3".
            <Badge variant="label">{`POST ${sp.groupIndex}/${sp.groupTotal}`}</Badge>
          ) : null}
          {/* Waiting stays an explicit amber badge — it's a pending SUB-state
              (equipment now available), not the plain status the stripe carries. */}
          {waiting ? <span className="fs-badge fs-badge--status is-waiting">Waiting</span> : null}
          {hazard ? <span className="fs-spc-hazard">⚠ Hazard</span> : null}
        </span>
      )}
    </>
  );

  // The measurement is the card's HERO (#5): dominant numeral + micro-label
  // naming which number this is, the strut model as the quiet suffix.
  const valueLabel =
    sp.status === 'pending'
      ? 'opening'
      : sp.status === 'process' || sp.status === 'strutset'
        ? 'effective'
        : 'cut';
  const valueShelf = (
    <p className="fs-spc-value">
      <MeasurementValue eighths={valueEighths} className="fs-spc-value-num" />
      <span className="fs-spc-value-k">{valueLabel}</span>
      {showStrutModel && <span className="fs-spc-value-model">{bomModelLabel(sp)}</span>}
    </p>
  );

  // SME-3 (Phase J gate #260): the shelf is printing a CUT length and that cut floored
  // to 0″ — the opening can't take the shore-type header + footer + wedge, so there is
  // nothing to cut. Without this the card reads a bare "0″ cut", which looks like a
  // measured value rather than an impossibility. Gated on isCutPhase so the chip can
  // never explain a number the shelf isn't showing; rides the CARD, so every surface
  // that renders one (board lanes, grouped stack, Cutting Station lists, archive) gets
  // it from this single point. Warning (amber) not danger (red): the shore isn't
  // unsafe, the MEASUREMENT is unusable — a different order of alarm from the
  // over-capacity chip above, which is red and may render alongside this one.
  // role="status" (polite) matches the capacity chip: static content, not an interrupt.
  const tooSmallChip = isCutPhase(sp) && cutTooSmall(sp) && (
    <span className="fs-spc-flag-row">
      <span className="fs-spc-flag fs-spc-flag--warning" role="status">
        ⚠ Opening too small — verify measurement
      </span>
    </span>
  );

  return (
    <Card
      className={`fs-spc ${statusClasses(sp)}${removed ? ' is-removed' : ''}${active ? ' is-active' : ''}`}
      edge={
        interactive && pending && !removed ? (
          <button
            type="button"
            className="fs-spc-stripe"
            aria-label="Assign equipment"
            onClick={() => onAssignEquipment?.(sp)}
          />
        ) : (
          <span className="fs-spc-stripe" aria-hidden="true" />
        )
      }
    >
      {interactive && pending && !removed ? (
        <button
          type="button"
          className="fs-spc-head"
          aria-expanded={expanded}
          onClick={() => setExpanded((e) => !e)}
        >
          {headContent}
        </button>
      ) : deployedStrut && !removed && onOpenDetail ? (
        /* Deployed: the head IS the Quick View entry (#14 — tap-anywhere with a
           quiet chevron cue; the lone gold "Details" text link is gone). Read-only,
           so it renders under readOnly (archive) too. */
        <button
          type="button"
          className="fs-spc-head fs-spc-head--detail"
          onClick={() => onOpenDetail(sp)}
        >
          {headContent}
          <span className="fs-spc-chev" aria-hidden="true">
            ›
          </span>
        </button>
      ) : (
        <div className="fs-spc-head">{headContent}</div>
      )}

      {/* Persistent unrated / over-capacity flag on its OWN line below the header
          (Alex's call) — the SAME badge the List row + Division tile render. */}
      <CapacityFlag flag={capacityFlag} />

      {valueShelf}

      {tooSmallChip}

      {/* #441 — radio-callout location row. Capture is only offered while the
          shore is still being worked — a terminal returned card stays action-free
          (its existing words/coords still render as history). */}
      {!removed && (
        <W3wChip
          sp={sp}
          onCapture={
            interactive && onCaptureLocation && sp.status !== 'returned'
              ? () => onCaptureLocation(sp)
              : undefined
          }
        />
      )}

      {sp.status === 'cutting' && sp.cuttingDone && (
        <p className="fs-spc-cutdone">✓ Cut done</p>
      )}

      {sp.status === 'returned' && (
        <p className="fs-spc-returned">✓ Equipment returned</p>
      )}

      {interactive && pending && !removed && (
        <div className="fs-spc-pending">
          {sp.pendingReason && (
            <div className="fs-spc-wait">
              <span className="fs-spc-wait-ic" aria-hidden="true">
                <WaitIcon />
              </span>
              <div>
                <div className="fs-spc-wait-t">{PENDING_REASON_TITLE[sp.pendingReason]}</div>
                <div className="fs-spc-wait-d">
                  {sp.pendingReason === 'no-inventory'
                    ? needLine(needModels)
                    : PENDING_REASON_COPY[sp.pendingReason]}
                </div>
              </div>
            </div>
          )}
          {/* Quiet outline (#4 gold budget): the board's one gold is Add Shore
              Point; per-card commits read through the slide knob, not a stack of
              gold bars. */}
          <Button variant="secondary" fullWidth onPress={() => onAssignEquipment?.(sp)}>
            Assign Equipment
          </Button>
          {expanded && (
            <div className="fs-spc-actions">
              <Button variant="secondary" onPress={() => onEdit?.(sp)}>
                Edit
              </Button>
              <Button variant="secondary" destructive onPress={() => onDelete?.(sp)}>
                Delete
              </Button>
            </div>
          )}
        </div>
      )}

      {interactive && !removed && sp.status === 'process' && (
        <div className="fs-spc-slides">
          <Slider
            label="Slide to set Strut Set"
            tone="strutset"
            disabled={!!advanceDisabledReason}
            disabledReason={advanceDisabledReason}
            onCommit={() => onAdvance?.(sp)}
          />
          {/* Un-deploy: the board confirms (inventory-consequential) before any commit. */}
          <Slider
            label="Slide back to Pending Equipment"
            direction="stepback"
            tone="pending"
            onCommit={() => onStepBack?.(sp)}
          />
        </div>
      )}

      {interactive && !removed && sp.status === 'strutset' && (
        <div className="fs-spc-slides">
          {/* Advance → Cutting is the last group-wide advance (#222): one member's
              slide moves all lockstep mates to Cutting (reducer groupAdvance). No
              confirm — non-inventory status slide (ADR-010). */}
          <Slider
            label="Slide to send to Cutting Station"
            tone="cutting"
            onCommit={() => onAdvance?.(sp)}
          />
          <Slider
            label="Slide back to Equipment Assigned"
            direction="stepback"
            tone="process"
            onCommit={() => onStepBack?.(sp)}
          />
        </div>
      )}

      {/* Cutting Station controls (#222) — only when this card is rendered in the
          station; on the Operations board the `cutting` lane card stays read-only
          (the cutter works the station). Two-step: Mark Cut Done (a flag on the
          `cutting` state, card stays put) → Send to Runner (advances individually
          and the card leaves the queue). Step-back out of cutting → Strut Set.
          The slide pair lives in <CuttingControls> so the tablet hero ("cut this
          now") can host the SAME controls WITHOUT re-embedding the whole card —
          embedding the card doubled the cut length + location (regression, 2026-06-22). */}
      {interactive && !removed && cuttingStation && sp.status === 'cutting' && (
        <CuttingControls
          sp={sp}
          onMarkCutDone={onMarkCutDone}
          onClearCutDone={onClearCutDone}
          onSendToRunner={onAdvance}
          onStepBack={onStepBack}
        />
      )}

      {/* Runner (#223) — interactive on the BOARD only (gated !cuttingStation so the
          station's read-only "sent to runner" tail stays read-only). Individual
          (post-cutting phase split): one slide → Wood Shore Secured, step-back → Cutting Station
          (re-enters the Cutting Station queue Cut-Done-intact). No confirm — non-
          inventory status slides (ADR-010). */}
      {interactive && !removed && !cuttingStation && sp.status === 'runner' && (
        <div className="fs-spc-slides">
          <Slider
            label="Slide to set Wood Shore Secured"
            tone="secured"
            onCommit={() => onAdvance?.(sp)}
          />
          <Slider
            label="Slide back to Cutting Station"
            direction="stepback"
            tone="cutting"
            onCommit={() => onStepBack?.(sp)}
          />
        </div>
      )}

      {/* Wood Shore Secured (#224) — the only forward path is Remove & Return Equipment, an
          inventory-consequential + terminal action, so it is a BUTTON that raises the
          confirm modal (ADR-016), not a slide. Step-back → Runner is the last
          reversible move (ADR-010). Board only (!cuttingStation). */}
      {interactive && !removed && !cuttingStation && sp.status === 'secured' && (
        <div className="fs-spc-slides">
          <Button variant="secondary" fullWidth onPress={() => onRemoveReturn?.(sp)}>
            Remove &amp; Return Equipment
          </Button>
          <Slider
            label="Slide back to Runner"
            direction="stepback"
            tone="runner"
            onCommit={() => onStepBack?.(sp)}
          />
        </div>
      )}

      {caption && !removed && <p className="fs-spc-caption">{caption}</p>}

      {removed && (
        <>
          <svg
            className="fs-spc-slash"
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
            aria-hidden="true"
          >
            <line x1="100" y1="0" x2="0" y2="100" vectorEffect="non-scaling-stroke" />
          </svg>
          <span className="fs-spc-removed">Removed from cut list</span>
        </>
      )}
    </Card>
  );
}

/**
 * The Cutting Station slide pair for a `cutting` point — Mark Cut Done → Send to
 * Runner, with the mirror step-backs (the two-step #222 commit). Extracted from
 * ShorePointCard so the tablet hero ("cut this now") hosts the SAME controls
 * without re-rendering the whole card around them (a card-in-a-card doubled the
 * cut length + location). One source for the cutter's slides — the card's own
 * cutting block and the hero both render this.
 */
export function CuttingControls({
  sp,
  onMarkCutDone,
  onClearCutDone,
  onSendToRunner,
  onStepBack,
}: {
  sp: ShorePoint;
  onMarkCutDone?: (sp: ShorePoint) => void | Promise<void>;
  onClearCutDone?: (sp: ShorePoint) => void | Promise<void>;
  onSendToRunner?: (sp: ShorePoint) => void | Promise<void>;
  onStepBack?: (sp: ShorePoint) => void | Promise<void>;
}) {
  return (
    <div className="fs-spc-slides">
      {sp.cuttingDone ? (
        <>
          <Slider label="Slide to send to Runner" tone="runner" onCommit={() => onSendToRunner?.(sp)} />
          <Slider
            label="Slide back — clear Cut Done"
            direction="stepback"
            tone="cutting"
            onCommit={() => onClearCutDone?.(sp)}
          />
        </>
      ) : (
        <>
          <Slider label="Slide to mark Cut Done" tone="cutting" onCommit={() => onMarkCutDone?.(sp)} />
          <Slider
            label="Slide back to Strut Set"
            direction="stepback"
            tone="strutset"
            onCommit={() => onStepBack?.(sp)}
          />
        </>
      )}
    </div>
  );
}
