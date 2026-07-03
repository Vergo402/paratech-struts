import { useState } from 'react';

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

/**
 * PlateThumb — the real part photo (public/plates/<id>.jpg, the Paratech manual
 * figures), falling back to the initials swatch when there's no photo ('none')
 * or it fails to load. The one shared thumb for every plate grid (#384) — the
 * deduction ledgers and the inventory quick-add all render this.
 */
export function PlateThumb({ id, name }: { id: string; name: string }) {
  const [err, setErr] = useState(false);
  if (id === 'none' || err) return <PlateSwatch name={name} />;
  return (
    <img
      className="fs-swatch fs-swatch--photo"
      src={`/plates/${id}.jpg`}
      alt=""
      aria-hidden="true"
      onError={() => setErr(true)}
    />
  );
}
