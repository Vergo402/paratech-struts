import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { includeManifestIcons, manifest, workboxPrecache } from './pwa.config';

const publicDir = fileURLToPath(new URL('../../public/', import.meta.url));
const appDir = fileURLToPath(new URL('./', import.meta.url));

// The surface of the theme the app opens with when nothing is stored
// (index.html data-theme="dark"; theme.tsx default 'dark').
const darkSurface = /\[data-theme="dark"\]\s*\{\s*--surface-bg:\s*(#[0-9A-Fa-f]{6})/.exec(
  readFileSync(appDir + 'tokens.css', 'utf8'),
)?.[1];

// PNG layout: 8-byte signature, then the IHDR chunk (4 length, 4 type, 4 width, 4 height,
// bit depth, colour type, compression, filter, interlace).
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function pngHeader(path: string) {
  const buf = readFileSync(path);
  expect([...buf.subarray(0, 8)]).toEqual(PNG_SIGNATURE);
  expect(buf.subarray(12, 16).toString('latin1')).toBe('IHDR');
  return {
    buf,
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
    bitDepth: buf[24]!,
    colorType: buf[25]!,
    interlace: buf[28]!,
  };
}

// Minimal decoder for the 8-bit, non-interlaced RGB/RGBA PNGs Chrome writes -> RGBA bytes.
function decodePng(path: string): { width: number; height: number; rgba: Uint8Array } {
  const { buf, width, height, bitDepth, colorType, interlace } = pngHeader(path);
  expect({ bitDepth, interlace }).toEqual({ bitDepth: 8, interlace: 0 });
  expect([2, 6]).toContain(colorType);
  const bpp = colorType === 6 ? 4 : 3;
  const idat: Buffer[] = [];
  for (let o = 8; o < buf.length; ) {
    const len = buf.readUInt32BE(o);
    const type = buf.subarray(o + 4, o + 8).toString('latin1');
    if (type === 'IDAT') idat.push(buf.subarray(o + 8, o + 8 + len));
    o += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  const out = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const ft = raw[y * (stride + 1)]!;
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x]!;
      const a = x >= bpp ? out[y * stride + x - bpp]! : 0;
      const b = y > 0 ? out[(y - 1) * stride + x]! : 0;
      const c = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp]! : 0;
      const p = a + b - c;
      const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      const paeth = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      out[y * stride + x] =
        (v + (ft === 0 ? 0 : ft === 1 ? a : ft === 2 ? b : ft === 3 ? (a + b) >> 1 : paeth)) & 255;
    }
  }
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    rgba.set(out.subarray(i * bpp, i * bpp + 3), i * 4);
    rgba[i * 4 + 3] = bpp === 4 ? out[i * bpp + 3]! : 255;
  }
  return { width, height, rgba };
}

describe('PWA manifest', () => {
  it('carries the required identity and display fields', () => {
    expect(manifest).toMatchObject({
      name: 'FieldShore',
      short_name: 'FieldShore',
      description:
        'Paratech rescue-strut selection, inventory, and shoring operations for USAR/FEMA teams',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      lang: 'en',
    });
  });

  it("uses the default (dark) theme surface so the splash and title bar match the opening frame", () => {
    expect(darkSurface).toBeDefined();
    expect(manifest.theme_color).toBe(darkSurface);
    expect(manifest.background_color).toBe(darkSurface);
    const html = readFileSync(appDir + 'index.html', 'utf8');
    expect(html).toContain('<html lang="en" data-theme="dark">');
    expect(html).toContain(`<meta name="theme-color" content="${darkSurface}" />`);
    expect(html).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png" />');
  });

  it('declares the 192, 512 and 512-maskable icons', () => {
    expect(manifest.icons).toEqual([
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ]);
  });

  it.each(manifest.icons.map((i) => [i.src, i.sizes] as const))(
    'icon %s exists under public/ and measures %s',
    (src, sizes) => {
      const file = publicDir + src.replace(/^\//, '');
      expect(existsSync(file)).toBe(true);
      const { width, height } = pngHeader(file);
      expect(`${width}x${height}`).toBe(sizes);
    },
  );
});

describe('maskable icon', () => {
  // Source: docs/v4-design/07-design-system/assets/logo/app-icon.svg (the PWA icon, per
  // logo-and-mark.md "App icon"): full-colour emblem on the slate square, full-bleed.
  const file = publicDir + 'icon-512-maskable.png';
  const SLATE = [0x1c, 0x1f, 0x23];
  const TIMBER = [0xc3, 0x9a, 0x5e]; // emblem-only colour (the mono glyph has none)

  it('is fully opaque', () => {
    expect(pngHeader(file).colorType).toBe(2); // RGB, no alpha channel at all
  });

  it('is the full-colour emblem on slate, entirely inside the central 80% circle', () => {
    const { width, height, rgba } = decodePng(file);
    const cx = width / 2, cy = height / 2, safe = 0.4 * width;
    const near = (i: number, c: number[]) =>
      c.every((v, k) => Math.abs(rgba[i * 4 + k]! - v) <= 2);
    let timber = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (near(i, TIMBER)) timber++;
        if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) > safe) {
          expect(near(i, SLATE), `pixel ${x},${y} outside the safe circle must be slate`).toBe(true);
        }
      }
    }
    expect(timber).toBeGreaterThan(500);
  });
});

describe('apple-touch-icon', () => {
  // iOS home-screen icon: the same emblem as the manifest icons, opaque and full-bleed
  // (iOS applies its own corner radius), 180x180 per logo-and-mark.md.
  const file = publicDir + 'apple-touch-icon.png';

  it('is a 180x180 opaque PNG', () => {
    const { width, height, colorType } = pngHeader(file);
    expect(`${width}x${height}`).toBe('180x180');
    expect(colorType).toBe(2); // RGB, no alpha channel
  });

  it('is the full-colour emblem on slate, not the old flat lettermark', () => {
    const { width, height, rgba } = decodePng(file);
    const near = (i: number, c: number[]) =>
      c.every((v, k) => Math.abs(rgba[i * 4 + k]! - v) <= 2);
    expect(near(0, [0x1c, 0x1f, 0x23])).toBe(true); // corner pixel = slate, full-bleed
    expect(near(width * height - 1, [0x1c, 0x1f, 0x23])).toBe(true);
    let timber = 0;
    for (let i = 0; i < width * height; i++) if (near(i, [0xc3, 0x9a, 0x5e])) timber++;
    expect(timber).toBeGreaterThan(100);
  });
});

describe('offline precache', () => {
  it('precaches fonts, photos and icons, not just js/css/html', () => {
    expect(workboxPrecache.globPatterns).toEqual(['**/*.{js,css,html,woff2,svg,png,jpg}']);
  });

  it('keeps the welcome video and posters out of the precache', () => {
    expect(workboxPrecache.globIgnores).toEqual(['**/media/welcome/**']);
  });

  it('leaves the manifest and its icons to the glob / plugin, each exactly once', () => {
    // vite-plugin-pwa adds manifest.webmanifest itself; the glob must not match it again.
    // Manifest icons come from the glob (png), so the plugin's own copy is switched off.
    expect(workboxPrecache.globPatterns[0]).not.toContain('webmanifest');
    expect(includeManifestIcons).toBe(false);
  });

  it('lets the glob alone reach the icons and plate photos (no overlapping includeAssets)', () => {
    // includeAssets would add a second manifest entry for every file the glob already
    // matches (93 entries / 62 unique). Build inspection: dist/sw.js lists each url once.
    expect(workboxPrecache).not.toHaveProperty('includeAssets');
    const [pattern = ''] = workboxPrecache.globPatterns;
    const exts = (/\*\.\{([^}]+)\}$/.exec(pattern)?.[1] ?? '').split(',');
    expect(exts.length).toBeGreaterThan(1);
    const shipped = [
      'favicon.svg',
      'favicon-32.png',
      'apple-touch-icon.png',
      ...manifest.icons.map((i) => i.src.replace(/^\//, '')),
      ...readdirSync(publicDir + 'plates')
        .filter((f) => f.endsWith('.jpg'))
        .map((f) => 'plates/' + f),
    ];
    expect(shipped.some((f) => f.startsWith('plates/'))).toBe(true);
    for (const f of shipped) {
      expect(exts, f).toContain(f.split('.').pop());
      expect(f).not.toContain('media/welcome');
    }
  });
});
