# T3KDesigns — Director pips + mobile Explore door
# Repo: E:\T3KDesigns\T3KDESIGNSHOME
# Model: Opus 5.5. Additive. Do not restyle `/` galaxy. Do not invent a second map.
# Live: https://t3kdesigns.app and https://t3kdesigns.app/explore

Two jobs. Do both.

---

## 1. `/explore` destination buttons are anonymous dots

Bottom HUD is two rows of colored circles. They autopilot you. Nobody can tell which is Small Town Sips vs Debt Angel without hovering aria or memorizing order.

Replace each pip with a **Director chip**: a tiny planet + a name.

Desktop chip
- 28–36px sphere that reads as that world (same accent / family as the 3D body: amber GlowDaily, ice Kim's, terracotta Don Julio, green Appanoose, etc.)
- Name to the right, one line, short form is fine (`GlowDaily`, `STS`, `G&N`, `Debt Angel`)
- Active / inbound: ring + brighter type
- Hover: full name + one-liner in a quiet glass tip (Destiny destination hover, not a Bootstrap tooltip)
- Still one tap = Tesla-autopilot to that world

Layout
- Inner eight one cluster, outer seven another. Labels so the two rings are obvious (`inner` / `outer` or no label if grouping is clear).
- Do not build a scrollable spreadsheet. If 15 named chips overflow, wrap to two rows of chips, not a hamburger.

Phone `/explore`
- Same chips, not dots. Name can wrap to two tiny lines or use the short form.
- Thumb-sized hit target (min 44px).
- Horizontal snap-scroll row(s) is allowed if 15 chips will not fit. Active chip should be visible (scroll it into view on autopilot).
- Do not hide names on mobile. That is the whole complaint.

Implementation
- SVG or CSS spheres. Do not mount 15 extra WebGL canvases in the HUD.
- Data from `lib/projects.ts` + `lib/outerProjects.ts`. Do not hardcode names.

Leave the 3D worlds, courier, catch-orbit, and approach plate alone unless a HUD click broke them.

---

## 2. Mobile homepage has no Explore

Live phone nav is `T3K · work · studio · contact`. Explore is `hidden sm:flex`. The only door is a scroll away (`Fly between them` under Work, if it exists). That is why phones “cannot explore.”

Put Explore on the phone. Do not make them scroll to find the game.

Required
- Nav pill: show **explore** on all breakpoints. On a tight bar you may shorten to `explore` and drop a link if needed — never drop explore before contact.
- Hero: third control next to `See the work` / `Start a project`, ghost: `Explore →` linking `/explore` with `prefetch={false}`.
- Keep Work-section `Fly between them →` as a second door. Not the only door.

If the glass nav overflows on 360px, stack or allow the bar to scroll horizontally. Cutting Explore to save 72px is the wrong cut.

---

## Do not

- Do not add the seven outer worlds to the homepage dock.
- Do not import explore flight code into `/`.
- Do not add bloom, sound, or Destiny trademarks.
- Do not grow homepage JS.

## Done when

- `/explore` chips show a mini world + a name. A stranger can send the courier to George & Nick's without counting dots.
- A 390-wide homepage has Explore in the nav and in the hero. One tap to `/explore`.
- Desktop `/` still the quiet studio page.
- Build clean.

Then stop. Advertising is the next conversation, not this commit.
