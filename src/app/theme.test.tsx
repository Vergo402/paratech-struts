// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme, type ThemePreference } from './theme';

function Probe() {
  const { preference, resolved, setPreference } = useTheme();
  const all: ThemePreference[] = ['system', 'light', 'dark', 'sunlight'];
  return (
    <div>
      <span data-testid="pref">{preference}</span>
      <span data-testid="resolved">{resolved}</span>
      {all.map((t) => (
        <button key={t} onClick={() => setPreference(t)}>
          set-{t}
        </button>
      ))}
    </div>
  );
}

function stubMatchMedia(prefersLight: boolean) {
  const listeners = new Set<() => void>();
  const mq = {
    matches: prefersLight,
    media: '(prefers-color-scheme: light)',
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  };
  window.matchMedia = (() => mq) as unknown as typeof window.matchMedia;
  return {
    setPrefersLight(v: boolean) {
      mq.matches = v;
      listeners.forEach((fn) => fn());
    },
  };
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    // @ts-expect-error — jsdom has no matchMedia; each test stubs as needed
    delete window.matchMedia;
  });

  it('defaults to dark when nothing is stored', () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
  });

  it('applies the stored preference on mount', () => {
    localStorage.setItem('fieldshore_theme', 'sunlight');
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(document.documentElement.getAttribute('data-theme')).toBe('sunlight');
  });

  it('ignores garbage in storage and falls back to dark', () => {
    localStorage.setItem('fieldshore_theme', 'hotdog');
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('setPreference writes data-theme and persists', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'set-light' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('fieldshore_theme')).toBe('light');
  });

  it('system resolves via matchMedia and tracks OS changes', async () => {
    const media = stubMatchMedia(true);
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'set-system' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    media.setPrefersLight(false);
    await screen.findByText('dark', {}, { timeout: 1000 });
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('system without matchMedia support resolves dark', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'set-system' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
