import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/**
 * Theme plumbing (color.md / ADR-011). The four authored themes live in
 * tokens.css as [data-theme] blocks; this provider owns the attribute on
 * <html>. `system` resolves to light|dark via prefers-color-scheme (sunlight
 * and broadcast are deliberate operator choices, never auto-selected).
 * `broadcast` is accepted so the gallery can preview it, but it is not
 * offered by the Settings picker (broadcast is a read-only TV surface).
 *
 * The stored key is read pre-paint by an inline script in index.html so the
 * first frame already wears the right theme; default (nothing stored) = dark,
 * the incident-operations field default.
 */
export type ResolvedTheme = 'light' | 'dark' | 'sunlight' | 'broadcast';
export type ThemePreference = 'system' | ResolvedTheme;

const STORAGE_KEY = 'fieldshore_theme';
const PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark', 'sunlight', 'broadcast'];

function systemPrefersLight(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: light)').matches;
}

function resolveTheme(pref: ThemePreference): ResolvedTheme {
  if (pref === 'system') return systemPrefersLight() ? 'light' : 'dark';
  return pref;
}

function readStoredPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (PREFERENCES as readonly string[]).includes(stored)) return stored as ThemePreference;
  } catch {
    /* storage unavailable — fall through to the default */
  }
  return 'dark';
}

interface ThemeContextValue {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStoredPreference);
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(preference));

  // Apply + persist. Idempotent under StrictMode's double-invoke.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolved);
  }, [resolved]);

  // Track the OS scheme only while preference is `system`.
  useEffect(() => {
    setResolved(resolveTheme(preference));
    if (preference !== 'system' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => setResolved(resolveTheme('system'));
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [preference]);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    try {
      localStorage.setItem(STORAGE_KEY, pref);
    } catch {
      /* storage unavailable — preference still applies for this session */
    }
  }, []);

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
