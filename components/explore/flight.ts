import * as THREE from "three";
import { allBodies, hub, worlds, type Body } from "./layout";
import { exploreStore } from "./store";

/**
 * The craft. Kinematic, not physical: impulse, damping, a speed cap, and an
 * arrive-and-park behaviour. It lives outside React on purpose — it is
 * mutated every frame and nothing in the DOM needs to re-render for it.
 */
export type Mode = "free" | "travel" | "orbit" | "ease";

const MAX_SPEED = 18;
/** space has no drag; a toy does, or you drift into the void forever */
const DRAG = 0.36;
const STEER = 2.4;
/** world units per second along a parking orbit */
const ORBIT_SPEED = 2.4;
/** soft edge of the map */
const BOUNDARY = 150;

export const CAM_MIN = 3.2;
export const CAM_MAX = 16;

const UP = new THREE.Vector3(0, 1, 0);
const FWD_Z = new THREE.Vector3(0, 0, 1);
const ZERO = new THREE.Vector3();

export const flight = {
  pos: new THREE.Vector3(),
  vel: new THREE.Vector3(),
  /** smoothed heading — what the hull and the camera follow */
  fwd: new THREE.Vector3(0, 0, 1),
  quat: new THREE.Quaternion(),
  bank: 0,
  /** 0..1, drives the ion burn */
  thrust: 0,
  mode: "orbit" as Mode,
  target: null as Body | null,
  body: null as Body | null,
  orbit: {
    u: new THREE.Vector3(1, 0, 0),
    v: new THREE.Vector3(0, 0, 1),
    angle: 0,
    /** 0 → 1 while settling onto the circle, so entry never snaps */
    blend: 1,
  },
  ease: {
    from: new THREE.Vector3(),
    to: new THREE.Vector3(),
    t: 0,
    dur: 1.6,
  },
  /** a world just left is not re-captured until we are clear of it */
  ignore: null as Body | null,
  camDist: 7,
  reduced: false,
};

/** Set by the canvas: in reduced-motion the loop is on demand. */
export const runtime = { kick: () => {} };

// scratch
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();

function tangentAt(out: THREE.Vector3) {
  const { u, v, angle } = flight.orbit;
  return out
    .copy(u)
    .multiplyScalar(-Math.sin(angle))
    .addScaledVector(v, Math.cos(angle));
}

function orbitPoint(b: Body, out: THREE.Vector3) {
  const { u, v, angle } = flight.orbit;
  return out
    .copy(u)
    .multiplyScalar(Math.cos(angle) * b.orbitR)
    .addScaledVector(v, Math.sin(angle) * b.orbitR)
    .add(b.center);
}

/**
 * Settle onto a circle through the current position, in a plane biased
 * toward the equator so the planet reads level on screen, turning the way
 * we were already travelling.
 */
function enterOrbit(b: Body) {
  const u = _a.copy(flight.pos).sub(b.center);
  if (u.lengthSq() < 1e-6) u.set(1, 0, 0);
  u.normalize();

  const n = _b.copy(u).cross(flight.vel);
  if (n.lengthSq() < 1e-4) n.copy(u).cross(UP);
  if (n.lengthSq() < 1e-4) n.set(1, 0, 0);
  n.normalize();
  n.addScaledVector(UP, n.dot(UP) >= 0 ? 1.4 : -1.4).normalize();

  u.addScaledVector(n, -u.dot(n)).normalize();
  const v = _c.copy(n).cross(u);
  if (v.dot(flight.vel) < 0) v.negate();

  flight.orbit.u.copy(u);
  flight.orbit.v.copy(v);
  flight.orbit.angle = 0;
  flight.orbit.blend = 0;

  flight.mode = "orbit";
  flight.body = b;
  flight.target = null;
  exploreStore.setParked(b.id);
}

export function spawn() {
  const b = hub;
  flight.body = b;
  flight.target = null;
  flight.ignore = null;
  flight.mode = "orbit";
  // chosen by projection: the hub arrives half-lit, and the orbit carries
  // the camera round to a backlit hub with the spiral rising behind it
  const a = THREE.MathUtils.degToRad(115);
  flight.orbit.u.set(Math.cos(a), 0, Math.sin(a));
  flight.orbit.v.copy(UP).cross(flight.orbit.u).normalize();
  flight.orbit.angle = 0;
  flight.orbit.blend = 1;
  orbitPoint(b, flight.pos);
  tangentAt(flight.fwd);
  flight.vel.copy(flight.fwd).multiplyScalar(ORBIT_SPEED);
  flight.thrust = 0;
  flight.bank = 0;
  exploreStore.setParked(b.id);
}

export function resetFlight() {
  spawn();
  flight.camDist = defaultCam();
  runtime.kick();
}

let coarse = false;
export function setCoarse(v: boolean) {
  coarse = v;
}
export const defaultCam = () => (coarse ? 7.8 : 7);

export function flyTo(b: Body) {
  exploreStore.touch();
  if (flight.body === b && flight.mode === "orbit") return;

  if (flight.reduced) {
    // no burn: ease the whole rig to a parking point, facing the planet
    flight.ease.from.copy(flight.pos);
    const dir = _a.copy(flight.pos).sub(b.center);
    if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
    dir.normalize();
    flight.ease.to.copy(b.center).addScaledVector(dir, b.orbitR);
    flight.ease.t = 0;
    flight.mode = "ease";
    flight.target = b;
    flight.body = null;
    exploreStore.setTarget(b.id);
    runtime.kick();
    return;
  }

  flight.ignore = null;
  flight.mode = "travel";
  flight.target = b;
  flight.body = null;
  flight.thrust = 1;
  exploreStore.setTarget(b.id);
}

export function burn(dir: THREE.Vector3, strength: number) {
  exploreStore.touch();
  if (flight.reduced) return;
  if (flight.body) flight.ignore = flight.body;
  flight.mode = "free";
  flight.body = null;
  flight.target = null;
  flight.vel.addScaledVector(dir, strength);
  if (flight.vel.length() > MAX_SPEED) flight.vel.setLength(MAX_SPEED);
  flight.thrust = 1;
  exploreStore.free();
}

const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** Advance the craft. Returns true while something is still moving. */
export function step(dt: number): boolean {
  const f = flight;
  let moving = true;

  if (f.mode === "orbit" && f.body) {
    const b = f.body;
    if (!f.reduced) f.orbit.angle += (ORBIT_SPEED / b.orbitR) * dt;
    f.orbit.blend = Math.min(1, f.orbit.blend + dt * 0.7);
    orbitPoint(b, _a);
    const k = 1 - Math.exp(-(1.5 + 6 * f.orbit.blend) * dt);
    f.pos.lerp(_a, k);
    tangentAt(_b);
    f.vel.copy(_b).multiplyScalar(ORBIT_SPEED);
    moving = !f.reduced || f.pos.distanceToSquared(_a) > 1e-4;
  } else if (f.mode === "travel" && f.target) {
    const b = f.target;
    const off = _a.copy(f.pos).sub(b.center);
    const dist = off.length();
    off.divideScalar(Math.max(dist, 1e-4));

    // aim beside the planet, not at it, so we sweep into orbit
    const side = _b.copy(UP).cross(off);
    if (side.lengthSq() < 1e-4) side.set(1, 0, 0);
    side.normalize();
    const entry = _c
      .copy(off)
      .addScaledVector(side, 0.9)
      .normalize()
      .multiplyScalar(b.orbitR)
      .add(b.center);

    const toEntry = entry.sub(f.pos);
    const d = toEntry.length();
    const speed = Math.min(MAX_SPEED, ORBIT_SPEED + d * 1.1);
    const desired = toEntry.multiplyScalar(speed / Math.max(d, 1e-4));

    // steer around anything in the way
    for (const o of allBodies) {
      if (o === b) continue;
      const away = _b.copy(f.pos).sub(o.center);
      const od = away.length();
      const clear = o.radius * 3.2 + 2;
      if (od < clear) desired.addScaledVector(away.divideScalar(od), (clear - od) * 2.2);
    }

    const accel = _a.copy(desired).sub(f.vel);
    f.thrust = Math.max(f.thrust * Math.exp(-2 * dt), Math.min(1, accel.length() / 7));
    f.vel.addScaledVector(accel, 1 - Math.exp(-STEER * dt));
    f.pos.addScaledVector(f.vel, dt);

    if (dist <= b.orbitR * 1.06 || d < 0.8) enterOrbit(b);
  } else if (f.mode === "ease" && f.target) {
    f.ease.t = Math.min(1, f.ease.t + dt / f.ease.dur);
    const e = easeInOut(f.ease.t);
    f.pos.lerpVectors(f.ease.from, f.ease.to, e);
    f.vel.copy(f.ease.to).sub(f.ease.from).multiplyScalar(0.001);
    if (f.ease.t >= 1) enterOrbit(f.target);
  } else {
    // free flight
    f.vel.multiplyScalar(Math.exp(-DRAG * dt));
    const r = f.pos.length();
    if (r > BOUNDARY) f.vel.addScaledVector(_a.copy(f.pos).divideScalar(r), -(r - BOUNDARY) * 0.9 * dt);
    f.pos.addScaledVector(f.vel, dt);
    f.thrust *= Math.exp(-2.4 * dt);

    // near a world: park. The one just left is ignored until we are clear.
    if (f.ignore && f.pos.distanceTo(f.ignore.center) > f.ignore.orbitR * 1.4) f.ignore = null;
    for (const w of worlds) {
      if (w === f.ignore) continue;
      if (f.pos.distanceTo(w.center) < w.orbitR * 1.05) {
        enterOrbit(w);
        break;
      }
    }
    moving = f.vel.lengthSq() > 1e-3;
  }

  // never inside a crust, whatever else happened
  for (const b of allBodies) {
    const off = _a.copy(f.pos).sub(b.center);
    const d = off.length();
    const min = b.radius * (b.project ? 1.55 : 1.25);
    if (d < min) {
      off.divideScalar(Math.max(d, 1e-4));
      f.pos.copy(b.center).addScaledVector(off, min);
      const vn = f.vel.dot(off);
      if (vn < 0) f.vel.addScaledVector(off, -vn);
    }
  }

  // heading follows velocity; bank into the turn
  const prev = _b.copy(f.fwd);
  if (f.mode === "orbit") tangentAt(_c);
  else if (f.vel.lengthSq() > 0.16) _c.copy(f.vel).normalize();
  else _c.copy(f.fwd);
  f.fwd.lerp(_c, 1 - Math.exp(-4 * dt)).normalize();

  const turn = Math.asin(THREE.MathUtils.clamp(prev.cross(f.fwd).dot(UP), -1, 1)) / Math.max(dt, 1e-4);
  f.bank = THREE.MathUtils.damp(f.bank, THREE.MathUtils.clamp(-turn * 0.45, -0.7, 0.7), 3, dt);

  const up = Math.abs(f.fwd.dot(UP)) > 0.98 ? FWD_Z : UP;
  _m.lookAt(f.fwd, ZERO, up);
  f.quat.setFromRotationMatrix(_m).multiply(_q.setFromAxisAngle(FWD_Z, f.bank));

  return moving || f.thrust > 0.02;
}
