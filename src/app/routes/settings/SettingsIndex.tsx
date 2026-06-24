import { Link, Navigate } from '@tanstack/react-router';
import { useHasRailNav } from '@ui/primitives';
import { usePermissions, useAuditAccess } from '@ui/hooks';
import { SETTINGS_PAGES } from '../../shell/settingsPages';

/**
 * The /settings index. Desktop carries the nav in the rail, so the index just
 * forwards to the default page (Account). Phone has no rail, so the index IS the
 * navigation — a tap-list of the permission-filtered pages that drills into each
 * (50-settings.md §Settings by context; the accepted settings_phone_list_drill mock).
 * The media branch lives here (a component), not in beforeLoad (not React).
 */
export function SettingsIndex() {
  const rail = useHasRailNav();
  const perms = usePermissions();
  const { canIncident } = useAuditAccess();

  if (rail) return <Navigate to="/settings/account" />;

  const pages = SETTINGS_PAGES.filter((p) => p.show({ perms, canIncident }));
  return (
    <div className="fs-settings-list">
      <h1 style={{ font: 'var(--type-headline-1)' }}>Settings</h1>
      <ul className="fs-settings-list-items">
        {pages.map((p) => (
          <li key={p.to}>
            <Link to={p.to} className="fs-settings-list-row">
              <span className="fs-settings-list-icon" aria-hidden="true">
                {p.icon}
              </span>
              <span className="fs-settings-list-label">{p.label}</span>
              <svg
                className="fs-settings-list-chev"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 6l6 6-6 6" />
              </svg>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
