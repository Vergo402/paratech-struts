// what3words conversion (#441) — coords → the 3m-square three words ("filled.count.soap")
// used as a shore point's radio callout. Plain REST GET (the w3w API is browser-friendly
// with CORS, unlike Google Places); no SDK, no session tokens.
//
// KEY: a what3words API key via VITE_W3W_KEY (.env.local, gitignored — see .env.example).
// Same doctrine as the Maps key: empty key ⇒ conversion is off and shore points simply
// carry coords without words (offline-first — nothing blocks on this service).

const W3W_KEY: string = (import.meta.env.VITE_W3W_KEY as string | undefined)?.trim() || '';

export function w3wEnabled(): boolean {
  return W3W_KEY.length > 0 && typeof window !== 'undefined';
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
  const res = await fetch(url);
  if (!res.ok) throw new Error(`w3w convert failed: HTTP ${res.status}`);
  const body = (await res.json()) as { words?: string; error?: { code?: string } };
  if (!body.words) throw new Error(`w3w convert failed: ${body.error?.code ?? 'no words in response'}`);
  return body.words;
}
