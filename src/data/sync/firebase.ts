import { getDatabase } from 'firebase/database';
import { firebaseApp } from '../auth/firebase';

// data/sync — the real Firebase Realtime Database connection (ADR-009). This
// file and data/auth/firebase.ts are the ONLY v4 Firebase importers (invariant
// 1; lint bans Firebase in core/ui/app, and we hold the line in data/* by
// routing every RTDB caller through this module). Reuses the already-initialized
// app from auth/firebase.ts (HMR-safe via its getApps() guard — never re-init).
//
// The RTDB primitives are re-exported here so writers (departmentService now;
// the operations event-log transport in the Engine-A fast-follow) import the
// seam, not firebase/database. The L-7 merge guard + the no-op flush() stub
// stay in syncService.ts until that follow-on session.
export const rtdb = getDatabase(firebaseApp);

export { ref, get, set, update, child, onValue, remove, serverTimestamp } from 'firebase/database';
