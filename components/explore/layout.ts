import * as THREE from "three";
import { outerProjects } from "@/lib/outerProjects";
import { projects, type Project } from "@/lib/projects";
import { srand } from "@/components/scene/color";
import { LOOKS, type Look } from "./looks";

/**
 * The /explore map: the inner eight within ~62 units of the hub, the outer
 * seven on a ring about 104 out, two scenery bodies past that. Radii are about ten times the homepage's — here
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
  /** inner eight, or the outer ring */
  ring: "inner" | "outer";
};

const PLACE: Record<string, { at: [number, number, number]; r: number; dock?: number }> = {
  t3kdesigns: { at: [0, 0, 0], r: 2.4, dock: 2.45 },
  spydernetwork: { at: [36, 7, -26], r: 2.2 },
  glowdaily: { at: [-32, -5, -34], r: 1.9 },
  "stuart-softball": { at: [8, -12, -60], r: 1.5 },
  "sob-rentals": { at: [-54, 9, 6], r: 2.0 },
  "calming-the-chaos": { at: [50, -7, 22], r: 1.65 },
  holotracker: { at: [-22, 13, 42], r: 1.25, dock: 2.1 },
  porchlight: { at: [20, 11, 50], r: 1.45 },
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
function around(n: THREE.Vector3, a: number) {
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
 * The outer ring: seven worlds on a wide circle in the orbital plane, well
 * clear of the inner eight (which all sit within ~62 units of the hub), with
 * a little rise and fall so the ring does not read as a ruled line.
 */
const OUTER_R = 104;
const OUTER_PLACE: Record<string, { a: number; lift: number; r: number }> = {
  sts: { a: 0.35, lift: 6, r: 1.75 },
  georgeandnicks: { a: 1.25, lift: -9, r: 1.9 },
  kimscleaning: { a: 2.15, lift: 8, r: 1.7 },
  appanoosegolf: { a: 3.05, lift: -4, r: 2.05 },
  barberstucco: { a: 3.95, lift: 10, r: 1.6 },
  debtangel: { a: 4.8, lift: -7, r: 1.8 },
  donjulio: { a: 5.6, lift: 3, r: 1.85 },
};

function outerAt(a: number, lift: number): [number, number, number] {
  const v = around(LIGHT_DIR, a).multiplyScalar(OUTER_R).addScaledVector(LIGHT_DIR, lift);
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

function makeWorld(p: Project, seed: number, at: [number, number, number], r: number, dock: number | undefined, ring: Body["ring"]): Body {
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
  };
}

const inner: Body[] = projects
  .filter((p) => PLACE[p.id] && LOOKS[p.id])
  .map((p, i) => makeWorld(p, i + 1, PLACE[p.id].at, PLACE[p.id].r, PLACE[p.id].dock, "inner"));

const outer: Body[] = outerProjects
  .filter((p) => OUTER_PLACE[p.id] && LOOKS[p.id])
  .map((p, i) => {
    const o = OUTER_PLACE[p.id];
    return makeWorld(p, 20 + i, outerAt(o.a, o.lift), o.r, undefined, "outer");
  });

/** Fifteen destinations: the inner eight first, then the outer ring. */
export const worlds: Body[] = [...inner, ...outer];

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
