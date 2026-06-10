/**
 * PlateSwatch — placeholder thumbnail for the visual-grid picker. v3 embedded
 * ~80KB base64 plate photos; the slice ships initials on the accent-subtle
 * tile instead (real photos land later as public/plates/*.jpg and replace
 * this via VisualGridPicker's renderThumb).
 */
export function PlateSwatch({ name }: { name: string }) {
  const initials = name
    .split(/[\s-]+/)
    .filter((w) => /^[A-Za-z0-9]/.test(w))
    .slice(0, 2)
    .map((w) => (w[0] ?? '').toUpperCase())
    .join('');
  return (
    <span className="fs-swatch" aria-hidden="true">
      {initials || '·'}
    </span>
  );
}
