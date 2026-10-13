// PWA options for vite-plugin-pwa, kept in a plain module so they are unit-testable
// (see pwa.config.test.ts). vite.config.ts spreads these into VitePWA({...}).
// The Firebase NetworkOnly runtime rule and navigateFallbackDenylist stay in
// vite.config.ts — Firebase realtime traffic is never cached.

// Default-theme surface: the app opens dark (index.html data-theme="dark"), so the
// splash/title bar use --surface-bg from src/app/tokens.css [data-theme="dark"].
// Also the <meta name="theme-color"> in index.html — keep the two in step
// (pwa.config.test.ts pins all three to the token).
export const PWA_SURFACE_COLOR = '#101214';

// Icon source: docs/v4-design/07-design-system/assets/logo/app-icon.svg (the PWA app
// icon per logo-and-mark.md "App icon" — full-colour emblem on the slate #1C1F23
// square, emblem inset ~20%). The PNGs in public/ are headless-Chrome renders of it:
// 192 + 512 "any" (the SVG's own 18/100 corner radius, transparent corners) and
// 512 maskable (full-bleed opaque square). The mono favicon.svg is only the tab glyph.
export const manifest = {
  name: 'FieldShore',
  short_name: 'FieldShore',
  description:
    'Paratech rescue-strut selection, inventory, and shoring operations for USAR/FEMA teams',
  start_url: '/',
  scope: '/',
  display: 'standalone' as const,
  lang: 'en',
  theme_color: PWA_SURFACE_COLOR,
  background_color: PWA_SURFACE_COLOR,
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};

export const workboxPrecache = {
  // No includeAssets: the glob below already reaches every public/ icon and plate
  // photo, and listing them again would duplicate each precache entry.
  // Fonts (hashed woff2), plate photos and icons ride along with js/css/html.
  // (manifest.webmanifest is added by the plugin itself — not globbed, to avoid a duplicate.)
  globPatterns: ['**/*.{js,css,html,woff2,svg,png,jpg}'],
  // Welcome video/posters/screens are not needed offline, and the mp4 exceeds
  // Workbox's 2 MiB per-file cap.
  globIgnores: ['**/media/welcome/**'],
};

// vite-plugin-pwa would add the manifest icons to the precache a second time; the
// glob above already covers them (png).
export const includeManifestIcons = false;
