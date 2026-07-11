// Google Places (New) address autocomplete — browser path via the Maps JS SDK.
//
// The Places REST endpoint (places.googleapis.com) sends no CORS headers, so a raw
// browser fetch is blocked; the Maps JS SDK is Google's supported browser path — it
// handles CORS, auth, and the billing session token for us. We drive the *data* API
// (AutocompleteSuggestion) and render our own dropdown (AddressField) rather than the
// PlaceAutocompleteElement widget, whose shadow DOM would fight our design system.
//
// KEY: a *browser* key restricted by HTTP referrer + the Places API in the Google
// Cloud console. Safe to ship client-side — exactly like the Firebase apiKey in
// data/auth/firebase.ts. Set it below (or via VITE_GOOGLE_MAPS_KEY). Empty key ⇒
// autocomplete stays off and the field is a plain text box (offline-first: typing an
// address by hand always works).
//
// Billing: one session token spans a whole edit (all keystrokes) and is closed by the
// fetchFields() call on select — so it bills once per address picked, not per keystroke.

const MAPS_BROWSER_KEY: string =
  (import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined)?.trim() || '';

export function placesEnabled(): boolean {
  return MAPS_BROWSER_KEY.length > 0 && typeof window !== 'undefined';
}

export interface AddressPick {
  address: string;
  coords: { lat: number; lng: number } | null;
}

export interface AddressSuggestion {
  /** Primary line — e.g. "123 Cascade Avenue". */
  main: string;
  /** Ranges of `main` matching the typed input — rendered emphasized (mockup fidelity). */
  mainMatches?: { start: number; end: number }[];
  /** Secondary line — e.g. "Seattle, WA, USA" (may be empty). */
  secondary: string;
  /** Resolve the full address + coordinates (closes the billing session). */
  resolve: () => Promise<AddressPick>;
}

// --- minimal ambient slice of the SDK we touch (avoids the @types/google.maps dep) ---
interface SdkPlace {
  fetchFields(req: { fields: string[] }): Promise<unknown>;
  formattedAddress?: string | null;
  location?: { lat(): number; lng(): number } | null;
}
interface SdkFormattable {
  text?: string;
  matches?: { startOffset?: number; endOffset?: number }[] | null;
}
interface SdkPrediction {
  text: { toString(): string };
  // mainText/secondaryText live directly on the prediction in the JS SDK
  // (structuredFormat is the REST shape — verified live against v=weekly).
  mainText?: SdkFormattable | null;
  secondaryText?: SdkFormattable | null;
  toPlace(): SdkPlace;
}
interface PlacesLib {
  AutocompleteSessionToken: new () => object;
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions(req: {
      input: string;
      sessionToken: object;
    }): Promise<{ suggestions: { placePrediction: SdkPrediction | null }[] }>;
  };
}
type MapsGlobal = { maps?: { importLibrary?(name: string): Promise<unknown> } };

let libPromise: Promise<PlacesLib> | null = null;

function loadScript(): Promise<void> {
  const g = (window as unknown as { google?: MapsGlobal }).google;
  if (g?.maps?.importLibrary) return Promise.resolve();
  return new Promise((resolve, reject) => {
    // With loading=async the script tag's onload fires BEFORE google.maps.importLibrary
    // exists (verified live — importLibrary was still undefined on first lookup). The
    // sanctioned ready signal in this mode is the callback= param.
    const cb = '__fsMapsReady';
    (window as unknown as Record<string, unknown>)[cb] = () => {
      delete (window as unknown as Record<string, unknown>)[cb];
      resolve();
    };
    const s = document.createElement('script');
    s.src =
      'https://maps.googleapis.com/maps/api/js?key=' +
      encodeURIComponent(MAPS_BROWSER_KEY) +
      '&libraries=places&loading=async&v=weekly&callback=' +
      cb;
    s.async = true;
    s.onerror = () => {
      delete (window as unknown as Record<string, unknown>)[cb];
      reject(new Error('Google Maps failed to load'));
    };
    document.head.appendChild(s);
  });
}

function lib(): Promise<PlacesLib> {
  if (!libPromise) {
    libPromise = loadScript()
      .then(() => {
        const g = (window as unknown as { google: MapsGlobal }).google;
        return g.maps!.importLibrary!('places') as Promise<PlacesLib>;
      })
      .catch((e) => {
        libPromise = null; // reset so a later attempt can retry (e.g. back online)
        throw e;
      });
  }
  return libPromise;
}

/** A session groups a user's keystrokes into one billed autocomplete session. */
export interface AddressSession {
  suggest(input: string): Promise<AddressSuggestion[]>;
}

/** Begin an address-lookup session. Mint a fresh one after each pick. */
export async function beginAddressSession(): Promise<AddressSession> {
  const places = await lib();
  const token = new places.AutocompleteSessionToken();
  return {
    async suggest(input: string): Promise<AddressSuggestion[]> {
      const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        sessionToken: token,
      });
      return suggestions
        .map((s) => s.placePrediction)
        .filter((p): p is SdkPrediction => p != null)
        .map((prediction) => ({
          main: prediction.mainText?.text ?? prediction.text.toString(),
          mainMatches: (prediction.mainText?.matches ?? []).map((m) => ({
            start: m.startOffset ?? 0,
            end: m.endOffset ?? 0,
          })),
          secondary: prediction.secondaryText?.text ?? '',
          resolve: async () => {
            const place = prediction.toPlace();
            await place.fetchFields({ fields: ['formattedAddress', 'location'] });
            const loc = place.location;
            return {
              address: place.formattedAddress ?? prediction.text.toString(),
              coords: loc ? { lat: loc.lat(), lng: loc.lng() } : null,
            };
          },
        }));
    },
  };
}
