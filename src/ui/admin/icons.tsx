import type { CSSProperties } from 'react';

// Shared admin-screen icons (User Manager + Audit Log). The lock takes an optional
// style so the Audit Log can pin it in a flex row (flex: 0 0 auto) without a copy.

export function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M13 5l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LockIcon({ style }: { style?: CSSProperties }) {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true" style={style}>
      <rect x="2.5" y="5.5" width="8" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4 5.5V4a2.5 2.5 0 015 0v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

// The #439 starter-password key — the member-row badge + the add-sheet notice.
export function KeyIcon({ style }: { style?: CSSProperties }) {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true" style={style}>
      <circle cx="4.25" cy="4.25" r="2.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6.2 6.2l4.8 4.8M9 9l1.6-1.6M10.6 10.6l1.2-1.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
