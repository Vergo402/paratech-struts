import { useId, useRef, useState } from 'react';
import { PickerSurface, useNativeControls } from '@ui/primitives';
import { PowerSelect } from './PowerSelect';

/**
 * BottomSheetPicker — picker variant 2 (picker.md): 5–7 options, single-select,
 * parent stays visible. Surface-adaptive (ADR-032): a bottom sheet on phone, an
 * anchored dropdown on desktop — the name is kept (renaming ripples through the
 * barrel, gallery, and the `SheetPickerOption` re-exports) but the surface is
 * chosen by PickerSurface. The collapsed trigger always shows the current value
 * (picker rule 3); a row tap commits immediately and dismisses (rule 2 — no
 * Apply). Rows are 56pt; the selected row carries a check + weight, never fill
 * alone (Principle 9).
 */
export interface SheetPickerOption<T extends string> {
  value: T;
  label: string;
  /** Quiet secondary line (e.g. "deducts 1″"). */
  sub?: string;
  /** Non-selectable (e.g. out-of-stock in ops mode) — honored by PowerSelect. */
  disabled?: boolean;
}

export interface BottomSheetPickerProps<T extends string> {
  label: string;
  options: readonly SheetPickerOption<T>[];
  value: T;
  onSelect: (value: T) => void;
}

export function BottomSheetPicker<T extends string>({
  label,
  options,
  value,
  onSelect,
}: BottomSheetPickerProps<T>) {
  const [open, setOpen] = useState(false);
  const labelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const current = options.find((o) => o.value === value);

  // Native-controls fallback (accessibility.md §The Power Select fallback): an
  // OS-native <select>, never a custom control faking native semantics.
  if (useNativeControls()) {
    return <PowerSelect label={label} options={options} value={value} onChange={onSelect} />;
  }

  if (import.meta.env.DEV && options.length > 7) {
    console.warn(
      `BottomSheetPicker "${label}": ${options.length} options — 8+ belongs in FullScreenList (picker.md).`,
    );
  }

  return (
    <div className="fs-picker-field">
      <span className="fs-field-label" id={labelId}>
        {label}
      </span>
      <button
        ref={triggerRef}
        type="button"
        className="fs-picker-trigger"
        aria-labelledby={labelId}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span className="fs-picker-trigger-value">{current?.label ?? '—'}</span>
        <span className="fs-picker-trigger-chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      <PickerSurface open={open} onClose={() => setOpen(false)} title={label} anchor={triggerRef}>
        <div role="listbox" aria-labelledby={labelId}>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={opt.value === value}
              className={`fs-picker-row${opt.value === value ? ' fs-picker-row--selected' : ''}`}
              onClick={() => {
                onSelect(opt.value);
                setOpen(false);
              }}
            >
              <span className="fs-picker-row-text">
                <span className="fs-picker-row-label">{opt.label}</span>
                {opt.sub && <span className="fs-picker-row-sub">{opt.sub}</span>}
              </span>
              {opt.value === value && (
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
