"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { anchorById, hub, ringPoint, ringTangent, type Anchor } from "./anchors";
import { makeRoute, pickDestination, type Route } from "./routes";
import type { PointPool } from "./pointPool";
import { raw } from "@/lib/store";

/** courier · tug · liner · shuttle */
export type Hull = 0 | 1 | 2 | 3;
export const SHUTTLE: Hull = 3;

const HULL_LEN = [0.1, 0.085, 0.135, 0.095];
const HULL_MIX: Hull[] = [0, 0, 3, 1, 0, 2, 3, 0, 1, 0, 3, 0, 1, 0, 2, 3];

/** ion drives run cool, chemical burns run warm — no rainbow exhaust */
const ION: [number, number, number] = [0.6, 0.78, 1.0];
const CHEM: [number, number, number] = [1.0, 0.63, 0.34];
const NAV_WARM: [number, number, number] = [1.0, 0.7, 0.42];
const NAV_ICE: [number, number, number] = [0.72, 0.86, 1.0];

export type Ship = {
  i: number;
  hull: Hull;
  route: Route;
  t: number;
  speed: number;
  docked: Anchor | null;
  dwell: number;
  trailBase: number;
  navBase: number;
  navPhase: number;
  trailRgb: [number, number, number];
  len: number;
};

/**
 * Built by the orchestrator, not by this component: the crew layer reads the
 * same ship objects to know which shuttles are parked and where.
 */
export function buildShips(
  pool: PointPool,
  count: number,
  trail: number,
  allowOuter: boolean,
  frozen: boolean,
  brisk = false,
): Ship[] {
  const out: Ship[] = [];
  for (let i = 0; i < count; i++) {
    const hull = HULL_MIX[i % HULL_MIX.length];
    const from = i % 3 === 0 ? hub : pickDestination(hub, false);
    const to = pickDestination(from, allowOuter);
    const route = makeRoute(from, to === from ? hub : to);
    out.push({
      i,
      hull,
      route,
      // spread them along their routes so nothing launches in formation
      t: frozen ? 1 : Math.random(),
      speed:
        ((hull === 2 ? 1.05 : 1.35) + Math.random() * 0.75) * (brisk ? 1.35 : 1),
      docked: frozen ? route.to : null,
      dwell: frozen ? Infinity : 2 + Math.random() * 6,
      trailBase: pool.allocNamed(`trail:${i}`, trail),
      navBase: pool.allocNamed(`nav:${i}`, 2),
      navPhase: Math.random() * 6.28,
      trailRgb: hull === 0 || hull === 2 ? ION : CHEM,
      len: HULL_LEN[hull],
    });
  }
  return out;
}

type Props = {
  pool: PointPool;
  frozen: boolean;
  ships: Ship[];
  meshes: boolean;
  trail: number;
  allowOuter: boolean;
  /** floor on a hull's on-screen length, in CSS pixels */
  minPx: number;
  /** multiplies engine and nav-light point sizes */
  pointScale: number;
};

export default function Ships({
  pool,
  frozen,
  ships,
  meshes,
  trail,
  allowOuter,
  minPx,
  pointScale,
}: Props) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);

  const hullCounts = useMemo(() => {
    const c = [0, 0, 0, 0];
    for (const s of ships) c[s.hull]++;
    return c;
  }, [ships]);

  const geos = useMemo(() => {
    const courier = new THREE.ConeGeometry(0.17, 1, 5);
    courier.rotateX(Math.PI / 2);
    const tug = new THREE.BoxGeometry(0.42, 0.34, 1);
    const liner = new THREE.CapsuleGeometry(0.13, 0.78, 3, 8);
    liner.rotateX(Math.PI / 2);
    const shuttle = new THREE.CylinderGeometry(0.08, 0.3, 1, 5);
    shuttle.rotateX(Math.PI / 2);
    return [courier, tug, liner, shuttle];
    // geometries are disposed with the scene when the canvas unmounts
  }, []);

  const meshRefs = [
    useRef<THREE.InstancedMesh>(null),
    useRef<THREE.InstancedMesh>(null),
    useRef<THREE.InstancedMesh>(null),
    useRef<THREE.InstancedMesh>(null),
  ];

  const pos = useRef(new THREE.Vector3());
  const tan = useRef(new THREE.Vector3());
  const tmp = useRef(new THREE.Vector3());
  const up = useRef(new THREE.Vector3(0, 1, 0));
  const mat4 = useRef(new THREE.Matrix4());
  const quat = useRef(new THREE.Quaternion());
  const scl = useRef(new THREE.Vector3());
  const lastActive = useRef<string | null>(null);

  /**
   * Ships live in the far background; they must never vanish or loom. The
   * floor is what makes a courier legible on a phone, where the camera sits
   * three times further out than it does on a desktop.
   */
  const clampedScale = (distance: number, len: number) => {
    const k = size.height / (2 * Math.tan((camera.fov * Math.PI) / 360));
    const minWorld = (minPx * distance) / k;
    const maxWorld = (26 * distance) / k;
    return Math.min(maxWorld, Math.max(minWorld, len));
  };

  useFrame((state, dt) => {
    const d = Math.min(dt, 1 / 20);
    const idx = [0, 0, 0, 0];

    // a panel opening sends one courier that way — a nudge, not a cutscene
    if (!frozen && raw.active !== lastActive.current) {
      lastActive.current = raw.active;
      const target = raw.active ? anchorById(raw.active) : null;
      if (target) {
        const courier = ships.find(
          (s) => s.hull === 0 && s.docked && s.docked.id !== target.id,
        );
        if (courier && courier.docked) {
          courier.route = makeRoute(courier.docked, target);
          courier.t = 0;
          courier.docked = null;
          courier.dwell = 0;
        }
      }
    }

    for (const s of ships) {
      const r = s.route;

      if (!frozen) {
        if (s.docked) {
          s.dwell -= d;
          if (s.dwell <= 0) {
            const to = pickDestination(s.docked, allowOuter);
            s.route = makeRoute(s.docked, to.id === s.docked.id ? hub : to);
            s.t = 0;
            s.docked = null;
          }
        } else {
          // ease away from the dock, ease into the next one
          const ramp =
            Math.min(1, s.t / 0.06) * Math.min(1, (1 - s.t) / 0.09 + 0.12);
          s.t += (s.speed * d * Math.max(0.12, ramp)) / Math.max(0.5, r.length);
          if (s.t >= 1) {
            s.t = 1;
            s.docked = r.to;
            s.dwell = 2 + Math.random() * 6;
          }
        }
      }

      // ---- placement ----
      if (s.docked) {
        ringPoint(s.docked, s.route.angleTo, pos.current);
        ringTangent(s.docked, s.route.angleTo, tan.current);
      } else {
        r.curve.getPointAt(Math.min(0.9999, s.t), pos.current);
        r.curve.getTangentAt(Math.min(0.9999, s.t), tan.current);
      }

      const dist = pos.current.distanceTo(camera.position);

      if (meshes) {
        tmp.current.copy(pos.current).add(tan.current);
        mat4.current.lookAt(pos.current, tmp.current, up.current);
        quat.current.setFromRotationMatrix(mat4.current);
        const world = clampedScale(dist, s.len);
        scl.current.set(world, world, world);
        mat4.current.compose(pos.current, quat.current, scl.current);
        const mesh = meshRefs[s.hull].current;
        if (mesh) mesh.setMatrixAt(idx[s.hull]++, mat4.current);
      }

      // ---- nav lights ----
      if (s.navBase >= 0) {
        const blink =
          0.5 +
          0.5 * Math.sin(state.clock.elapsedTime * 2.6 + s.navPhase) ** 12;
        const steady = frozen ? 0.6 : 0.3 + blink * 0.8;
        const half = s.len * 0.5;
        tmp.current.copy(pos.current).addScaledVector(tan.current, half);
        pool.set(
          s.navBase,
          tmp.current.x,
          tmp.current.y,
          tmp.current.z,
          NAV_ICE[0],
          NAV_ICE[1],
          NAV_ICE[2],
          (meshes ? 1.5 : 2.4) * pointScale,
          steady * (meshes ? 0.85 : 1.0),
        );
        tmp.current.copy(pos.current).addScaledVector(tan.current, -half);
        pool.set(
          s.navBase + 1,
          tmp.current.x,
          tmp.current.y,
          tmp.current.z,
          NAV_WARM[0],
          NAV_WARM[1],
          NAV_WARM[2],
          (meshes ? 1.25 : 1.9) * pointScale,
          steady * (meshes ? 0.7 : 0.85),
        );
      }

      // ---- exhaust ----
      if (s.trailBase >= 0) {
        if (s.docked || frozen) {
          pool.hideRange(s.trailBase, trail);
        } else {
          // sampled back along the path, so the streak curves with the route
          const step = 0.24 / Math.max(0.5, r.length);
          for (let k = 0; k < trail; k++) {
            const tk = s.t - step * (k + 1);
            if (tk <= 0.002) {
              pool.hide(s.trailBase + k);
              continue;
            }
            r.curve.getPointAt(tk, tmp.current);
            const age = 1 - k / trail;
            pool.set(
              s.trailBase + k,
              tmp.current.x,
              tmp.current.y,
              tmp.current.z,
              s.trailRgb[0],
              s.trailRgb[1],
              s.trailRgb[2],
              (0.55 + age * 1.9) * pointScale,
              age * age * 0.8,
            );
          }
        }
      }
    }

    if (meshes) {
      for (let h = 0; h < 4; h++) {
        const mesh = meshRefs[h].current;
        if (mesh) {
          mesh.count = idx[h];
          mesh.instanceMatrix.needsUpdate = true;
        }
      }
    }
    pool.flush();
  });

  if (!meshes) return null;

  return (
    <>
      {[0, 1, 2, 3].map((h) =>
        hullCounts[h] > 0 ? (
          <instancedMesh
            key={h}
            ref={meshRefs[h]}
            args={[geos[h], undefined, hullCounts[h]]}
            frustumCulled={false}
            renderOrder={7}
          >
            <meshStandardMaterial
              color={h === 2 ? "#5c5568" : "#4e4859"}
              metalness={0.3}
              roughness={0.5}
              emissive="#18141f"
              emissiveIntensity={0.4}
            />
          </instancedMesh>
        ) : null,
      )}
    </>
  );
}
