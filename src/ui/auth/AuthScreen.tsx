import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button, Segmented, TextField } from '@ui/primitives';
import { useSession, useDepartment, useOnboarding } from '@ui/hooks';
import { reloadIntoActiveBucket } from '@ui/dept/switchBucket';

/**
 * AuthScreen — the pre-shell sign-in / create-account route (workflow 06,
 * 70-login-register.md). Guest-first: only ever reached forward, never a
 * cold-open wall (ADR-015); Continue as guest is always a first-class exit.
 *
 * Three views share the one screen:
 *  · form        — sign in / create account (+ the two email actions in Sign-In)
 *  · sent        — a calm "check your email" confirmation after a link/reset send
 *  · completing  — "Signing you in…" while an opened magic-link finishes
 *
 * Magic-link + password reset ride Firebase's BUILT-IN email (accountService);
 * errors are inline + aria-live, never an alert() (Principle 3). Magic-link shows
 * ONLY in Sign-In mode — a new member must set a display name (the accountability
 * anchor) which the link flow can't capture (ADR-025).
 */
const HOME = '/operations';

type Mode = 'signin' | 'create';

const MODES = [
  { value: 'signin', label: 'Sign In' },
  { value: 'create', label: 'Create Account' },
] as const;

export function AuthScreen() {
  const navigate = useNavigate();
  const { createAccount, signIn, sendMagicLink, isMagicLink, completeMagicLink, sendPasswordReset } =
    useSession();
  const { currentDepartmentId } = useDepartment();
  const { start: startOnboarding } = useOnboarding();
  const landedRef = useRef(false);
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<{ kind: 'magic' | 'reset'; email: string } | null>(null);
  const [completing, setCompleting] = useState(false);

  const isCreate = mode === 'create';

  // Magic-link landing — opened from the email link, this URL carries the sign-in
  // code. Detect + finish it once; success drops into the app (or dept setup),
  // failure falls back to the form with a calm inline reason. The ref latch makes
  // it idempotent against StrictMode's double-invoke (the link is single-use — a
  // second consume would reject and clobber the success).
  useEffect(() => {
    if (landedRef.current) return;
    const href = window.location.href;
    if (!isMagicLink(href)) return;
    landedRef.current = true;
    setCompleting(true);
    void completeMagicLink(href).then((result) => {
      if (result.ok) {
        // Scrub the single-use oobCode from the URL/back-stack before leaving.
        window.history.replaceState(null, '', '/auth');
        afterAuth();
      } else {
        setCompleting(false);
        setError(result.reason);
      }
    });
    // Mount-only: the link is read once; the deps are stable singleton methods.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Read the department FRESH at navigation time — setMember re-discovers it
  // synchronously after auth, but the subscribed value is the stale mount-time one.
  // A returning member WITH a department must REBOOT onto that department's bucket
  // (only boot/activateBucket selects it) — a client-side navigate would leave the
  // app on the active guest bucket while the UI shows their department, so writes
  // land in the wrong (guest) cache. The no-department case client-navigates to dept
  // setup, which reloads on create/join. Mirrors the create/join/sign-out switch
  // sites (ui/dept/switchBucket).
  const afterAuth = () => {
    if (currentDepartmentId()) reloadIntoActiveBucket();
    else navigate({ to: '/create-department' });
  };

  const canSubmit =
    email.trim() !== '' && password !== '' && (!isCreate || displayName.trim() !== '');
  const canEmailAction = email.trim() !== '' && !busy;

  async function submit() {
    setError(null);
    setBusy(true);
    const result = isCreate
      ? await createAccount({ email, password, displayName })
      : await signIn({ email, password });
    setBusy(false);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    if (isCreate) await startOnboarding();
    afterAuth();
  }

  async function emailMagicLink() {
    setError(null);
    setBusy(true);
    const result = await sendMagicLink(email);
    setBusy(false);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    setSent({ kind: 'magic', email: email.trim() });
  }

  async function emailReset() {
    setError(null);
    setBusy(true);
    const result = await sendPasswordReset(email);
    setBusy(false);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    setSent({ kind: 'reset', email: email.trim() });
  }

  // Every view shares the chrome-free header + the centered narrow column.
  const shell = (children: ReactNode) => (
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
        {children}
      </div>
    </div>
  );

  if (completing) {
    return shell(
      <div className="flex flex-col gap-3" role="status" aria-live="polite">
        <h1 style={{ font: 'var(--type-headline-1)' }}>Signing you in…</h1>
        <p className="text-ink-tertiary" style={{ font: 'var(--type-body-lg)' }}>
          Finishing your sign-in link.
        </p>
      </div>,
    );
  }

  if (sent) {
    const isMagic = sent.kind === 'magic';
    return shell(
      <div className="flex flex-col gap-4">
        {/* role=status so a screen reader announces the view swap to the
            confirmation (the heading isn't a focus target, so without this the
            change is silent — matching the completing view's pattern). */}
        <div role="status" aria-live="polite" className="flex flex-col gap-4">
          <h1 style={{ font: 'var(--type-headline-1)' }}>Check your email</h1>
          <p className="text-ink-tertiary" style={{ font: 'var(--type-body-lg)' }}>
            {isMagic ? (
              <>
                We sent a sign-in link to <strong>{sent.email}</strong>. Open it on this device to
                finish signing in.
              </>
            ) : (
              <>
                We sent a password-reset link to <strong>{sent.email}</strong>. Follow it to set a
                new password.
              </>
            )}
          </p>
        </div>
        <p className="fs-field-msg fs-field-msg--error" aria-live="polite">
          {error}
        </p>
        {isMagic && (
          <Button variant="secondary" fullWidth disabled={busy} onPress={emailMagicLink}>
            {busy ? 'Sending…' : 'Resend link'}
          </Button>
        )}
        <Button
          variant="tertiary"
          fullWidth
          onPress={() => {
            setSent(null);
            setError(null);
          }}
        >
          {isMagic ? 'Use password instead' : 'Back to sign in'}
        </Button>
      </div>,
    );
  }

  return shell(
    <>
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

      {/* Live region present so a post-submit failure is announced (Principle 9). */}
      <p className="fs-field-msg fs-field-msg--error" aria-live="polite">
        {error}
      </p>

      <Button
        variant="primary"
        fullWidth
        disabled={!canSubmit || busy}
        disabledReason={
          canSubmit
            ? undefined
            : isCreate
              ? 'Enter a display name, email, and password'
              : 'Enter your email and password'
        }
        onPress={submit}
      >
        {busy ? (isCreate ? 'Creating…' : 'Signing in…') : isCreate ? 'Create Account' : 'Sign In'}
      </Button>

      {/* Sign-in-only: a new member needs a display name the link flow can't take. */}
      {!isCreate && (
        <>
          <Button
            variant="secondary"
            fullWidth
            disabled={!canEmailAction}
            disabledReason={canEmailAction ? undefined : 'Enter your email first'}
            onPress={emailMagicLink}
          >
            Email me a sign-in link
          </Button>
          <Button
            variant="tertiary"
            disabled={!canEmailAction}
            disabledReason={canEmailAction ? undefined : 'Enter your email first'}
            onPress={emailReset}
          >
            Forgot password?
          </Button>
        </>
      )}

      <Button variant="primary" fullWidth onPress={() => navigate({ to: HOME })}>
        Continue as guest
      </Button>
    </>,
  );
}
