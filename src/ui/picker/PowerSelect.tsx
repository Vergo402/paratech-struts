import { useId } from 'react';
import type { SheetPickerOption } from './BottomSheetPicker';

/**
 * PowerSelect — picker variant 4 (picker.md): the OS-native fallback, used
 * ONLY when VoiceOver/TalkBack is active or "Native controls" is on in
 * Settings. A thin labeled <select>; the OS supplies the picker UI. Detection
 * and routing land with the accessibility session — this slice ships the seam.
 */
export interface PowerSelectProps<T extends string> {
  label: string;
  options: readonly SheetPickerOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function PowerSelect<T extends string>({
  label,
  options,
  value,
  onChange,
}: PowerSelectProps<T>) {
  const id = useId();
  return (
    <div className="fs-picker-field">
      <label className="fs-field-label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="fs-power-select"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
