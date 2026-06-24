import { Link } from '@tanstack/react-router';
import { usePermissions, useAuditAccess } from '@ui/hooks';
import { SETTINGS_PAGES } from './settingsPages';

/**
 * SettingsRailNav — the Settings sub-pages nested under the Settings tab in the
 * desktop SideNav (the accepted settings_sidenav_account_landing mock). Rendered
 * by SideNav only when the active route is under /settings, so the rail stays a
 * flat 5-tab list everywhere else. Owns the permission hooks so SideNav stays
 * data-light; `exact` highlighting marks just the active sub-page.
 */
export function SettingsRailNav() {
  const perms = usePermissions();
  const { canIncident } = useAuditAccess();
  const pages = SETTINGS_PAGES.filter((p) => p.show({ perms, canIncident }));

  return (
    <div className="fs-rail-sub" role="group" aria-label="Settings">
      {pages.map((p) => (
        <Link
          key={p.to}
          to={p.to}
          className="fs-rail-sublink"
          activeProps={{ 'aria-current': 'page', className: 'fs-rail-sublink fs-rail-sublink--active' }}
          activeOptions={{ exact: true }}
        >
          {p.icon}
          <span>{p.label}</span>
        </Link>
      ))}
    </div>
  );
}
