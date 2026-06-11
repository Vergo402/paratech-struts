import { useState } from 'react';
import type { ShorePoint, ShoreTypeId } from '@core/schema';
import { divisionLabel } from '@core/operation';
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
}

export function ShorePointCard({
  shorePoint: sp,
  onEdit,
  onDelete,
  onAssignEquipment,
  onAdvance,
  onStepBack,
  advanceDisabledReason,
}: ShorePointCardProps) {
  const [expanded, setExpanded] = useState(false);
  const pending = sp.status === 'pending';

  const identity = [
    divisionLabel(sp.division),
    ...(sp.building ? [sp.building] : []),
    ...(sp.area ? [sp.area] : []),
  ].join(' · ');

  const headContent = (
    <>
      <span className="fs-spc-identity">
        {sp.label ? <span className="fs-spc-label">{sp.label}</span> : null}
        <span className="fs-spc-where">{identity}</span>
      </span>
      <span className="fs-spc-meta">
        <MeasurementValue eighths={sp.measurementEighths} />
        <span className="fs-spc-type">{SHORE_TYPE_LABELS[sp.shoreType]}</span>
        {sp.groupIndex && sp.groupTotal ? (
          <Badge variant="label">{`${sp.groupIndex} / ${sp.groupTotal}`}</Badge>
        ) : null}
        <Badge variant="status" status={sp.status} />
      </span>
    </>
  );

  return (
    <Card
      className={`fs-spc is-${sp.status}`}
      edge={
        pending ? (
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
      {pending ? (
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

      {sp.deployedStrut && (
        <div className="fs-spc-strut">
          <span className="fs-spc-strut-model">{sp.deployedStrut.model}</span>
          <span className="fs-spc-strut-source">from {sp.deployedStrut.source}</span>
        </div>
      )}

      {pending && (
        <div className="fs-spc-pending">
          <p className="fs-spc-noequip">
            No equipment assigned
            {sp.pendingReason && (
              <span className="fs-spc-reason">{PENDING_REASON_COPY[sp.pendingReason]}</span>
            )}
          </p>
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

      {sp.status === 'process' && (
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

      {sp.status === 'strutset' && (
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
    </Card>
  );
}
