import { useInventoryActions, useOperation, usePermissions } from '@ui/hooks';
import { ImportExport } from '@ui/inventory/ImportExport';

/**
 * Data management — the ONE Excel/CSV implementation, shared with Inventory and
 * reached from both (50-settings.md §4, #307). It mounts the same `ImportExport`
 * the Inventory screen does, with identical gating (Export/Template = manageData,
 * Import = manageInventory). Import is blocked while an operation is active — the
 * 10-column file has no Available column, so a round-trip would reset deployed
 * counts; the warning shows only when an op is actually running.
 */
export function DataManagementPage() {
  const op = useOperation();
  const perms = usePermissions();
  const actions = useInventoryActions();

  return (
    <div className="flex flex-col gap-6">
      <h1 style={{ font: 'var(--type-headline-1)' }}>Data management</h1>
      <p className="text-ink-tertiary" style={{ font: 'var(--type-body-lg)' }}>
        Move your whole department&rsquo;s inventory in and out as a spreadsheet (CSV) &mdash; back
        it up, edit it on a computer, or set up a new device.
      </p>

      {op != null && (
        <p
          role="status"
          style={{
            font: 'var(--type-body)',
            color: 'var(--color-status-pending)',
            background: 'var(--color-status-pending-bg)',
            borderRadius: 'var(--radius-card)',
            padding: 'var(--space-3) var(--space-4)',
          }}
        >
          Import is locked while an operation is active &mdash; finish the operation first, so a
          round-trip can&rsquo;t reset deployed counts.
        </p>
      )}

      <ImportExport
        opActive={op != null}
        canManage={perms.manageInventory}
        canExport={perms.manageData}
        exportCsv={actions.exportCsv}
        templateCsv={actions.templateCsv}
        onImport={actions.importCsv}
      />
    </div>
  );
}
