import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

/**
 * QrImage — renders a scannable QR for an invite code (ADR-022: QR-primary join).
 * Always high-contrast dark-on-white inside a white card: a QR is NOT themed —
 * inverting it in dark mode breaks the scanner's contrast assumption, so the
 * white quiet-zone is deliberate on any background. Decorative-but-labeled: the
 * human-readable code is always shown beside it (radio / no-camera fallback), so
 * the QR is an accelerator, never the only path.
 */
export interface QrImageProps {
  value: string;
  /** Pixel size of the square. */
  size?: number;
  /** aria-label for the canvas (defaults to the code). */
  label?: string;
}

export function QrImage({ value, size = 176, label }: QrImageProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // toCanvas is async; a stale value can't win because the effect re-runs and
    // redraws the same canvas. Errors are swallowed — the readable code stands.
    QRCode.toCanvas(el, value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    }).catch(() => {});
  }, [value, size]);

  return (
    <div
      style={{
        display: 'inline-flex',
        alignSelf: 'flex-start', // hug the QR in a flex column, never stretch full-width
        padding: 10,
        background: '#ffffff',
        borderRadius: 12,
      }}
    >
      <canvas
        ref={ref}
        width={size}
        height={size}
        role="img"
        aria-label={label ?? `QR code for invite code ${value}`}
        style={{ display: 'block', width: size, height: size }}
      />
    </div>
  );
}
