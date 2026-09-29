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
 * stack is about 1.32 long and 0.25 across; SCALE sets its size on screen.
 * If it ever reads as a tower next to a world, shrink SCALE — nothing else.
 */
const SCALE = 0.74;
/** barrel radius */
const R = 0.115;
const SKIRT_R = 0.1245;
const BULKHEAD_Z = -0.575;
const SKIRT_Z = -0.622;
const NOSE_BASE = 0.3;
const TIP = 0.7;

/** Six bells: three small inner, three larger outer, clear of the skirt. */
type Bell = { x: number; y: number; exit: number; len: number };
const deg = THREE.MathUtils.degToRad;
const BELLS: Bell[] = [
  ...[90, 210, 330].map((a) => ({ x: 0.036 * Math.cos(deg(a)), y: 0.036 * Math.sin(deg(a)), exit: 0.021, len: 0.055 })),
  ...[30, 150, 270].map((a) => ({ x: 0.078 * Math.cos(deg(a)), y: 0.078 * Math.sin(deg(a)), exit: 0.033, len: 0.088 })),
];
const CLUSTER_Z = BULKHEAD_Z - 0.09;

/**
 * Four aft flaps in an X, hinged on the barrel and folded in toward the
 * vertical, so from the side two rise above the stack and two hang below.
 * Two small forward flaps sit at the nose on the tile line, drooped a touch.
 * Plates are tiled on the windward face. The left side is the right mirrored.
 */
const HINGE = deg(40);
const FOLD = deg(62);
const FORE_DROOP = deg(12);
/** fore flaps hinge on the tile line, a little above the waterline */
const FORE_HINGE = deg(15);
type FlapShape = { root0: number; root1: number; tip0: number; tip1: number; span: number };
const AFT: FlapShape = { root0: -0.5, root1: -0.22, tip0: -0.47, tip1: -0.37, span: 0.115 };
const FORE: FlapShape = { root0: 0.19, root1: 0.37, tip0: 0.21, tip1: 0.29, span: 0.07 };
type Flap = { side: 1 | -1; kind: "up" | "low" | "fore" };
const FLAPS: Flap[] = [
  { side: 1, kind: "up" },
  { side: 1, kind: "low" },
  { side: -1, kind: "up" },
  { side: -1, kind: "low" },
  { side: 1, kind: "fore" },
  { side: -1, kind: "fore" },
];
const flapPos = (k: Flap["kind"]): [number, number, number] =>
  k === "fore" ? [R * Math.cos(FORE_HINGE) - 0.003, R * Math.sin(FORE_HINGE), 0] : [R * Math.cos(HINGE) - 0.002, (k === "low" ? -1 : 1) * R * Math.sin(HINGE), 0];
const flapRest = (k: Flap["kind"]) => (k === "fore" ? -FORE_DROOP : k === "low" ? -FOLD : FOLD);
/** upper aft flap tips (hull space), where the nav pins sit */
const TIP_R = new THREE.Vector3(
  R * Math.cos(HINGE) + AFT.span * Math.cos(FOLD),
  R * Math.sin(HINGE) + AFT.span * Math.sin(FOLD),
  (AFT.tip0 + AFT.tip1) / 2,
);
const TIP_L = TIP_R.clone().setX(-TIP_R.x);

/**
 * Cable raceway down the upper -X shoulder (the side the parked camera
 * sees), skirt to nose: a straight run on the barrel, then a short run
 * leaning in with the ogive.
 */
const RACEWAY_ANG = deg(130);
const RACEWAY_Z0 = -0.49;
const RACEWAY_Z1 = NOSE_BASE;
const RACEWAY_NOSE = 0.17;
/** Two catch pegs mid-body, on the shoulder opposite the raceway. */
const PEG_ANG = deg(50);
const PEG_Z = [0.04, -0.08];
/** Two header-tank blisters under the nose, either side of the keel. */
const BLISTER_ANG = [deg(-90 + 28), deg(-90 - 28)];
const BLISTER_Z = 0.43;

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

/** A flap plate: root on the hinge line, swept leading edge, round tip. */
function flapGeometry(f: FlapShape) {
  const s = new THREE.Shape();
  const r = f.tip1 + (f.tip1 - f.tip0) * 0.35;
  s.moveTo(0, f.root0);
  s.lineTo(0, f.root1);
  s.lineTo(f.span * 0.8, r);
  s.quadraticCurveTo(f.span, f.tip1, f.span, f.tip1 - (f.tip1 - f.tip0) * 0.3);
  s.lineTo(f.span, f.tip0);
  s.lineTo(0, f.root0);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.009, bevelEnabled: false, curveSegments: 4 });
  g.rotateX(Math.PI / 2); // shape y → hull z; thickness along -y
  g.translate(0, 0.0045, 0);
  return g;
}

/** Open bell along -Z: throat at z = 0, exit at z = -len. */
function bellGeometry(exit: number, len: number) {
  const g = new THREE.CylinderGeometry(exit, exit * 0.45, len, 18, 1, true);
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0, -len / 2);
  return g;
}

function steel(mode: number, base: string, gloss = 1) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uLightDir: { value: LIGHT_DIR },
      uFillDir: { value: FILL_DIR },
      uBase: { value: new THREE.Color(base) },
      uTile: { value: new THREE.Color("#2a2b30") },
      uRim: { value: new THREE.Color("#a9b8ff") },
      uBand: { value: new THREE.Color("#c9bcff") },
      uHeatCol: { value: ION },
      uMode: { value: mode },
      uHeat: { value: 0 },
      uGloss: { value: gloss },
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
    const flapAft = flapGeometry(AFT);
    const flapFore = flapGeometry(FORE);
    const raceway = new THREE.BoxGeometry(0.024, 0.013, RACEWAY_Z1 - RACEWAY_Z0);
    const racewayNose = new THREE.BoxGeometry(0.02, 0.011, RACEWAY_NOSE);
    const peg = new THREE.CylinderGeometry(0.0065, 0.0065, 0.026, 10);
    const blister = new THREE.SphereGeometry(1, 16, 10);
    const bellSmall = bellGeometry(0.021, 0.055);
    const bellBig = bellGeometry(0.033, 0.088);
    const cone = new THREE.ConeGeometry(0.055, 1, 14, 1, true);
    const hullMat = steel(1, "#737780");
    const plateSteel = steel(0, "#737780");
    const rackMat = steel(0, "#2f3137", 0.25);
    const tileMat = steel(0, "#2a2b30");
    const plateTile = steel(2, "#737780");
    const bellMat = steel(0, "#3c3e46");
    const plumeMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: ION }, uPower: { value: 0 } },
      vertexShader: spikeVert,
      fragmentShader: spikeFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    return {
      stack,
      flapAft,
      flapFore,
      raceway,
      racewayNose,
      peg,
      blister,
      bellSmall,
      bellBig,
      cone,
      hullMat,
      plateSteel,
      rackMat,
      tileMat,
      plateTile,
      bellMat,
      plumeMat,
    };
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

    // flaps trim a few degrees into the bank; the forward pair works against
    // the aft pair, and the mirror makes left and right opposite
    const trim = THREE.MathUtils.clamp(flight.bank, -0.7, 0.7) * 0.12;
    FLAPS.forEach((f, i) => {
      const fg = flaps.current[i];
      if (fg) fg.rotation.z = flapRest(f.kind) + (f.kind === "fore" ? -trim : trim);
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

    // two pin nav lights on the upper aft flap tips, and a glow at the cluster under thrust
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
              position={flapPos(f.kind)}
              rotation={[0, 0, flapRest(f.kind)]}
            >
              <mesh
                geometry={f.kind === "fore" ? parts.flapFore : parts.flapAft}
                material={f.kind === "up" ? parts.plateSteel : parts.plateTile}
              />
            </group>
          </group>
        ))}
        {/* raceway: barrel run, then a short run leaning in along the nose */}
        <group rotation={[0, 0, RACEWAY_ANG - Math.PI / 2]}>
          <mesh geometry={parts.raceway} material={parts.rackMat} position={[0, R + 0.005, (RACEWAY_Z0 + RACEWAY_Z1) / 2]} />
          <mesh
            geometry={parts.racewayNose}
            material={parts.rackMat}
            position={[0, 0.114, NOSE_BASE + RACEWAY_NOSE / 2 - 0.004]}
            rotation={[0.114, 0, 0]}
          />
        </group>
        {PEG_Z.map((z) => (
          <group key={z} rotation={[0, 0, PEG_ANG - Math.PI / 2]}>
            <mesh geometry={parts.peg} material={parts.bellMat} position={[0, R + 0.01, z]} />
          </group>
        ))}
        {BLISTER_ANG.map((a) => (
          <group key={a} rotation={[0, 0, a - Math.PI / 2]}>
            <mesh geometry={parts.blister} material={parts.tileMat} position={[0, 0.098, BLISTER_Z]} scale={[0.017, 0.012, 0.05]} />
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
