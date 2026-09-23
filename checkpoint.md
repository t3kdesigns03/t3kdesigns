# T3KDESIGNS — PROJECT HANDOFF

**Written:** 2026-09-22 · **Updated:** 2026-09-23 (visual pass, outer ring, director chips) · **Repo:** `E:\T3KDesigns\T3KDESIGNSHOME` → `github.com/t3kdesigns03/t3kdesigns`

Pick this up in a fresh chat. Everything needed to resume is here — current
state, hard-won gotchas, and the `/explore` micro-game (now **built** — see §0;
§4 is the original plan, kept for the reasoning).

---

## 0. LATEST — `/explore` IS BUILT (2026-09-23)

Everything since `dd83f22` is in one local commit: **"Add /explore: a micro
game between the eight worlds"**. Push from Git Bash.

### What shipped
- `app/explore/page.tsx` (static shell + metadata) → `components/explore/ExploreMount.tsx`
  (dynamic `ssr:false`, WebGL probe, error boundary) → `ExploreCanvas.tsx`.
- `components/explore/`: `layout.ts` (world positions, radii, dock/orbit radii,
  galaxy dir, key light), `flight.ts` (kinematic model: free / travel / orbit /
  ease), `Rig.tsx` (craft + follow cam), `Craft.tsx` (delta-wing hull, visor,
  nav ticks, ion trail), `Planets.tsx` (worlds, rings, dock rings, beacons,
  2 scenery bodies), `Backdrop.tsx` (sky follows camera: stars, small galaxy,
  nebulae), `Controls.tsx` (all input), `HUD.tsx`, `Fallback.tsx`, `store.ts`.
- Homepage entry points: nav **EXPLORE** pill is now a `<Link>` (≥640px), and a
  **"Fly between them →"** pill under the Work paragraph — the phone entry
  point (nav pill is hidden below 640px). Both `prefetch={false}`.
- Tiny shared-scene edits, homepage-neutral: `Galaxy`/`Starfield` gained a
  `sizeScale` prop (default 1); `world.ts` gained `uCloseUp` (homepage never
  sets it → 0 → unchanged).

### Controls (desktop / phone)
- click/tap a world or a HUD dot → fly there and park in orbit
- **flick at a world** (within ~17° on screen, from the craft) → fly there and park
- flick elsewhere / click empty sky → burn (screen-up = into the scene)
- wheel / pinch → follow-cam distance (3.2–16)
- `reset` → back to the Studio hub orbit
- Portrait phones use a different orbit camera (rises behind the craft, looks
  over it at the world) so the planet is centered instead of cropped.

### Verified (headless, SwiftShader)
- Desktop: dot → GlowDaily → park (HUD name + `open site →`) → flick at Spyder →
  parks at Spyder; plain flick → free flight/"deep space"; wheel clamps; reset.
- Phone 390×844 / 360×740 / 430×932 with CDP touch: tap, pinch in/out, flick →
  park; dpr 1; zero overflow; no console errors.
- Reduced motion: flick does nothing, dot/tap eases camera, parks.
- WebGL disabled → void + names as links (Porchlight plain text).
- `/` → "Fly between them →" → `/explore` → `T3K` → `/`; no prefetch of /explore.
- `npm run build`, `tsc`, `eslint` clean. `/` ships no explore code.

### Visual pass (T3KDESIGNS-EXPLORE-VISUALS.md) — done
- `/explore` no longer uses the homepage world shader or particle Galaxy.
  New explore-only files: `looks.ts` (per-world recipe + palette) and
  `shaders.ts` (planet, atmosphere shell, ring, hull, ion spike, sky band,
  spiral impostor). `world.ts` and `Galaxy.tsx` were restored to their
  pre-explore versions, so `/` is back to its original shader code.
- Eight distinct bodies via a `kind` switch: Studio = dark basalt + faint
  lilac seams + slender ringed hub; Spyder = ocean/continents/cloud + coastal
  light string; GlowDaily = amber dunes + thick warm limb + tea-gold towns;
  SSL = cratered rock + floodlit stadium on the night side; SOB = turquoise
  lagoons + sun glint + marina specks; CTC = graphite moon + thin teal veins
  + outpost; HoloTracker = half-plated lattice station + reactor + half-built
  dock arc; Porchlight = dark warm world + one porch light.
- Night lights are anti-aliased cell dots (energy-conserving below a pixel),
  never Perlin speckle. Real limb from a back-faced additive atmosphere shell.
- Light is high over the orbital plane; each world's pole leans toward it and
  the parking orbit is square to the pole, so every parked shot is lit on top
  with a band of night (and lights) along the bottom.
- Parked camera is composed, not chased (`frameOrbit` in Rig.tsx): world ≈ 1/3
  of the frame (62% of width on portrait), craft in the lower third, 16° over
  the plane. Orbit drift slowed to ~2 min/lap. Worlds with a landmark
  (SSL, CTC, Porchlight) swing round on arrival until it is in shot.
- Craft: faceted courier wedge (no wings/fin), flat facets + smoothed-normal
  rim/sheen, lilac visor slit, warm/ice pin nav lights, short additive ion
  spike only while thrusting.
- Sky: stars + a faint band along the orbital plane + a one-quad spiral
  galaxy impostor below the plane (visible behind parked worlds).
- `/` initial JS unchanged at 222.5 KiB gz; explore chunk ~12 KiB gz; no textures.

### Outer ring + orbit nameplate (T3KDESIGNS-EXPLORE-OUTER-RING.md) — done
- Seven explore-only worlds in `lib/outerProjects.ts` at the time (since merged into projects.ts — see below): Small Town Sips, George &
  Nick's, Kim's Cleaning Products, Appanoose Country Club, Barber Stucco,
  Debt Angel, Don Julio Cantina. All seven hrefs checked live on 2026-09-23
  (Don Julio stays `building` per the brief but its site loads, so it keeps
  `open site →`). Promote one to the homepage by moving its row into projects.
- Placed on a ring ~104 units out in the orbital plane; scenery pushed to ~230.
  Seven new shader kinds (10–16 in shaders.ts): farm patchwork + outpost, ember
  cracks + lit town square, pristine ice-teal + fine ring, striped fairways +
  clubhouse light, limestone quarry terraces, silver-blue + guide star,
  terracotta mesas + multicolour string lights.
- Autopilot camera: rides behind the courier on the line to the target, eased
  in the craft's own frame (no lagging a dozen units behind at cruise).
  Cruise 30 u/s for autopilot. HUD reads `en route · Name` mid-hop, never
  "deep space"; that is only for free flight.
- Nameplate: tracked uppercase name, 1px accent rule, one-liner, open site →.
  Comes up within 4.5 parking radii, holds in orbit, fades on burn-away.
  Captured dock ring shows 12 sparse ticks.
- Pips: two rows (inner eight / outer seven), 44px tap targets, active pip lit.
- `/` initial JS still 222.5 KiB gz; explore-only lazy code ~23 KiB gz.

### Director chips + phone Explore door (T3KDESIGNS-EXPLORE-DIRECTOR-AND-MOBILE.md) — done
- `/explore` bottom HUD: the dots are now Director chips (`components/explore/Chips.tsx`):
  an SVG mini world painted from the world's palette (ring, landmark light,
  station frame where it has one) + a short name. Inner / outer groups, Studio
  leads the inner row. Desktop: rows wrap, glass hover tip with full name + one-liner.
  Phone: each group is a snap-scrolling row with soft edges, 44px chips, and
  the active chip scrolls to centre when the autopilot takes it. Short names
  and chip tones live in `CHIP` in looks.ts; full names come from the project files.
- Homepage: EXPLORE pill shows at every width. Below 420px the "designs"
  half of the wordmark hides so work / studio / contact / explore all fit
  (checked at 360 and 390, no overflow). Hero has a third ghost pill
  `Explore →` (/explore, prefetch off, hidden if WebGL failed). The Work
  section's "Fly between them →" stays as a second door.
- `/` initial JS 222.57 KiB gz (+~70 bytes for the hero link). No explore code on `/`.
- Next phase (per B): marketing / advertising.

### All fifteen on the homepage (B's call, 2026-09-23) — done
- The seven outer-ring rows moved from `lib/outerProjects.ts` (deleted) into
  `lib/projects.ts`. The homepage mission dock, 3D constellation, panels and
  /explore now all read one 15-row array. First eight = original constellation
  + /explore inner ring; the rest = gap fillers on `/` + /explore outer ring.
- Homepage ring: the original eight keep their exact positions; the seven sit
  in the gaps between them (smaller clusters, alternating high/low). The gap
  nearest the desktop camera stays empty. Traffic has homepage-scale world
  defs for all seven (`traffic/worlds.ts`).
- Work copy counts itself ("Fifteen systems orbiting one studio").
- `/` initial JS 223.43 KiB gz (+0.86 KiB for the seven rows).

### Deliberate deviation: no bloom on `/explore`
Any shared use of `@react-three/postprocessing` (or three's
EffectComposer/UnrealBloomPass) between routes made Turbopack hoist it into a
shared chunk and `/` grew +66–85 KiB gzip. The spec says `/` must weigh the
same, so `/explore` has no bloom at all; emissive + point sprites carry the glow.

### Not verified
- Real-device GPU feel (container renders ~1 fps). Check on your phone.
- Hidden-tab pause is in code (`frameloop: never`) but untested headless.

---

## 1. WHERE WE ARE RIGHT NOW (as of 2026-09-22 — superseded by §0)

Three commits, **all local, none pushed** (no git credentials in the session
shell — push from Git Bash, which is your normal workflow):

| Commit | What |
|---|---|
| `fb43a47` | Build the t3kdesigns.app parent site |
| `5859c80` | Inhabit the galaxy: worlds, traffic and a crew |
| `6f41a48` | Fix mobile: the node ring was outside the portrait frustum |

(Plus two of your own commits, `ea5a53c` and `a86108f`, which only added the
screenshot PNGs into `Claude outputs/`.)

**First thing to do next session:** `git push`. Everything below assumes
that happened.

### Build state
- `npm run build` clean, `npm run lint` clean.
- Site is a single route (`/`) — Next.js 16.3.5, App Router, Turbopack.
- Not yet deployed; `t3kdesigns.app` still points at the Porkbun parking page.
- `hello@t3kdesigns.app` is displayed in the contact form but the mailbox may
  not exist yet.

---

## 2. WHAT EXISTS

### Stack
Next.js 16.3.5 · TypeScript · Tailwind v4 · React 19.2 ·
`@react-three/fiber` 9 · drei 10 · three 0.186 ·
`@react-three/postprocessing` 3 · framer-motion 13.
No CMS, no auth, no database, no backend.

### Shape
```
app/
  page.tsx            single route, server component
  layout.tsx          metadata + self-hosted variable fonts
  globals.css         palette tokens, primitives, mobile rules
  fonts/              syne-var.woff2, sora-var.woff2
  icon.tsx  opengraph-image.tsx  robots.ts  sitemap.ts
components/
  scene/              galaxy, starfield, nebulae, nodes, camera, perf
    shaders/          points.ts, nebula.ts, world.ts
    traffic/          worlds, ships, crew, satellites, routes, point pool
  ui/                 nav, hero, dock, slide-over, studio, contact, footer
lib/
  projects.ts         SINGLE SOURCE OF TRUTH for the eight projects
  theme.ts            brand tokens + SITE constants
  store.ts            shared state between scene and DOM overlay
  motion.ts           reduced-motion + media query hooks, EASE
```

### The eight projects (`lib/projects.ts`)
SpyderNetwork · GlowDaily Nutrition (glowdailynutrition.com) · Stuart Softball
League · SOB Rentals · Calming The Chaos (ctc.t3kdesigns.app) · HoloTracker
(building) · Porchlight (private) · T3KDesigns Studio (hub).

**Open question, never answered:** is `mydebtangel.com` a separate project
that deserves a ninth node? The ring is generated from the array, so adding
one is a single entry.

---

## 3. CODEBASE GOTCHAS — READ BEFORE TOUCHING THE SCENE

These each cost real debugging time. They are not obvious.

**Fonts are self-hosted on purpose.** `fonts.googleapis.com` and
`fonts.gstatic.com` are blocked by the egress allowlist in *both* the cloud
container and the desktop shell, so `next/font/google` fails the build
outright. Syne and Sora variable woff2 came from the `@fontsource-variable/*`
npm packages, were copied into `app/fonts/`, and the packages were then
uninstalled. **Do not switch back to `next/font/google`.**

**Opaque always draws before transparent, whatever `renderOrder` says.**
three.js sorts opaque first, then transparent; `renderOrder` only orders
*within* each group. When the traffic layer added the first real meshes,
every point layer painted straight over the planets. The point layers now
`depthTest` (with `depthWrite` still off). Nothing among them writes depth,
so the galaxy alone renders exactly as before. **If a future layer looks like
it is "in front of everything", check this first.**

**The key light is art-directed, not physical.** `pointLight` at the origin,
`decay={0}`, intensity 15. At a physically-correct 3 candela a metallic hull
eight units out reflected essentially nothing — the ships were running
perfectly in the state machine and were invisible on screen.

**Dust uses subtractive blending.** It emits *absorption coefficients*
consumed by `CustomBlending` / `ZeroFactor` / `OneMinusSrcColorFactor`,
higher in blue than red. Over a black void, normal blending paints brown
smears instead of absorbing. **Do not add `<colorspace_fragment>` to that
shader** — its output is a blend factor, not a colour.

**Custom CSS beats Tailwind utilities.** Everything below the `@import` in
`globals.css` sits outside Tailwind's layers and wins. A `.nav-target` helper
that set `display: flex` silently defeated `hidden` and put the Explore
button on phones. Keep `display` in the utility classes, sizing in the custom
ones.

**Watch the hydration pass.** `useSyncExternalStore` returns the *server*
snapshot during hydration. An effect that read that value latched the WebGL
fallback on permanently. Probe after mount.

**`react-hooks/immutability`** (new in eslint-config-next 16) flags the
per-frame ref mutation that is the entire point of a render loop. It is
disabled for `components/scene/**` only, with the reason written into
`eslint.config.mjs`. The `set-state-in-effect` errors were fixed properly
instead.

### Mobile-specific

**Measure the frustum before blaming the tier.** The "no planets on mobile"
bug was not culling. A 390×844 frustum has aspect 0.46; at the desktop camera
distance **six of eight worlds fell outside it horizontally**, and the two
that remained were the smallest and dimmest (HoloTracker 9px, Porchlight
12px). The spiral was being cropped at 2.1× the screen width. Fixed by
scoring thousands of candidate cameras against projected node positions.
**When something is missing in 3D, project the positions and print the NDC
before touching code.**

**One scale knob.** `layout.worldScale` in `traffic/anchors.ts` multiplies
body radii, dock radii, crew height and satellite size. Positions are never
touched, so the constellation, the dock and the traffic keep one layout.
Mobile runs 2.3.

**A single overflowing element shrinks the whole page.** A veil with
`-inset-x-16` stuck 44px past the viewport; mobile Safari's shrink-to-fit
then rendered *everything* at ~89%. `overflow-x: clip` on `html`/`body` is
the backstop. **Symptom: `window.innerHeight` comes back *larger* than the
viewport.**

**Form controls are 16px exactly.** Anything smaller makes iOS Safari zoom in
on focus and never zoom back.

**Tap targets key off `@media (pointer: coarse)`**, not a width breakpoint —
a landscape phone is 844px wide and still needs 44px.

---

## 4. `/explore` — THE ORIGINAL PLAN (now built — see §0)

Source spec: `T3KDESIGNS-EXPLORE-FEASIBILITY-AND-PROMPT.md` (in repo root).

### Verdict: yes, comfortably.
It is a *smaller* job than the traffic layer was, because:
- The world shader, palette, fallbacks, perf tiering and point-pool pattern
  all already exist and get reused.
- There is no backend, no Worker, no win condition, no persistence.
- The only genuinely fiddly parts are **input feel** (flick → burn) and
  **keeping `/` unaffected**.

Estimated: one focused session.

### Architecture

```
app/explore/page.tsx              thin server shell + metadata
components/explore/
  ExploreMount.tsx                client; dynamic(ssr:false) + WebGL fallback
  ExploreCanvas.tsx               Canvas + scene composition + perf
  layout.ts                       planet positions/radii for THIS map
  Planets.tsx                     reuses shaders/world.ts
  Backdrop.tsx                    starfield + distant galaxy
  Craft.tsx                       hull, visor, nav ticks, ion burn
  flight.ts                       kinematic state (module store, no React)
  Controls.tsx                    raw DOM pointer/touch → flight intents
  FollowCam.tsx                   third-person damped follow
  store.ts                        parked world, hint visibility, cam distance
  HUD.tsx                         glass HUD (DOM, outside the canvas)
```

### Reuse map — do NOT rebuild these
| Reuse | From |
|---|---|
| Planet shader (terminator, city lights, atmosphere, spec, bands) | `components/scene/shaders/world.ts` |
| Ring shader | same file (`ringVert`/`ringFrag`) |
| Per-world visual definitions (base/base2/atmo/city/cloud/spec/bands/ring/scaffold/beacon) | `components/scene/traffic/worlds.ts` → `WORLDS` |
| Blackbody colour, gaussian, srand, hexToRGB | `components/scene/color.ts` |
| Starfield | `components/scene/Starfield.tsx` (takes `count`, `frozen`) |
| Distant galaxy backdrop | `components/scene/Galaxy.tsx` at low counts, placed ~90 units away |
| Point shaders for nav lights / ion trail | `components/scene/shaders/points.ts` |
| Palette + SITE constants | `lib/theme.ts`, `app/globals.css` |
| Project names / accents / hrefs | `lib/projects.ts` |

**Do NOT reuse** `traffic/anchors.ts` — its layout is the homepage node ring.
`/explore` needs its own spread-out map (`components/explore/layout.ts`).

### Key decisions already made
- **Planet radii ×10 vs homepage** (1.2–2.6 instead of 0.125–0.255). Here
  they are the subject, not trim.
- **Map ~150 units across.** At ~12 u/s a 40-unit hop takes ~3.3s, which is
  the right pacing.
- **Backdrop galaxy: reuse `Galaxy` at low particle counts, unscaled, placed
  ~90 units away.** Its 6.2 radius then reads as a proper distant galaxy, and
  it is the homepage's signature look for free. Do *not* port the 160k
  particle version.
- **Handle all input with raw DOM listeners on the canvas element**, and do
  planet picking with a manual raycaster on pointerup when drag distance is
  under threshold. Fighting R3F's event system over flick-vs-click is not
  worth it.
- **Unify click-sky and flick:** both produce an *aim point*; unproject it to
  a world ray and burn along that ray. Flick speed scales the impulse. This
  is predictable and matches "burn that way".
- **`touch-action: none` on the canvas host** (note: the *opposite* of the
  homepage, which needs `pan-y` so the page can scroll — `/explore` does not
  scroll).
- **Park = circular orbit.** Within `R_park` the craft flies a circular path
  around the planet at `planetRadius * 2.2`; hard minimum distance so you
  never clip the crust.
- **Reduced motion:** tapping a planet eases the camera there; craft does not
  burn, no ion trail.

### Homepage change required
The spec says the existing EXPLORE pill **links to `/explore`**. That means
`components/ui/Nav.tsx` repoints from the orbit toggle to a `<Link>`. Side
effect: nothing sets `explore = true` on `/` any more, so `OrbitControls` and
the chromatic aberration never mount there. Leave the store flag and that
code path intact (harmless) unless you want the bundle back.

### Build order
1. Route + shell + WebGL fallback
2. Craft + flight kinematics + follow cam
3. One planet + fly-to + park-in-orbit
4. Flick-to-burn
5. Remaining seven worlds + two scenery bodies
6. Mobile gestures (tap / flick / pinch)
7. HUD
8. Perf (dpr, bloom off on mobile, hidden-tab pause, reduced motion)

### Done when
- `/` still looks and weighs the same (**check the route bundle sizes before
  and after** — `/explore` must not leak into `/`)
- Desktop: click GlowDaily → fly → park → flick off toward Spyder
- Phone: same loop with thumbs
- `npm run build` clean

### Explicit non-goals (from the spec)
No backend. No Worker. No score, health, map, pause menu, sound, joysticks,
inventories, physics engine, external tile servers. *"If a feature is not in
this file, do not add it."*

---

## 5. DEV HARNESS — HOW THE LOOP WORKS

Worth knowing so a fresh session doesn't rediscover it.

**Three machines, keep them straight:**
- `E:\T3KDesigns\T3KDESIGNSHOME` — the repo, the deliverable.
- `$HOME/t3k` in the device VM — fast local build dir (the mount is ~9 MB/s;
  `npm install` there is painful). Work here, then `rsync` into the repo.
- `/home/claude/t3k` in the cloud container — a copy used **only** to run a
  server and take screenshots with Playwright.

**Sync direction is one-way:** device build dir → repo → (stage) → container.
Never sync the container back; it carries debug hooks.

**Screenshots:** Playwright with
`executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"` and
`args: ["--enable-unsafe-swiftshader","--use-gl=angle","--use-angle=swiftshader"]`.

**Two container-only debug hooks** (never committed):
- `window.__FORCETIER__ = 2` pins the perf tier. **Essential** — the
  container's software renderer is so slow the watchdog drops to the phone
  tier within seconds and every screenshot is wrong.
- `window.__CLOSECAM__ = [px,py,pz, tx,ty,tz, fov]` overrides the camera for
  close-up framing shots.

**The container renders at ~3fps**, and ship motion is `dt`-clamped at 1/20,
so traffic appears to crawl there. That is the harness, not the site. Don't
"fix" it.

**Don't `pkill -f next-server`** — the pattern matches the tool's own shell
and kills the command. Use a pidfile.

---

## 6. IF YOU WANT SOMETHING SMALLER FIRST

Cheap wins that don't need a big session:
- Push the three commits and deploy (Vercel/Netlify), point the domain.
- Answer the `mydebtangel.com` question — one entry in `lib/projects.ts`.
- Set up the `hello@t3kdesigns.app` mailbox, or swap the displayed address.
