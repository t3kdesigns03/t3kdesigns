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
 * Single source of truth. The 3D constellation and the mission dock
 * both render from this array — order sets the orbital ring order.
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
