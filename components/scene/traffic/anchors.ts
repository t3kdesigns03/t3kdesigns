import * as THREE from "three";
import { srand } from "../color";
import { nodeSpots } from "../nodeLayout";
import { OUTER, WORLDS, dockRadius, type WorldDef } from "./worlds";

export const HUB_ID = "t3kdesigns";

/**
 * Bodies are drawn larger on a phone. A planet that reads at 30px on a
 * desktop is 9px on a portrait phone, which is why mobile looked empty —
 * so the whole layer multiplies through this one number, set by <Traffic>
 * before its children render. Positions are untouched; only sizes change.
 */
export const layout = { worldScale: 1 };

/**
 * Every destination in the traffic layer, project or scenery, resolved to
 * one place. Project worlds read their position straight off nodeSpots —
 * the same array the 3D constellation and the mission dock already use, so
 * traffic can never drift out of sync with the nodes it serves.
 */
export type Anchor = {
  id: string;
  def: WorldDef;
  position: THREE.Vector3;
  /** orientation of the dock ring / equatorial plane */
  quat: THREE.Quaternion;
  /** unscaled dock radius; read it through dockR() */
  baseDockR: number;
  accent: string;
  isProject: boolean;
};

function orientation(seed: number) {
  const e = new THREE.Euler(
    (srand(seed * 2.7) - 0.5) * 1.1,
    srand(seed * 5.3) * Math.PI * 2,
    (srand(seed * 9.1) - 0.5) * 0.7,
  );
  return new THREE.Quaternion().setFromEuler(e);
}

const projectAnchors: Anchor[] = nodeSpots
  .filter((s) => WORLDS[s.id])
  .map((s, i) => {
    const def = WORLDS[s.id];
    return {
      id: s.id,
      def,
      position: new THREE.Vector3(...s.position),
      quat: orientation(i + 1),
      baseDockR: dockRadius(def),
      accent: s.color,
      isProject: true,
    };
  });

const outerAnchors: Anchor[] = OUTER.map((o, i) => ({
  id: o.id,
  def: o,
  position: new THREE.Vector3(...o.position),
  quat: orientation(i + 40),
  baseDockR: o.radius * 1.6,
  accent: o.atmo,
  isProject: false,
}));

export const anchors: Anchor[] = [...projectAnchors, ...outerAnchors];

/** Dock radius in world units, at the current layout scale. */
export const dockR = (a: Anchor) => a.baseDockR * layout.worldScale;
export const projectAnchorList = projectAnchors;
export const outerAnchorList = outerAnchors;

export const anchorById = (id: string) =>
  anchors.find((a) => a.id === id) ?? null;

export const hub = anchorById(HUB_ID) ?? projectAnchors[0];

const _v = new THREE.Vector3();

/** A point on an anchor's dock ring at angle `a`, in world space. */
export function ringPoint(
  a: Anchor,
  angle: number,
  out = new THREE.Vector3(),
  radiusScale = 1,
) {
  out
    .set(Math.cos(angle), 0, Math.sin(angle))
    .multiplyScalar(dockR(a) * radiusScale)
    .applyQuaternion(a.quat)
    .add(a.position);
  return out;
}

/** Tangent of the dock ring at angle `a` — the direction a docked ship faces. */
export function ringTangent(
  a: Anchor,
  angle: number,
  out = new THREE.Vector3(),
) {
  out
    .set(-Math.sin(angle), 0, Math.cos(angle))
    .applyQuaternion(a.quat)
    .normalize();
  return out;
}

/** Ring plane normal — crew stand along it, ships approach across it. */
export function ringNormal(a: Anchor, out = new THREE.Vector3()) {
  return out.set(0, 1, 0).applyQuaternion(a.quat).normalize();
}

/** The night side of a body, given the core at the origin lights it. */
export function nightPoint(a: Anchor, scale = 0.94, out = new THREE.Vector3()) {
  _v.copy(a.position).normalize();
  return out
    .copy(a.position)
    .addScaledVector(_v, a.def.radius * layout.worldScale * scale);
}
