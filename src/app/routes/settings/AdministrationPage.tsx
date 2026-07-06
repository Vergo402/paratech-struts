import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button, Toggle } from '@ui/primitives';
import { useDepartment, usePermissions, useAuditAccess, useCustomTitles, useDeptPolicies } from '@ui/hooks';
import { AddCustomTitleModal } from '@ui/command/AddCustomTitleModal';
import { ChecklistEditor } from '@ui/settings/ChecklistEditor';
import { kindLabel } from '@core/org';
import { SettingsGroup, SettingsRow, SettingsNote } from './SettingsRows';

/**
 * Administration — the department's back-office editors (50-settings.md §Administration
 * + §Department config), composed per craft.md Stage 1b: gateways and actions are
 * quiet card rows; the page's one gold element is the Add-custom-title row. Each
 * block keeps its own gate (the page is only in the nav when the viewer holds one
 * of these entitlements). The after-action policy toggle keeps its control state.
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
      <div className="flex flex-col gap-2">
        <h1 style={{ font: 'var(--type-headline-1)' }}>Administration</h1>
        <p className="fs-set-pagesub">Manage your department and review the incident record.</p>
      </div>

      {(perms.manageUsers || !!department) && (
        <SettingsGroup label="Department">
          {perms.manageUsers && (
            <SettingsRow
              label="Users & roles"
              description="Invite members, set what each role can do"
              onPress={() => navigate({ to: '/users' })}
            />
          )}
          {/* ponytail: Audit Log visible to all connected members, ICS-position-checked at entry (50-settings.md §Administration) */}
          <SettingsRow
            label="Audit log"
            description={
              audit.canIncident
                ? 'Incident and governance record'
                : 'Requires Incident Commander or Operations assignment in an active operation'
            }
            disabled={!audit.canIncident}
            onPress={() => navigate({ to: '/audit-log' })}
          />
        </SettingsGroup>
      )}

      {perms.manageSettings && (
        <SettingsGroup
          label="Custom ICS titles"
          description="Roles your department adds to the built-in ICS catalog. Strike Teams and Task Forces carry a member composition that auto-fills when placed."
        >
          {customTitles.length === 0 ? (
            <SettingsNote>None yet — your department&rsquo;s roles use the built-in ICS catalog.</SettingsNote>
          ) : (
            customTitles.map((t) => (
              <SettingsRow
                key={t.id}
                label={t.title}
                description={
                  kindLabel(t.kind) +
                  (t.members && t.members.length ? ` · ${t.members.map((m) => `${m.count} ${m.type}`).join(', ')}` : '')
                }
                trailing={
                  <Button variant="tertiary" size="standard" destructive onPress={() => void removeCustomTitle(t.id)}>
                    Remove
                  </Button>
                }
              />
            ))
          )}
          <SettingsRow accent label="Add custom title" trailing={null} onPress={() => setAddTitleOpen(true)} />
        </SettingsGroup>
      )}

      {department && perms.manageSettings && <ChecklistEditor />}

      {perms.manageSettings && (
        <section className="fs-set-section" aria-label="Department policies">
          <h2 className="fs-set-section-label">Department policies</h2>
          <div className="fs-set-card fs-set-card--pad">
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
          </div>
        </section>
      )}

      <AddCustomTitleModal open={addTitleOpen} onClose={() => setAddTitleOpen(false)} onAdd={addCustomTitle} />
    </div>
  );
}
