import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button, Modal, TextField } from '@ui/primitives';
import { useSession } from '@ui/hooks';
import { reloadIntoActiveBucket } from '@ui/dept';

/**
 * Account — who you're signed in as, plus the destructive Log Out / Delete-account
 * flows (50-settings.md §Account). Inc 3 grows this into the full profile page
 * (name, rank/title, photo). A guest sees the forward "sign in to sync" path.
 */
export function AccountPage() {
  const { identity, signOut, deleteAccount } = useSession();
  const navigate = useNavigate();
  const [confirmOut, setConfirmOut] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function doDeleteAccount() {
    setDeleteError(null);
    setDeleting(true);
    const result = await deleteAccount(deletePassword);
    setDeleting(false);
    if (!result.ok) {
      setDeleteError(result.reason);
      return;
    }
    // Account gone + local data wiped → re-boot clean onto the sign-in screen.
    window.location.assign('/auth');
  }

  function closeDelete() {
    setConfirmDelete(false);
    setDeletePassword('');
    setDeleteError(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 style={{ font: 'var(--type-headline-1)' }}>Account</h1>
      {identity.kind === 'member' ? (
        <section className="flex flex-col gap-3">
          <p style={{ font: 'var(--type-body-lg)' }}>
            Signed in as <strong>{identity.displayName}</strong>
          </p>
          <Button variant="secondary" destructive onPress={() => setConfirmOut(true)}>
            Log Out
          </Button>
          <Button variant="secondary" destructive onPress={() => setConfirmDelete(true)}>
            Delete account
          </Button>
        </section>
      ) : (
        <section className="flex flex-col gap-3">
          <p className="text-ink-tertiary" style={{ font: 'var(--type-body-lg)' }}>
            You&rsquo;re using FieldShore as a guest. Sign in to sync with your department.
          </p>
          <Button variant="primary" onPress={() => navigate({ to: '/auth' })}>
            Sign In
          </Button>
        </section>
      )}

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
                // Sign-out flips the dept→null; reload onto the (guest) bucket so no
                // stale dept bucket lingers (the reactive subscribe used to do this).
                reloadIntoActiveBucket();
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

      <Modal
        open={confirmDelete}
        onClose={closeDelete}
        title="Delete account?"
        variant="destructive"
        footer={
          <>
            <Button variant="secondary" onPress={closeDelete}>
              <span data-modal-cancel>Cancel</span>
            </Button>
            <Button
              variant="primary"
              destructive
              disabled={deletePassword.trim() === '' || deleting}
              disabledReason={deletePassword.trim() === '' ? 'Enter your password' : undefined}
              onPress={() => void doDeleteAccount()}
            >
              {deleting ? 'Deleting…' : 'Delete account'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p>
            This permanently deletes your account and removes FieldShore&rsquo;s data from this
            device. It can&rsquo;t be undone.
          </p>
          <p className="text-ink-tertiary" style={{ font: 'var(--type-body)' }}>
            Your department is <strong>not</strong> deleted &mdash; it stays for your crew. Removing
            an entire department is a request to the FieldShore admin.
          </p>
          <TextField
            label="Enter your password to confirm"
            type="password"
            value={deletePassword}
            onChange={setDeletePassword}
            error={deleteError ?? undefined}
          />
        </div>
      </Modal>
    </div>
  );
}
