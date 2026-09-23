# T3KDESIGNS GALAXY — MICRO GAME
# Repo: E:\T3KDesigns\T3KDESIGNSHOME
# Homepage stays: https://t3kdesigns.app
# New route: /explore
# Model: Claude Opus 5, effort max. Fresh chat.
# This is a tiny toy in the same visual language. Not a platform. Not a map product.

---

# PART A — WHAT THIS IS

A **micro game** on `/explore`.

You are a small craft in the T3KDesigns galaxy. The eight project worlds are planets. You flick or tap to fly between them. When you get near one, you park in orbit and read its name. That is the whole game.

Same void. Same lilac. Same quiet. No Google Earth. No street view. No tiles. No cities to walk. Planets are beautiful spheres with rings and night lights — T3KDesigns Galaxy Planets — not Earth skins.

Homepage `/` does not change into a game. The existing EXPLORE pill links here.

**Backend:** none.
**Cloudflare Worker:** none.
**Win condition:** none. You fly around. It looks expensive. You go home.

---

# PART B — BUILD PROMPT

Add one client-only route to the existing Next.js + R3F app.

```
/explore
```

Read `lib/projects.ts` and `components/scene/` first. Reuse project names, accent colors, and the void palette. Do not invent a second brand. Do not port the 160k-particle homepage spiral into this page if a cheaper backdrop will keep 60fps — planets are the subject here.

## Stack

Use what is already there: R3F, drei, three, light postprocessing.
Do not add physics engines, networking, audio libraries, inventories, scores, or a CMS.
`app/explore/page.tsx` is a thin shell. Canvas via `next/dynamic`, `ssr: false`.
Visiting `/` must not download this bundle.

## The toy

Third-person craft + eight planets + deep space.

**Craft**
- Small dark hull, one visor slit, two nav ticks, short ion burn when moving
- Kinematic: impulse, damp, max speed, bank into the turn
- One vehicle. No fleet. No crew hopping out.

**Planets**
- One world per entry in `lib/projects.ts`
- Distinct enough to recognize (Spyder = deep water + coastal lights, GlowDaily = warm amber, SSL = one bright field light, SOB = specular water, CTC = teal graphite moon, HoloTracker = half-built ring, Porchlight = single warm point, Studio = slender hub ring)
- Thin atmosphere fresnel. Dock ring on each.
- Two scenery bodies only (a ringed gas giant, an ice rock). Not listed in the HUD.

**Space**
- Void clear color from the homepage tokens
- Modest starfield
- Distant galaxy as cheap backdrop, not the homepage particle monster

**How you play**

Desktop
- Click a planet → craft turns and flies there, then parks in orbit
- Flick-drag or click empty sky → burn that way
- Wheel → follow-cam distance, clamped

Mobile
- Tap a planet → fly there
- Flick the canvas → burn
- Pinch → cam distance
- `touch-action: none` on the canvas host so the browser does not steal the gesture
- No virtual joysticks. No dual-stick HUD.

Near a planet: camera stays in orbit. Hard minimum distance so you never clip the crust. You should be close enough to enjoy the sphere and the ring. You should not be landing on a runway.

## HUD (tiny)

Glass, Portweaver-quiet, almost nothing.

- `T3K` → `/`
- Current world name when you are in its orbit, else `deep space`
- First-input hint that fades:
  - desktop: `click a world · flick to burn`
  - mobile: `tap a world · flick to burn`
- Eight color dots you can tap as an alternate to clicking the mesh
- `reset` text control

No score. No health. No map. No pause menu. No sound.

When you park at a world that has an `href`, a single line may appear: `open site →`. That is the only “utility.”

## Performance

- dpr 1 on mobile, 1.5 max on desktop
- bloom off on mobile, stingy on desktop
- pause when the tab is hidden
- `prefers-reduced-motion`: tap a planet eases the camera there. Craft does not burn.
- WebGL fail: void + the eight names as links. Never a white crash.

## Bandwidth

Procedural planet materials (colors, noise, lights) beat image downloads.
If you must add textures, one small map per world, lazy on approach, total first load of `/explore` ≤ 8 MB.
Do not fetch external tile servers.

## Done when

- `/` still looks and weighs the same
- `/explore` on desktop: click GlowDaily, fly, park, flick off toward Spyder
- `/explore` on a phone: same loop with thumbs in one sitting
- It feels like the homepage galaxy, just something you can drive
- `npm run build` clean

Build order: route + craft + one planet + fly/park + flick → remaining worlds → mobile gestures → HUD → perf.

If a feature is not in this file, do not add it.
