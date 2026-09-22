"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { hexToRGB } from "../color";
import { ringNormal, ringPoint } from "./anchors";
import { SHUTTLE, type Ship } from "./Ships";
import type { PointPool } from "./pointPool";

/**
 * Crew. The rule that keeps this from ruining the page is scale: at the
 * default camera they are two or three pixels beside a thirty-pixel world.
 * You notice them only if you go looking, which is the point.
 */
type Walker = {
  ship: Ship;
  slot: number;
  /** 0 aboard · 1 stepping out · 2 walking · 3 working · 4 walking back · 5 boarding */
  phase: number;
  t: number;
  angle0: number;
  span: number;
  lane: number;
  rgb: [number, number, number];
};

const HEIGHT = 0.026;
const PHASE_LEN = [0, 0.7, 4.2, 2.6, 3.1, 0.7];

export default function Crew({
  pool,
  ships,
  max,
}: {
  pool: PointPool;
  ships: Ship[];
  max: number;
}) {
  const camera = useThree((s) => s.camera);

  const walkers = useMemo<Walker[]>(() => {
    const shuttles = ships.filter((s) => s.hull === SHUTTLE);
    const out: Walker[] = [];
    let n = 0;
    for (const ship of shuttles) {
      const crewOf = 1 + ((ship.i * 7) % 3);
      for (let j = 0; j < crewOf && n < max; j++, n++) {
        out.push({
          ship,
          slot: pool.allocNamed(`crew:${ship.i}:${j}`, 1),
          phase: 0,
          t: 0,
          angle0: 0,
          span: 0,
          lane: j,
          rgb: [0.9, 0.9, 1],
        });
      }
    }
    return out;
  }, [ships, max, pool]);

  const mesh = useRef<THREE.InstancedMesh>(null);
  const p = useRef(new THREE.Vector3());
  const n = useRef(new THREE.Vector3());
  const ship = useRef(new THREE.Vector3());
  const m = useRef(new THREE.Matrix4());
  const q = useRef(new THREE.Quaternion());
  const s = useRef(new THREE.Vector3());
  const toCam = useRef(new THREE.Vector3());
  const outward = useRef(new THREE.Vector3());

  useFrame((state, dt) => {
    const d = Math.min(dt, 1 / 20);
    let drawn = 0;

    for (const w of walkers) {
      const a = w.ship.docked;
      const parked = !!a && a.isProject;

      // only run the cycle where someone could actually see it
      let facing = false;
      if (parked && a) {
        ringPoint(a, w.ship.route.angleTo, p.current);
        outward.current.copy(p.current).sub(a.position);
        toCam.current.copy(camera.position).sub(a.position);
        facing =
          outward.current.dot(toCam.current) > 0 &&
          a.position.distanceTo(camera.position) < 34;
      }

      if (!parked || !facing) {
        w.phase = 0;
        w.t = 0;
        if (w.slot >= 0) pool.hide(w.slot);
        continue;
      }

      if (w.phase === 0) {
        w.phase = 1;
        w.t = 0;
        w.angle0 = w.ship.route.angleTo;
        w.span = (Math.random() > 0.5 ? 1 : -1) * (0.18 + Math.random() * 0.2);
        w.rgb = hexToRGB(a!.accent);
      }

      w.t += d;
      if (w.t > PHASE_LEN[w.phase]) {
        w.t = 0;
        w.phase = w.phase >= 5 ? 0 : w.phase + 1;
        if (w.phase === 0) {
          if (w.slot >= 0) pool.hide(w.slot);
          continue;
        }
      }

      const prog = w.t / Math.max(0.0001, PHASE_LEN[w.phase]);
      const laneOff = (w.lane - 1) * 0.016;

      // where on the ring, and how far out of the hatch
      let along = 0;
      let out = 1;
      if (w.phase === 1) {
        out = prog;
        along = 0;
      } else if (w.phase === 2) {
        along = prog;
      } else if (w.phase === 3) {
        along = 1;
      } else if (w.phase === 4) {
        along = 1 - prog;
      } else {
        out = 1 - prog;
        along = 0;
      }

      const angle = w.angle0 + w.span * along + laneOff;
      ringPoint(a!, angle, p.current);
      ringNormal(a!, n.current);

      // a short hop out of the hatch, not a bounce
      ringPoint(a!, w.ship.route.angleTo, ship.current);
      ship.current.addScaledVector(n.current, HEIGHT * 1.6);
      p.current.lerpVectors(ship.current, p.current, out);
      p.current.addScaledVector(n.current, HEIGHT * 0.5);
      if (w.phase === 1 || w.phase === 5) {
        p.current.addScaledVector(n.current, Math.sin(prog * Math.PI) * 0.012);
      }

      if (mesh.current) {
        q.current.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n.current);
        s.current.setScalar(HEIGHT);
        m.current.compose(p.current, q.current, s.current);
        mesh.current.setMatrixAt(drawn, m.current);
      }
      drawn++;

      // the visor: one slit of light, the only thing that gives them away
      if (w.slot >= 0) {
        const glint = w.phase === 3 ? 0.55 : 0.34;
        pool.set(
          w.slot,
          p.current.x + n.current.x * HEIGHT * 0.45,
          p.current.y + n.current.y * HEIGHT * 0.45,
          p.current.z + n.current.z * HEIGHT * 0.45,
          w.rgb[0],
          w.rgb[1],
          w.rgb[2],
          0.62,
          glint * (0.7 + 0.3 * Math.sin(state.clock.elapsedTime * 2 + w.lane)),
        );
      }
    }

    if (mesh.current) {
      mesh.current.count = drawn;
      mesh.current.instanceMatrix.needsUpdate = true;
    }
    pool.flush();
  });

  if (walkers.length === 0) return null;

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, walkers.length]}
      frustumCulled={false}
      renderOrder={7}
    >
      <capsuleGeometry args={[0.3, 0.7, 2, 5]} />
      <meshStandardMaterial color="#0d0b14" metalness={0.2} roughness={0.85} />
    </instancedMesh>
  );
}
