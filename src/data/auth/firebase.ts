import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

// FieldShore v4's OWN Firebase project (fieldshore-database) — separate from
// v3 production (paratech-c3ab4), per Alex's 2026-06-22 decision. This file
// (+ data/sync/firebase.ts + data/functions/firebase.ts, #439) are the ONLY
// places in v4 that touch Firebase directly (invariant 1, lint-enforced).
const config = {
  apiKey: 'AIzaSyBBPyUXWDxDi9PWrRNEqYSg3R4bywqglRo',
  authDomain: 'fieldshore-database.firebaseapp.com',
  databaseURL: 'https://fieldshore-database-default-rtdb.firebaseio.com',
  projectId: 'fieldshore-database',
  storageBucket: 'fieldshore-database.firebasestorage.app',
  messagingSenderId: '431864655354',
  appId: '1:431864655354:web:896017d8810d1d78bcc843',
};

// HMR-safe: don't re-initialize if Vite re-runs this module during hot reload.
const app = getApps().length ? getApps()[0] : initializeApp(config);
// The single initialized app. data/sync/firebase.ts reuses it for the RTDB
// handle (don't re-init) — these two files are the ONLY v4 Firebase importers.
export const firebaseApp = app;
export const firebaseAuth = getAuth(app);

// Local-emulator fence (#262 TTX, Stage 0). ONLY `vite --mode emulators`
// (npm run dev:emu, which loads .env.emulators) sets VITE_USE_EMULATORS=true;
// the normal dev server, the preview build and every deploy never do, so they
// can never reach the emulators. data/sync/firebase.ts and
// data/functions/firebase.ts import USE_EMULATORS from here and connect to
// their own emulators the same way. Pure helper so a test can pin the rule.
export function shouldUseEmulators(env: Record<string, unknown>): boolean {
  return env.VITE_USE_EMULATORS === 'true';
}
export const USE_EMULATORS = shouldUseEmulators(import.meta.env);

// Run-once: Vite HMR re-runs this module against the SAME auth instance, and
// connectAuthEmulator throws once the instance has issued a request.
const emuGlobal = globalThis as { __fsEmu?: boolean };
if (USE_EMULATORS && !emuGlobal.__fsEmu) {
  emuGlobal.__fsEmu = true;
  connectAuthEmulator(firebaseAuth, 'http://127.0.0.1:9099', { disableWarnings: true });
}
