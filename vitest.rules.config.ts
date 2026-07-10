import { defineConfig } from 'vitest/config';

// The RULES suite — real write-attempting security-rule tests against the RTDB
// emulator (pre-Phase-J audit: three rules bugs shipped because the main suite
// only shape-checks the generated JSON; no rule was ever exercised). Runs via
// `npm run test:rules` (firebase emulators:exec wraps this config); needs Java,
// so it is local-only — NOT part of `npm test` and not in CI. tests/rules/ sits
// outside src/ so the main vitest include can never pick these up.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.ts'],
    testTimeout: 15000,
    fileParallelism: false, // one emulator database — suites must not interleave
  },
});
