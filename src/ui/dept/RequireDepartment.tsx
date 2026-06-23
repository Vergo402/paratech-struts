import type { ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@ui/primitives';
import { useSession, useDepartment } from '@ui/hooks';

/**
 * RequireDepartment — the gate wrapping the department-scoped tabs (Operations,
 * Inventory, Command, Settings). A signed-in member with no department is bound to
 * one before any dept-scoped work (owner rule, 2026-06-22): render the set-up gate
 * instead of the tab, so their work never lands in the shared, demo-seeded 'guest'
 * bucket alongside other no-dept members. Guests are NEVER gated (ADR-015, guest-
 * first) and Quick Find is never wrapped, so a no-dept member can still run the
 * calculator and sign out via the bottom nav. The check is reactive (subscribed
 * identity + department), so it also catches the async sign-in flip after mount.
 *
 * This narrows ADR-015's "Skip is always a first-class exit" to the dept-scoped tabs,
 * members only — see docs/v4-design/11-decisions/.
 */
export function RequireDepartment({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { identity, signOut } = useSession();
  const { department } = useDepartment();

  // Guests + members who already have a department pass straight through.
  if (identity.kind !== 'member') return <>{children}</>;
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
