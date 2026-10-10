// data/sync — the default cloud→local transport shared by the three listeners
// (roles/event/state). Kept in its OWN module so importing it stays firebase-free
// at load: it lazily imports ./firebase only once a listener's start() runs. Unit
// tests inject a fake subscribe and never exercise this path.
//
// The callback runs SYNCHRONOUSLY inside the SDK's event raise (no deferral here). The
// event listener relies on that: it refreshes the cloud snapshot index inside the
// callback, and the SDK raises the acknowledged snapshot before it resolves (or, on a
// rejection, raises the reverted one before it rejects) the write promise — so a flush
// awaiting set()/update() always reads the index as of the server's answer (ADR-041).
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
