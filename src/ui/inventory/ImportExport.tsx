import { useState } from 'react';
import { Sheet } from '@ui/primitives';
import type { ParsedImportRow } from '@ui/hooks';
import { download } from '@ui/util/download';
import { ImportFlow } from './ImportFlow';

// Export / template / import controls, demoted to ONE quiet trigger (craft.md §5 gold
// budget — the header keeps a single primary action, and it isn't this). The trigger
// opens a small sheet of the three data rows. Import opens the 4-step validated flow
// (ImportFlow, ADR-038) — file pick → column map → row validation → review+commit.
// Importing during an active operation is allowed (no longer hard-blocked): the
// store preserves deployed counts and skips any row that would strand deployed
// gear, and Step 3 surfaces a banner. CSV-only this slice.

export interface ImportExportProps {
  opActive: boolean;
  /** manageInventory (#380) — gates Import (it mutates stock). */
  canManage: boolean;
  /** manageData (#380) — gates Export + Template (export/delete department data). */
  canExport: boolean;
  exportCsv: () => string;
  templateCsv: () => string;
  importRows: (rows: ParsedImportRow[]) => Promise<{ imported: number; skipped: number }>;
  /** 'trigger' = one quiet icon button opening the rows in a sheet (Inventory header);
   *  'rows' = the rows inline (Data management page). */
  variant?: 'trigger' | 'rows';
}

export function ImportExport({
  opActive,
  canManage,
  canExport,
  exportCsv,
  templateCsv,
  importRows,
  variant = 'rows',
}: ImportExportProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [flowOpen, setFlowOpen] = useState(false);

  // A member with neither capability sees no data controls at all (hide treatment, #380).
  if (!canManage && !canExport) return null;

  const rows = (
    <div className="fs-inv-data-rows">
      {canExport && (
        <>
          <button
            type="button"
            className="fs-inv-data-row"
            onClick={() => download('fieldshore-inventory.csv', exportCsv())}
          >
            <span className="fs-inv-data-row-label">Export inventory</span>
            <span className="fs-inv-data-row-sub">CSV, round-trip safe</span>
          </button>
          <button
            type="button"
            className="fs-inv-data-row"
            onClick={() => download('fieldshore-inventory-template.csv', templateCsv())}
          >
            <span className="fs-inv-data-row-label">Download template</span>
            <span className="fs-inv-data-row-sub">Blank CSV with the expected columns</span>
          </button>
        </>
      )}
      {canManage && (
        <button
          type="button"
          className="fs-inv-data-row"
          onClick={() => {
            setSheetOpen(false);
            setFlowOpen(true);
          }}
        >
          <span className="fs-inv-data-row-label">Import inventory</span>
          <span className="fs-inv-data-row-sub">From CSV or the template</span>
        </button>
      )}
    </div>
  );

  return (
    <>
      {variant === 'trigger' ? (
        <>
          <button
            type="button"
            className="fs-inv-data-btn"
            aria-label="Import and export inventory"
            onClick={() => setSheetOpen(true)}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M7 16V4M7 4L3 8M7 4l4 4M17 8v12M17 20l4-4M17 20l-4-4" />
            </svg>
          </button>
          <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Inventory data">
            {rows}
          </Sheet>
        </>
      ) : (
        rows
      )}

      <ImportFlow open={flowOpen} onClose={() => setFlowOpen(false)} opActive={opActive} importRows={importRows} />
    </>
  );
}
