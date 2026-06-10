/**
 * WarningGate — the persistent safety disclosure (warning-gate.md, matrix
 * K-11). One primitive, three uses: unrated zone (deployable WITH explicit
 * acknowledgment), over capacity (deploy path closed — the gate explains why),
 * and the standing liability disclaimer. It rides the result for as long as
 * the result is on screen: no timer, no dismiss, no disclosure-collapse.
 * Danger is an accent and a word, never an alarm (Principle 3). The
 * acknowledgment unlocks the ACTION and keeps the DISCLOSURE — engaging it
 * means "I have seen this," not "dismiss this." Destructive confirmation is
 * the modal's job, never this primitive's.
 */

/** The exact doctrine sentences (voice-and-tone.md) — verbatim, never softened. */
export const GATE_COPY = {
  unrated:
    'LongShore above 16 ft (192″) is not rated by Paratech — rescue engineering consultation required.',
  'over-capacity':
    'Load exceeds rated capacity at the 4:1 safety factor — this strut cannot be deployed for this opening.',
  disclaimer: 'Planning aid, not an engineering certification.',
} as const;

export type WarningGateProps =
  | {
      use: 'unrated';
      /** Parent owns the ack state and derives its deploy button's disabled from it. */
      acknowledged: boolean;
      onAcknowledge: () => void;
    }
  | { use: 'over-capacity' }
  | { use: 'disclaimer' };

function WarningGlyph() {
  return (
    <svg
      className="fs-gate-glyph"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 2 L14.5 13.5 H1.5 Z" />
      <line x1="8" y1="6.5" x2="8" y2="9.5" strokeLinecap="round" />
      <circle cx="8" cy="11.5" r="0.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function WarningGate(props: WarningGateProps) {
  if (props.use === 'disclaimer') {
    // The quieter footnote at the card foot — permanent, unsoftened.
    return <p className="fs-gate fs-gate--disclaimer">{GATE_COPY.disclaimer}</p>;
  }

  return (
    <div className={`fs-gate fs-gate--${props.use}`} role="alert">
      <div className="fs-gate-row">
        <WarningGlyph />
        <p className="fs-gate-caveat">{GATE_COPY[props.use]}</p>
      </div>
      {props.use === 'unrated' && (
        <button
          type="button"
          className="fs-gate-ack"
          role="checkbox"
          aria-checked={props.acknowledged}
          onClick={props.onAcknowledge}
        >
          <span className="fs-gate-ack-box" aria-hidden="true">
            {props.acknowledged ? '✓' : ''}
          </span>
          Team acknowledges the unrated zone
        </button>
      )}
    </div>
  );
}
