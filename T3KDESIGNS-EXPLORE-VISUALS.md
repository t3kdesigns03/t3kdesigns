# T3KDesigns /explore — visual pass
# Repo: E:\T3KDesigns\T3KDESIGNSHOME
# Live: https://t3kdesigns.app/explore
# Do not restyle `/`. Do not import postprocessing/bloom if it fattens the homepage.

The toy works. The picture does not. Desktop and phone both read as dark balls + CAD rings + a dart that looks like a 2004 flight-sim plane. Fix craft and worlds only. Keep tap / flick / pinch / HUD.

---

## Craft (replace the plane)

Kill the current hull. It reads as a toy airplane from the three.js catalog.

Build a small **courier**, not a Cessna:

- Flat dark wedge / needle. No wings. No tail fin. No propeller energy.
- One visor slit in lilac/ice. Two pin nav lights (warm + ice).
- Short ion spike only while thrusting. Cool, tiny, additive. Off when parked.
- Bank into the turn. Length along the velocity vector so it never slides sideways like a sprite.
- Readability: at default follow distance the silhouette is obvious. Not a brown crumb. Not a 747.

One geometry, one material family. No GLTF download unless it stays under ~100 KB and looks better than procedural. Prefer procedural.

## Planets

Right now they are the same noisy sphere in different tints. Close up, “cities” are TV static.

Each of the eight gets a **different body**, still cheap (procedural or one 1K map, lazy):

| World | Read as |
|---|---|
| SpyderNetwork | ocean + thin cloud, night-side coastal light string |
| GlowDaily | warm amber atmosphere, tea-gold night lights |
| SSL | small rock, one bright stadium patch on the night side |
| SOB Rentals | water specular, marina specks |
| CTC | graphite/teal moon, quiet outpost |
| HoloTracker | incomplete station / scaffold ring, not a smooth marble |
| Porchlight | dark warm night, single porch-colored point |
| Studio | dark hub world, the slender ring is the feature |

Rules:

- Real limb: thin fresnel atmosphere in that world’s accent. Without it they look like pool balls.
- Night lights are sparse **points or short strokes**, not Perlin speckles.
- Slow axial rotation. Rings are thin, slightly tilted, not a white hula hoop.
- Lighting: key + dim fill so the terminator exists. Spawn / park on the lit side when possible.
- Do not 8K NASA. Do not Mapbox. Do not add a second bloom stack.

## Space around them

Explore’s sky is emptier than `/`. Steal the *idea* of the homepage starfield at a low count, not the 160k spiral. A cheap distant disk in the background is enough so parked shots do not look like a void with five stickers.

## Camera (do not invent a new game)

Desktop park: world fills ~1/3 of the frame, craft in the lower third, not lost in a sea of black.
Phone park: already closer — keep planet centered, craft below. If the world is still a grey smudge, that is the material, not the camera.

## Perf

- dpr 1 on phone. Pause on hidden tab.
- No `@react-three/postprocessing` on a module `/` also imports.
- First-load of `/explore` stays lean. Textures lazy per world.

## Done when

A still frame of Studio and a still frame of GlowDaily look like two different places. The craft is a courier you would believe in the homepage galaxy. `/` screenshot is unchanged. Build clean.
