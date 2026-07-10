// data/sync — the default cloud→local transport shared by the three listeners
// (roles/event/state). Kept in its OWN module so importing it stays firebase-free
// at load: it lazily imports ./firebase only once a listener's start() runs. Unit
// tests inject a fake subscribe and never exercise this path.
export function firebaseSubscribe(path: string, cb: (snap: unknown) => void): () => void {
  let realUnsub: (() => void) | null = null;
  let cancelled = false;
  void import('./firebase').then(({ rtdb, ref, onValue }) => {
    if (cancelled) return;
    realUnsub = onValue(ref(rtdb, path), (snap) => cb(snap.val()));
  });
  return () => {
    cancelled = true;
    realUnsub?.();
  };
}
