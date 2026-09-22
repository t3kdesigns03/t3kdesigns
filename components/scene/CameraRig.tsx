"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { spotById } from "./nodeLayout";
import { raw } from "@/lib/store";

type Pose = {
  from: THREE.Vector3;
  to: THREE.Vector3;
  lookFrom: THREE.Vector3;
  lookTo: THREE.Vector3;
  fovFrom: number;
  fovTo: number;
};

const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/**
 * Default is an authored cinematic rig, not a free-fly camera: the page has
 * to behave like a website. Scroll trucks along the disk and eases the FOV;
 * the pointer adds a damped parallax; hovering a node leans toward it.
 */
export default function CameraRig({
  frozen,
  mobile,
  explore,
}: {
  frozen: boolean;
  mobile: boolean;
  explore: boolean;
}) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;

  const pose = useMemo<Pose>(
    () =>
      mobile
        ? {
            /**
             * A portrait frustum is narrow: at the desktop distance the node
             * ring falls entirely outside it and the phone showed the spiral
             * alone. Standing well back and looking down at ~26 degrees puts
             * all eight systems on screen, below the copy, with the disk as
             * a backdrop instead of a cropped subject.
             */
            from: v3(-24.1, 15.34, -20.22),
            to: v3(-21.0, 20.0, -18.0),
            lookFrom: v3(0, 6.5, 0),
            lookTo: v3(0, 4.0, 0),
            fovFrom: 62,
            fovTo: 56,
          }
        : {
            from: v3(0.1, -2.35, 11.0),
            to: v3(2.9, 5.5, 10.6),
            lookFrom: v3(-1.35, 0.55, 0),
            lookTo: v3(0.4, 0, 0),
            fovFrom: 54,
            fovTo: 44,
          },
    [mobile],
  );

  const target = useRef(new THREE.Vector3().copy(pose.lookFrom));
  const pos = useRef(new THREE.Vector3().copy(pose.from));
  const pull = useRef(0);
  const scratch = useRef(new THREE.Vector3());
  const baseTarget = useRef(new THREE.Vector3());
  const spotVec = useRef(new THREE.Vector3());

  // place the camera before the first painted frame
  useEffect(() => {
    camera.position.copy(pose.from);
    camera.fov = pose.fovFrom;
    camera.updateProjectionMatrix();
    camera.lookAt(pose.lookFrom);
    pos.current.copy(pose.from);
    target.current.copy(pose.lookFrom);
  }, [camera, pose]);

  useFrame((state, dt) => {
    if (frozen) return;
    if (explore) return; // OrbitControls owns the camera while exploring

    const d = Math.min(dt, 1 / 20);

    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, doc.scrollTop / max)) : 0;
    // easeInOutQuad
    const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;

    // base pose along the scroll track
    scratch.current.lerpVectors(pose.from, pose.to, e);

    // parallax: pointer on desktop, a slow authored orbit on touch
    let ox: number;
    let oy: number;
    if (mobile) {
      const t = state.clock.elapsedTime;
      // authored drift, scaled to the distance so it still reads as parallax
      ox = Math.sin(t * 0.058) * 1.5;
      oy = Math.cos(t * 0.043) * 0.85;
    } else {
      ox = state.pointer.x * 0.62;
      oy = state.pointer.y * 0.4;
    }
    scratch.current.x += ox;
    scratch.current.y += oy;

    baseTarget.current.lerpVectors(pose.lookFrom, pose.lookTo, e);

    // lean toward the node under the pointer / open in the panel
    const spot = spotById(raw.active ?? raw.hovered);
    const want = raw.active ? 1 : raw.hovered ? 0.42 : 0;
    pull.current = THREE.MathUtils.damp(pull.current, spot ? want : 0, 3.2, d);

    if (spot && pull.current > 0.001) {
      spotVec.current.set(spot.position[0], spot.position[1], spot.position[2]);
      baseTarget.current.lerp(spotVec.current, 0.34 * pull.current);
      scratch.current.lerp(spotVec.current, 0.085 * pull.current);
    }

    pos.current.x = THREE.MathUtils.damp(pos.current.x, scratch.current.x, 2.6, d);
    pos.current.y = THREE.MathUtils.damp(pos.current.y, scratch.current.y, 2.6, d);
    pos.current.z = THREE.MathUtils.damp(pos.current.z, scratch.current.z, 2.6, d);
    camera.position.copy(pos.current);

    target.current.x = THREE.MathUtils.damp(target.current.x, baseTarget.current.x, 2.4, d);
    target.current.y = THREE.MathUtils.damp(target.current.y, baseTarget.current.y, 2.4, d);
    target.current.z = THREE.MathUtils.damp(target.current.z, baseTarget.current.z, 2.4, d);
    camera.lookAt(target.current);

    const fov = THREE.MathUtils.lerp(pose.fovFrom, pose.fovTo, e);
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = THREE.MathUtils.damp(camera.fov, fov, 2.4, d);
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
