import { useRouterState } from '@tanstack/react-router';
import { SETTINGS_PAGES } from './settingsPages';

/** Build identity — lives in @core/version; re-exported here for existing importers
 *  (SideNav's rail footer). The header itself no longer wears the version tag: it was
 *  dev chrome on every screen (craft.md §6); build identity now lives in Settings'
 *  footer + About. */
export { APP_VERSION } from '@core/version';

const TITLES: Record<string, string> = {
  '/quickfind': 'FieldShore',
  '/operations': 'Operations',
  '/inventory': 'Inventory',
  '/command': 'Command',
  '/settings': 'Settings',
  '/gallery': 'Gallery',
};

/** Chrome owns the title on phone (craft.md §6) — including nested pages. Settings
 *  sub-pages resolve their name from SETTINGS_PAGES (single source with the nav);
 *  only a genuinely unknown path falls back to the brand lockup. */
function titleFor(pathname: string): string {
  const exact = TITLES[pathname];
  if (exact) return exact;
  const trimmed = pathname.replace(/\/+$/, '');
  const sub = SETTINGS_PAGES.find((p) => p.to === trimmed);
  return sub?.label ?? TITLES[trimmed] ?? 'FieldShore';
}

/**
 * AppHeader — the command header framing every screen (design-system
 * AppHeader): the screen title at headline-1 with a small mono version tag,
 * on the card surface above the scroll pane. The department subtitle slot
 * exists in the design; the guest-first slice has no department yet, so it
 * stays empty until the join flow lands (Phase I).
 *
 * On Quick Find the title is the BRAND LOCKUP, rendered as HTML-styled text
 * per logo-and-mark.md — "Field" in primary ink, "Shore" in the accent, both
 * 700 — never the wordmark.svg's baked-in text.
 */
export function AppHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const title = titleFor(pathname);
  return (
    <header className="fs-header">
      {title === 'FieldShore' ? (
        <span className="fs-header-title fs-header-brand">
          Field<b>Shore</b>
        </span>
      ) : (
        <span className="fs-header-title">{title}</span>
      )}
    </header>
  );
}
