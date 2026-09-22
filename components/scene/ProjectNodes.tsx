"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { hexToRGB, kelvinToRGB, srand } from "./color";
import { labelHost } from "./labelHost";
import { nodeSpots, spotById, type NodeSpot } from "./nodeLayout";
import { pointsVert, starFrag } from "./shaders/points";
import { raw, sceneStore } from "@/lib/store";

const TAU = Math.PI * 2;

type Buf = {
  position: Float32Array;
  aColor: Float32Array;
  aSize: Float32Array;
  aBright: Float32Array;
  aSeed: Float32Array;
};

/** A small satellite galaxy: two tight arms, a flattened halo, a hot core. */
function buildCluster(count: number, spot: NodeSpot): Buf {
  const buf: Buf = {
    position: new Float32Array(count * 3),
    aColor: new Float32Array(count * 3),
    aSize: new Float32Array(count),
    aBright: new Float32Array(count),
    aSeed: new Float32Array(count),
  };

  const [pr, pg, pb] = hexToRGB(spot.color);
  const R = spot.scale * 2.3;
  const tilt = srand(spot.phase * 3.3) * 1.2;

  for (let i = 0; i < count; i++) {
    const isCore = i < count * 0.085;
    const u = Math.random();
    const r = isCore ? Math.pow(u, 3) * R * 0.1 : Math.pow(u, 1.7) * R;

    const arm = i % 2;
    const th =
      (arm / 2) * TAU + r * 4.1 + (Math.random() - 0.5) * (0.5 + 1.4 * (1 - r / R));

    let x = Math.cos(th) * r;
    let z = Math.sin(th) * r;
    let y = (Math.random() - 0.5) * (r * 0.42 + 0.02);

    // tilt each satellite so the ring does not look rubber-stamped
    const ct = Math.cos(tilt);
    const st = Math.sin(tilt);
    const y2 = y * ct - z * st;
    z = y * st + z * ct;
    y = y2;
    x += (Math.random() - 0.5) * 0.01;

    // core goes white-hot, halo carries the brand colour
    const inner = 1 - Math.min(1, r / R);
    const white = Math.pow(inner, 2.2);
    const [wr, wg, wb] = kelvinToRGB(7200);
    const cr = pr * (1 - white) + wr * white;
    const cg = pg * (1 - white) + wg * white;
    const cb = pb * (1 - white) + wb * white;

    const big = Math.pow(Math.random(), 3.6);

    buf.position[i * 3] = x;
    buf.position[i * 3 + 1] = y;
    buf.position[i * 3 + 2] = z;
    buf.aColor[i * 3] = cr;
    buf.aColor[i * 3 + 1] = cg;
    buf.aColor[i * 3 + 2] = cb;
    buf.aSize[i] = isCore ? 3.0 + big * 6.0 : 0.5 + big * 2.4;
    buf.aBright[i] = isCore
      ? 1.15 + Math.random() * 0.6
      : (0.4 + inner * 0.62 + big * 0.5) * (0.7 + Math.random() * 0.5);
    buf.aSeed[i] = Math.random();
  }

  return buf;
}

function Cluster({
  spot,
  count,
  frozen,
}: {
  spot: NodeSpot;
  count: number;
  frozen: boolean;
}) {
  const buf = useMemo(() => buildCluster(count, spot), [count, spot]);
  const group = useRef<THREE.Group>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const lit = useRef(0);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: 26 },
      uPixelRatio: { value: 1 },
      uRotSpeed: { value: 0.14 },
      uShear: { value: 0 },
      uTwinkle: { value: 0.06 },
      uFade: { value: 0.9 },
    }),
    [],
  );

  // 4–7s breathe, unique per node
  const period = 4.2 + (spot.phase / TAU) * 2.8;

  useFrame((state, dt) => {
    const t = frozen ? 0 : state.clock.elapsedTime;
    const on = raw.hovered === spot.id || raw.active === spot.id ? 1 : 0;
    lit.current = THREE.MathUtils.damp(lit.current, on, 6, dt);

    if (group.current) {
      const breathe = 1 + Math.sin((t * TAU) / period + spot.phase) * 0.055;
      group.current.scale.setScalar(breathe * (1 + lit.current * 0.32));
      group.current.position.y =
        spot.position[1] + Math.sin(t * 0.32 + spot.phase) * 0.055;
    }

    if (mat.current) {
      mat.current.uniforms.uTime.value = t;
      mat.current.uniforms.uPixelRatio.value = state.gl.getPixelRatio();
      mat.current.uniforms.uFade.value = THREE.MathUtils.damp(
        mat.current.uniforms.uFade.value,
        1.0 + lit.current * 1.3,
        6,
        dt,
      );
    }
  });

  const n = buf.aSize.length;

  return (
    <group ref={group} position={spot.position}>
      <points frustumCulled={false} renderOrder={3}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[buf.position, 3]} count={n} />
          <bufferAttribute attach="attributes-aColor" args={[buf.aColor, 3]} count={n} />
          <bufferAttribute attach="attributes-aSize" args={[buf.aSize, 1]} count={n} />
          <bufferAttribute attach="attributes-aBright" args={[buf.aBright, 1]} count={n} />
          <bufferAttribute attach="attributes-aSeed" args={[buf.aSeed, 1]} count={n} />
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

      {/* invisible hit volume — renders nothing, still raycasts */}
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          sceneStore.setHovered(spot.id);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          sceneStore.setHovered(null);
          document.body.style.cursor = "";
        }}
        onClick={(e) => {
          e.stopPropagation();
          sceneStore.setActive(spot.id);
        }}
      >
        <sphereGeometry args={[Math.max(0.85, spot.scale * 2.6), 14, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  );
}

export default function ProjectNodes({
  count,
  frozen,
}: {
  count: number;
  frozen: boolean;
}) {
  const size = useThree((s) => s.size);
  const camera = useThree((s) => s.camera);
  const v = useRef(new THREE.Vector3());

  // drive the DOM hover label from the projected node position
  useFrame(() => {
    const el = labelHost.el;
    if (!el) return;
    const spot = spotById(raw.active ? null : raw.hovered);
    if (!spot) return;

    v.current.set(spot.position[0], spot.position[1] + 0.62, spot.position[2]);
    v.current.project(camera);

    const x = (v.current.x * 0.5 + 0.5) * size.width;
    const y = (-v.current.y * 0.5 + 0.5) * size.height;
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`;
  });

  return (
    <>
      {nodeSpots.map((spot) => (
        <Cluster key={spot.id} spot={spot} count={count} frozen={frozen} />
      ))}
    </>
  );
}
