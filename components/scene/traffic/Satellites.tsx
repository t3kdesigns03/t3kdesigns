"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { hexToRGB, srand } from "../color";
import { projectAnchorList, type Anchor } from "./anchors";
import type { PointPool } from "./pointPool";

type Sat = {
  anchor: Anchor;
  radius: number;
  /** seconds per revolution — deliberately coprime-ish so they never sync */
  period: number;
  phase: number;
  quat: THREE.Quaternion;
  scale: number;
  shape: 0 | 1;
  rgb: [number, number, number];
  slot: number;
};

/**
 * Relay stations and ice-catchers. Weathered, almost unlit, and on periods
 * that do not divide into each other — a ring of satellites that all line
 * up every few seconds reads as a clock, not as orbit.
 */
function build(nodes: number, per: number, pool: PointPool): Sat[] {
  const out: Sat[] = [];
  const list = projectAnchorList.slice(0, Math.max(0, nodes));

  list.forEach((anchor, ai) => {
    const count = 1 + Math.floor(srand(ai * 3.7) * per);
    for (let i = 0; i < count; i++) {
      const s = ai * 5 + i;
      const e = new THREE.Euler(
        (srand(s * 1.9) - 0.5) * 1.6,
        srand(s * 4.1) * Math.PI * 2,
        (srand(s * 7.3) - 0.5) * 1.2,
      );
      out.push({
        anchor,
        radius: anchor.dockR * (1.35 + srand(s * 2.2) * 0.95),
        period: 17 + srand(s * 6.1) * 31,
        phase: srand(s * 8.9) * Math.PI * 2,
        quat: new THREE.Quaternion().setFromEuler(e),
        scale: 0.016 + srand(s * 11.7) * 0.016,
        shape: srand(s * 13.3) > 0.5 ? 1 : 0,
        rgb: hexToRGB(anchor.accent),
        slot: pool.allocNamed(`sat:${anchor.id}:${i}`, 1),
      });
    }
  });

  return out;
}

export default function Satellites({
  pool,
  frozen,
  nodes,
  per,
  meshes,
}: {
  pool: PointPool;
  frozen: boolean;
  nodes: number;
  per: number;
  meshes: boolean;
}) {
  const sats = useMemo(() => build(nodes, per, pool), [nodes, per, pool]);

  const octa = useRef<THREE.InstancedMesh>(null);
  const panel = useRef<THREE.InstancedMesh>(null);
  const m = useRef(new THREE.Matrix4());
  const q = useRef(new THREE.Quaternion());
  const p = useRef(new THREE.Vector3());
  const sc = useRef(new THREE.Vector3());

  const octaCount = sats.filter((s) => s.shape === 0).length;
  const panelCount = sats.length - octaCount;

  useFrame((state) => {
    const t = frozen ? 8.4 : state.clock.elapsedTime;
    let oi = 0;
    let pi = 0;

    for (const s of sats) {
      const a = s.phase + (t / s.period) * Math.PI * 2;
      p.current
        .set(Math.cos(a) * s.radius, 0, Math.sin(a) * s.radius)
        .applyQuaternion(s.quat)
        .add(s.anchor.position);

      // pin-prick beacon, the only thing a satellite emits
      const blink = 0.35 + 0.65 * Math.pow(Math.max(0, Math.sin(t * 1.1 + s.phase)), 8);
      if (s.slot >= 0) {
        pool.set(
          s.slot,
          p.current.x,
          p.current.y,
          p.current.z,
          s.rgb[0],
          s.rgb[1],
          s.rgb[2],
          meshes ? 1.05 : 1.7,
          (frozen ? 0.6 : blink) * (meshes ? 0.72 : 0.85),
        );
      }

      if (!meshes) continue;

      q.current.setFromAxisAngle(
        new THREE.Vector3(0.3, 1, 0.2).normalize(),
        a * 1.7 + s.phase,
      );
      sc.current.setScalar(s.scale);
      m.current.compose(p.current, q.current, sc.current);

      if (s.shape === 0) octa.current?.setMatrixAt(oi++, m.current);
      else panel.current?.setMatrixAt(pi++, m.current);
    }

    if (meshes) {
      if (octa.current) octa.current.instanceMatrix.needsUpdate = true;
      if (panel.current) panel.current.instanceMatrix.needsUpdate = true;
    }
  });

  if (!meshes || sats.length === 0) return null;

  return (
    <>
      {octaCount > 0 && (
        <instancedMesh
          ref={octa}
          args={[undefined, undefined, octaCount]}
          frustumCulled={false}
          renderOrder={6}
        >
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color="#544d60"
            metalness={0.35}
            roughness={0.6}
          />
        </instancedMesh>
      )}
      {panelCount > 0 && (
        <instancedMesh
          ref={panel}
          args={[undefined, undefined, panelCount]}
          frustumCulled={false}
          renderOrder={6}
        >
          <boxGeometry args={[2.6, 0.22, 1]} />
          <meshStandardMaterial
            color="#4a4456"
            metalness={0.4}
            roughness={0.55}
          />
        </instancedMesh>
      )}
    </>
  );
}
