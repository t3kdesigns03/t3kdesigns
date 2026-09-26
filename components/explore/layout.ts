import * as THREE from "three";
import { projects, type Project } from "@/lib/projects";
import { srand } from "@/components/scene/color";
import { LOOKS, type Look } from "./looks";

/**
 * The /explore map is a system: the studio at the centre, every project on
 * its own circular lane round it in one orbital plane — the studio's own
 * products on the inner lanes, the client sites further out — and two
 * scenery bodies past the last lane. The worlds hold still on their lanes;
 * the lanes are drawn (Planets.tsx), which is what makes it read as orbits
 * rather than a scatter. Radii are about ten times the homepage's — here
 * the planets are the subject, not the trim.
 */
export type Body = {
  id: string;
  name: string;
  /** null for scenery: drawn, collided with, never targeted */
  project: Project | null;
  look: Look;
  center: THREE.Vector3;
  radius: number;
  /** dock ring radius (projects only) */
  dockR: number;
  /** parking orbit radius — always clear of the dock ring */
  orbitR: number;
  accent: string;
  /** spin axis; rings, dock and parking orbit all lie square to it */
  pole: THREE.Vector3;
  /** local +Y → pole, with a per-world twist */
  quat: THREE.Quaternion;
  /** world-space unit direction of the landmark, if the world has one */
  marker: THREE.Vector3 | null;
  /** studio products (inner lanes) or client sites (outer lanes) */
  ring: "inner" | "outer";
  /** radius of its lane round the hub; 0 for the hub and scenery */
  lane: number;
};

/**
 * One key light, high above the plane the worlds orbit in. Every parking
 * orbit lies square to its world's pole, and the poles lean toward this
 * light, so a parked camera — which sits a little above the orbit — always
 * sees a lit world with a band of night along its lower edge. Park anywhere
 * on the circle and the terminator is in shot.
 */
export const LIGHT_DIR = new THREE.Vector3(0.3, 1, 0.2).normalize();
export const LIGHT_POS = LIGHT_DIR.clone().multiplyScalar(900);
/** dim cool fill from the opposite quarter, so night is dark, not void */
export const FILL_DIR = new THREE.Vector3(-0.5, -0.35, 0.8).normalize();

/** a unit vector square to `n`, at angle `a` around it */
export function around(n: THREE.Vector3, a: number) {
  const ref = Math.abs(n.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
  const u = ref.addScaledVector(n, -ref.dot(n)).normalize();
  const v = new THREE.Vector3().crossVectors(n, u);
  return u.multiplyScalar(Math.cos(a)).addScaledVector(v, Math.sin(a));
}

/**
 * The distant spiral hangs just below the orbital plane, which is where a
 * parked camera looks: behind the world, not above it.
 */
export const GALAXY_DIR = around(LIGHT_DIR, 3.7)
  .multiplyScalar(Math.cos(THREE.MathUtils.degToRad(-17)))
  .addScaledVector(LIGHT_DIR, Math.sin(THREE.MathUtils.degToRad(-17)))
  .normalize();

/**
 * The lanes, sun outward. Each world gets a circle of its own in the
 * orbital plane (square to the key light, so every lane is lit the same).
 * Consecutive lanes sit a golden angle apart round the hub, so neighbours
 * on the map are never neighbours in the sky, and no two parking orbits
 * come near each other. The gap between the two groups is deliberate:
 * it is what separates "ours" from "theirs" at a glance.
 */
/** seeds are the ones each world had before it moved to a lane, so its tilt and twist are unchanged */
const HUB_PLACE = { id: "t3kdesigns", seed: 8, r: 2.4, dock: 2.45 };
const LANES: { id: string; seed: number; r: number; dock?: number; ring: Body["ring"] }[] = [
  // the studio's own work — tooling closest to the sun
  { id: "porchlight", seed: 7, r: 1.45, ring: "inner" },
  { id: "spydernetwork", seed: 1, r: 2.2, ring: "inner" },
  { id: "glowdaily", seed: 2, r: 1.9, ring: "inner" },
  { id: "holler", seed: 27, r: 1.9, dock: 2.4, ring: "inner" },
  { id: "stuart-softball", seed: 3, r: 1.5, ring: "inner" },
  { id: "sob-rentals", seed: 4, r: 2.0, ring: "inner" },
  { id: "calming-the-chaos", seed: 5, r: 1.65, ring: "inner" },
  { id: "holotracker", seed: 6, r: 1.25, dock: 2.1, ring: "inner" },
  // client sites
  { id: "sts", seed: 20, r: 1.75, ring: "outer" },
  { id: "georgeandnicks", seed: 21, r: 1.9, ring: "outer" },
  { id: "kimscleaning", seed: 22, r: 1.7, ring: "outer" },
  { id: "appanoosegolf", seed: 23, r: 2.05, ring: "outer" },
  { id: "barberstucco", seed: 24, r: 1.6, ring: "outer" },
  { id: "debtangel", seed: 25, r: 1.8, ring: "outer" },
  { id: "donjulio", seed: 26, r: 1.85, ring: "outer" },
];
const INNER_FIRST = 24;
const INNER_STEP = 7.5;
const OUTER_FIRST = 92;
const OUTER_STEP = 8;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
/** where the first lane's world sits round the hub */
const LANE_START = 0.6;

function laneRadius(i: number) {
  const inner = LANES.filter((l) => l.ring === "inner").length;
  return i < inner ? INNER_FIRST + i * INNER_STEP : OUTER_FIRST + (i - inner) * OUTER_STEP;
}

function laneAt(a: number, R: number): [number, number, number] {
  const v = around(LIGHT_DIR, a).multiplyScalar(R);
  return [v.x, v.y, v.z];
}

function orient(seed: number) {
  const pole = LIGHT_DIR.clone()
    .add(new THREE.Vector3(srand(seed * 2.7) - 0.5, 0, srand(seed * 9.1) - 0.5).multiplyScalar(0.36))
    .normalize();
  const quat = new THREE.Quaternion()
    .setFromUnitVectors(new THREE.Vector3(0, 1, 0), pole)
    .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), srand(seed * 5.3) * Math.PI * 2));
  return { pole, quat };
}

/** well into the night side, where a single light reads */
function markerDir(azimuth: number) {
  return around(LIGHT_DIR, azimuth)
    .multiplyScalar(Math.cos(0.5))
    .addScaledVector(LIGHT_DIR, -Math.sin(0.5))
    .normalize();
}

function makeWorld(
  p: Project,
  seed: number,
  at: [number, number, number],
  r: number,
  dock: number | undefined,
  ring: Body["ring"],
  lane: number,
): Body {
  const look = LOOKS[p.id];
  const dockR = r * (dock ?? 1.95);
  const { pole, quat } = orient(seed);
  return {
    id: p.id,
    name: p.name,
    project: p,
    look,
    center: new THREE.Vector3(...at),
    radius: r,
    dockR,
    orbitR: Math.max(dockR * 1.22, r * 3.1),
    accent: p.color,
    pole,
    quat,
    marker: look.marker ? markerDir(look.marker.azimuth) : null,
    ring,
    lane,
  };
}

function place(): Body[] {
  const hubProject = projects.find((p) => p.id === HUB_PLACE.id);
  const out: Body[] = [];
  if (hubProject && LOOKS[hubProject.id]) {
    out.push(makeWorld(hubProject, HUB_PLACE.seed, [0, 0, 0], HUB_PLACE.r, HUB_PLACE.dock, "inner", 0));
  }
  LANES.forEach((l, i) => {
    const p = projects.find((q) => q.id === l.id);
    if (!p || !LOOKS[p.id]) return;
    const R = laneRadius(i);
    out.push(makeWorld(p, l.seed, laneAt(LANE_START + i * GOLDEN, R), l.r, l.dock, l.ring, R));
  });
  return out;
}

/** Every destination, sun outward: the hub, then one world per lane. */
export const worlds: Body[] = place();

/** lane radii, for drawing the orbits */
export const lanes = worlds.filter((w) => w.lane > 0);

function sceneryBody(id: string, at: [number, number, number], r: number, seed: number): Body {
  const look = LOOKS[id];
  const { pole, quat } = orient(seed);
  return {
    id,
    name: "",
    project: null,
    look,
    center: new THREE.Vector3(...at),
    radius: r,
    dockR: 0,
    orbitR: 0,
    accent: look.atmo,
    pole,
    quat,
    marker: null,
    ring: "outer",
    lane: 0,
  };
}

/** Two scenery bodies, low on the sky so parked shots catch them. */
export const scenery: Body[] = [
  sceneryBody("scenery-giant", [-170, -50, -150], 13, 40),
  sceneryBody("scenery-ice", [178, -40, -100], 5, 41),
];

export const allBodies: Body[] = [...worlds, ...scenery];

export const hub = worlds.find((w) => w.id === "t3kdesigns") ?? worlds[0];

export const worldById = (id: string | null) =>
  id ? worlds.find((w) => w.id === id) ?? null : null;
