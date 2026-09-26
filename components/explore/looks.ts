/**
 * What each body looks like on /explore. The homepage draws its worlds a
 * few pixels across and one shader covers them all; here a world fills a
 * third of the screen, so each one gets its own surface recipe (the `kind`
 * switch in shaders.ts) and its own palette. Accent colours come from
 * lib/projects.ts and stay trim — atmosphere, lights — never the albedo.
 */
export const KIND = {
  studio: 0,
  ocean: 1,
  amber: 2,
  rock: 3,
  archipelago: 4,
  moon: 5,
  station: 6,
  night: 7,
  giant: 8,
  ice: 9,
  // outer ring
  farm: 10,
  ember: 11,
  pristine: 12,
  fairway: 13,
  quarry: 14,
  silver: 15,
  terracotta: 16,
  // studio products added since
  holler: 17,
} as const;

export type Look = {
  kind: number;
  /** palette: deep / mid / high */
  a: string;
  b: string;
  c: string;
  atmo: string;
  /** limb brightness; 0 = airless */
  atmoStrength: number;
  /** atmosphere scale height as a fraction of the radius */
  atmoHeight: number;
  /** night-light colour and how much of it there is */
  lights: string;
  lightAmount: number;
  cloud: number;
  spec: number;
  /** axial spin, rad/s; 0 = tidally locked (anything with a fixed landmark) */
  spin: number;
  /** annulus, in multiples of the radius */
  ring?: {
    inner: number;
    outer: number;
    color: string;
    opacity: number;
    ringlet?: boolean;
    /** the far edge fades to this colour (default: `color`) */
    color2?: string;
    /** a few thin concentric lines — a ripple — instead of a banded sheet */
    ripple?: boolean;
  };
  /** a landmark pinned just past the terminator: stadium, outpost, porch */
  marker?: { azimuth: number; size: number; glow: string };
};

export const LOOKS: Record<string, Look> = {
  // dark hub; the slender ring is the feature
  t3kdesigns: {
    kind: KIND.studio,
    a: "#08070d",
    b: "#15121e",
    c: "#2b2540",
    atmo: "#9d8ad6",
    atmoStrength: 0.55,
    atmoHeight: 0.035,
    lights: "#d9ccff",
    lightAmount: 1.4,
    cloud: 0,
    spec: 0.12,
    spin: 0.018,
    ring: { inner: 1.46, outer: 1.74, color: "#cfc2f2", opacity: 0.5, ringlet: true },
  },
  // ocean, thin cloud, a string of coastal light
  spydernetwork: {
    kind: KIND.ocean,
    a: "#041428",
    b: "#1f3a33",
    c: "#5a5a45",
    atmo: "#6fa6ff",
    atmoStrength: 0.9,
    atmoHeight: 0.045,
    lights: "#ffd9a8",
    lightAmount: 1.4,
    cloud: 0.55,
    spec: 0.6,
    spin: 0.024,
  },
  // warm amber air, tea-gold towns
  glowdaily: {
    kind: KIND.amber,
    a: "#2e1508",
    b: "#8a4d1c",
    c: "#e0a458",
    atmo: "#ffa15e",
    atmoStrength: 1.1,
    atmoHeight: 0.05,
    lights: "#ffc56e",
    lightAmount: 1.4,
    cloud: 0.3,
    spec: 0.05,
    spin: 0.02,
  },
  // small rock, one stadium on the night side
  "stuart-softball": {
    kind: KIND.rock,
    a: "#1a1a1c",
    b: "#3a3833",
    c: "#6b675c",
    atmo: "#8ff0c8",
    atmoStrength: 0.18,
    atmoHeight: 0.025,
    lights: "#eafff2",
    lightAmount: 1.4,
    cloud: 0,
    spec: 0,
    spin: 0,
    marker: { azimuth: 0.6, size: 1, glow: "#6ee7b7" },
  },
  // water specular, marina specks
  "sob-rentals": {
    kind: KIND.archipelago,
    a: "#03203a",
    b: "#0f7f8f",
    c: "#c8b98a",
    atmo: "#7fd6ff",
    atmoStrength: 0.8,
    atmoHeight: 0.04,
    lights: "#c4f4ff",
    lightAmount: 1.4,
    cloud: 0.25,
    spec: 1.4,
    spin: 0.022,
  },
  // graphite / teal moon, a quiet outpost
  "calming-the-chaos": {
    kind: KIND.moon,
    a: "#151a1b",
    b: "#2b3234",
    c: "#3aa597",
    atmo: "#9be7d8",
    atmoStrength: 0.12,
    atmoHeight: 0.02,
    lights: "#c9fff4",
    lightAmount: 1.4,
    cloud: 0,
    spec: 0.1,
    spin: 0,
    marker: { azimuth: 2.3, size: 0.6, glow: "#9be7d8" },
  },
  // an unfinished station, not a marble
  holotracker: {
    kind: KIND.station,
    a: "#1c1a22",
    b: "#3b3846",
    c: "#6a6578",
    atmo: "#c084fc",
    atmoStrength: 0,
    atmoHeight: 0.02,
    lights: "#e2c6ff",
    lightAmount: 1.4,
    cloud: 0,
    spec: 0.6,
    spin: 0.03,
  },
  // dark warm night, one porch light
  porchlight: {
    kind: KIND.night,
    a: "#0d0806",
    b: "#23150e",
    c: "#4a2e1c",
    atmo: "#ffb875",
    atmoStrength: 0.35,
    atmoHeight: 0.04,
    lights: "#ffd79a",
    lightAmount: 1.4,
    cloud: 0,
    spec: 0,
    spin: 0,
    marker: { azimuth: -1.1, size: 1, glow: "#ffd79a" },
  },
  // —— outer ring ——
  // warm small-town world: patchwork fields, tea-gold lights, one outpost
  sts: {
    kind: KIND.farm,
    a: "#2a2410",
    b: "#5b5a22",
    c: "#b08a3e",
    atmo: "#ffcf80",
    atmoStrength: 0.75,
    atmoHeight: 0.045,
    lights: "#ffc867",
    lightAmount: 1.4,
    cloud: 0.2,
    spec: 0,
    spin: 0,
    marker: { azimuth: 1.9, size: 0.7, glow: "#f2c46d" },
  },
  // brick and charcoal, embers in the cracks, a square of lights
  georgeandnicks: {
    kind: KIND.ember,
    a: "#140e0c",
    b: "#3a1d15",
    c: "#6b2a1a",
    atmo: "#ff8a5c",
    atmoStrength: 0.5,
    atmoHeight: 0.04,
    lights: "#ffb070",
    lightAmount: 1.4,
    cloud: 0,
    spec: 0,
    spin: 0,
    marker: { azimuth: 2.6, size: 1, glow: "#ff7a52" },
  },
  // ice-white and pale teal, crisp and spare, one fine ring
  kimscleaning: {
    kind: KIND.pristine,
    a: "#7f9ca2",
    b: "#b9d3d5",
    c: "#dcebeb",
    atmo: "#bff6ee",
    atmoStrength: 0.6,
    atmoHeight: 0.03,
    lights: "#e9fffb",
    lightAmount: 1.2,
    cloud: 0,
    spec: 0.45,
    spin: 0.02,
    ring: { inner: 1.5, outer: 1.62, color: "#e6fffb", opacity: 0.55 },
  },
  // green fairways, sand, a pond or two, one clubhouse light
  appanoosegolf: {
    kind: KIND.fairway,
    a: "#0f2410",
    b: "#2f6a2a",
    c: "#d9cf9a",
    atmo: "#a8f0b0",
    atmoStrength: 0.7,
    atmoHeight: 0.04,
    lights: "#ffe2a8",
    lightAmount: 1.4,
    cloud: 0.25,
    spec: 0.2,
    spin: 0,
    marker: { azimuth: 0.2, size: 1, glow: "#ffd9a0" },
  },
  // limestone / stucco-dust moon cut by quarry terraces
  barberstucco: {
    kind: KIND.quarry,
    a: "#5a5347",
    b: "#a79b85",
    c: "#e3d8c2",
    atmo: "#efe4cf",
    atmoStrength: 0.12,
    atmoHeight: 0.02,
    lights: "#ffe6c0",
    lightAmount: 1.2,
    cloud: 0,
    spec: 0,
    spin: 0.016,
  },
  // pale silver-blue, quiet, one guiding point of light
  debtangel: {
    kind: KIND.silver,
    a: "#5d6c86",
    b: "#a9b8d2",
    c: "#dfe7f5",
    atmo: "#c9dcff",
    atmoStrength: 0.7,
    atmoHeight: 0.04,
    lights: "#f2f6ff",
    lightAmount: 1.3,
    cloud: 0.2,
    spec: 0.15,
    spin: 0,
    marker: { azimuth: 3.3, size: 1, glow: "#dfe9ff" },
  },
  // terracotta mesas under a night market's string lights
  donjulio: {
    kind: KIND.terracotta,
    a: "#3a160c",
    b: "#8c3f22",
    c: "#c9784a",
    atmo: "#ff9a74",
    atmoStrength: 0.7,
    atmoHeight: 0.045,
    lights: "#ffc07a",
    lightAmount: 1.4,
    cloud: 0,
    spec: 0,
    spin: 0.018,
  },
  // —— studio products added since ——
  // HOLLER! — a night-market world lifted off the app's own map: violet
  // asphalt, mint rivers, gold and ember venues burning like live lines,
  // and the pin (The Fair) shouting mint-and-violet rings across the ground.
  // The logo's ripple becomes the planet's ring, its magenta rim the limb.
  holler: {
    kind: KIND.holler,
    a: "#0b0916",
    b: "#1a1430",
    c: "#3a2a5c",
    atmo: "#e85cf0",
    atmoStrength: 0.85,
    atmoHeight: 0.045,
    lights: "#ffc43d",
    lightAmount: 1.4,
    cloud: 0,
    spec: 0.07,
    spin: 0,
    ring: { inner: 1.42, outer: 2.02, color: "#5fe6f5", color2: "#8b7cff", opacity: 0.85, ripple: true },
    marker: { azimuth: 1.35, size: 1, glow: "#ff2d6a" },
  },
  "scenery-giant": {
    kind: KIND.giant,
    a: "#3a2616",
    b: "#8d6a45",
    c: "#d8b98c",
    atmo: "#f0c392",
    atmoStrength: 0.6,
    atmoHeight: 0.03,
    lights: "#000000",
    lightAmount: 0,
    cloud: 0,
    spec: 0,
    spin: 0.01,
    ring: { inner: 1.45, outer: 2.25, color: "#cdb08a", opacity: 0.55 },
  },
  "scenery-ice": {
    kind: KIND.ice,
    a: "#23394a",
    b: "#7b98a8",
    c: "#dcebf2",
    atmo: "#bfe8ff",
    atmoStrength: 0.35,
    atmoHeight: 0.03,
    lights: "#000000",
    lightAmount: 0,
    cloud: 0,
    spec: 0.5,
    spin: 0.012,
  },
};

/**
 * The HUD's Director chips: a short label for tight rows (the full name and
 * one-liner still come from lib/projects.ts), and
 * — where the surface palette above would not read at 30px — the three
 * tones the little sphere is painted in: lit, mid, shadow.
 */
export const CHIP: Record<string, { short: string; tones?: [string, string, string] }> = {
  t3kdesigns: { short: "Studio", tones: ["#6a5c9c", "#241d3a", "#08070d"] },
  spydernetwork: { short: "Spyder", tones: ["#4f8fe0", "#123f78", "#041428"] },
  glowdaily: { short: "GlowDaily", tones: ["#f4b865", "#b0602a", "#3a1a0a"] },
  "stuart-softball": { short: "SSL", tones: ["#8a877c", "#3a3833", "#141416"] },
  "sob-rentals": { short: "SOB", tones: ["#46d2cf", "#0f7f8f", "#03203a"] },
  "calming-the-chaos": { short: "CTC", tones: ["#5f7372", "#262e30", "#0e1213"] },
  holotracker: { short: "HoloTracker", tones: ["#8a8398", "#3b3846", "#1c1a22"] },
  porchlight: { short: "Porchlight", tones: ["#7a4a2c", "#2a1810", "#0b0705"] },
  sts: { short: "STS" },
  georgeandnicks: { short: "G&N", tones: ["#8a3a24", "#3a1d15", "#140e0c"] },
  kimscleaning: { short: "Kim's", tones: ["#f2fafa", "#b9d3d5", "#6f8d93"] },
  appanoosegolf: { short: "Appanoose", tones: ["#6fcf62", "#2f6a2a", "#0f2410"] },
  barberstucco: { short: "Barber" },
  debtangel: { short: "Debt Angel" },
  donjulio: { short: "Don Julio" },
  holler: { short: "Holler!", tones: ["#4a3a78", "#1a1430", "#0b0916"] },
};
