import { useState, type ReactNode } from 'react';
import { tapHaptic } from './haptics';

/**
 * Button — a momentary control that performs one action (button.md). If it
 * selects, navigates, or holds state it is a different primitive. Emphasis is
 * fill → outline → text, never color; `destructive` swaps the accent for
 * --danger at any emphasis level. The double-fire guard is intrinsic: an async
 * onPress self-disables the button (+ aria-busy) until it settles — call sites
 * never re-implement it. No shadows, no scale, no icon-only.
 */
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'tertiary';
  destructive?: boolean;
  /** 56pt operational (field default) vs 48pt non-operational (back-office). */
  size?: 'operational' | 'standard';
  fullWidth?: boolean;
  disabled?: boolean;
  /** Shown adjacent when disabled — a disabled control always carries its why. */
  disabledReason?: string;
  /** Supplemental leading icon (never the only content). */
  icon?: ReactNode;
  onPress: () => void | Promise<void>;
  children: ReactNode;
}

export function Button({
  variant = 'secondary',
  destructive = false,
  size = 'operational',
  fullWidth = false,
  disabled = false,
  disabledReason,
  icon,
  onPress,
  children,
}: ButtonProps) {
  const [busy, setBusy] = useState(false);

  const handleClick = () => {
    if (busy) return;
    tapHaptic();
    const result = onPress();
    if (result instanceof Promise) {
      setBusy(true);
      // A press that settles after unmount is harmless — React 18+ no-ops it.
      void result.finally(() => setBusy(false));
    }
  };

  const cls = [
    'fs-button',
    `fs-button--${variant}`,
    destructive && 'fs-button--destructive',
    size === 'operational' ? 'fs-button--op' : 'fs-button--std',
    fullWidth && 'fs-button--full',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <button
        type="button"
        className={cls}
        disabled={disabled || busy}
        aria-busy={busy || undefined}
        onClick={handleClick}
      >
        {icon && (
          <span className="fs-button-icon" aria-hidden="true">
            {icon}
          </span>
        )}
        {children}
      </button>
      {disabled && disabledReason && <span className="fs-button-reason">{disabledReason}</span>}
    </>
  );
}
