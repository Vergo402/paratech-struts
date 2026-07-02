import { useMemo, useState } from 'react';
import type { ShorePoint, ShoreTypeId, ShorePointStatus } from '@core/schema';
import { divisionLabel } from '@core/operation';
import { strutSysKey } from '@core/load';
import {
  bomModelLabel,
  cutLengthInches,
  deployedCapacityFlag,
  deployedStrutOf,
  effectiveLengthFrom,
  pendingNeedModels,
} from '@core/shorepoint';
import { Badge, Button, Card, MeasurementValue, Slider } from '@ui/primitives';

// Short display labels — the full catalog names stay in core/load/plates.ts.
export const SHORE_TYPE_LABELS: Record<ShoreTypeId, string> = {
  't-shore': 'T-Shore',
  'double-t': 'Double-T',
  '3-post': '3-Post',
};

/** The Quick View drawer title for a shore point — "#7 · B-2 · 3-Post" (the #N and
 *  label are optional). One source of truth for the OperationsBoard + archive drawers. */
export function shorePointDrawerTitle(sp: Pick<ShorePoint, 'seq' | 'label' | 'shoreType'>): string {
  return `${sp.seq != null ? `#${sp.seq} · ` : ''}${sp.label ? `${sp.label} · ` : ''}${SHORE_TYPE_LABELS[sp.shoreType]}`;
}

const PENDING_REASON_COPY = {
  'no-match': 'No matching strut — nothing fits this opening at this load',
  'no-inventory': 'Waiting for inventory — no apparatus stock to pull from',
  'over-capacity': 'Over capacity — estimated load exceeds the 4-strut limit; escalate to engineering',
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

// The lifecycle value shelf. The shelf number is ALWAYS the effective length
// (raw − deductions, floored to ⅛″ by the engine); only the LABEL changes per
// phase: pre-cut it is the "Required strut length" (the cut-to answer), "Cut
// length" while cutting, "Set length" once set (S12 SME review SF-1: the raw
// opening would mislabel the setting). Card compaction (2026-06-20): the raw
// opening + deduction + load detail line is retired from the card face (it lives
// in Details now); the bar instead carries the deployed strut + extensions as a
// sub-line. Amends the S12 "one length that matters" shelf (card.md / ADR-011
// Addendum 2).
// Short labels (card compaction 2026-06-20) so the label + measurement + strut
// fit on one line in the narrow board lanes. The deduction LEDGER keeps the full
// "Required strut length" wording (card.md §Ledger vocabulary); only the card's
// bar label is shortened.
const REQUIRED_LABEL = 'Strut system';
const VALUE_LABEL: Record<ShorePointStatus, string> = {
  pending: REQUIRED_LABEL,
  process: REQUIRED_LABEL,
  strutset: REQUIRED_LABEL,
  cutting: 'Cut length',
  runner: 'Cut length',
  secured: 'Set length',
  returned: 'Set length',
};
// Statuses whose value number is the live working length and reads big (#351).
const PROMOTED_VALUE = new Set<ShorePointStatus>(['pending', 'process', 'strutset', 'cutting']);
// Once a point goes to the saw, the shelf is the wood CUT length, not the strut
// effective length (#361). The Cut / Set labels both name the wood, so every phase
// from cutting onward reads the cut length; pre-cut reads the required strut length.
const CUT_PHASES = new Set<ShorePointStatus>(['cutting', 'runner', 'secured', 'returned']);

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
  // Promote the value number (28px/700) on every card where it's the LIVE working
  // length: the pre-cutting Required strut length (pending/process/strutset, #351)
  // and the cutting Cut length. Post-cut (runner/secured/returned) stays at shelf
  // weight — that number is a record, not the next thing to read at a glance.
  const promoted = PROMOTED_VALUE.has(sp.status);
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
  // parity): 'unrated' / 'over-capacity', re-derived catalog-mode so it agrees with
  // Quick View and a relief IC sees a beyond-rating shore without opening anything.
  // Null for pending (no strut on record) / clean shores.
  const capacityFlag = useMemo(() => deployedCapacityFlag(sp), [sp]);

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

  // The headline is "label · type" — "B-2 · 3-Post" — at headline-2 (the
  // design-system ShorePointCard title; the type no longer rides the meta row).
  const title = sp.label
    ? `${sp.label} · ${SHORE_TYPE_LABELS[sp.shoreType]}`
    : SHORE_TYPE_LABELS[sp.shoreType];

  // Location reads Building · Division · Area · assigned-apparatus (broad →
  // narrow → who). Building leads in multi-building ops; single-building points
  // open on the division (e.g. "Div 1 · West Wall · Rescue 2"). The assigned
  // resource rides the end of this line now (card compaction) — its own line is
  // gone; the strut's SOURCE rig moves to Details.
  const identity = [
    ...(sp.building ? [sp.building] : []),
    divisionLabel(sp.division),
    ...(sp.area ? [sp.area] : []),
    ...(sp.assignedResource ? [sp.assignedResource] : []),
  ].join(' · ');

  // Pre-cut, the shelf is the required STRUT length; from the cutting phase on it
  // is the wood CUT length — a different number (shore-type lumber + wedge, no
  // plates; #361). Both helpers return INCHES already floored to ⅛″ (ADR-012) — × 8
  // lands on an exact eighth; round() only defends float noise. No double-floor.
  const valueEighths = Math.round(
    (CUT_PHASES.has(sp.status) ? cutLengthInches(sp) : effectiveLengthFrom(sp.measurementEighths, sp.deductions)) * 8,
  );

  // The deployed strut + extensions now ride INSIDE the value bar as a sub-line
  // (card compaction) — except at the Cutting Station, where the bar is the cut
  // length alone ("cutting only needs the cut length", Alex). Pending has no
  // strut. The raw-opening / deduction / load detail line is gone from the face
  // (it lives in Details).
  const showStrutInBar = !!deployedStrut && sp.status !== 'cutting';

  const headContent = (
    <>
      <span className="fs-spc-identity">
        <span className="fs-spc-title">{title}</span>
        <span className="fs-spc-where">{identity}</span>
      </span>
      <span className="fs-spc-meta">
        {sp.groupIndex && sp.groupTotal ? (
          <Badge variant="label">{`${sp.groupIndex} / ${sp.groupTotal}`}</Badge>
        ) : null}
        {/* Waiting presents its own amber badge — the operational status stays
            pending; the is-waiting hook on the card recolors the geometry. */}
        {waiting ? (
          <span className="fs-badge fs-badge--status is-waiting">Waiting</span>
        ) : (
          <Badge variant="status" status={sp.status} />
        )}
        {hazard ? <span className="fs-spc-hazard">⚠ Hazard</span> : null}
      </span>
    </>
  );

  const valueShelf = (
    <div className={`fs-spc-value${promoted ? ' is-promoted' : ''}`}>
      <span className="fs-spc-value-row">
        <span className="fs-spc-value-label">{VALUE_LABEL[sp.status]}</span>
        <span className="fs-spc-value-num">
          <MeasurementValue eighths={valueEighths} />
        </span>
      </span>
      {showStrutInBar && <span className="fs-spc-value-eq">{bomModelLabel(sp)}</span>}
    </div>
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
      {numberTab}
      {interactive && pending && !removed ? (
        <button
          type="button"
          className="fs-spc-head"
          aria-expanded={expanded}
          onClick={() => setExpanded((e) => !e)}
        >
          {headContent}
        </button>
      ) : (
        <div className="fs-spc-head">{headContent}</div>
      )}

      {/* Persistent unrated / over-capacity flag on its OWN line below the header
          (Alex's call), never sharing the status-badge row. Danger red, non-
          dismissable; the card still opens Quick View for the full verdict. */}
      {capacityFlag && (
        <div className="fs-spc-flag-row">
          <span className={`fs-spc-flag fs-spc-flag--${capacityFlag}`} role="status">
            ⚠ {capacityFlag === 'unrated' ? 'Unrated' : 'Over capacity'}
          </span>
        </div>
      )}

      {valueShelf}

      {/* Quick View entry (ADR-019) — a quiet read-only affordance on every
          deployed card, away from the status stripe + slides. Read-only, so it
          shows under readOnly (archive) too; absent when no handler is wired. */}
      {deployedStrut && !removed && onOpenDetail && (
        <button type="button" className="fs-spc-details" onClick={() => onOpenDetail(sp)}>
          Details
        </button>
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
          <Button variant="primary" fullWidth onPress={() => onAssignEquipment?.(sp)}>
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
          <Button variant="primary" fullWidth onPress={() => onRemoveReturn?.(sp)}>
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
