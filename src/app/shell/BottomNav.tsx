import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

/**
 * BottomNav — the fixed 5-tab spine (ADR-014 / 00-ia-foundation.md). Always
 * visible, never animates, plain links with aria-current — navigation is NOT
 * a tablist/segmented (those are selection primitives). Targets ≥56pt with
 * safe-area inset padding. The /gallery dev surface is deliberately absent —
 * it's reached by URL only.
 */
function NavIcon({ d }: { d: string }) {
  return (
    <svg className="fs-nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const TABS: { to: string; label: string; icon: ReactNode; exact?: boolean }[] = [
  // magnifier — measure & find
  { to: '/quickfind', label: 'Quick Find', icon: <NavIcon d="M9 4 a5 5 0 1 0 0 10 a5 5 0 1 0 0-10 M13 13 L17 17" /> },
  // board lanes
  { to: '/operations', label: 'Operations', icon: <NavIcon d="M3 4 H17 M3 8 H17 M3 12 H12 M3 16 H9" /> },
  // crate
  { to: '/inventory', label: 'Inventory', icon: <NavIcon d="M3 7 L10 3 L17 7 V15 L10 19 L3 15 Z M3 7 L10 11 L17 7 M10 11 V19" /> },
  // command star
  { to: '/command', label: 'Command', icon: <NavIcon d="M10 3 V8 M10 8 L5 16 M10 8 L15 16 M4 16 H16" /> },
  // gear
  { to: '/settings', label: 'Settings', icon: <NavIcon d="M10 7 a3 3 0 1 0 0 6 a3 3 0 1 0 0-6 M10 2 V4 M10 16 V18 M3 10 H5 M15 10 H17 M5 5 L6.5 6.5 M13.5 13.5 L15 15 M15 5 L13.5 6.5 M6.5 13.5 L5 15" /> },
];

export function BottomNav() {
  return (
    <nav className="fs-nav" aria-label="Main">
      {TABS.map((tab) => (
        <Link
          key={tab.to}
          to={tab.to}
          className="fs-nav-link"
          activeProps={{ 'aria-current': 'page', className: 'fs-nav-link fs-nav-link--active' }}
          activeOptions={{ exact: tab.exact ?? false }}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </Link>
      ))}
    </nav>
  );
}
