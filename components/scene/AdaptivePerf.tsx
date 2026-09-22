"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

/**
 * Two consecutive seconds under 40fps and we drop a particle tier and kill
 * bloom. Warmup is ignored — the first second is always shader compilation.
 */
export default function AdaptivePerf({ onDrop }: { onDrop: () => void }) {
  const acc = useRef({ t: 0, frames: 0, bad: 0, warm: 0, done: false });

  useFrame((_, dt) => {
    const a = acc.current;
    if (a.done) return;

    a.warm += dt;
    if (a.warm < 2.5) return;

    a.t += dt;
    a.frames++;

    if (a.t >= 1) {
      const fps = a.frames / a.t;
      a.t = 0;
      a.frames = 0;

      if (fps < 40) {
        a.bad++;
        if (a.bad >= 2) {
          a.bad = 0;
          a.done = true;
          onDrop();
        }
      } else {
        a.bad = 0;
      }
    }
  });

  return null;
}
