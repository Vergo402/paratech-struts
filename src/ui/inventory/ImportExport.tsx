import { useState } from 'react';
import { Button } from '@ui/primitives';
import type { ParsedImportRow } from '@ui/hooks';
import { download } from '@ui/util/download';
import { ImportFlow } from './ImportFlow';

// Export / template / import controls. Import opens the 4-step validated flow
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
}

export function ImportExport({ opActive, canManage, canExport, exportCsv, templateCsv, importRows }: ImportExportProps) {
  const [flowOpen, setFlowOpen] = useState(false);

  // A member with neither capability sees no data controls at all (hide treatment, #380).
  if (!canManage && !canExport) return null;

  return (
    <div className="fs-inv-io">
      {canExport && (
        <>
          <Button variant="secondary" onPress={() => download('fieldshore-inventory.csv', exportCsv())}>
            Export CSV
          </Button>
          <Button variant="tertiary" onPress={() => download('fieldshore-inventory-template.csv', templateCsv())}>
            Template
          </Button>
        </>
      )}
      {canManage && (
        <Button variant="secondary" onPress={() => setFlowOpen(true)}>
          Import CSV
        </Button>
      )}

      <ImportFlow open={flowOpen} onClose={() => setFlowOpen(false)} opActive={opActive} importRows={importRows} />
    </div>
  );
}
