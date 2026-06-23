/** Trigger a client-side file download of `text` as `filename` (Blob + ObjectURL).
 *  Lifted from ui/inventory/ImportExport now that the Audit Log (#211) exports too. */
export function download(filename: string, text: string, mime = 'text/csv;charset=utf-8'): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
