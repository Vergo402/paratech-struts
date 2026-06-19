import { useId, useRef, useState } from 'react';
import { PickerSurface } from '@ui/primitives';

// FilterPicker — single-select filter pill for the Operations board filterbar (#347).
// Shares the PickerSurface (Sheet on phone, Popover on desktop) and picker.css row
// styles with DivisionPicker/BuildingPicker. Set nullable={false} for Sort (no "All" row).
export interface FilterPickerProps {
  label: string;
  /** null = "all/unset". Always a string when nullable={false} (Sort use case). */
  value: string | null;
  /** Text shown when value is null, and as the "All" row label. */
  placeholder: string;
  options: { value: string; label: string }[];
  onChange: (v: string | null) => void;
  /** If false, no "All" row is rendered. Default true. */
  nullable?: boolean;
}

export function FilterPicker({
  label,
  value,
  placeholder,
  options,
  onChange,
  nullable = true,
}: FilterPickerProps) {
  const [open, setOpen] = useState(false);
  const labelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);

  function select(v: string | null) {
    onChange(v);
    setOpen(false);
  }

  const displayValue =
    value != null ? (options.find((o) => o.value === value)?.label ?? value) : placeholder;

  return (
    <div className="fs-picker-field">
      <span className="fs-field-label" id={labelId}>
        {label}
      </span>
      <button
        ref={triggerRef}
        type="button"
        className="fs-picker-trigger fs-filterbar-trigger"
        aria-labelledby={labelId}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span className="fs-picker-trigger-value">{displayValue}</span>
        <span className="fs-picker-trigger-chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      <PickerSurface open={open} onClose={() => setOpen(false)} title={label} anchor={triggerRef}>
        <div role="listbox" aria-labelledby={labelId}>
          {nullable && (
            <button
              type="button"
              role="option"
              aria-selected={value === null}
              className={`fs-picker-row${value === null ? ' fs-picker-row--selected' : ''}`}
              onClick={() => select(null)}
            >
              <span className="fs-picker-row-text">
                <span className="fs-picker-row-label">{placeholder}</span>
              </span>
              {value === null && (
                <span className="fs-picker-row-check" aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          )}
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              className={`fs-picker-row${o.value === value ? ' fs-picker-row--selected' : ''}`}
              onClick={() => select(o.value)}
            >
              <span className="fs-picker-row-text">
                <span className="fs-picker-row-label">{o.label}</span>
              </span>
              {o.value === value && (
                <span className="fs-picker-row-check" aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      </PickerSurface>
    </div>
  );
}
