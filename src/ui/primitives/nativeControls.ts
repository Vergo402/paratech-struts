import { useSyncExternalStore } from 'react';

/**
 * The "Native controls" preference (accessibility.md §The Power Select fallback).
 * When on, every custom picker falls back to the OS-native `<select>`
 * (PowerSelect) — the doctrine is binary: fully custom AND SR-operable, or fully
 * native, never a custom control faking native semantics. Detection is the
 * explicit Settings toggle ONLY: the web has no reliable "a screen reader is
 * running" signal (accessibility.md OQ2, resolved 2026-07-01 — toggle, no
 * sniffing). The custom pickers stay keyboard/SR-operable regardless; this is an
 * operator opt-in, not the sole accessibility path.
 *
 * A tiny module store (not React context) so a primitive can read it with no
 * provider and no @app coupling — same home + spirit as useMediaQuery. Reactive
 * via useSyncExternalStore; cross-tab via the storage event.
 */
const STORAGE_KEY = 'fieldshore_native_controls';
const listeners = new Set<() => void>();

// #460 — a failed setItem (quota, private-mode, storage disabled) used to be
// silently swallowed while the useSyncExternalStore snapshot kept re-reading
// localStorage, so the toggle visibly reverted with no feedback. This in-memory
// fallback is what the snapshot reads FIRST: a failed write still applies for
// the session. Cleared once a write actually succeeds, so storage stays the
// source of truth again (and cross-tab sync via the storage event keeps working).
let memoryOverride: boolean | null = null;

function read(): boolean {
  if (memoryOverride !== null) return memoryOverride;
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false; // storage unavailable — default to the custom pickers
  }
}

export function setNativeControls(next: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(next));
    memoryOverride = null; // persisted — storage is authoritative again
  } catch {
    memoryOverride = next; // persistence failed — the toggle still applies this session
  }
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  // Cross-tab: another tab flipping the toggle writes storage but not our
  // in-memory listeners, so mirror the storage event too.
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) onChange();
  };
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(onChange);
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  };
}

/** Reactive read of the Native-controls preference. */
export function useNativeControls(): boolean {
  return useSyncExternalStore(subscribe, read, () => false);
}
