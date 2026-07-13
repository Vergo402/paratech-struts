import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { TABS } from './navTabs';
import { useSession } from '@ui/hooks';

/**
 * BottomNav — the fixed 5-tab spine on phone/tablet-portrait (ADR-014 /
 * 00-ia-foundation.md). Never animates, plain links with aria-current —
 * navigation is NOT a tablist/segmented (those are selection primitives).
 * Targets ≥56pt with safe-area inset padding. At ≥1024px the shell swaps this
 * for the left SideNav (same TABS). The /gallery dev surface is deliberately
 * absent — it's reached by URL only.
 *
 * #391 (Idea 391, variant A — pull-tab): dense field screens need maximum
 * vertical room, so a tab on the nav's top edge hides the whole bar and stays
 * reachable to bring it back. Explicit and predictable — nothing moves unless
 * deliberately operated (no auto-hide-on-scroll; the bar moving on its own is
 * riskier under gloves). Ephemeral by design: every launch starts expanded.
 */
export function BottomNav() {
  const [collapsed, setCollapsed] = useState(false);
  const { identity } = useSession();
  const guest = identity.kind === 'guest';
  const visibleTabs = guest ? TABS.filter((t) => t.guestOnly) : TABS;
  return (
    <div className={`fs-nav-wrap${collapsed ? ' fs-nav-wrap--collapsed' : ''}`}>
      <button
        type="button"
        className="fs-nav-handle"
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Show navigation' : 'Hide navigation'}
        onClick={() => setCollapsed((c) => !c)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 14l6-5 6 5" />
        </svg>
      </button>
      {!collapsed && (
        <nav className="fs-nav" aria-label="Main">
          {visibleTabs.map((tab) => (
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
          {/* Guest: sign-in rides the bar next to Quick Find — the screen's one gold
              action (mockup 2026-07-13). Members never see it. */}
          {guest && (
            <Link to="/auth" className="fs-nav-link fs-nav-link--signin">
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
                <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" />
              </svg>
              <span>Sign in</span>
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
