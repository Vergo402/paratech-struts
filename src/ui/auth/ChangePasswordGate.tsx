import { useState, type ReactNode } from 'react';
import { Button, TextField } from '@ui/primitives';
import { useMyMember, useSession, type AdminMutationResult } from '@ui/hooks';
import { reloadIntoActiveBucket } from '@ui/dept/switchBucket';

/** Bound on the flag clear — matches departmentService's RTDB write/read timeouts. */
const CLEAR_TIMEOUT_MS = 8000;

/** An offline RTDB update() never rejects — it buffers forever — so give up after `ms`.
 *  The buffered write may still land later; the retry is the same idempotent
 *  false-write (the rules allow true→false and false→false). */
async function clearWithin(ms: number, clear: () => Promise<AdminMutationResult>): Promise<AdminMutationResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<AdminMutationResult>((resolve) => {
    timer = setTimeout(() => resolve({ ok: false, reason: 'timeout' }), ms);
  });
  try {
    return await Promise.race([clear(), timedOut]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * ChangePasswordGate (#439) — the forced first-sign-in password change. A
 * provisioned member signs in with the admin-distributed starter password
 * (`lastname123!`); until they set their own, their member row carries
 * `mustChangePassword: true` and this gate renders INSTEAD of the app shell.
 *
 * FAIL-OPEN by construction: the gate blocks only on a POSITIVE flag read.
 * `member === null` (guest, loading, offline, read error) renders the app
 * normally — the gate is hygiene, not a security boundary. The starter is
 * acceptable only because it is single-use + handed over in person, and the
 * User Manager key badge keeps unrotated accounts visible to admins either way.
 *
 * Success path: changePassword (reauth-first — also verifies the starter) →
 * clearMustChangePassword (the SELF_EDIT true→false rules allowance) →
 * refresh → the flag reads false and the gate unmounts. Both calls need the
 * network, which the just-succeeded auth call proves is present.
 *
 * Two-step failure: once changePassword succeeds the starter is DEAD, so a
 * clear that then fails must not bounce the member back to the starter form.
 * clearMustChangePassword reports failure by RETURNING { ok: false } (it never
 * throws), and offline its RTDB update() stays pending forever — so the clear is
 * raced against a timeout (the same bound + shape departmentService uses for
 * every RTDB write/read, OUTBOX_SET_TIMEOUT_MS / READ_TIMEOUT_MS). A failure
 * swaps the form for a retry panel that re-runs ONLY the clear.
 */
export function ChangePasswordGate({ children }: { children: ReactNode }) {
  const { member, refresh, clearMustChangePassword } = useMyMember();
  const gated = member?.mustChangePassword === true;
  // Hooks above, branch below — the two useState calls live in the inner
  // component so the un-gated render path carries no form state.
  if (!gated) return <>{children}</>;
  return <ChangePasswordScreen onDone={async (): Promise<AdminMutationResult> => {
    const res = await clearWithin(CLEAR_TIMEOUT_MS, clearMustChangePassword);
    if (res.ok) await refresh(); // the flag now reads false → the gate unmounts
    return res;
  }} />;
}

function ChangePasswordScreen({ onDone }: { onDone: () => Promise<AdminMutationResult> }) {
  const { changePassword, signOut } = useSession();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // True once the Auth change succeeded but the flag clear did not. The form is not
  // rendered in this state, so the password change structurally cannot run twice.
  const [passwordSaved, setPasswordSaved] = useState(false);

  const canSubmit = current !== '' && next !== '' && confirm !== '';

  async function submit() {
    setError(null);
    if (next !== confirm) {
      setError("Those new passwords don't match.");
      return;
    }
    if (next === current) {
      setError('Pick a password different from the starter.');
      return;
    }
    setBusy(true);
    const res = await changePassword(current, next);
    if (!res.ok) {
      setBusy(false);
      setError(res.reason);
      return;
    }
    await finish();
  }

  // The flag clear (+ refresh) — the only step a retry re-runs.
  async function finish() {
    setError(null);
    setBusy(true);
    const res = await onDone();
    setBusy(false);
    if (res.ok) return; // refresh flipped the gate; this screen is unmounting
    // The password IS changed — drop it from memory and stop asking for it.
    setCurrent('');
    setNext('');
    setConfirm('');
    setPasswordSaved(true);
    setError("Couldn't finish setup — check your signal and try again.");
  }

  return (
    <div
      className="flex flex-col gap-6 p-5"
      style={{ minHeight: '100dvh', background: 'var(--surface-bg)' }}
    >
      <header className="flex items-center gap-3">
        <span className="fs-header-brand" style={{ font: 'var(--type-headline-1)' }}>
          Field<b>Shore</b>
        </span>
      </header>
      <div className="mx-auto flex w-full flex-col gap-5" style={{ maxWidth: 568 }}>
        {/* Centered lock header — the accepted mockup's panel 5. */}
        <div className="flex flex-col items-center gap-2" style={{ textAlign: 'center' }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true" style={{ color: 'var(--accent)' }}>
            <rect x="6" y="12" width="16" height="11" rx="2.5" stroke="currentColor" strokeWidth="2" />
            <path d="M9 12V9a5 5 0 0110 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <h1 style={{ font: 'var(--type-headline-1)' }}>
            {passwordSaved ? 'Password saved' : 'Set your password'}
          </h1>
          <p className="text-ink-tertiary" style={{ font: 'var(--type-body-lg)' }}>
            {passwordSaved
              ? 'Your new password is already in effect.'
              : 'You signed in with a starter password. Pick your own before continuing.'}
          </p>
        </div>

        {!passwordSaved && (
          <>
            <TextField
              label="Starter password"
              value={current}
              onChange={setCurrent}
              type="password"
              autoComplete="current-password"
            />
            <TextField
              label="New password"
              value={next}
              onChange={setNext}
              type="password"
              autoComplete="new-password"
              helper="At least 6 characters."
            />
            <TextField
              label="Confirm new password"
              value={confirm}
              onChange={setConfirm}
              type="password"
              autoComplete="new-password"
            />
          </>
        )}

        {/* Inline + announced, never a toast (#426 / Principle 9). */}
        <p className="fs-field-msg fs-field-msg--error" aria-live="polite">
          {error}
        </p>

        {passwordSaved ? (
          <Button variant="primary" fullWidth disabled={busy} onPress={finish}>
            {busy ? 'Saving…' : 'Try again'}
          </Button>
        ) : (
          <Button
            variant="primary"
            fullWidth
            disabled={!canSubmit || busy}
            disabledReason={canSubmit ? undefined : 'Fill in all three fields'}
            onPress={submit}
          >
            {busy ? 'Saving…' : 'Save and continue'}
          </Button>
        )}
        <Button
          variant="tertiary"
          fullWidth
          onPress={async () => {
            await signOut();
            reloadIntoActiveBucket();
          }}
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}
