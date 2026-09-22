"use client";

import { useMemo } from "react";
import Crew from "./Crew";
import Satellites from "./Satellites";
import Ships, { buildShips } from "./Ships";
import TrafficPoints from "./TrafficPoints";
import Worlds from "./Worlds";
import { PointPool } from "./pointPool";
import type { TierConfig } from "../perf";

/**
 * The inhabited layer. Everything here is background life: nothing is
 * clickable, the project nodes stay the only hit targets, and the whole
 * thing scales down to three moving points on a phone.
 *
 * Draw order matters — galaxy, nebulae and starfield are point layers that
 * do not write depth, so every mesh here renders after them (renderOrder 4+)
 * and the subtractive dust never smears across a hull.
 */
export default function Traffic({
  cfg,
  frozen,
  mobile,
}: {
  cfg: TierConfig;
  frozen: boolean;
  mobile: boolean;
}) {
  const pool = useMemo(() => new PointPool(760), []);

  const shipCount = mobile ? Math.min(cfg.ships, 5) : cfg.ships;
  const crewMax = mobile ? 0 : cfg.crew;

  const ships = useMemo(
    () =>
      buildShips(pool, shipCount, cfg.trail, cfg.outerPlanets > 0, frozen),
    [pool, shipCount, cfg.trail, cfg.outerPlanets, frozen],
  );

  return (
    <>
      {/* the galactic core is the key light for every solid in the scene */}
      <pointLight
        position={[0, 0, 0]}
        color="#ffe0b8"
        /* no falloff: one key light for the whole system, art-directed
           rather than inverse-square, so a hull at the rim still reads */
        intensity={15}
        decay={0}
        distance={0}
      />
      <ambientLight color="#5a4f8a" intensity={0.09} />

      <Worlds
        pool={pool}
        frozen={frozen}
        segments={cfg.worldSegments}
        outerCount={cfg.outerPlanets}
      />

      <Satellites
        pool={pool}
        frozen={frozen}
        nodes={cfg.satelliteNodes}
        per={cfg.satellitesPer}
        meshes={cfg.satelliteMeshes}
      />

      <Ships
        pool={pool}
        frozen={frozen}
        ships={ships}
        meshes={cfg.shipMeshes}
        trail={cfg.trail}
        allowOuter={cfg.outerPlanets > 0}
      />

      {crewMax > 0 && !frozen && (
        <Crew pool={pool} ships={ships} max={crewMax} />
      )}

      <TrafficPoints pool={pool} />
    </>
  );
}
