import type { ReactNode } from 'react';

/**
 * The five-tab spine (ADR-014 / 00-ia-foundation.md), shared by the phone
 * BottomNav and the desktop SideNav so the two navigations can never drift.
 *
 * Icons are the design-system 24×24 stroke-2 outline set (assets/icons/ — the
 * shipped v3 path data, Feather/Lucide-style): magnifier, clock, package, gear.
 * Command has no shipped icon (the 5th tab is the slice's ADR-014 addition) —
 * its mast glyph is drawn to the same grid and stroke.
 */
function NavIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      className="fs-nav-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export interface NavTab {
  to: string;
  label: string;
  icon: ReactNode;
  exact?: boolean;
  guestOnly?: boolean;
}

export const TABS: NavTab[] = [
  // magnifier (assets/icons/quick-find.svg)
  {
    to: '/quickfind',
    label: 'Quick Find',
    guestOnly: true,
    icon: (
      <NavIcon>
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </NavIcon>
    ),
  },
  // clock (assets/icons/operations.svg)
  {
    to: '/operations',
    label: 'Operations',
    icon: (
      <NavIcon>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4l3 3" />
      </NavIcon>
    ),
  },
  // package cube (assets/icons/inventory.svg)
  {
    to: '/inventory',
    label: 'Inventory',
    icon: (
      <NavIcon>
        <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4M4 7l8 4M4 7v10l8 4m0-10v10" />
      </NavIcon>
    ),
  },
  // box org chart (#392, Idea 392 variant B) — rectangles read as position
  // cards, exactly what the Command org chart draws. Same grid/stroke as the set.
  {
    to: '/command',
    label: 'Command',
    icon: (
      <NavIcon>
        <rect x="9" y="3" width="6" height="4.6" rx="1" />
        <rect x="3" y="16.4" width="6" height="4.6" rx="1" />
        <rect x="15" y="16.4" width="6" height="4.6" rx="1" />
        <path d="M12 7.6V12M6 16.4V13h12v3.4" />
      </NavIcon>
    ),
  },
  // gear (assets/icons/settings.svg)
  {
    to: '/settings',
    label: 'Settings',
    icon: (
      <NavIcon>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </NavIcon>
    ),
  },
];
