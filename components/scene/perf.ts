/**
 * Particle budgets. Tier 2 is a desktop GPU, tier 0 is a mid-range phone.
 * The watchdog in AdaptivePerf walks this down at runtime if frames drop,
 * so nothing here is a promise — it is a starting guess.
 */
export type Tier = 0 | 1 | 2;

export type TierConfig = {
  disk: number;
  bulge: number;
  dust: number;
  stars: number;
  nodeStars: number;
  nebulae: number;
  dpr: number;
};

export const TIERS: Record<Tier, TierConfig> = {
  2: { disk: 148000, bulge: 26000, dust: 30000, stars: 11000, nodeStars: 520, nebulae: 5, dpr: 1.5 },
  1: { disk: 96000, bulge: 19000, dust: 19000, stars: 8000, nodeStars: 340, nebulae: 4, dpr: 1.25 },
  0: { disk: 42000, bulge: 9500, dust: 9000, stars: 4200, nodeStars: 210, nebulae: 3, dpr: 1 },
};

type Navigatorish = Navigator & { deviceMemory?: number };

export function detectTier(): Tier {
  if (typeof window === "undefined") return 1;

  const nav = navigator as Navigatorish;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.matchMedia("(max-width: 820px)").matches;
  const cores = nav.hardwareConcurrency ?? 4;
  const mem = nav.deviceMemory ?? 4;

  if (coarse || narrow) return mem >= 6 && cores >= 6 ? 1 : 0;
  if (cores <= 4 || mem <= 4) return 1;
  return 2;
}

let webglProbe: boolean | null = null;

export function hasWebGL(): boolean {
  if (typeof window === "undefined") return false;
  if (webglProbe !== null) return webglProbe;
  try {
    const c = document.createElement("canvas");
    const gl =
      c.getContext("webgl2") ||
      c.getContext("webgl") ||
      c.getContext("experimental-webgl");
    // Software rasterisers exist but still beat a static gradient, so we keep them.
    webglProbe = !!gl;
  } catch {
    webglProbe = false;
  }
  return webglProbe;
}
