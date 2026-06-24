import { Link } from '@tanstack/react-router';
import { TABS } from './navTabs';

/**
 * BottomNav — the fixed 5-tab spine on phone/tablet-portrait (ADR-014 /
 * 00-ia-foundation.md). Always visible, never animates, plain links with
 * aria-current — navigation is NOT a tablist/segmented (those are selection
 * primitives). Targets ≥56pt with safe-area inset padding. At ≥1024px the shell
 * swaps this for the left SideNav (same TABS). The /gallery dev surface is
 * deliberately absent — it's reached by URL only.
 */
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
