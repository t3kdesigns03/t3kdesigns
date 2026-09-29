# T3KDesigns /explore — replace the dart with a Starship-class hull
# Repo: E:\T3KDesigns\T3KDESIGNSHOME
# Live: https://t3kdesigns.app/explore
# Additive. Do not retune orbits, worlds, HUD, or `/`.

The courier is still a flat silver wedge. From the parked camera it reads as a paper airplane. Replace the mesh only.

## Look

A stainless-steel stacked cylinder in the Starship family. Not a licensed SpaceX asset. No wordmark, no logo, no "Starship" / "SpaceX" on the page or in filenames the user will see.

Procedural R3F / three.js primitives. No Sketchfab / downloaded GLB.

Read at parked distance (current Studio frame: craft in the lower third):

- Tall stainless stack: nose cone, cylindrical body, flared skirt
- Dark heat-tile belly strip (not a full black plane)
- Four aft flaps, folded mostly in; they can articulate a few degrees when banking
- Rear: 3–6 simple nozzle bells. Ice-blue / pale plume **only while inbound**. Off when parked
- One thin lilac or ice visor band near the nose so it still belongs in this galaxy
- Metal: brushed steel, not chrome candy. Edge light so the silhouette holds on a dark planet

Scale: longer than the dart, still a prop. It must not eat the planet. If the stack looks like a needle, fatten the barrel slightly. If it looks like a skyscraper next to GlowDaily, shrink it.

Orientation: nose points along velocity (same as the dart). Bank into turns. Do not belly-flop.

## Touch

- One component: whatever currently draws the courier mesh / trail
- Trail can stay; retarget it to the nozzle cluster
- Autopilot, parking, camera follow, chips, plates: do not rewrite

## Do not

- Do not import `@react-three/drei` HTML or a heavy GLTF loader for this
- Do not add bloom
- Do not change homepage traffic ships
- Do not grow `/` JS

## Done when

Parked at Studio, the lower-third craft is clearly a steel stack with flaps and a skirt, not a dart. Burn to Holler and to G&N: plume on inbound, off in orbit, bank still reads. Build clean.
