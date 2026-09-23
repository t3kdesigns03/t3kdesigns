import { projects } from "@/lib/projects";
import { srand } from "./color";

export const GALAXY_RADIUS = 6.2;

/**
 * Satellite clusters sit on an invisible orbital ring around the disk.
 * Deterministic: the constellation must look the same on every load.
 */
export type NodeSpot = {
  id: string;
  name: string;
  color: string;
  position: [number, number, number];
  /** cluster radius */
  scale: number;
  /** per-node breathing phase */
  phase: number;
};

const TAU = Math.PI * 2;

/** The original constellation: its eight positions are art-directed, keep them. */
const FIRST = 8;
const STEP = TAU / FIRST;
/**
 * Later systems slot into the gaps between the first eight, alternating
 * high and low against their neighbours. The gap nearest the desktop camera
 * stays empty so nothing parks in front of the hero.
 */
const GAPS = [0, 2, 3, 4, 5, 6, 7];

export const nodeSpots: NodeSpot[] = projects.map((p, i) => {
  let a: number;
  let ring: number;
  let y: number;
  let scale: number;
  if (i < FIRST) {
    a = i * STEP + 0.42;
    ring = 7.5 + srand(i * 3.1) * 1.5;
    // lift them off the disk plane so the ring reads as a shell, not a belt
    y = Math.sin(a * 2.1 + 0.6) * 1.55 + (srand(i * 7.7) - 0.5) * 1.0;
    scale = 0.4 + srand(i * 11.3) * 0.2;
  } else {
    const slot = GAPS[(i - FIRST) % GAPS.length];
    a = slot * STEP + 0.42 + STEP / 2;
    ring = 8.1 + srand(i * 3.1) * 0.9;
    y = -Math.sin(a * 2.1 + 0.6) * 1.2 + (srand(i * 7.7) - 0.5) * 0.8;
    scale = 0.3 + srand(i * 11.3) * 0.12;
  }

  return {
    id: p.id,
    name: p.name,
    color: p.color,
    position: [Math.cos(a) * ring, y, Math.sin(a) * ring],
    scale,
    phase: srand(i * 5.9) * TAU,
  };
});

export const spotById = (id: string | null) =>
  id ? nodeSpots.find((s) => s.id === id) ?? null : null;
