"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import Galaxy from "@/components/scene/Galaxy";
import Nebulae from "@/components/scene/Nebulae";
import Starfield from "@/components/scene/Starfield";
import { TIERS } from "@/components/scene/perf";
import { GALAXY_DIR } from "./layout";

const SKY_SCALE = 6;
const GALAXY_SCALE = 12;
const NEBULA_SCALE = 9;

/**
 * A skybox built from the homepage's own layers. It rides with the camera,
 * so nothing in it can be flown to or past — the spiral hangs in the sky
 * like a real distant galaxy. Everything is pushed out beyond the furthest
 * world and point sizes are scaled to match, so the planets always occlude
 * the sky and never the other way round.
 */
export default function Backdrop({
  frozen,
  stars,
  galaxy,
  nebulae,
}: {
  frozen: boolean;
  stars: number;
  galaxy: { disk: number; bulge: number; dust: number };
  nebulae: number;
}) {
  const camera = useThree((s) => s.camera);
  const sky = useRef<THREE.Group>(null);

  const cfg = useMemo(() => ({ ...TIERS[0], ...galaxy }), [galaxy]);
  const galaxyAt = useMemo(
    () => GALAXY_DIR.clone().multiplyScalar(40 * GALAXY_SCALE).toArray(),
    [],
  );

  // tilt the disk ~52 degrees off the line of sight: arms readable, still a disk
  const galaxyQuat = useMemo(() => {
    const toViewer = GALAXY_DIR.clone().negate();
    const perp = new THREE.Vector3(0, 1, 0)
      .addScaledVector(toViewer, -toViewer.y)
      .normalize();
    const tilt = THREE.MathUtils.degToRad(52);
    const normal = toViewer
      .multiplyScalar(Math.cos(tilt))
      .addScaledVector(perp, Math.sin(tilt))
      .normalize();
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  }, []);

  useFrame(() => {
    if (sky.current) sky.current.position.copy(camera.position);
  });

  return (
    <group ref={sky}>
      <group scale={SKY_SCALE}>
        <Starfield count={stars} frozen={frozen} sizeScale={SKY_SCALE} />
      </group>

      <group
        position={galaxyAt as [number, number, number]}
        quaternion={galaxyQuat}
        scale={GALAXY_SCALE}
      >
        <Galaxy cfg={cfg} frozen={frozen} sizeScale={GALAXY_SCALE} />
      </group>

      {nebulae > 0 && (
        <group scale={NEBULA_SCALE}>
          <Nebulae count={nebulae} frozen={frozen} />
        </group>
      )}
    </group>
  );
}
