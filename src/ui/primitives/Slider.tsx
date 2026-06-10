import { useRef, useState } from 'react';
import { Button } from './Button';
import { commitHaptic } from './haptics';

/**
 * Slider — slide-to-commit (slider.md / ADR-010). Commits ONE discrete
 * lifecycle step, never a value (FieldShore ships no value-range slider).
 * The gesture is deliberate by construction: a 1:1 drag past the commit
 * threshold, resistant to ghost taps on a wet screen. Advance slides
 * rightward; step-back mirrors leftward and reads as secondary. Always
 * reversible from the card — reversal is a normal slide, not a special
 * animation. Per settled gate follow-up #37, a plain VISIBLE button
 * committing the same step renders below the track on every surface (not
 * AT-only) — structural here so no call site can forget it.
 */
export interface SliderProps {
  /** The full next step in words — "Slide to set Runner". Never truncated. */
  label: string;
  /** #37 plain-button label; defaults to Advance / Step back by direction. */
  buttonLabel?: string;
  direction?: 'advance' | 'stepback';
  onCommit: () => void;
  disabled?: boolean;
  /** Why the slide is disabled — rendered adjacent by the #37 button (button.md disabled-with-reason). */
  disabledReason?: string;
  /** Track fill revealed by travel — typically the target status bg token. */
  revealColor?: string;
}

/** Travel fraction past which release commits. Exported pure for tuning + tests. */
export function shouldCommit(offsetPx: number, trackPx: number, threshold = 0.8): boolean {
  if (trackPx <= 0) return false;
  return offsetPx / trackPx >= threshold;
}

export function Slider({
  label,
  buttonLabel,
  direction = 'advance',
  onCommit,
  disabled = false,
  disabledReason,
  revealColor,
}: SliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ pointerId: number; startX: number; travelPx: number } | null>(null);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  const sign = direction === 'advance' ? 1 : -1;

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    const track = trackRef.current?.getBoundingClientRect();
    const thumb = thumbRef.current?.getBoundingClientRect();
    const travelPx = track && thumb ? Math.max(0, track.width - thumb.width - 8) : 0;
    drag.current = { pointerId: e.pointerId, startX: e.clientX, travelPx };
    setDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag.current || e.pointerId !== drag.current.pointerId) return;
    const raw = (e.clientX - drag.current.startX) * sign;
    setOffset(Math.min(Math.max(0, raw), drag.current.travelPx)); // 1:1, clamped
  };
  const onPointerEnd = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag.current || e.pointerId !== drag.current.pointerId) return;
    const { travelPx } = drag.current;
    drag.current = null;
    setDragging(false);
    const committed = shouldCommit(offset, travelPx);
    setOffset(0); // snap back (CSS micro transition when not dragging)
    if (committed) {
      commitHaptic();
      onCommit();
    }
  };

  return (
    <div className={`fs-slide fs-slide--${direction}${disabled ? ' fs-slide--disabled' : ''}`}>
      <div ref={trackRef} className="fs-slide-track">
        <span
          className="fs-slide-fill"
          style={{
            width: offset > 0 ? `calc(${offset}px + var(--space-1) + 32px)` : 0,
            background: revealColor ?? 'var(--accent-subtle)',
          }}
          aria-hidden="true"
        />
        <button
          ref={thumbRef}
          type="button"
          className={`fs-slide-thumb${dragging ? ' fs-slide-thumb--dragging' : ''}`}
          style={{ transform: `translateX(${offset * sign}px)` }}
          aria-hidden="true"
          tabIndex={-1}
          disabled={disabled}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
        >
          {direction === 'advance' ? '›' : '‹'}
        </button>
        <span className="fs-slide-label">{label}</span>
      </div>
      {/* #37 — the plain visible equivalent; same commit, keyboard/AT path */}
      <Button
        variant="secondary"
        size="standard"
        disabled={disabled}
        disabledReason={disabledReason}
        onPress={onCommit}
      >
        {buttonLabel ?? (direction === 'advance' ? 'Advance' : 'Step back')}
      </Button>
    </div>
  );
}
