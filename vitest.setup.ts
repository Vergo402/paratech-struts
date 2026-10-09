// Vitest global setup. jest-dom's matchers (toBeVisible, toHaveAttribute…) are
// safe to register under the node environment too — they just need expect.
import '@testing-library/jest-dom/vitest';

// Always replace jsdom's Web Storage with a spec-faithful in-memory Storage for
// jsdom test files; node-environment files are untouched (no `window`).
// Why unconditional: whether vitest's jsdom global exposes a working
// `localStorage` depends on the Node version — undefined on Node 20/26 (the
// getter loses its `this`), a WebIDL Proxy on Node 22. The Proxy cannot be
// spied on (`vi.spyOn(localStorage, 'setItem')` stores an item instead of
// replacing the method), which broke nativeControls.test.ts in CI on
// 2026-10-09. A plain object behaves identically on every runtime.
if (typeof window !== 'undefined') {
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
