"use client";

import { useSyncExternalStore } from "react";

/**
 * What the HUD needs to know, and nothing per-frame. The flight model
 * writes here only when something the reader would notice changes.
 */
export type ExploreState = {
  /** world currently orbited */
  parked: string | null;
  /** world being flown to */
  target: string | null;
  /** any input has happened — the hint fades on the first one */
  touched: boolean;
};

let state: ExploreState = { parked: null, target: null, touched: false };
const listeners = new Set<() => void>();

function set(patch: Partial<ExploreState>) {
  let changed = false;
  for (const k of Object.keys(patch) as (keyof ExploreState)[]) {
    if (state[k] !== patch[k]) changed = true;
  }
  if (!changed) return;
  state = { ...state, ...patch };
  for (const l of listeners) l();
}

export const exploreStore = {
  setParked: (id: string | null) => set({ parked: id, target: null }),
  setTarget: (id: string | null) => set({ target: id, parked: null }),
  touch: () => set({ touched: true }),
  free: () => set({ parked: null, target: null }),
  get: () => state,
};

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export function useExplore<T>(select: (s: ExploreState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => select(state),
    () => select({ parked: null, target: null, touched: false }),
  );
}
