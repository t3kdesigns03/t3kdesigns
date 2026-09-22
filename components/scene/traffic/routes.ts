import * as THREE from "three";
import { GALAXY_RADIUS } from "../nodeLayout";
import {
  hub,
  outerAnchorList,
  projectAnchorList,
  ringNormal,
  ringPoint,
  type Anchor,
} from "./anchors";

const TAU = Math.PI * 2;

export type Route = {
  from: Anchor;
  to: Anchor;
  curve: THREE.CatmullRomCurve3;
  length: number;
  angleFrom: number;
  angleTo: number;
};

/**
 * Keep a control point out of the bulge. Ships transferring between nodes
 * skim the arms; nothing flies through the core unless a route deliberately
 * asks for it, because a craft crossing the brightest part of the frame
 * reads as a bug.
 */
function skimDisk(v: THREE.Vector3, up: number) {
  const flat = Math.hypot(v.x, v.z);
  if (flat < GALAXY_RADIUS * 0.82) {
    const k = (GALAXY_RADIUS * 0.9) / Math.max(0.001, flat);
    v.x *= k;
    v.z *= k;
  }
  v.y += up;
}

export function makeRoute(from: Anchor, to: Anchor): Route {
  const angleFrom = Math.random() * TAU;
  const angleTo = Math.random() * TAU;

  const p0 = ringPoint(from, angleFrom);
  const p5 = ringPoint(to, angleTo);

  const out0 = p0.clone().sub(from.position).normalize();
  const out1 = p5.clone().sub(to.position).normalize();
  const n0 = ringNormal(from);
  const n1 = ringNormal(to);

  // leave along the dock normal, arrive along it: the approach has to line up
  const p1 = p0.clone().addScaledVector(n0, 0.3).addScaledVector(out0, 0.85);
  const p4 = p5.clone().addScaledVector(n1, 0.3).addScaledVector(out1, 0.85);

  const side = Math.random() > 0.5 ? 1 : -1;
  const m1 = p1.clone().lerp(p4, 0.34);
  const m2 = p1.clone().lerp(p4, 0.68);
  skimDisk(m1, side * (1.1 + Math.random() * 1.6));
  skimDisk(m2, side * (0.8 + Math.random() * 1.5));

  const curve = new THREE.CatmullRomCurve3(
    [p0, p1, m1, m2, p4, p5],
    false,
    "centripetal",
    0.5,
  );
  curve.arcLengthDivisions = 80;

  return { from, to, curve, length: curve.getLength(), angleFrom, angleTo };
}

/**
 * Traffic has a shape: most of it touches the hub, a little of it leaves
 * the system entirely, and a ship that made the long run out always comes
 * home rather than wandering.
 */
export function pickDestination(from: Anchor, allowOuter: boolean): Anchor {
  if (!from.isProject) return hub;

  const roll = Math.random();
  if (allowOuter && roll < 0.16 && outerAnchorList.length > 0) {
    return outerAnchorList[(Math.random() * outerAnchorList.length) | 0];
  }
  if (from.id !== hub.id && roll < 0.58) return hub;

  const others = projectAnchorList.filter((a) => a.id !== from.id);
  return others[(Math.random() * others.length) | 0] ?? hub;
}
