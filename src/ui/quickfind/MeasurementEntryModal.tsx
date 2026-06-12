import * as RadioGroup from '@radix-ui/react-radio-group';
import { useEffect, useState } from 'react';
import { MAX_MEASUREMENT_EIGHTHS } from '@core/schema';
import { Modal, Fraction, eighthsToParts, tapHaptic } from '@ui/primitives';

/**
 * MeasurementEntryModal — the big-key gloved entry surface (KB-3, S10).
 * Phone only: ft + in SLOTS + a 56pt dialer keypad (1–9 / back 0 OK) + the
 * reduced-eighths strip. Digits type into the active slot — the first press
 * after focusing a slot replaces its value, later presses append. The strip
 * sets the fraction (mirrored live in the inches slot); OK commits and closes.
 *
 * No symbol keys: the free-text grammar (5' 8-5/8") is parseMeasurement's job
 * on desktop hardware keyboards, never the gloved keypad. A form modal, not a
 * sheet — slots + keypad + strip exceed the 60vh sheet cap, and sheet.md sends
 * >60vh forms to the full-screen-form modal so every key stays visible.
 */
export interface MeasurementEntryModalProps {
  open: boolean;
  onClose: () => void;
  value: number; // Current value in eighths
  onChange: (eighths: number) => void;
  maxEighths?: number;
  label?: string;
}

const EIGHTHS = [0, 1, 2, 3, 4, 5, 6, 7] as const;
const DIGIT_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
] as const;
/** Slot caps: feet 2 digits (30 ft ceiling); inches 3, so pure-inches entry (e.g. 360) works. */
const MAX_DIGITS = { ft: 2, in: 3 } as const;

export function MeasurementEntryModal({
  open,
  onClose,
  value,
  onChange,
  maxEighths = MAX_MEASUREMENT_EIGHTHS,
  label = 'Measurement',
}: MeasurementEntryModalProps) {
  const [feet, setFeet] = useState('0');
  const [inches, setInches] = useState('0');
  const [eighth, setEighth] = useState(0);
  const [active, setActive] = useState<'ft' | 'in'>('ft');
  const [fresh, setFresh] = useState(true);
  const [over, setOver] = useState(false);

  // Seed the draft from the committed value each time the modal opens.
  useEffect(() => {
    if (!open) return;
    const p = eighthsToParts(value);
    setFeet(String(p.feet));
    setInches(String(p.inches));
    setEighth(Math.abs(value) % 8);
    setActive('ft');
    setFresh(true);
    setOver(false);
  }, [open, value]);

  const focusSlot = (slot: 'ft' | 'in') => {
    tapHaptic();
    setActive(slot);
    setFresh(true);
  };

  const pressDigit = (d: string) => {
    tapHaptic();
    setOver(false);
    const [cur, set] = active === 'ft' ? [feet, setFeet] : [inches, setInches];
    if (fresh || cur === '0') {
      set(d);
      setFresh(false);
      return;
    }
    if (cur.length >= MAX_DIGITS[active]) return; // slot full — ignore the press
    set(cur + d);
  };

  const pressBack = () => {
    tapHaptic();
    setOver(false);
    const [cur, set] = active === 'ft' ? [feet, setFeet] : [inches, setInches];
    set(cur.slice(0, -1) || '0');
    setFresh(false);
  };

  const pressOk = () => {
    tapHaptic();
    const next = Number(feet) * 96 + Number(inches) * 8 + eighth;
    if (next > maxEighths) {
      setOver(true); // stay open — the operator corrects the slots
      return;
    }
    onChange(next);
    onClose();
  };

  const frac = eighthsToParts(eighth);

  return (
    <Modal open={open} onClose={onClose} title={label} variant="form">
      <div className="fs-meas-entry">
        {/* ft + in slots — tap a slot, the keypad types into it */}
        <div className="fs-meas-slots">
          <button
            type="button"
            className="fs-meas-slot"
            aria-pressed={active === 'ft'}
            onClick={() => focusSlot('ft')}
          >
            <span className="fs-field-label">Feet</span>
            <span className="fs-meas-slot-value">{feet}′</span>
          </button>
          <button
            type="button"
            className="fs-meas-slot"
            aria-pressed={active === 'in'}
            onClick={() => focusSlot('in')}
          >
            <span className="fs-field-label">Inches</span>
            <span className="fs-meas-slot-value">
              {inches}
              {eighth > 0 && <Fraction n={frac.n} d={frac.d} />}″
            </span>
          </button>
        </div>

        {/* 56pt dialer keypad — digits only; back/0/OK on the bottom row */}
        <div className="fs-meas-keypad">
          {DIGIT_ROWS.map((row, rowIdx) => (
            <div key={rowIdx} className="fs-keypad-row">
              {row.map((d) => (
                <button key={d} type="button" className="fs-keypad-btn" onClick={() => pressDigit(d)}>
                  {d}
                </button>
              ))}
            </div>
          ))}
          <div className="fs-keypad-row">
            <button
              type="button"
              className="fs-keypad-btn fs-keypad-backspace"
              onClick={pressBack}
              aria-label="Delete last digit"
            >
              back
            </button>
            <button type="button" className="fs-keypad-btn" onClick={() => pressDigit('0')}>
              0
            </button>
            <button
              type="button"
              className="fs-keypad-btn fs-keypad-commit"
              onClick={pressOk}
              aria-label="Confirm measurement"
            >
              OK
            </button>
          </div>
        </div>

        {/* Eighths strip — sets the fraction part of the draft */}
        <div className="fs-meas-entry-strip">
          <span className="fs-field-label">Fraction</span>
          <RadioGroup.Root
            className="fs-eighths-strip"
            aria-label={`${label} — eighths of an inch`}
            value={String(eighth)}
            onValueChange={(v) => {
              tapHaptic();
              setEighth(Number(v));
              setOver(false);
            }}
          >
            {EIGHTHS.map((n) => {
              const p = eighthsToParts(n);
              return (
                <RadioGroup.Item
                  key={n}
                  className="fs-eighth"
                  value={String(n)}
                  aria-label={n === 0 ? 'zero eighths' : `${p.n}/${p.d} inch`}
                >
                  {n === 0 ? '0' : <Fraction n={p.n} d={p.d} />}
                </RadioGroup.Item>
              );
            })}
          </RadioGroup.Root>
        </div>

        {over && (
          <span className="fs-field-msg fs-field-msg--error" role="status">
            Maximum opening is 30 ft ({maxEighths / 8} inches)
          </span>
        )}
      </div>
    </Modal>
  );
}
