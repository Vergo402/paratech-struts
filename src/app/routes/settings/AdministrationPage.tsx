import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button, Toggle } from '@ui/primitives';
import { useDepartment, usePermissions, useAuditAccess, useCustomTitles, useDeptPolicies } from '@ui/hooks';
import { AddCustomTitleModal } from '@ui/command/AddCustomTitleModal';
import { ChecklistEditor } from '@ui/settings/ChecklistEditor';
import { kindLabel } from '@core/org';

/**
 * Administration — the department's back-office editors (50-settings.md §Administration
 * + §Department config). Each block keeps its own gate (the page itself is only in
 * the nav when the viewer holds one of these entitlements): Users & roles + Audit
 * log are gateways to their screens; Custom ICS titles + Checklists are the
 * manageSettings editors. The after-action policy toggle joins here in Inc 4.
 */
export function AdministrationPage() {
  const { department } = useDepartment();
  const perms = usePermissions();
  const audit = useAuditAccess();
  const { titles: customTitles, add: addCustomTitle, remove: removeCustomTitle } = useCustomTitles();
  const { afterActionEmail, setAfterActionEmail } = useDeptPolicies();
  const navigate = useNavigate();
  const [addTitleOpen, setAddTitleOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <h1 style={{ font: 'var(--type-headline-1)' }}>Administration</h1>

      {(perms.manageUsers || audit.canIncident) && (
        <section className="flex flex-col gap-3">
          <p className="text-ink-tertiary" style={{ font: 'var(--type-body-lg)' }}>
            Manage your department and review the incident record.
          </p>
          {perms.manageUsers && (
            <Button variant="secondary" onPress={() => navigate({ to: '/users' })}>
              Users &amp; roles
            </Button>
          )}
          <Button variant="secondary" onPress={() => navigate({ to: '/audit-log' })}>
            Audit log
          </Button>
        </section>
      )}

      {perms.manageSettings && (
        <section className="flex flex-col gap-3">
          <h2 style={{ font: 'var(--type-headline-2)' }}>Custom ICS titles</h2>
          <p className="text-ink-tertiary" style={{ font: 'var(--type-body-lg)' }}>
            Roles your department adds to the built-in ICS catalog. Placement follows the role&rsquo;s class. Strike
            Teams and Task Forces carry a member composition that auto-fills when placed.
          </p>
          {customTitles.length === 0 ? (
            <p className="text-ink-tertiary" style={{ font: 'var(--type-body-lg)' }}>None yet.</p>
          ) : (
            <ul className="flex flex-col" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {customTitles.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3"
                  style={{ padding: 'var(--space-2) 0', borderBottom: 'var(--stroke-width) solid var(--surface-stroke)' }}
                >
                  <span className="flex flex-col">
                    <span style={{ font: 'var(--type-body-medium)' }}>{t.title}</span>
                    <span className="text-ink-tertiary" style={{ font: 'var(--type-caption)' }}>
                      {kindLabel(t.kind)}
                      {t.members && t.members.length ? ` · ${t.members.map((m) => `${m.count} ${m.type}`).join(', ')}` : ''}
                    </span>
                  </span>
                  <Button variant="tertiary" size="standard" destructive onPress={() => void removeCustomTitle(t.id)}>
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <Button variant="secondary" onPress={() => setAddTitleOpen(true)}>
            Add custom title
          </Button>
        </section>
      )}

      {department && perms.manageSettings && <ChecklistEditor />}

      {perms.manageSettings && (
        <section className="flex flex-col gap-3">
          <h2 style={{ font: 'var(--type-headline-2)' }}>Department policies</h2>
          <Toggle
            size="standard"
            label="Send after-action record by email"
            helper={
              <>
                When an incident closes, email the assembled after-action record to the Incident
                Commander and Operations Section Chief. On by default; your department can switch it
                off.
                <br />
                <span className="text-ink-tertiary">
                  Email delivery turns on in a later release &mdash; this saves your preference now.
                </span>
              </>
            }
            checked={afterActionEmail}
            onChange={(next) => void setAfterActionEmail(next)}
          />
        </section>
      )}

      <AddCustomTitleModal open={addTitleOpen} onClose={() => setAddTitleOpen(false)} onAdd={addCustomTitle} />
    </div>
  );
}
