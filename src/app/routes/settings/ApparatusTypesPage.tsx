import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button, Modal, TextField, EmptyState } from '@ui/primitives';
import { useApparatus, useApparatusTypes, usePermissions } from '@ui/hooks';
import { APPARATUS_TYPES } from '@core/load';
import { SettingsPageTitle } from './SettingsRows';

/**
 * Apparatus types (#321 P5 inc4b, 50-settings.md §5) — the manageSettings editor for the
 * department's apparatus-type vocabulary. The six built-in types are always present and
 * locked; dept-added types are removable, EXCEPT while a rig still uses one (blocked with
 * the list of rigs, so no rig is left with a type that vanished from the pick-list).
 */
export function ApparatusTypesPage() {
  const perms = usePermissions();
  const navigate = useNavigate();
  const { types, add, remove } = useApparatusTypes();
  const { roster } = useApparatus();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<{ name: string; rigs: string[] } | null>(null);

  // Direct-URL backstop: the nav hides this from non-admins, but guard the route too.
  if (!perms.manageSettings) {
    return (
      <EmptyState
        variant="upstream-blocked"
        headline="Admin access only"
        reason="Editing apparatus types needs the “Manage department settings” permission."
        action={{ label: 'Back to Settings', onPress: () => navigate({ to: '/settings/account' }) }}
      />
    );
  }

  const submit = async () => {
    const res = await add(draft);
    if (res.ok) {
      setDraft('');
      setError(null);
    } else {
      setError(res.reason ?? 'Could not add that type.');
    }
  };

  const tryRemove = (id: string, name: string) => {
    const rigs = roster.filter((r) => r.type === name).map((r) => r.name);
    if (rigs.length > 0) {
      setBlocked({ name, rigs });
      return;
    }
    void remove(id);
  };

  return (
    <div className="flex flex-col gap-6">
      <SettingsPageTitle>Apparatus types</SettingsPageTitle>
      <p className="text-ink-tertiary" style={{ font: 'var(--type-body-lg)' }}>
        The rig types your department can choose when adding apparatus. The six built-in types are
        always available; add your own for anything else (Water Tender, Crane, Drone&hellip;).
      </p>

      <ul className="flex flex-col" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {APPARATUS_TYPES.map((name) => (
          <li
            key={name}
            className="flex items-center justify-between gap-3"
            style={{ padding: 'var(--space-2) 0', borderBottom: 'var(--stroke-width) solid var(--surface-stroke)' }}
          >
            <span style={{ font: 'var(--type-body-medium)' }}>{name}</span>
            <span className="text-ink-tertiary" style={{ font: 'var(--type-caption)' }}>
              built-in
            </span>
          </li>
        ))}
        {types.map((t) => (
          <li
            key={t.id}
            className="flex items-center justify-between gap-3"
            style={{ padding: 'var(--space-2) 0', borderBottom: 'var(--stroke-width) solid var(--surface-stroke)' }}
          >
            <span style={{ font: 'var(--type-body-medium)' }}>{t.name}</span>
            <Button variant="tertiary" size="standard" destructive onPress={() => tryRemove(t.id, t.name)}>
              Remove
            </Button>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2">
        <TextField
          label="Add a type"
          value={draft}
          onChange={(v) => {
            setDraft(v);
            if (error) setError(null);
          }}
          maxLength={40}
          placeholder="e.g. Water Tender"
          error={error ?? undefined}
        />
        <Button variant="secondary" onPress={() => void submit()} disabled={!draft.trim()} disabledReason="Enter a type name">
          Add type
        </Button>
      </div>

      <Modal
        open={blocked != null}
        onClose={() => setBlocked(null)}
        title="Type is in use"
        variant="alert"
        footer={
          <Button variant="primary" onPress={() => setBlocked(null)}>
            OK
          </Button>
        }
      >
        <p>
          <strong>{blocked?.name}</strong> is still assigned to{' '}
          {blocked?.rigs.length === 1 ? 'a rig' : `${blocked?.rigs.length} rigs`}:{' '}
          {blocked?.rigs.join(', ')}. Change those rigs to another type first, then remove it.
        </p>
      </Modal>
    </div>
  );
}
