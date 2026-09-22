"use client";

import { useSyncExternalStore } from "react";

/** house easing — quiet in, quiet out */
export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const subscribers = new Map<string, (cb: () => void) => () => void>();

function subscriber(query: string) {
  let s = subscribers.get(query);
  if (!s) {
    s = (cb: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    };
    subscribers.set(query, s);
  }
  return s;
}

/**
 * Media queries as an external store rather than state-in-an-effect: the
 * first client render already has the right answer, and the server render
 * is explicit instead of accidental.
 */
export function useMedia(query: string, serverValue = false) {
  return useSyncExternalStore(
    subscriber(query),
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

/** Live prefers-reduced-motion, SSR-safe (false on the server). */
export function useReducedMotion() {
  return useMedia("(prefers-reduced-motion: reduce)");
}
