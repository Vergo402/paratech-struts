import { Fragment, useState } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { TABS } from './navTabs';
import { APP_VERSION } from './AppHeader';
import { SettingsRailNav } from './SettingsRailNav';

const RAIL_SLIM_KEY = 'fieldshore_rail_slim';

function readSlim(): boolean {
  try {
    return localStorage.getItem(RAIL_SLIM_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * SideNav — the desktop (≥1024px) left rail that replaces the bottom tab bar
 * (useHasRailNav). Same TABS as BottomNav so the two can't drift; carries the
 * brand lockup at the top and the mono version tag at the foot. When the active
 * route is under /settings, the Settings sub-pages nest beneath the Settings tab
 * (SettingsRailNav) — the desktop master/detail nav. Plain links with
 * aria-current — navigation, not a tablist.
 *
 * #391 (Idea 391): the rail collapses to icons-only via the toggle at its foot
 * (same principle as the phone pull-tab — deliberate, never automatic). The
 * choice persists (localStorage): a rail width is a workstation preference,
 * not a per-view de-clutter.
 */
export function SideNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const inSettings = pathname.startsWith('/settings');
  const [slim, setSlim] = useState(readSlim);

  const toggleSlim = () =>
    setSlim((s) => {
      try {
        localStorage.setItem(RAIL_SLIM_KEY, s ? '' : '1');
      } catch {
        /* private-mode storage failure — the toggle still works this session */
      }
      return !s;
    });

  return (
    <nav className={`fs-rail${slim ? ' fs-rail--slim' : ''}`} aria-label="Main">
      <span className="fs-rail-brand">
        {slim ? (
          <>
            F<b>S</b>
          </>
        ) : (
          <>
            Field<b>Shore</b>
          </>
        )}
      </span>
      <div className="fs-rail-links">
        {TABS.map((tab) => (
          <Fragment key={tab.to}>
            <Link
              to={tab.to}
              className="fs-rail-link"
              activeProps={{ 'aria-current': 'page', className: 'fs-rail-link fs-rail-link--active' }}
              activeOptions={{ exact: tab.exact ?? false }}
              title={slim ? tab.label : undefined}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </Link>
            {tab.to === '/settings' && inSettings && !slim && <SettingsRailNav />}
          </Fragment>
        ))}
      </div>
      <span className="fs-rail-ver">{APP_VERSION}</span>
      <button
        type="button"
        className="fs-rail-toggle"
        aria-expanded={!slim}
        aria-label={slim ? 'Expand navigation' : 'Collapse navigation to icons'}
        onClick={toggleSlim}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14 6l-5 6 5 6" />
        </svg>
        <span>Collapse</span>
      </button>
    </nav>
  );
}
