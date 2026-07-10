import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Button, Modal, TextField } from '@ui/primitives';
import { useDepartment, useMyMember, useRoles, useSession } from '@ui/hooks';
import { reloadIntoActiveBucket } from '@ui/dept';
import { SettingsGroup, SettingsRow, SettingsPageTitle } from './SettingsRows';
import { initialsOf } from './initials';

/**
 * Account — the member profile (initials avatar, name, self-editable rank/title,
 * read-only email, role badge) plus the destructive Log Out / Delete-account flows
 * (50-settings.md §Account; #321 inc3). Name + email are read-only (from sign-in);
 * Rank is the one self-editable field (SELF_EDIT_RANK rule). A guest sees the
 * forward "sign in to sync" path.
 */
export function AccountPage() {
  const { identity, signOut, deleteAccount, currentEmail } = useSession();
  const { role } = useDepartment();
  const roles = useRoles();
  const { member, setRank, refresh: refreshMember } = useMyMember();
  const [confirmOut, setConfirmOut] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const savedRank = member?.rank ?? '';
  const [rankDraft, setRankDraft] = useState(savedRank);
  const [savingRank, setSavingRank] = useState(false);
  const [rankError, setRankError] = useState<string | null>(null);
  // Re-seed the draft when the loaded row arrives / changes (sync from another device).
  useEffect(() => setRankDraft(savedRank), [savedRank]);
  const rankDirty = rankDraft.trim() !== savedRank.trim();
  const roleName = (role && roles[role]?.name) || role || '';

  async function saveRank() {
    setRankError(null);
    setSavingRank(true);
    const res = await setRank(rankDraft);
    if (res.ok) await refreshMember(); // re-read so the saved value clears the dirty state
    setSavingRank(false);
    if (!res.ok) setRankError(res.reason ?? 'That change could not be saved.');
  }

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
      <SettingsPageTitle>Account</SettingsPageTitle>
      {identity.kind === 'member' ? (
        <section className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className="flex items-center justify-center rounded-full shrink-0"
              style={{
                width: 52,
                height: 52,
                background: 'var(--accent-subtle)',
                color: 'var(--accent)',
                font: 'var(--type-headline-2)',
              }}
            >
              {initialsOf(identity.displayName)}
            </div>
            <div className="flex flex-col gap-1">
              <span style={{ font: 'var(--type-headline-2)' }}>{identity.displayName}</span>
              {roleName && (
                <span
                  style={{
                    font: 'var(--type-label)',
                    alignSelf: 'flex-start',
                    padding: '2px 10px',
                    borderRadius: 'var(--radius-pill)',
                    background: 'var(--accent-subtle)',
                    color: 'var(--accent)',
                  }}
                >
                  {roleName}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span style={{ font: 'var(--type-label)' }} className="text-ink-secondary">
              Name
            </span>
            <div className="flex items-center justify-between gap-2">
              <span style={{ font: 'var(--type-body-lg)' }}>{identity.displayName}</span>
              <span className="text-ink-tertiary" style={{ font: 'var(--type-caption)' }}>
                From sign-in
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <TextField
              label="Rank / title"
              value={rankDraft}
              onChange={setRankDraft}
              maxLength={80}
              placeholder="e.g. Captain, Rescue Specialist"
              helper="Shown next to your name on the roster and audit log. You can change this anytime."
              error={rankError ?? undefined}
            />
            {rankDirty && (
              <div className="flex gap-2">
                <Button variant="primary" disabled={savingRank} onPress={() => void saveRank()}>
                  {savingRank ? 'Saving…' : 'Save'}
                </Button>
                <Button
                  variant="secondary"
                  disabled={savingRank}
                  onPress={() => {
                    setRankDraft(savedRank);
                    setRankError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <span style={{ font: 'var(--type-label)' }} className="text-ink-secondary">
              Email
            </span>
            <div className="flex items-center justify-between gap-2">
              <span style={{ font: 'var(--type-body-lg)' }}>{currentEmail() ?? '—'}</span>
              <span className="text-ink-tertiary" style={{ font: 'var(--type-caption)' }}>
                Read-only
              </span>
            </div>
          </div>

          <SettingsGroup label="Account actions">
            <SettingsRow
              label="Log out"
              description="Your work on this device stays put"
              onPress={() => setConfirmOut(true)}
            />
            <SettingsRow
              destructive
              label="Delete account"
              description="Asks for your password — can't be undone"
              onPress={() => setConfirmDelete(true)}
            />
          </SettingsGroup>
        </section>
      ) : (
        <section className="flex flex-col gap-3">
          {/* Same identity-card language as the Settings index — the card IS the
              sign-in affordance (one gold "Sign in" pill, no full-width slab). */}
          <Link to="/auth" className="fs-set-identity">
            <span className="fs-set-avatar" aria-hidden="true">
              ?
            </span>
            <span className="fs-set-identity-text">
              <span className="fs-set-identity-name">Guest on this device</span>
              <span className="fs-set-identity-sub">
                Not syncing &mdash; work stays on this device
              </span>
            </span>
            <span className="fs-set-signin">Sign in</span>
          </Link>
          <p className="text-ink-tertiary" style={{ font: 'var(--type-caption)' }}>
            Signing in connects this device to your department. Your local work stays.
          </p>
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
