import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Separate from vite.config.ts on purpose: tests are discovered from the repo
// root across src/**, NOT from the app's Vite root (src/app). This avoids the
// root/test-discovery conflict and keeps unit tests free of the app build's
// React/Tailwind/PWA plugins.
//
// environment: 'node' — the default suits pure `core/*` + `data/*` (no DOM). Node
// guarantees the webcrypto global (`crypto.randomUUID`, L10). UI tests (S3+) opt
// into jsdom per-file via `// @vitest-environment jsdom`.
const abs = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@core': abs('./src/core'),
      '@data': abs('./src/data'),
      '@ui': abs('./src/ui'),
      '@app': abs('./src/app'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    // functions/src: the Cloud Functions' pure, import-free modules (e.g. the
    // adminUpdateAccount write order). CI installs only the root package, so
    // tests there must not import firebase-admin / firebase-functions.
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'functions/src/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
    // jsdom only exposes localStorage on an http(s) origin — without this,
    // window.localStorage is undefined in every `@vitest-environment jsdom` file.
    environmentOptions: {
      jsdom: { url: 'http://localhost/' },
    },
  },
});
