import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Pins the #262 TTX emulator fence: Firebase talks to the local emulators ONLY
// when VITE_USE_EMULATORS === 'true' (set by `vite --mode emulators` alone).
// Every other run — normal dev, preview build, deploy — must never connect.

const connectAuthEmulator = vi.fn();
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ name: 'mock-auth' })),
  connectAuthEmulator: (...args: unknown[]) => connectAuthEmulator(...args),
}));
vi.mock('firebase/app', () => ({
  getApps: vi.fn(() => []),
  initializeApp: vi.fn(() => ({ name: 'mock-app' })),
}));

import { shouldUseEmulators } from './firebase';

describe('shouldUseEmulators', () => {
  it('is false when the flag is unset', () => {
    expect(shouldUseEmulators({})).toBe(false);
  });

  it("is false for the string 'false'", () => {
    expect(shouldUseEmulators({ VITE_USE_EMULATORS: 'false' })).toBe(false);
  });

  it("is true only for the string 'true'", () => {
    expect(shouldUseEmulators({ VITE_USE_EMULATORS: 'true' })).toBe(true);
    expect(shouldUseEmulators({ VITE_USE_EMULATORS: '1' })).toBe(false);
    expect(shouldUseEmulators({ VITE_USE_EMULATORS: true })).toBe(false);
  });
});

describe('auth/firebase emulator connect', () => {
  beforeEach(() => {
    connectAuthEmulator.mockClear();
    vi.resetModules();
    delete (globalThis as { __fsEmu?: boolean }).__fsEmu;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete (globalThis as { __fsEmu?: boolean }).__fsEmu;
  });

  it('never calls connectAuthEmulator under the default (unset) env', async () => {
    const mod = await import('./firebase');
    expect(mod.USE_EMULATORS).toBe(false);
    expect(connectAuthEmulator).not.toHaveBeenCalled();
  });

  it('connects once to the Auth emulator when the flag is on, and not again on a module re-run (HMR)', async () => {
    vi.stubEnv('VITE_USE_EMULATORS', 'true');
    const first = await import('./firebase');
    expect(first.USE_EMULATORS).toBe(true);
    expect(connectAuthEmulator).toHaveBeenCalledTimes(1);
    expect(connectAuthEmulator).toHaveBeenCalledWith(first.firebaseAuth, 'http://127.0.0.1:9099', {
      disableWarnings: true,
    });

    vi.resetModules();
    await import('./firebase');
    expect(connectAuthEmulator).toHaveBeenCalledTimes(1);
  });
});
