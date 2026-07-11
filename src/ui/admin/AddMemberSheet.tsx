import { useEffect, useState } from 'react';
import { Sheet, Button, TextField } from '@ui/primitives';
import { BottomSheetPicker, type SheetPickerOption } from '@ui/picker';
import { starterPasswordFor } from '@core/personnel';
import type { Apparatus, Role } from '@core/schema';
import type { AdminMutationResult, ProvisionMemberInput } from '@ui/hooks';
import { KeyIcon } from './icons';

/**
 * AddMemberSheet (#439) — an admin adds a firefighter and the app creates their
 * login on the spot (the provisionAccount callable). The starter password
 * (`lastname123!`) derives LIVE from the typed name so the admin sees exactly
 * what they'll hand over; success swaps to a hand-over panel repeating the
 * email + starter (read it to the member in person — it isn't shown again).
 * Errors are inline (#426); the email-in-use case names the invite-code path.
 */
export interface AddMemberSheetProps {
  open: boolean;
  onClose: () => void;
  /** Ordered roles to pick from (Admin, Default, then customs). */
  roleList: Role[];
  /** The department's apparatus roster (rig assignment picker). */
  roster: Apparatus[];
  onCreate: (input: ProvisionMemberInput) => Promise<AdminMutationResult & { uid?: string }>;
}

const UNASSIGNED = '__none__';

export function AddMemberSheet({ open, onClose, roleList, roster, onCreate }: AddMemberSheetProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('default');
  const [rank, setRank] = useState('');
  const [apparatusId, setApparatusId] = useState(UNASSIGNED);
  const [badge, setBadge] = useState('');
  const [phone, setPhone] = useState('');
  const [certifications, setCertifications] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // After a successful create: the hand-over panel (email + starter, once).
  const [created, setCreated] = useState<{ name: string; email: string; starter: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setName('');
    setEmail('');
    setRole('default');
    setRank('');
    setApparatusId(UNASSIGNED);
    setBadge('');
    setPhone('');
    setCertifications('');
    setError(null);
    setBusy(false);
    setCreated(null);
  }, [open]);

  const starter = starterPasswordFor(name);
  const canSubmit = name.trim() !== '' && email.trim() !== '' && !busy;

  const roleOptions: SheetPickerOption<string>[] = roleList.map((r) => ({ value: r.id, label: r.name }));
  const rigOptions: SheetPickerOption<string>[] = [
    { value: UNASSIGNED, label: 'Unassigned' },
    ...roster.map((a) => ({ value: a.id, label: a.name, sub: a.type })),
  ];

  async function submit() {
    setError(null);
    setBusy(true);
    const res = await onCreate({
      email: email.trim(),
      displayName: name.trim(),
      starterPassword: starter,
      role,
      rank: rank.trim() || undefined,
      apparatusId: apparatusId === UNASSIGNED ? undefined : apparatusId,
      badge: badge.trim() || undefined,
      phone: phone.trim() || undefined,
      certifications: certifications.trim() || undefined,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.reason ?? 'That change could not be saved. Try again.');
      return;
    }
    setCreated({ name: name.trim(), email: email.trim(), starter });
  }

  if (created) {
    return (
      <Sheet open={open} onClose={onClose} title="Account created">
        <div role="status" aria-live="polite">
          <p className="fs-um-sheet-help">
            <strong>{created.name}</strong> can sign in now. Read them their starter password in
            person — it isn&rsquo;t shown again, and they must replace it at first sign-in.
          </p>
          <div className="fs-um-handover">
            <div className="fs-um-handover-row">
              <span className="fs-um-handover-label">Email</span>
              <span className="fs-um-handover-value">{created.email}</span>
            </div>
            <div className="fs-um-handover-row">
              <span className="fs-um-handover-label">Starter password</span>
              <span className="fs-um-handover-value fs-um-handover-starter">{created.starter}</span>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Button variant="primary" fullWidth onPress={onClose}>
            Done
          </Button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onClose={onClose} title="Add member">
      <p className="fs-um-sheet-help">
        Creates their login on the spot — no invite code needed.
      </p>

      <div className="fs-um-form">
        <TextField label="Name" value={name} onChange={setName} maxLength={80} placeholder="Dana Kim" autoComplete="off" />
        <TextField
          label="Email — their sign-in"
          value={email}
          onChange={setEmail}
          maxLength={120}
          placeholder="dkim@dept14.gov"
          inputMode="text"
          autoComplete="off"
        />
        <BottomSheetPicker label="Role" options={roleOptions} value={role} onSelect={setRole} />
        <TextField label="Rank / title" value={rank} onChange={setRank} maxLength={80} placeholder="e.g. Lieutenant" />
        <BottomSheetPicker label="Apparatus" options={rigOptions} value={apparatusId} onSelect={setApparatusId} />
        <TextField label="Badge / ID" value={badge} onChange={setBadge} maxLength={40} helper="Optional" />
        <TextField label="Phone" value={phone} onChange={setPhone} maxLength={40} inputMode="numeric" helper="Optional" />
        <TextField
          label="Certifications"
          value={certifications}
          onChange={setCertifications}
          maxLength={500}
          placeholder="FF2, Rescue Tech, EMT-B"
          helper="Optional"
        />
      </div>

      <div className="fs-um-starter" aria-live="polite">
        <KeyIcon />
        <p>
          Starter password: <strong className="fs-um-starter-pw">{starter}</strong> — they must
          change it the first time they sign in.
        </p>
      </div>

      {error && <p className="fs-um-sheet-error" role="alert">{error}</p>}

      <div style={{ marginTop: 'var(--space-4)' }}>
        <Button
          variant="primary"
          fullWidth
          disabled={!canSubmit}
          disabledReason={canSubmit ? undefined : 'Enter at least a name and email'}
          onPress={submit}
        >
          {busy ? 'Creating account…' : 'Create account'}
        </Button>
      </div>
    </Sheet>
  );
}
