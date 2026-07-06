import * as RadioGroup from '@radix-ui/react-radio-group';
import type { ReactNode } from 'react';
import { tapHaptic } from './haptics';

/**
 * Segmented — always-visible inline single-select, 2–5 options, exactly one
 * always selected (segmented.md). Selection commits immediately and the
 * indicator changes IN PLACE (never slides across the track). Three redundant
 * selected signals: raised pill, weight 500→600, text-secondary→primary —
 * color is never the only one (Principle 9). Segments deliberately abut (the
 * doctrine's one dead-zone exception: a mis-tap lands on a visible neighbor
 * and is reversible with one more tap). Radix RadioGroup supplies the roving
 * tabindex + arrow-key selection. This is the VALUE variant; the scope/tablist
 * variant has no slice consumer and is deliberately not built.
 */
export interface SegmentedOption<T extends string> {
  value: T;
  /** Text, or a node (icon segment / label + count Badge — #432). */
  label: ReactNode;
  /** Accessible name — REQUIRED when label isn't plain text. */
  ariaLabel?: string;
}

export interface SegmentedProps<T extends string> {
  /** 2–5 options — more is a picker, fewer is a toggle. */
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the group. */
  'aria-label': string;
  /** 56pt operational (field default) vs 48pt non-operational. */
  size?: 'operational' | 'standard';
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  'aria-label': ariaLabel,
  size = 'operational',
}: SegmentedProps<T>) {
  if (import.meta.env.DEV && (options.length < 2 || options.length > 5)) {
    console.warn(
      `Segmented: ${options.length} options — the primitive is 2–5; use a picker (8+) or toggle (1).`,
    );
  }
  return (
    <RadioGroup.Root
      className={`fs-segmented ${size === 'operational' ? 'fs-segmented--op' : 'fs-segmented--std'}`}
      value={value}
      aria-label={ariaLabel}
      onValueChange={(next) => {
        tapHaptic();
        onChange(next as T);
      }}
    >
      {options.map((opt) => (
        <RadioGroup.Item key={opt.value} className="fs-segment" value={opt.value} aria-label={opt.ariaLabel}>
          {opt.label}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
