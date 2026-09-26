"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { hexToRGB } from "@/components/scene/color";
import type { PointPool } from "@/components/scene/traffic/pointPool";
import { flight } from "./flight";
import { FILL_DIR, LIGHT_DIR, allBodies, around, lanes, worlds, type Body } from "./layout";
import { KIND } from "./looks";
import {
  atmoFrag,
  atmoVert,
  laneFrag,
  laneVert,
  planetFrag,
  planetVert,
  ringFrag,
  ringVert,
} from "./shaders";

const LIGHT_COLOR = new THREE.Color("#fff0de");
const FILL_COLOR = new THREE.Color("#6f7fd6");
const DOCK_LIGHTS = 24;
const TAU = Math.PI * 2;

function World({
  b,
  segments,
  frozen,
}: {
  b: Body;
  segments: [number, number];
  frozen: boolean;
}) {
  const spin = useRef<THREE.Group>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const L = b.look;
  const station = L.kind === KIND.station;

  const uniforms = useMemo(
    () => ({
      uLightDir: { value: LIGHT_DIR },
      uLightColor: { value: LIGHT_COLOR },
      uFillDir: { value: FILL_DIR },
      uFillColor: { value: FILL_COLOR },
      uA: { value: new THREE.Color(L.a) },
      uB: { value: new THREE.Color(L.b) },
      uC: { value: new THREE.Color(L.c) },
      uAtmo: { value: new THREE.Color(L.atmo) },
      uAtmoStrength: { value: L.atmoStrength },
      uLights: { value: new THREE.Color(L.lights) },
      uLightAmt: { value: L.lightAmount },
      uKind: { value: L.kind },
      uSeed: { value: (b.id.length * 13.7) % 19 },
      uTime: { value: 0 },
      uCloud: { value: L.cloud },
      uSpec: { value: L.spec },
      uMarker: { value: b.marker ?? new THREE.Vector3(0, -1, 0) },
      uMarkerSize: { value: b.marker ? L.marker!.size : 0 },
      uAccent: { value: new THREE.Color(b.accent) },
    }),
    [b, L],
  );

  const atmo = useMemo(
    () =>
      L.atmoStrength > 0
        ? {
            uCenter: { value: b.center },
            uRadius: { value: b.radius },
            uHeight: { value: b.radius * L.atmoHeight },
            uColor: { value: new THREE.Color(L.atmo) },
            uStrength: { value: L.atmoStrength * 0.9 },
            uLightDir: { value: LIGHT_DIR },
          }
        : null,
    [b, L],
  );

  useFrame((state, dt) => {
    if (frozen) return;
    if (mat.current) mat.current.uniforms.uTime.value = state.clock.elapsedTime;
    if (spin.current && L.spin) spin.current.rotation.y += dt * L.spin;
  });

  return (
    <group position={b.center} quaternion={b.quat}>
      <group ref={spin}>
        <mesh>
          <sphereGeometry args={[b.radius, segments[0], segments[1]]} />
          <shaderMaterial
            ref={mat}
            uniforms={uniforms}
            vertexShader={planetVert}
            fragmentShader={planetFrag}
            side={station ? THREE.DoubleSide : THREE.FrontSide}
          />
        </mesh>
        {station && <StationCore radius={b.radius} accent={b.accent} />}
      </group>
      {atmo && (
        <mesh>
          <sphereGeometry args={[b.radius * (1 + L.atmoHeight * 7), 48, 32]} />
          <shaderMaterial
            uniforms={atmo}
            vertexShader={atmoVert}
            fragmentShader={atmoFrag}
            side={THREE.BackSide}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  );
}

/** What you see through the gaps in HoloTracker's plating. */
function StationCore({ radius, accent }: { radius: number; accent: string }) {
  return (
    <>
      <mesh>
        <sphereGeometry args={[radius * 0.3, 24, 16]} />
        <meshBasicMaterial color={new THREE.Color(accent).multiplyScalar(0.7)} toneMapped={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius * 0.62, radius * 0.03, 6, 48]} />
        <meshBasicMaterial color="#2c2536" />
      </mesh>
    </>
  );
}

function PlanetRing({ b }: { b: Body }) {
  const r = b.look.ring!;
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(r.color) },
      uCenter: { value: b.center },
      uRadius: { value: b.radius },
      uInner: { value: r.inner * b.radius },
      uOuter: { value: r.outer * b.radius },
      uSeed: { value: (b.id.length * 7.3) % 11 },
      uOpacity: { value: r.opacity },
      uRinglet: { value: r.ringlet ? 1 : 0 },
      uColor2: { value: new THREE.Color(r.color2 ?? r.color) },
      uRipple: { value: r.ripple ? 1 : 0 },
      uNormal: { value: b.pole },
      uLightDir: { value: LIGHT_DIR },
    }),
    [b, r],
  );
  const outer = r.ringlet ? r.outer + (r.outer - r.inner) * 0.36 : r.outer;

  return (
    <group position={b.center} quaternion={b.quat}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[r.inner * b.radius, outer * b.radius, 256, 1]} />
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={ringVert}
          fragmentShader={ringFrag}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/**
 * The dock: a necklace of lights with a travelling pulse, strung on a
 * hairline. HoloTracker's is half built — a metal arc, lights only where
 * the arc is finished.
 */
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
  const station = b.look.kind === KIND.station;
  const arc = station ? 0.62 : 1;
  const base = useMemo(() => pool.allocNamed(`dock:${b.id}`, DOCK_LIGHTS), [pool, b.id]);
  const markerSlot = useMemo(
    () => (b.marker ? pool.allocNamed(`marker:${b.id}`, 1) : -1),
    [pool, b.id, b.marker],
  );
  const rgb = useMemo(() => hexToRGB(b.accent), [b.accent]);
  const markerRgb = useMemo(
    () => (b.look.marker ? hexToRGB(b.look.marker.glow) : rgb),
    [b.look.marker, rgb],
  );
  const p = useRef(new THREE.Vector3());
  const markerAt = useMemo(
    () => (b.marker ? b.center.clone().addScaledVector(b.marker, b.radius * 1.012) : null),
    [b],
  );

  const line = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const n = 160;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU * arc;
      pts.push(new THREE.Vector3(Math.cos(a) * b.dockR, 0, Math.sin(a) * b.dockR));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [b.dockR, arc]);

  // sparse ticks on the ring you have captured
  const ticks = useMemo(() => {
    const pts: number[] = [];
    const n = 12;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU * arc;
      const c = Math.cos(a);
      const s = Math.sin(a);
      pts.push(c * b.dockR * 0.965, 0, s * b.dockR * 0.965, c * b.dockR * 1.035, 0, s * b.dockR * 1.035);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [b.dockR, arc]);
  const tickMat = useRef<THREE.LineBasicMaterial>(null);
  const held = useRef(0);

  useFrame((state, dt) => {
    const t = frozen ? index * 1.7 : state.clock.elapsedTime;
    const head = (t * 0.11 + index * 0.37) % 1;
    const captured = flight.mode === "orbit" && flight.body === b ? 1 : 0;
    held.current += (captured - held.current) * (1 - Math.exp(-(frozen ? 60 : 2.5) * Math.min(dt, 0.1)));
    if (tickMat.current) tickMat.current.opacity = held.current * 0.55;

    for (let i = 0; i < DOCK_LIGHTS; i++) {
      const f = i / DOCK_LIGHTS;
      if (f > arc) {
        pool.hide(base + i);
        continue;
      }
      let dd = Math.abs(f - head);
      dd = Math.min(dd, 1 - dd);
      const lit = 0.16 + 0.84 * Math.pow(Math.max(0, 1 - dd * 7), 3);
      // the two ends of an unfinished arc blink like work lights
      const endBlink =
        station && (i === 0 || f + 1 / DOCK_LIGHTS > arc)
          ? 0.5 + 0.5 * Math.sin(t * 4 + i)
          : 1;
      p.current
        .set(Math.cos(f * TAU), 0, Math.sin(f * TAU))
        .multiplyScalar(b.dockR)
        .applyQuaternion(b.quat)
        .add(b.center);
      pool.set(base + i, p.current.x, p.current.y, p.current.z, rgb[0], rgb[1], rgb[2], 1.1, lit * (0.7 + 0.35 * held.current) * endBlink);
    }

    if (markerSlot >= 0 && markerAt && b.look.marker) {
      const pulse = frozen ? 0.85 : 0.8 + 0.2 * Math.sin(t * 0.9 + index);
      pool.set(
        markerSlot,
        markerAt.x,
        markerAt.y,
        markerAt.z,
        markerRgb[0],
        markerRgb[1],
        markerRgb[2],
        1.6 * b.look.marker.size,
        pulse * 0.8,
      );
    }
  });

  return (
    <group position={b.center} quaternion={b.quat}>
      {!station && (
        <lineLoop geometry={line}>
          <lineBasicMaterial
            color={b.accent}
            transparent
            opacity={0.13}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </lineLoop>
      )}
      <lineSegments geometry={ticks}>
        <lineBasicMaterial
          ref={tickMat}
          color={b.accent}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
      {station && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[b.dockR, b.radius * 0.022, 6, 96, TAU * arc]} />
          <meshStandardMaterial color="#3a3545" metalness={0.6} roughness={0.45} />
        </mesh>
      )}
    </group>
  );
}

const LANE_COLOR = new THREE.Color("#cbb6ff");
const LANE_SEGMENTS = 512;

/** One world's lane round the hub, drawn as a hairline. */
function Lane({ b, frozen }: { b: Body; frozen: boolean }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const geometry = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < LANE_SEGMENTS; i++) {
      pts.push(around(LIGHT_DIR, (i / LANE_SEGMENTS) * TAU).multiplyScalar(b.lane));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [b.lane]);
  const uniforms = useMemo(
    () => ({
      uColor: { value: LANE_COLOR },
      uAccent: { value: new THREE.Color(b.accent) },
      uWorld: { value: b.center },
      uGap: { value: b.orbitR },
      uBase: { value: b.ring === "inner" ? 0.13 : 0.1 },
      uHi: { value: 0 },
      uPlaneN: { value: LIGHT_DIR },
    }),
    [b],
  );

  useFrame((_, dt) => {
    if (!mat.current) return;
    const on = (flight.mode === "orbit" && flight.body === b) || flight.target === b ? 1 : 0;
    const u = mat.current.uniforms.uHi;
    u.value += (on - u.value) * (1 - Math.exp(-(frozen ? 60 : 2.2) * Math.min(dt, 0.1)));
  });

  return (
    <lineLoop geometry={geometry}>
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        vertexShader={laneVert}
        fragmentShader={laneFrag}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </lineLoop>
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
        .filter((b) => b.look.ring)
        .map((b) => (
          <PlanetRing key={`ring:${b.id}`} b={b} />
        ))}
      {lanes.map((b) => (
        <Lane key={`lane:${b.id}`} b={b} frozen={frozen} />
      ))}
      {worlds.map((b, i) => (
        <Dock key={`dock:${b.id}`} b={b} pool={pool} frozen={frozen} index={i} />
      ))}
    </>
  );
}
