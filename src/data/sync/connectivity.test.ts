import 'fake-indexeddb/auto';
import { describe, it, expect, vi } from 'vitest';
import { createConnectivity } from './connectivity';

// Reconnect/disconnect detection — updates the reactive online flag (setOnline) and,
// on 'online', kicks the injected onOnline (flush + join-retry in prod). window access
// + the online getter are injected so the test stays window-free.

describe('connectivity — online/offline tracking + reconnect action', () => {
  function harness(initialOnline = true) {
    const onOnline = vi.fn();
    const setOnline = vi.fn();
    const handlers: Record<string, () => void> = {};
    const add = vi.fn((t: 'online' | 'offline', fn: () => void) => void (handlers[t] = fn));
    const remove = vi.fn();
    const c = createConnectivity({
      onOnline,
      setOnline,
      isOnline: () => initialOnline,
      addListener: add,
      removeListener: remove,
    });
    return { c, onOnline, setOnline, handlers, add, remove };
  }

  it('seeds the online flag on start and wires both online + offline listeners', () => {
    const { c, setOnline, add } = harness(false);
    c.start();
    expect(setOnline).toHaveBeenCalledWith(false); // seeded from isOnline()
    expect(add).toHaveBeenCalledWith('online', expect.any(Function));
    expect(add).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  it('online event sets online=true and fires onOnline; offline sets online=false only', () => {
    const { c, onOnline, setOnline, handlers } = harness(true);
    c.start();
    setOnline.mockClear();

    handlers['offline']!();
    expect(setOnline).toHaveBeenLastCalledWith(false);
    expect(onOnline).not.toHaveBeenCalled();

    handlers['online']!();
    expect(setOnline).toHaveBeenLastCalledWith(true);
    expect(onOnline).toHaveBeenCalledTimes(1);
  });

  it('start() is idempotent and stop() detaches both listeners', () => {
    const { c, add, remove } = harness();
    c.start();
    c.start();
    expect(add).toHaveBeenCalledTimes(2); // online + offline, once each
    c.stop();
    expect(remove).toHaveBeenCalledWith('online', expect.any(Function));
    expect(remove).toHaveBeenCalledWith('offline', expect.any(Function));
  });
});
