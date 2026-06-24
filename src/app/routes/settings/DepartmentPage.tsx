import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Badge, Button } from '@ui/primitives';
import { useSession, useDepartment } from '@ui/hooks';
import { QrImage } from '@ui/dept';

/** Department — connection, the device's back-office role, and the crew invite
 *  (50-settings.md §Department). A guest gets the forward "sign in to join" path. */
export function DepartmentPage() {
  const { identity } = useSession();
  const { department, role, inviteCode } = useDepartment();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  async function copyInviteCode() {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
    } catch {
      /* clipboard unavailable — the code is shown for manual copy */
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 style={{ font: 'var(--type-headline-1)' }}>Department</h1>
      {identity.kind !== 'member' ? (
        <section className="flex flex-col gap-3">
          <p className="text-ink-tertiary" style={{ font: 'var(--type-body-lg)' }}>
            Sign in to create or join a department and sync with your crew.
          </p>
          <Button variant="primary" onPress={() => navigate({ to: '/auth' })}>
            Sign In
          </Button>
        </section>
      ) : department ? (
        <section className="flex flex-col gap-3">
          <p className="flex items-center gap-2" style={{ font: 'var(--type-body-lg)' }}>
            <strong>{department.name}</strong>
            {role === 'admin' && <Badge variant="label">Admin</Badge>}
          </p>
          {inviteCode && (
            <div className="flex flex-col gap-2">
              <span className="text-ink-tertiary" style={{ font: 'var(--type-caption)' }}>
                Invite your crew — they scan this or type the code
              </span>
              <QrImage value={inviteCode} />
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
        </section>
      ) : (
        <section className="flex flex-col gap-3">
          <p className="text-ink-tertiary" style={{ font: 'var(--type-body-lg)' }}>
            You&rsquo;re not part of a department yet.
          </p>
          <Button variant="primary" onPress={() => navigate({ to: '/create-department' })}>
            Create new department
          </Button>
          <Button variant="secondary" onPress={() => navigate({ to: '/join-department' })}>
            Join existing department
          </Button>
        </section>
      )}
    </div>
  );
}
