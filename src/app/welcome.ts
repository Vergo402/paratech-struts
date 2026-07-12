// Welcome page entry (#442) — static fallback by default; capability-gated
// cinematic experience on top (round 3). Order matters: classes go on <html>
// before first paint-dependent JS so CSS modes apply cleanly.
import '@fontsource-variable/fraunces';
import '@fontsource-variable/public-sans';
import './welcome.css';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const saveData =
  (navigator as { connection?: { saveData?: boolean } }).connection?.saveData === true;
const hasWebGL = (() => {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
})();

// Reduced motion: CSS hides the videos; removing them also stops the downloads.
if (reduced) {
  document.querySelectorAll<HTMLVideoElement>('video').forEach((v) => v.remove());
} else {
  document.documentElement.classList.add('show-lite');
}

// Never show a broken-image glyph if the poster asset is missing.
document.querySelectorAll<HTMLImageElement>('.hero-fallback').forEach((img) => {
  if (img.complete && img.naturalWidth === 0) img.remove();
  else img.addEventListener('error', () => img.remove());
});

// Videos play only while on screen (the closing loop has no autoplay — it
// starts here the first time it scrolls into view).
if (!reduced) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        const v = e.target as HTMLVideoElement;
        if (e.isIntersecting) void v.play().catch(() => undefined);
        else v.pause();
      });
    },
    { threshold: 0.15 },
  );
  document.querySelectorAll<HTMLVideoElement>('video').forEach((v) => io.observe(v));
}

// The cinematic experience runs on ANY size with motion + WebGL + no data-saver
// (phones included — portrait re-blocking via gsap.matchMedia). `cine-phone`
// scopes the portrait CSS and tracks the breakpoint live.
if (!reduced && !saveData && hasWebGL) {
  const root = document.documentElement;
  root.classList.add('show-full');
  const bp = matchMedia('(min-width: 900px)');
  root.classList.toggle('cine-phone', !bp.matches);
  bp.addEventListener('change', (e) => root.classList.toggle('cine-phone', !e.matches));
  import('./welcome-show')
    .then((m) => m.init())
    .catch(() => {
      // Any load/runtime failure degrades to the lite page, never a broken one.
      root.classList.remove('show-full', 'cine-phone');
    });
}
