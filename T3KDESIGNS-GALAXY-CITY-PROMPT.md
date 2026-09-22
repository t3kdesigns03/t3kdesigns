# T3KDESIGNS — GALAXY CITY PASS
# Repo: E:\T3KDesigns\T3KDESIGNSHOME
# Live: https://t3kdesigns.app
# Model: Claude Opus 5, effort high/max
# This is an ADDITIVE pass. Do not rebuild the site. Do not restyle the overlay.
# Do not touch copy, fonts, dock, contact, or the spiral galaxy shader unless a hook requires it.

---

You are extending the existing R3F scene on t3kdesigns.app. The page already looks expensive: void, blackbody spiral, subtractive dust, eight project nodes, glass overlay, verbatim line "We design whatever you want."

The galaxy is beautiful and empty. Make it inhabited — a quiet orbital city — without breaking the photographic, Portweaver-dark vibe.

Open the repo. Read `components/scene/*`, `lib/projects.ts`, and the perf watchdog before writing anything. Match existing conventions (tier counts, dpr cap, visibility pause, reduced-motion freeze).

---

## WHAT TO ADD

A living traffic layer around the existing project nodes.

1. **Satellites** — small bodies on slow ellipses around each project node and around the main bulge. Metallic-dark, catching rim light. Not chrome balls. Think weathered relay stations and ice-catchers.
2. **Ships** — tiny craft that actually go somewhere. They leave a project node, boost across the disk, dock at another node, wait, then leave again. Some make a long run out toward a distant realistic planet and come home.
3. **Project worlds** — each of the eight systems gets a small, believable planet or station instead of (or in front of) a faint glow-only cluster. Still tiny. Still in the existing node layout from `lib/projects.ts`.
4. **Docking** — when a ship arrives, it aligns, slows, and parks at a thin ring or pylon. Lights on the ring tick.
5. **Martians** — after dock, 1–3 tiny figures hop onto the ring or the night side of the planet. They walk a short path, pause like they are working, hop back in. Silhouettes with a single visor glint. Not comedy mascots. Not green inflatable aliens. Scale: a few pixels at default camera. You should notice them only if you look.

This is background life. The overlay stays the UI. Ships are not clickable. Nodes stay the only click target.

---

## VIBE LOCK (NON-NEGOTIABLE)

- Super dark. Same void. Same lilac UI. Same subtractive dust.
- Photographed space, not Toon Shader Saturday morning.
- No rainbow engine trails. Exhaust is a short, dim, temperature-correct streak (cool ion / warm chemical), additive, tiny.
- No UI chrome on the ships. No health bars. No "ship #47" labels.
- No lens-flare spam. Existing bloom stays stingy.
- Do not cover the hero type with a ship. Traffic density is higher behind / beside copy, not through the headline.
- `prefers-reduced-motion`: freeze traffic as a still frame with ships already parked. No hop loop.
- Mobile / low tier: fewer ships, no martians, satellites only as points.

If a choice is "more charming" vs "still looks like JWST plus one studio," pick the second.

---

## PROJECT WORLDS

Map each node in `lib/projects.ts` to a distinct, quiet body. Keep node colors already in the file as the accent (ring light, city lights, engine trim) — not as the whole planet albedo.

Suggested read (adjust if a node color already implies otherwise):

- **SpyderNetwork** — ocean world, night-side city string along a coast, faint cloud band
- **GlowDaily Nutrition** — warm amber world, thin atmosphere, tea-gold city lights
- **Stuart Softball League** — small rocky world, one bright stadium-sized light on the night side
- **SOB Rentals** — lake-world, specular water, marina lights
- **Calming The Chaos** — muted teal/graphite moon with a quiet outpost
- **HoloTracker** — half-built station / scaffolding, construction sparks rare and tiny
- **Porchlight** — dark brick-warm night side, single warm porch-colored point
- **T3KDesigns Studio** — the hub: a slender orbital ring around a dark world, most traffic originates here

Worlds are instanced or shared-geometry. One or two texture atlases max. No 8k NASA dumps. Procedural or small baked maps. Realism from lighting and scale, not from megatextures.

Add 2–3 **non-project planets** farther out (gas giant with a thin ring, a rust world, an ice world) so ships have somewhere "away" to fly. These are scenery. Not in the dock.

---

## SHIPS

3–5 hull types, all small:

- courier (needle)
- tug (stubby)
- liner (slightly longer, rare)
- shuttle (the one that drops martians)

Motion system (do not animate with random wander):

- Each ship has a route: `fromNodeId → toNodeId` or `hub → outerPlanet → hub`.
- Bezier or catmull-rom through the disk so paths skim the arms, not clip through the bulge unless on a deliberate transfer.
- Speed: slow enough to read. A crossing of the hero view takes several seconds.
- Arrival: ease-out, align to dock tangent, settle.
- Dwell: 2–8 seconds.
- Depart: small attitude adjust, then burn.

Count by perf tier (extend the existing tier helper, do not invent a second one):

- high desktop: 10–16 ships, satellites on all nodes, martians on 3–4 nodes max
- mid: 6–8 ships, satellites on hub + 3 nodes, no martians
- low / mobile: 3 ships as bright points with a 4-vertex streak, no meshes for crew
- reduced-motion: 0 moving ships

Reuse geometries. One `InstancedMesh` (or few) for hulls. Do not mount 16 full GLTF scenes with separate materials.

Optional: a single shared "engine sprite" and "nav light" point. Nav lights blink slow (1.5–2.5s), two colors max (warm / ice).

---

## SATELLITES

- 1–3 per project world on high tier, 1 on hub only for mid.
- Slow, different periods so they do not look like a clock.
- Catch the galaxy's light. Almost no self-emissive except a pin-prick beacon.

---

## MARTIANS

These will ruin the site if they are cute.

Rules:

- Height relative to their planet: ant-scale. If you can see a face, they are too big.
- Form: two-leg silhouette + visor tick. Color is void-dark with one emissive slit in the node accent color.
- Cycle per docked shuttle: hop down (4–8 frames of motion, not a bounce meme), walk 1–2 meters of world space along the ring, stop, kneel or stand, hop back.
- Only play when that node is roughly facing camera and the ship is docked.
- Cap simultaneous walkers at 6 on high tier, 0 otherwise.
- No sound. No speech bubbles. No tools bigger than a pixel.

---

## INTEGRATION

- New folder: `components/scene/traffic/` (ships, docks, crew, satellites, routes).
- Hook routes to the same node positions the existing cluster layout uses. If nodes move with scroll/camera, traffic must use the same source of truth.
- Draw order: galaxy + nebula + starfield first, then worlds, then ships, then tiny crew. Do not let ships render inside the dust in a way that makes brown smears. Dust stays subtractive and behind / around, not on top of meshes.
- Explore mode: traffic keeps running. Camera can pass a ship; ships should have a minimum size so they do not vanish to a speck and a maximum so they never become a toy in the foreground.
- When a project panel opens (existing dock click), you may send one extra courier toward that node. Subtle. Not a cutscene.

---

## WHAT NOT TO DO

- Do not replace the spiral galaxy generator.
- Do not add a day/night cycle on the whole scene.
- Do not add music, radio chatter, or WebAudio.
- Do not add a "traffic debug" GUI in production.
- Do not pull three.js examples "flying saucer."
- Do not install cannon/rapier. This is authored routes, not physics.
- Do not change Syne/Sora self-hosting.
- Do not add Debt Angel or new dock items unless asked.

---

## DONE WHEN

- Desktop hero still reads as the current site, plus you can spot a ship crossing and a ring around the hub.
- Contact card screenshot still looks like the live page: same glass, same type, traffic only in the deep background.
- `npm run build` clean, lint clean, no new hydration warnings.
- Tab hidden → loop pauses (existing watchdog).
- Reduced motion → still frame, inhabited, not empty and not twitching.

Implement in this order: dock rings + planets on existing nodes → satellites → ship routes → martian cycle on hub + two live nodes → tier cutbacks → reduced-motion still.

Then screenshot desktop hero, work, contact, and a close Explore framing of one dock. If the dock looks like a toy commercial, scale the crew down and dim the engines until it looks like a photograph with something moving in it.
