"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import AdaptivePerf from "./AdaptivePerf";
import CameraRig from "./CameraRig";
import Galaxy from "./Galaxy";
import Nebulae from "./Nebulae";
import ProjectNodes from "./ProjectNodes";
import Starfield from "./Starfield";
import Traffic from "./traffic/Traffic";
import { TIERS, detectTier, type Tier } from "./perf";
import { useMedia, useReducedMotion } from "@/lib/motion";
import { sceneStore, useScene } from "@/lib/store";

export default function SceneCanvas() {
  const reduced = useReducedMotion();
  const mobile = useMedia("(max-width: 820px)");
  const explore = useScene((s) => s.explore);

  const [tier, setTier] = useState<Tier>(detectTier);
  const [bloom, setBloom] = useState(true);
  const [awake, setAwake] = useState(true);
  const [lean, setLean] = useState(false);
  const [ready, setReady] = useState(false);

  // never burn a GPU on a tab nobody is looking at
  useEffect(() => {
    const onVis = () => setAwake(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // touch has no orbit mode
  useEffect(() => {
    if (mobile) sceneStore.setExplore(false);
  }, [mobile]);

  // Frames are dropping: shed bloom, shed particles, shed a couple of
  // ships. Worlds are never shed — an empty sky was the bug.
  const drop = useCallback(() => {
    setBloom(false);
    setLean(true);
    setTier((t) => (t > 0 ? ((t - 1) as Tier) : t));
  }, []);

  const cfg = useMemo(() => TIERS[tier], [tier]);

  const frozen = reduced;
  const frameloop = reduced ? "demand" : awake ? "always" : "never";

  return (
    <Canvas
      aria-hidden
      tabIndex={-1}
      frameloop={frameloop}
      dpr={[1, cfg.dpr]}
      gl={{
        antialias: false,
        alpha: false,
        stencil: false,
        depth: true,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
      }}
      camera={{ fov: mobile ? 62 : 54, near: 0.1, far: 420, position: [0, -2, 10] }}
      onCreated={({ gl }) => {
        gl.setClearColor(new THREE.Color("#05030a"), 1);
        setReady(true);
      }}
      style={{
        position: "absolute",
        inset: 0,
        opacity: ready ? 1 : 0,
        transition: "opacity 1200ms ease",
        /* r3f defaults this to "none", which would swallow every vertical
           swipe that starts over the canvas — i.e. most of a phone screen —
           and leave the page unscrollable. */
        touchAction: "pan-y",
      }}
    >
      <Nebulae count={cfg.nebulae} frozen={frozen} />
      <Starfield count={cfg.stars} frozen={frozen} />
      <Galaxy cfg={cfg} frozen={frozen} />
      <ProjectNodes count={cfg.nodeStars} frozen={frozen} />
      <Traffic cfg={cfg} frozen={frozen} mobile={mobile} lean={lean} />

      <CameraRig frozen={frozen} mobile={mobile} explore={explore} />
      {!reduced && <AdaptivePerf onDrop={drop} />}

      {explore && !mobile && (
        <OrbitControls
          makeDefault
          enablePan={false}
          /* wheel stays with the document so the page still scrolls */
          enableZoom={false}
          enableDamping
          dampingFactor={0.055}
          rotateSpeed={0.42}
          minDistance={5}
          maxDistance={16}
          minPolarAngle={0.5}
          maxPolarAngle={2.3}
          target={[0, 0.2, 0]}
        />
      )}

      {bloom && !reduced && !mobile && (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <Bloom
            mipmapBlur
            intensity={0.52}
            luminanceThreshold={0.72}
            luminanceSmoothing={0.24}
            radius={0.62}
          />
          {explore ? (
            <ChromaticAberration
              blendFunction={BlendFunction.NORMAL}
              offset={new THREE.Vector2(0.0006, 0.0009)}
              radialModulation={false}
              modulationOffset={0}
            />
          ) : (
            <></>
          )}
        </EffectComposer>
      )}
    </Canvas>
  );
}
