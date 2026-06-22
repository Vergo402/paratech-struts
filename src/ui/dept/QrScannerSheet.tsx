import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Button, Sheet } from '@ui/primitives';

/**
 * QrScannerSheet — the live-camera invite-QR reader (ADR-022: QR-primary join).
 * Opens the back camera, decodes frames with jsQR, and fires onDetect with the
 * raw decoded text on the first hit. A Sheet interrupt (modal-vs-sheet doctrine):
 * scanning is a momentary capture, dismissible at any time; the typed-code field
 * underneath is always the fallback, so a denied/absent camera is calm, never a
 * dead end. iOS needs muted + playsinline or it tries to fullscreen the video.
 */
export interface QrScannerSheetProps {
  open: boolean;
  onClose: () => void;
  /** Raw decoded text from the QR (the caller normalizes + validates it). */
  onDetect: (text: string) => void;
}

export function QrScannerSheet({ open, onClose, onDetect }: QrScannerSheetProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Keep onDetect in a ref so the camera effect depends only on `open` — an
  // inline handler from the parent must not restart the camera every render.
  const onDetectRef = useRef(onDetect);
  onDetectRef.current = onDetect;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    let stream: MediaStream | null = null;
    let raf = 0;
    let cancelled = false;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    function tick() {
      const v = videoRef.current;
      if (cancelled || !v || !ctx) return;
      if (v.readyState === v.HAVE_ENOUGH_DATA && v.videoWidth > 0) {
        canvas.width = v.videoWidth;
        canvas.height = v.videoHeight;
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const found = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
        if (found && found.data) {
          cancelled = true;
          onDetectRef.current(found.data);
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    }

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        const v = videoRef.current;
        // The await above means cleanup may have already run (rapid open→Cancel):
        // at that point `stream` was still null, so cleanup stopped nothing. Stop
        // the just-acquired stream here or the camera stays live (indicator lit).
        if (cancelled || !v) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        v.srcObject = stream;
        await v.play();
        tick();
      } catch {
        setError('Camera unavailable. Type or paste the code instead.');
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [open]);

  return (
    <Sheet open={open} onClose={onClose} title="Scan invite QR">
      <div className="flex flex-col gap-4">
        {error ? (
          <p className="fs-field-msg fs-field-msg--error" aria-live="polite">
            {error}
          </p>
        ) : (
          <div
            style={{
              position: 'relative',
              borderRadius: 12,
              overflow: 'hidden',
              background: '#000',
              aspectRatio: '1 / 1',
            }}
          >
            <video
              ref={videoRef}
              muted
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            {/* Framing reticle — a calm target, not an alarm. */}
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: '18%',
                border: '3px solid rgba(255,255,255,0.85)',
                borderRadius: 12,
              }}
            />
          </div>
        )}
        <Button variant="secondary" fullWidth onPress={onClose}>
          Cancel
        </Button>
      </div>
    </Sheet>
  );
}
