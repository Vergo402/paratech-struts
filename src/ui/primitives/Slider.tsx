import { useRef, useState } from 'react';
import { commitHaptic } from './haptics';

/**
 * Slider — slide-to-commit (slider.md / ADR-010). Commits ONE discrete
 * lifecycle step, never a value (FieldShore ships no value-range slider).
 * The gesture is deliberate by construction: a 1:1 drag past the commit
 * threshold, resistant to ghost taps on a wet screen. The whole TRACK is the
 * drag surface (S12 field review — gloved fingers miss a 36–44px knob); drag
 * distance is measured from the press point, so a far-end tap still moves
 * nothing and the threshold defense holds. Advance slides
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
  // The live travel, tracked imperatively. The commit decision MUST read this,
  // not the `offset` state: on a fast flick the final pointermove and the
  // pointerup land in one frame, so React hasn't re-rendered and the state
  // `offset` is still stale (0) when onPointerEnd runs — the drag would snap
  // back without committing. The ref is written synchronously in pointermove,
  // so it is always current at release regardless of render timing.
  const offsetRef = useRef(0);
  const [offset, setOffsetState] = useState(0);
  const [dragging, setDragging] = useState(false);
  // One setter keeps the ref and the render state in lockstep.
  const setOffset = (next: number) => {
    offsetRef.current = next;
    setOffsetState(next);
  };

  const sign = direction === 'advance' ? 1 : -1;
  // Fill reaches the thumb CENTRE as it travels: track inset (4px) + half the
  // knob. Knobs differ by role — 44px advance / 36px step-back — so the nudge
  // past the offset is half each (22 / 18). (S12 handoff slide geometry.)
  const fillNudge = direction === 'advance' ? 22 : 18;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    // The press IS the authoritative zero baseline. Reset travel here, every
    // drag — never trust the prior gesture to have cleaned up. An orphaned drag
    // (lost pointer capture, an interleaved second touch, a pointerup with a
    // mismatched id) leaves the last travel hot; without this reset a later bare
    // TAP would read it and commit with no deliberate slide — the ghost-tap this
    // primitive exists to prevent.
    setOffset(0);
    const track = trackRef.current?.getBoundingClientRect();
    const thumb = thumbRef.current?.getBoundingClientRect();
    const travelPx = track && thumb ? Math.max(0, track.width - thumb.width - 8) : 0;
    drag.current = { pointerId: e.pointerId, startX: e.clientX, travelPx };
    setDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current || e.pointerId !== drag.current.pointerId) return;
    const raw = (e.clientX - drag.current.startX) * sign;
    setOffset(Math.min(Math.max(0, raw), drag.current.travelPx)); // 1:1, clamped
  };
  const onPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current || e.pointerId !== drag.current.pointerId) return;
    const { travelPx } = drag.current;
    drag.current = null;
    setDragging(false);
    const committed = shouldCommit(offsetRef.current, travelPx); // live travel, not stale state
    setOffset(0); // snap back (CSS micro transition when not dragging)
    if (committed) {
      commitHaptic();
      onCommit();
    }
  };

  // A cancel (vertical-pan reclassification, palm rejection, an interrupting
  // second touch, edge-swipe) must NEVER commit — even past the threshold. Snap
  // back only; the drag is abandoned, not completed (audit W4).
  const onPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current || e.pointerId !== drag.current.pointerId) return;
    drag.current = null;
    setDragging(false);
    setOffset(0);
  };

  return (
    <div className={`fs-slide fs-slide--${direction}${disabled ? ' fs-slide--disabled' : ''}`}>
      {/* Pointer handlers live on the TRACK: a press anywhere in the channel
          starts the drag (thumb presses bubble here too). */}
      <div
        ref={trackRef}
        className="fs-slide-track"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerCancel}
      >
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
