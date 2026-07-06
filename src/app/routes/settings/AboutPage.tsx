import { useEffect, useState } from 'react';
import { APP_VERSION } from '@core/version';
import { SettingsGroup, SettingsRow, SettingsNote } from './SettingsRows';

// About (#321 inc4d, 50-settings.md §6) — app identity + a real "check for updates"
// that drives the service worker directly via the standard navigator.serviceWorker
// API (the PWA SW auto-registers in production; vite-plugin-pwa registerType:'autoUpdate'
// skip-waits, so a found update activates and the page reloads). No virtual:pwa-register
// dependency needed. In dev there's no SW, so the check reports "up to date" gracefully.

type CheckState = 'idle' | 'checking' | 'uptodate' | 'updating' | 'unavailable';

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
      setState('uptodate');
    }
  };

  const status: Record<CheckState, { text: string; tone: string } | null> = {
    idle: null,
    checking: { text: 'Checking…', tone: 'var(--text-secondary)' },
    uptodate: { text: "You're up to date", tone: 'var(--color-status-secured, var(--text-secondary))' },
    updating: { text: 'Update found — reloading…', tone: 'var(--accent)' },
    unavailable: { text: 'Updates apply automatically in the installed app.', tone: 'var(--text-tertiary)' },
  };
  const s = status[state];

  return (
    <div className="flex flex-col gap-6">
      <h1 style={{ font: 'var(--type-headline-1)' }}>About</h1>

      <div className="flex items-center gap-3">
        <div
          aria-hidden="true"
          className="flex items-center justify-center shrink-0"
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: 'var(--color-accent-subtle)',
            color: 'var(--color-accent)',
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
    </div>
  );
}
