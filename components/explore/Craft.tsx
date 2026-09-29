"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { PointPool } from "@/components/scene/traffic/pointPool";
import { flight } from "./flight";
import { FILL_DIR, LIGHT_DIR } from "./layout";
import { spikeFrag, spikeVert, steelFrag, steelVert } from "./shaders";

const WARM: [number, number, number] = [1.0, 0.72, 0.45];
const ICE: [number, number, number] = [0.74, 0.88, 1.0];
const ION = new THREE.Color("#8fc8ff");

/**
 * Hull space: +Z is the nose, +Y is up (away from the belly tiles). The
 * stack is about 1.3 long and 0.25 across; SCALE sets its size on screen.
 * If it ever reads as a tower next to a world, shrink SCALE — nothing else.
 */
const SCALE = 0.74;
/** barrel radius */
const R = 0.115;
const SKIRT_R = 0.1245;
const BULKHEAD_Z = -0.575;
const SKIRT_Z = -0.622;
const NOSE_BASE = 0.3;
const TIP = 0.66;

/** Six bells: three small inner, three larger outer, clear of the skirt. */
type Bell = { x: number; y: number; exit: number; len: number };
const deg = THREE.MathUtils.degToRad;
const BELLS: Bell[] = [
  ...[90, 210, 330].map((a) => ({ x: 0.036 * Math.cos(deg(a)), y: 0.036 * Math.sin(deg(a)), exit: 0.021, len: 0.045 })),
  ...[30, 150, 270].map((a) => ({ x: 0.078 * Math.cos(deg(a)), y: 0.078 * Math.sin(deg(a)), exit: 0.033, len: 0.068 })),
];
const CLUSTER_Z = BULKHEAD_Z - 0.07;

/**
 * Four aft flaps in an X, hinged on the barrel and folded in toward the
 * vertical, so from the side (the parked shot) two rise above the stack and
 * two hang below it. The left pair is the right pair mirrored.
 */
const HINGE = deg(40);
const FOLD = deg(62);
const FLAP_SPAN = 0.115;
const FLAP_TIP_Z = -0.42;
type Flap = { side: 1 | -1; lower: boolean };
const FLAPS: Flap[] = [
  { side: 1, lower: false },
  { side: 1, lower: true },
  { side: -1, lower: false },
  { side: -1, lower: true },
];
/** flap tips (hull space), where the nav pins sit: upper pair */
const TIP_L = new THREE.Vector3(
  -(R * Math.cos(HINGE) + FLAP_SPAN * Math.cos(FOLD)),
  R * Math.sin(HINGE) + FLAP_SPAN * Math.sin(FOLD),
  FLAP_TIP_Z,
);
const TIP_R = TIP_L.clone().setX(-TIP_L.x);

/** One lathe: aft bay, skirt, flare, barrel, tangent-ogive nose. */
function stackGeometry() {
  const pts: THREE.Vector2[] = [];
  const P = (r: number, z: number) => pts.push(new THREE.Vector2(r, z));
  P(0, BULKHEAD_Z);
  P(0.07, BULKHEAD_Z);
  P(0.112, BULKHEAD_Z);
  // inside of the skirt, then its lip
  P(SKIRT_R - 0.005, SKIRT_Z);
  P(SKIRT_R, SKIRT_Z);
  P(SKIRT_R, -0.603);
  // the flare eases into the barrel
  for (let i = 1; i <= 6; i++) {
    const t = i / 6;
    const e = t * t * (3 - 2 * t);
    P(SKIRT_R + (R - SKIRT_R) * e, -0.603 + (-0.5 + 0.603) * t);
  }
  P(R, NOSE_BASE);
  // tangent ogive, sampled densest near the tip, then a blunt cap
  const L = TIP - NOSE_BASE;
  const rho = (R * R + L * L) / (2 * R);
  const n = 18;
  for (let i = 1; i < n; i++) {
    const x = Math.max(0.012, L * Math.pow(1 - i / n, 1.5)); // distance from the tip
    P(Math.sqrt(rho * rho - (L - x) * (L - x)) + R - rho, TIP - x);
  }
  P(0.0045, TIP - 0.003);
  P(0, TIP);

  const g = new THREE.LatheGeometry(pts, 48);
  g.rotateX(Math.PI / 2); // lathe axis Y → hull +Z
  return g;
}

/** A trapezoid plate: root on the hinge line, swept leading edge, round tip. */
function flapGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.5);
  s.lineTo(0, -0.22);
  s.lineTo(FLAP_SPAN * 0.85, -0.35);
  s.quadraticCurveTo(FLAP_SPAN, -0.37, FLAP_SPAN, -0.4);
  s.lineTo(FLAP_SPAN, -0.47);
  s.lineTo(0, -0.5);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.01, bevelEnabled: false, curveSegments: 4 });
  g.rotateX(Math.PI / 2); // shape y → hull z; thickness along -y
  g.translate(0, 0.005, 0);
  return g;
}

/** Open bell along -Z: throat at z = 0, exit at z = -len. */
function bellGeometry(exit: number, len: number) {
  const g = new THREE.CylinderGeometry(exit, exit * 0.45, len, 18, 1, true);
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0, -len / 2);
  return g;
}

function steel(mode: number, base: string) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uLightDir: { value: LIGHT_DIR },
      uFillDir: { value: FILL_DIR },
      uBase: { value: new THREE.Color(base) },
      uTile: { value: new THREE.Color("#18181e") },
      uRim: { value: new THREE.Color("#a9b8ff") },
      uBand: { value: new THREE.Color("#c9bcff") },
      uHeatCol: { value: ION },
      uMode: { value: mode },
      uHeat: { value: 0 },
    },
    vertexShader: steelVert,
    fragmentShader: steelFrag,
    side: THREE.DoubleSide,
  });
}

export default function Craft({
  pool,
  reduced,
}: {
  pool: PointPool;
  reduced: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const flaps = useRef<(THREE.Group | null)[]>([]);
  const plumes = useRef<(THREE.Mesh | null)[]>([]);
  const burn = useRef(0);
  const navBase = useMemo(() => pool.allocNamed("craft:nav", 3), [pool]);
  const w = useRef(new THREE.Vector3());

  const parts = useMemo(() => {
    const stack = stackGeometry();
    const flap = flapGeometry();
    const bellSmall = bellGeometry(0.021, 0.045);
    const bellBig = bellGeometry(0.033, 0.068);
    const cone = new THREE.ConeGeometry(0.055, 1, 14, 1, true);
    const hullMat = steel(1, "#737780");
    const plateSteel = steel(0, "#737780");
    const plateTile = steel(2, "#737780");
    const bellMat = steel(0, "#2c2d34");
    const plumeMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: ION }, uPower: { value: 0 } },
      vertexShader: spikeVert,
      fragmentShader: spikeFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    return { stack, flap, bellSmall, bellBig, cone, hullMat, plateSteel, plateTile, bellMat, plumeMat };
  }, []);

  useEffect(
    () => () => {
      for (const v of Object.values(parts)) v.dispose();
    },
    [parts],
  );

  const at = (local: THREE.Vector3) =>
    w.current.copy(local).multiplyScalar(SCALE).applyQuaternion(flight.quat).add(flight.pos);

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    g.position.copy(flight.pos);
    g.quaternion.copy(flight.quat);

    // flaps trim a few degrees into the bank
    const trim = THREE.MathUtils.clamp(flight.bank, -0.7, 0.7) * 0.12;
    FLAPS.forEach((f, i) => {
      const fg = flaps.current[i];
      if (fg) fg.rotation.z = (f.lower ? -FOLD : FOLD) + trim;
    });

    // plume: only while inbound, never parked in orbit
    const want = reduced || flight.mode === "orbit" ? 0 : flight.thrust;
    burn.current = THREE.MathUtils.damp(burn.current, want, want > burn.current ? 14 : 6, Math.min(dt, 0.1));
    const th = burn.current;
    const on = th > 0.03;
    const t = state.clock.elapsedTime;
    const flicker = 0.9 + 0.1 * Math.sin(t * 57) * Math.sin(t * 23);
    BELLS.forEach((b, i) => {
      const m = plumes.current[i];
      if (!m) return;
      m.visible = on;
      if (!on) return;
      const len = (b.exit > 0.03 ? 0.2 + 0.6 * th : 0.12 + 0.35 * th) * flicker;
      const k = (b.exit / 0.055) * (0.8 + 0.3 * th);
      m.scale.set(k, len, k);
      m.position.set(b.x, b.y, BULKHEAD_Z - b.len - len / 2);
    });
    parts.plumeMat.uniforms.uPower.value = 0.4 + 0.9 * th;
    parts.bellMat.uniforms.uHeat.value = th;

    // two pin nav lights on the upper flap tips, and a glow at the cluster under thrust
    const blink = reduced ? 0.8 : 0.55 + 0.45 * Math.pow(Math.max(0, Math.sin(t * 2.6)), 12);
    let p = at(TIP_L);
    pool.set(navBase, p.x, p.y, p.z, WARM[0], WARM[1], WARM[2], 0.55, blink * 0.9);
    p = at(TIP_R);
    pool.set(navBase + 1, p.x, p.y, p.z, ICE[0], ICE[1], ICE[2], 0.55, blink * 0.9);
    if (on) {
      p = w.current.set(0, 0, CLUSTER_Z).multiplyScalar(SCALE).applyQuaternion(flight.quat).add(flight.pos);
      pool.set(navBase + 2, p.x, p.y, p.z, ION.r, ION.g, ION.b, 0.8 + th * 0.8, 0.3 + th * 0.6);
    } else {
      pool.hide(navBase + 2);
    }
  });

  return (
    <group ref={group}>
      <group scale={SCALE}>
        <mesh geometry={parts.stack} material={parts.hullMat} />
        {FLAPS.map((f, i) => (
          <group key={i} scale={[f.side, 1, 1]}>
            <group
              ref={(el) => {
                flaps.current[i] = el;
              }}
              position={[R * Math.cos(HINGE) - 0.002, (f.lower ? -1 : 1) * R * Math.sin(HINGE), 0]}
              rotation={[0, 0, f.lower ? -FOLD : FOLD]}
            >
              <mesh geometry={parts.flap} material={f.lower ? parts.plateTile : parts.plateSteel} />
            </group>
          </group>
        ))}
        {BELLS.map((b, i) => (
          <mesh
            key={i}
            geometry={b.exit > 0.03 ? parts.bellBig : parts.bellSmall}
            material={parts.bellMat}
            position={[b.x, b.y, BULKHEAD_Z]}
          />
        ))}
        {BELLS.map((b, i) => (
          <mesh
            key={i}
            ref={(el) => {
              plumes.current[i] = el;
            }}
            geometry={parts.cone}
            material={parts.plumeMat}
            rotation={[-Math.PI / 2, 0, 0]}
            visible={false}
          />
        ))}
      </group>
    </group>
  );
}
