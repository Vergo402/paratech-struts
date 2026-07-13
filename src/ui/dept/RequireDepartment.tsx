import type { ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@ui/primitives';
import { useSession, useDepartment } from '@ui/hooks';

function GuestSignInGate() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="mx-auto flex w-full flex-col gap-5" style={{ maxWidth: 568 }}>
        <div
          className="flex flex-col items-center gap-3"
          style={{
            border: '1px solid var(--surface-stroke)',
            borderRadius: 12,
            padding: '24px 16px',
            textAlign: 'center',
          }}
        >
          <h1 style={{ font: 'var(--type-headline-2)' }}>Sign in to continue</h1>
          <p className="text-ink-tertiary" style={{ font: 'var(--type-body)' }}>
            Operations, Inventory, Command, and Settings require an account. Quick Find is always
            available without signing in.
          </p>
          <Button variant="primary" fullWidth onPress={() => navigate({ to: '/auth' })}>
            Sign in
          </Button>
          <Button variant="secondary" fullWidth onPress={() => navigate({ to: '/auth' })}>
            Create an account
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * RequireDepartment — the gate wrapping the department-scoped tabs (Operations,
 * Inventory, Command, Settings). Guests see a sign-in prompt (Quick Find is the
 * only tab open without an account). A signed-in member with no department is
 * directed to create or join one before any dept-scoped work — their data must
 * never land in the shared guest bucket. The check is reactive (subscribed
 * identity + department), so it also catches the async sign-in flip after mount.
 */
export function RequireDepartment({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { identity, signOut } = useSession();
  const { department } = useDepartment();

  // Guests see the sign-in gate — only Quick Find is open without an account.
  if (identity.kind !== 'member') return <GuestSignInGate />;
  // Members with a department pass straight through.
  if (department) return <>{children}</>;

  async function signOutToAuth() {
    await signOut();
    navigate({ to: '/auth' });
  }

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="mx-auto flex w-full flex-col gap-5" style={{ maxWidth: 568 }}>
        <p
          className="text-ink-secondary"
          style={{
            font: 'var(--type-caption)',
            border: '1px solid var(--surface-stroke)',
            borderRadius: 8,
            padding: '8px 10px',
          }}
        >
          Signed in as {identity.displayName} &mdash; pick a department to continue.
        </p>

        <div
          className="flex flex-col items-center gap-3"
          style={{
            border: '1px solid var(--surface-stroke)',
            borderRadius: 12,
            padding: '24px 16px',
            textAlign: 'center',
          }}
        >
          <h1 style={{ font: 'var(--type-headline-2)' }}>Set up your department</h1>
          <p className="text-ink-tertiary" style={{ font: 'var(--type-body)' }}>
            FieldShore runs inside a department. Create one as the first Admin, or join your
            crew&rsquo;s with their invite code.
          </p>
          <Button variant="primary" fullWidth onPress={() => navigate({ to: '/create-department' })}>
            Create department
          </Button>
          <Button variant="secondary" fullWidth onPress={() => navigate({ to: '/join-department' })}>
            Join an existing department
          </Button>
          <Button variant="tertiary" fullWidth destructive onPress={() => void signOutToAuth()}>
            Sign out
          </Button>
        </div>

        <p className="text-ink-tertiary" style={{ font: 'var(--type-caption)', textAlign: 'center' }}>
          Quick Find works without a department.
        </p>
      </div>
    </div>
  );
}
