import * as RadioGroup from '@radix-ui/react-radio-group';
import { useState } from 'react';
import { MAX_MEASUREMENT_EIGHTHS } from '@core/schema';
import { Sheet, Fraction, MeasurementValue, eighthsToParts, tapHaptic } from '@ui/primitives';
import { parseMeasurement } from './parseMeasurement';

/**
 * MeasurementEntrySheet — the big-key gloved entry surface (KB-3, S10).
 * Phone: 56pt 3-col digit keypad + feet/inches slots + eighths strip.
 * Opens from the MeasurementInput readout (which becomes a button on touch).
 * Desktop: not used — MeasurementInput displays a focusable text field instead.
 *
 * The keypad lets the operator type freely; parsing happens on commit.
 * The eighths strip provides quick-adjust. Both paths commit via onChange.
 */
export interface MeasurementEntrySheetProps {
  open: boolean;
  onClose: () => void;
  value: number; // Current value in eighths
  onChange: (eighths: number) => void;
  maxEighths?: number;
  label?: string;
}

const EIGHTHS = [0, 1, 2, 3, 4, 5, 6, 7] as const;
const KEYPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['0', '.', '/', "'"],
] as const;

export function MeasurementEntrySheet({
  open,
  onClose,
  value,
  onChange,
  maxEighths = MAX_MEASUREMENT_EIGHTHS,
  label = 'Measurement',
}: MeasurementEntrySheetProps) {
  const [input, setInput] = useState('');
  const [bound, setBound] = useState<'min' | 'max' | null>(null);

  const apply = (next: number) => {
    if (next < 0) {
      setBound('min');
      onChange(0);
      return;
    }
    if (next > maxEighths) {
      setBound('max');
      onChange(Math.min(value, maxEighths));
      return;
    }
    setBound(null);
    onChange(next);
    onClose();
  };

  const onKeypadPress = (key: string) => {
    tapHaptic();
    if (key === 'backspace') {
      setInput((prev) => prev.slice(0, -1));
    } else if (key === 'submit') {
      const parsed = parseMeasurement(input);
      if (parsed !== null) {
        apply(parsed);
      } else {
        setBound('max'); // Generic parse failure
      }
    } else {
      setInput((prev) => prev + key);
    }
  };

  const onFractionChange = (eighth: number) => {
    tapHaptic();
    // Quick-adjust: set the fraction part only
    const base = (value - (value % 8)) * (eighth / (value % 8 || 1));
    apply(Math.floor(base) + eighth);
  };

  const boundMessage =
    bound === 'max'
      ? `Maximum opening is 30 ft (${maxEighths / 8} inches)`
      : bound === 'min'
        ? 'Measurement cannot go below 0 inches'
        : null;

  return (
    <Sheet open={open} onClose={onClose} title="Measurement">
      <div className="fs-meas-entry-sheet">
        {/* Display area: shows both the typed input and the current value */}
        <div className="fs-meas-entry-display">
          <div className="fs-meas-entry-input">
            {input ? (
              <span className="fs-meas-entry-text">{input}</span>
            ) : (
              <span className="fs-meas-entry-hint">Type or tap</span>
            )}
          </div>
          <div className="fs-meas-entry-current">
            <span className="fs-field-label">Current</span>
            <MeasurementValue eighths={value} form="feet-inches" />
          </div>
        </div>

        {/* Keypad: 56pt big keys for gloved entry */}
        <div className="fs-meas-keypad">
          {KEYPAD_ROWS.map((row, rowIdx) => (
            <div key={rowIdx} className="fs-keypad-row">
              {row.map((key) => (
                <button
                  key={key}
                  type="button"
                  className="fs-keypad-btn"
                  onClick={() => onKeypadPress(key)}
                  aria-label={
                    key === "'"
                      ? 'foot mark'
                      : key === '/'
                        ? 'fraction slash'
                        : key === '.'
                          ? 'decimal point'
                          : key
                  }
                >
                  {key}
                </button>
              ))}
            </div>
          ))}

          {/* Bottom row: backspace, commit, and space for symmetry */}
          <div className="fs-keypad-row">
            <button
              type="button"
              className="fs-keypad-btn fs-keypad-backspace"
              onClick={() => onKeypadPress('backspace')}
              aria-label="Delete last character"
            >
              back
            </button>
            <button
              type="button"
              className="fs-keypad-btn fs-keypad-commit"
              onClick={() => onKeypadPress('submit')}
              aria-label="Confirm measurement"
            >
              OK
            </button>
            <button
              type="button"
              className="fs-keypad-btn"
              disabled
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Eighths strip for quick-adjust */}
        <div className="fs-meas-entry-strip">
          <span className="fs-field-label">Fraction</span>
          <RadioGroup.Root
            className="fs-eighths-strip"
            aria-label={`${label} — eighths of an inch`}
            value={String(value % 8)}
            onValueChange={(v) => onFractionChange(Number(v))}
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

        {boundMessage && (
          <span className="fs-field-msg fs-field-msg--error" role="status">
            {boundMessage}
          </span>
        )}
      </div>
    </Sheet>
  );
}
