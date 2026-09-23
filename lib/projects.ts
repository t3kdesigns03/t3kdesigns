export type ProjectStatus = "live" | "private" | "building";

export type Project = {
  id: string;
  name: string;
  oneLiner: string;
  blurb: string;
  href?: string;
  status: ProjectStatus;
  tags: string[];
  /** node emissive colour */
  color: string;
};

/**
 * Single source of truth. The 3D constellation, the mission dock and
 * /explore all render from this array. The first eight are the original
 * constellation (and /explore's inner ring); the rest fill the gaps between
 * them on the homepage and form the outer ring on /explore.
 */
export const projects: Project[] = [
  {
    id: "spydernetwork",
    name: "SpyderNetwork",
    oneLiner: "The largest live-cam network at Lake of the Ozarks.",
    blurb:
      "Sixty-plus live streams in one catalog, on one map, with lake conditions beside them. Built as a Next.js app with live players, a cam catalog, and an owner dashboard behind it.",
    href: "https://spydernetwork.com",
    status: "live",
    tags: ["Next.js", "Live video", "Maps", "Dashboard"],
    color: "#8ab4ff",
  },
  {
    id: "glowdaily",
    name: "GlowDaily Nutrition",
    oneLiner: "Loaded-tea storefront and event ops.",
    blurb:
      "Menu, cart, and checkout for a family nutrition shop, plus the pop-up and school-order systems the counter actually runs on. Orders and fundraisers land in one dashboard.",
    href: "https://glowdailynutrition.com",
    status: "live",
    tags: ["E-commerce", "Ordering", "Fundraisers", "Supabase"],
    color: "#ffb37a",
  },
  {
    id: "stuart-softball",
    name: "Stuart Softball League",
    oneLiner: "A weekly coed draft engine.",
    blurb:
      "Rosters redrawn every week: draft board, live preview, lock, and dues tracking. Built so one organizer can run a league night from a phone.",
    href: "https://ssl.t3kdesigns.app",
    status: "live",
    tags: ["League tools", "Draft engine", "Realtime"],
    color: "#6ee7b7",
  },
  {
    id: "sob-rentals",
    name: "SOB Rentals",
    oneLiner: "Vacation rental inventory at the Lake of the Ozarks.",
    blurb:
      "Roughly fifty units with their own property pages, kept fast and static. A private owner studio lets the owners add and retire listings themselves, with photo upload and approval before anything goes live.",
    href: "https://sobrentals.com",
    status: "live",
    tags: ["Rentals", "Static site", "Owner studio", "Cloudflare"],
    color: "#7dd3fc",
  },
  {
    id: "calming-the-chaos",
    name: "Calming The Chaos",
    oneLiner: "EMF protection storefront.",
    blurb:
      "A hand-built static shop for an authorized seller of EMF remediation products — collection pages, a cart drawer, and the membership disclosure carried sitewide. No framework, no build step.",
    href: "https://ctc.t3kdesigns.app",
    status: "live",
    tags: ["Static site", "Storefront", "Brand system"],
    color: "#9be7d8",
  },
  {
    id: "holotracker",
    name: "HoloTracker",
    oneLiner: "A card collection tracker for the phone.",
    blurb:
      "Mobile app for cataloging a holo card collection — scan, sort, and see what is missing. In development.",
    href: "https://github.com/t3kdesigns03/HOLOTRACKER",
    status: "building",
    tags: ["Mobile", "Offline-first"],
    color: "#c084fc",
  },
  {
    id: "porchlight",
    name: "Porchlight",
    oneLiner: "Lead to site, without the meeting.",
    blurb:
      "An internal pipeline that turns an inbound lead into a deployable site. Studio tooling — it stays behind the curtain.",
    status: "private",
    tags: ["Internal", "Automation", "Pipeline"],
    color: "#ffd79a",
  },
  {
    id: "t3kdesigns",
    name: "T3KDesigns Studio",
    oneLiner: "This page, and whatever you need next.",
    blurb:
      "One studio, one inbox. Sites, apps, brand systems, and the strange one-offs that do not have a category yet. Tell us what you need.",
    href: "#contact",
    status: "live",
    tags: ["Studio", "Custom work"],
    color: "#cbb6ff",
  },
  // —— the outer ring: fly out to these on /explore ——
  {
    id: "sts",
    name: "Small Town Sips",
    oneLiner: "Loaded teas out of Truro, Iowa",
    blurb:
      "The site for a small-town loaded-tea shop in Truro, Iowa: the menu, the story, and a reason to stop in.",
    href: "https://sts.t3kdesigns.app",
    status: "live",
    tags: ["Storefront"],
    color: "#f2c46d",
  },
  {
    id: "georgeandnicks",
    name: "George & Nick's",
    oneLiner: "Pizza and charcoal steaks on the Centerville square since 1968",
    blurb:
      "The site for a Centerville, Iowa landmark: Greek-recipe pizza and hand-cut charcoal steaks on the downtown square since 1968.",
    href: "https://georgeandnicks.t3kdesigns.app",
    status: "live",
    tags: ["Restaurant"],
    color: "#ff7a52",
  },
  {
    id: "kimscleaning",
    name: "Kim's Cleaning Products",
    oneLiner: "USA-made microfiber. Water does the work.",
    blurb:
      "A storefront for American-made microfiber cloths and tools that clean with just water — no sprays, no residue.",
    href: "https://kimscleaningproducts.t3kdesigns.app",
    status: "live",
    tags: ["Storefront"],
    color: "#a8f0e6",
  },
  {
    id: "appanoosegolf",
    name: "Appanoose Country Club",
    oneLiner: "Nine holes in Centerville since 1913",
    blurb:
      "The site for a nine-hole country club in Centerville, Iowa, founded in 1913: the course, the clubhouse table, and membership.",
    href: "https://appanoosegolf.t3kdesigns.app",
    status: "live",
    tags: ["Club"],
    color: "#8fe388",
  },
  {
    id: "barberstucco",
    name: "Barber Stucco",
    oneLiner: "Stucco, EIFS, ArcusStone at the Lake of the Ozarks",
    blurb:
      "The site for a Camdenton, Missouri exterior contractor: stucco, EIFS and ArcusStone work around the Lake of the Ozarks.",
    href: "https://barberstucco.t3kdesigns.app",
    status: "live",
    tags: ["Contractor"],
    color: "#e3d2b4",
  },
  {
    id: "debtangel",
    name: "Debt Angel",
    oneLiner: "A clear plan for unsecured debt. You approve every step.",
    blurb:
      "A clearer way through unsecured debt: see every account and compare a structured plan against your current path in real dollars before deciding.",
    href: "https://debtangel.t3kdesigns.app",
    status: "live",
    tags: ["Finance"],
    color: "#b8cff5",
  },
  {
    id: "donjulio",
    name: "Don Julio Cantina",
    oneLiner: "Cantina — site still landing",
    blurb:
      "A family Mexican cantina in Creston, Iowa. The site is still landing.",
    href: "https://donjuliocantina.t3kdesigns.app",
    status: "building",
    tags: ["Restaurant"],
    color: "#ff8fb1",
  },
];

export const statusLabel: Record<ProjectStatus, string> = {
  live: "live",
  building: "building",
  private: "private",
};

export const statusColor: Record<ProjectStatus, string> = {
  live: "#6ee7b7",
  building: "#ffd79a",
  private: "#9b87c7",
};

export const byId = (id: string | null) =>
  id ? projects.find((p) => p.id === id) ?? null : null;
