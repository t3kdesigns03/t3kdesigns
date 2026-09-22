"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { pointsVert, starFrag } from "../shaders/points";
import type { PointPool } from "./pointPool";

/**
 * The single draw call behind the whole traffic layer. Reuses the scene's
 * existing star shader so a nav light is lit by the same maths as a star —
 * the traffic has to look like it belongs to this galaxy, not like decals.
 */
export default function TrafficPoints({
  pool,
  sizeScale = 1,
  glow = 1,
}: {
  pool: PointPool;
  sizeScale?: number;
  /** brightness multiplier — bloom is off on phones, so lights carry it */
  glow?: number;
}) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const gl = useThree((s) => s.gl);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: 16 * sizeScale },
      uPixelRatio: { value: gl.getPixelRatio() },
      uRotSpeed: { value: 0 },
      uShear: { value: 0 },
      uTwinkle: { value: 0 },
      uFade: { value: glow },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame((state) => {
    if (mat.current) {
      mat.current.uniforms.uPixelRatio.value = state.gl.getPixelRatio();
    }
    // written after every owner has had its turn; one frame of lag at worst
    pool.flush();
  });

  return (
    <points
      frustumCulled={false}
      renderOrder={8}
      ref={(p) => {
        if (p) pool.geometry = p.geometry as THREE.BufferGeometry;
      }}
    >
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[pool.position, 3]}
          count={pool.capacity}
          usage={THREE.DynamicDrawUsage}
        />
        <bufferAttribute
          attach="attributes-aColor"
          args={[pool.color, 3]}
          count={pool.capacity}
          usage={THREE.DynamicDrawUsage}
        />
        <bufferAttribute
          attach="attributes-aSize"
          args={[pool.size, 1]}
          count={pool.capacity}
          usage={THREE.DynamicDrawUsage}
        />
        <bufferAttribute
          attach="attributes-aBright"
          args={[pool.bright, 1]}
          count={pool.capacity}
          usage={THREE.DynamicDrawUsage}
        />
        <bufferAttribute
          attach="attributes-aSeed"
          args={[pool.seed, 1]}
          count={pool.capacity}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        vertexShader={pointsVert}
        fragmentShader={starFrag}
        transparent
        depthWrite={false}
        depthTest
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
