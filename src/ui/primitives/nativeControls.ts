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

function read(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false; // storage unavailable — default to the custom pickers
  }
}

export function setNativeControls(next: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    /* storage unavailable — preference still applies for this session */
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
