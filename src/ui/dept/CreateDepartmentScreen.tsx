import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Badge, Button, Sheet, TextField } from '@ui/primitives';
import { useDepartment } from '@ui/hooks';
import { QrImage } from './QrImage';

/**
 * CreateDepartmentScreen — the pre-shell "stand up a department" route (workflow
 * 07, 71-dept-setup.md). One field (department name); the creator becomes the
 * first Admin and gets an invite code to share with the crew. Reached forward
 * (after sign-in with no department, or Settings → Create new department), never
 * a cold-open wall (ADR-015) — Skip for now is always a first-class exit.
 * Composes existing primitives (input + button + sheet + badge); no new
 * primitive. createDepartment is local-first: the department stands locally even
 * offline / before the security rules are deployed.
 */
const HOME = '/operations';

export function CreateDepartmentScreen() {
  const navigate = useNavigate();
  const { createDepartment } = useDepartment();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ name: string; inviteCode: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const canSubmit = name.trim() !== '' && !busy;

  async function submit() {
    setError(null);
    setBusy(true);
    const result = await createDepartment(name);
    setBusy(false);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    setCreated({ name: result.department.name, inviteCode: result.department.inviteCode });
  }

  function done() {
    setCreated(null);
    navigate({ to: HOME });
  }

  async function copyCode() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.inviteCode);
      setCopied(true);
    } catch {
      /* clipboard unavailable — the code is shown for manual copy */
    }
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
        <div className="flex flex-col gap-2">
          <h1 style={{ font: 'var(--type-headline-1)' }}>Create department</h1>
          <p className="text-ink-tertiary" style={{ font: 'var(--type-body-lg)' }}>
            You&rsquo;ll be the first Admin. You can invite the rest of your crew next.
          </p>
        </div>

        <TextField
          label="Department name"
          value={name}
          onChange={setName}
          placeholder="Hamden Fire Rescue"
          autoComplete="organization"
        />

        {/* Calm inline error — aria-live, never an alert() (Principle 3). */}
        <p className="fs-field-msg fs-field-msg--error" aria-live="polite">
          {error}
        </p>

        <Button
          variant="primary"
          fullWidth
          disabled={!canSubmit}
          disabledReason={canSubmit ? undefined : 'Enter a department name'}
          onPress={submit}
        >
          {busy ? 'Creating…' : 'Create department'}
        </Button>

        <Button
          variant="secondary"
          fullWidth
          onPress={() => navigate({ to: '/join-department' })}
        >
          Join an existing department instead
        </Button>

        <Button variant="tertiary" fullWidth onPress={() => navigate({ to: HOME })}>
          Skip for now
        </Button>
      </div>

      <Sheet open={created !== null} onClose={done} title={created ? `${created.name} is ready` : ''}>
        {created && (
          <div className="flex flex-col gap-5">
            <p className="flex items-center gap-2" style={{ font: 'var(--type-body-lg)' }}>
              You&rsquo;re the <Badge variant="label">Admin</Badge>
            </p>
            <div className="flex flex-col gap-2">
              <span className="text-ink-tertiary" style={{ font: 'var(--type-caption)' }}>
                Invite your crew — they scan this or type the code
              </span>
              <QrImage value={created.inviteCode} />
              <div className="flex items-center gap-3">
                <strong style={{ font: 'var(--type-headline-2)', letterSpacing: '0.1em' }}>
                  {created.inviteCode}
                </strong>
                <Button variant="secondary" size="standard" onPress={copyCode}>
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>
            <Button variant="primary" fullWidth onPress={done}>
              Done
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
