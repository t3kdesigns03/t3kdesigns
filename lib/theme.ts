/**
 * Single source of truth for brand colour. Consumed by the GLSL scene
 * (as normalised floats) and by CSS (as hex, mirrored in globals.css).
 */
export const theme = {
  void: "#05030a",
  void2: "#0a0614",
  nebula: "#1a0b2e",
  lilac: "#cbb6ff",
  lilacDim: "#9b87c7",
  violet: "#7c5cff",
  magenta: "#c084fc",
  ice: "#e8e4ff",
  good: "#6ee7b7",
} as const;

export const SITE = {
  name: "T3KDesigns",
  domain: "t3kdesigns.app",
  url: "https://t3kdesigns.app",
  email: "hello@t3kdesigns.app",
  x: "@T3KNiX",
  xUrl: "https://x.com/T3KNiX",
  place: "Iowa",
  sentence: "We design whatever you want.",
  description:
    "We design whatever you want. Custom sites, apps, and brand systems — built dark, shipped real.",
} as const;
