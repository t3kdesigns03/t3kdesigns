"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { PointPool } from "@/components/scene/traffic/pointPool";
import { flight } from "./flight";

const TRAIL = 16;
const SAMPLE = 0.03;
const ION: [number, number, number] = [0.6, 0.78, 1.0];
const WARM: [number, number, number] = [1.0, 0.7, 0.42];
const ICE: [number, number, number] = [0.72, 0.86, 1.0];

const SCALE = 0.85;
const TAIL = new THREE.Vector3(0, 0, -0.58).multiplyScalar(SCALE);
const ENGINE = new THREE.Vector3(0, 0, -0.53).multiplyScalar(SCALE);
const WING_L = new THREE.Vector3(-0.46, 0, -0.29).multiplyScalar(SCALE);
const WING_R = new THREE.Vector3(0.46, 0, -0.29).multiplyScalar(SCALE);

/** Swept delta, drawn nose-up in XY and turned flat later. */
function deltaWing() {
  const s = new THREE.Shape();
  s.moveTo(0, 0.28);
  s.lineTo(0.46, -0.3);
  s.lineTo(0.13, -0.23);
  s.lineTo(0, -0.3);
  s.lineTo(-0.13, -0.23);
  s.lineTo(-0.46, -0.3);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: 0.022, bevelEnabled: false });
}

/**
 * One small dark hull. A visor slit, two nav ticks, and an ion burn that
 * only shows while the craft is actually accelerating — at rest in orbit
 * the engine is a faint pilot glow, nothing more.
 */
export default function Craft({
  pool,
  reduced,
}: {
  pool: PointPool;
  reduced: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const trailBase = useMemo(() => pool.allocNamed("craft:trail", TRAIL), [pool]);
  const navBase = useMemo(() => pool.allocNamed("craft:nav", 3), [pool]);

  const samples = useRef(
    Array.from({ length: TRAIL }, () => ({ p: new THREE.Vector3(), thrust: 0 })),
  );
  const head = useRef(0);
  const acc = useRef(0);
  const w = useRef(new THREE.Vector3());
  const wing = useMemo(() => deltaWing(), []);

  const at = (local: THREE.Vector3) =>
    w.current.copy(local).applyQuaternion(flight.quat).add(flight.pos);

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    g.position.copy(flight.pos);
    g.quaternion.copy(flight.quat);

    // exhaust: sampled on a clock, so its length does not depend on frame rate
    acc.current += Math.min(dt, 0.1);
    while (acc.current > SAMPLE) {
      acc.current -= SAMPLE;
      head.current = (head.current + 1) % TRAIL;
      const s = samples.current[head.current];
      s.p.copy(at(TAIL));
      s.thrust = reduced ? 0 : flight.thrust;
    }
    for (let k = 0; k < TRAIL; k++) {
      const s = samples.current[(head.current - k + TRAIL) % TRAIL];
      const age = 1 - k / TRAIL;
      const b = s.thrust * age * age * 0.85;
      if (b < 0.01) {
        pool.hide(trailBase + k);
        continue;
      }
      pool.set(trailBase + k, s.p.x, s.p.y, s.p.z, ION[0], ION[1], ION[2], 0.7 + age * 2.2 * s.thrust, b);
    }

    const t = state.clock.elapsedTime;
    const blink = reduced ? 0.7 : 0.4 + 0.6 * Math.pow(Math.max(0, Math.sin(t * 3.3)), 10);

    let p = at(WING_L);
    pool.set(navBase, p.x, p.y, p.z, WARM[0], WARM[1], WARM[2], 1.0, blink * 0.75);
    p = at(WING_R);
    pool.set(navBase + 1, p.x, p.y, p.z, ICE[0], ICE[1], ICE[2], 1.0, blink * 0.75);
    p = at(ENGINE);
    const th = reduced ? 0 : flight.thrust;
    pool.set(navBase + 2, p.x, p.y, p.z, ION[0], ION[1], ION[2], 1.3 + th * 1.8, 0.22 + th * 0.8);

    pool.flush();
  });

  return (
    <group ref={group}>
      <group scale={SCALE}>
        {/* fuselage — narrow end forward (+Z) */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.02]}>
          <cylinderGeometry args={[0.04, 0.11, 0.95, 6]} />
          <meshStandardMaterial color="#2b2635" metalness={0.55} roughness={0.32} emissive="#0d0a12" />
        </mesh>
        {/* swept wing, laid flat with its point forward */}
        <mesh geometry={wing} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.011, -0.02]}>
          <meshStandardMaterial color="#24202c" metalness={0.55} roughness={0.34} emissive="#0b0910" />
        </mesh>
        {/* nozzle, faintly warm from the ion drive */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.47]}>
          <cylinderGeometry args={[0.06, 0.075, 0.1, 10]} />
          <meshStandardMaterial color="#1a1720" metalness={0.6} roughness={0.4} emissive="#1b2a44" emissiveIntensity={0.6} />
        </mesh>
        {/* visor slit — the only lit thing on the hull */}
        <mesh position={[0, 0.066, 0.18]}>
          <boxGeometry args={[0.09, 0.016, 0.16]} />
          <meshBasicMaterial color="#cbb6ff" toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}
