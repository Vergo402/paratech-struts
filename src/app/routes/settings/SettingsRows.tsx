import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';

// The Settings sub-page row language (craft.md, Stage 1b #431): places to go and
// actions render as quiet card rows — name, one-line description, chevron (or an
// outward arrow for links that leave the app) — grouped under an uppercase label.
// One gold element per page; a row is accent ONLY when it's that page's primary.

export function SettingsGroup({
  label,
  description,
  children,
}: {
  label: string;
  /** Optional one-liner under the group label (caption tone). */
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="fs-set-section" aria-label={label}>
      <h2 className="fs-set-section-label">{label}</h2>
      {description && <p className="fs-set-group-desc">{description}</p>}
      <div className="fs-set-card">
        <ul className="fs-set-rows">{children}</ul>
      </div>
    </section>
  );
}

/** A non-interactive note line inside a group card (e.g. an empty state). */
export function SettingsNote({ children }: { children: ReactNode }) {
  return <li className="fs-set-note">{children}</li>;
}

export interface SettingsRowProps {
  label: string;
  description?: string;
  /** Exactly one of onPress / to / href (or none for a static row with trailing content). */
  onPress?: () => void;
  to?: string;
  href?: string;
  /** 'chevron' (default for interactive rows) · 'external' · 'check' · custom node · null for none. */
  trailing?: 'chevron' | 'external' | 'check' | ReactNode | null;
  destructive?: boolean;
  /** The page's single gold row (e.g. "Add custom title"). */
  accent?: boolean;
  disabled?: boolean;
  /** For selection rows (e.g. role focus) — sets aria-pressed. */
  pressed?: boolean;
}

function Trailing({ trailing }: { trailing: SettingsRowProps['trailing'] }) {
  if (trailing === null) return null;
  if (trailing === 'external') {
    return (
      <svg className="fs-set-row-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M7 17L17 7M9 7h8v8" />
      </svg>
    );
  }
  if (trailing === 'check') {
    return (
      <svg className="fs-set-row-chev fs-set-row-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  if (trailing === 'chevron' || trailing === undefined) {
    return (
      <svg className="fs-set-row-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 6l6 6-6 6" />
      </svg>
    );
  }
  return <span className="fs-set-row-trail">{trailing}</span>;
}

export function SettingsRow({
  label,
  description,
  onPress,
  to,
  href,
  trailing,
  destructive,
  accent,
  disabled,
  pressed,
}: SettingsRowProps) {
  const cls = [
    'fs-set-row',
    destructive && 'fs-set-row--danger',
    accent && 'fs-set-row--accent',
  ]
    .filter(Boolean)
    .join(' ');

  const body = (
    <>
      <span className="fs-set-row-text">
        <span className="fs-set-row-label">{label}</span>
        {description && <span className="fs-set-row-desc">{description}</span>}
      </span>
      <Trailing trailing={trailing} />
    </>
  );

  if (href) {
    return (
      <li>
        <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
          {body}
        </a>
      </li>
    );
  }
  if (to) {
    return (
      <li>
        <Link to={to} className={cls}>
          {body}
        </Link>
      </li>
    );
  }
  if (onPress) {
    return (
      <li>
        <button
          type="button"
          className={cls}
          onClick={onPress}
          disabled={disabled}
          aria-pressed={pressed}
        >
          {body}
        </button>
      </li>
    );
  }
  return <li className={cls}>{body}</li>;
}
