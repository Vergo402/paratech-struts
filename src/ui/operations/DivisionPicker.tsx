import { useId, useRef, useState } from 'react';
import { newId } from '@core/id';
import {
  formatDivision,
  formatDivisionCompact,
  nextFloorAbove,
  nextFloorBelow,
  sortDivisionsForDisplay,
} from '@core/operation';
import { Button, PickerSurface } from '@ui/primitives';
import { commitHaptic } from '@ui/primitives/haptics';
import { useCommit, useDeviceUid, useOperation } from '@ui/hooks';

/**
 * DivisionPicker — the floor picker for the Add Shore Point form (#220).
 * The v3 grow-the-building model carried verbatim (app.js addFloorAbove/Below):
 * the operation owns its division list; "Add floor above / below" extends it
 * via a DivisionAdded event (persists + syncs) and selects the new floor.
 * Surface-adaptive via PickerSurface (ADR-032) — bottom sheet on phone, anchored
 * dropdown on desktop; a BottomSheetPicker won't do because the add-floor actions
 * live in the surface alongside the rows.
 */
export interface DivisionPickerProps {
  /** The selected division number (1 = Ground, negative = Sub Division). */
  value: number;
  onChange: (division: number) => void;
}

export function DivisionPicker({ value, onChange }: DivisionPickerProps) {
  const operation = useOperation();
  const commit = useCommit();
  const getUid = useDeviceUid();
  const [open, setOpen] = useState(false);
  const labelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);

  const divisions = sortDivisionsForDisplay(operation?.divisions ?? [1]);

  async function addFloor(direction: 'above' | 'below') {
    if (!operation) return;
    const next =
      direction === 'above'
        ? nextFloorAbove(operation.divisions)
        : nextFloorBelow(operation.divisions);
    const result = await commit({
      type: 'DivisionAdded',
      id: newId(),
      opId: operation.id,
      at: Date.now(),
      by: await getUid(),
      division: next,
    });
    if (result.ok) {
      commitHaptic();
      onChange(next);
      setOpen(false);
    }
  }

  return (
    <div className="fs-picker-field">
      <span className="fs-field-label" id={labelId}>
        Division
      </span>
      <button
        ref={triggerRef}
        type="button"
        className="fs-picker-trigger"
        aria-labelledby={labelId}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span className="fs-picker-trigger-value">{formatDivisionCompact(value)}</span>
        <span className="fs-picker-trigger-chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      <span className="fs-sr-only" aria-live="polite">
        {formatDivision(value)}
      </span>
      <PickerSurface open={open} onClose={() => setOpen(false)} title="Division" anchor={triggerRef}>
        <div role="listbox" aria-labelledby={labelId}>
          {divisions.map((n) => (
            <button
              key={n}
              type="button"
              role="option"
              aria-selected={n === value}
              className={`fs-picker-row${n === value ? ' fs-picker-row--selected' : ''}`}
              onClick={() => {
                onChange(n);
                setOpen(false);
              }}
            >
              <span className="fs-picker-row-text">
                <span className="fs-picker-row-label">{formatDivision(n)}</span>
              </span>
              {n === value && (
                <span className="fs-picker-row-check" aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="fs-division-actions">
          <Button variant="secondary" fullWidth onPress={() => addFloor('above')}>
            + Add floor above
          </Button>
          <Button variant="secondary" fullWidth onPress={() => addFloor('below')}>
            + Add floor below
          </Button>
        </div>
      </PickerSurface>
    </div>
  );
}
