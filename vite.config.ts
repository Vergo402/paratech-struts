import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';

// ADR-005/007 — single-package PWA. Vite's root is the field-PWA entry (src/app);
// the v3 app at the repo root (index.html / app.js / sw.js) is never seen by Vite
// and keeps serving from GitHub Pages untouched. Build output → repo-root dist/
// (gitignored; v4 does not deploy in this slice).
const abs = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  root: 'src/app',
  publicDir: abs('./public'),
  build: {
    outDir: abs('./dist'),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@core': abs('./src/core'),
      '@data': abs('./src/data'),
      '@ui': abs('./src/ui'),
      '@app': abs('./src/app'),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // ADR-007 — vite-plugin-pwa (Workbox) retires the hand-maintained sw.js.
      // The one behavior that survives from v3's sw.js: Firebase realtime traffic
      // is NEVER cached. (Inert in this slice — data/sync is a local stub — but the
      // route is written now so the rule is not forgotten when real Firebase lands.)
      workbox: {
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              /firebaseio\.com$/.test(url.hostname) || url.protocol === 'wss:',
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
});
