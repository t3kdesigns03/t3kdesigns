# T3KDesigns /explore — nerd the hull
# Repo: E:\T3KDesigns\T3KDESIGNSHOME
# File: components/explore/Craft.tsx (+ hull shader only if needed)
# Live phone frames show a generic silver rocket. Keep SCALE ~0.74. Do not touch worlds, camera, HUD, `/`.

Not a new ship. The same stack, more language. No SpaceX marks, no downloaded GLB, no "Starship" on the page.

## What is missing (from the phone sheet)

- One smooth barrel. Needs weld rings + faint oil-canning, not a chrome tube.
- Dark belly is a smear. Needs a **tile grid** (small dark squares, ragged terminator, denser at flap roots and the nose underside).
- Only aft fins. Starship-class needs **forward flaps** (canards) + **aft flaps**. Four aft in X is fine; add two smaller forward flaps.
- No side raceway. Add a thin raised cable tray down one stainless side, nose to skirt.
- Skirt is a cone. Show a ring of nozzle bells sitting in it (keep 6: 3+3 or 1+5). Ice plume only inbound.
- Nose is a bullet. Slightly longer ogive. Two small header-tank blisters under the nose (no logos).
- Two tiny catch pegs / hardpoints mid-body, opposite the raceway.

## Material

Brushed 300-series steel. Cool rim light stays. Not gold, not chrome, not lilac hull. Lilac visor band can stay 2px. Tiles are charcoal, not pure black.

## Motion

Forward flaps dip a few degrees into a bank. Aft flaps already tilt ~5° — keep it. Do not animate a belly flop.

## Budget

Still primitives + the existing lathe. A repeating tile texture in the hull shader is allowed. Do not add a second canvas, bloom, or GLTF.

If the parked phone frame gets busy, drop catch pegs before you drop tiles or the raceway.

## Done when

Parked GlowDaily on a 390-wide: you can point at tiles, a raceway, forward flaps, and a skirt full of bells. Burn on, park off. Build clean.
