import 'fake-indexeddb/auto';
import { describe, it, expect, vi } from 'vitest';
import { createConnectivity } from './connectivity';

// Reconnect detection — on 'online', kick the injected onOnline (a flush in prod).
// window access is injected so the test stays window-free.

describe('connectivity — reconnect kicks onOnline', () => {
  it('fires onOnline when the online event arrives, and detaches on stop', () => {
    const onOnline = vi.fn();
    const handlers: Record<string, () => void> = {};
    const add = vi.fn((t: 'online', fn: () => void) => void (handlers[t] = fn));
    const remove = vi.fn();
    const c = createConnectivity({ onOnline, addListener: add, removeListener: remove });

    c.start();
    expect(add).toHaveBeenCalledWith('online', expect.any(Function));

    handlers['online']!(); // device comes back online
    expect(onOnline).toHaveBeenCalledTimes(1);

    c.stop();
    expect(remove).toHaveBeenCalledWith('online', expect.any(Function));
  });

  it('start() is idempotent — registers the listener once', () => {
    const add = vi.fn();
    const c = createConnectivity({ onOnline: vi.fn(), addListener: add, removeListener: vi.fn() });
    c.start();
    c.start();
    expect(add).toHaveBeenCalledTimes(1);
  });
});
