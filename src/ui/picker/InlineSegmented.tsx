import { Segmented, type SegmentedOption } from '@ui/primitives';

/**
 * InlineSegmented — picker variant 1 (picker.md): 2–5 options, single-select,
 * always visible, parent never leaves the screen. A labeled field wrapper
 * around the Segmented primitive; the current value is exposed by
 * construction (it's always on screen).
 */
export interface InlineSegmentedProps<T extends string> {
  label: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'operational' | 'standard';
}

export function InlineSegmented<T extends string>({
  label,
  options,
  value,
  onChange,
  size,
}: InlineSegmentedProps<T>) {
  return (
    <div className="fs-picker-field">
      <span className="fs-field-label">{label}</span>
      <Segmented options={options} value={value} onChange={onChange} aria-label={label} size={size} />
    </div>
  );
}
