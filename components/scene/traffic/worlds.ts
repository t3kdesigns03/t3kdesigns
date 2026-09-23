import { srand } from "../color";

/**
 * One body per project, read off lib/projects.ts colours. The node accent
 * is the trim — ring light, city lights, engine flash — never the albedo:
 * a planet painted in the brand colour looks like a toy.
 */
export type WorldDef = {
  id: string;
  /** deep albedo / secondary albedo */
  base: string;
  base2: string;
  atmo: string;
  radius: number;
  /** continent frequency */
  feature: number;
  city: number;
  cloud: number;
  spec: number;
  atmoStrength: number;
  /** 1 = latitude bands (gas giant), 0 = continents */
  bands: 0 | 1;
  /** slow axial spin, rad/s */
  spin: number;
  tilt: number;
  ring?: { inner: number; outer: number; color: string; opacity: number };
  /** dock ring radius as a multiple of the body radius */
  dockScale?: number;
  /** a single steady light pinned to the night side */
  beacon?: { color: string; size: number };
  /** scaffolding frame instead of a finished world */
  scaffold?: boolean;
};

export const WORLDS: Record<string, WorldDef> = {
  spydernetwork: {
    id: "spydernetwork",
    base: "#07182c",
    base2: "#1b2a33",
    atmo: "#6ea8ff",
    radius: 0.225,
    feature: 2.6,
    city: 1.0,
    cloud: 0.38,
    spec: 0.95,
    atmoStrength: 0.3,
    bands: 0,
    spin: 0.05,
    tilt: 0.36,
  },
  glowdaily: {
    id: "glowdaily",
    base: "#25150b",
    base2: "#4a3016",
    atmo: "#ff9a5c",
    radius: 0.195,
    feature: 2.2,
    city: 0.9,
    cloud: 0.16,
    spec: 0.06,
    atmoStrength: 0.2,
    bands: 0,
    spin: 0.042,
    tilt: -0.22,
  },
  "stuart-softball": {
    id: "stuart-softball",
    base: "#17171a",
    base2: "#2c2a25",
    atmo: "#6ee7b7",
    radius: 0.155,
    feature: 3.4,
    city: 0.16,
    cloud: 0,
    spec: 0,
    atmoStrength: 0.07,
    bands: 0,
    spin: 0.062,
    tilt: 0.5,
    // the one stadium-sized light on the night side
    beacon: { color: "#6ee7b7", size: 2.6 },
  },
  "sob-rentals": {
    id: "sob-rentals",
    base: "#061d28",
    base2: "#25301d",
    atmo: "#7dd3fc",
    radius: 0.2,
    feature: 3.0,
    city: 0.72,
    cloud: 0.22,
    spec: 1.0,
    atmoStrength: 0.24,
    bands: 0,
    spin: 0.048,
    tilt: 0.28,
  },
  "calming-the-chaos": {
    id: "calming-the-chaos",
    base: "#12181a",
    base2: "#232c2d",
    atmo: "#9be7d8",
    radius: 0.17,
    feature: 3.8,
    city: 0.2,
    cloud: 0,
    spec: 0,
    atmoStrength: 0.05,
    bands: 0,
    spin: 0.03,
    tilt: 0.14,
  },
  holotracker: {
    id: "holotracker",
    base: "#141019",
    base2: "#231c2c",
    atmo: "#c084fc",
    radius: 0.125,
    feature: 4.2,
    city: 0.4,
    cloud: 0,
    spec: 0.1,
    atmoStrength: 0.08,
    bands: 0,
    spin: 0.08,
    tilt: 0.62,
    scaffold: true,
  },
  porchlight: {
    id: "porchlight",
    base: "#140e0c",
    base2: "#241713",
    atmo: "#ffd79a",
    radius: 0.15,
    feature: 3.1,
    city: 0.1,
    cloud: 0.08,
    spec: 0,
    atmoStrength: 0.08,
    bands: 0,
    spin: 0.036,
    tilt: -0.4,
    // the porch light itself
    beacon: { color: "#ffd79a", size: 2.1 },
  },
  t3kdesigns: {
    id: "t3kdesigns",
    base: "#0c0a15",
    base2: "#191527",
    atmo: "#9b87c7",
    radius: 0.255,
    feature: 2.8,
    city: 0.55,
    cloud: 0.12,
    spec: 0.2,
    atmoStrength: 0.26,
    bands: 0,
    spin: 0.034,
    tilt: 0.2,
    // the hub's slender orbital ring, held well inside its dock
    ring: { inner: 0.33, outer: 0.44, color: "#cbb6ff", opacity: 0.5 },
    dockScale: 2.75,
  },
};

/**
 * The later systems: smaller bodies in the gaps between the first eight,
 * same recipe, each tuned toward the world it is on /explore.
 */
Object.assign(WORLDS, {
  sts: {
    id: "sts", base: "#2a2410", base2: "#6a5f28", atmo: "#ffcf80", radius: 0.14,
    feature: 3.4, city: 0.5, cloud: 0.12, spec: 0, atmoStrength: 0.16, bands: 0,
    spin: 0.04, tilt: 0.3, beacon: { color: "#f2c46d", size: 1.4 },
  },
  georgeandnicks: {
    id: "georgeandnicks", base: "#140e0c", base2: "#4a1f15", atmo: "#ff8a5c", radius: 0.15,
    feature: 3.0, city: 0.9, cloud: 0, spec: 0, atmoStrength: 0.12, bands: 0,
    spin: 0.035, tilt: -0.3, beacon: { color: "#ff7a52", size: 1.8 },
  },
  kimscleaning: {
    id: "kimscleaning", base: "#7f9ca2", base2: "#dcebeb", atmo: "#bff6ee", radius: 0.13,
    feature: 1.8, city: 0.08, cloud: 0, spec: 0.4, atmoStrength: 0.18, bands: 1,
    spin: 0.03, tilt: 0.4,
    ring: { inner: 0.19, outer: 0.215, color: "#e6fffb", opacity: 0.55 },
  },
  appanoosegolf: {
    id: "appanoosegolf", base: "#0f2410", base2: "#3f7a34", atmo: "#a8f0b0", radius: 0.15,
    feature: 3.2, city: 0.1, cloud: 0.14, spec: 0.2, atmoStrength: 0.16, bands: 0,
    spin: 0.04, tilt: 0.2, beacon: { color: "#ffd9a0", size: 1.6 },
  },
  barberstucco: {
    id: "barberstucco", base: "#5a5347", base2: "#d8cdb6", atmo: "#efe4cf", radius: 0.12,
    feature: 4.0, city: 0.05, cloud: 0, spec: 0, atmoStrength: 0.05, bands: 0,
    spin: 0.03, tilt: -0.45,
  },
  debtangel: {
    id: "debtangel", base: "#5d6c86", base2: "#c9d6ec", atmo: "#c9dcff", radius: 0.14,
    feature: 2.0, city: 0.05, cloud: 0.18, spec: 0.15, atmoStrength: 0.18, bands: 1,
    spin: 0.025, tilt: 0.25, beacon: { color: "#eef3ff", size: 1.8 },
  },
  donjulio: {
    id: "donjulio", base: "#3a160c", base2: "#a14c28", atmo: "#ff9a74", radius: 0.145,
    feature: 3.0, city: 0.85, cloud: 0, spec: 0, atmoStrength: 0.16, bands: 0,
    spin: 0.038, tilt: -0.2,
  },
} satisfies Record<string, WorldDef>);

/**
 * Somewhere to fly that is not work. Scenery only — never in the dock,
 * never clickable, but far enough out that a run there reads as a journey.
 */
export type OuterDef = WorldDef & { position: [number, number, number] };

export const OUTER: OuterDef[] = [
  {
    id: "outer-giant",
    base: "#32241a",
    base2: "#6d5237",
    atmo: "#e3b483",
    radius: 0.8,
    feature: 1.4,
    city: 0,
    cloud: 0.1,
    spec: 0,
    atmoStrength: 0.22,
    bands: 1,
    spin: 0.02,
    tilt: 0.24,
    position: [-18.0, -11.0, -28.0],
    ring: { inner: 1.2, outer: 1.85, color: "#c9a882", opacity: 0.32 },
  },
  {
    id: "outer-rust",
    base: "#2a1310",
    base2: "#53281a",
    atmo: "#e08a5c",
    radius: 0.42,
    feature: 3.2,
    city: 0,
    cloud: 0.05,
    spec: 0,
    atmoStrength: 0.12,
    bands: 0,
    spin: 0.028,
    tilt: -0.5,
    position: [27.0, 7.0, -20.0],
  },
  {
    id: "outer-ice",
    base: "#16242c",
    base2: "#5b7f8c",
    atmo: "#bfe8ff",
    radius: 0.46,
    feature: 4.0,
    city: 0,
    cloud: 0.12,
    spec: 0.35,
    atmoStrength: 0.2,
    bands: 0,
    spin: 0.022,
    tilt: 0.68,
    position: [8.0, 14.0, -33.0],
  },
];

/** Dock geometry is derived, so a world can change size without a second edit. */
export const dockRadius = (w: WorldDef) => w.radius * (w.dockScale ?? 1.95);
export const DOCK_LIGHTS = 14;

/** Deterministic per-world phase so the whole city does not tick in unison. */
export const worldPhase = (i: number) => srand(i * 17.3) * Math.PI * 2;
