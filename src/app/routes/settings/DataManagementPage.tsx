import { useInventoryActions, useOperation, usePermissions } from '@ui/hooks';
import { ImportExport } from '@ui/inventory/ImportExport';

/**
 * Data management — the ONE Excel/CSV implementation, shared with Inventory and
 * reached from both (50-settings.md §4, #307). It mounts the same `ImportExport`
 * the Inventory screen does, with identical gating (Export/Template = manageData,
 * Import = manageInventory). Import is ALLOWED while an operation is active (ADR-038):
 * the store preserves deployed counts and skips any row that would strand deployed
 * gear, so the banner here only informs — it never blocks (matches the import flow's
 * own Step-3 banner).
 */
export function DataManagementPage() {
  const op = useOperation();
  const perms = usePermissions();
  const actions = useInventoryActions();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 style={{ font: 'var(--type-headline-1)' }}>Data management</h1>
        <p className="fs-set-pagesub">
          Move your whole department&rsquo;s inventory in and out as a spreadsheet (CSV) &mdash; back
          it up, edit it on a computer, or set up a new device.
        </p>
      </div>

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
          An operation is active &mdash; importing is fine. Deployed items aren&rsquo;t changed, and
          any row that would strand deployed gear is skipped.
        </p>
      )}

      <ImportExport
        opActive={op != null}
        canManage={perms.manageInventory}
        canExport={perms.manageData}
        exportCsv={actions.exportCsv}
        templateCsv={actions.templateCsv}
        importRows={actions.importRows}
      />
    </div>
  );
}
