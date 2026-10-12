"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { hexToRGB } from "../color";
import { ringFrag, ringVert, worldFrag, worldVert } from "../shaders/world";
import {
  dockR,
  layout,
  nightPoint,
  outerAnchorList,
  projectAnchorList,
  ringPoint,
  type Anchor,
} from "./anchors";
import { DOCK_LIGHTS } from "./worlds";
import type { PointPool } from "./pointPool";

const CORE_LIGHT = new THREE.Vector3(0, 0, 0);
const LIGHT_COLOR = new THREE.Color("#ffe4c0");

function Body({
  anchor,
  segments,
  frozen,
}: {
  anchor: Anchor;
  segments: [number, number];
  frozen: boolean;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const d = anchor.def;

  const uniforms = useMemo(
    () => ({
      uLightPos: { value: CORE_LIGHT },
      uLightColor: { value: LIGHT_COLOR },
      uBase: { value: new THREE.Color(d.base) },
      uBase2: { value: new THREE.Color(d.base2) },
      uAccent: { value: new THREE.Color(anchor.accent) },
      uAtmoColor: { value: new THREE.Color(d.atmo) },
      uSeed: { value: (anchor.id.length * 13.7) % 19 },
      uTime: { value: 0 },
      uFeature: { value: d.feature },
      uCity: { value: d.city },
      uCloud: { value: d.cloud },
      uSpec: { value: d.spec },
      uAtmo: { value: d.atmoStrength },
      uBands: { value: d.bands },
      uAmbient: { value: 0.035 },
    }),
    [anchor, d],
  );

  useFrame((state, dt) => {
    if (frozen) return;
    if (mat.current) mat.current.uniforms.uTime.value = state.clock.elapsedTime;
    if (mesh.current) mesh.current.rotation.y += dt * d.spin;
  });

  return (
    <group position={anchor.position} scale={layout.worldScale}>
      <mesh ref={mesh} rotation={[d.tilt, 0, 0]} renderOrder={4}>
        <sphereGeometry args={[d.radius, segments[0], segments[1]]} />
        <shaderMaterial
          ref={mat}
          uniforms={uniforms}
          vertexShader={worldVert}
          fragmentShader={worldFrag}
        />
      </mesh>

      {d.ring && <PlanetRing anchor={anchor} />}
      {d.scaffold && <Scaffold radius={d.radius} accent={anchor.accent} />}
    </group>
  );
}

function PlanetRing({ anchor }: { anchor: Anchor }) {
  const r = anchor.def.ring!;
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(r.color) },
      uCenter: { value: anchor.position.clone() },
      // the mesh is inside a scaled group, so these world-space radii
      // have to be scaled to match what the fragment shader measures
      uInner: { value: r.inner * layout.worldScale },
      uOuter: { value: r.outer * layout.worldScale },
      uSeed: { value: (anchor.id.length * 7.3) % 11 },
      uOpacity: { value: r.opacity },
    }),
    [anchor, r],
  );

  const rot = useMemo(() => {
    const e = new THREE.Euler().setFromQuaternion(anchor.quat);
    return new THREE.Euler(e.x - Math.PI / 2, e.y, e.z);
  }, [anchor]);

  return (
    <mesh rotation={rot} renderOrder={5}>
      <ringGeometry args={[r.inner, r.outer, 128, 1]} />
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
  );
}

/** Half-built station: a frame, not a finished world. */
function Scaffold({ radius, accent }: { radius: number; accent: string }) {
  const bars = useMemo(() => {
    const out: { p: [number, number, number]; s: [number, number, number] }[] = [];
    const r = radius * 1.35;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      out.push({
        p: [Math.cos(a) * r, 0, Math.sin(a) * r],
        s: [0.008, radius * 2.1, 0.008],
      });
    }
    out.push({ p: [0, radius * 1.05, 0], s: [r * 2, 0.008, 0.008] });
    out.push({ p: [0, -radius * 1.05, 0], s: [0.008, 0.008, r * 2] });
    return out;
  }, [radius]);

  return (
    <group rotation={[0.3, 0.6, 0.15]} renderOrder={5}>
      {bars.map((b, i) => (
        <mesh key={i} position={b.p} scale={b.s}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color="#4d4658"
            metalness={0.3}
            roughness={0.65}
            emissive={accent}
            emissiveIntensity={0.04}
          />
        </mesh>
      ))}
    </group>
  );
}

/** The dock itself: a thin ring with lights that tick round it. */
function DockRing({
  anchor,
  pool,
  frozen,
  index,
}: {
  anchor: Anchor;
  pool: PointPool;
  frozen: boolean;
  index: number;
}) {
  const base = useMemo(
    () => pool.allocNamed(`dock:${anchor.id}`, DOCK_LIGHTS),
    [pool, anchor.id],
  );
  const beaconSlot = useMemo(
    () => (anchor.def.beacon ? pool.allocNamed(`beacon:${anchor.id}`, 1) : -1),
    [pool, anchor.id, anchor.def.beacon],
  );

  const rgb = useMemo(() => hexToRGB(anchor.accent), [anchor.accent]);
  const beaconRgb = useMemo(
    () => (anchor.def.beacon ? hexToRGB(anchor.def.beacon.color) : rgb),
    [anchor.def.beacon, rgb],
  );
  const p = useRef(new THREE.Vector3());

  const rot = useMemo(() => {
    const e = new THREE.Euler().setFromQuaternion(anchor.quat);
    return new THREE.Euler(e.x - Math.PI / 2, e.y, e.z);
  }, [anchor]);

  useFrame((state) => {
    if (base < 0) return;
    const t = frozen ? index * 1.7 : state.clock.elapsedTime;
    // a slow pointer running round the ring, not a chase-light strip
    const head = (t * 0.19 + index * 0.37) % 1;

    for (let i = 0; i < DOCK_LIGHTS; i++) {
      const f = i / DOCK_LIGHTS;
      let d = Math.abs(f - head);
      d = Math.min(d, 1 - d);
      const lit = 0.16 + 0.85 * Math.pow(Math.max(0, 1 - d * 6.5), 3);
      ringPoint(anchor, f * Math.PI * 2, p.current);
      pool.set(
        base + i,
        p.current.x,
        p.current.y,
        p.current.z,
        rgb[0],
        rgb[1],
        rgb[2],
        1.15,
        lit * 0.5,
      );
    }

    if (beaconSlot >= 0 && anchor.def.beacon) {
      nightPoint(anchor, 0.88, p.current);
      const pulse = 0.78 + 0.22 * Math.sin(t * 0.9 + index);
      pool.set(
        beaconSlot,
        p.current.x,
        p.current.y,
        p.current.z,
        beaconRgb[0],
        beaconRgb[1],
        beaconRgb[2],
        anchor.def.beacon.size,
        (frozen ? 0.85 : pulse) * 0.95,
      );
    }
  });

  return (
    <mesh position={anchor.position} rotation={rot} renderOrder={5}>
      <torusGeometry
        args={[dockR(anchor), 0.0042 * layout.worldScale, 5, 72]}
      />
      <meshStandardMaterial
        color="#262030"
        metalness={0.25}
        roughness={0.78}
        emissive={anchor.accent}
        emissiveIntensity={0.03}
      />
    </mesh>
  );
}

export default function Worlds({
  pool,
  frozen,
  segments,
  outerCount,
}: {
  pool: PointPool;
  frozen: boolean;
  segments: [number, number];
  outerCount: number;
}) {
  const visible = useMemo(
    () => [...projectAnchorList, ...outerAnchorList.slice(0, outerCount)],
    [outerCount],
  );

  return (
    <>
      {visible.map((a) => (
        <Body key={a.id} anchor={a} segments={segments} frozen={frozen} />
      ))}
      {projectAnchorList.map((a, i) => (
        <DockRing
          key={a.id}
          anchor={a}
          pool={pool}
          frozen={frozen}
          index={i}
        />
      ))}
    </>
  );
}
