# T3KDESIGNS — MOBILE PLANETS + SHIPS
# Repo: E:\T3KDesigns\T3KDESIGNSHOME
# Live bug: https://t3kdesigns.app on a phone shows the spiral only.
#            No readable planets. No ships flying node to node.
# Model: Opus 5. Additive fix. Do not restyle the overlay. Do not rebuild the galaxy shader.

---

The desktop scene is inhabited. Mobile is not. That is a tier bug, not a "phone can't do it" limit.

A 2024–2026 phone can draw eight small spheres, dock rings, and 4–6 instanced ships at 40–60fps if you do not also run the full desktop particle + bloom + martian stack.

## WHAT IS WRONG (FIND THIS FIRST)

Open `components/scene/` and the perf tier helper. You will find some combination of:

- `isMobile` or `width < 768` mapped straight to the **low** tier
- low tier skips world meshes and ship routes ("points only" / "no traffic")
- mobile camera posed on the galaxy disk face, with project worlds outside the frustum or scaled to a few pixels
- Explore control hidden or disabled on small screens, so there is no way to dolly toward a node
- martian + bloom + high particle count sharing one "if mobile, strip everything" branch

Do not "optimize" by deleting the inhabited layer on touch devices. Split the knobs.

## REQUIRED ON MOBILE (portrait and landscape)

Must be visible with the naked eye on an iPhone-width screen, hero view, no Explore tap required:

1. **All eight project worlds** as real meshes (sphere or station), not glow-only points. Scale them up on mobile so each reads as a planet (~1.6–2.2× the desktop world scale, then check framing).
2. **Dock ring** on the hub + at least three other live nodes.
3. **4–6 ships** on authored routes between those worlds. Couriers and shuttles. Short dim ion streaks. They must cross the visible frame every few seconds so a 10-second stare proves traffic exists.
4. Camera framing on mobile must include the hub and at least four worlds in the hero and work sections. If worlds sit behind the type or below the fold of the canvas, move the mobile camera, do not hide the meshes.

Allowed to stay off on mobile:

- Martians / crew hop cycle
- Extra scenery planets beyond one gas giant
- Satellites above 1 per world
- Heavy bloom (keep threshold high or disable)
- Device-orientation fly if permission is annoying

## TIER SPLIT (REPLACE THE CURRENT MOBILE=LOW COUPLING)

```
particles:    existing desktop / mid / low counts (low is fine on phones)
bloom:        off on mobile
worlds:       ALWAYS on, including mobile and low — unless WebGL fallback
ships:        desktop 10–16, mobile 4–6, reduced-motion 0 moving
crew:         desktop high only
satellites:   desktop all nodes, mobile hub + 3
```

`prefers-reduced-motion` still freezes traffic as a parked still. Worlds stay visible.

If FPS drops under ~40 for two seconds on a phone, drop ship count to 3 and disable bloom. Never drop worlds to zero.

## CAMERA

Read the existing mobile pose. It is almost certainly framed as "pretty disk, worlds too far / too small."

- Pull the mobile hero camera closer to the node ring.
- Bias the look-at toward the hub world.
- Keep the spiral as backdrop, not the only subject.
- On scroll-to-work, truck so two or three worlds sit near the dock card, still readable.

## SHIPS ON MOBILE

Same route system as desktop. Do not write a second random-wander. Instance the hulls. No GLTF-per-ship.

If the current low-tier path draws ships as 1px points, that is why nobody sees them. Give mobile ships a minimum screen size (pixel scale or `sizeAttenuation` floor) so a courier is obvious against the disk.

## VERIFY

- Chrome device mode 390×844 and 430×932: hero shows ≥4 planets and a ship crossing within 8 seconds.
- Real phone if you can.
- Desktop unchanged in density and look.
- `npm run build` clean.

Do this before any other polish. The live complaint is specifically: mobile has no flying spaceships and no planets.
