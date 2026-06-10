import type { ReactNode } from 'react';
import { Button } from './Button';

/**
 * EmptyState — the designed surface for the absence of content
 * (empty-state.md). Says WHAT the emptiness is, then WHY / what's next.
 * No surface fill, no border, no shadow, never --danger (empty is not an
 * error), at most one action. Safety-driven omission (unrated/over-capacity)
 * is NOT an empty state — that's the warning gate on a result card.
 */
export interface EmptyStateProps {
  variant: 'first-run' | 'filtered' | 'upstream-blocked' | 'all-clear';
  /** Muted existing-set glyph — no custom art, no decoration. */
  icon?: ReactNode;
  /** One line, the what — factual fragment, no period. */
  headline: string;
  /** One line, the why / next step. */
  reason: string;
  /** ≤1 action. Ignored for all-clear (calm confirmation needs no button). */
  action?: { label: string; onPress: () => void | Promise<void> };
}

export function EmptyState({ variant, icon, headline, reason, action }: EmptyStateProps) {
  const showAction = action && variant !== 'all-clear';
  if (action && variant === 'all-clear' && import.meta.env.DEV) {
    console.warn('EmptyState: all-clear is a calm confirmation — its action prop is ignored.');
  }
  return (
    <div className={`fs-empty fs-empty--${variant}`}>
      {icon && (
        <span className="fs-empty-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <p className="fs-empty-headline">{headline}</p>
      <p className="fs-empty-reason">{reason}</p>
      {showAction && (
        <Button variant="primary" onPress={action.onPress}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
