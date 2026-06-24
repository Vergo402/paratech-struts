import { useId, useState, type HTMLInputAutoCompleteAttribute } from 'react';

/**
 * TextField — the data-entry primitive (input.md). You TYPE an input; you PICK
 * a picker — a <select> is never an input in v4. The label is always visible
 * (a placeholder is a hint, never the label). Validation is inline and
 * specific: --danger border + an adjacent message naming the failure — never
 * color alone, never a toast (Principle 9 / Principle 3). No shadows.
 * The measurement field is NOT this primitive — see quickfind/MeasurementInput.
 *
 * type='password' is the secure-text variant (input.md): masked by default with
 * a labeled show/hide reveal — entering a password blind on a wet, sunlit phone
 * is error-prone, so the reveal is a field-usability basic, not a flourish.
 */
export interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Quiet helper line under the field. */
  helper?: string;
  /** Inline validation message — its presence marks the field invalid. */
  error?: string;
  /** 'password' masks the value and adds a show/hide reveal (input.md secure-text). */
  type?: 'text' | 'password';
  inputMode?: 'text' | 'numeric' | 'decimal' | 'search';
  maxLength?: number;
  autoComplete?: HTMLInputAutoCompleteAttribute;
  disabled?: boolean;
  /** 56pt operational (field default) vs 48pt non-operational. */
  size?: 'operational' | 'standard';
  /** Multi-line variant — renders a <textarea> (e.g. the feedback message). */
  multiline?: boolean;
  /** Visible rows for the multiline variant (default 4). */
  rows?: number;
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  helper,
  error,
  type = 'text',
  inputMode = 'text',
  maxLength,
  autoComplete,
  disabled = false,
  size = 'operational',
  multiline = false,
  rows = 4,
}: TextFieldProps) {
  const id = useId();
  const messageId = useId();
  const message = error ?? helper;
  const isPassword = type === 'password';
  const [revealed, setRevealed] = useState(false);
  const input = multiline ? (
    <textarea
      id={id}
      className={`fs-field-input fs-field-input--multiline${error ? ' fs-field-input--invalid' : ''}`}
      value={value}
      placeholder={placeholder}
      rows={rows}
      maxLength={maxLength}
      disabled={disabled}
      aria-invalid={error ? true : undefined}
      aria-describedby={message ? messageId : undefined}
      onChange={(e) => onChange(e.target.value)}
    />
  ) : (
    <input
      id={id}
      className={`fs-field-input ${size === 'operational' ? 'fs-field-input--op' : 'fs-field-input--std'}${
        error ? ' fs-field-input--invalid' : ''
      }`}
      type={isPassword && !revealed ? 'password' : 'text'}
      value={value}
      placeholder={placeholder}
      inputMode={inputMode}
      maxLength={maxLength}
      autoComplete={autoComplete}
      disabled={disabled}
      aria-invalid={error ? true : undefined}
      aria-describedby={message ? messageId : undefined}
      onChange={(e) => onChange(e.target.value)}
    />
  );
  return (
    <div className="fs-field">
      <label className="fs-field-label" htmlFor={id}>
        {label}
      </label>
      {isPassword ? (
        // ponytail: a text reveal beats an eye glyph in the field (legible with
        // gloves/sun, no icon asset) — swap to an icon later if design asks.
        <div className="fs-field-inputwrap">
          {input}
          <button
            type="button"
            className="fs-field-pw-toggle"
            aria-label={revealed ? 'Hide password' : 'Show password'}
            aria-pressed={revealed}
            disabled={disabled}
            onClick={() => setRevealed((r) => !r)}
          >
            {revealed ? 'Hide' : 'Show'}
          </button>
        </div>
      ) : (
        input
      )}
      {message && (
        <span id={messageId} className={`fs-field-msg${error ? ' fs-field-msg--error' : ''}`}>
          {message}
        </span>
      )}
    </div>
  );
}
