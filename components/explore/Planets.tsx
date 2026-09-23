"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { hexToRGB } from "@/components/scene/color";
import {
  ringFrag,
  ringVert,
  worldFrag,
  worldVert,
} from "@/components/scene/shaders/world";
import type { PointPool } from "@/components/scene/traffic/pointPool";
import { LIGHT_POS, allBodies, ringRadii, worlds, type Body } from "./layout";

const LIGHT_COLOR = new THREE.Color("#ffe4c0");
const DOCK_LIGHTS = 16;
const TAU = Math.PI * 2;

/**
 * Same procedural world shader as the homepage — terminator, coastal night
 * lights, cloud deck, water glint, atmosphere limb — just seen from a few
 * units away instead of a few hundred.
 */
function World({
  b,
  segments,
  frozen,
}: {
  b: Body;
  segments: [number, number];
  frozen: boolean;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const d = b.def;

  const uniforms = useMemo(
    () => ({
      uLightPos: { value: LIGHT_POS },
      uLightColor: { value: LIGHT_COLOR },
      uBase: { value: new THREE.Color(d.base) },
      uBase2: { value: new THREE.Color(d.base2) },
      uAccent: { value: new THREE.Color(b.accent) },
      uAtmoColor: { value: new THREE.Color(d.atmo) },
      uSeed: { value: (b.id.length * 13.7) % 19 },
      uTime: { value: 0 },
      uFeature: { value: d.feature },
      uCity: { value: d.city },
      uCloud: { value: d.cloud },
      uSpec: { value: d.spec },
      uAtmo: { value: d.atmoStrength * 1.15 },
      uBands: { value: d.bands },
      uAmbient: { value: 0.05 },
      uCloseUp: { value: 1 },
    }),
    [b, d],
  );

  useFrame((state, dt) => {
    if (frozen) return;
    if (mat.current) mat.current.uniforms.uTime.value = state.clock.elapsedTime;
    if (mesh.current) mesh.current.rotation.y += dt * d.spin;
  });

  return (
    <group position={b.center}>
      <mesh ref={mesh} rotation={[d.tilt, 0, 0]}>
        <sphereGeometry args={[b.radius, segments[0], segments[1]]} />
        <shaderMaterial
          ref={mat}
          uniforms={uniforms}
          vertexShader={worldVert}
          fragmentShader={worldFrag}
        />
      </mesh>
      {d.scaffold && <Scaffold radius={b.radius} accent={b.accent} />}
    </group>
  );
}

function PlanetRing({ b }: { b: Body }) {
  const r = ringRadii(b)!;
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(r.color) },
      uCenter: { value: b.center.clone() },
      uInner: { value: r.inner },
      uOuter: { value: r.outer },
      uSeed: { value: (b.id.length * 7.3) % 11 },
      uOpacity: { value: r.opacity * 1.2 },
    }),
    [b, r],
  );

  return (
    <group position={b.center} quaternion={b.quat}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[r.inner, r.outer, 192, 1]} />
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={ringVert}
          fragmentShader={ringFrag}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

/** HoloTracker: a frame around a small world, not a finished one. */
function Scaffold({ radius, accent }: { radius: number; accent: string }) {
  const bars = useMemo(() => {
    const out: { p: [number, number, number]; s: [number, number, number] }[] = [];
    const r = radius * 1.4;
    const t = radius * 0.035;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      out.push({ p: [Math.cos(a) * r, 0, Math.sin(a) * r], s: [t, radius * 2.3, t] });
    }
    out.push({ p: [0, radius * 1.15, 0], s: [r * 2, t, t] });
    out.push({ p: [0, radius * 1.15, 0], s: [t, t, r * 2] });
    out.push({ p: [0, -radius * 1.15, 0], s: [r * 2, t, t] });
    return out;
  }, [radius]);

  return (
    <group rotation={[0.3, 0.6, 0.15]}>
      {bars.map((bar, i) => (
        <mesh key={i} position={bar.p} scale={bar.s}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color="#4d4658"
            metalness={0.35}
            roughness={0.6}
            emissive={accent}
            emissiveIntensity={0.05}
          />
        </mesh>
      ))}
    </group>
  );
}

/** The dock: a thin ring whose lights tick round it, plus any beacon. */
function Dock({
  b,
  pool,
  frozen,
  index,
}: {
  b: Body;
  pool: PointPool;
  frozen: boolean;
  index: number;
}) {
  const base = useMemo(() => pool.allocNamed(`dock:${b.id}`, DOCK_LIGHTS), [pool, b.id]);
  const beaconSlot = useMemo(
    () => (b.def.beacon ? pool.allocNamed(`beacon:${b.id}`, 1) : -1),
    [pool, b.id, b.def.beacon],
  );
  const rgb = useMemo(() => hexToRGB(b.accent), [b.accent]);
  const beaconRgb = useMemo(
    () => (b.def.beacon ? hexToRGB(b.def.beacon.color) : rgb),
    [b.def.beacon, rgb],
  );
  const p = useRef(new THREE.Vector3());

  // the night side faces away from the light
  const night = useMemo(
    () =>
      b.center
        .clone()
        .addScaledVector(b.center.clone().sub(LIGHT_POS).normalize(), b.radius * 1.03),
    [b],
  );

  useFrame((state) => {
    const t = frozen ? index * 1.7 : state.clock.elapsedTime;
    const head = (t * 0.17 + index * 0.37) % 1;

    for (let i = 0; i < DOCK_LIGHTS; i++) {
      const f = i / DOCK_LIGHTS;
      let dd = Math.abs(f - head);
      dd = Math.min(dd, 1 - dd);
      const lit = 0.18 + 0.85 * Math.pow(Math.max(0, 1 - dd * 6), 3);
      p.current
        .set(Math.cos(f * TAU), 0, Math.sin(f * TAU))
        .multiplyScalar(b.dockR)
        .applyQuaternion(b.quat)
        .add(b.center);
      pool.set(base + i, p.current.x, p.current.y, p.current.z, rgb[0], rgb[1], rgb[2], 1.1, lit * 0.55);
    }

    if (beaconSlot >= 0 && b.def.beacon) {
      const pulse = frozen ? 0.85 : 0.78 + 0.22 * Math.sin(t * 0.9 + index);
      pool.set(
        beaconSlot,
        night.x,
        night.y,
        night.z,
        beaconRgb[0],
        beaconRgb[1],
        beaconRgb[2],
        b.def.beacon.size * 1.3,
        pulse,
      );
    }
    pool.flush();
  });

  return (
    <group position={b.center} quaternion={b.quat}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[b.dockR, b.radius * 0.016, 6, 128]} />
        <meshStandardMaterial
          color="#2c2638"
          metalness={0.3}
          roughness={0.7}
          emissive={b.accent}
          emissiveIntensity={0.05}
        />
      </mesh>
    </group>
  );
}

export default function Planets({
  pool,
  frozen,
  segments,
}: {
  pool: PointPool;
  frozen: boolean;
  segments: [number, number];
}) {
  return (
    <>
      {allBodies.map((b) => (
        <World key={b.id} b={b} segments={segments} frozen={frozen} />
      ))}
      {allBodies
        .filter((b) => b.def.ring)
        .map((b) => (
          <PlanetRing key={`ring:${b.id}`} b={b} />
        ))}
      {worlds.map((b, i) => (
        <Dock key={`dock:${b.id}`} b={b} pool={pool} frozen={frozen} index={i} />
      ))}
    </>
  );
}
