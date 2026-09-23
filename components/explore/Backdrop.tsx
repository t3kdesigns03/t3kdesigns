"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import Nebulae from "@/components/scene/Nebulae";
import Starfield from "@/components/scene/Starfield";
import { GALAXY_DIR, LIGHT_DIR } from "./layout";
import { bandFrag, bandVert, spiralFrag, spiralVert } from "./shaders";

const SKY_SCALE = 6;
/** the spiral's distance and diameter, in sky units */
const GALAXY_AT = 600;
const GALAXY_SIZE = 230;
const NEBULA_SCALE = 9;

/**
 * A skybox built from the homepage's own layers. It rides with the camera,
 * so nothing in it can be flown to or past — the spiral hangs in the sky
 * like a real distant galaxy. Everything is pushed out beyond the furthest
 * world and point sizes are scaled to match, so the planets always occlude
 * the sky and never the other way round.
 */
/**
 * A faint river of stars and haze along the orbital plane. A parked camera
 * looks slightly down across that plane, so whatever the heading, there is
 * sky behind the world rather than a flat void.
 */
function Band({ count }: { count: number }) {
  const gl = useThree((s) => s.gl);
  const geo = useMemo(() => {
    const puffs = Math.round(count / 60);
    const total = count + puffs;
    const pos = new Float32Array(total * 3);
    const col = new Float32Array(total * 3);
    const size = new Float32Array(total);
    const n = LIGHT_DIR;
    const ref = new THREE.Vector3(1, 0, 0).addScaledVector(n, -n.x).normalize();
    const ref2 = new THREE.Vector3().crossVectors(n, ref);
    const d = new THREE.Vector3();
    let seed = 7;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;
    const warm = new THREE.Color("#ffe2c4");
    const cool = new THREE.Color("#c9d6ff");
    const violet = new THREE.Color("#6d4fae");
    const amber = new THREE.Color("#8a5a3a");
    const c = new THREE.Color();
    for (let i = 0; i < total; i++) {
      const puff = i >= count;
      const az = rnd() * Math.PI * 2;
      const el = -0.3 + 0.12 * Math.sin(az * 2 + 1) + gauss() * (puff ? 0.07 : 0.11);
      d.copy(ref)
        .multiplyScalar(Math.cos(az))
        .addScaledVector(ref2, Math.sin(az))
        .multiplyScalar(Math.cos(el))
        .addScaledVector(n, Math.sin(el))
        .normalize()
        .multiplyScalar(700);
      pos.set([d.x, d.y, d.z], i * 3);
      if (puff) {
        c.copy(rnd() < 0.6 ? violet : amber).multiplyScalar(0.05 + rnd() * 0.05);
        size[i] = 60 + rnd() * 110;
      } else {
        const b = 0.12 + Math.pow(rnd(), 3) * 0.75;
        c.copy(cool).lerp(warm, rnd()).multiplyScalar(b);
        size[i] = 1.2 + Math.pow(rnd(), 4) * 2.4;
      }
      col.set([c.r, c.g, c.b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    return g;
  }, [count]);
  const uniforms = useMemo(() => ({ uPx: { value: gl.getPixelRatio() } }), [gl]);

  return (
    <points geometry={geo} frustumCulled={false} renderOrder={-2}>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={bandVert}
        fragmentShader={bandFrag}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default function Backdrop({
  frozen,
  stars,
  band,
  nebulae,
}: {
  frozen: boolean;
  stars: number;
  band: number;
  nebulae: number;
}) {
  const camera = useThree((s) => s.camera);
  const sky = useRef<THREE.Group>(null);

  const galaxyAt = useMemo(
    () => GALAXY_DIR.clone().multiplyScalar(GALAXY_AT).toArray(),
    [],
  );
  const spiral = useMemo(() => ({ uBright: { value: 1.1 } }), []);

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
    // the quad faces +Z; tip that toward the disk normal, with a little twist
    return new THREE.Quaternion()
      .setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)
      .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.7));
  }, []);

  useFrame(() => {
    if (sky.current) sky.current.position.copy(camera.position);
  });

  return (
    <group ref={sky}>
      <Band count={band} />
      <group scale={SKY_SCALE}>
        <Starfield count={stars} frozen={frozen} sizeScale={SKY_SCALE} />
      </group>

      <mesh position={galaxyAt as [number, number, number]} quaternion={galaxyQuat} renderOrder={-3}>
        <planeGeometry args={[GALAXY_SIZE, GALAXY_SIZE]} />
        <shaderMaterial
          uniforms={spiral}
          vertexShader={spiralVert}
          fragmentShader={spiralFrag}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {nebulae > 0 && (
        <group scale={NEBULA_SCALE}>
          <Nebulae count={nebulae} frozen={frozen} />
        </group>
      )}
    </group>
  );
}
