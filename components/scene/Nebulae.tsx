"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { nebulaFrag, nebulaVert } from "./shaders/nebula";

type Cloud = {
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number];
  tint: string;
  tint2: string;
  intensity: number;
  scale: number;
  seed: number;
};

/**
 * Hand-placed gas. Kept behind the disk and deliberately faint — the type
 * has to stay readable, so these set depth rather than shout.
 */
const CLOUDS: Cloud[] = [
  {
    position: [-16, 7, -30],
    rotation: [0.1, 0.35, 0.22],
    size: [56, 44],
    tint: "#5a2a8c",
    tint2: "#c084fc",
    intensity: 0.115,
    scale: 2.1,
    seed: 11.4,
  },
  {
    position: [21, -9, -34],
    rotation: [-0.14, -0.42, -0.3],
    size: [62, 46],
    tint: "#0f4a5a",
    tint2: "#5de0d0",
    intensity: 0.075,
    scale: 2.6,
    seed: 47.9,
  },
  {
    position: [6, 15, -44],
    rotation: [0.06, 0.12, 0.85],
    size: [74, 52],
    tint: "#3a1360",
    tint2: "#7c5cff",
    intensity: 0.085,
    scale: 1.7,
    seed: 82.2,
  },
  {
    position: [-27, -13, -22],
    rotation: [0.2, 0.6, -0.55],
    size: [40, 34],
    tint: "#6b1f3a",
    tint2: "#ff7a9c",
    intensity: 0.06,
    scale: 3.1,
    seed: 5.7,
  },
  {
    position: [33, 12, -50],
    rotation: [-0.1, -0.7, 0.4],
    size: [66, 50],
    tint: "#1b1048",
    tint2: "#9b87c7",
    intensity: 0.055,
    scale: 2.2,
    seed: 63.1,
  },
];

function Cloud({ cloud, frozen }: { cloud: Cloud; frozen: boolean }) {
  const mat = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uTint: { value: new THREE.Color(cloud.tint) },
      uTint2: { value: new THREE.Color(cloud.tint2) },
      uIntensity: { value: cloud.intensity },
      uSeed: { value: cloud.seed },
      uScale: { value: cloud.scale },
    }),
    [cloud],
  );

  useFrame((state) => {
    if (frozen || !mat.current) return;
    mat.current.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh
      position={cloud.position}
      rotation={cloud.rotation}
      renderOrder={-3}
      frustumCulled={false}
    >
      <planeGeometry args={cloud.size} />
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        vertexShader={nebulaVert}
        fragmentShader={nebulaFrag}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

export default function Nebulae({
  count,
  frozen,
}: {
  count: number;
  frozen: boolean;
}) {
  return (
    <>
      {CLOUDS.slice(0, count).map((c, i) => (
        <Cloud key={i} cloud={c} frozen={frozen} />
      ))}
    </>
  );
}
