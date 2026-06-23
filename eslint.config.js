import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

// The slice's "CI boundary check" (architecture.md). The 3 structural invariants
// from module-boundaries.md are enforced here as no-restricted-imports zones:
//   1. Firebase imported ONLY in data/* — never in core/*, ui/*, app/*.
//   2. core/* imports neither React nor Firebase nor data/ui/app (pure domain).
//   3. ui/* reaches data ONLY through ui/hooks — never @data/* or syncService directly.
// Plus the lint floor: react/no-danger (escapeHtml is deleted; JSX default-escape
// is the XSS defense — L3), no-alert, react-hooks/exhaustive-deps.
export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'dev-dist/**',
      'node_modules/**',
      // design-sync tooling + build output (already gitignored) — not app code.
      '.ds-sync/**',
      'ds-bundle/**',
      '.design-sync/**',
      // v3 lives at the repo root and is not part of the v4 lint surface.
      'app.js',
      'sw.js',
      'manifest.json',
      'scripts/**',
      'docs/**',
      '.claude/**',
      'public/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // React layer (ui + app) — hooks rules + the XSS/alert lint floor.
  {
    files: ['src/ui/**/*.{ts,tsx}', 'src/app/**/*.{ts,tsx}'],
    plugins: { react: reactPlugin, 'react-hooks': reactHooks },
    languageOptions: { globals: { ...globals.browser } },
    settings: { react: { version: 'detect' } },
    rules: {
      ...reactPlugin.configs.flat.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off', // react-jsx runtime
      'react/no-danger': 'error', // L3 — no dangerouslySetInnerHTML path
      'no-alert': 'error',
      'react-hooks/exhaustive-deps': 'error', // L6 — cleanup is structural
    },
  },

  // INVARIANT 2 — core/* is pure domain.
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['react', 'react-dom', 'react/*', 'react-dom/*'], message: 'core/* is pure domain — no React (invariant 2).' },
            { group: ['firebase', 'firebase/*'], message: 'core/* must not import Firebase (invariant 1).' },
            { group: ['@data', '@data/**', '@ui', '@ui/**', '@app', '@app/**'], message: 'core/* may not import data, ui, or app (invariant 2).' },
          ],
        },
      ],
    },
  },

  // INVARIANT 1 — Firebase only in data/*. Ban it in ui + app.
  {
    files: ['src/ui/**/*.{ts,tsx}', 'src/app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['firebase', 'firebase/*'], message: 'Firebase lives only in data/* (invariant 1).' }] },
      ],
    },
  },

  // INVARIANT 3 — ui/* reaches data ONLY through ui/hooks. Ban @data/* + Firebase
  // in every ui file EXCEPT the hooks barrel. (This block comes last so it wins
  // for ui non-hooks files; ui/hooks is ignored here and keeps the invariant-1
  // rule above, which permits @data/* but still bans Firebase.)
  {
    files: ['src/ui/**/*.{ts,tsx}'],
    ignores: ['src/ui/hooks/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@data', '@data/**'], message: 'ui/* reaches data only through ui/hooks (invariant 3).' },
            { group: ['firebase', 'firebase/*'], message: 'Firebase lives only in data/* (invariant 1).' },
          ],
        },
      ],
    },
  },

  // Config + test files — Node globals; boundary rules don't apply.
  {
    files: ['**/*.config.{ts,js}', 'vitest.setup.ts', 'src/**/*.{test,spec}.{ts,tsx}'],
    languageOptions: { globals: { ...globals.node } },
    rules: { 'no-restricted-imports': 'off' },
  },
);
