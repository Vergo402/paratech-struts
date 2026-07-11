import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

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
