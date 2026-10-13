import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Destructive secondary/tertiary buttons are TEXT on the page surface. --danger-text is the ink on the
// FILLED danger surface (white in Sunlight), so using it there made `Remove <rig>` / `End Operation`
// white-on-white (1:1) in Sunlight (#513 live proof). They take --danger-ink instead.
const tokens = readFileSync(resolve(__dirname, '../../app/tokens.css'), 'utf8');
const primitives = readFileSync(resolve(__dirname, './primitives.css'), 'utf8');

const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = c.map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};
const block = (theme: string) => {
  const start = tokens.indexOf(`[data-theme="${theme}"] {`);
  return tokens.slice(start, tokens.indexOf('\n}', start));
};
const token = (css: string, name: string) => new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`).exec(css)?.[1];

describe('--danger-ink (destructive text/outline on the page surface)', () => {
  const floors: Record<string, number> = { light: 4.5, dark: 4.5, sunlight: 7, broadcast: 7 };
  for (const [theme, floor] of Object.entries(floors)) {
    it(`${theme}: clears ${floor}:1 on its page surface`, () => {
      const css = block(theme);
      const ink = token(css, '--danger-ink');
      const bg = token(css, '--surface-bg');
      expect(ink, `${theme} defines --danger-ink`).toBeDefined();
      expect(contrast(ink!, bg!)).toBeGreaterThanOrEqual(floor);
    });
  }

  it('destructive secondary and tertiary buttons use --danger-ink; only the filled primary uses --danger-text as ink', () => {
    expect(primitives).toMatch(/\.fs-button--destructive\.fs-button--tertiary\s*\{\s*color:\s*var\(--danger-ink\)/);
    expect(primitives).toMatch(/\.fs-button--destructive\.fs-button--secondary\s*\{[^}]*color:\s*var\(--danger-ink\)/);
  });
});

// Sweep (#513 round 5): every rule that paints danger TEXT / BORDERS / GLYPHS straight on a page or modal
// surface takes --danger-ink. Rules that sit on a FILLED --danger-bg keep --danger-text (white-on-red in Sunlight).
const read = (rel: string) => readFileSync(resolve(__dirname, rel), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const rulesFor = (rel: string, selector: string) => {
  const out: string[] = [];
  for (const m of read(rel).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (m[1]!.split(',').some((x) => x.trim() === selector)) out.push(m[2]!);
  }
  return out;
};

const ON_SURFACE: [file: string, selector: string][] = [
  ['./primitives.css', '.fs-badge--dot-danger .fs-badge-dot'],
  ['./primitives.css', '.fs-gate'],
  ['./primitives.css', '.fs-gate-glyph'],
  ['./primitives.css', '.fs-field-input--invalid:focus'],
  ['./primitives.css', '.fs-field-msg--error'],
  ['../admin/admin.css', '.fs-um-revoked-mark'],
  ['../admin/admin.css', '.fs-um-sheet-error'],
  ['../admin/admin.css', '.fs-al-badge--danger'],
  ['../admin/admin.css', '.fs-modal-error'],
  ['../operations/operations.css', '.fs-modal-error'],
  ['../inventory/inventory.css', '.fs-modal-error'],
  ['../inventory/inventory.css', '.fs-import-h--failed'],
  ['../../app/styles.css', '.fs-set-row--danger .fs-set-row-label'],
];

describe('danger text/borders on a page surface use --danger-ink (Sunlight white-on-white sweep)', () => {
  for (const [file, selector] of ON_SURFACE) {
    it(`${selector} (${file.split('/').pop()})`, () => {
      const bodies = rulesFor(file, selector);
      expect(bodies.length, 'rule exists').toBeGreaterThan(0);
      for (const b of bodies) {
        expect(b).toMatch(/--danger-ink/);
        expect(b).not.toMatch(/--danger-text/);
      }
    });
  }

  it('the gate acknowledgement box: outline takes --danger-ink; its checked mark stays --danger-text (on the --danger-bg fill)', () => {
    const [body] = rulesFor('./primitives.css', '.fs-gate-ack-box');
    expect(body).toMatch(/border:\s*2px solid var\(--danger-ink\)/);
    expect(body).toMatch(/[^-]color:\s*var\(--danger-text\)/);
  });

  it('the "Import failed" heading has no theme override repainting it off --danger-ink (#513 x #514)', () => {
    // --danger-bg on white is 6.47:1 in Sunlight, under its 7:1 floor; --danger-ink clears it.
    const scoped = [...read('../inventory/inventory.css').matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(
      (m) => m[1]!.includes('.fs-import-h--failed') && m[1]!.trim() !== '.fs-import-h--failed',
    );
    for (const m of scoped) expect(m[2]).not.toMatch(/--danger-(text|bg)/);
  });

  it('no .fs-modal-error / .fs-field-msg--error rule anywhere still uses --danger-text', () => {
    for (const f of ['./primitives.css', '../admin/admin.css', '../operations/operations.css', '../inventory/inventory.css']) {
      for (const sel of ['.fs-modal-error', '.fs-field-msg--error']) {
        for (const b of rulesFor(f, sel)) expect(b).not.toMatch(/--danger-text/);
      }
    }
  });
});

