"use client";

import { useMemo } from "react";
import PointLayer, { type Attribs } from "./PointLayer";
import { gaussian, kelvinToRGB } from "./color";
import { GALAXY_RADIUS as R } from "./nodeLayout";
import type { TierConfig } from "./perf";

const TAU = Math.PI * 2;
const ARMS = 3;
const PITCH = 0.38; // logarithmic-spiral pitch angle in radians

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function alloc(count: number): Attribs {
  return {
    position: new Float32Array(count * 3),
    aColor: new Float32Array(count * 3),
    aSize: new Float32Array(count),
    aBright: new Float32Array(count),
    aSeed: new Float32Array(count),
  };
}

/** θ on the logarithmic spiral for a given arm at radius r */
function armAngle(arm: number, r: number) {
  return (arm / ARMS) * TAU + Math.log(Math.max(0.06, r) / 0.3) / Math.tan(PITCH);
}

/**
 * The disk. Three populations share it, and the mix is what makes it read
 * as photographed rather than plotted:
 *   - a smooth exponential disk, so the space between arms is never empty
 *   - the arms themselves, an angular overdensity on top of that disk
 *   - star-forming clumps seeded along the arms, which is what breaks the
 *     clean analytic curve no real galaxy has
 */
function buildDisk(count: number): Attribs {
  const a = alloc(count);

  const CLOUDS = 190;
  const clouds = Array.from({ length: CLOUDS }, (_, c) => {
    const r = 0.5 + Math.pow(Math.random(), 0.85) * (R - 0.5);
    const th = armAngle(c % ARMS, r) + gaussian(0.1);
    return {
      x: Math.cos(th) * r,
      z: Math.sin(th) * r,
      y: gaussian(0.05),
      s: 0.09 + Math.random() * 0.26,
      hot: Math.random(),
    };
  });

  for (let i = 0; i < count; i++) {
    let x: number;
    let y: number;
    let z: number;
    let hot = 0;

    const roll = Math.random();
    const inCloud = roll < 0.28;
    const smooth = !inCloud && roll < 0.62;

    if (inCloud) {
      const c = clouds[(Math.random() * CLOUDS) | 0];
      x = c.x + gaussian(c.s);
      z = c.z + gaussian(c.s);
      y = c.y + gaussian(c.s * 0.34);
      hot = c.hot;
    } else if (smooth) {
      // exponential surface-brightness profile, no angular structure
      const r0 = Math.min(R * 1.04, -Math.log(1 - Math.random() * 0.97) * 1.6);
      const th = Math.random() * TAU;
      x = Math.cos(th) * r0;
      z = Math.sin(th) * r0;
      y = gaussian(0.26 * Math.exp(-r0 / 2.1) + 0.018);
    } else {
      const r0 = Math.pow(Math.random(), 1.5) * R + 0.04;
      // arms are angularly tight at the rim, smeared into the bulge
      const spread = 0.16 + 0.7 * Math.pow(1 - clamp(r0 / R, 0, 1), 0.7);
      const th = armAngle(i % ARMS, r0) + gaussian(spread);
      const r = r0 * (1 + gaussian(0.05));
      x = Math.cos(th) * r;
      z = Math.sin(th) * r;
      // disk flares thick at the core, wafer-thin at the rim
      y = gaussian(0.3 * Math.exp(-r0 / 2.0) + 0.02);
    }

    const r = Math.hypot(x, z);
    const rn = clamp(r / R, 0, 1);

    // old warm bulge stars inward, young blue-white stars outward
    let k = (smooth ? 3700 : 4000) + (smooth ? 2700 : 4400) * Math.pow(rn, 0.7) + gaussian(1300);
    if (inCloud) k += 1500 + hot * 2600;
    k = clamp(k, 2700, 13000);

    let [cr, cg, cb] = kelvinToRGB(k);

    // ionised-hydrogen knots: a few percent of cloud stars go Hα pink
    if (inCloud && Math.random() < 0.13) {
      const m = 0.45 + Math.random() * 0.3;
      cr = cr * (1 - m) + 1.0 * m;
      cg = cg * (1 - m) + 0.4 * m;
      cb = cb * (1 - m) + 0.52 * m;
    }

    const big = Math.pow(Math.random(), 4.2);

    a.position[i * 3] = x;
    a.position[i * 3 + 1] = y;
    a.position[i * 3 + 2] = z;
    a.aColor[i * 3] = cr;
    a.aColor[i * 3 + 1] = cg;
    a.aColor[i * 3 + 2] = cb;
    a.aSize[i] = 0.5 + big * 3.6;
    a.aBright[i] =
      (0.26 + 0.44 * (1 - rn) + big * 0.55) *
      (0.72 + Math.random() * 0.5) *
      (smooth ? 0.72 : 1);
    a.aSeed[i] = Math.random();
  }

  return a;
}

/** Central bulge: dense, old, warm, slightly flattened. */
function buildBulge(count: number): Attribs {
  const a = alloc(count);

  for (let i = 0; i < count; i++) {
    const rr = Math.pow(Math.random(), 2.3) * 1.45;
    const u = Math.random() * 2 - 1;
    const phi = Math.random() * TAU;
    const sx = Math.sqrt(1 - u * u);

    const x = sx * Math.cos(phi) * rr;
    const z = sx * Math.sin(phi) * rr;
    const y = u * rr * 0.48;

    const k = clamp(3250 + gaussian(620) + (1 - rr) * 700, 2500, 6200);
    const [cr, cg, cb] = kelvinToRGB(k);
    const big = Math.pow(Math.random(), 3.4);
    const inner = 1 - clamp(rr / 1.45, 0, 1);

    a.position[i * 3] = x;
    a.position[i * 3 + 1] = y;
    a.position[i * 3 + 2] = z;
    a.aColor[i * 3] = cr;
    a.aColor[i * 3 + 1] = cg;
    a.aColor[i * 3 + 2] = cb;
    a.aSize[i] = 0.45 + big * 2.0;
    a.aBright[i] = (0.4 + inner * 0.62 + big * 0.4) * (0.75 + Math.random() * 0.45);
    a.aSeed[i] = Math.random();
  }

  return a;
}

/**
 * Dust. Positioned just inside the leading edge of each arm — where the
 * lanes sit in a real trailing spiral — and just off the midplane so the
 * near side of the disk is the side that dims.
 *
 * The values written to aColor are absorption coefficients consumed by a
 * subtractive blend, not a colour: higher in blue, lower in red, so the
 * light that survives the lane comes out warmer.
 */
function buildDust(count: number): Attribs {
  const a = alloc(count);

  for (let i = 0; i < count; i++) {
    const r0 = 0.5 + Math.pow(Math.random(), 0.88) * (R * 1.02 - 0.5);
    const th = armAngle(i % ARMS, r0) - 0.19 + gaussian(0.1);
    const r = r0 * (1 + gaussian(0.028));

    const x = Math.cos(th) * r;
    const z = Math.sin(th) * r;
    const y = gaussian(0.035 + 0.045 * Math.exp(-r0 / 2.6)) - 0.012;

    const rn = clamp(r / R, 0, 1);
    const v = 0.78 + Math.random() * 0.34;

    a.position[i * 3] = x;
    a.position[i * 3 + 1] = y;
    a.position[i * 3 + 2] = z;
    a.aColor[i * 3] = 0.5 * v;
    a.aColor[i * 3 + 1] = 0.74 * v;
    a.aColor[i * 3 + 2] = 0.94 * v;
    a.aSize[i] = 0.4 + Math.random() * 0.95;
    a.aBright[i] = (0.1 + Math.random() * 0.2) * (1 - 0.5 * rn);
    a.aSeed[i] = Math.random();
  }

  return a;
}

export default function Galaxy({
  cfg,
  frozen,
}: {
  cfg: TierConfig;
  frozen: boolean;
}) {
  const disk = useMemo(() => buildDisk(cfg.disk), [cfg.disk]);
  const bulge = useMemo(() => buildBulge(cfg.bulge), [cfg.bulge]);
  const dust = useMemo(() => buildDust(cfg.dust), [cfg.dust]);

  return (
    <group rotation={[0, 0, 0.055]}>
      <PointLayer
        attribs={bulge}
        uSize={10}
        rotSpeed={0.055}
        shear={0.05}
        renderOrder={0}
        frozen={frozen}
      />
      <PointLayer
        attribs={disk}
        uSize={11.5}
        rotSpeed={0.05}
        shear={0.2}
        twinkle={0.05}
        renderOrder={1}
        frozen={frozen}
      />
      <PointLayer
        attribs={dust}
        uSize={125}
        rotSpeed={0.05}
        shear={0.2}
        mode="dust"
        renderOrder={2}
        frozen={frozen}
      />
    </group>
  );
}
