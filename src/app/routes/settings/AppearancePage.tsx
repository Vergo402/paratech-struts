import { useState } from 'react';
import { InlineSegmented } from '@ui/picker';
import { Toggle } from '@ui/primitives';
import { useTheme, type ThemePreference } from '../../theme';

const THEME_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'sunlight', label: 'Sunlight' },
] as const;

const NATIVE_CONTROLS_KEY = 'fieldshore_native_controls';

/** Appearance — theme + the Native-controls accessibility fallback (50-settings.md §1/§3). */
export function AppearancePage() {
  const { preference, setPreference } = useTheme();
  const [nativeControls, setNativeControls] = useState(
    () => localStorage.getItem(NATIVE_CONTROLS_KEY) === 'true',
  );

  // Broadcast can be active via the gallery; show NO pill selected then — never a
  // misleading "Dark" highlight (audit W8). '' matches no option → nothing checked.
  const pickerValue = (
    THEME_OPTIONS.some((o) => o.value === preference) ? preference : ''
  ) as ThemePreference & (typeof THEME_OPTIONS)[number]['value'];

  return (
    <div className="flex flex-col gap-6">
      <h1 style={{ font: 'var(--type-headline-1)' }}>Appearance</h1>
      <InlineSegmented label="Theme" options={THEME_OPTIONS} value={pickerValue} onChange={setPreference} />
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
    </div>
  );
}
