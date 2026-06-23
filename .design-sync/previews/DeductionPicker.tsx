import { DeductionPicker } from 'fieldshore-v4';

// DeductionPicker — the fixed-order deduction ledger: Raw opening → Header wood →
// Top plate → Bottom plate → Footer wood → Required strut length. Build order,
// top-down, never re-sorts. All math from core (deduct-once); the required length
// floors to ⅛″ and turns --danger when deductions consume the opening. Controlled
// on a measurement (exact eighths) + a Deductions object; static onChange.
const noop = () => {};
const E = (inches: number, n = 0) => inches * 8 + n;

const NONE = { headerWood: 'none', footerWood: 'none', topPlate: 'none', bottomPlate: 'none' };

export const NoDeductions = () => (
  // 47 3/8″ raw, nothing deducted yet — required length equals the opening.
  <DeductionPicker measurementEighths={E(47, 3)} value={NONE} onChange={noop} />
);

export const TShoreBuild = () => (
  // A T-Shore build: 4×4 header + footer wood, Multi-Base plates top and bottom.
  <DeductionPicker
    measurementEighths={E(93, 5)}
    value={{ headerWood: '4x4', footerWood: '4x4', topPlate: 'multi', bottomPlate: 'multi' }}
    onChange={noop}
  />
);

export const ThreePostBuild = () => (
  // 3-Post build (USACE 6×6 spec): 6×6 header + footer, Multi-Base top and bottom.
  <DeductionPicker
    measurementEighths={E(72, 0)}
    value={{ headerWood: '6x6', footerWood: '6x6', topPlate: 'multi', bottomPlate: 'multi' }}
    onChange={noop}
  />
);

export const Collapsible = () => (
  // #349 collapsed ledger: required length + applied summary stay visible.
  <DeductionPicker
    measurementEighths={E(58, 0)}
    value={{ headerWood: '4x4', footerWood: 'none', topPlate: 'multi', bottomPlate: 'none' }}
    onChange={noop}
    collapsible
  />
);
