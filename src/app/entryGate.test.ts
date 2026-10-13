// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';

// The first-visit gate is an inline <script> in index.html: it has to run before the
// bundle loads or the app would flash first, so there is no module to import. This file
// pulls the script text out of index.html and runs it against stubs of the four browser
// globals it reads (localStorage, location, matchMedia, navigator).

// The string form of fileURLToPath: under jsdom the global URL is jsdom's, which Node's
// fileURLToPath rejects when handed a URL object.
const html = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'index.html'), 'utf8');
const gateSource = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
  .map((m) => m[1] ?? '')
  .find((body) => body.includes('fieldshore_entered'));

interface Launch {
  /** location.pathname the page was opened on. */
  path?: string;
  /** matchMedia('(display-mode: standalone)').matches: the manifest's display mode, i.e. an installed app. */
  displayStandalone?: boolean;
  /** navigator.standalone (iOS Safari only): true from the home screen, false in a tab, absent elsewhere. */
  iosStandalone?: boolean;
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
}

/** Runs the gate once and returns every URL it asked location.replace to load. */
function launch({
  path = '/',
  displayStandalone = false,
  iosStandalone,
  storage = localStorage,
}: Launch = {}): string[] {
  if (!gateSource) throw new Error('index.html has no inline script that mentions fieldshore_entered');
  const replaced: string[] = [];
  const location = { pathname: path, replace: (url: string) => void replaced.push(url) };
  // Only the standalone query can match; any other media query reads as false.
  const matchMedia = (query: string) => ({
    matches: displayStandalone && query === '(display-mode: standalone)',
  });
  const navigator = iosStandalone === undefined ? {} : { standalone: iosStandalone };
  new Function('localStorage', 'location', 'matchMedia', 'navigator', gateSource)(
    storage,
    location,
    matchMedia,
    navigator,
  );
  return replaced;
}

const entered = () => localStorage.getItem('fieldshore_entered');

describe('first-visit gate (inline script in index.html)', () => {
  beforeEach(() => localStorage.clear());

  it('sends a first browser visit on the bare root to the welcome page', () => {
    expect(launch()).toEqual(['/welcome.html']);
  });

  it('still sends a first iOS Safari tab (navigator.standalone === false) to the welcome page', () => {
    expect(launch({ iosStandalone: false })).toEqual(['/welcome.html']);
  });

  it('never redirects a deep link, and marks the browser as entered', () => {
    expect(launch({ path: '/auth' })).toEqual([]);
    expect(entered()).toBe('1');
  });

  it('skips the welcome page for an installed launch (display-mode: standalone) and marks it entered', () => {
    expect(launch({ displayStandalone: true })).toEqual([]);
    expect(entered()).toBe('1');
  });

  it('skips the welcome page for an iOS home-screen launch (navigator.standalone) and marks it entered', () => {
    expect(launch({ iosStandalone: true })).toEqual([]);
    expect(entered()).toBe('1');
  });

  it('leaves a browser that is already marked entered alone', () => {
    localStorage.setItem('fieldshore_entered', '1');
    expect(launch()).toEqual([]);
  });

  it('loads the app instead of throwing or redirecting when storage is unavailable', () => {
    const blocked = {
      getItem: () => {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
      setItem: () => {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
    };
    let replaced: string[] | undefined;
    expect(() => {
      replaced = launch({ storage: blocked });
    }).not.toThrow();
    expect(replaced).toEqual([]);
  });
});
