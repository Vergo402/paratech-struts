import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import { useHasRailNav } from '@ui/primitives';

/**
 * SettingsLayout — the master/detail shell for the Settings sub-pages (B). The
 * detail pane is the routed `<Outlet/>`. Desktop nav lives in the SideNav rail
 * (SettingsRailNav); phone nav is the SettingsPageList at the /settings index, so
 * on phone a sub-page shows a back link to the list. RequireDepartment wraps this
 * once in the router, so every sub-page inherits the gate.
 */
export function SettingsLayout() {
  const rail = useHasRailNav();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const atIndex = pathname === '/settings' || pathname === '/settings/';

  return (
    <div className="fs-settings">
      {!rail && !atIndex && (
        <Link to="/settings" className="fs-settings-back">
          <span aria-hidden="true">‹</span> Settings
        </Link>
      )}
      <Outlet />
    </div>
  );
}
