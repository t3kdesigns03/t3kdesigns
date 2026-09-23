import * as THREE from "three";
import { GALAXY_DIR, allBodies, hub, worlds, type Body } from "./layout";
import { exploreStore } from "./store";

/**
 * The craft. Kinematic, not physical: impulse, damping, a speed cap, and an
 * arrive-and-park behaviour. It lives outside React on purpose — it is
 * mutated every frame and nothing in the DOM needs to re-render for it.
 */
export type Mode = "free" | "travel" | "orbit" | "ease";

const MAX_SPEED = 18;
/** autopilot cruise: the outer ring is a hundred units out */
const TRAVEL_MAX = 30;
/** the nameplate comes up this many parking radii out */
const APPROACH = 4.5;
/** space has no drag; a toy does, or you drift into the void forever */
const DRAG = 0.36;
const STEER = 2.4;
/** parked, the craft drifts round slowly: about two minutes a lap */
const ORBIT_OMEGA = 0.05;
/** park a little short of a landmark, so the craft does not sit on it */
const LANDMARK_LEAD = 0.28;
const TAU = Math.PI * 2;
/** soft edge of the map */
const BOUNDARY = 190;

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
  /** the craft's (and the parked camera's) sense of up: the pole it orbits */
  up: new THREE.Vector3(0, 1, 0),
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
    /** an angle to glide round to after arriving (a landmark in view), or null */
    goal: null as number | null,
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
 * Settle onto the world's parking circle — square to its pole, so the
 * rings and the terminator always sit the same way in shot — starting from
 * wherever we arrived and turning the way we were already travelling.
 */
function enterOrbit(b: Body) {
  const n = b.pole;
  const u = _a.copy(flight.pos).sub(b.center);
  u.addScaledVector(n, -u.dot(n));
  if (u.lengthSq() < 1e-6) u.copy(n).cross(FWD_Z);
  u.normalize();
  const v = _c.copy(n).cross(u);
  if (v.dot(flight.vel) < 0) v.negate();

  flight.orbit.u.copy(u);
  flight.orbit.v.copy(v);
  flight.orbit.angle = 0;
  flight.orbit.blend = 0;
  flight.orbit.goal = null;

  // worlds with a landmark: swing round until it is in shot
  if (b.marker) {
    const m = _b.copy(b.marker).addScaledVector(n, -b.marker.dot(n));
    let g = Math.atan2(m.dot(v), m.dot(u)) - LANDMARK_LEAD;
    g = ((g % TAU) + TAU) % TAU;
    if (g > 0.05) flight.orbit.goal = g;
  }

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
  // start on the far side from the distant spiral, so it hangs behind the hub
  const u = flight.orbit.u.copy(GALAXY_DIR).negate();
  u.addScaledVector(b.pole, -u.dot(b.pole)).normalize();
  flight.orbit.v.copy(b.pole).cross(u).normalize();
  flight.orbit.angle = -0.35;
  flight.orbit.blend = 1;
  orbitPoint(b, flight.pos);
  tangentAt(flight.fwd);
  flight.vel.copy(flight.fwd).multiplyScalar(ORBIT_OMEGA * b.orbitR);
  flight.thrust = 0;
  flight.bank = 0;
  flight.up.copy(b.pole);
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
    if (b.marker) dir.copy(b.marker);
    dir.addScaledVector(b.pole, -dir.dot(b.pole));
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
    let w = ORBIT_OMEGA;
    const goal = f.orbit.goal;
    if (goal !== null) {
      const rem = goal - f.orbit.angle;
      if (rem <= 0.01) f.orbit.goal = null;
      else w += Math.min(0.85, rem * 0.6);
    }
    if (!f.reduced) f.orbit.angle += w * dt;
    f.thrust *= Math.exp(-3 * dt);
    f.orbit.blend = Math.min(1, f.orbit.blend + dt * 0.7);
    orbitPoint(b, _a);
    const k = 1 - Math.exp(-(1.5 + 6 * f.orbit.blend) * dt);
    f.pos.lerp(_a, k);
    tangentAt(_b);
    f.vel.copy(_b).multiplyScalar(w * b.orbitR);
    moving = !f.reduced || f.pos.distanceToSquared(_a) > 1e-4 || f.thrust > 0.02;
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
    const speed = Math.min(TRAVEL_MAX, 1.5 + d * 1.1);
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

  // nameplate: parked, or closing on the target
  const aim = f.mode === "orbit" ? f.body : f.mode === "travel" || f.mode === "ease" ? f.target : null;
  const near = aim && (f.mode === "orbit" || f.pos.distanceTo(aim.center) < aim.orbitR * APPROACH);
  exploreStore.setPlate(near && aim ? aim.id : null);

  // heading follows velocity; bank into the turn
  const prev = _b.copy(f.fwd);
  if (f.mode === "orbit") tangentAt(_c);
  else if (f.vel.lengthSq() > 0.16) _c.copy(f.vel).normalize();
  else _c.copy(f.fwd);
  f.fwd.lerp(_c, 1 - Math.exp(-6 * dt)).normalize();

  f.up.lerp(f.mode === "orbit" && f.body ? f.body.pole : UP, 1 - Math.exp(-1.5 * dt)).normalize();
  const turn = Math.asin(THREE.MathUtils.clamp(prev.cross(f.fwd).dot(f.up), -1, 1)) / Math.max(dt, 1e-4);
  f.bank = THREE.MathUtils.damp(f.bank, THREE.MathUtils.clamp(-turn * 0.45, -0.7, 0.7), 3, dt);

  const up = Math.abs(f.fwd.dot(f.up)) > 0.98 ? FWD_Z : f.up;
  _m.lookAt(f.fwd, ZERO, up);
  f.quat.setFromRotationMatrix(_m).multiply(_q.setFromAxisAngle(FWD_Z, f.bank));

  return moving || f.thrust > 0.02;
}

