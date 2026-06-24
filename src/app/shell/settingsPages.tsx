import type { ReactNode } from 'react';
import type { Permissions } from '@core/schema';

/**
 * The Settings sub-pages (B) — the single source for BOTH the phone page-list
 * (SettingsPageList) and the desktop rail sub-nav (SettingsRailNav), so the two
 * can never drift (mirrors navTabs.tsx). `show` gates an item by the viewer's
 * back-office permissions (ADR-017) + ICS command position; a member who can't
 * use a page never sees its nav entry (hide-not-grey, 50-settings.md).
 *
 * Inc 2 ships the pages that have content today; apparatus-types / data / about
 * join in Inc 4 with their content (no empty pages — Principle 11).
 */

export interface SettingsNavContext {
  perms: Permissions;
  canIncident: boolean;
}

export interface SettingsPage {
  to: string;
  label: string;
  icon: ReactNode;
  show: (ctx: SettingsNavContext) => boolean;
}

function SIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      className="fs-set-nav-icon"
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

export const SETTINGS_PAGES: SettingsPage[] = [
  {
    to: '/settings/account',
    label: 'Account',
    // user
    icon: (
      <SIcon>
        <circle cx="12" cy="8" r="4" />
        <path d="M5 21v-1a7 7 0 0114 0v1" />
      </SIcon>
    ),
    show: () => true,
  },
  {
    to: '/settings/appearance',
    label: 'Appearance',
    // sun / theme
    icon: (
      <SIcon>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
      </SIcon>
    ),
    show: () => true,
  },
  {
    to: '/settings/department',
    label: 'Department',
    // building
    icon: (
      <SIcon>
        <path d="M4 21V5l8-3 8 3v16M4 21h16M9 9h.01M15 9h.01M9 13h.01M15 13h.01M10 21v-4h4v4" />
      </SIcon>
    ),
    show: () => true,
  },
  {
    to: '/settings/data',
    label: 'Data management',
    // database
    icon: (
      <SIcon>
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
      </SIcon>
    ),
    show: ({ perms }) => perms.manageData || perms.manageInventory,
  },
  {
    to: '/settings/apparatus-types',
    label: 'Apparatus types',
    // truck
    icon: (
      <SIcon>
        <path d="M3 6h11v9H3zM14 9h4l3 3v3h-7zM7 18a2 2 0 100-4 2 2 0 000 4zM18 18a2 2 0 100-4 2 2 0 000 4z" />
      </SIcon>
    ),
    show: ({ perms }) => perms.manageSettings,
  },
  {
    to: '/settings/administration',
    label: 'Administration',
    // shield
    icon: (
      <SIcon>
        <path d="M12 3l8 3v6c0 4.5-3 7.5-8 9-5-1.5-8-4.5-8-9V6l8-3z" />
      </SIcon>
    ),
    show: ({ perms, canIncident }) => perms.manageUsers || perms.manageSettings || canIncident,
  },
  {
    to: '/settings/help',
    label: 'Help & reference',
    // life ring / help
    icon: (
      <SIcon>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3.5" />
        <path d="M5.5 5.5l4 4M14.5 14.5l4 4M18.5 5.5l-4 4M9.5 14.5l-4 4" />
      </SIcon>
    ),
    show: () => true,
  },
  {
    to: '/settings/about',
    label: 'About',
    // info
    icon: (
      <SIcon>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 16v-5M12 8h.01" />
      </SIcon>
    ),
    show: () => true,
  },
];
