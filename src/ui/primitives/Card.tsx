import type { ReactNode } from 'react';

/**
 * Card — the bounded surface holding one object (card.md). Flat at rest:
 * hairline stroke + 1pt top inner highlight, NO drop shadow (elevation belongs
 * to sheet/modal). Focus/selected = accent border + hover fill, never scale.
 * The `edge` slot is the composition point for the S5 ShorePointCard status
 * stripe (4pt stripe + 16pt hidden tap zone) — the base card knows nothing
 * about status.
 */
export interface CardProps {
  /** Render as the active/focused object — accent border + hover fill. */
  selected?: boolean;
  /** Makes the whole card one tap target (real button semantics). */
  onPress?: () => void;
  /** Left-edge slot, absolutely positioned full-height (e.g. status stripe). */
  edge?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Card({ selected, onPress, edge, className, children }: CardProps) {
  const cls = `fs-card${selected ? ' fs-card--selected' : ''}${edge ? ' fs-card--edged' : ''}${
    className ? ` ${className}` : ''
  }`;
  if (onPress) {
    return (
      <button type="button" className={`${cls} fs-card--press`} onClick={onPress}>
        {edge}
        {children}
      </button>
    );
  }
  return (
    <div className={cls}>
      {edge}
      {children}
    </div>
  );
}
