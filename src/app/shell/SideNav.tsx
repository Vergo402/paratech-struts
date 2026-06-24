import { Link } from '@tanstack/react-router';
import { TABS } from './navTabs';
import { APP_VERSION } from './AppHeader';

/**
 * SideNav — the desktop (≥1024px) left rail that replaces the bottom tab bar
 * (useHasRailNav). Same TABS as BottomNav so the two can't drift; carries the
 * brand lockup at the top and the mono version tag at the foot. Plain links with
 * aria-current — navigation, not a tablist. Phone/tablet-portrait never render
 * this (they keep BottomNav).
 */
export function SideNav() {
  return (
    <nav className="fs-rail" aria-label="Main">
      <span className="fs-rail-brand">
        Field<b>Shore</b>
      </span>
      <div className="fs-rail-links">
        {TABS.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            className="fs-rail-link"
            activeProps={{ 'aria-current': 'page', className: 'fs-rail-link fs-rail-link--active' }}
            activeOptions={{ exact: tab.exact ?? false }}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </Link>
        ))}
      </div>
      <span className="fs-rail-ver">{APP_VERSION}</span>
    </nav>
  );
}
