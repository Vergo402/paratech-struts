import { useRef, useState } from 'react';
import { commitHaptic } from './haptics';
import { Button } from './Button';
import { useHasMouse } from './useMediaQuery';

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
 * animation. On TOUCH the slide gesture is the ONLY commit path (ADR-026, the
 * Phase H KB-5 ruling): no button twin, no hidden AT/keyboard equivalent — a
 * deliberate accessibility exception, recorded with its trade-offs. On a MOUSE
 * (desktop/laptop — useHasMouse) the slide swaps for a single tap-once button
 * INSTEAD of the track (ADR-034): a precise drag-past-threshold is clumsy with a
 * pointer and the wet-glove ghost-tap risk the slide defends against is gone, so
 * the button is the right control there — not a twin, the slide is absent. When
 * disabled, the gate reason renders as a visible line under the track/button.
 */
export interface SliderProps {
  /** The full next step in words — "Slide to set Runner". Never truncated. */
  label: string;
  direction?: 'advance' | 'stepback';
  onCommit: () => void;
  disabled?: boolean;
  /** Why the slide is disabled — a visible .fs-slide-reason line under the track. */
  disabledReason?: string;
  /**
   * Status tone for the WHOLE bar (Alex, 2026-06-19): the status id whose hue the
   * track + fill wear at rest — destination for advance, prior for step-back — so
   * where the move lands is obvious at a glance (v3 colored its move buttons). Adds
   * `fs-slide--toned is-{tone}`; the gold/elevated knob stays as the grip. A
   * DELIBERATE, recorded deviation from the one-gold-accent norm for the slider
   * (flag for the Phase J doctrine audit, sibling of #346). Omit → neutral fill.
   */
  tone?: string;
}

/** Travel fraction past which release commits. Exported pure for tuning + tests.
 *  Finalized at 0.6 in the S12 slice (slider.md left the exact proportion open). */
export function shouldCommit(offsetPx: number, trackPx: number, threshold = 0.6): boolean {
  if (trackPx <= 0) return false;
  return offsetPx / trackPx >= threshold;
}

/**
 * The mouse-branch button label, derived from the slide label so all call sites
 * stay single-labelled: "Slide to set Wood Shore Secured" → "Set Wood Shore Secured",
 * "Slide back to Cutting Station" → "Back to Cutting Station", "Slide back — clear Cut Done" →
 * "Clear Cut Done".
 * ponytail: prefix-strip — labels MUST keep the "Slide to…/Slide back…"
 * convention; add an explicit prop if a label ever diverges.
 */
export function buttonLabelFrom(label: string): string {
  const s = label
    .replace(/^Slide to /, '')
    .replace(/^Slide back to /, 'Back to ')
    .replace(/^Slide back — /, '');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function Slider({
  label,
  direction = 'advance',
  onCommit,
  disabled = false,
  disabledReason,
  tone,
}: SliderProps) {
  const hasMouse = useHasMouse();
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

  // Status-tone hook: drives the whole-bar tint (track + fill) off --sp-solid via
  // the global .is-{status} hooks. The tone is the destination (advance) / prior
  // (step-back) status the move lands on.
  const toneCls = tone ? ` fs-slide--toned is-${tone}` : '';
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

  // Mouse branch (ADR-034): the slide swaps for a single tap-once button INSTEAD
  // of the drag track — primary on advance, secondary on the quieter step-back.
  // The Button carries its own disabled + disabledReason; no track, no haptic
  // (haptics are a touch affordance). Wrapped in .fs-slide so it sits in the
  // same column slot as a slide would.
  if (hasMouse) {
    // A status step-back collapses to a compact "Back" on mouse (the advance
    // button names the forward move; the back is its reverse, and the card lays
    // the two on one row where the back column is narrow). A non-status step-back
    // (e.g. "Clear Cut Done") keeps its real label — it isn't a plain reversal.
    const mouseLabel =
      direction === 'stepback' && /^Slide back to /.test(label) ? 'Back' : buttonLabelFrom(label);
    return (
      <div className={`fs-slide fs-slide--${direction}${toneCls}`}>
        <Button
          variant={direction === 'advance' ? 'primary' : 'secondary'}
          fullWidth
          disabled={disabled}
          disabledReason={disabledReason}
          onPress={onCommit}
        >
          {mouseLabel}
        </Button>
      </div>
    );
  }

  return (
    <div className={`fs-slide fs-slide--${direction}${disabled ? ' fs-slide--disabled' : ''}${toneCls}`}>
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
