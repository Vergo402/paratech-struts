import { useState } from 'react';
import type { ShorePoint, ShoreTypeId } from '@core/schema';
import { divisionLabel } from '@core/operation';
import { Badge, Button, Card, MeasurementValue } from '@ui/primitives';

// Short display labels — the full catalog names stay in core/load/plates.ts.
const SHORE_TYPE_LABELS: Record<ShoreTypeId, string> = {
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
 * owns every modal and commit. Pending is the fully-built state this session
 * (#220); the slide-to-advance + Assign Equipment sheet arrive with the deploy
 * workflow (S6, #221).
 *
 * Deliberately NOT `Card onPress` — the card hosts its own buttons (stripe,
 * expand, actions) and onPress would render the card itself as a <button>
 * (nested-interactive). The stripe is the card.md 4pt status bar with the
 * 16pt full-height tap zone: a real button on pending (one-handed reach for
 * the primary action), decorative once the primary action is the S6 slide.
 */
export interface ShorePointCardProps {
  shorePoint: ShorePoint;
  /** Pending only — opens the pre-populated Edit modal (#220 3-R). */
  onEdit?: (sp: ShorePoint) => void;
  /** Pending only — opens the destructive Delete confirm. */
  onDelete?: (sp: ShorePoint) => void;
  /** Pending primary action (S5: board passes a stub; S6 wires the sheet). */
  onAssignEquipment?: (sp: ShorePoint) => void;
}

export function ShorePointCard({ shorePoint: sp, onEdit, onDelete, onAssignEquipment }: ShorePointCardProps) {
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
    </Card>
  );
}
