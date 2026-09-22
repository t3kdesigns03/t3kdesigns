"use client";

import { useMemo } from "react";
import Crew from "./Crew";
import Satellites from "./Satellites";
import Ships, { buildShips } from "./Ships";
import TrafficPoints from "./TrafficPoints";
import Worlds from "./Worlds";
import { PointPool } from "./pointPool";
import { layout } from "./anchors";
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
  lean,
}: {
  cfg: TierConfig;
  frozen: boolean;
  mobile: boolean;
  /** the perf watchdog fired — trim traffic, keep the worlds */
  lean: boolean;
}) {
  const pool = useMemo(() => new PointPool(760), []);

  /**
   * Mobile is not a cut-down scene, it is a differently framed one. The
   * camera sits much further out so the whole node ring fits a portrait
   * frustum, which means bodies, hulls and lights all have to come up in
   * size to stay legible. Set before children render.
   */
  layout.worldScale = mobile ? 2.3 : 1;

  const shipCount = mobile ? (lean ? 3 : 5) : cfg.ships;
  const crewMax = mobile ? 0 : cfg.crew;
  const pointScale = mobile ? 2.6 : 1;
  const glow = mobile ? 1.7 : 1;
  // on a phone every ship should be working the visible ring, not making a
  // twenty-second run to a planet that is off-frame
  const allowOuter = !mobile && cfg.outerPlanets > 0;
  const outerCount = mobile ? 1 : cfg.outerPlanets;

  const ships = useMemo(
    () => buildShips(pool, shipCount, cfg.trail, allowOuter, frozen, mobile),
    [pool, shipCount, cfg.trail, allowOuter, frozen, mobile],
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
        outerCount={outerCount}
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
        allowOuter={allowOuter}
        minPx={mobile ? 6 : 3.2}
        pointScale={pointScale}
      />

      {crewMax > 0 && !frozen && (
        <Crew pool={pool} ships={ships} max={crewMax} />
      )}

      <TrafficPoints pool={pool} sizeScale={pointScale} glow={glow} />
    </>
  );
}
