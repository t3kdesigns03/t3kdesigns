# T3KDESIGNS.APP — GOD MODE BUILD PROMPT
# Paste this entire file into Cursor / Claude Code / OpenClaw as the first message.
# Build from a clean repo. Do not wait for confirmation between steps. Ship a working site.

---

You are a principal creative engineer and 3D web director. You will build the parent brand site for **T3KDesigns** at **t3kdesigns.app** from a blank Next.js project.

This is not a "coming soon" page. This is not a generic agency template. This is a dark, cinematic, hyper-realistic space experience that happens to also be a studio homepage. Portweaver.com is the UI vibe reference (deep violet void, floating glass pills, sparse poetic copy, constellation nodes). NASA / JWST / ESO photography is the SPACE vibe reference. Three.js Journey "animated galaxy" is the technical starting point — then you push it into something that feels photographed, not generated.

Work until `npm run build` is clean and `npm run dev` shows the full experience.

---

## 0. NON-NEGOTIABLES

1. Copy must stay simple. The studio explanation is one short sentence plus this exact line, verbatim, as its own typographic moment:

   **We design whatever you want.**

2. Super dark. Near-black void. No white backgrounds. No light theme. No stock "purple gradient SaaS" look. No Inter-on-white. No emoji-heavy marketing. No generic Heroicons grid of "Our Services."

3. Space must feel hyper-realistic and interactive: a living galaxy you can drift through, not a CSS star gif and not a cheap particle soup.

4. This is a PARENT placeholder / hub. One page. Projects are satellites you can fly toward. Do not build a 12-page marketing site.

5. Everything from scratch. No theme kits, no shadcn dashboard chrome, no Aceternity copy-paste clutter, no three.js "galaxy" CodeSandbox dumped in unedited.

6. Performance is part of the design. 60fps on desktop. Graceful fallback on mid-range phones. Honor `prefers-reduced-motion`. Pause the renderer when the tab is hidden.

7. Accessibility: keyboard can reach every project and the contact form. Canvas is aria-hidden. Real HTML content exists under/over the canvas so the page still makes sense if WebGL dies.

8. No fake testimonials, no fake client logos, no "500+ projects shipped" lies.

---

## 1. WHAT T3KDESIGNS IS

T3KDesigns is a one-studio shop that designs and builds custom digital things: sites, apps, brand systems, live-cam platforms, league tools, e-commerce, dashboards, and weird one-offs. Iowa-based. Operated by Brandon (T3KNiX / t3kdesigns03). Family ventures and client work both live in the same constellation.

Simple public explanation (use this tone, you may tighten wording but keep the meaning):

> T3KDesigns is a design and build studio.
> Tell us what you need. We make it real.

Then, on its own line, exactly:

> We design whatever you want.

That sentence is the brand. Treat it like a title card, not a throwaway.

---

## 2. STACK

Scaffold with the latest stable:

- Next.js (App Router) + TypeScript
- Tailwind CSS v4
- Framer Motion for UI presence (not for the galaxy)
- `@react-three/fiber` + `@react-three/drei` + `three`
- `@react-three/postprocessing` for a *restrained* bloom only
- No database. No auth. No CMS.
- Contact: client-side form that opens a mailto with a clean body, plus visible email. Optional: Formspree / Getform endpoint behind an env var if present; mailto must work without it.

Package manager: npm. Node 20+.

Folder shape:

```
app/
  layout.tsx
  page.tsx
  globals.css
  robots.ts
  sitemap.ts
components/
  scene/          # R3F canvas, galaxy, project nodes, camera rig
  ui/             # nav, hero copy, project dock, contact, footer
lib/
  projects.ts     # single source of truth
  theme.ts
public/
  og.jpg          # generate a dark space OG later if missing; use a CSS/canvas fallback
```

Dynamic import the Canvas with `ssr: false`. Never import three/r3f from a Server Component.

---

## 3. VISUAL SYSTEM (PORTWEAVER × DEEP SPACE)

Colors (CSS variables, use them everywhere):

```
--void:        #05030a
--void-2:      #0a0614
--nebula:      #1a0b2e
--lilac:       #cbb6ff
--lilac-dim:   #9b87c7
--violet:      #7c5cff
--magenta:     #c084fc
--ice:         #e8e4ff
--glass:       rgba(18, 10, 36, 0.55)
--stroke:      rgba(203, 182, 255, 0.16)
--good:        #6ee7b7
```

Typography:

- Display: "Syne" or "Outfit" (unique, geometric, not Inter).
- Body: "Sora" or "Geist".
- The verbatim line uses display font, large, tight tracking, almost whispered. Italicize nothing except if it improves the lockup. Do not put it in a button.

UI chrome (steal the *feeling* from portweaver.com, do not clone their logo or product cards):

- Floating top pill nav, centered or slightly upper-center, frosted dark glass, tiny labels: work · studio · contact
- Huge headline with one accent word in a softer lilac
- Floating rounded glass panels
- Constellation / node motifs
- Almost no borders, just light-on-dark hairlines
- Buttons are pills. Primary = filled soft violet. Secondary = ghost glass.

Motion:

- Hero copy fades + rises once.
- Galaxy is continuous and slow. Nothing on the page should feel twitchy.
- Hover states are light, not bouncy.

---

## 4. THE GALAXY (THIS IS THE PRODUCT)

Build a custom R3F scene that fills the viewport behind the UI. The UI sits in a pointer-events-none overlay except for interactive controls, the project dock, nav, and form.

### 4.1 Layers

1. **Void** — true near-black clear color, slight vignette in post or CSS.
2. **Distant starfield** — 8k–12k points, realistic stellar color temperatures (O/B blue-white, G yellow, K/M amber). Soft size attenuation. Slow rotation.
3. **Primary spiral galaxy** — the hero. Custom ShaderMaterial / points:
   - Logarithmic spiral arms (2–4 arms)
   - Dense core with warmer bulge
   - Cooler blue outer arms
   - Dust lane (darker, slightly brown-red absorption, not a black slash)
   - Fine particle count high on desktop (80k–160k), stepped down on mobile (20k–40k)
   - Very slow spin
   - Subtle noise-based density so arms look like photographed dust, not a math flower
4. **Nebula cards** — 3–5 large soft textured planes or point-clouds (additive), deep magenta / ionized hydrogen / teal-oxygen. They must read as gas, not as Photoshop gradients slapped on quads.
5. **Interactive project systems** — 6–8 small satellite galaxies / star clusters placed on an invisible orbital ring around the main galaxy. Each maps to a project in `lib/projects.ts`.
   - Idle: they breathe (scale + emissive pulse, 4–7s)
   - Hover: camera eases slightly toward them, a label fades in (HTML or drei Html)
   - Click: opens the project slide-over / dock detail, and the camera dollies in a little
6. **Camera rig**
   - Start: three-quarter view of the galaxy, slightly below the plane so arms read as a disk
   - Pointer parallax: mouse X/Y offsets the camera by a small amount (damped)
   - Optional scroll: as the user scrolls the page, camera trucks along the disk and the FOV eases (tied to scroll progress, not a full free-fly unless a "explore" toggle is on)
   - "Explore" toggle in the UI: enables limited OrbitControls (polar angle locked, no flipping under the galaxy, zoom min/max). Default is cinematic auto-rig so the page still works as a website.
   - On mobile: no orbit. Parallax from device orientation if permitted, else a slow authored orbit.
7. **Post**
   - Bloom: threshold high, intensity low. Stars should glint, the whole screen should not fog purple.
   - Optional mild chromatic aberration only when Explore is on.
   - No film grain overlay that dirty-filters the type.

### 4.2 Realism rules

- Particles have a core + halo. Tiny bright cores, larger dim halos.
- Color is physically biased: core = warm (kelvin ~3000–4500), arms = mixed, outer = cooler.
- Avoid rainbow candy galaxies. Avoid neon grids. Avoid UFO saucers.
- No low-poly planets unless they are almost invisible atmosphere dots.
- Do not load 3 million catalog galaxies. This is a landing page, not Skymap.

### 4.3 Performance contract

- `dpr` capped at 1.5, 1.0 on mobile
- Adaptive: if FPS drops under ~40 for 2 seconds, drop particle count one tier and disable bloom
- `frameloop` demand when Explore is off and the page is not scrolling and the pointer is still — or keep a cheap 30fps idle spin. Prefer continuous slow spin if it stays cheap.
- `visibilitychange` → stop loop
- WebGL fail → CSS galaxy (radial gradients + a few box-shadow stars) so the page never looks broken
- `prefers-reduced-motion`: freeze camera, freeze spin, show a single beautiful still frame of the galaxy

Extract all of this into `components/scene/*`. Keep shaders in their own files.

---

## 5. PAGE STRUCTURE (SINGLE ROUTE)

Overlay content, scrolling over the fixed canvas.

### A. Nav
Floating glass pill. Wordmark: **T3K** in display + **DESIGNS** smaller tracking. Links: Work, Studio, Contact. No hamburger unless < 640px.

### B. Hero (100vh)
Big quiet lockup:

Line 1 (eyebrow, tracked small caps): `T3KDESIGNS`
Line 2 (display): `A studio in the dark.`
Line 3 (body, max 28ch): `Sites. Apps. Brands. Strange little tools. Built to feel inevitable.`
Line 4 (the brand sentence, large): `We design whatever you want.`

Two pills under it:
- `See the work` → scrolls to #work
- `Start a project` → #contact

Bottom of hero: a tiny hint `drag to drift` that only appears after Explore is enabled, otherwise `scroll to enter the system`.

### C. Work / constellation (#work)
Do not use a boring 3-column card grid as the primary view.

Primary: the galaxy nodes ARE the work. A slim glass "mission dock" at the bottom or right lists the same projects as text so it's usable.

Each project in `lib/projects.ts`:

```ts
{
  id: string
  name: string
  oneLiner: string
  blurb: string
  href?: string        // live url if public
  status: 'live' | 'private' | 'building'
  tags: string[]
  color: string        // node emissive
}
```

Seed these (accurate, no hype inflation):

1. **SpyderNetwork** — Largest live-cam network at Lake of the Ozarks. 60+ streams, map, conditions. live → https://spydernetwork.com (also https://spydernetwork.t3kdesigns.app)
2. **GlowDaily Nutrition** — Family loaded-tea e-comm: menu, cart, pop-up / school-order systems, event ops. building/live as appropriate. Do not invent a domain if unsure; status can be `building` with no href, or link GitHub https://github.com/t3kdesigns03/glowdaily
3. **Stuart Softball League** — Weekly coed draft engine, live preview, lock, dues. live → https://ssl.t3kdesigns.app
4. **SOB Rentals** — Vacation rental platform energy, Lake of the Ozarks inventory / property pages. building or live if you have a public URL; if not, `building`
5. **Porchlight** — Private lead-to-site pipeline. Studio tool. status `private`
6. **T3KDesigns Studio** — This site. Custom work for anyone who needs a thing made. status `live` → #contact

Dock item click = same as node click. Detail panel:

- Name
- One-liner
- 2–3 sentence blurb
- Tags
- Status pill
- External link if live ("Enter system →")
- Close

Keep blurbs short and concrete. No "synergy."

### D. Studio (#studio)
Very short. Three lines max of philosophy. Example structure:

Title: `The interface disappears.`
Body: `What remains is the thing you asked for — clear, fast, and a little bit impossible.`
Then the verbatim line again, smaller.

Optional three micro-points (not service categories):
- Design the object
- Build the engine
- Ship it dark and quiet

### E. Contact (#contact)
Glass panel.
Name, email, what you want (textarea).
Submit = mailto `hello@t3kdesigns.app` OR a clearly shown address you set as `CONTACT_EMAIL` in env with fallback `t3knix` style: use **hello@t3kdesigns.app** as the displayed address even if the mailbox is not live yet, and also show a secondary line "or reach out on X @T3KNiX".
Button label: `Send transmission`

### F. Footer
`T3KDesigns · Iowa · We design whatever you want.`
Tiny legal-free line. Year 2026.

---

## 6. COPY RULES

- Short. Portweaver-short.
- No "Welcome to our website."
- No "we are passionate about."
- No lorem.
- The verbatim sentence appears at least twice: hero, and studio or footer.
- Headlines can be a little cosmic. Body stays plain English.

Approved headline bank (pick, don't dump all):
- A studio in the dark.
- Built in the void. Shipped to your world.
- Don't brief a committee. Brief one studio.
- Everything connects.

---

## 7. IMPLEMENTATION ORDER (DO THIS IN ORDER)

1. `create-next-app` with TS + Tailwind + App Router. Clean out boilerplate.
2. Theme tokens + fonts + layout shell (void background, no canvas yet).
3. Overlay UI: nav, hero copy, dock skeleton, studio, contact, footer. Looks finished in 2D.
4. `lib/projects.ts` + dock wired to a detail panel.
5. R3F canvas behind: starfield + spiral galaxy shader only.
6. Tune galaxy until it looks photographed. Spend real time here. This is 40% of the job.
7. Add project nodes + hover labels + click → panel.
8. Camera rig, parallax, scroll truck, Explore toggle.
9. Bloom + performance tiers + reduced-motion + WebGL fallback.
10. Metadata, OG, sitemap, robots, favicon (simple T3K monogram on void).
11. Polish type, spacing, mobile, focus rings.
12. `npm run build`. Fix everything.

---

## 8. METADATA

```
title: T3KDesigns
description: We design whatever you want. Custom sites, apps, and brand systems — built dark, shipped real.
```

Theme color: `#05030a`
One page so sitemap is just `/`.

---

## 9. QUALITY BAR

You are done only when:

- A stranger lands and understands the studio in under 5 seconds.
- The galaxy looks expensive on a 27" display and usable on a phone.
- The verbatim sentence is unmissable.
- Work is findable without using the 3D scene.
- No console errors, no hydration warnings, no layout shift from fonts.
- Lighthouse performance is not tanked by an unbounded particle system.

If a library fights you, delete it and write the piece yourself.

Start now. First action: scaffold the app and commit the visual system before any 3D. Then build the galaxy like it has to survive a design review from someone who photographs the actual night sky.
