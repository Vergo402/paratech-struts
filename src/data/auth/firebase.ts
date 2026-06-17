import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Same Firebase project as v3 (paratech-c3ab4) — display name changed to
// "FieldShore" in the console. This file (+ data/sync/firebase.ts) are the
// ONLY places in v4 that touch Firebase directly (invariant 1, lint-enforced).
const config = {
  apiKey: 'AIzaSyCBrXfWI5-YI8p5ylWO88gwliPxIamkxuM',
  authDomain: 'paratech-c3ab4.firebaseapp.com',
  databaseURL: 'https://paratech-c3ab4-default-rtdb.firebaseio.com',
  projectId: 'paratech-c3ab4',
  storageBucket: 'paratech-c3ab4.firebasestorage.app',
  messagingSenderId: '1058271616211',
  appId: '1:1058271616211:web:e3cb56a83036859debc826',
};

// HMR-safe: don't re-initialize if Vite re-runs this module during hot reload.
const app = getApps().length ? getApps()[0] : initializeApp(config);
// The single initialized app. data/sync/firebase.ts reuses it for the RTDB
// handle (don't re-init) — these two files are the ONLY v4 Firebase importers.
export const firebaseApp = app;
export const firebaseAuth = getAuth(app);
