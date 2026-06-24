import { Fragment } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { TABS } from './navTabs';
import { APP_VERSION } from './AppHeader';
import { SettingsRailNav } from './SettingsRailNav';

/**
 * SideNav — the desktop (≥1024px) left rail that replaces the bottom tab bar
 * (useHasRailNav). Same TABS as BottomNav so the two can't drift; carries the
 * brand lockup at the top and the mono version tag at the foot. When the active
 * route is under /settings, the Settings sub-pages nest beneath the Settings tab
 * (SettingsRailNav) — the desktop master/detail nav. Plain links with
 * aria-current — navigation, not a tablist.
 */
export function SideNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const inSettings = pathname.startsWith('/settings');

  return (
    <nav className="fs-rail" aria-label="Main">
      <span className="fs-rail-brand">
        Field<b>Shore</b>
      </span>
      <div className="fs-rail-links">
        {TABS.map((tab) => (
          <Fragment key={tab.to}>
            <Link
              to={tab.to}
              className="fs-rail-link"
              activeProps={{ 'aria-current': 'page', className: 'fs-rail-link fs-rail-link--active' }}
              activeOptions={{ exact: tab.exact ?? false }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </Link>
            {tab.to === '/settings' && inSettings && <SettingsRailNav />}
          </Fragment>
        ))}
      </div>
      <span className="fs-rail-ver">{APP_VERSION}</span>
    </nav>
  );
}
