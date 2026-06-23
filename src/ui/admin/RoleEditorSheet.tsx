import { useEffect, useState } from 'react';
import { Sheet, Button, TextField, Toggle } from '@ui/primitives';
import {
  PERMISSION_KEYS,
  DEFAULT_PERMISSIONS,
  DEFAULT_ROLE_ID,
  type Permissions,
  type Role,
} from '@core/schema';
import { PERMISSION_LABELS } from './permissionSummary';
import type { AdminMutationResult } from '@ui/hooks';

export interface RoleEditorSheetProps {
  open: boolean;
  onClose: () => void;
  /** The role to edit, or null to create a new custom role. */
  role: Role | null;
  /** create → onSubmit(name, perms); edit → onSubmit(name, perms) (the screen routes it). */
  onSubmit: (name: string, permissions: Permissions) => Promise<AdminMutationResult>;
  /** Open the delete-confirm for a custom role (omitted for built-ins). */
  onRequestDelete?: () => void;
}

export function RoleEditorSheet({ open, onClose, role, onSubmit, onRequestDelete }: RoleEditorSheetProps) {
  const [name, setName] = useState('');
  const [perms, setPerms] = useState<Permissions>(DEFAULT_PERMISSIONS);
  const [error, setError] = useState<string | null>(null);

  // Reset the form each time the sheet opens (or the target role changes).
  useEffect(() => {
    if (!open) return;
    setName(role?.name ?? '');
    setPerms(role?.permissions ?? DEFAULT_PERMISSIONS);
    setError(null);
  }, [open, role]);

  const isDefault = role?.id === DEFAULT_ROLE_ID; // built-in name fixed; permissions editable
  const isCustom = role != null && !role.builtIn;

  const save = async () => {
    const res = await onSubmit(name, perms);
    if (res.ok) onClose();
    else setError(res.reason ?? 'That change could not be saved.');
  };

  return (
    <Sheet open={open} onClose={onClose} title={role ? 'Edit role' : 'Create role'}>
      <p className="fs-um-sheet-help">A role is a name plus what it&rsquo;s allowed to do in the back office.</p>

      <TextField
        label="Role name"
        value={name}
        onChange={setName}
        size="standard"
        disabled={isDefault}
        maxLength={60}
        placeholder="e.g. Logistics"
      />

      <div className="fs-um-perms" style={{ marginTop: 'var(--space-3)' }}>
        {PERMISSION_KEYS.map((k) => (
          <Toggle
            key={k}
            size="standard"
            label={PERMISSION_LABELS[k]}
            checked={perms[k]}
            onChange={(v) => setPerms((p) => ({ ...p, [k]: v }))}
          />
        ))}
      </div>

      {error && <p className="fs-um-sheet-error" role="alert">{error}</p>}

      {isCustom && onRequestDelete && (
        <div className="fs-um-delete-row">
          <Button variant="tertiary" destructive size="standard" onPress={onRequestDelete}>
            Delete role
          </Button>
        </div>
      )}

      <div className="fs-um-sheet-foot">
        <Button variant="secondary" size="standard" onPress={onClose}>
          Cancel
        </Button>
        <Button variant="primary" size="standard" onPress={save}>
          {role ? 'Save role' : 'Create role'}
        </Button>
      </div>
    </Sheet>
  );
}
