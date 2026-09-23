"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import { CAM_MAX, CAM_MIN, burn, flight, flyTo, runtime } from "./flight";
import { worlds, type Body } from "./layout";
import { exploreStore } from "./store";

type Track = { x0: number; y0: number; t0: number; x: number; y: number; t: number };

/**
 * All input is raw DOM pointer events on the canvas, not R3F's event system:
 * the whole game is telling a tap from a flick from a pinch, and that is
 * easier to get right in one place than by arbitrating between mesh
 * handlers.
 *
 *   tap / click a world   → fly there and park
 *   tap / click the sky   → burn toward that point
 *   flick at a world      → fly there and park
 *   flick / drag elsewhere → burn that way (up = into the scene)
 *   pinch / wheel         → follow-cam distance
 */
export default function Controls({ coarse }: { coarse: boolean }) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;

  useEffect(() => {
    const el = gl.domElement;
    const tracks = new Map<number, Track>();
    let pinchPrev = 0;
    let pinched = false;

    const right = new THREE.Vector3();
    const fwd = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const v = new THREE.Vector3();

    const rect = () => el.getBoundingClientRect();

    /**
     * Screen-space picking with a generous floor: a world twenty pixels
     * across on a phone still has to be hittable with a thumb.
     */
    const pick = (x: number, y: number): Body | null => {
      const r = rect();
      const k = r.height / (2 * Math.tan((camera.fov * Math.PI) / 360));
      let best: Body | null = null;
      let bestScore = Infinity;
      for (const b of worlds) {
        v.copy(b.center).project(camera);
        if (v.z > 1 || v.z < -1) continue;
        const sx = (v.x * 0.5 + 0.5) * r.width;
        const sy = (-v.y * 0.5 + 0.5) * r.height;
        const dist = camera.position.distanceTo(b.center);
        const pr = (b.radius * k) / dist;
        const hitR = Math.max(pr * 1.15 + 6, coarse ? 30 : 20);
        const dd = Math.hypot(x - sx, y - sy);
        if (dd < hitR) {
          const score = dd / hitR + dist * 0.002;
          if (score < bestScore) {
            bestScore = score;
            best = b;
          }
        }
      }
      return best;
    };

    const tap = (x: number, y: number) => {
      const hit = pick(x, y);
      if (hit) {
        flyTo(hit);
      } else {
        const r = rect();
        dir
          .set((x / r.width) * 2 - 1, -(y / r.height) * 2 + 1, 0.5)
          .unproject(camera)
          .sub(camera.position)
          .normalize();
        burn(dir, 9);
      }
      runtime.kick();
    };

    /**
     * A flick is aimed from the craft, on screen. If a world sits within a
     * narrow cone of that line, the flick means "go there" — worlds are a
     * few thumb-widths apart and a coasting burn alone rarely lands in an
     * orbit. Otherwise it is a plain burn: screen-up is into the scene,
     * sideways is sideways.
     */
    const aimed = (dx: number, dy: number): Body | null => {
      const r = rect();
      v.copy(flight.pos).project(camera);
      const cx = (v.x * 0.5 + 0.5) * r.width;
      const cy = (-v.y * 0.5 + 0.5) * r.height;
      const fa = Math.atan2(dy, dx);
      const here = exploreStore.get().parked;
      let best: Body | null = null;
      let bestAngle = THREE.MathUtils.degToRad(17);
      for (const b of worlds) {
        if (b.id === here) continue;
        v.copy(b.center).project(camera);
        if (v.z > 1 || v.z < -1) continue;
        const sx = (v.x * 0.5 + 0.5) * r.width - cx;
        const sy = (-v.y * 0.5 + 0.5) * r.height - cy;
        if (Math.hypot(sx, sy) < 8) continue;
        let d = Math.abs(Math.atan2(sy, sx) - fa);
        if (d > Math.PI) d = Math.PI * 2 - d;
        if (d < bestAngle) {
          bestAngle = d;
          best = b;
        }
      }
      return best;
    };

    const flick = (dx: number, dy: number, pxPerMs: number) => {
      const target = aimed(dx, dy);
      if (target) {
        flyTo(target);
        runtime.kick();
        return;
      }
      const len = Math.hypot(dx, dy) || 1;
      camera.updateMatrixWorld();
      right.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
      camera.getWorldDirection(fwd);
      dir
        .copy(right)
        .multiplyScalar(dx / len)
        .addScaledVector(fwd, -dy / len)
        .normalize();
      burn(dir, THREE.MathUtils.clamp(5 + pxPerMs * 10, 5, 16));
      runtime.kick();
    };

    const pinchDist = () => {
      const [a, b] = [...tracks.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };

    const down = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      try {
        // keeps a flick tracked if the finger leaves the canvas mid-gesture;
        // throws for pointers the browser no longer considers active
        el.setPointerCapture(e.pointerId);
      } catch {}
      const r = rect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      tracks.set(e.pointerId, { x0: x, y0: y, t0: e.timeStamp, x, y, t: e.timeStamp });
      if (tracks.size === 2) {
        pinched = true;
        pinchPrev = pinchDist();
      }
      exploreStore.touch();
    };

    const move = (e: PointerEvent) => {
      const tr = tracks.get(e.pointerId);
      if (!tr) return;
      const r = rect();
      tr.x = e.clientX - r.left;
      tr.y = e.clientY - r.top;
      tr.t = e.timeStamp;
      if (tracks.size === 2) {
        const d = pinchDist();
        if (pinchPrev > 0 && d > 0) {
          flight.camDist = THREE.MathUtils.clamp(flight.camDist * (pinchPrev / d), CAM_MIN, CAM_MAX);
          runtime.kick();
        }
        pinchPrev = d;
      }
    };

    const up_ = (e: PointerEvent) => {
      const tr = tracks.get(e.pointerId);
      tracks.delete(e.pointerId);
      if (!tr) return;
      if (pinched) {
        if (tracks.size === 0) pinched = false;
        return;
      }
      const dx = tr.x - tr.x0;
      const dy = tr.y - tr.y0;
      const dist = Math.hypot(dx, dy);
      const threshold = e.pointerType === "touch" ? 12 : 6;
      if (dist < threshold) tap(tr.x, tr.y);
      else flick(dx, dy, dist / Math.max(16, tr.t - tr.t0));
    };

    const cancel = (e: PointerEvent) => {
      tracks.delete(e.pointerId);
      if (tracks.size === 0) pinched = false;
    };

    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      flight.camDist = THREE.MathUtils.clamp(
        flight.camDist * Math.exp(e.deltaY * 0.0012),
        CAM_MIN,
        CAM_MAX,
      );
      exploreStore.touch();
      runtime.kick();
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up_);
    el.addEventListener("pointercancel", cancel);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up_);
      el.removeEventListener("pointercancel", cancel);
      el.removeEventListener("wheel", wheel);
    };
  }, [gl, camera, coarse]);

  return null;
}
