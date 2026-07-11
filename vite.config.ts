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
  // Env files (.env.local etc.) live at the repo root — next to package.json,
  // where you'd expect them (see .env.example) — not the Vite root.
  envDir: abs('.'),
  publicDir: abs('./public'),
  build: {
    outDir: abs('./dist'),
    emptyOutDir: true,
  },
  // Phone-on-LAN dev: pinned so the same URL works every session. `host: true`
  // binds all interfaces (reach it from a phone on the same Wi-Fi); the fixed
  // port + strictPort keep the bookmark http://<your-mac>.local:5199 valid
  // (without strictPort Vite would silently drift to 5200 if 5199 is busy).
  server: {
    host: true,
    port: 5199,
    strictPort: true,
    // Vite's DNS-rebinding guard 403s any Host it doesn't recognise. Raw IPs are
    // allowed by default; this also allows Bonjour `.local` names so the phone
    // bookmark http://<your-mac>.local:5199 works (the leading dot = any *.local,
    // so it survives a computer rename). `.local` can't be hit by a rebind attack.
    allowedHosts: ['.local'],
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
