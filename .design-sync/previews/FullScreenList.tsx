import { FullScreenList } from 'fieldshore-v4';

// FullScreenList — picker variant 3: 8+ options, or anything needing
// search/filter. Ships as a fullscreen overlay; search appears once the set
// exceeds 7 items and filters locally. A row tap commits and closes; Cancel
// leaves the value. Rendered open so the populated list shows.

const STRUTS = [
  { value: 'ls-812', label: 'LongShore 812', sub: '4–8 ft · 16,000 lb' },
  { value: 'ls-base', label: 'LongShore base', sub: 'fixed base section' },
  { value: 'lk-36-57', label: 'LK 36-57', sub: '36–57 in' },
  { value: 'lk-57-99', label: 'LK 57-99', sub: '57–99 in' },
  { value: 'acme-12', label: 'Acme 12', sub: 'threaded · 12 in' },
  { value: 'acme-24', label: 'Acme 24', sub: 'threaded · 24 in' },
  { value: 'mega-30', label: 'MegaShore 30', sub: 'heavy · 30 in' },
  { value: 'super-58', label: 'SuperShore 58', sub: '58 in' },
  { value: 'longstroke-44', label: 'LongStroke 44', sub: '44 in' },
] as const;

export const StrutModel = () => (
  <FullScreenList
    open
    onClose={() => {}}
    title="Strut model"
    value="ls-812"
    onSelect={() => {}}
    options={STRUTS}
  />
);
