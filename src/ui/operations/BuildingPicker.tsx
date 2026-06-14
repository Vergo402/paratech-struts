import { useId, useState } from 'react';
import { Button, Sheet, TextField } from '@ui/primitives';
import { commitHaptic } from '@ui/primitives/haptics';

/**
 * BuildingPicker — the building picker for the Add Shore Point form, multi-
 * building operations only. Mirrors DivisionPicker's UX (a labeled trigger that
 * opens a Sheet listing the choices) so building "operates like the division":
 * pick a building already used in this op, or "Add building" by name. The choice
 * carries over to the next shore point via the modal's seed-from-last-point logic.
 *
 * Unlike DivisionPicker, building is NOT operation-level state — it stays a per-
 * point string. The list is simply the distinct buildings already placed in the
 * op (passed in), so a new name "exists" once its first shore point is saved.
 */
export interface BuildingPickerProps {
  /** The selected building name ('' = none chosen yet). */
  value: string;
  onChange: (building: string) => void;
  /** Distinct buildings already used in this operation, for the list. */
  buildings: string[];
}

export function BuildingPicker({ value, onChange, buildings }: BuildingPickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const labelId = useId();

  function select(building: string) {
    onChange(building);
    setOpen(false);
  }

  function addBuilding() {
    const name = draft.trim();
    if (!name) return;
    commitHaptic();
    onChange(name);
    setDraft('');
    setOpen(false);
  }

  return (
    <div className="fs-picker-field">
      <span className="fs-field-label" id={labelId}>
        Building
      </span>
      <button
        type="button"
        className="fs-picker-trigger"
        aria-labelledby={labelId}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span className={`fs-picker-trigger-value${value ? '' : ' fs-picker-trigger-placeholder'}`}>
          {value || 'Select building'}
        </span>
        <span className="fs-picker-trigger-chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      <span className="fs-sr-only" aria-live="polite">
        {value || 'No building selected'}
      </span>
      <Sheet open={open} onClose={() => setOpen(false)} title="Building">
        {buildings.length > 0 && (
          <div role="listbox" aria-labelledby={labelId}>
            {buildings.map((b) => (
              <button
                key={b}
                type="button"
                role="option"
                aria-selected={b === value}
                className={`fs-picker-row${b === value ? ' fs-picker-row--selected' : ''}`}
                onClick={() => select(b)}
              >
                <span className="fs-picker-row-text">
                  <span className="fs-picker-row-label">{b}</span>
                </span>
                {b === value && (
                  <span className="fs-picker-row-check" aria-hidden="true">
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
        <div className="fs-building-add">
          <TextField label="Add building" value={draft} onChange={setDraft} placeholder="e.g. North tower" />
          <Button
            variant="secondary"
            fullWidth
            onPress={addBuilding}
            disabled={!draft.trim()}
            disabledReason="Enter a building name"
          >
            + Add building
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
