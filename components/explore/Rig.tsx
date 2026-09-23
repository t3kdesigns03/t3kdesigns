"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { allBodies } from "./layout";
import { defaultCam, flight, runtime, setCoarse, spawn, step } from "./flight";

const UP = new THREE.Vector3(0, 1, 0);

/**
 * Drives the craft and the follow camera from a single frame callback, so
 * the camera always reads the position the craft has this frame. Out in
 * the open it trails behind; in orbit it swings outward and looks partly
 * at the planet, so the world is in shot rather than just the hull.
 */
export default function Rig({
  reduced,
  coarse,
}: {
  reduced: boolean;
  coarse: boolean;
}) {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);

  const pos = useRef(new THREE.Vector3());
  const look = useRef(new THREE.Vector3());
  const dPos = useRef(new THREE.Vector3());
  const dLook = useRef(new THREE.Vector3());
  const out = useRef(new THREE.Vector3());
  const off = useRef(new THREE.Vector3());
  const init = useRef(false);

  // placed before the first frame is drawn
  useLayoutEffect(() => {
    setCoarse(coarse);
    flight.reduced = reduced;
    spawn();
    flight.camDist = defaultCam();
    init.current = false;
    // spawn once per mount; reduced/coarse changes are handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    flight.reduced = reduced;
  }, [reduced]);

  useEffect(() => {
    runtime.kick = () => invalidate();
    return () => {
      runtime.kick = () => {};
    };
  }, [invalidate]);

  useFrame((state, dt) => {
    const d = Math.min(dt, 1 / 15);
    const moving = step(d);

    const f = flight;
    const D = f.camDist;

    if (f.mode === "orbit" && f.body) {
      // A landscape screen has room for craft and world side by side. A
      // portrait phone does not, so there the camera rises behind the craft
      // and looks over it at the world: craft below, world above.
      const p = THREE.MathUtils.clamp((1 - state.size.width / state.size.height) / 0.45, 0, 1);
      const mix = THREE.MathUtils.lerp;
      out.current.copy(f.pos).sub(f.body.center).normalize();
      dPos.current
        .copy(f.pos)
        .addScaledVector(f.fwd, -D * mix(0.78, 0.3, p))
        .addScaledVector(out.current, D * mix(0.5, 0.8, p))
        .addScaledVector(UP, D * mix(0.2, 0.42, p));
      dLook.current.copy(f.pos).lerp(f.body.center, mix(0.32, 0.62, p));
    } else {
      dPos.current
        .copy(f.pos)
        .addScaledVector(f.fwd, -D)
        .addScaledVector(UP, D * 0.3);
      dLook.current.copy(f.pos).addScaledVector(f.fwd, D * 0.4);
    }

    if (!init.current) {
      pos.current.copy(dPos.current);
      look.current.copy(dLook.current);
      init.current = true;
    } else {
      pos.current.lerp(dPos.current, 1 - Math.exp(-3.2 * d));
      look.current.lerp(dLook.current, 1 - Math.exp(-4 * d));
    }

    // the camera never goes inside a world either
    for (const b of allBodies) {
      off.current.copy(pos.current).sub(b.center);
      const dist = off.current.length();
      const min = b.radius * (b.project ? 1.35 : 1.15);
      if (dist < min) pos.current.copy(b.center).addScaledVector(off.current.divideScalar(Math.max(dist, 1e-4)), min);
    }

    camera.position.copy(pos.current);
    camera.lookAt(look.current);

    // reduced motion renders on demand: keep asking while anything settles
    if (reduced) {
      const settling = pos.current.distanceToSquared(dPos.current) > 1e-4;
      if (moving || settling) state.invalidate();
    }
  });

  return null;
}
