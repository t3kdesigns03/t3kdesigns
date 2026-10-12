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
 * Hull space: +Z is the nose, +Y is up (away from the belly tiles). A colony
 * starship: the steel stack rides up front as the command section, then a
 * truss spine carries a spinning habitat ring, two clusters of pods and the
 * engine block. About 2.2 long and 0.55 across the ring; SCALE sets its size
 * on screen. If it ever reads as a tower next to a world, shrink SCALE — nothing else.
 */
const SCALE = 0.7;
/** the stack sits this far forward of the hull origin */
const STACK_Z = 0.32;
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
/**
 * Aft of the stack: spine, habitat ring, pods, engine block. Every piece is
 * a simple primitive with a clear silhouette — the ring and the pods are
 * what still read when the craft is a few pixels long.
 */
const SPINE_Z0 = STACK_Z + BULKHEAD_Z;
const ENGINE_FRONT = -0.95;
const ENGINE_Z = -1.07;
const SPINE_R = 0.034;
/** three longitudinal truss rails round the spine */
const RAIL_R = 0.058;
const RAIL_ANG = [90, 210, 330].map(deg);
const RING_Z = -0.42;
const RING_R = 0.25;
const RING_TUBE = 0.022;
const COLLAR_R = 0.052;
const SPOKES = [0, 120, 240].map(deg);
/** lit windows round the ring: they turn with it */
const WINDOWS = 12;
/** rad/s; a slow, readable spin */
const RING_SPIN = 0.45;
const POD_Z = [-0.6, -0.79];
const POD_ANG = [45, 135, 225, 315].map(deg);
const POD_AT = 0.074;
const POD_R = 0.034;
const POD_LEN = 0.11;
/** white anti-collision strobe on the engine block's spine */
const STROBE = new THREE.Vector3(0, 0.135, (ENGINE_FRONT + ENGINE_Z) / 2);
const CLUSTER_Z = ENGINE_Z - 0.09;
/** ion trail: world-space points dropped behind the cluster, fading out */
const TRAIL = 48;
const TRAIL_LIFE = 1.5;
const TRAIL_SPACING = TRAIL_LIFE / TRAIL;

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
  (AFT.tip0 + AFT.tip1) / 2 + STACK_Z,
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
  const lightBase = useMemo(() => pool.allocNamed("craft:lights", 1 + WINDOWS), [pool]);
  const trailBase = useMemo(() => pool.allocNamed("craft:trail", TRAIL), [pool]);
  const w = useRef(new THREE.Vector3());
  const ring = useRef<THREE.Group>(null);
  /** the ion streak, in world space: one additive line through the trail points */
  const trailLine = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array((TRAIL + 1) * 3), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array((TRAIL + 1) * 3), 3).setUsage(THREE.DynamicDrawUsage));
    g.setDrawRange(0, 0);
    const m = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const l = new THREE.Line(g, m);
    l.frustumCulled = false;
    return l;
  }, []);
  useEffect(
    () => () => {
      trailLine.geometry.dispose();
      (trailLine.material as THREE.Material).dispose();
    },
    [trailLine],
  );
  const spin = useRef(0);
  const trail = useRef({
    pos: new Float32Array(TRAIL * 3),
    age: new Float32Array(TRAIL).fill(TRAIL_LIFE),
    heat: new Float32Array(TRAIL),
    head: 0,
    acc: 0,
    last: new THREE.Vector3(),
    primed: false,
  });

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
    // colony section: spine, rails, ring, spokes, pods, engine block
    const spineLen = SPINE_Z0 - ENGINE_FRONT;
    const spine = new THREE.CylinderGeometry(SPINE_R, SPINE_R, spineLen, 14);
    spine.rotateX(Math.PI / 2);
    const rail = new THREE.BoxGeometry(0.012, 0.012, spineLen);
    const ring = new THREE.TorusGeometry(RING_R, RING_TUBE, 12, 72);
    const collar = new THREE.CylinderGeometry(COLLAR_R, COLLAR_R, 0.07, 20);
    collar.rotateX(Math.PI / 2);
    const spoke = new THREE.CylinderGeometry(0.008, 0.008, RING_R - COLLAR_R, 6);
    spoke.translate(0, COLLAR_R + (RING_R - COLLAR_R) / 2, 0);
    const pod = new THREE.CapsuleGeometry(POD_R, POD_LEN, 4, 12);
    pod.rotateX(Math.PI / 2);
    const engine = new THREE.CylinderGeometry(0.085, 0.125, ENGINE_FRONT - ENGINE_Z, 24);
    engine.rotateX(Math.PI / 2);
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
      spine,
      rail,
      ring,
      collar,
      spoke,
      pod,
      engine,
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
      m.position.set(b.x, b.y, ENGINE_Z - b.len - len / 2);
    });
    parts.plumeMat.uniforms.uPower.value = 0.4 + 0.9 * th;
    parts.bellMat.uniforms.uHeat.value = th;

    // two pin nav lights on the upper aft flap tips, and a glow at the cluster:
    // a faint flicker parked, a hot one under thrust
    const blink = reduced ? 0.8 : 0.55 + 0.45 * Math.pow(Math.max(0, Math.sin(t * 2.6)), 12);
    let p = at(TIP_L);
    pool.set(navBase, p.x, p.y, p.z, WARM[0], WARM[1], WARM[2], 0.55, blink * 0.9);
    p = at(TIP_R);
    pool.set(navBase + 1, p.x, p.y, p.z, ICE[0], ICE[1], ICE[2], 0.55, blink * 0.9);
    p = w.current.set(0, 0, CLUSTER_Z).multiplyScalar(SCALE).applyQuaternion(flight.quat).add(flight.pos);
    const idle = reduced ? 0.12 : 0.1 + 0.05 * Math.sin(t * 9.0) * Math.sin(t * 3.7);
    pool.set(navBase + 2, p.x, p.y, p.z, ION.r, ION.g, ION.b, 0.6 + th * 1.0, on ? (0.3 + th * 0.6) * flicker : idle);

    // habitat ring turns; its windows turn with it
    if (!reduced) spin.current = (spin.current + RING_SPIN * Math.min(dt, 0.1)) % (Math.PI * 2);
    if (ring.current) ring.current.rotation.z = spin.current;
    for (let i = 0; i < WINDOWS; i++) {
      const a = spin.current + (i / WINDOWS) * Math.PI * 2;
      p = at(w.current.set(Math.cos(a) * (RING_R + RING_TUBE), Math.sin(a) * (RING_R + RING_TUBE), RING_Z));
      const glow = i % 3 === 0 ? 0.8 : 0.5;
      pool.set(lightBase + 1 + i, p.x, p.y, p.z, WARM[0], WARM[1] * 0.95, WARM[2] * 0.8, 0.8, glow);
    }
    // anti-collision strobe: a quick double flash every two seconds
    const phase = t % 2;
    const strobe = reduced ? 0.4 : phase < 0.06 || (phase > 0.18 && phase < 0.24) ? 1 : 0;
    if (strobe > 0) {
      p = at(STROBE);
      pool.set(lightBase, p.x, p.y, p.z, 1, 1, 1, 0.5, strobe);
    } else {
      pool.hide(lightBase);
    }

    // ion trail: drop points at the cluster while burning, let them fade where they fell
    const tr = trail.current;
    const cluster = w.current.set(0, 0, CLUSTER_Z).multiplyScalar(SCALE).applyQuaternion(flight.quat).add(flight.pos);
    if (!tr.primed) {
      tr.last.copy(cluster);
      tr.primed = true;
    }
    const step = Math.min(dt, 0.1);
    if (on && !reduced) {
      tr.acc += step;
      const n = Math.min(4, Math.floor(tr.acc / TRAIL_SPACING));
      for (let j = 1; j <= n; j++) {
        const k = tr.head;
        const s = j / n;
        tr.pos[k * 3] = tr.last.x + (cluster.x - tr.last.x) * s;
        tr.pos[k * 3 + 1] = tr.last.y + (cluster.y - tr.last.y) * s;
        tr.pos[k * 3 + 2] = tr.last.z + (cluster.z - tr.last.z) * s;
        tr.age[k] = (1 - s) * step;
        tr.heat[k] = th;
        tr.head = (k + 1) % TRAIL;
      }
      tr.acc -= n * TRAIL_SPACING;
    } else {
      tr.acc = 0;
    }
    tr.last.copy(cluster);
    tr.acc = Math.min(tr.acc, TRAIL_SPACING * 4);
    // the streak: a fading line from the cluster back through the trail, newest first
    const lineGeo = trailLine.geometry;
    const lp = lineGeo.getAttribute("position") as THREE.BufferAttribute;
    const lc = lineGeo.getAttribute("color") as THREE.BufferAttribute;
    let count = 0;
    if (!reduced && (on || tr.age[(tr.head + TRAIL - 1) % TRAIL] < TRAIL_LIFE)) {
      lp.setXYZ(0, cluster.x, cluster.y, cluster.z);
      lc.setXYZ(0, ION.r * th, ION.g * th, ION.b * th);
      count = 1;
    }
    for (let n = 1; n <= TRAIL; n++) {
      const i = (tr.head - n + TRAIL) % TRAIL;
      tr.age[i] += step;
      const life = 1 - tr.age[i] / TRAIL_LIFE;
      if (reduced || life <= 0) {
        pool.hide(trailBase + i);
        continue;
      }
      const glow = tr.heat[i] * life;
      // soft ion puffs on every third point, swelling as they fade
      if (i % 3 === 0) {
        pool.set(trailBase + i, tr.pos[i * 3], tr.pos[i * 3 + 1], tr.pos[i * 3 + 2], ION.r, ION.g, ION.b, 1.6 + 1.6 * (1 - life), glow * 0.6);
      } else {
        pool.hide(trailBase + i);
      }
      if (count > 0) {
        lp.setXYZ(count, tr.pos[i * 3], tr.pos[i * 3 + 1], tr.pos[i * 3 + 2]);
        const k = glow * glow;
        lc.setXYZ(count, ION.r * k, ION.g * k, ION.b * k);
        count++;
      }
    }
    lineGeo.setDrawRange(0, count > 1 ? count : 0);
    lp.needsUpdate = true;
    lc.needsUpdate = true;
  });

  return (
    <>
      <primitive object={trailLine} />
      <group ref={group}>
        <group scale={SCALE}>
          {/* command section: the original steel stack, carried forward */}
          <group position={[0, 0, STACK_Z]}>
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
          </group>
          {/* spine and its three truss rails */}
          <mesh geometry={parts.spine} material={parts.rackMat} position={[0, 0, (SPINE_Z0 + ENGINE_FRONT) / 2]} />
          {RAIL_ANG.map((a) => (
            <mesh
              key={a}
              geometry={parts.rail}
              material={parts.bellMat}
              position={[Math.cos(a) * RAIL_R, Math.sin(a) * RAIL_R, (SPINE_Z0 + ENGINE_FRONT) / 2]}
              rotation={[0, 0, a]}
            />
          ))}
          {/* habitat ring on three spokes; it turns about the spine */}
          <group ref={ring} position={[0, 0, RING_Z]}>
            <mesh geometry={parts.ring} material={parts.plateSteel} />
            <mesh geometry={parts.collar} material={parts.bellMat} />
            {SPOKES.map((a) => (
              <mesh key={a} geometry={parts.spoke} material={parts.rackMat} rotation={[0, 0, a]} />
            ))}
          </group>
          {/* two clusters of cargo / habitat pods, steel and tile alternating */}
          {POD_Z.flatMap((z, zi) =>
            POD_ANG.map((a, ai) => (
              <mesh
                key={`${zi}:${ai}`}
                geometry={parts.pod}
                material={(ai + zi) % 2 ? parts.tileMat : parts.plateSteel}
                position={[Math.cos(a) * POD_AT, Math.sin(a) * POD_AT, z]}
              />
            )),
          )}
          <mesh geometry={parts.engine} material={parts.plateSteel} position={[0, 0, (ENGINE_FRONT + ENGINE_Z) / 2]} />
          {BELLS.map((b, i) => (
            <mesh
              key={i}
              geometry={b.exit > 0.03 ? parts.bellBig : parts.bellSmall}
              material={parts.bellMat}
              position={[b.x, b.y, ENGINE_Z]}
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
    </>
  );
}
