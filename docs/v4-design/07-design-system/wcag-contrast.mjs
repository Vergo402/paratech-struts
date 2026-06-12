#!/usr/bin/env node
// WCAG 2.1 contrast verification for the FieldShore v4 color tokens.
// Reproducibility artifact for 07-design-system/color.md — re-run to reproduce
// every documented ratio:  node docs/v4-design/07-design-system/wcag-contrast.mjs
//
// Formula: sRGB → linear, relative luminance L = 0.2126R + 0.7152G + 0.0722B,
// contrast = (L_light + 0.05) / (L_dark + 0.05).
// AA thresholds: 4.5 normal text, 3.0 large text (>=18.66px bold / 24px) & UI components.

function srgbToLinear(c) {
  c /= 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function luminance(hex) {
  const m = hex.replace('#', '');
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}
function ratio(fg, bg) {
  const a = luminance(fg), b = luminance(bg);
  const hi = Math.max(a, b), lo = Math.min(a, b);
  return (hi + 0.05) / (lo + 0.05);
}

// use: 'normal' (4.5), 'large' (3.0), 'ui' (3.0)
const THRESH = { normal: 4.5, large: 3.0, ui: 3.0 };

const THEMES = {
  LIGHT: [
    ['text-primary  / surface-bg',   '#1A1A1A', '#F7F6F3', 'normal'],
    ['text-primary  / surface-card', '#1A1A1A', '#FFFFFF', 'normal'],
    ['text-secondary/ surface-bg',   '#5C5C5C', '#F7F6F3', 'normal'],
    ['text-secondary/ surface-card', '#5C5C5C', '#FFFFFF', 'normal'],
    ['text-tertiary / surface-bg',   '#8A8A8A', '#F7F6F3', 'large'],
    ['accent        / surface-bg',   '#8C6700', '#F7F6F3', 'normal'],
    ['accent        / surface-card', '#8C6700', '#FFFFFF', 'normal'],
    ['on-accent     / accent fill',  '#FFFFFF', '#8C6700', 'normal'],
    // status: status-text on status-tint
    ['status pending', '#4B5563', '#F3F4F6', 'normal'],
    ['status process',  '#1D4ED8', '#EFF6FF', 'normal'],
    ['status strutset','#5B21B6', '#F5F3FF', 'normal'],
    ['status cutting', '#92400E', '#FEF3C7', 'normal'],
    ['status runner',  '#9A3412', '#FFEDD5', 'normal'],
    ['status secured', '#065F46', '#ECFDF5', 'normal'],
    ['status returned','#57534E', '#F5F5F4', 'normal'],
    ['status warning', '#B91C1C', '#FEF2F2', 'normal'],
    // sys-lockstroke strut-system color (S12 handoff §4) — on bg AND card
    ['sys-lockstroke / surface-bg',   '#0E7490', '#F7F6F3', 'normal'],
    ['sys-lockstroke / surface-card', '#0E7490', '#FFFFFF', 'normal'],
  ],
  DARK: [
    ['text-primary  / surface-card',     '#F0EFEC', '#252930', 'normal'],
    ['text-primary  / surface-bg',       '#F0EFEC', '#1C1F23', 'normal'],
    ['text-secondary/ surface-card',     '#9B9A97', '#252930', 'normal'],
    ['text-tertiary / surface-card',     '#8A8A86', '#252930', 'large'],
    ['accent        / surface-bg',       '#D4A017', '#1C1F23', 'normal'],
    ['accent        / surface-card',     '#D4A017', '#252930', 'normal'],
    ['on-accent     / accent fill',      '#1C1F23', '#D4A017', 'normal'],
    // status: bright status-text on dark status-tint
    ['status pending', '#9CA3AF', '#2A2D31', 'normal'],
    ['status process',  '#60A5FA', '#172033', 'normal'],
    ['status strutset','#A78BFA', '#221A38', 'normal'],
    ['status cutting', '#FBBF24', '#2A2410', 'normal'],
    ['status runner',  '#FB923C', '#2A1B0F', 'normal'],
    ['status secured', '#34D399', '#0F2620', 'normal'],
    ['status returned','#A8A29E', '#26231F', 'normal'],
    ['status warning', '#F87171', '#2A1416', 'normal'],
    // sys-lockstroke strut-system color (S12 handoff §4) — on bg AND card
    ['sys-lockstroke / surface-bg',   '#06B6D4', '#1C1F23', 'normal'],
    ['sys-lockstroke / surface-card', '#06B6D4', '#252930', 'normal'],
  ],
  SUNLIGHT: [
    ['text-primary  / surface-bg', '#000000', '#FFFFFF', 'normal'],
    ['accent        / surface-bg', '#6E5000', '#FFFFFF', 'normal'],
    ['on-accent     / accent fill', '#FFFFFF', '#6E5000', 'normal'],
    // status badges: white text on solid status fill (>=4.5 target; many clear 7)
    ['status pending  (white on)', '#FFFFFF', '#374151', 'normal'],
    ['status process   (white on)', '#FFFFFF', '#1D4ED8', 'normal'],
    ['status strutset (white on)', '#FFFFFF', '#5B21B6', 'normal'],
    ['status cutting  (white on)', '#FFFFFF', '#92400E', 'normal'],
    ['status runner   (white on)', '#FFFFFF', '#9A3412', 'normal'],
    ['status secured  (white on)', '#FFFFFF', '#065F46', 'normal'],
    ['status returned (white on)', '#FFFFFF', '#44403C', 'normal'],
    ['status warning  (white on)', '#FFFFFF', '#B91C1C', 'normal'],
    // sys-lockstroke strut-system color (S12 handoff §4) — 7:1 contract; bg/card both #FFFFFF
    ['sys-lockstroke / surface-bg',   '#155E75', '#FFFFFF', 'normal'],
    ['sys-lockstroke / surface-card', '#155E75', '#FFFFFF', 'normal'],
  ],
  BROADCAST: [
    // 7:1 AAA target — read at 8-12 ft
    ['text-primary  / bc-bg',   '#F4F4F4', '#141618', 'normal'],
    ['text-secondary/ bc-bg',   '#C0BFBC', '#141618', 'normal'],
    ['accent        / bc-bg',   '#E5B53D', '#141618', 'normal'],
    // status as text/border accent on bc-bg (no fill)
    ['status pending', '#9CA3AF', '#141618', 'normal'],
    ['status process',  '#60A5FA', '#141618', 'normal'],
    ['status strutset','#B9A7FC', '#141618', 'normal'],
    ['status cutting', '#FBBF24', '#141618', 'normal'],
    ['status runner',  '#FB923C', '#141618', 'normal'],
    ['status secured', '#34D399', '#141618', 'normal'],
    ['status returned','#A8A29E', '#141618', 'normal'],
    ['status warning', '#FB8C8C', '#141618', 'normal'],
    // sys-lockstroke strut-system color (S12 handoff §4) — 7:1 contract; bg/card both #141618
    ['sys-lockstroke / surface-bg',   '#22D3EE', '#141618', 'normal'],
    ['sys-lockstroke / surface-card', '#22D3EE', '#141618', 'normal'],
  ],
};

let fails = 0;
for (const [theme, pairs] of Object.entries(THEMES)) {
  console.log(`\n=== ${theme} ===`);
  console.log('  ratio   AA(use)  pass  AAA7  token');
  for (const [label, fg, bg, use] of pairs) {
    const r = ratio(fg, bg);
    const need = THRESH[use];
    const passAA = r >= need;
    const pass7 = r >= 7.0;
    if (!passAA) fails++;
    const flag = passAA ? ' ok ' : 'FAIL';
    console.log(
      `  ${r.toFixed(2).padStart(5)}  ${String(need).padStart(3)}(${use.padEnd(6)}) ${flag}  ${pass7 ? '7ok' : '   '}  ${label}  ${fg} on ${bg}`
    );
  }
}
console.log(`\n${fails === 0 ? 'ALL PASS for their use class' : fails + ' FAILURE(S)'}`);
