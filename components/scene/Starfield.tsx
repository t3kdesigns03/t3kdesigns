"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import PointLayer, { type Attribs } from "./PointLayer";
import { gaussian, kelvinToRGB } from "./color";

/**
 * Distant field. Real star counts by spectral class, so the sky reads
 * amber-and-white with occasional blue-white giants — not confetti.
 */
function build(count: number): Attribs {
  const a: Attribs = {
    position: new Float32Array(count * 3),
    aColor: new Float32Array(count * 3),
    aSize: new Float32Array(count),
    aBright: new Float32Array(count),
    aSeed: new Float32Array(count),
  };

  for (let i = 0; i < count; i++) {
    // shell, so nothing ever crosses the disk
    const r = 62 + Math.random() * 78;
    const u = Math.random() * 2 - 1;
    const phi = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);

    a.position[i * 3] = s * Math.cos(phi) * r;
    a.position[i * 3 + 1] = u * r;
    a.position[i * 3 + 2] = s * Math.sin(phi) * r;

    // weighted draw: mostly K/M and G, a thin tail of hot O/B
    const roll = Math.random();
    let k: number;
    if (roll < 0.52) k = 3100 + gaussian(500);
    else if (roll < 0.82) k = 5400 + gaussian(700);
    else if (roll < 0.96) k = 7600 + gaussian(900);
    else k = 11500 + gaussian(3000);

    const [cr, cg, cb] = kelvinToRGB(Math.max(2200, k));
    const big = Math.pow(Math.random(), 5.0);

    a.aColor[i * 3] = cr;
    a.aColor[i * 3 + 1] = cg;
    a.aColor[i * 3 + 2] = cb;
    a.aSize[i] = 0.5 + big * 2.6;
    a.aBright[i] = (0.22 + big * 0.7) * (0.6 + Math.random() * 0.7);
    a.aSeed[i] = Math.random();
  }

  return a;
}

export default function Starfield({
  count,
  frozen,
  sizeScale = 1,
}: {
  count: number;
  frozen: boolean;
  /** see Galaxy — lets /explore push the shell out past every planet */
  sizeScale?: number;
}) {
  const attribs = useMemo(() => build(count), [count]);
  const group = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    if (frozen || !group.current) return;
    group.current.rotation.y += dt * 0.0045;
    group.current.rotation.x += dt * 0.0012;
  });

  return (
    <group ref={group}>
      <PointLayer
        attribs={attribs}
        uSize={140 * sizeScale}
        rotSpeed={0}
        shear={0}
        twinkle={0.1}
        renderOrder={-2}
        frozen={frozen}
      />
    </group>
  );
}
