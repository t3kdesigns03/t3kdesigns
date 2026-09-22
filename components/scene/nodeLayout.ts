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

export const nodeSpots: NodeSpot[] = projects.map((p, i) => {
  const n = projects.length;
  const a = (i / n) * TAU + 0.42;
  const ring = 7.5 + srand(i * 3.1) * 1.5;
  // lift them off the disk plane so the ring reads as a shell, not a belt
  const y = Math.sin(a * 2.1 + 0.6) * 1.55 + (srand(i * 7.7) - 0.5) * 1.0;

  return {
    id: p.id,
    name: p.name,
    color: p.color,
    position: [Math.cos(a) * ring, y, Math.sin(a) * ring],
    scale: 0.4 + srand(i * 11.3) * 0.2,
    phase: srand(i * 5.9) * TAU,
  };
});

export const spotById = (id: string | null) =>
  id ? nodeSpots.find((s) => s.id === id) ?? null : null;
