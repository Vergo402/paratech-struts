import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button, Segmented, TextField } from '@ui/primitives';
import { useSession, useDepartment } from '@ui/hooks';

/**
 * AuthScreen — the pre-shell sign-in / create-account route (workflow 06,
 * 70-login-register.md). Full-screen, no bottom nav; guest-first means it is
 * only ever reached forward (the sync banner / Settings), never a cold-open
 * wall (ADR-015), and Continue as guest is always a first-class exit — never a
 * trap. Composes existing primitives (segmented + input + button); no new
 * primitive. The account actions run against the stubbed seam (accountService):
 * signIn always succeeds locally for now, createAccount enforces the mandatory
 * display name (ADR-025); the real Firebase transport fills the seam later
 * WITHOUT touching this screen. Magic-link and password reset need that
 * transport, so they render disabled until it lands.
 */
const HOME = '/operations';
const CLOUD_PENDING = 'Available once cloud sync is set up';

type Mode = 'signin' | 'create';

const MODES = [
  { value: 'signin', label: 'Sign In' },
  { value: 'create', label: 'Create Account' },
] as const;

export function AuthScreen() {
  const navigate = useNavigate();
  const { createAccount, signIn } = useSession();
  const { department } = useDepartment();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isCreate = mode === 'create';
  const canSubmit =
    email.trim() !== '' && password !== '' && (!isCreate || displayName.trim() !== '');

  async function submit() {
    setError(null);
    const result = isCreate
      ? await createAccount({ email, password, displayName })
      : await signIn({ email, password });
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    // Forward to department setup when the member has none yet (workflow 07 §Step
    // 1); a member who already has one drops straight into the app. Skippable —
    // never a gate (ADR-015). (Re-discovering a returning member's department
    // after sign-in is deferred with #232; until then a sign-in has no local
    // department and forwards here, which Skip-for-now exits.)
    navigate({ to: department ? HOME : '/create-department' });
  }

  return (
    <div
      className="flex flex-col gap-6 p-5"
      style={{ minHeight: '100dvh', background: 'var(--surface-bg)' }}
    >
      <header className="flex items-center gap-3">
        <Button variant="tertiary" size="standard" onPress={() => navigate({ to: HOME })}>
          Back
        </Button>
        <span className="fs-header-brand" style={{ font: 'var(--type-headline-1)' }}>
          Field<b>Shore</b>
        </span>
      </header>

      <div className="mx-auto flex w-full flex-col gap-5" style={{ maxWidth: 568 }}>
        <Segmented
          options={MODES}
          value={mode}
          onChange={(next) => {
            setMode(next);
            setError(null);
          }}
          aria-label="Sign in or create account"
        />

        {isCreate && (
          <TextField
            label="Display name"
            value={displayName}
            onChange={setDisplayName}
            placeholder="Capt. T. Marchetti"
            helper="Shown on every action you take — your name on the record."
            autoComplete="name"
          />
        )}
        <TextField
          label="Email"
          value={email}
          onChange={setEmail}
          placeholder="reyes@dept14.gov"
          inputMode="text"
          autoComplete="email"
        />
        <TextField
          label="Password"
          value={password}
          onChange={setPassword}
          type="password"
          autoComplete={isCreate ? 'new-password' : 'current-password'}
        />

        {/* Live region is always present so a post-submit failure is announced
            (aria-live polite, never an alert() — Principle 9). */}
        <p className="fs-field-msg fs-field-msg--error" aria-live="polite">
          {error}
        </p>

        <Button
          variant="primary"
          fullWidth
          disabled={!canSubmit}
          disabledReason={
            canSubmit
              ? undefined
              : isCreate
                ? 'Enter a display name, email, and password'
                : 'Enter your email and password'
          }
          onPress={submit}
        >
          {isCreate ? 'Create Account' : 'Sign In'}
        </Button>

        <Button
          variant="secondary"
          fullWidth
          disabled
          disabledReason={CLOUD_PENDING}
          onPress={() => {}}
        >
          Email me a sign-in link
        </Button>
        <Button variant="tertiary" disabled disabledReason={CLOUD_PENDING} onPress={() => {}}>
          Forgot password?
        </Button>

        <Button variant="primary" fullWidth onPress={() => navigate({ to: HOME })}>
          Continue as guest
        </Button>
      </div>
    </div>
  );
}
