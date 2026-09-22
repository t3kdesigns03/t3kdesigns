"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { dustFrag, pointsVert, starFrag } from "./shaders/points";

export type Attribs = {
  position: Float32Array;
  aColor: Float32Array;
  aSize: Float32Array;
  aBright: Float32Array;
  aSeed: Float32Array;
};

type Props = {
  attribs: Attribs;
  /** pixel size scalar: final px ≈ uSize * aSize * dpr / distance */
  uSize: number;
  rotSpeed?: number;
  /** 0 = rigid body, 1 = rim stalls completely */
  shear?: number;
  twinkle?: number;
  mode?: "star" | "dust";
  renderOrder?: number;
  frozen?: boolean;
  fade?: number;
};

export default function PointLayer({
  attribs,
  uSize,
  rotSpeed = 0.05,
  shear = 0.18,
  twinkle = 0,
  mode = "star",
  renderOrder = 0,
  frozen = false,
  fade = 1,
}: Props) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const gl = useThree((s) => s.gl);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: uSize },
      uPixelRatio: { value: gl.getPixelRatio() },
      uRotSpeed: { value: rotSpeed },
      uShear: { value: shear },
      uTwinkle: { value: twinkle },
      uFade: { value: fade },
    }),
    // built once; live values are pushed in useFrame below
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const count = attribs.aSize.length;

  useFrame((state) => {
    const m = mat.current;
    if (!m) return;
    if (!frozen) m.uniforms.uTime.value = state.clock.elapsedTime;
    m.uniforms.uPixelRatio.value = state.gl.getPixelRatio();
    m.uniforms.uFade.value += (fade - m.uniforms.uFade.value) * 0.08;
  });

  return (
    <points frustumCulled={false} renderOrder={renderOrder}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[attribs.position, 3]}
          count={count}
        />
        <bufferAttribute
          attach="attributes-aColor"
          args={[attribs.aColor, 3]}
          count={count}
        />
        <bufferAttribute
          attach="attributes-aSize"
          args={[attribs.aSize, 1]}
          count={count}
        />
        <bufferAttribute
          attach="attributes-aBright"
          args={[attribs.aBright, 1]}
          count={count}
        />
        <bufferAttribute
          attach="attributes-aSeed"
          args={[attribs.aSeed, 1]}
          count={count}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        vertexShader={pointsVert}
        fragmentShader={mode === "dust" ? dustFrag : starFrag}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={mode === "dust" ? THREE.CustomBlending : THREE.AdditiveBlending}
        blendEquation={THREE.AddEquation}
        blendSrc={mode === "dust" ? THREE.ZeroFactor : THREE.SrcAlphaFactor}
        blendDst={mode === "dust" ? THREE.OneMinusSrcColorFactor : THREE.OneFactor}
      />
    </points>
  );
}
