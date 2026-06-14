import { useState } from 'react';
import type { ShorePoint, ShoreTypeId, ShorePointStatus } from '@core/schema';
import { divisionLabel } from '@core/operation';
import { strutSysKey } from '@core/load';
import { deductionTotalInches, effectiveLengthFrom } from '@core/shorepoint';
import { Badge, Button, Card, MeasurementValue, Slider } from '@ui/primitives';

// Short display labels — the full catalog names stay in core/load/plates.ts.
export const SHORE_TYPE_LABELS: Record<ShoreTypeId, string> = {
  't-shore': 'T-Shore',
  'double-t': 'Double-T',
  '3-post': '3-Post',
};

const PENDING_REASON_COPY = {
  'no-match': 'No matching strut — nothing fits this opening at this load',
  'no-inventory': 'Waiting for inventory — no apparatus stock to pull from',
} as const;

// Waiting-callout headline per reason (handoff §1.1). The description below it
// stays the verbatim PENDING_REASON_COPY string — the title is the new framing.
const PENDING_REASON_TITLE: Record<keyof typeof PENDING_REASON_COPY, string> = {
  'no-inventory': 'Waiting for inventory',
  'no-match': 'No matching strut',
};

// The lifecycle value shelf. The shelf number is ALWAYS the effective length
// (raw − deductions, floored to ⅛″ by the engine); only the LABEL changes per
// phase: pre-cut it is the "Required strut length" (the cut-to answer), "Cut
// length" while cutting, "Set length" once set (S12 SME review SF-1: the raw
// opening would mislabel the setting). #248 Design 2 (re-drive) promotes the
// required strut length into the shelf and moves the raw opening + deduction +
// load to the detail line above (RAW_OPENING_LABEL), restoring the v3 dual-
// length context. Amends the S12 "one length that matters" shelf (card.md /
// ADR-011 Addendum 2), per Alex's re-drive direction.
const RAW_OPENING_LABEL = 'Raw opening';
const REQUIRED_LABEL = 'Required strut length';
const VALUE_LABEL: Record<ShorePointStatus, string> = {
  pending: REQUIRED_LABEL,
  process: REQUIRED_LABEL,
  strutset: REQUIRED_LABEL,
  cutting: 'Cut length',
  runner: 'Cut length',
  secured: 'Set length',
  returned: 'Set length',
};

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
 * owns every modal and commit. Pending shipped with #220; In Process and the
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
  /** Pending primary action — opens the Assign Equipment sheet (#221). */
  onAssignEquipment?: (sp: ShorePoint) => void;
  /** In Process only — commits the advance to Strut Set. */
  onAdvance?: (sp: ShorePoint) => void | Promise<void>;
  /** In Process + Strut Set — the board routes: process → confirm modal, strutset → direct commit. */
  onStepBack?: (sp: ShorePoint) => void | Promise<void>;
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
}

export function ShorePointCard({
  shorePoint: sp,
  onEdit,
  onDelete,
  onAssignEquipment,
  onAdvance,
  onStepBack,
  advanceDisabledReason,
  removed = false,
  hazard = false,
  active = false,
  caption,
}: ShorePointCardProps) {
  const [expanded, setExpanded] = useState(false);
  const pending = sp.status === 'pending';
  const promoted = sp.status === 'cutting';
  const waiting = pending && !!sp.pendingReason;

  // Created-order number tab (top-left): a ghost outline while no strut is
  // assigned, then FILLS with the deployed strut's SYSTEM color (gold/grey/
  // lockstroke) once equipped — outline-vs-fill keeps a Grey-system point distinct
  // from a pending one. The number is text, so identity is never color-only
  // (Principle 9). Stable across deletion + shared within a group (schema seq).
  const tabSysKey = sp.deployedStrut ? strutSysKey(sp.deployedStrut.model) : null;
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

  // Location reads Building · Division · Area (broad → narrow). Building leads in
  // multi-building ops; single-building points have no building, so it opens on
  // the division (e.g. "Div 1 · West Wall").
  const identity = [
    ...(sp.building ? [sp.building] : []),
    divisionLabel(sp.division),
    ...(sp.area ? [sp.area] : []),
  ].join(' · ');

  // The shelf number is the effective length in every phase (Required / Cut /
  // Set name the same value; only the label differs). effectiveLengthFrom
  // returns INCHES already floored to ⅛″ (ADR-012) — × 8 lands on an exact
  // eighth; round() only defends float noise. No double-floor.
  const valueEighths = Math.round(effectiveLengthFrom(sp.measurementEighths, sp.deductions) * 8);

  // Pre-cutting detail line (#248 Design 2): the raw opening, the total
  // deduction (nearest ⅛″ for display; the exact spec stays in the math,
  // ADR-012), and the estimated load — the v3 context the promoted shelf no
  // longer carries. Cutting onward, the shelf number IS the cut/set length, so
  // the detail line drops away.
  const preCut = sp.status === 'pending' || sp.status === 'process' || sp.status === 'strutset';
  const dedEighths = Math.round(deductionTotalInches(sp.deductions) * 8);
  const estLoad = sp.estimatedLoad ?? 0;

  const headContent = (
    <>
      <span className="fs-spc-identity">
        <span className="fs-spc-title">{title}</span>
        <span className="fs-spc-where">{identity}</span>
        {sp.assignedResource ? (
          <span className="fs-spc-assigned">Assigned: {sp.assignedResource}</span>
        ) : null}
        {sp.deployedStrut ? (
          <span className="fs-spc-apparatus">{sp.deployedStrut.source}</span>
        ) : null}
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

  const detailLine = preCut ? (
    <div className="fs-spc-detail">
      {RAW_OPENING_LABEL} <MeasurementValue eighths={sp.measurementEighths} />
      {dedEighths > 0 ? (
        <>
          {' ('}
          <MeasurementValue eighths={-dedEighths} />
          {')'}
        </>
      ) : null}
      {` · ${estLoad.toLocaleString()} lbs`}
    </div>
  ) : null;

  const valueShelf = (
    <div className={`fs-spc-value${promoted ? ' is-promoted' : ''}`}>
      <span className="fs-spc-value-label">{VALUE_LABEL[sp.status]}</span>
      <span className="fs-spc-value-num">
        <MeasurementValue eighths={valueEighths} />
      </span>
    </div>
  );

  return (
    <Card
      className={`fs-spc ${statusClasses(sp)}${removed ? ' is-removed' : ''}${active ? ' is-active' : ''}`}
      edge={
        pending && !removed ? (
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
      {pending && !removed ? (
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

      {detailLine}
      {valueShelf}

      {sp.deployedStrut && (
        <div className="fs-spc-strut">
          {/* Apparatus moved to the header caption line — model only here now. */}
          <span className="fs-spc-strut-model">{sp.deployedStrut.model}</span>
        </div>
      )}

      {pending && !removed && (
        <div className="fs-spc-pending">
          <p className="fs-spc-noequip">No equipment assigned</p>
          {sp.pendingReason && (
            <div className="fs-spc-wait">
              <span className="fs-spc-wait-ic" aria-hidden="true">
                <WaitIcon />
              </span>
              <div>
                <div className="fs-spc-wait-t">{PENDING_REASON_TITLE[sp.pendingReason]}</div>
                <div className="fs-spc-wait-d">{PENDING_REASON_COPY[sp.pendingReason]}</div>
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

      {!removed && sp.status === 'process' && (
        <div className="fs-spc-slides">
          <Slider
            label="Slide to set Strut Set"
            revealColor="var(--status-strutset-bg)"
            disabled={!!advanceDisabledReason}
            disabledReason={advanceDisabledReason}
            onCommit={() => onAdvance?.(sp)}
          />
          {/* Un-deploy: the board confirms (inventory-consequential) before any commit. */}
          <Slider
            label="Slide back to Pending"
            direction="stepback"
            onCommit={() => onStepBack?.(sp)}
          />
        </div>
      )}

      {!removed && sp.status === 'strutset' && (
        <div className="fs-spc-slides">
          {/* Advance → Cutting is workflow #222 (role gates begin there). Step-back
              ships now: always reversible from the card, no confirm — no inventory
              change on strutset → process (ADR-010). */}
          <Slider
            label="Slide back to In Process"
            direction="stepback"
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
