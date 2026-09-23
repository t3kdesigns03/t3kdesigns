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
 * after the first touch, eight dots as an alternative to hitting a planet,
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

  const world = worldById(parked);
  const href = toHref(world?.project?.href);
  const external = !!href && href.startsWith("http");

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

      {/* where you are */}
      <div
        aria-live="polite"
        className="absolute inset-x-0 top-[calc(4.9rem+env(safe-area-inset-top))] flex justify-center px-6 text-center sm:top-[calc(5.75rem+env(safe-area-inset-top))]"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={parked ?? "space"}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: reduced ? 0 : 0.45, ease: EASE }}
            className="flex flex-col items-center"
          >
            {world ? (
              <>
                <p className="display flex items-center gap-3 text-[clamp(1.5rem,5vw,2.25rem)] text-ice">
                  <span
                    aria-hidden
                    className="size-[8px] shrink-0 rounded-full"
                    style={{ background: world.accent, boxShadow: `0 0 14px 2px ${world.accent}` }}
                  />
                  {world.name}
                </p>
                {href &&
                  (external ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-link pointer-events-auto mt-1 text-[0.8125rem] tracking-[0.04em]"
                    >
                      open site →
                    </a>
                  ) : (
                    <Link
                      href={href}
                      prefetch={false}
                      className="inline-link pointer-events-auto mt-1 text-[0.8125rem] tracking-[0.04em]"
                    >
                      open site →
                    </Link>
                  ))}
              </>
            ) : (
              <p className="eyebrow">deep space</p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* hint + the eight worlds */}
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
          className="glass pointer-events-auto grid grid-cols-8 rounded-full px-1.5"
        >
          {worlds.map((w) => {
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
                    width: on ? 11 : 8,
                    height: on ? 11 : 8,
                    background: w.accent,
                    boxShadow: on
                      ? `0 0 0 3px rgba(5,3,10,0.9), 0 0 0 4px ${w.accent}88, 0 0 16px 2px ${w.accent}`
                      : `0 0 8px 0 ${w.accent}66`,
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
