"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { PointPool } from "@/components/scene/traffic/pointPool";
import { flight } from "./flight";
import { FILL_DIR, LIGHT_DIR } from "./layout";
import { hullFrag, hullVert, spikeFrag, spikeVert } from "./shaders";

const WARM: [number, number, number] = [1.0, 0.72, 0.45];
const ICE: [number, number, number] = [0.74, 0.88, 1.0];
const ION = new THREE.Color("#8fc8ff");

const SCALE = 0.85;
/** chine tips, where the nav pins sit (hull space, +Z forward) */
const CHINE_L = new THREE.Vector3(-0.205, 0.0, -0.3);
const CHINE_R = new THREE.Vector3(0.205, 0.0, -0.3);
const NOZZLE_Z = -0.45;

/**
 * A courier: a flat faceted wedge, nose forward, no wings, no fin. Built
 * from a dozen points and flat-shaded so each facet catches the key light
 * on its own — which is most of what makes a dark hull read as a shape.
 */
function courierGeometry() {
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const nose = V(0, 0.004, 0.56);
  const s1 = V(0, 0.07, 0.06); // canopy hump
  const s2 = V(0, 0.056, -0.36); // spine aft
  const cl = V(-0.205, 0, -0.3);
  const cr = V(0.205, 0, -0.3);
  const tl = V(-0.13, 0.012, -0.45);
  const tr = V(0.13, 0.012, -0.45);
  const tt = V(0, 0.05, -0.45);
  const kb = V(0, -0.036, -0.08); // keel
  const bt = V(0, -0.02, -0.45);

  const tris: THREE.Vector3[][] = [
    // top
    [nose, cr, s1],
    [nose, s1, cl],
    [s1, cr, s2],
    [s1, s2, cl],
    [s2, cr, tr],
    [s2, tr, tt],
    [s2, tt, tl],
    [s2, tl, cl],
    // belly
    [nose, kb, cr],
    [nose, cl, kb],
    [kb, tr, cr],
    [kb, bt, tr],
    [kb, tl, bt],
    [kb, cl, tl],
    // transom
    [tl, tt, tr],
    [tl, tr, bt],
  ];

  // wind every face outward from a point inside the hull
  const inside = V(0, 0.01, -0.15);
  const pos: number[] = [];
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  const n = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (const [a, b, d] of tris) {
    e1.subVectors(b, a);
    e2.subVectors(d, a);
    n.crossVectors(e1, e2);
    c.copy(a).add(b).add(d).divideScalar(3).sub(inside);
    const [p, q, r] = n.dot(c) >= 0 ? [a, b, d] : [a, d, b];
    pos.push(p.x, p.y, p.z, q.x, q.y, q.z, r.x, r.y, r.z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();

  // smoothed normals: every corner shares the average of the faces meeting there
  const flat = g.getAttribute("normal") as THREE.BufferAttribute;
  const sum = new Map<string, THREE.Vector3>();
  const key = (i: number) => `${pos[i * 3].toFixed(4)},${pos[i * 3 + 1].toFixed(4)},${pos[i * 3 + 2].toFixed(4)}`;
  const count = pos.length / 3;
  for (let i = 0; i < count; i++) {
    const k = key(i);
    const acc = sum.get(k) ?? new THREE.Vector3();
    acc.x += flat.getX(i);
    acc.y += flat.getY(i);
    acc.z += flat.getZ(i);
    sum.set(k, acc);
  }
  const smooth = new Float32Array(pos.length);
  for (let i = 0; i < count; i++) {
    const v = sum.get(key(i))!.clone().normalize();
    smooth.set([v.x, v.y, v.z], i * 3);
  }
  g.setAttribute("aSmooth", new THREE.BufferAttribute(smooth, 3));
  return g;
}

/** Cone along +Y, tip up; turned so the tip points aft. */
function spikeGeometry() {
  const g = new THREE.ConeGeometry(0.055, 1, 14, 1, true);
  return g;
}

export default function Craft({
  pool,
  reduced,
}: {
  pool: PointPool;
  reduced: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const spike = useRef<THREE.Mesh>(null);
  const navBase = useMemo(() => pool.allocNamed("craft:nav", 3), [pool]);
  const w = useRef(new THREE.Vector3());
  const hull = useMemo(() => courierGeometry(), []);
  const cone = useMemo(() => spikeGeometry(), []);

  const hullUniforms = useMemo(
    () => ({
      uLightDir: { value: LIGHT_DIR },
      uFillDir: { value: FILL_DIR },
      uBase: { value: new THREE.Color("#18171f") },
      uRim: { value: new THREE.Color("#a9b8ff") },
    }),
    [],
  );
  const spikeUniforms = useMemo(
    () => ({ uColor: { value: ION }, uPower: { value: 0 } }),
    [],
  );

  const at = (local: THREE.Vector3) =>
    w.current.copy(local).multiplyScalar(SCALE).applyQuaternion(flight.quat).add(flight.pos);

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    g.position.copy(flight.pos);
    g.quaternion.copy(flight.quat);

    // ion spike: only while the drive is actually pushing
    const th = reduced ? 0 : flight.thrust;
    const s = spike.current;
    if (s) {
      const on = th > 0.03;
      s.visible = on;
      if (on) {
        const t = state.clock.elapsedTime;
        const flicker = 0.9 + 0.1 * Math.sin(t * 57) * Math.sin(t * 23);
        const len = 0.18 + 0.5 * th * flicker;
        s.scale.set(0.6 + 0.4 * th, len, 0.6 + 0.4 * th);
        s.position.set(0, 0.012, NOZZLE_Z - len / 2);
        (s.material as THREE.ShaderMaterial).uniforms.uPower.value = 0.6 + 1.4 * th;
      }
    }

    // two pin nav lights, and a nozzle glow that exists only under thrust
    const t = state.clock.elapsedTime;
    const blink = reduced ? 0.8 : 0.55 + 0.45 * Math.pow(Math.max(0, Math.sin(t * 2.6)), 12);
    let p = at(CHINE_L);
    pool.set(navBase, p.x, p.y, p.z, WARM[0], WARM[1], WARM[2], 0.55, blink * 0.9);
    p = at(CHINE_R);
    pool.set(navBase + 1, p.x, p.y, p.z, ICE[0], ICE[1], ICE[2], 0.55, blink * 0.9);
    if (th > 0.03) {
      p = w.current.set(0, 0.012, NOZZLE_Z - 0.02).multiplyScalar(SCALE).applyQuaternion(flight.quat).add(flight.pos);
      pool.set(navBase + 2, p.x, p.y, p.z, ION.r, ION.g, ION.b, 0.8 + th * 0.8, 0.3 + th * 0.6);
    } else {
      pool.hide(navBase + 2);
    }
  });

  return (
    <group ref={group}>
      <group scale={SCALE}>
        <mesh geometry={hull}>
          <shaderMaterial uniforms={hullUniforms} vertexShader={hullVert} fragmentShader={hullFrag} />
        </mesh>
        {/* visor slit along the canopy ridge */}
        <mesh position={[0, 0.059, 0.16]} rotation={[0.13, 0, 0]}>
          <boxGeometry args={[0.028, 0.006, 0.11]} />
          <meshBasicMaterial color="#c9bcff" toneMapped={false} />
        </mesh>
        {/* engine slot in the transom */}
        <mesh position={[0, 0.012, NOZZLE_Z + 0.002]}>
          <boxGeometry args={[0.12, 0.022, 0.004]} />
          <meshBasicMaterial color="#1b2740" />
        </mesh>
        <mesh ref={spike} geometry={cone} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <shaderMaterial
            uniforms={spikeUniforms}
            vertexShader={spikeVert}
            fragmentShader={spikeFrag}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </group>
  );
}
