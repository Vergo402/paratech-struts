/**
 * Haptic feedback shims (motion.md / button.md / slider.md). The web has no
 * impact-strength API — navigator.vibrate is the closest portable signal and
 * is absent on iOS Safari and in jsdom, so both calls are safe no-ops there.
 */
function vibrate(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(pattern);
  }
}

/** Light tick on touch-start of a control. */
export function tapHaptic(): void {
  vibrate(10);
}

/** Medium impact on a consequential commit (status slide, deploy). */
export function commitHaptic(): void {
  vibrate(30);
}
