"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { EASE } from "@/lib/motion";
import { flyTo, resetFlight } from "./flight";
import { worldById, worlds } from "./layout";
import { exploreStore, useExplore } from "./store";

const toHref = (href?: string) =>
  href ? (href.startsWith("#") ? `/${href}` : href) : undefined;

/**
 * Almost nothing, on purpose: a way home, where you are, a hint that leaves
 * after the first touch, a dot per world as an alternative to hitting a planet,
 * and reset. No score, no map, no menu.
 */
export default function HUD({
  reduced,
  coarse,
}: {
  reduced: boolean;
  coarse: boolean;
}) {
  const parked = useExplore((s) => s.parked);
  const target = useExplore((s) => s.target);
  const touched = useExplore((s) => s.touched);
  const plate = useExplore((s) => s.plate);

  const world = worldById(plate);
  const heading = worldById(target);
  const href = toHref(world?.project?.href);
  const external = !!href && href.startsWith("http");
  const inner = worlds.filter((w) => w.ring === "inner");
  const outer = worlds.filter((w) => w.ring === "outer");

  const verb = coarse ? "tap" : "click";
  const hint = reduced ? `${verb} a world` : `${verb} a world · flick to burn`;

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {/* way home + reset */}
      <div className="absolute inset-x-0 top-[calc(0.75rem+env(safe-area-inset-top))] flex items-center justify-between px-3 sm:top-[calc(1.25rem+env(safe-area-inset-top))] sm:px-5">
        <Link
          href="/"
          prefetch={false}
          className="glass nav-target group pointer-events-auto flex gap-[0.3rem] rounded-full px-4"
        >
          <span className="display text-[1.0625rem] leading-none text-ice">T3K</span>
          <span className="text-[0.5625rem] uppercase leading-none tracking-[0.3em] text-lilac-dim transition-colors group-hover:text-lilac">
            designs
          </span>
        </Link>
        <button
          type="button"
          onClick={() => {
            exploreStore.touch();
            resetFlight();
          }}
          className="glass nav-target pointer-events-auto flex rounded-full px-4 text-[0.625rem] uppercase tracking-[0.22em] text-lilac-dim transition-colors hover:text-ice"
        >
          reset
        </button>
      </div>

      {/* where you are: one nameplate, up on approach, held in orbit */}
      <div
        aria-live="polite"
        className="absolute inset-x-0 top-[calc(4.6rem+env(safe-area-inset-top))] flex justify-center px-5 text-center sm:top-[calc(5.5rem+env(safe-area-inset-top))]"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={world ? world.id : heading ? `to:${heading.id}` : "space"}
            initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
            transition={{ duration: reduced ? 0 : world ? 0.7 : 0.4, ease: EASE }}
            className="flex max-w-[min(34rem,calc(100vw-2.5rem))] flex-col items-center"
          >
            {world ? (
              <>
                <p className="display text-[clamp(1.05rem,4.2vw,1.6rem)] uppercase leading-tight tracking-[0.2em] text-ice">
                  {world.name}
                </p>
                <span
                  aria-hidden
                  className="my-2.5 block h-px w-[min(18rem,70vw)]"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${world.accent}cc 18%, ${world.accent}cc 82%, transparent)`,
                  }}
                />
                {world.project?.oneLiner && (
                  <p className="text-[0.8125rem] leading-snug text-[rgba(232,228,255,0.72)] sm:text-[0.875rem]">
                    {world.project.oneLiner}
                  </p>
                )}
                {href &&
                  (external ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-link pointer-events-auto mt-2 py-1 text-[0.8125rem] tracking-[0.04em]"
                    >
                      open site →
                    </a>
                  ) : (
                    <Link
                      href={href}
                      prefetch={false}
                      className="inline-link pointer-events-auto mt-2 py-1 text-[0.8125rem] tracking-[0.04em]"
                    >
                      open site →
                    </Link>
                  ))}
              </>
            ) : heading ? (
              <p className="eyebrow flex items-center gap-2">
                <span
                  aria-hidden
                  className="size-[6px] rounded-full"
                  style={{ background: heading.accent, boxShadow: `0 0 10px 1px ${heading.accent}` }}
                />
                en route · {heading.name}
              </p>
            ) : (
              <p className="eyebrow">deep space</p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* hint + the worlds: inner eight above, outer ring below */}
      <div className="absolute inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] flex flex-col items-center gap-3 px-3">
        <p
          aria-hidden={touched}
          className="text-[0.625rem] uppercase tracking-[0.28em] text-[rgba(232,228,255,0.5)] transition-opacity duration-700"
          style={{ opacity: touched ? 0 : 1 }}
        >
          {hint}
        </p>
        <div
          role="group"
          aria-label="Worlds"
          className="glass pointer-events-auto flex flex-col items-center rounded-[1.6rem] px-1.5 py-0.5"
        >
          {[inner, outer].map((row, r) => (
            <div key={r} className={r ? "flex border-t border-[rgba(203,182,255,0.08)]" : "flex"}>
              {row.map((w) => {
                const on = parked === w.id || target === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    title={w.name}
                    aria-label={`Fly to ${w.name}`}
                    aria-pressed={on}
                    onClick={() => flyTo(w)}
                    className="grid h-11 place-items-center rounded-full"
                    style={{ width: "min(2.75rem, calc((100vw - 3rem) / 8))" }}
                  >
                    <span
                      aria-hidden
                      className="block rounded-full transition-all duration-500"
                      style={{
                        width: on ? 11 : r ? 7 : 8,
                        height: on ? 11 : r ? 7 : 8,
                        background: w.accent,
                        opacity: on ? 1 : r ? 0.85 : 1,
                        boxShadow: on
                          ? `0 0 0 3px rgba(5,3,10,0.9), 0 0 0 4px ${w.accent}88, 0 0 16px 2px ${w.accent}`
                          : `0 0 8px 0 ${w.accent}66`,
                      }}
                    />
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
