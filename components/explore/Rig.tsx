"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { allBodies, type Body } from "./layout";
import { defaultCam, flight, runtime, setCoarse, spawn, step } from "./flight";

const ELEVATION = THREE.MathUtils.degToRad(16);
const _dir = new THREE.Vector3();
const _right = new THREE.Vector3();

/**
 * The parked shot, composed rather than chased. The camera sits outside
 * the craft, a little above the orbital plane, far enough back that the
 * world fills about a third of the frame, with the craft below it.
 */
function frameOrbit(
  b: Body,
  camDist: number,
  camera: THREE.PerspectiveCamera,
  size: { width: number; height: number },
  outPos: THREE.Vector3,
  outLook: THREE.Vector3,
  radial: THREE.Vector3,
) {
  const f = flight;
  const n = b.pole;
  radial.copy(f.pos).sub(b.center);
  radial.addScaledVector(n, -radial.dot(n));
  if (radial.lengthSq() < 1e-6) radial.copy(f.fwd).cross(n);
  radial.normalize();

  const aspect = size.width / Math.max(1, size.height);
  const halfV = THREE.MathUtils.degToRad(camera.fov / 2);
  const halfH = Math.atan(Math.tan(halfV) * aspect);
  // planet's angular diameter: a third of the height, or 62% of a narrow width
  const diam = Math.min((2 * halfV) / 3, 0.62 * 2 * halfH);
  const zoom = camDist / defaultCam();
  const Dp = Math.max((b.radius / Math.sin(diam / 2)) * zoom, b.orbitR * 1.3);

  // A low camera: ~16 degrees over the orbital plane keeps a third of the
  // disk on the night side, where the lights are. The view is then tipped
  // so the craft sits in the lower third, as long as that keeps the world
  // comfortably in frame.
  const e = ELEVATION;
  const R = b.orbitR;
  const craftBelow = Math.atan2(Dp * Math.sin(e), Dp * Math.cos(e) - R);
  const tilt = THREE.MathUtils.clamp(craftBelow - halfV * 0.46, e - halfV * 0.1, e + halfV * 0.38);
  const above = tilt - e;

  _dir.copy(radial).multiplyScalar(Math.cos(e)).addScaledVector(n, Math.sin(e));
  outPos.copy(b.center).addScaledVector(_dir, Dp);
  // lead room: the camera slides a touch ahead so the craft sits behind centre
  outPos.addScaledVector(f.fwd, Dp * 0.06);

  // aim at the centre, then tip the view down by `above`
  const toC = _dir.copy(b.center).sub(outPos).normalize();
  _right.copy(toC).cross(n).normalize();
  toC.applyAxisAngle(_right, -above);
  outLook.copy(outPos).addScaledVector(toC, Dp);
}


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
  const up = useRef(new THREE.Vector3(0, 1, 0));
  const dUp = useRef(new THREE.Vector3(0, 1, 0));
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
      frameOrbit(f.body, D, camera as THREE.PerspectiveCamera, state.size, dPos.current, dLook.current, out.current);
      dUp.current.copy(f.up);
    } else {
      dPos.current
        .copy(f.pos)
        .addScaledVector(f.fwd, -D)
        .addScaledVector(f.up, D * 0.3);
      dLook.current.copy(f.pos).addScaledVector(f.fwd, D * 0.4);
      dUp.current.copy(f.up);
    }

    if (!init.current) {
      pos.current.copy(dPos.current);
      look.current.copy(dLook.current);
      up.current.copy(dUp.current);
      init.current = true;
    } else {
      pos.current.lerp(dPos.current, 1 - Math.exp(-3.2 * d));
      look.current.lerp(dLook.current, 1 - Math.exp(-4 * d));
      up.current.lerp(dUp.current, 1 - Math.exp(-3 * d)).normalize();
    }

    // the camera never goes inside a world either
    for (const b of allBodies) {
      off.current.copy(pos.current).sub(b.center);
      const dist = off.current.length();
      const min = b.radius * (b.project ? 1.35 : 1.15);
      if (dist < min) pos.current.copy(b.center).addScaledVector(off.current.divideScalar(Math.max(dist, 1e-4)), min);
    }

    camera.position.copy(pos.current);
    camera.up.copy(up.current);
    camera.lookAt(look.current);

    // reduced motion renders on demand: keep asking while anything settles
    if (reduced) {
      const settling = pos.current.distanceToSquared(dPos.current) > 1e-4;
      if (moving || settling) state.invalidate();
    }
  });

  return null;
}
