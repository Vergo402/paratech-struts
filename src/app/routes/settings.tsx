import { useState } from 'react';
import { InlineSegmented } from '@ui/picker';
import { Toggle } from '@ui/primitives';
import { useTheme, type ThemePreference } from '../theme';

const THEME_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'sunlight', label: 'Sunlight' },
] as const;

const NATIVE_CONTROLS_KEY = 'fieldshore_native_controls';

/**
 * Settings — the slice's one WORKING screen: the theme picker (the doctrine's
 * canonical inline-segmented value picker) wired to ThemeProvider, plus the
 * Native-controls seam the Power Select fallback will key off (detection +
 * routing land with the accessibility session). Broadcast is not offered —
 * it's a read-only TV surface, not a phone preference.
 */
export function SettingsScreen() {
  const { preference, setPreference } = useTheme();
  const [nativeControls, setNativeControls] = useState(
    () => localStorage.getItem(NATIVE_CONTROLS_KEY) === 'true',
  );

  // Broadcast can be active via the gallery; the 4-option picker shows none selected then.
  const pickerValue = (
    THEME_OPTIONS.some((o) => o.value === preference) ? preference : 'dark'
  ) as ThemePreference & (typeof THEME_OPTIONS)[number]['value'];

  return (
    <div className="flex flex-col gap-6">
      <h1 style={{ font: 'var(--type-headline-1)' }}>Settings</h1>
      <InlineSegmented
        label="Theme"
        options={THEME_OPTIONS}
        value={pickerValue}
        onChange={setPreference}
      />
      <Toggle
        label="Native controls"
        helper="Use the phone's own pickers instead of FieldShore's (screen-reader friendly)"
        checked={nativeControls}
        onChange={(next) => {
          setNativeControls(next);
          try {
            localStorage.setItem(NATIVE_CONTROLS_KEY, String(next));
          } catch {
            /* storage unavailable — session-only */
          }
        }}
      />
      <p className="text-ink-tertiary" style={{ font: 'var(--type-caption)' }}>
        FieldShore v4 — vertical slice build
      </p>
    </div>
  );
}
