import * as Switch from '@radix-ui/react-switch';
import { useId, type ReactNode } from 'react';
import { tapHaptic } from './haptics';

/**
 * Toggle — one thing on/off (toggle.md). State lives in THUMB POSITION (left
 * off, right on), never color alone (Principle 9). The label is a stable noun
 * phrase that never changes with state ("Sync over cellular", not
 * "Enable/Disable…"), and the whole row is the tap target. Off is the safe
 * default. Flip is 100ms translate + cross-fade — no bounce, no scale.
 * Two named choices is a Segmented; selecting/completing items is a checkbox.
 */
export interface ToggleProps {
  /** Stable noun-phrase label — identical in both states. */
  label: string;
  /** Optional quiet helper clause under the label (text or light markup). */
  helper?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** 56pt operational row (field default) vs 48pt non-operational. */
  size?: 'operational' | 'standard';
}

export function Toggle({
  label,
  helper,
  checked,
  onChange,
  disabled = false,
  size = 'operational',
}: ToggleProps) {
  const id = useId();
  return (
    <label
      className={`fs-toggle-row ${size === 'operational' ? 'fs-toggle-row--op' : 'fs-toggle-row--std'}`}
      htmlFor={id}
    >
      <span className="fs-toggle-text">
        <span className="fs-toggle-label">{label}</span>
        {helper && <span className="fs-toggle-helper">{helper}</span>}
      </span>
      <Switch.Root
        id={id}
        className="fs-toggle"
        checked={checked}
        disabled={disabled}
        onCheckedChange={(next) => {
          tapHaptic();
          onChange(next);
        }}
      >
        <Switch.Thumb className="fs-toggle-thumb" />
      </Switch.Root>
    </label>
  );
}
