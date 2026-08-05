/**
 * Command-tab glyphs (#434 Stage 2c) — the emoji/dingbat characters (hourglass,
 * flag, warning triangle, carets, multiply sign, back angle) shipped as UI icons
 * rendered as platform color emoji and ignored the themed ink. Module-local inline
 * SVGs on the app idiom: 20×20 viewBox, currentColor stroke, aria-hidden (the
 * row/button text carries the meaning).
 */

export function ChevronRightIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M8 6L12 10L8 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BackChevronIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M12 6L8 10L12 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Rollup expand/collapse caret — `open` rotates right → down. */
export function CaretIcon({ open }: { open?: boolean }) {
  return (
    <svg
      className="fs-rollup-caret"
      width="14"
      height="14"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      style={open ? { transform: 'rotate(90deg)' } : undefined}
    >
      <path d="M8 6L12 10L8 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AlertIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 3.2L18 16.5H2L10 3.2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 8V11.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="10" cy="14" r="0.9" fill="currentColor" />
    </svg>
  );
}

export function FlagIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 17V3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M5 4H14.5L12.5 7L14.5 10H5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PendingClockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 6.5V10L12.5 11.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ClearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M6 6L14 14M14 6L6 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4.5 10.5L8.5 14L15.5 6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Safety Officer chip glyph (#487) — a shield outline, matches the 20×20/
 *  currentColor/aria-hidden idiom of the rest of this file. */
export function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 2.5L16.5 5V9.5C16.5 13.6 13.9 16.7 10 17.5C6.1 16.7 3.5 13.6 3.5 9.5V5L10 2.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Org-chart entry-row glyph — a three-node tree. */
export function OrgGlyphIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="7" y="3" width="6" height="4.5" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2.5" y="12.5" width="6" height="4.5" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11.5" y="12.5" width="6" height="4.5" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 7.5V10M10 10H5.5V12.5M10 10H14.5V12.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
