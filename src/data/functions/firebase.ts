import { getFunctions, httpsCallable } from 'firebase/functions';
import { firebaseApp } from '../auth/firebase';

// data/functions — the Cloud Functions callable connection (#439). This file,
// data/auth/firebase.ts, and data/sync/firebase.ts are the ONLY v4 Firebase
// importers (invariant 1; lint bans Firebase in core/ui/app, and we hold the
// line in data/* by routing every callable caller through this module). Reuses
// the already-initialized app (HMR-safe via auth/firebase.ts's getApps() guard).
//
// Callables are ONLINE-ONLY by design — they perform privileged account ops
// (create a login, reset a password) that have no meaningful offline queue; an
// unreachable function surfaces as an inline error, never a pending banner.
const fns = getFunctions(firebaseApp);

export type CallableError = { code?: string; message?: string };

/** Invoke a named callable; returns the result data or throws the FunctionsError. */
export async function callFunction<TReq, TRes>(name: string, data: TReq): Promise<TRes> {
  const fn = httpsCallable<TReq, TRes>(fns, name);
  const res = await fn(data);
  return res.data;
}
