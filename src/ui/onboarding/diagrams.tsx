/**
 * Field diagrams — simple inline-SVG line drawings (the NavIcon pattern, no asset
 * pipeline) that anchor each welcome slide to the field moment it teaches: size up
 * the opening, brace it, work the checklist. Stroke = currentColor, sized by the
 * .fs-ob-diagram CSS box; decorative, so aria-hidden (the slide copy carries the
 * meaning — Principle 9, no mystery meat).
 */
const COMMON = {
  className: 'fs-ob-diagram',
  viewBox: '0 0 96 72',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

/** A collapse opening with a measurement arrow — "size up the gap." */
export function MeasureOpeningDiagram() {
  return (
    <svg {...COMMON}>
      <path d="M20 64 L20 16 L76 16 L76 64" />
      <line x1="8" y1="64" x2="88" y2="64" />
      <line x1="48" y1="23" x2="48" y2="57" />
      <path d="M48 23 l-4 6 M48 23 l4 6" />
      <path d="M48 57 l-4 -6 M48 57 l4 -6" />
    </svg>
  );
}

/** A strut braced between two surfaces with end plates — "the strut that fits." */
export function StrutFitDiagram() {
  return (
    <svg {...COMMON}>
      <line x1="14" y1="12" x2="14" y2="64" />
      <line x1="82" y1="12" x2="82" y2="64" />
      <line x1="6" y1="64" x2="90" y2="64" />
      <line x1="20" y1="38" x2="76" y2="38" strokeWidth={3} />
      <rect x="16" y="31" width="5" height="14" rx="1" />
      <rect x="75" y="31" width="5" height="14" rx="1" />
    </svg>
  );
}

/** A checklist clipboard — "learn by doing, at your own pace." */
export function ChecklistDiagram() {
  return (
    <svg {...COMMON}>
      <rect x="24" y="10" width="48" height="56" rx="4" />
      <rect x="38" y="6" width="20" height="9" rx="2" />
      <path d="M31 26 l3 3 l5 -6" />
      <line x1="44" y1="26" x2="64" y2="26" />
      <path d="M31 41 l3 3 l5 -6" />
      <line x1="44" y1="41" x2="64" y2="41" />
      <rect x="31" y="52" width="7" height="7" rx="1" />
      <line x1="44" y1="55" x2="64" y2="55" />
    </svg>
  );
}
