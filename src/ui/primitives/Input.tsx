import { useId, type HTMLInputAutoCompleteAttribute } from 'react';

/**
 * TextField — the data-entry primitive (input.md). You TYPE an input; you PICK
 * a picker — a <select> is never an input in v4. The label is always visible
 * (a placeholder is a hint, never the label). Validation is inline and
 * specific: --danger border + an adjacent message naming the failure — never
 * color alone, never a toast (Principle 9 / Principle 3). No shadows.
 * The measurement field is NOT this primitive — see quickfind/MeasurementInput.
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
  inputMode?: 'text' | 'numeric' | 'decimal' | 'search';
  maxLength?: number;
  autoComplete?: HTMLInputAutoCompleteAttribute;
  disabled?: boolean;
  /** 56pt operational (field default) vs 48pt non-operational. */
  size?: 'operational' | 'standard';
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  helper,
  error,
  inputMode = 'text',
  maxLength,
  autoComplete,
  disabled = false,
  size = 'operational',
}: TextFieldProps) {
  const id = useId();
  const messageId = useId();
  const message = error ?? helper;
  return (
    <div className="fs-field">
      <label className="fs-field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={`fs-field-input ${size === 'operational' ? 'fs-field-input--op' : 'fs-field-input--std'}${
          error ? ' fs-field-input--invalid' : ''
        }`}
        type="text"
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
      {message && (
        <span id={messageId} className={`fs-field-msg${error ? ' fs-field-msg--error' : ''}`}>
          {message}
        </span>
      )}
    </div>
  );
}
