import { Link, Navigate } from '@tanstack/react-router';
import { useHasRailNav } from '@ui/primitives';
import { usePermissions, useAuditAccess, useSession, useDepartment, useRoles } from '@ui/hooks';
import { InlineSegmented } from '@ui/picker';
import { APP_VERSION } from '@core/version';
import { useTheme, type ThemePreference } from '../../theme';
import { SETTINGS_PAGES, type SettingsPage } from '../../shell/settingsPages';

/**
 * The /settings index. Desktop carries the nav in the rail, so the index just
 * forwards to the default page (Account). Phone has no rail, so the index IS the
 * navigation — composed per craft.md (Stage 1 exemplar, #431): an identity card
 * (who/where + sync state — the sign-in path's real home), the theme picker inline
 * (the one Appearance control worth zero taps on scene), grouped card rows with
 * one-line descriptions, and a quiet footer carrying build identity + help.
 * Permission gating is unchanged — rows come from SETTINGS_PAGES.show (hide-not-grey).
 * The media branch lives here (a component), not in beforeLoad (not React).
 */

const THEME_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'sunlight', label: 'Sunlight' },
] as const;

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function PageRow({ page }: { page: SettingsPage }) {
  return (
    <li>
      <Link to={page.to} className="fs-set-row">
        <span className="fs-set-row-icon" aria-hidden="true">
          {page.icon}
        </span>
        <span className="fs-set-row-text">
          <span className="fs-set-row-label">{page.label}</span>
          {page.description && <span className="fs-set-row-desc">{page.description}</span>}
        </span>
        <svg
          className="fs-set-row-chev"
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
  );
}

export function SettingsIndex() {
  const rail = useHasRailNav();
  const perms = usePermissions();
  const { canIncident } = useAuditAccess();
  const { identity } = useSession();
  const { department, role } = useDepartment();
  const roles = useRoles();
  const { preference, setPreference } = useTheme();

  if (rail) return <Navigate to="/settings/account" />;

  const ctx = { perms, canIncident };
  const pages = SETTINGS_PAGES.filter((p) => p.show(ctx));
  const deptPages = pages.filter((p) => p.group === 'department');
  const dataPages = pages.filter((p) => p.group === 'data');
  const appearancePage = pages.find((p) => p.group === 'appearance');
  const footerPages = pages.filter((p) => p.group === 'footer');

  const isMember = identity.kind === 'member';
  const displayName = isMember ? identity.displayName : null;
  const roleName = (role && roles[role]?.name) || role || '';

  // Broadcast can be active via the gallery; show NO pill selected then — never a
  // misleading "Dark" highlight (audit W8). '' matches no option → nothing checked.
  const pickerValue = (
    THEME_OPTIONS.some((o) => o.value === preference) ? preference : ''
  ) as ThemePreference & (typeof THEME_OPTIONS)[number]['value'];

  return (
    <div className="fs-set">
      {/* guest → straight to sign-in (the card IS the sign-in affordance);
          member → the account page */}
      <Link to={isMember ? '/settings/account' : '/auth'} className="fs-set-identity">
        <span className="fs-set-avatar" aria-hidden="true">
          {isMember ? initialsOf(displayName!) : '?'}
        </span>
        <span className="fs-set-identity-text">
          <span className="fs-set-identity-name">{isMember ? displayName : 'Guest on this device'}</span>
          <span className="fs-set-identity-sub">
            {isMember
              ? [department?.name, roleName].filter(Boolean).join(' · ') || 'Signed in'
              : 'Not syncing — work stays on this phone'}
          </span>
        </span>
        {!isMember && <span className="fs-set-signin">Sign in</span>}
      </Link>

      {appearancePage && (
        <section className="fs-set-section" aria-label="Appearance">
          <h2 className="fs-set-section-label">Appearance</h2>
          <div className="fs-set-card fs-set-card--theme">
            <InlineSegmented label="Theme" options={THEME_OPTIONS} value={pickerValue} onChange={setPreference} />
            <p className="fs-set-theme-note">
              Sunlight is built for direct sun on scene — thicker lines, black on white.
            </p>
            <ul className="fs-set-rows">
              <PageRow page={{ ...appearancePage, label: 'More appearance settings', description: 'Native controls' }} />
            </ul>
          </div>
        </section>
      )}

      {deptPages.length > 0 && (
        <section className="fs-set-section" aria-label="Department">
          <h2 className="fs-set-section-label">Department</h2>
          <div className="fs-set-card">
            <ul className="fs-set-rows">
              {deptPages.map((p) => (
                <PageRow key={p.to} page={p} />
              ))}
            </ul>
          </div>
        </section>
      )}

      {dataPages.length > 0 && (
        <section className="fs-set-section" aria-label="Data">
          <h2 className="fs-set-section-label">Data</h2>
          <div className="fs-set-card">
            <ul className="fs-set-rows">
              {dataPages.map((p) => (
                <PageRow key={p.to} page={p} />
              ))}
            </ul>
          </div>
        </section>
      )}

      {footerPages.length > 0 && (
        <section className="fs-set-section" aria-label="About">
          <h2 className="fs-set-section-label">About</h2>
          <div className="fs-set-card">
            <ul className="fs-set-rows">
              {footerPages.map((p) => (
                <PageRow
                  key={p.to}
                  page={p.to === '/settings/about' ? { ...p, description: `${APP_VERSION} · Updates` } : p}
                />
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
