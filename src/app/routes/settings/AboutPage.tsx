import { useEffect, useState } from 'react';
import { APP_VERSION } from '@core/version';
import { SettingsGroup, SettingsRow, SettingsNote, SettingsPageTitle } from './SettingsRows';

// About (#321 inc4d, 50-settings.md §6) — app identity + a real "check for updates"
// that drives the service worker directly via the standard navigator.serviceWorker
// API (the PWA SW auto-registers in production; vite-plugin-pwa registerType:'autoUpdate'
// skip-waits, so a found update activates and the page reloads). No virtual:pwa-register
// dependency needed. In dev no SW is registered, so getRegistration() resolves undefined and
// the check lands on 'unavailable'. A check that throws (offline, a failed update() fetch)
// lands on 'failed' — never 'uptodate': we only say "up to date" when update() succeeded.

type CheckState = 'idle' | 'checking' | 'uptodate' | 'updating' | 'unavailable' | 'failed';

export function AboutPage() {
  const [state, setState] = useState<CheckState>('idle');

  // A new SW taking control = reload onto the fresh build.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onChange = () => window.location.reload();
    navigator.serviceWorker.addEventListener('controllerchange', onChange);
    return () => navigator.serviceWorker.removeEventListener('controllerchange', onChange);
  }, []);

  const check = async () => {
    if (!('serviceWorker' in navigator)) {
      setState('unavailable');
      return;
    }
    setState('checking');
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        setState('unavailable');
        return;
      }
      await reg.update();
      // A new worker installing/waiting means an update is on the way (autoUpdate will
      // activate it → controllerchange → reload). Otherwise we're current.
      setState(reg.installing || reg.waiting ? 'updating' : 'uptodate');
    } catch {
      setState('failed');
    }
  };

  const status: Record<CheckState, { text: string; tone: string } | null> = {
    idle: null,
    checking: { text: 'Checking…', tone: 'var(--text-secondary)' },
    uptodate: { text: "You're up to date", tone: 'var(--color-status-secured, var(--text-secondary))' },
    updating: { text: 'Update found — reloading…', tone: 'var(--accent)' },
    unavailable: { text: 'Updates apply automatically in the installed app.', tone: 'var(--text-tertiary)' },
    failed: { text: "Couldn't check for updates — try again when online.", tone: 'var(--text-secondary)' },
  };
  const s = status[state];

  return (
    <div className="flex flex-col gap-6">
      <SettingsPageTitle>About</SettingsPageTitle>

      <div className="flex items-center gap-3">
        <div
          aria-hidden="true"
          className="flex items-center justify-center shrink-0"
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: 'var(--accent-subtle)',
            color: 'var(--accent)',
            font: 'var(--type-headline-2)',
          }}
        >
          FS
        </div>
        <div className="flex flex-col">
          <span style={{ font: 'var(--type-headline-2)' }}>FieldShore</span>
          <span className="text-ink-secondary" style={{ font: 'var(--type-body)' }}>
            Version {APP_VERSION.replace(/^v/, '')}
          </span>
        </div>
      </div>

      <SettingsGroup label="App updates">
        <SettingsRow
          label={state === 'checking' ? 'Checking…' : 'Check for updates'}
          description="FieldShore updates itself in the background — this checks right now"
          disabled={state === 'checking'}
          onPress={() => void check()}
        />
        {s && (
          <SettingsNote>
            <span role="status" style={{ color: s.tone }}>
              {s.text}
            </span>
          </SettingsNote>
        )}
      </SettingsGroup>

      {/* Way back to the public welcome page (2026-10-13): an installed app skips it on
          launch, so About is where someone who installed first can still reach it. */}
      <SettingsGroup label="Welcome page">
        <SettingsRow
          label="See what FieldShore does"
          description="The public welcome page — the tour an installed app skips"
          href="/welcome.html"
          trailing="external"
        />
      </SettingsGroup>
    </div>
  );
}
