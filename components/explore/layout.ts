import * as THREE from "three";
import { projects, type Project } from "@/lib/projects";
import { srand } from "@/components/scene/color";
import {
  OUTER,
  WORLDS,
  type WorldDef,
} from "@/components/scene/traffic/worlds";

/**
 * The /explore map. Same eight worlds and the same visual definitions as the
 * homepage, but laid out to be flown through rather than looked at: roughly
 * 150 units across, hub at the origin, a 40-unit hop taking ~3 seconds.
 *
 * Radii are about ten times the homepage's — here the planets are the
 * subject, not the trim.
 */
export type Body = {
  id: string;
  name: string;
  /** null for scenery: drawn, collided with, never targeted */
  project: Project | null;
  def: WorldDef;
  center: THREE.Vector3;
  radius: number;
  /** dock ring radius (projects only) */
  dockR: number;
  /** parking orbit radius — always clear of the dock ring */
  orbitR: number;
  accent: string;
  /** orientation of the dock ring / equatorial plane */
  quat: THREE.Quaternion;
};

const PLACE: Record<string, { at: [number, number, number]; r: number }> = {
  t3kdesigns: { at: [0, 0, 0], r: 2.4 },
  spydernetwork: { at: [36, 7, -26], r: 2.2 },
  glowdaily: { at: [-32, -5, -34], r: 1.9 },
  "stuart-softball": { at: [8, -12, -60], r: 1.5 },
  "sob-rentals": { at: [-54, 9, 6], r: 2.0 },
  "calming-the-chaos": { at: [50, -7, 22], r: 1.65 },
  holotracker: { at: [-22, 13, 42], r: 1.25 },
  porchlight: { at: [20, 11, 50], r: 1.45 },
};

/**
 * The key light comes from the same direction as the galaxy hanging in the
 * sky. On the homepage every world is lit by the galactic core; out here the
 * core is that distant spiral, so looking toward it you see the worlds
 * backlit, rimmed by their atmospheres.
 */
export const GALAXY_DIR = new THREE.Vector3(-0.62, 0.3, -0.72).normalize();
export const LIGHT_POS = GALAXY_DIR.clone().multiplyScalar(900);

function orientation(seed: number) {
  return new THREE.Quaternion().setFromEuler(
    new THREE.Euler(
      (srand(seed * 2.7) - 0.5) * 0.7,
      srand(seed * 5.3) * Math.PI * 2,
      (srand(seed * 9.1) - 0.5) * 0.5,
    ),
  );
}

export const worlds: Body[] = projects
  .filter((p) => PLACE[p.id] && WORLDS[p.id])
  .map((p, i) => {
    const def = WORLDS[p.id];
    const { at, r } = PLACE[p.id];
    const dockR = r * (def.dockScale ?? 1.95);
    return {
      id: p.id,
      name: p.name,
      project: p,
      def,
      center: new THREE.Vector3(...at),
      radius: r,
      dockR,
      orbitR: Math.max(dockR * 1.22, r * 2.45),
      accent: p.color,
      quat: orientation(i + 1),
    };
  });

const giantDef = OUTER.find((o) => o.id === "outer-giant")!;
const iceDef = OUTER.find((o) => o.id === "outer-ice")!;

export const scenery: Body[] = [
  {
    id: "scenery-giant",
    name: "",
    project: null,
    def: giantDef,
    center: new THREE.Vector3(-110, 34, -120),
    radius: 11,
    dockR: 0,
    orbitR: 0,
    accent: giantDef.atmo,
    quat: orientation(40),
  },
  {
    id: "scenery-ice",
    name: "",
    project: null,
    def: iceDef,
    center: new THREE.Vector3(120, -30, -70),
    radius: 4.5,
    dockR: 0,
    orbitR: 0,
    accent: iceDef.atmo,
    quat: orientation(41),
  },
];

export const allBodies: Body[] = [...worlds, ...scenery];

export const hub = worlds.find((w) => w.id === "t3kdesigns") ?? worlds[0];

export const worldById = (id: string | null) =>
  id ? worlds.find((w) => w.id === id) ?? null : null;

/** Planetary ring radii scale with the body; the defs are in homepage units. */
export function ringRadii(b: Body) {
  const r = b.def.ring;
  if (!r) return null;
  const k = b.radius / b.def.radius;
  return { inner: r.inner * k, outer: r.outer * k, color: r.color, opacity: r.opacity };
}
