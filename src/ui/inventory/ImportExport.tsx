import { useRef, useState, type ChangeEvent } from 'react';
import { Button, Modal } from '@ui/primitives';
import type { ImportOutcome } from '@ui/hooks';
import { download } from '@ui/util/download';

// Export / template / import controls. CSV-only this slice. Import is hard-blocked
// while an operation is active (the 10-column file has no Available column, so a
// round-trip on a deployed item would silently reset its available count). The
// post-import outcome — including any orphan-skipped rows — surfaces in a Modal
// (ADR-016: inventory-consequential result, not a toast).

export interface ImportExportProps {
  opActive: boolean;
  /** manageInventory (#380) — gates Import (it mutates stock). */
  canManage: boolean;
  /** manageData (#380) — gates Export + Template (export/delete department data). */
  canExport: boolean;
  exportCsv: () => string;
  templateCsv: () => string;
  onImport: (text: string) => Promise<ImportOutcome>;
}

// FileReader, not Blob.text() — broader support (older Safari, and jsdom in tests).
function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export function ImportExport({ opActive, canManage, canExport, exportCsv, templateCsv, onImport }: ImportExportProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<ImportOutcome | null>(null);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-importing the same file
    if (!file) return;
    setResult(await onImport(await readFileText(file)));
  };

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
        <Button
          variant="secondary"
          onPress={() => fileRef.current?.click()}
          disabled={opActive}
          disabledReason="Finish the operation to import"
        >
          Import CSV
        </Button>
      )}
      <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={onFile} />

      <Modal
        open={result != null}
        onClose={() => setResult(null)}
        title="Import complete"
        variant="alert"
        footer={
          <Button variant="primary" onPress={() => setResult(null)}>
            OK
          </Button>
        }
      >
        {result && (
          <div className="fs-inv-import-result">
            <p>
              {result.imported} row{result.imported === 1 ? '' : 's'} imported
              {result.skipped > 0 ? `, ${result.skipped} skipped (would strand deployed stock)` : ''}.
            </p>
            {result.warnings.length > 0 && (
              <ul className="fs-inv-warnings">
                {result.warnings.slice(0, 8).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
                {result.warnings.length > 8 && <li>…and {result.warnings.length - 8} more</li>}
              </ul>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
