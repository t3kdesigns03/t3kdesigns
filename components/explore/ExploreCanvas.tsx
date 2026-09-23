"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import AdaptivePerf from "@/components/scene/AdaptivePerf";
import { detectTier, type Tier } from "@/components/scene/perf";
import { PointPool } from "@/components/scene/traffic/pointPool";
import TrafficPoints from "@/components/scene/traffic/TrafficPoints";
import Backdrop from "./Backdrop";
import Controls from "./Controls";
import Craft from "./Craft";
import Planets from "./Planets";
import Rig from "./Rig";
import { LIGHT_POS } from "./layout";

/**
 * Budgets for the toy. Planets are the subject here, so they get the
 * geometry; the spiral is a backdrop, so it gets a fraction of the
 * homepage's particles.
 */
const BUDGET: Record<
  Tier,
  {
    stars: number;
    band: number;
    nebulae: number;
    segments: [number, number];
  }
> = {
  2: { stars: 9000, band: 7000, nebulae: 4, segments: [72, 54] },
  1: { stars: 6500, band: 5000, nebulae: 3, segments: [56, 42] },
  0: { stars: 4200, band: 3200, nebulae: 2, segments: [44, 32] },
};

export default function ExploreCanvas({
  reduced,
  coarse,
}: {
  reduced: boolean;
  coarse: boolean;
}) {
  const [tier] = useState<Tier>(detectTier);
  const [awake, setAwake] = useState(true);
  const [ready, setReady] = useState(false);

  const mobile = coarse || tier === 0;
  const budget = BUDGET[tier];
  // the watchdog lowers resolution rather than particles: planets are the subject
  const [dprMax, setDprMax] = useState(mobile ? 1 : 1.5);
  const pool = useMemo(() => new PointPool(256), []);

  useEffect(() => {
    const onVis = () => setAwake(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const frameloop = !awake ? "never" : reduced ? "demand" : "always";

  return (
    <Canvas
      aria-hidden
      tabIndex={-1}
      frameloop={frameloop}
      dpr={[1, dprMax]}
      gl={{
        antialias: !mobile,
        alpha: false,
        stencil: false,
        depth: true,
        powerPreference: "high-performance",
      }}
      camera={{ fov: mobile ? 66 : 58, near: 0.05, far: 1600, position: [0, 3, 14] }}
      onCreated={({ gl }) => {
        gl.setClearColor(new THREE.Color("#05030a"), 1);
        setReady(true);
      }}
      style={{
        position: "absolute",
        inset: 0,
        touchAction: "none",
        opacity: ready ? 1 : 0,
        transition: "opacity 900ms ease",
      }}
    >
      {/* key light high above the orbital plane; only the dock's metal uses it */}
      <directionalLight position={LIGHT_POS} intensity={6} color="#fff0de" />
      <ambientLight color="#5a4f8a" intensity={0.5} />

      <Backdrop
        frozen={reduced}
        stars={budget.stars}
        band={budget.band}
        nebulae={budget.nebulae}
      />
      <Planets pool={pool} frozen={reduced} segments={budget.segments} />

      {/* order matters: the rig steps the craft before anything reads it */}
      <Rig reduced={reduced} coarse={coarse} />
      <Craft pool={pool} reduced={reduced} />
      <Controls coarse={coarse} />

      {/*
        No bloom here, on purpose. Any postprocessing library /explore shares
        with the homepage — or any extra slice of three.js it pulls in — lands
        in the chunk both routes load, and the homepage would pay ~65-80 KiB
        gzipped for a glow it never shows. The lights carry their own glow.
      */}
      <TrafficPoints pool={pool} glow={mobile ? 1.4 : 1.25} />

      {!reduced && !mobile && <AdaptivePerf onDrop={() => setDprMax(1)} />}
    </Canvas>
  );
}
