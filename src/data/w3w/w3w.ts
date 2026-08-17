// what3words conversion (#441) — coords → the 3m-square three words ("filled.count.soap")
// used as a shore point's radio callout. Plain REST GET (the w3w API is browser-friendly
// with CORS, unlike Google Places); no SDK, no session tokens.
//
// KEY: a what3words API key via VITE_W3W_KEY (.env.local, gitignored — see .env.example).
// Same doctrine as the Maps key: empty key ⇒ conversion is off and shore points simply
// carry coords without words (offline-first — nothing blocks on this service).

const W3W_KEY: string = (import.meta.env.VITE_W3W_KEY as string | undefined)?.trim() || '';

// Permanent-failure latch (#441 follow-up): a bad/expired/plan-limited key returns
// 401/402/403 forever — retrying it on every shore point is pointless churn. Two
// consecutive permanent failures flip this latch and w3wEnabled() goes false, so
// captureLocation/useW3wBackfill stop calling out. A success (e.g. a later paid
// key swapped in) clears it immediately. In-memory only — no code change needed
// to recover, and a session restart clears it too.
let permanentFailureStreak = 0;
let unavailable = false;
const PERMANENT_FAILURE_THRESHOLD = 2;

function isPermanentFailureStatus(status: number): boolean {
  return status === 401 || status === 402 || status === 403;
}

export function w3wEnabled(): boolean {
  return W3W_KEY.length > 0 && typeof window !== 'undefined' && !unavailable;
}

/** True once the latch has flipped — a bad/expired/plan-limited key, distinct
 *  from simply having no key configured at all. */
export function w3wUnavailable(): boolean {
  return unavailable;
}

/**
 * Convert a GPS fix to its three words (no /// prefix). Throws on network/API
 * failure — callers treat any failure as "words still pending" and retry later
 * (the backfill path); a thrown error must never block shore point work.
 */
export async function convertToWords(coords: { lat: number; lng: number }): Promise<string> {
  const url =
    'https://api.what3words.com/v3/convert-to-3wa?coordinates=' +
    encodeURIComponent(`${coords.lat},${coords.lng}`) +
    '&key=' +
    encodeURIComponent(W3W_KEY);
  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    permanentFailureStreak = 0; // network error — transient, never latches
    throw err;
  }
  if (!res.ok) {
    if (isPermanentFailureStatus(res.status)) {
      permanentFailureStreak += 1;
      if (permanentFailureStreak >= PERMANENT_FAILURE_THRESHOLD) unavailable = true;
    } else {
      permanentFailureStreak = 0; // transient (5xx, 429, ...) — never latches
    }
    throw new Error(`w3w convert failed: HTTP ${res.status}`);
  }
  const body = (await res.json()) as { words?: string; error?: { code?: string } };
  if (!body.words) {
    permanentFailureStreak = 0; // malformed/empty payload — treat as transient
    throw new Error(`w3w convert failed: ${body.error?.code ?? 'no words in response'}`);
  }
  permanentFailureStreak = 0;
  unavailable = false;
  return body.words;
}
