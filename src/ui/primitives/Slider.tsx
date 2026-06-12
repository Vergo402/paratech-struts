import { useRef, useState } from 'react';
import { commitHaptic } from './haptics';

/**
 * Slider — slide-to-commit (slider.md / ADR-010). Commits ONE discrete
 * lifecycle step, never a value (FieldShore ships no value-range slider).
 * The gesture is deliberate by construction: a 1:1 drag past the commit
 * threshold, resistant to ghost taps on a wet screen. Advance slides
 * rightward; step-back mirrors leftward and reads as secondary. Always
 * reversible from the card — reversal is a normal slide, not a special
 * animation. The slide gesture is the ONLY commit path (ADR-026, the Phase H
 * KB-5 ruling): no button twin, no hidden AT/keyboard equivalent — a
 * deliberate accessibility exception, recorded with its trade-offs. When
 * disabled, the gate reason renders as a visible line under the track.
 */
export interface SliderProps {
  /** The full next step in words — "Slide to set Runner". Never truncated. */
  label: string;
  direction?: 'advance' | 'stepback';
  onCommit: () => void;
  disabled?: boolean;
  /** Why the slide is disabled — a visible .fs-slide-reason line under the track. */
  disabledReason?: string;
  /** Track fill revealed by travel — typically the target status bg token. */
  revealColor?: string;
}

/** Travel fraction past which release commits. Exported pure for tuning + tests.
 *  Finalized at 0.6 in the S12 slice (slider.md left the exact proportion open). */
export function shouldCommit(offsetPx: number, trackPx: number, threshold = 0.6): boolean {
  if (trackPx <= 0) return false;
  return offsetPx / trackPx >= threshold;
}

export function Slider({
  label,
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
  // Fill reaches the thumb CENTRE as it travels: track inset (4px) + half the
  // knob. Knobs differ by role — 44px advance / 36px step-back — so the nudge
  // past the offset is half each (22 / 18). (S12 handoff slide geometry.)
  const fillNudge = direction === 'advance' ? 22 : 18;

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
            width: offset > 0 ? `calc(${offset}px + var(--space-1) + ${fillNudge}px)` : 0,
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
      {/* The gate reason stays visible at full strength — only the track fades. */}
      {disabled && disabledReason && <span className="fs-slide-reason">{disabledReason}</span>}
    </div>
  );
}
