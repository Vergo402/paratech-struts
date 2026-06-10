// Vitest global setup. jest-dom's matchers (toBeVisible, toHaveAttribute…) are
// safe to register under the node environment too — they just need expect.
import '@testing-library/jest-dom/vitest';

// vitest's jsdom global proxy exposes a `localStorage` accessor that yields
// undefined (jsdom's getter loses its `this`), so storage-dependent code can't
// be tested against the built-in. Provide a spec-faithful in-memory Storage for
// jsdom test files; node-environment files are untouched (no `window`).
if (typeof window !== 'undefined' && typeof window.localStorage === 'undefined') {
  const makeStorage = (): Storage => {
    const store = new Map<string, string>();
    return {
      get length() {
        return store.size;
      },
      key: (i: number) => [...store.keys()][i] ?? null,
      getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    };
  };
  Object.defineProperty(window, 'localStorage', { value: makeStorage(), configurable: true });
  Object.defineProperty(window, 'sessionStorage', { value: makeStorage(), configurable: true });
}
