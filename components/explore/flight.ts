import * as THREE from "three";
import { GALAXY_DIR, LIGHT_DIR, allBodies, hub, worlds, type Body } from "./layout";
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
/** parked, the craft drifts round slowly: about two minutes a lap */
const ORBIT_OMEGA = 0.05;
/** park a little short of a landmark, so the craft does not sit on it */
const LANDMARK_LEAD = 0.28;
const TAU = Math.PI * 2;
/** soft edge of the map */
const BOUNDARY = 190;
/** route arc-length table resolution: the craft moves by distance, not by curve parameter */
const LUT_N = 48;

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
  /** extra roll on top of the bank: the approach flourish */
  roll: 0,
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
  /**
   * Autopilot route: one cubic Bézier from wherever we were to a point on the
   * target's parking circle, swung wide (an arc, a swerve, a slingshot round
   * the studio, or a hook in from the far side). Built once per trip, walked
   * by `t`; nothing allocates while flying it.
   */
  route: {
    p0: new THREE.Vector3(),
    p1: new THREE.Vector3(),
    p2: new THREE.Vector3(),
    p3: new THREE.Vector3(),
    t: 0,
    dur: 4,
    /** time-curve slopes at each end: 0 = ease from rest; >0 carries speed through a retarget */
    m0: 0,
    m1: 0,
    /** barrel roll on approach: -1, 0 or 1 */
    rollDir: 0,
    /** arc length, and cumulative length at LUT_N even steps of the curve parameter */
    len: 1,
    lut: new Float32Array(LUT_N + 1),
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
const _r0 = new THREE.Vector3();
const _r1 = new THREE.Vector3();
const _r2 = new THREE.Vector3();
const _r3 = new THREE.Vector3();

/** cubic Bézier through the route's four points, at `s` */
function bezier(s: number, out: THREE.Vector3) {
  const { p0, p1, p2, p3 } = flight.route;
  const k = 1 - s;
  return out
    .copy(p0)
    .multiplyScalar(k * k * k)
    .addScaledVector(p1, 3 * k * k * s)
    .addScaledVector(p2, 3 * k * s * s)
    .addScaledVector(p3, s * s * s);
}

/** curve parameter at fraction `s` of the route's length */
function paramAt(s: number) {
  const { lut, len } = flight.route;
  const target = THREE.MathUtils.clamp(s, 0, 1) * len;
  let lo = 0;
  let hi = LUT_N;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (lut[m] < target) lo = m;
    else hi = m;
  }
  const span = lut[hi] - lut[lo];
  return (lo + (span > 1e-6 ? (target - lut[lo]) / span : 0)) / LUT_N;
}

/** Hermite time curve: 0 → 1, leaving at slope m0 and landing at slope m1 (both ≤ 3 stays monotone) */
function timeCurve(t: number, m0: number, m1: number) {
  const t2 = t * t;
  const t3 = t2 * t;
  return (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) + (t3 - t2) * m1;
}

const smooth = (a: number, b: number, x: number) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const pick = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const coin = () => (Math.random() < 0.5 ? -1 : 1);

const _k0 = new THREE.Vector3();
const _k1 = new THREE.Vector3();
const _k2 = new THREE.Vector3();

/**
 * Bend the route's handles until the curve clears every world it would
 * graze. Done once, when the route is laid out: pushing the craft around
 * worlds frame by frame swings it across them at many times cruise speed.
 */
function clearRoute(b: Body, fallback: THREE.Vector3) {
  const R = flight.route;
  for (let pass = 0; pass < 4; pass++) {
    let moved = false;
    for (const o of allBodies) {
      if (o === b) continue;
      const clear = o.radius * 3.2 + 2;
      let best = Infinity;
      let bestS = 0;
      for (let i = 1; i < 24; i++) {
        const s = i / 24;
        // the world we are leaving: only its far side counts
        if (o === flight.body && s < 0.2) continue;
        const dist = bezier(s, _k0).distanceTo(o.center);
        if (dist < best) {
          best = dist;
          bestS = s;
        }
      }
      if (best >= clear) continue;
      const away = bezier(bestS, _k0).sub(o.center);
      if (away.lengthSq() < 1e-4) away.copy(fallback);
      away.normalize();
      // move the curve's point at bestS out by `need`, sharing it between the two handles
      const need = (clear - best) * 1.15;
      const s = bestS;
      const k = Math.min(4, 1 / (3 * (1 - s) * s * ((1 - s) * (1 - s) + s * s)));
      R.p1.addScaledVector(_k1.copy(away), need * (1 - s) * k);
      R.p2.addScaledVector(_k2.copy(away), need * s * k);
      moved = true;
    }
    if (!moved) break;
  }
}

/**
 * Lay out a wide, different-every-time route to `b`. The end sits on the
 * parking circle, arriving along its tangent, so `enterOrbit` picks up
 * without a jump. The start leaves along the current heading, at the
 * current speed, so a retarget mid-flight bends instead of stopping.
 */
function buildRoute(b: Body, attempt = 0) {
  const f = flight;
  const R = f.route;
  const n = b.pole;
  R.p0.copy(f.pos);

  // arrive a little round the circle from the near side, either way
  const radial = _r0.copy(f.pos).sub(b.center);
  radial.addScaledVector(n, -radial.dot(n));
  if (radial.lengthSq() < 1e-6) radial.copy(n).cross(FWD_Z);
  radial.normalize().applyAxisAngle(n, coin() * pick(0.45, 1.15));
  R.p3.copy(b.center).addScaledVector(radial, b.orbitR);

  const chord = _r1.copy(R.p3).sub(R.p0);
  const L = Math.max(chord.length(), 1);
  // arrive along the circle's tangent; one trip in five hooks in from the far side
  const tangent = _r2.copy(n).cross(radial).normalize();
  let tSign = tangent.dot(chord) > 0 ? 1 : -1;
  if (Math.random() < 0.2) tSign = -tSign;
  tangent.multiplyScalar(tSign);

  // which way to swing: sideways in the orbital plane, a little lift out of it
  const mid = _r3.copy(R.p0).add(R.p3).multiplyScalar(0.5);
  const side = _a.copy(LIGHT_DIR).cross(chord);
  if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
  side.normalize();

  // slingshot round the studio when it is roughly in the way and not an end
  const toHub = _b.copy(hub.center).sub(mid);
  const hubOff = toHub.length();
  const hubIsEnd = b === hub || f.body === hub || f.pos.distanceTo(hub.center) < hub.orbitR * 1.5;
  const sling = !hubIsEnd && L > 30 && hubOff < L * 0.45 && Math.random() < 0.6;

  let bulge: number;
  if (sling) {
    // bend the apex past the far side of the star, clear of it
    side.copy(toHub).addScaledVector(LIGHT_DIR, -toHub.dot(LIGHT_DIR));
    if (side.lengthSq() < 1e-6) side.copy(LIGHT_DIR).cross(chord);
    side.normalize();
    bulge = Math.max(hubOff + hub.radius * 4 + 6, L * 0.45) / 0.75;
  } else {
    side.multiplyScalar(coin());
    bulge = Math.max(8, L * pick(0.45, 0.8)) / 0.75;
  }
  const lift = coin() * L * pick(0.04, 0.16);
  // one trip in three is an S: the two handles swing opposite ways
  const swerve = !sling && Math.random() < 0.33 ? -1 : 1;

  const hand0 = L * pick(0.28, 0.4);
  const hand1 = L * pick(0.22, 0.34);
  R.p1.copy(mid).addScaledVector(side, bulge).addScaledVector(LIGHT_DIR, lift);
  R.p1.lerp(R.p0, 0.3);
  R.p2.copy(mid).addScaledVector(side, bulge * swerve).addScaledVector(LIGHT_DIR, lift * swerve);
  R.p2.lerp(R.p3, 0.3).addScaledVector(tangent, -hand1);

  // leave along where we are already heading, so the hull never snaps round
  const speed = f.vel.length();
  const dep = speed > 0.05 ? _b.copy(f.vel).divideScalar(speed) : _b.copy(f.fwd);
  const lead = Math.max(R.p1.distanceTo(R.p0), hand0);
  // already under way (a retarget mid-flight): leave exactly along the velocity, so the path has no kink
  const dir = speed > 1 ? _c.copy(dep) : _c.copy(R.p1).sub(R.p0).normalize().lerp(dep, 0.5).normalize();
  R.p1.copy(R.p0).addScaledVector(dir, lead);

  clearRoute(b, side);
  // clearing may have nudged the first handle; under way, keep it on the velocity line
  if (speed > 1) R.p1.copy(R.p0).addScaledVector(dep, Math.max(_k0.copy(R.p1).sub(R.p0).dot(dep), lead * 0.5));

  // arc-length table: the time curve then sets the speed directly, however
  // unevenly the handles space the curve
  let len = 0;
  R.lut[0] = 0;
  _c.copy(R.p0);
  for (let i = 1; i <= LUT_N; i++) {
    bezier(i / LUT_N, _a);
    len += _a.distanceTo(_c);
    R.lut[i] = len;
    _c.copy(_a);
  }
  R.len = Math.max(len, 1e-3);
  // a roll of the dice that came out nearly straight (a tight S, handles pulled in clearing a world): roll again
  if (R.len < L * 1.3 && attempt < 4) {
    buildRoute(b, attempt + 1);
    return;
  }
  // length sets the time: about the old cruise speed at the peak
  R.dur = THREE.MathUtils.clamp(1.4 + len / 24, 2.6, 12);
  // carry the current speed in; arrive at parking-orbit speed (slopes are in distance / total length)
  R.m0 = THREE.MathUtils.clamp((speed * R.dur) / R.len, 0, 2);
  R.m1 = THREE.MathUtils.clamp((ORBIT_OMEGA * b.orbitR * R.dur) / R.len, 0, 0.5);
  R.t = 0;
  R.rollDir = Math.random() < 0.65 ? coin() : 0;
}

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
  flight.roll = 0;
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
  buildRoute(b);
  flight.mode = "travel";
  flight.target = b;
  flight.body = null;
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
    const R = f.route;
    R.t = Math.min(1, R.t + dt / R.dur);
    const next = bezier(paramAt(timeCurve(R.t, R.m0, R.m1)), _a);

    // last-resort push off any world the route still grazes. The route was
    // cleared to a wider berth when it was laid out, so this rarely engages;
    // it is smooth in position and fades in after departure and out before arrival.
    const w = smooth(0, 0.14, R.t) * (1 - smooth(0.86, 1, R.t));
    if (w > 0) {
      for (const o of allBodies) {
        if (o === b) continue;
        const away = _b.copy(next).sub(o.center);
        const od = away.length();
        const clear = o.radius * 2.2 + 0.5;
        if (od < clear && od > 1e-4) next.addScaledVector(away, (w * (clear - od) * (clear - od)) / (clear * od));
      }
    }

    f.vel.copy(next).sub(f.pos).divideScalar(Math.max(dt, 1e-4));
    if (f.vel.length() > TRAVEL_MAX * 1.6) f.vel.setLength(TRAVEL_MAX * 1.6);
    f.pos.copy(next);
    // full burn on the way out, easing off on the final approach
    f.thrust = THREE.MathUtils.damp(f.thrust, R.t < 0.8 ? 1 : 0.35, 4, dt);

    // a barrel roll through the last stretch, finishing level before the park
    f.roll = R.rollDir * Math.PI * 2 * smooth(0.62, 0.88, R.t);

    if (R.t >= 1) {
      f.pos.copy(R.p3);
      // arrive moving along the circle, at parking speed
      f.vel.copy(R.p3).sub(R.p2).setLength(ORBIT_OMEGA * b.orbitR);
      f.roll = 0;
      enterOrbit(b);
    }
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

  // a roll cut short (a burn, a park) unwinds to the nearest whole turn
  if (f.mode !== "travel" && f.roll !== 0) {
    const level = Math.round(f.roll / TAU) * TAU;
    f.roll = THREE.MathUtils.damp(f.roll, level, 4, dt);
    if (Math.abs(f.roll - level) < 1e-3) f.roll = 0;
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
  f.quat.setFromRotationMatrix(_m).multiply(_q.setFromAxisAngle(FWD_Z, f.bank + f.roll));

  return moving || f.thrust > 0.02;
}
