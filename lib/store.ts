"use client";

import { useSyncExternalStore } from "react";

/**
 * Tiny external store shared between the R3F scene and the DOM overlay.
 * No dependency, no context re-render cascade: the canvas reads the raw
 * snapshot inside useFrame, the UI subscribes.
 */
export type SceneState = {
  /** project id opened in the slide-over */
  active: string | null;
  /** project id under the pointer (node or dock row) */
  hovered: string | null;
  /** limited orbit controls enabled */
  explore: boolean;
  /** 0..1 document scroll progress */
  scroll: number;
  /** renderer gave up — overlay switches to the CSS galaxy */
  webglFailed: boolean;
};

const state: SceneState = {
  active: null,
  hovered: null,
  explore: false,
  scroll: 0,
  webglFailed: false,
};

let snapshot: SceneState = { ...state };
const listeners = new Set<() => void>();

function commit() {
  snapshot = { ...state };
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Mutable read — safe inside useFrame, never triggers React work. */
export const raw = state;

export const sceneStore = {
  setActive(id: string | null) {
    if (state.active === id) return;
    state.active = id;
    commit();
  },
  setHovered(id: string | null) {
    if (state.hovered === id) return;
    state.hovered = id;
    commit();
  },
  toggleExplore() {
    state.explore = !state.explore;
    commit();
  },
  setExplore(v: boolean) {
    if (state.explore === v) return;
    state.explore = v;
    commit();
  },
  /** hot path: written every scroll frame, no React notify */
  setScroll(v: number) {
    state.scroll = v;
  },
  failWebgl() {
    if (state.webglFailed) return;
    state.webglFailed = true;
    commit();
  },
};

const getSnapshot = () => snapshot;

export function useScene<T>(select: (s: SceneState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => select(getSnapshot()),
    () => select(snapshot),
  );
}
