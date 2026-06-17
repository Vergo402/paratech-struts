import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { InlineSegmented } from '@ui/picker';
import { Badge, Button, Modal, Toggle } from '@ui/primitives';
import { useSession, useDepartment, useOnboarding } from '@ui/hooks';
import { LESSON_QUICK_FIND } from '@ui/onboarding';
import { useTheme, type ThemePreference } from '../theme';

// The role-guided tour split (ADR — ICS position). Two buckets for the slice —
// the field role (measure & shore) vs the command role (IC & org) — matching the
// two lesson families; the full ICS roster lands with the screens it tailors.
const ROLE_OPTIONS = [
  { value: 'field', label: 'Field — measure & shore' },
  { value: 'command', label: 'Command — IC & org' },
] as const;
type RoleFocus = (typeof ROLE_OPTIONS)[number]['value'];

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
  const { identity, signOut } = useSession();
  const { department, role, inviteCode } = useDepartment();
  const { roleFocus, replayTour, startLesson, setRoleFocus } = useOnboarding();
  const navigate = useNavigate();
  const [confirmOut, setConfirmOut] = useState(false);
  const [copied, setCopied] = useState(false);
  const [nativeControls, setNativeControls] = useState(
    () => localStorage.getItem(NATIVE_CONTROLS_KEY) === 'true',
  );

  async function copyInviteCode() {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
    } catch {
      /* clipboard unavailable — the code is shown for manual copy */
    }
  }

  // Broadcast can be active via the gallery; show NO pill selected then — never a
  // misleading "Dark" highlight (audit W8). '' matches no option → nothing checked.
  const pickerValue = (
    THEME_OPTIONS.some((o) => o.value === preference) ? preference : ''
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
      <section className="flex flex-col gap-3">
        <h2 style={{ font: 'var(--type-headline-2)' }}>Account</h2>
        {identity.kind === 'member' ? (
          <>
            <p style={{ font: 'var(--type-body-lg)' }}>
              Signed in as <strong>{identity.displayName}</strong>
            </p>
            <Button variant="secondary" destructive onPress={() => setConfirmOut(true)}>
              Log Out
            </Button>
          </>
        ) : (
          <>
            <p className="text-ink-tertiary" style={{ font: 'var(--type-body-lg)' }}>
              You&rsquo;re using FieldShore as a guest. Sign in to sync with your department.
            </p>
            <Button variant="primary" onPress={() => navigate({ to: '/auth' })}>
              Sign In
            </Button>
          </>
        )}
      </section>

      {identity.kind === 'member' && (
        <section className="flex flex-col gap-3">
          <h2 style={{ font: 'var(--type-headline-2)' }}>Department</h2>
          {department ? (
            <>
              <p className="flex items-center gap-2" style={{ font: 'var(--type-body-lg)' }}>
                <strong>{department.name}</strong>
                {role === 'admin' && <Badge variant="label">Admin</Badge>}
              </p>
              {inviteCode && (
                <div className="flex flex-col gap-2">
                  <span className="text-ink-tertiary" style={{ font: 'var(--type-caption)' }}>
                    Invite your crew with this code
                  </span>
                  <div className="flex items-center gap-3">
                    <strong style={{ font: 'var(--type-headline-2)', letterSpacing: '0.1em' }}>
                      {inviteCode}
                    </strong>
                    <Button variant="secondary" size="standard" onPress={copyInviteCode}>
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-ink-tertiary" style={{ font: 'var(--type-body-lg)' }}>
                You&rsquo;re not part of a department yet.
              </p>
              <Button variant="primary" onPress={() => navigate({ to: '/create-department' })}>
                Create new department
              </Button>
            </>
          )}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 style={{ font: 'var(--type-headline-2)' }}>Help &amp; Learning</h2>
        <p className="text-ink-tertiary" style={{ font: 'var(--type-body-lg)' }}>
          A walkthrough on real screens — nothing you tap during it is saved.
        </p>
        <Button variant="primary" onPress={() => void replayTour()}>
          Replay the tour
        </Button>
        <Button variant="secondary" onPress={() => void startLesson(LESSON_QUICK_FIND)}>
          Quick Find walkthrough
        </Button>
        <InlineSegmented
          label="Guided experience for my role"
          options={ROLE_OPTIONS}
          value={(roleFocus ?? '') as RoleFocus}
          onChange={(next) => void setRoleFocus(next)}
        />
        <Button variant="secondary" onPress={() => navigate({ to: '/help' })}>
          Open user guide
        </Button>
      </section>

      <p className="text-ink-tertiary" style={{ font: 'var(--type-caption)' }}>
        FieldShore v4 — vertical slice build
      </p>

      <Modal
        open={confirmOut}
        onClose={() => setConfirmOut(false)}
        title="Log out?"
        variant="destructive"
        footer={
          <>
            <Button variant="secondary" onPress={() => setConfirmOut(false)}>
              <span data-modal-cancel>Cancel</span>
            </Button>
            <Button
              variant="primary"
              destructive
              onPress={async () => {
                await signOut();
                setConfirmOut(false);
              }}
            >
              Log Out
            </Button>
          </>
        }
      >
        <p>
          Your work on this device stays put. You&rsquo;ll return to guest mode and can sign back in
          anytime.
        </p>
      </Modal>
    </div>
  );
}
