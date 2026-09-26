# T3KDesigns /explore — outer ring + Destiny orbit
# Repo: E:\T3KDesigns\T3KDESIGNSHOME
# Same galaxy. No second map. No second route.
# Keep the eight inner worlds and the courier. Do not restyle `/` dock unless a row is marked dock: true.

You understand the goal: one T3KDesigns Galaxy. More planets. Fly there, catch orbit, nameplate comes up, it feels like Destiny's orbit view in a browser.

---

## Goal

Append **seven** project worlds to the existing system (`lib/projects.ts` + explore scene). Place them on an **outer ring** (or second radius) around the current eight so the inner constellation does not get crowded. Same void, same courier, same catch-orbit, same HUD pips.

Homepage mission dock stays the original eight unless you set `dock: true` on a row. These seven default to **explore only**.

## New worlds (source of truth)

Add exactly these. Do not invent extra clients.

| id | name | href | status | one-liner | planet read |
|---|---|---|---|---|---|
| sts | Small Town Sips | https://sts.t3kdesigns.app | live | Loaded teas out of Truro, Iowa | warm small-town world, tea-gold lights, garage-scale outpost |
| georgeandnicks | George & Nick's | https://georgeandnicks.t3kdesigns.app | live | Pizza and charcoal steaks on the Centerville square since 1968 | brick-warm night side, square-of-lights, charcoal ember |
| kimscleaning | Kim's Cleaning Products | https://kimscleaningproducts.t3kdesigns.app | live | USA-made microfiber. Water does the work. | clean ice-white / pale teal world, crisp and spare |
| appanoosegolf | Appanoose Country Club | https://appanoosegolf.t3kdesigns.app | live | Nine holes in Centerville since 1913 | green fairway world, one clubhouse light |
| barberstucco | Barber Stucco | https://barberstucco.t3kdesigns.app | live | Stucco, EIFS, ArcusStone at the Lake of the Ozarks | limestone / stucco-dust moon, quarry bands |
| debtangel | Debt Angel | https://debtangel.t3kdesigns.app | live | A clear plan for unsecured debt. You approve every step. | pale silver-blue, quiet, one guiding point of light |
| donjulio | Don Julio Cantina | https://donjuliocantina.t3kdesigns.app | building | Cantina — site still landing | terracotta / night-market world, warm string lights; if href 404, plate has no `open site` |

If a href 404s live, status `building` and omit `open site →`.

Each body must be distinguishable from the inner eight and from each other at park distance. Same rules as the visual pass: fresnel limb, sparse night points, no TV-static cities, no NASA tiles, no extra bloom stack.

## Flight (still broken if unfixed)

- Mesh click = HUD pip = autopilot to that world.
- Camera rides with the courier and the target. No `DEEP SPACE` cut to the gas giants mid-burn.
- Circularize at parking orbit. Ease. Stay.
- Landmark yaw not required on these seven unless a single point-of-light is the identity (Debt Angel's guide star, Appanoose clubhouse).

## Destiny-feel nameplate

Approach band → one screen-space plate, not two titles:

```
SMALL TOWN SIPS
Loaded teas out of Truro, Iowa
open site →
```

Fade in close, hold in orbit, fade out on burn-away. Tracked name, 1px rule, one-liner. Active pip highlighted. Sparse ticks on the captured ring. No Bungie assets, no Ghost, no music, no "Destiny" on the page.

## HUD

Bottom pips become 15 (8 inner + 7 outer). Group visually if needed (inner row / outer row) so it does not become a gumball machine. Phone: two short rows is fine. All pips tappable.

## Do not

- Do not add a second galaxy, second canvas, or `/explore-2`.
- Do not put these seven on the homepage dock in this pass.
- Do not rewrite the spiral shader or the courier hull.
- Do not import `@react-three/postprocessing` onto a module `/` shares.
- Do not add Patrick's or other domains that are not in the table.

## Done when

`/explore` shows fifteen destinations in one sky. Fly Studio → Small Town Sips → Debt Angel: camera stays on target, plate comes up, you park, inner eight still look like themselves. `/` dock still eight. Build clean.
