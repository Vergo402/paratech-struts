import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Badge, Button, Sheet, TextField } from '@ui/primitives';
import { useDepartment } from '@ui/hooks';
import { QrScannerSheet } from './QrScannerSheet';
import { reloadIntoActiveBucket } from './switchBucket';

/**
 * JoinDepartmentScreen — the pre-shell "join an existing department" route
 * (workflow #232 / 72-invite-code.md). Scan the dept QR (primary, ADR-022) or
 * type/paste the human-readable code, tap Join, and land as a Default-role
 * member. Reached forward (after sign-in with no department, or Settings → Join),
 * never a cold-open wall (ADR-015) — Continue as guest is always a first-class
 * exit until the join commits. Composes existing primitives + the QR scanner
 * sheet; no new primitive. joinByCode is local-first and maps every failure to a
 * calm inline message (Principle 3) — never an alert().
 */
const HOME = '/operations';

// A loose completeness gate so Join enables only once a plausible code is present
// (spec: disabled until well-formed). The authoritative format + validity check is
// the service's job — this just avoids enabling the button on an empty field.
function looksComplete(raw: string): boolean {
  return raw.replace(/[^a-z0-9]/gi, '').length >= 8;
}

export function JoinDepartmentScreen() {
  const navigate = useNavigate();
  const { joinByCode } = useDepartment();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [joined, setJoined] = useState<{ name: string; role: string } | null>(null);

  const canSubmit = looksComplete(code) && !busy;

  async function submit(codeOverride?: string) {
    if (busy) return; // a scan can fire while a tapped Join is in flight — one at a time
    const value = codeOverride ?? code;
    setError(null);
    setBusy(true);
    const result = await joinByCode(value);
    setBusy(false);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    setJoined({ name: result.department.name, role: result.department.role });
  }

  function onScanned(text: string) {
    setScanOpen(false);
    setCode(text);
    void submit(text);
  }

  async function paste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setCode(text);
    } catch {
      /* clipboard denied/unavailable — the field stays typeable */
    }
  }

  function enterApp() {
    // Switch onto the joined department's bucket, deferred to this tap so the
    // confirmation Sheet renders first (see ui/dept/switchBucket).
    reloadIntoActiveBucket();
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
        <h1 style={{ font: 'var(--type-headline-1)' }}>Join department</h1>

        <div className="flex flex-col gap-3">
          <span className="fs-field-label">Invite code</span>
          <Button variant="primary" fullWidth onPress={() => setScanOpen(true)}>
            Scan QR code
          </Button>

          {/* or-divider */}
          <div className="flex items-center gap-3" aria-hidden="true">
            <span style={{ flex: 1, height: 1, background: 'var(--surface-stroke)' }} />
            <span className="text-ink-tertiary" style={{ font: 'var(--type-caption)' }}>
              or
            </span>
            <span style={{ flex: 1, height: 1, background: 'var(--surface-stroke)' }} />
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <TextField
                label="Enter it by hand"
                value={code}
                onChange={(v) => {
                  setCode(v);
                  if (error) setError(null);
                }}
                placeholder="HAMD-4F2K"
                error={error ?? undefined}
                autoComplete="off"
              />
            </div>
            <Button variant="secondary" size="standard" onPress={paste}>
              Paste
            </Button>
          </div>
        </div>

        <p className="text-ink-tertiary" style={{ font: 'var(--type-caption)' }}>
          Ask your department Admin for a code if you don&rsquo;t have one.
        </p>

        <Button
          variant="primary"
          fullWidth
          disabled={!canSubmit}
          disabledReason={canSubmit ? undefined : 'Enter your invite code'}
          onPress={() => submit()}
        >
          {busy ? 'Joining…' : 'Join department'}
        </Button>

        <Button variant="tertiary" fullWidth onPress={() => navigate({ to: HOME })}>
          Continue as guest
        </Button>
      </div>

      <QrScannerSheet open={scanOpen} onClose={() => setScanOpen(false)} onDetect={onScanned} />

      <Sheet
        open={joined !== null}
        onClose={enterApp}
        title={joined ? `Joined ${joined.name}` : ''}
      >
        {joined && (
          <div className="flex flex-col gap-5">
            <p className="flex items-center gap-2" style={{ font: 'var(--type-body-lg)' }}>
              Your role <Badge variant="label">{joined.role === 'admin' ? 'Admin' : 'Default'}</Badge>
            </p>
            <p className="text-ink-tertiary" style={{ font: 'var(--type-body)' }}>
              You can read everything and run field work. Your Admin can change your role anytime.
            </p>
            <Button variant="primary" fullWidth onPress={enterApp}>
              Continue
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
